// src/lib/auth/permissions.ts
import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { AppError } from "@/lib/errors/AppError";
import { ErrorCodes } from "@/lib/errors/codes";

export type AcademyRole = "owner" | "admin" | "member";

/**
 * Throws 403 AppError if the user's role in the academy is not in the allowed list.
 * Returns { academyId, role } if authorized.
 */
export async function requireRole(
  userId: string,
  allowed: AcademyRole[]
): Promise<{ academyId: string; role: AcademyRole }> {
  const { academyId, role } = await resolveAcademyMembership(userId);

  if (!allowed.includes(role as AcademyRole)) {
    throw new AppError(ErrorCodes.FORBIDDEN, { statusHint: 403 });
  }

  return { academyId, role: role as AcademyRole };
}

/**
 * Throws 403 AppError if the teacher record is not owned by (user_id =) the given userId.
 * Returns the teacherId if authorized.
 */
export async function requireOwnTeacher(
  userId: string,
  teacherId: string
): Promise<string> {
  const client = getServiceRoleClient();

  const { data, error } = await client
    .from("teachers")
    .select("id")
    .eq("id", teacherId)
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (error || !data) {
    throw new AppError(ErrorCodes.FORBIDDEN, { statusHint: 403 });
  }

  return data.id as string;
}

/**
 * Returns the teacher.id that has user_id = userId in the same academy as the user,
 * or null if the user has no linked teacher.
 */
export async function getMyTeacherId(
  userId: string,
  academyId: string
): Promise<string | null> {
  const client = getServiceRoleClient();

  const { data, error } = await client
    .from("teachers")
    .select("id")
    .eq("academy_id", academyId)
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data.id as string;
}

/**
 * Whitelist filter: returns a copy of `body` with only the allowed fields.
 * Fields not in `allowedFields` are dropped silently.
 */
export function pickAllowedFields<T extends Record<string, unknown>>(
  body: T,
  allowedFields: (keyof T)[]
): Partial<T> {
  return Object.fromEntries(
    Object.entries(body).filter(([k]) => allowedFields.includes(k as keyof T))
  ) as Partial<T>;
}
