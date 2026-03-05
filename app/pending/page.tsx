import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function normalizeRole(role: unknown): string | null {
  if (role === "admin") return "school_admin";
  if (typeof role === "string") return role;
  return null;
}

export default async function PendingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = normalizeRole(user.app_metadata?.role);

  redirect(
    role === "super_admin" || role === "school_admin"
      ? "/admin"
      : role === "homeroom"
        ? "/violations"
        : role === "subject"
          ? "/submit"
          : "/"
  );
}
