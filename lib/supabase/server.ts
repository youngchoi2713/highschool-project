import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/** 일반 사용자 클라이언트 (RLS 적용) */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server Component에서 호출 시 읽기 전용 — 무시
          }
        },
        remove(name: string, options) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Server Component에서 호출 시 읽기 전용 — 무시
          }
        },
      },
    }
  );
}

/**
 * 관리자 클라이언트 (RLS 우회)
 * ⚠️ Server Action 및 서버 전용 코드에서만 사용할 것.
 * 클라이언트 컴포넌트에서 절대 사용 금지.
 */
export function createAdminClient() {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
