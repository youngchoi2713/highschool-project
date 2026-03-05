"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

function dbErr(error: { message?: string; code?: string }, label: string): string {
  const msg = error.message ?? "";
  if (msg.includes("duplicate key") || error.code === "23505") {
    if (label === "학급") return "이미 등록된 학급입니다.";
    if (label === "학생") return "이미 등록된 학생입니다.";
    return "이미 등록된 항목입니다.";
  }
  if (msg.includes("foreign key") || error.code === "23503") {
    return "연관 데이터가 있어 처리할 수 없습니다.";
  }
  return `${label} 처리 중 오류가 발생했습니다.`;
}

async function resolveSchoolId(
  supabase: ReturnType<typeof createClient>,
  user: { id?: string; app_metadata?: Record<string, unknown> | null } | null | undefined
) {
  const fromMetadata = user?.app_metadata?.["school_id"];
  if (typeof fromMetadata === "string" && fromMetadata.length > 0) return fromMetadata;
  if (!user?.id) return undefined;

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .single();

  const fromProfile = (profile?.school_id as string | undefined) ?? undefined;
  if (fromProfile) return fromProfile;

  const admin = createAdminClient();
  const { data: profileByAdmin } = await admin
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  return (profileByAdmin?.school_id as string | undefined) ?? undefined;
}
// ── 학급 ──────────────────────────────────────────
export async function createClass(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = await resolveSchoolId(supabase, user);
  if (!schoolId) return { error: "권한이 없습니다." };

  const grade = Number(formData.get("grade"));
  const classNumber = Number(formData.get("class_number"));
  const year = Number(formData.get("year"));

  if (!grade || !classNumber || !year) return { error: "모든 항목을 입력해주세요." };

  const admin = createAdminClient();
  const { data: newClass, error } = await admin
    .from("classes")
    .insert({ school_id: schoolId, grade, class_number: classNumber, year })
    .select("id, grade, class_number, year")
    .single();

  if (error) return { error: dbErr(error, "학급") };
  revalidatePath("/admin/classes");
  return { success: true, data: newClass };
}

export async function updateClass(
  classId: string,
  data: { grade: number; class_number: number; year: number }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = await resolveSchoolId(supabase, user);
  if (!schoolId) return { error: "권한이 없습니다." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("classes")
    .update({ grade: data.grade, class_number: data.class_number, year: data.year })
    .eq("id", classId)
    .eq("school_id", schoolId);

  if (error) return { error: dbErr(error, "학급") };
  revalidatePath("/admin/classes");
  return { success: true };
}

export async function deleteClass(classId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = await resolveSchoolId(supabase, user);
  if (!schoolId) return { error: "권한이 없습니다." };

  const admin = createAdminClient();

  const { count } = await admin
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId)
    .eq("is_active", true);

  if (count && count > 0) {
    return { error: `이 학급에 재학 중인 학생이 ${count}명 있습니다. 학생을 먼저 삭제하세요.` };
  }

  const { error } = await admin
    .from("classes")
    .delete()
    .eq("id", classId)
    .eq("school_id", schoolId);

  if (error) return { error: dbErr(error, "학급") };
  revalidatePath("/admin/classes");
  return { success: true };
}

