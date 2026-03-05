import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

type AppRole = "super_admin" | "school_admin" | "homeroom" | "subject";
type RawAppRole = AppRole | "admin";

const PUBLIC_PATHS = ["/", "/login", "/register", "/privacy", "/terms"];
const SUBJECT_HOMEROOM_PATHS = ["/submit", "/violations"];
const SCHOOL_ADMIN_PATHS = ["/admin"];
const SUPER_ADMIN_PATHS = ["/super-admin"];

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

const matchesAnyPrefix = (pathname: string, paths: string[]) =>
  paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

function normalizeRole(role: unknown): AppRole | null {
  if (role === "admin") return "school_admin";
  if (role === "super_admin" || role === "school_admin" || role === "homeroom" || role === "subject") {
    return role;
  }
  return null;
}

async function getRoleFromProfileWithService(userId: string): Promise<AppRole | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  const admin = createSupabaseAdminClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return normalizeRole(profile?.role);
}

function hasRoleAccess(pathname: string, role: AppRole | null): boolean {
  if (matchesAnyPrefix(pathname, SUBJECT_HOMEROOM_PATHS)) {
    return role === "subject" || role === "homeroom" || role === "super_admin";
  }
  if (matchesAnyPrefix(pathname, SCHOOL_ADMIN_PATHS)) {
    return role === "school_admin" || role === "super_admin";
  }
  if (matchesAnyPrefix(pathname, SUPER_ADMIN_PATHS)) {
    return role === "super_admin";
  }
  return true;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user) {
    if (isPublicPath(pathname)) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  let role = normalizeRole((user.app_metadata?.role ?? null) as RawAppRole | null);
  if (!role) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = normalizeRole(profile?.role);
  }
  if (!role) {
    role = await getRoleFromProfileWithService(user.id);
  }

  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (!hasRoleAccess(pathname, role)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/ping).*)"],
};
