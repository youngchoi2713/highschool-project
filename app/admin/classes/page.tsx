import { createClient } from "@/lib/supabase/server";
import { getClasses, getTeachers } from "@/features/admin/queries";
import ClassesClient from "@/features/admin/components/ClassesClient";

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schoolId = user?.app_metadata?.school_id as string;

  const [classes, teachers] = await Promise.all([
    getClasses(schoolId),
    getTeachers(schoolId),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">학급 관리</h1>
      <ClassesClient
        classes={classes as any}
        teachers={teachers.map((t) => ({ id: t.id, name: t.name ?? "" }))}
      />
    </div>
  );
}