export async function assignHomeroom(classId: string, teacherId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = await resolveSchoolId(supabase, user);
  if (!schoolId) return { error: "권한이 없습니다." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("classes")
    .update({ homeroom_teacher_id: teacherId || null })
    .eq("id", classId)
    .eq("school_id", schoolId);

  if (error) return { error: "담임 배정 중 오류가 발생했습니다." };
  revalidatePath("/admin/classes");
  return { success: true };
}

// ── 교사 ──────────────────────────────────────────
export async function createTeacher(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  subject?: string;
  role: "homeroom" | "subject" | "school_admin";
  classId?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = await resolveSchoolId(supabase, user);
  if (!schoolId) return { error: "권한이 없습니다." };

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      name: data.name,
      phone: data.phone ?? "",
      subject: data.subject ?? "",
    },
    app_metadata: { role: data.role, school_id: schoolId },
  });

  if (createError) {
    if (
      createError.message.includes("already been registered") ||
      createError.message.includes("already registered")
    ) {
      return { error: "이미 등록된 이메일입니다." };
    }
    return { error: "교사 등록 중 오류가 발생했습니다." };
  }

  // Try upsert with phone/subject (Phase A migrated)
  const { error: upsertErr } = await admin.from("profiles").upsert(
    {
      id: created.user.id,
      email: data.email,
      name: data.name,
      phone: data.phone ?? null,
      subject: data.subject ?? null,
      role: data.role,
      school_id: schoolId,
    },
    { onConflict: "id" }
  );

  // Fallback: phone/subject 컬럼 미존재 시 (Phase A SQL 미실행)
  if (upsertErr) {
    const { error: fallbackErr } = await admin.from("profiles").upsert(
      {
        id: created.user.id,
        email: data.email,
        name: data.name,
        role: data.role,
        school_id: schoolId,
      },
      { onConflict: "id" }
    );
    if (fallbackErr) return { error: "교사 프로필 등록 중 오류가 발생했습니다." };
  }

  // 담임 학급 배정
  if (data.role === "homeroom" && data.classId) {
    await admin
      .from("classes")
      .update({ homeroom_teacher_id: created.user.id })
      .eq("id", data.classId)
      .eq("school_id", schoolId);
    revalidatePath("/admin/classes");
  }

  revalidatePath("/admin/teachers");
  return {
    success: true,
    data: {
      id: created.user.id,
      name: data.name,
      email: data.email,
      role: data.role,
      phone: data.phone ?? null,
      subject: data.subject ?? null,
    },
  };
}

export async function bulkCreateTeachers(
  rows: {
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    role: "homeroom" | "subject";
  }[],
  schoolId: string
) {
  const admin = createAdminClient();
  const results: { email: string; tempPassword?: string; error?: string }[] = [];

  for (const row of rows) {
    const tempPassword =
      Math.random().toString(36).slice(2, 8) +
      Math.random().toString(36).toUpperCase().slice(2, 5) +
      "1!";

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: row.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name: row.name,
        phone: row.phone ?? "",
        subject: row.subject ?? "",
      },
      app_metadata: { role: row.role, school_id: schoolId },
    });

    if (createError) {
      results.push({ email: row.email, error: createError.message });
      continue;
    }

    const { error: upsertErr } = await admin.from("profiles").upsert(
      {
        id: created.user.id,
        email: row.email,
        name: row.name,
        phone: row.phone ?? null,
        subject: row.subject ?? null,
        role: row.role,
        school_id: schoolId,
      },
      { onConflict: "id" }
    );

    // Fallback: phone/subject 컬럼 미존재 시 (Phase A SQL 미실행)
    if (upsertErr) {
      await admin.from("profiles").upsert(
        { id: created.user.id, email: row.email, name: row.name, role: row.role, school_id: schoolId },
        { onConflict: "id" }
      );
    }

    results.push({ email: row.email, tempPassword });
  }

  revalidatePath("/admin/teachers");

  const created = results.filter((r) => !r.error);
  const failed = results.filter((r) => r.error);
  return { success: true, created, failed };
}

export async function updateTeacherRole(
  userId: string,
  role: "homeroom" | "subject" | "school_admin"
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = await resolveSchoolId(supabase, user);
  if (!schoolId) return { error: "권한이 없습니다." };

  const admin = createAdminClient();
  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role, school_id: schoolId },
  });
  if (authError) return { error: "역할 변경 중 오류가 발생했습니다." };

  await admin.from("profiles").update({ role }).eq("id", userId);
  revalidatePath("/admin/teachers");
  return { success: true };
}

