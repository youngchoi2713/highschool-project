import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTeachers, getClasses } from "@/features/admin/queries";
import TeachersClient from "@/features/admin/components/TeachersClient";

export const dynamic = "force-dynamic";

type UserLike = {
  id: string;
  app_metadata?: Record<string, unknown> | null;
};

async function resolveSchoolId(
  supabase: ReturnType<typeof createClient>,
  user: UserLike | null | undefined
): Promise<string | null> {
  const fromMetadata = user?.app_metadata?.school_id;
  if (typeof fromMetadata === "string" && fromMetadata.length > 0) return fromMetadata;
  if (!user?.id) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .single();

  const fromProfile = (profile?.school_id as string | undefined) ?? undefined;
  if (fromProfile) return fromProfile;

  const admin = createAdminClient();
  const { data: profileByAdmin } = await admin
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  return (profileByAdmin?.school_id as string | undefined) ?? null;
}

export default async function TeachersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const schoolId = await resolveSchoolId(supabase, user as UserLike | null | undefined);
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
