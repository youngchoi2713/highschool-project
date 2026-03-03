import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Vercel Cron Job: 매일 1회 호출 → Supabase 무료 티어 비활성 방지
 * vercel.json 의 crons 설정으로 자동 호출됨
 */
export async function GET() {
  try {
    const supabase = createAdminClient();
    // 가벼운 쿼리로 연결 유지
    await supabase.from("schools").select("id", { count: "exact", head: true });
    return NextResponse.json({ ok: true, time: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
