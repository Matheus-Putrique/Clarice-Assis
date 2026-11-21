import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";

// Database lives OUTSIDE src/ so the Next.js/Turbopack/Tailwind file watchers never touch
// the locked .sqlite / -shm / -wal files (which crashed the dev server on Windows).
const DATA_DIR = path.join(process.cwd(), "storage");
const DB_FILE_PATH = path.join(DATA_DIR, "clarice-assis.sqlite");

// Singleton SQLite connection
let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new DatabaseSync(DB_FILE_PATH);

  // Enable WAL mode for high concurrency and performance
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  // 1. Users Table (supports Reader and Admin roles for Phase 4 & 5)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'reader',
      literary_title TEXT NOT NULL DEFAULT 'Membro do Gabinete de Leitura',
      created_at TEXT NOT NULL
    );
  `);

  // 2. Sessions Table (HTTP-only signed session tokens)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 3. Reviews Table (Real persistent site reviews linked to users)
  db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      book_key TEXT NOT NULL,
      book_title TEXT NOT NULL,
      user_id INTEGER,
      reader_name TEXT NOT NULL,
      reader_role TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      vibe_tag TEXT NOT NULL,
      title TEXT NOT NULL,
      comment TEXT NOT NULL,
      likes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // 4. Saved Books (Personal Bookshelf persisted in SQLite per user)
  db.exec(`
    CREATE TABLE IF NOT EXISTS saved_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      book_id TEXT NOT NULL,
      book_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, book_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 5. PDF Issue Reports Table (Phase 5 User/Admin PDF error notifications)
  db.exec(`
    CREATE TABLE IF NOT EXISTS pdf_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_title TEXT NOT NULL,
      book_author TEXT NOT NULL,
      error_details TEXT NOT NULL,
      reported_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      resolved_pdf_url TEXT,
      resolved_at TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Safe migration for existing databases created in Phase 4
  try {
    db.exec("ALTER TABLE pdf_issues ADD COLUMN resolved_pdf_url TEXT;");
  } catch {
    // Column already exists
  }
  try {
    db.exec("ALTER TABLE pdf_issues ADD COLUMN resolved_at TEXT;");
  } catch {
    // Column already exists
  }

  // 6. Custom / Admin-Repaired PDFs Table (Phase 5 Admin PDF overrides & uploads)
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_pdfs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_key TEXT NOT NULL UNIQUE,
      book_title TEXT NOT NULL,
      book_author TEXT NOT NULL,
      pdf_url TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Sync private Admin account strictly from environment variables (.env.local)
  // Never hardcode admin email or password in source code.
  const envAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const envAdminPassword = process.env.ADMIN_PASSWORD?.trim();
  const envAdminName =
    process.env.ADMIN_NAME?.trim() || "Bibliotecário Chefe";

  if (envAdminEmail && envAdminPassword) {
    // Remove any legacy demo admin account that doesn't match the private env email
    db.prepare(
      "DELETE FROM users WHERE role = 'admin' AND LOWER(email) != ?"
    ).run(envAdminEmail);

    const existingAdmin = db
      .prepare("SELECT id FROM users WHERE LOWER(email) = ?")
      .get(envAdminEmail) as { id: number } | undefined;

    const { hash, salt } = hashPassword(envAdminPassword);

    if (!existingAdmin) {
      db.prepare(
        `INSERT INTO users (name, email, password_hash, password_salt, role, literary_title, created_at)
         VALUES (?, ?, ?, ?, 'admin', ?, ?)`
      ).run(
        envAdminName,
        envAdminEmail,
        hash,
        salt,
        "Curador & Administrador do Acervo",
        new Date().toISOString()
      );
    } else {
      db.prepare(
        `UPDATE users
         SET name = ?, password_hash = ?, password_salt = ?, role = 'admin'
         WHERE id = ?`
      ).run(envAdminName, hash, salt, existingAdmin.id);
    }
  }

  dbInstance = db;
  return db;
}

/**
 * Cryptographic password hashing with PBKDF2-SHA512 and per-user random salt
 */
export function hashPassword(
  password: string,
  providedSalt?: string
): { hash: string; salt: string } {
  const salt = providedSalt || crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return { hash, salt };
}

export function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string
): boolean {
  const { hash } = hashPassword(password, storedSalt);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(storedHash, "hex")
    );
  } catch {
    return false;
  }
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Simple in-memory rate limiter per IP + action to prevent brute-force & spam
 */
const rateLimitBuckets = new Map<
  string,
  { count: number; resetAt: number }
>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const existing = rateLimitBuckets.get(key);

  if (!existing || now > existing.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((existing.resetAt - now) / 1000)
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export function normalizeDbBookKey(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks if an Admin has configured or uploaded a custom PDF override for a book
 */
export function getCustomPdfUrl(title: string): string | null {
  try {
    const db = getDb();
    const bookKey = normalizeDbBookKey(title);
    if (!bookKey) return null;

    const exact = db
      .prepare("SELECT pdf_url FROM custom_pdfs WHERE book_key = ?")
      .get(bookKey) as { pdf_url: string } | undefined;
    if (exact?.pdf_url) return exact.pdf_url;

    const rows = db
      .prepare("SELECT book_key, pdf_url FROM custom_pdfs")
      .all() as Array<{ book_key: string; pdf_url: string }>;

    for (const row of rows) {
      if (
        row.book_key &&
        (bookKey.includes(row.book_key) || row.book_key.includes(bookKey))
      ) {
        return row.pdf_url;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Logs a PDF error/issue to notify the Administrator automatically (avoiding duplicate pending tickets)
 */
export function reportPdfIssue(
  bookTitle: string,
  bookAuthor: string,
  errorDetails: string,
  reportedBy: string
): number | null {
  try {
    const db = getDb();
    const cleanTitle = bookTitle.trim() || "Obra Sem Título";
    const cleanAuthor = bookAuthor.trim() || "Autor Desconhecido";
    const nowFormatted = new Date().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const existing = db
      .prepare(
        "SELECT id FROM pdf_issues WHERE LOWER(book_title) = LOWER(?) AND status = 'pending'"
      )
      .get(cleanTitle) as { id: number } | undefined;

    if (existing?.id) {
      db.prepare(
        "UPDATE pdf_issues SET error_details = ?, reported_by = ?, created_at = ? WHERE id = ?"
      ).run(errorDetails, reportedBy, nowFormatted, existing.id);
      return existing.id;
    }

    const result = db
      .prepare(
        `INSERT INTO pdf_issues (book_title, book_author, error_details, reported_by, status, created_at)
         VALUES (?, ?, ?, ?, 'pending', ?)`
      )
      .run(cleanTitle, cleanAuthor, errorDetails, reportedBy, nowFormatted);

    return Number(result.lastInsertRowid);
  } catch {
    return null;
  }
}
