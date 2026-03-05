import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type AppRole = "super_admin" | "school_admin" | "homeroom" | "subject";

const PUBLIC_PATHS = ["/", "/login", "/register", "/privacy", "/terms"];
const SUBJECT_HOMEROOM_PATHS = ["/submit", "/violations"];
const SCHOOL_ADMIN_PATHS = ["/admin"];
const SUPER_ADMIN_PATHS = ["/super-admin"];

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

const matchesAnyPrefix = (pathname: string, paths: string[]) =>
  paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

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

  // 세션 갱신
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 비로그인: 공개 경로는 허용, 나머지는 /login
  if (!user) {
    if (isPublicPath(pathname)) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // app_metadata만 사용 (user_metadata는 사용자가 수정 가능하므로 신뢰 불가)
  const role = (user.app_metadata?.role ?? null) as AppRole | null;

  // 이미 로그인된 상태에서 /login 또는 / 접근 시: 대시보드로 이동
  if (pathname === "/login" || pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = role === "super_admin" || role === "school_admin" ? "/admin"
      : role === "subject" ? "/submit"
      : role === "homeroom" ? "/violations"
      : "/";
    return NextResponse.redirect(url);
  }

  // 역할 기반 접근 제어
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
