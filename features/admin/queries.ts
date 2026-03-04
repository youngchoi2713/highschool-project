import { createAdminClient } from "@/lib/supabase/server";

export async function getAdminStats(schoolId: string) {
  const admin = createAdminClient();

  const [students, teachers, violations] = await Promise.all([
    admin.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("is_active", true),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    admin.from("violations").select("id", { count: "exact", head: true })
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
  const admin = createAdminClient();
  const { data } = await admin
    .from("classes")
    .select("id, grade, class_number, year, profiles(id, name)")
    .eq("school_id", schoolId)
    .order("grade").order("class_number");
  return data ?? [];
}

export async function getTeachers(schoolId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, name, email, role, phone, subject")
    .eq("school_id", schoolId)
    .order("name");
  return data ?? [];
}

export async function getPendingTeachers() {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles")
    .select("id, name, email, role, phone, subject")
    .is("school_id", null)
    .order("name");
  return data ?? [];
}

export async function getStudents(schoolId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("students")
    .select("id, student_number, name, is_active, class_id, classes(id, grade, class_number)")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("student_number");
  return data ?? [];
}
