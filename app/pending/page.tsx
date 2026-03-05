import { createClient } from "@/lib/supabase/server";
import { resolveRole } from "@/lib/auth/server-identity";
import { redirect } from "next/navigation";

export default async function PendingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = await resolveRole(supabase, user);

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
