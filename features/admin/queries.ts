import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function getAdminStats(schoolId: string) {
  const supabase = createClient();

  const [students, teachers, violations] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("is_active", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("violations").select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .gte("violation_date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)),
  ]);

  return {
    studentCount: students.count ?? 0,
    teacherCount: teachers.count ?? 0,
    violationsThisMonth: violations.count ?? 0,
  };
}

export async function getClasses(schoolId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("classes")
    .select("id, grade, class_number, year, profiles(id, name)")
    .eq("school_id", schoolId)
    .order("grade").order("class_number");
  return data ?? [];
}

export async function getTeachers(schoolId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, name, email, role")
    .eq("school_id", schoolId)
    .order("name");
  return data ?? [];
}

export async function getPendingTeachers() {
  // school_id가 null인 미승인 교사 (admin client 필요 — auth.users 조회)
  const admin = createAdminClient();
  const { data } = await admin.from("profiles")
    .select("id, name, email, role")
    .is("school_id", null)
    .order("name");
  return data ?? [];
}

export async function getStudents(schoolId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("students")
    .select("id, student_number, name, is_active, classes(grade, class_number)")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("student_number");
  return data ?? [];
}
