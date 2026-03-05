"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SubmitViolationInput = {
  studentId: string;
  violationTypeIds: string[];
  violationDate: string;  // "YYYY-MM-DD"
  period: number;         // 교시 (1~9)
  memo?: string;
};

async function getCurrentSchoolId(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  metadataSchoolId?: string | null
) {
  if (metadataSchoolId) return metadataSchoolId;

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", userId)
    .single();

  return (profile?.school_id as string | null) ?? null;
}

export async function submitViolation(input: SubmitViolationInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const schoolId = await getCurrentSchoolId(
    supabase,
    user.id,
    (user.app_metadata?.school_id as string | null | undefined) ?? null
  );
  if (!schoolId) {
    return { error: "학교 정보가 없습니다. 관리자에게 문의하세요." };
  }

  if (!input.studentId || !input.violationDate || input.violationTypeIds.length === 0 || !input.period) {
    return { error: "메모를 제외한 모든 항목을 입력해주세요." };
  }
  if (input.period < 1 || input.period > 9) {
    return { error: "교시는 1~9 사이여야 합니다." };
  }

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", input.studentId)
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .single();

  if (!student) {
    return { error: "해당 학생을 찾을 수 없습니다." };
  }

  const distinctTypeIds = Array.from(new Set(input.violationTypeIds));
  const inserts = distinctTypeIds.map((typeId) => ({
    student_id: input.studentId,
    school_id: schoolId,
    submitted_by: user.id,
    violation_type_id: typeId,
    violation_date: input.violationDate,
    period: input.period,
    memo: input.memo?.trim() || null,
  }));

  const { error } = await supabase.from("violations").insert(inserts);

  if (error) {
    console.error("위반 제출 오류:", error);
    return { error: "저장 중 오류가 발생했습니다. 다시 시도해주세요." };
  }

  revalidatePath("/submit");
  revalidatePath("/violations");
  return { success: true, count: inserts.length };
}

export async function getStudentsByClassAction(classId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const schoolId = await getCurrentSchoolId(
    supabase,
    user.id,
    (user.app_metadata?.school_id as string | null | undefined) ?? null
  );
  if (!schoolId || !classId) return [];

  const { data } = await supabase
    .from("students")
    .select("id, student_number, name")
    .eq("class_id", classId)
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("student_number");

  return data ?? [];
}