export async function updateTeacher(
  userId: string,
  data: { name?: string; phone?: string; subject?: string }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = await resolveSchoolId(supabase, user);
  if (!schoolId) return { error: "권한이 없습니다." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ ...data })
    .eq("id", userId)
    .eq("school_id", schoolId);

  if (error) return { error: "교사 정보 수정 중 오류가 발생했습니다." };
  revalidatePath("/admin/teachers");
  return { success: true };
}

export async function deleteTeacher(userId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = await resolveSchoolId(supabase, user);
  if (!schoolId) return { error: "권한이 없습니다." };

  const admin = createAdminClient();

  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) return { error: "교사 삭제 중 오류가 발생했습니다." };

  await admin.from("profiles").delete().eq("id", userId);

  revalidatePath("/admin/teachers");
  return { success: true };
}

// ── 학생 ──────────────────────────────────────────
export async function createStudent(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = await resolveSchoolId(supabase, user);
  if (!schoolId) return { error: "권한이 없습니다." };

  const classId = formData.get("class_id") as string;
  const studentNumber = Number(formData.get("student_number"));
  const name = (formData.get("name") as string)?.trim();

  if (!classId || !studentNumber || !name) return { error: "모든 항목을 입력해주세요." };

  const admin = createAdminClient();
  const { error } = await admin.from("students").insert({
    class_id: classId,
    school_id: schoolId,
    student_number: studentNumber,
    name,
    is_active: true,
  });

  if (error) return { error: dbErr(error, "학생") };
  revalidatePath("/admin/students");
  return { success: true };
}

export async function updateStudent(
  studentId: string,
  data: { name?: string; student_number?: number; class_id?: string }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = await resolveSchoolId(supabase, user);
  if (!schoolId) return { error: "권한이 없습니다." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("students")
    .update({ ...data })
    .eq("id", studentId)
    .eq("school_id", schoolId);

  if (error) return { error: "학생 정보 수정 중 오류가 발생했습니다." };
  revalidatePath("/admin/students");
  return { success: true };
}

export async function deleteStudent(studentId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = await resolveSchoolId(supabase, user);
  if (!schoolId) return { error: "권한이 없습니다." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("students")
    .update({ is_active: false })
    .eq("id", studentId)
    .eq("school_id", schoolId);

  if (error) return { error: "학생 삭제 중 오류가 발생했습니다." };
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
  if (error) return { error: dbErr(error, "학생") };

  revalidatePath("/admin/students");
  return { success: true, count: inserts.length };
}

export async function bulkCreateStudentsWithAutoClass(
  rows: { grade: number; classNum: number; studentNumber: number; name: string }[],
  schoolId: string,
  year: number
) {
  const admin = createAdminClient();

  const { data: existingClasses } = await admin
    .from("classes")
    .select("id, grade, class_number")
    .eq("school_id", schoolId)
    .eq("year", year);

  const classMap = new Map<string, string>();
  for (const c of existingClasses ?? []) {
    classMap.set(`${c.grade}-${c.class_number}`, c.id);
  }

  const neededKeys = Array.from(new Set(rows.map((r) => `${r.grade}-${r.classNum}`)));
  for (const key of neededKeys) {
    if (!classMap.has(key)) {
      const [grade, classNum] = key.split("-").map(Number);
      const { data: newClass, error } = await admin
        .from("classes")
        .insert({ school_id: schoolId, grade, class_number: classNum, year })
        .select("id")
        .single();
      if (error) return { error: `${grade}학년 ${classNum}반 학급 등록 중 오류가 발생했습니다.` };
      classMap.set(key, newClass.id);
    }
  }

  const inserts = rows.map((r) => ({
    class_id: classMap.get(`${r.grade}-${r.classNum}`)!,
    school_id: schoolId,
    student_number: r.studentNumber,
    name: r.name,
    is_active: true,
  }));

  const { error } = await admin.from("students").insert(inserts);
  if (error) return { error: "일괄 등록 중 오류: " + error.message };

  revalidatePath("/admin/students");
  revalidatePath("/admin/classes");
  return { success: true, count: inserts.length };
}

