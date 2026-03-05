import { createClient } from "@/lib/supabase/server";

async function getCurrentSchoolId(supabase: ReturnType<typeof createClient>, userId: string, metadataSchoolId?: string | null) {
  if (metadataSchoolId) return metadataSchoolId;

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", userId)
    .single();

  return (profile?.school_id as string | null) ?? null;
}

export async function getMyClasses() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const schoolId = await getCurrentSchoolId(
    supabase,
    user.id,
    (user.app_metadata?.school_id as string | null | undefined) ?? null
  );
  if (!schoolId) return [];

  const currentYear = new Date().getFullYear();

  const { data, error } = await supabase
    .from("classes")
    .select("id, grade, class_number, year")
    .eq("school_id", schoolId)
    .eq("year", currentYear)
    .order("grade")
    .order("class_number");

  if (error || !data) {
    const { data: fallback } = await supabase
      .from("classes")
      .select("id, grade, class_number, year")
      .eq("school_id", schoolId)
      .order("grade")
      .order("class_number");
    return fallback ?? [];
  }

  return data;
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
