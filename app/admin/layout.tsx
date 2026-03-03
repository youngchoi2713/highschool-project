import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/classes", label: "학급 관리" },
  { href: "/admin/teachers", label: "교사 관리" },
  { href: "/admin/students", label: "학생 관리" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = user.app_metadata?.role;
  if (role !== "school_admin" && role !== "super_admin") redirect("/");

  async function logout() {
    "use server";
    const supabase = createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      {/* 사이드바 */}
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

      {/* 메인 */}
      <main className="flex-1 bg-gray-50 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
