import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";

export const SESSION_COOKIE_NAME = "clarice_assis_session";

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: "reader" | "admin";
  literaryTitle: string;
}

export function getSessionUser(
  request: NextRequest
): AuthenticatedUser | null {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const db = getDb();
    const now = Date.now();

    // Clean up expired sessions
    db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now);

    const row = db
      .prepare(
        `SELECT u.id, u.name, u.email, u.role, u.literary_title
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at >= ?`
      )
      .get(token, now) as
      | {
          id: number;
          name: string;
          email: string;
          role: "reader" | "admin";
          literary_title: string;
        }
      | undefined;

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      literaryTitle: row.literary_title
    };
  } catch {
    return null;
  }
}
