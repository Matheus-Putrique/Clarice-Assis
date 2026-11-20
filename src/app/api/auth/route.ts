import { NextRequest, NextResponse } from "next/server";
import {
  getDb,
  hashPassword,
  verifyPassword,
  generateSessionToken,
  checkRateLimit
} from "@/lib/db";
import { getSessionUser, SESSION_COOKIE_NAME } from "@/lib/auth";

function sanitizeField(input: unknown, maxLen: number): string {
  return String(input || "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLen);
}

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

export async function GET(request: NextRequest) {
  const user = getSessionUser(request);
  return NextResponse.json({ user });
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "local";

    const rate = checkRateLimit(`auth:${ip}`, 12, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Muitas tentativas seguidas. Aguarde ${rate.retryAfterSec}s por segurança.`
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const action = sanitizeField(body.action, 20);
    const db = getDb();

    // 1. LOGOUT
    if (action === "logout") {
      const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
      if (token) {
        db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
      }
      const res = NextResponse.json({ success: true, user: null });
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }

    const email = sanitizeField(body.email, 100).toLowerCase();
    const password = String(body.password || "");

    if (!email.includes("@") || email.length < 5) {
      return NextResponse.json(
        { error: "Informe um endereço de e-mail válido." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    // 2. REGISTER NEW READER ACCOUNT
    if (action === "register") {
      const name = sanitizeField(body.name, 60);
      const literaryTitle =
        sanitizeField(body.literaryTitle, 50) ||
        "Membro do Gabinete de Leitura";

      if (name.length < 2) {
        return NextResponse.json(
          { error: "Informe seu nome completo ou apelido literário." },
          { status: 400 }
        );
      }

      const existing = db
        .prepare("SELECT id FROM users WHERE email = ?")
        .get(email);
      if (existing) {
        return NextResponse.json(
          { error: "Este e-mail já está cadastrado na biblioteca. Faça login!" },
          { status: 409 }
        );
      }

      const { hash, salt } = hashPassword(password);
      const nowIso = new Date().toISOString();

      const insertResult = db
        .prepare(
          `INSERT INTO users (name, email, password_hash, password_salt, role, literary_title, created_at)
           VALUES (?, ?, ?, ?, 'reader', ?, ?)`
        )
        .run(name, email, hash, salt, literaryTitle, nowIso);

      const userId = Number(insertResult.lastInsertRowid);
      const token = generateSessionToken();
      const expiresAt = Date.now() + SESSION_DURATION_MS;

      db.prepare(
        `INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`
      ).run(token, userId, expiresAt, nowIso);

      const user = {
        id: userId,
        name,
        email,
        role: "reader" as const,
        literaryTitle
      };

      const res = NextResponse.json({ user, success: true });
      res.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_DURATION_MS / 1000
      });
      return res;
    }

    // 3. LOGIN
    const userRow = db
      .prepare(
        `SELECT id, name, email, password_hash, password_salt, role, literary_title
         FROM users WHERE email = ?`
      )
      .get(email) as
      | {
          id: number;
          name: string;
          email: string;
          password_hash: string;
          password_salt: string;
          role: "reader" | "admin";
          literary_title: string;
        }
      | undefined;

    if (
      !userRow ||
      !verifyPassword(password, userRow.password_hash, userRow.password_salt)
    ) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    const token = generateSessionToken();
    const expiresAt = Date.now() + SESSION_DURATION_MS;
    const nowIso = new Date().toISOString();

    db.prepare(
      `INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`
    ).run(token, userRow.id, expiresAt, nowIso);

    const user = {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      role: userRow.role,
      literaryTitle: userRow.literary_title
    };

    const res = NextResponse.json({ user, success: true });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_MS / 1000
    });
    return res;
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao processar autenticação." },
      { status: 500 }
    );
  }
}
