import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAdminStats } from "@/features/admin/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

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

export default async function AdminDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const schoolId = await resolveSchoolId(supabase, user as UserLike | null | undefined);
  if (!schoolId) redirect("/");

  const { data: school } = await supabase
    .from("schools")
    .select("name")
    .eq("id", schoolId)
    .single();

  const stats = await getAdminStats(schoolId);

  const STATS = [
    { label: "전체 학생", value: stats.studentCount, href: "/admin/students" },
    { label: "교사", value: stats.teacherCount, href: "/admin/teachers" },
    { label: "이번 달 위반", value: stats.violationsThisMonth, href: "/violations" },
  ];

  const SHORTCUTS = [
    { href: "/admin/classes", label: "학급 추가" },
    { href: "/admin/teachers", label: "교사 등록/관리" },
    { href: "/admin/students", label: "학생 CSV 등록" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{school?.name ?? "학교"} 관리자</h1>
        <p className="text-muted-foreground text-sm">오늘도 좋은 하루 되세요.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {STATS.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-sm text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-3xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-base font-semibold mb-3">바로가기</h2>
        <div className="flex gap-3">
          {SHORTCUTS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-md border bg-white px-4 py-2 text-sm hover:bg-accent"
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
