import { spawn } from "node:child_process";

const npmCmd = process.platform === "win32" ? "npm" : "npm";
const useShell = process.platform === "win32";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;
const ROUTES = ["/", "/login", "/submit", "/violations", "/admin"];
const ALLOWED_STATUS = new Set([200, 301, 302, 303, 307, 308]);

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: useShell,
      ...options,
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with code ${code}`));
    });
  });
}

function waitForServerReady(child, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out while waiting for next start."));
    }, timeoutMs);

    const onData = (chunk) => {
      const text = String(chunk);
      process.stdout.write(text);
      if (text.includes("Ready in") || text.toLowerCase().includes("ready")) {
        cleanup();
        resolve();
      }
    };

    const onExit = (code) => {
      cleanup();
      reject(new Error(`next start exited before ready (code ${code ?? "unknown"}).`));
    };

    const cleanup = () => {
      clearTimeout(timeout);
      child.stdout?.off("data", onData);
      child.stderr?.off("data", onData);
      child.off("close", onExit);
    };

    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("close", onExit);
  });
}

async function checkRoute(pathname) {
  const response = await fetch(`${BASE_URL}${pathname}`, { redirect: "manual" });
  if (!ALLOWED_STATUS.has(response.status)) {
    throw new Error(`Unexpected status ${response.status} at ${pathname}`);
  }
  console.log(`[verify:local] ${pathname} -> ${response.status}`);
}

async function stopServer(child) {
  if (!child || child.killed) return;

  if (process.platform === "win32") {
    await run("taskkill", ["/pid", String(child.pid), "/f", "/t"], { stdio: "ignore" }).catch(() => {
      child.kill();
    });
    return;
  }

  child.kill("SIGTERM");
}

async function main() {
  await run(npmCmd, ["run", "build"]);

  const server = spawn(npmCmd, ["run", "start", "--", "-p", String(PORT)], {
    stdio: ["ignore", "pipe", "pipe"],
    shell: useShell,
  });

  try {
    await waitForServerReady(server);
    for (const route of ROUTES) {
      await checkRoute(route);
    }
    console.log("[verify:local] all checks passed");
  } finally {
    await stopServer(server);
  }
}

main().catch((error) => {
  console.error("[verify:local] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
