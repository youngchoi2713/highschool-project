import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { resolveRole } from "@/lib/auth/server-identity";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = await resolveRole(supabase, user);

  async function logout() {
    "use server";
    const supabase = createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <header className="border-b">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <span className="text-lg font-bold">교칙위반 관리</span>
            <Link
              href="/login"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              로그인
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h1 className="text-4xl font-bold leading-tight">
            전자기기 및 교복 점검표를<br />웹으로 바로 제출하세요
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            교과 선생님은 빠르게 report하고,
            담임 선생님은 반 전체 현황을 한눈에 파악할 수 있습니다.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/register"
              className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              회원가입
            </Link>
            <Link
              href="/login"
              className="rounded-md border px-6 py-3 text-sm font-medium hover:bg-accent"
            >
              로그인
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const menu = [
    {
      href: "/violations",
      title: "담임 현황 보기",
      desc: "반 학생 위반 이력과 요약 통계를 확인합니다.",
      show: role === "homeroom" || role === "school_admin" || role === "super_admin",
    },
    {
      href: "/submit",
      title: "위반 사항 제출",
      desc: "전자기기/교복 점검 결과를 제출합니다.",
      show: role === "subject" || role === "homeroom" || role === "school_admin" || role === "super_admin",
    },
    {
      href: "/admin",
      title: "학교 관리",
      desc: "학급, 담임 배정, 학생/교사 데이터를 관리합니다.",
      show: role === "school_admin" || role === "super_admin",
    },
  ].filter((m) => m.show);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between rounded-lg border bg-white px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold">교칙위반 관리 메인</h1>
            <p className="text-sm text-muted-foreground">원하는 기능을 선택해 이동하세요.</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border px-3 py-2 text-sm hover:bg-accent"
            >
              로그아웃
            </button>
          </form>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {menu.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="rounded-lg border bg-white p-5 transition-shadow hover:shadow-md"
            >
              <h2 className="text-lg font-semibold">{m.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{m.desc}</p>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
