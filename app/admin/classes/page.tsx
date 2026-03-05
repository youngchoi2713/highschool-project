import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getClasses, getTeachers } from "@/features/admin/queries";
import ClassesClient from "@/features/admin/components/ClassesClient";

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

export default async function ClassesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const schoolId = await resolveSchoolId(supabase, user as UserLike | null | undefined);
  if (!schoolId) redirect("/");

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
