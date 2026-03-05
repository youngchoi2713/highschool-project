"use server";

import { createAdminClient } from "@/lib/supabase/server";

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  subject?: string;
  schoolId: string;
  role: "homeroom" | "subject";
  classId?: string;
};

export async function registerTeacher(input: RegisterInput) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const phone = input.phone?.trim();
  const subject = input.subject?.trim();
  const schoolId = input.schoolId;
  const role = input.role;
  const classId = input.classId;

  if (!name) return { error: "이름을 입력해 주세요." };
  if (!email) return { error: "이메일을 입력해 주세요." };
  if (password.length < 8) return { error: "비밀번호는 8자 이상이어야 합니다." };
  if (!schoolId) return { error: "학교를 선택해 주세요." };
  if (role === "homeroom" && !classId) {
    return { error: "담임은 담당 학급을 선택해야 합니다." };
  }

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      phone: phone ?? "",
      subject: subject ?? "",
    },
    app_metadata: {
      role,
      school_id: schoolId,
    },
  });

  if (createError) {
    if (createError.message.includes("already been registered") || createError.message.includes("already registered")) {
      return { error: "이미 등록된 이메일입니다." };
    }
    return { error: "가입 중 오류가 발생했습니다." };
  }

  if (!created.user) {
    return { error: "가입 중 오류가 발생했습니다." };
  }

  const { error: upsertErr } = await admin.from("profiles").upsert(
    {
      id: created.user.id,
      email,
      name,
      phone: phone || null,
      subject: subject || null,
      role,
      school_id: schoolId,
    },
    { onConflict: "id" }
  );

  if (upsertErr) {
    const { error: fallbackErr } = await admin.from("profiles").upsert(
      {
        id: created.user.id,
        email,
        name,
        role,
        school_id: schoolId,
      },
      { onConflict: "id" }
    );

    if (fallbackErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      return { error: "가입 중 오류가 발생했습니다." };
    }
  }

  if (role === "homeroom" && classId) {
    const { data: assignedClass, error: assignError } = await admin
      .from("classes")
      .update({ homeroom_teacher_id: created.user.id })
      .eq("id", classId)
      .eq("school_id", schoolId)
      .select("id")
      .single();

    if (assignError || !assignedClass) {
      await admin.from("profiles").delete().eq("id", created.user.id);
      await admin.auth.admin.deleteUser(created.user.id);
      return { error: "담임 학급 배정 중 오류가 발생했습니다. 다시 시도해 주세요." };
    }
  }

  return { success: true };
}

export async function getSchools() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("schools")
    .select("id, name")
    .order("name");
  return data ?? [];
}

export async function getClassesBySchool(schoolId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("classes")
    .select("id, grade, class_number")
    .eq("school_id", schoolId)
    .order("grade")
    .order("class_number");
  return data ?? [];
}
