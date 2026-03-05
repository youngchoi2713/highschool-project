import { createClient } from "@/lib/supabase/server";
import { resolveSchoolId } from "@/lib/auth/server-identity";
import { redirect } from "next/navigation";
import { getStudents, getClasses } from "@/features/admin/queries";
import StudentsClient from "@/features/admin/components/StudentsClient";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const schoolId = await resolveSchoolId(supabase, user);
  if (!schoolId) redirect("/");

  const [students, classes] = await Promise.all([
    getStudents(schoolId),
    getClasses(schoolId),
  ]);

  const classOptions = classes.map((c) => ({
    id: c.id,
    grade: c.grade,
    class_number: c.class_number,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">학생 관리</h1>
      <StudentsClient
        students={students as any}
        classes={classOptions}
        schoolId={schoolId}
      />
    </div>
  );
}
