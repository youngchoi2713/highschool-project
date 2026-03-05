import { createClient } from "@/lib/supabase/server";
import { resolveSchoolId } from "@/lib/auth/server-identity";
import { redirect } from "next/navigation";
import { getTeachers, getClasses } from "@/features/admin/queries";
import TeachersClient from "@/features/admin/components/TeachersClient";

export const dynamic = "force-dynamic";

export default async function TeachersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const schoolId = await resolveSchoolId(supabase, user);
  if (!schoolId) redirect("/");

  const [teachers, classes] = await Promise.all([
    getTeachers(schoolId),
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
        schoolId={schoolId}
        classes={classOptions}
      />
    </div>
  );
}
