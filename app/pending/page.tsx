import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PendingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  async function logout() {
    "use server";
    const supabase = createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-4">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">승인 대기 중</h1>
        <p className="text-muted-foreground">
          관리자가 계정을 검토 중입니다. 승인 후 이용 가능합니다.
        </p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="text-sm text-muted-foreground underline underline-offset-2"
        >
          로그아웃
        </button>
      </form>
    </div>
  );
}
