"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SubmitViolationInput = {
  studentId: string;
  violationTypeId: string;
  violationDate: string;  // "YYYY-MM-DD"
  period: number;         // 교시 (1~7)
  memo?: string;
};

export async function submitViolation(input: SubmitViolationInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const schoolId = user.app_metadata?.school_id as string | undefined;
  if (!schoolId) {
    return { error: "학교 정보가 없습니다. 관리자에게 문의하세요." };
  }

  // 입력 유효성 검사
  if (!input.studentId || !input.violationTypeId || !input.violationDate) {
    return { error: "필수 항목을 모두 입력해주세요." };
  }
  if (input.period < 1 || input.period > 9) {
    return { error: "교시는 1~9 사이여야 합니다." };
  }

  const { error } = await supabase.from("violations").insert({
    student_id: input.studentId,
    school_id: schoolId,
    submitted_by: user.id,
    violation_type_id: input.violationTypeId,
    violation_date: input.violationDate,
    period: input.period,
    memo: input.memo?.trim() || null,
  });

  if (error) {
    console.error("위반 제출 오류:", error);
    return { error: "저장 중 오류가 발생했습니다. 다시 시도해주세요." };
  }

  revalidatePath("/violations");
  return { success: true };
}
