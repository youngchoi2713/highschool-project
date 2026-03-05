import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/classes", label: "학급 관리" },
  { href: "/admin/teachers", label: "교사 관리" },
  { href: "/admin/students", label: "학생 관리" },
];

type Role = "super_admin" | "school_admin" | "homeroom" | "subject";

type UserLike = {
  id: string;
  app_metadata?: Record<string, unknown> | null;
};

function normalizeRole(role: unknown): Role | null {
  if (role === "admin") return "school_admin";
  if (role === "super_admin" || role === "school_admin" || role === "homeroom" || role === "subject") {
    return role;
  }
  return null;
}

async function resolveRole(
  supabase: ReturnType<typeof createClient>,
  user: UserLike | null | undefined
): Promise<Role | null> {
  const fromMetadata = normalizeRole(user?.app_metadata?.role);
  if (fromMetadata) return fromMetadata;
  if (!user?.id) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const fromProfile = normalizeRole(profile?.role);
  if (fromProfile) return fromProfile;

  const admin = createAdminClient();
  const { data: profileByAdmin } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return normalizeRole(profileByAdmin?.role);
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = await resolveRole(supabase, user as UserLike | null | undefined);

  if (role !== "school_admin" && role !== "super_admin") redirect("/");

  async function logout() {
    "use server";
    const supabase = createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-52 shrink-0 border-r bg-white">
        <div className="p-4 border-b">
          <p className="font-bold text-sm">관리자</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <nav className="p-2 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 w-52 p-2 border-t">
          <form action={logout}>
            <button
              type="submit"
              className="w-full rounded-md px-3 py-2 text-sm text-left hover:bg-accent"
            >
              로그아웃
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 bg-gray-50 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
