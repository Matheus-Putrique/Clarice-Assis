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

  // 5. PDF Issue Reports Table (Prepared for Phase 5 User/Admin PDF error notifications)
  db.exec(`
    CREATE TABLE IF NOT EXISTS pdf_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_title TEXT NOT NULL,
      book_author TEXT NOT NULL,
      error_details TEXT NOT NULL,
      reported_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );
  `);

  // Seed default Admin account if no admin exists yet
  const existingAdmin = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get("admin@clariceassis.com.br");

  if (!existingAdmin) {
    const { hash, salt } = hashPassword("clarice123");
    db.prepare(
      `INSERT INTO users (name, email, password_hash, password_salt, role, literary_title, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "Bibliotecário Chefe (Admin)",
      "admin@clariceassis.com.br",
      hash,
      salt,
      "admin",
      "Curador & Administrador do Acervo",
      new Date().toISOString()
    );
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
