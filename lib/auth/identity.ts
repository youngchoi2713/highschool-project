export type AppRole = "super_admin" | "school_admin" | "homeroom" | "subject";

export type RawAppRole = AppRole | "admin";

export type AuthUserLike = {
  id?: string;
  app_metadata?: Record<string, unknown> | null;
} | null | undefined;

export function normalizeRole(role: unknown): AppRole | null {
  if (role === "admin") return "school_admin";
  if (role === "super_admin" || role === "school_admin" || role === "homeroom" || role === "subject") {
    return role;
  }
  return null;
}

export function getRoleFromMetadata(user: AuthUserLike): AppRole | null {
  return normalizeRole(user?.app_metadata?.role);
}

export function getSchoolIdFromMetadata(user: AuthUserLike): string | undefined {
  const raw = user?.app_metadata?.school_id;
  if (typeof raw === "string" && raw.length > 0) return raw;
  return undefined;
}
