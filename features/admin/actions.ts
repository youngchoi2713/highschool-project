"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// ── 학급 ──────────────────────────────────────────
export async function createClass(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = user?.app_metadata?.school_id as string | undefined;
  if (!schoolId) return { error: "권한이 없습니다." };

  const grade = Number(formData.get("grade"));
  const classNumber = Number(formData.get("class_number"));
  const year = Number(formData.get("year"));

  if (!grade || !classNumber || !year) return { error: "모든 항목을 입력해주세요." };

  const { error } = await supabase.from("classes").insert({
    school_id: schoolId,
    grade,
    class_number: classNumber,
    year,
  });

  if (error) return { error: "학급 생성 중 오류가 발생했습니다." };
  revalidatePath("/admin/classes");
  return { success: true };
}

export async function assignHomeroom(classId: string, teacherId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("classes")
    .update({ homeroom_teacher_id: teacherId })
    .eq("id", classId);

  if (error) return { error: "담임 배정 중 오류가 발생했습니다." };
  revalidatePath("/admin/classes");
  return { success: true };
}

// ── 교사 ──────────────────────────────────────────
export async function approveTeacher(
  userId: string,
  role: "homeroom" | "subject",
  schoolId: string
) {
  const admin = createAdminClient();

  // app_metadata에 role, school_id 설정 (사용자가 수정 불가)
  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role, school_id: schoolId },
  });
  if (authError) return { error: "인증 정보 업데이트 실패: " + authError.message };

  // profiles 테이블도 동기화
  const { error: profileError } = await admin
    .from("profiles")
    .update({ role, school_id: schoolId })
    .eq("id", userId);
  if (profileError) return { error: "프로필 업데이트 실패." };

  revalidatePath("/admin/teachers");
  return { success: true };
}

export async function updateTeacherRole(
  userId: string,
  role: "homeroom" | "subject" | "school_admin"
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = user?.app_metadata?.school_id as string | undefined;
  if (!schoolId) return { error: "권한이 없습니다." };

  const admin = createAdminClient();
  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role, school_id: schoolId },
  });
  if (authError) return { error: "역할 변경 실패." };

  await admin.from("profiles").update({ role }).eq("id", userId);
  revalidatePath("/admin/teachers");
  return { success: true };
}

// ── 학생 ──────────────────────────────────────────
export async function createStudent(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = user?.app_metadata?.school_id as string | undefined;
  if (!schoolId) return { error: "권한이 없습니다." };

  const classId = formData.get("class_id") as string;
  const studentNumber = Number(formData.get("student_number"));
  const name = (formData.get("name") as string)?.trim();

  if (!classId || !studentNumber || !name) return { error: "모든 항목을 입력해주세요." };

  const { error } = await supabase.from("students").insert({
    class_id: classId,
    school_id: schoolId,
    student_number: studentNumber,
    name,
    is_active: true,
  });

  if (error) return { error: "학생 등록 중 오류가 발생했습니다." };
  revalidatePath("/admin/students");
  return { success: true };
}

export async function bulkCreateStudents(
  rows: { classId: string; studentNumber: number; name: string }[],
  schoolId: string
) {
  const admin = createAdminClient();

  const inserts = rows.map((r) => ({
    class_id: r.classId,
    school_id: schoolId,
    student_number: r.studentNumber,
    name: r.name,
    is_active: true,
  }));

  const { error } = await admin.from("students").insert(inserts);
  if (error) return { error: "일괄 등록 중 오류: " + error.message };

  revalidatePath("/admin/students");
  return { success: true, count: inserts.length };
}
