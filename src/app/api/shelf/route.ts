import { NextRequest, NextResponse } from "next/server";
import { getDb, checkRateLimit } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { Book } from "@/types/book";

export async function GET(request: NextRequest) {
  const user = getSessionUser(request);
  if (!user) {
    return NextResponse.json({ savedIds: [], savedBooks: [], authenticated: false });
  }

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT book_id, book_json FROM saved_books WHERE user_id = ? ORDER BY id DESC`
    )
    .all(user.id) as Array<{ book_id: string; book_json: string }>;

  const savedIds: string[] = [];
  const savedBooks: Book[] = [];

  for (const r of rows) {
    savedIds.push(r.book_id);
    try {
      savedBooks.push(JSON.parse(r.book_json));
    } catch {
      // ignore malformed JSON
    }
  }

  return NextResponse.json({
    savedIds,
    savedBooks,
    authenticated: true
  });
}

export async function POST(request: NextRequest) {
  const user = getSessionUser(request);
  if (!user) {
    return NextResponse.json(
      { error: "Autenticação necessária para sincronizar no banco de dados." },
      { status: 401 }
    );
  }

  const rate = checkRateLimit(`shelf:${user.id}`, 40, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Muitas alterações seguidas. Aguarde alguns segundos." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const book = body.book as Book | undefined;
    const bookId = String(body.bookId || book?.id || "").slice(0, 120);

    if (!bookId) {
      return NextResponse.json({ error: "ID do livro inválido." }, { status: 400 });
    }

    const db = getDb();
    const existing = db
      .prepare("SELECT id FROM saved_books WHERE user_id = ? AND book_id = ?")
      .get(user.id, bookId);

    if (existing) {
      db.prepare("DELETE FROM saved_books WHERE user_id = ? AND book_id = ?").run(
        user.id,
        bookId
      );
      return NextResponse.json({ saved: false, bookId });
    } else {
      const bookJson = JSON.stringify(book || { id: bookId });
      db.prepare(
        `INSERT INTO saved_books (user_id, book_id, book_json, created_at)
         VALUES (?, ?, ?, ?)`
      ).run(user.id, bookId, bookJson, new Date().toISOString());

      return NextResponse.json({ saved: true, bookId });
    }
  } catch {
    return NextResponse.json(
      { error: "Erro ao atualizar sua estante no banco de dados." },
      { status: 500 }
    );
  }
}
