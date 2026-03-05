import { createAdminClient } from "@/lib/supabase/server";

type TeacherRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  phone: string | null;
  subject: string | null;
  homeroom_class: string | null;
};

async function hydrateTeacherFieldsFromAuth(rows: TeacherRow[]) {
  const admin = createAdminClient();

  return Promise.all(
    rows.map(async (t) => {
      const needsHydration = !t.name || !t.phone || !t.subject;
      if (!needsHydration) return t;

      const { data } = await admin.auth.admin.getUserById(t.id);
      const meta = data?.user?.user_metadata as Record<string, string> | undefined;

      return {
        ...t,
        name: t.name ?? meta?.name ?? null,
        phone: t.phone ?? meta?.phone ?? null,
        subject: t.subject ?? meta?.subject ?? null,
      };
    })
  );
}

export async function getAdminStats(schoolId: string) {
  const admin = createAdminClient();

  const [students, teachers, violations] = await Promise.all([
    admin.from("students").select("id", { count: "exact", head: true })
      .eq("school_id", schoolId).eq("is_active", true),
    admin.from("profiles").select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .in("role", ["homeroom", "subject", "school_admin"]),
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

  // phone/subject 컬럼 포함 쿼리 시도
  const { data, error } = await admin
    .from("profiles")
    .select("id, name, email, role, phone, subject")
    .eq("school_id", schoolId)
    .in("role", ["homeroom", "subject", "school_admin"])
    .order("name");

  const teachers = (error?.message?.includes("does not exist")
    ? await admin
      .from("profiles")
      .select("id, name, email, role")
      .eq("school_id", schoolId)
      .in("role", ["homeroom", "subject", "school_admin"])
      .order("name")
      .then((res) =>
        (res.data ?? []).map((p) => ({ ...p, phone: null, subject: null }))
      )
    : (data ?? [])) as Omit<TeacherRow, "homeroom_class">[];

  const { data: homeroomClasses } = await admin
    .from("classes")
    .select("homeroom_teacher_id, grade, class_number")
    .eq("school_id", schoolId)
    .not("homeroom_teacher_id", "is", null);

  const classMap = new Map<string, string>();
  for (const c of homeroomClasses ?? []) {
    if (c.homeroom_teacher_id) {
      classMap.set(c.homeroom_teacher_id, `${c.grade}학년 ${c.class_number}반`);
    }
  }

  const withClass: TeacherRow[] = teachers.map((t) => ({
    ...t,
    homeroom_class: classMap.get(t.id) ?? null,
  }));

  return hydrateTeacherFieldsFromAuth(withClass);
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
