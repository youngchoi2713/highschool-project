import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getRoleFromMetadata, getSchoolIdFromMetadata, normalizeRole, type AppRole, type AuthUserLike } from "@/lib/auth/identity";

type ServerClient = ReturnType<typeof createClient>;

async function getProfileField(
  supabase: ServerClient,
  userId: string,
  field: "role" | "school_id"
): Promise<string | undefined> {
  const { data: profile } = await supabase
    .from("profiles")
    .select(field)
    .eq("id", userId)
    .maybeSingle();

  const row = (profile ?? null) as Record<string, unknown> | null;
  const value = row?.[field];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

async function getProfileFieldWithService(
  userId: string,
  field: "role" | "school_id"
): Promise<string | undefined> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select(field)
    .eq("id", userId)
    .maybeSingle();

  const row = (profile ?? null) as Record<string, unknown> | null;
  const value = row?.[field];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export async function resolveRole(
  supabase: ServerClient,
  user: AuthUserLike
): Promise<AppRole | null> {
  const fromMetadata = getRoleFromMetadata(user);
  if (fromMetadata) return fromMetadata;
  if (!user?.id) return null;

  const fromProfile = normalizeRole(await getProfileField(supabase, user.id, "role"));
  if (fromProfile) return fromProfile;

  return normalizeRole(await getProfileFieldWithService(user.id, "role"));
}

export async function resolveSchoolId(
  supabase: ServerClient,
  user: AuthUserLike
): Promise<string | undefined> {
  const fromMetadata = getSchoolIdFromMetadata(user);
  if (fromMetadata) return fromMetadata;
  if (!user?.id) return undefined;

  const fromProfile = await getProfileField(supabase, user.id, "school_id");
  if (fromProfile) return fromProfile;

  return getProfileFieldWithService(user.id, "school_id");
}
