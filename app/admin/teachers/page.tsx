import { createClient } from "@/lib/supabase/server";
import { getTeachers, getPendingTeachers, getClasses } from "@/features/admin/queries";
import TeachersClient from "@/features/admin/components/TeachersClient";

export const dynamic = "force-dynamic";

export default async function TeachersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = user?.app_metadata?.school_id as string;

  const [teachers, pending, classes] = await Promise.all([
    getTeachers(schoolId),
    getPendingTeachers(),
    getClasses(schoolId),
  ]);

  const classOptions = classes.map((c) => ({
    id: c.id,
    grade: c.grade,
    class_number: c.class_number,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">교사 관리</h1>
      <TeachersClient
        teachers={teachers as any}
        pending={pending as any}
        schoolId={schoolId}
        classes={classOptions}
      />
    </div>
  );
}
