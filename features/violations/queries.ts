import { createClient } from "@/lib/supabase/server";

export async function getMyClasses() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const schoolId = user.app_metadata?.school_id;
  if (!schoolId) return [];

  const { data } = await supabase
    .from("classes")
    .select("id, grade, class_number")
    .eq("school_id", schoolId)
    .order("grade")
    .order("class_number");

  return data ?? [];
}

export async function getStudentsByClass(classId: string) {
  const supabase = createClient();

  const { data } = await supabase
    .from("students")
    .select("id, student_number, name")
    .eq("class_id", classId)
    .eq("is_active", true)
    .order("student_number");

  return data ?? [];
}

export async function getViolationTypes() {
  const supabase = createClient();

  const { data } = await supabase
    .from("violation_types")
    .select("id, code, label")
    .order("label");

  return data ?? [];
}

export async function getViolationsByHomeroom(filters?: {
  classId?: string;
  from?: string;
  to?: string;
  typeId?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // 담임 선생님의 학급 id 조회
  const { data: myClass } = await supabase
    .from("classes")
    .select("id")
    .eq("homeroom_teacher_id", user.id)
    .single();

  if (!myClass) return [];

  const classId = filters?.classId ?? myClass.id;

  let query = supabase
    .from("violations")
    .select(`
      id,
      violation_date,
      period,
      memo,
      created_at,
      students (id, name, student_number),
      violation_types (id, code, label),
      profiles (id, name)
    `)
    .eq("students.class_id", classId);

  if (filters?.from) query = query.gte("violation_date", filters.from);
  if (filters?.to) query = query.lte("violation_date", filters.to);
  if (filters?.typeId) query = query.eq("violation_type_id", filters.typeId);

  const { data } = await query.order("violation_date", { ascending: false });
  return data ?? [];
}
