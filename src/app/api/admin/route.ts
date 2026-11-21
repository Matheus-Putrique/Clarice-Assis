import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import {
  getDb,
  normalizeDbBookKey,
  reportPdfIssue,
  checkRateLimit
} from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

function sanitizeText(str: string, maxLen: number): string {
  return str
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .trim()
    .slice(0, maxLen);
}

export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso restrito ao Bibliotecário Administrador." },
        { status: 403 }
      );
    }

    const db = getDb();

    const issues = db
      .prepare(
        `SELECT id, book_title, book_author, error_details, reported_by, status, resolved_pdf_url, resolved_at, created_at
         FROM pdf_issues
         ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, id DESC`
      )
      .all();

    const customPdfs = db
      .prepare(
        `SELECT id, book_key, book_title, book_author, pdf_url, updated_by, updated_at
         FROM custom_pdfs
         ORDER BY id DESC`
      )
      .all();

    const reviews = db
      .prepare(
        `SELECT id, book_key, book_title, reader_name, reader_role, rating, vibe_tag, title, comment, likes, created_at
         FROM reviews
         ORDER BY rowid DESC`
      )
      .all();

    const users = db
      .prepare(
        `SELECT id, name, email, role, literary_title, created_at
         FROM users
         ORDER BY id ASC`
      )
      .all();

    const pendingCountRow = db
      .prepare(
        "SELECT COUNT(*) as c FROM pdf_issues WHERE status = 'pending'"
      )
      .get() as { c: number };

    const resolvedCountRow = db
      .prepare(
        "SELECT COUNT(*) as c FROM pdf_issues WHERE status = 'resolved'"
      )
      .get() as { c: number };

    const savedBooksCountRow = db
      .prepare("SELECT COUNT(*) as c FROM saved_books")
      .get() as { c: number };

    return NextResponse.json({
      issues,
      customPdfs,
      reviews,
      users,
      stats: {
        totalUsers: users.length,
        pendingIssues: pendingCountRow?.c || 0,
        resolvedIssues: resolvedCountRow?.c || 0,
        totalCustomPdfs: customPdfs.length,
        totalSiteReviews: reviews.length,
        totalSavedBooks: savedBooksCountRow?.c || 0
      }
    });
  } catch {
    return NextResponse.json(
      { error: "Erro ao carregar dados do Painel do Administrador." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "local";

    const rate = checkRateLimit(`admin_api:${ip}`, 30, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Muitas requisições. Aguarde ${rate.retryAfterSec}s.`
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const action = String(body.action || "");
    const sessionUser = getSessionUser(request);

    // 1. Public/Reader Action: Report a PDF Issue to notify the Admin
    if (action === "report_pdf_issue") {
      const bookTitle = sanitizeText(String(body.bookTitle || ""), 140);
      const bookAuthor = sanitizeText(String(body.bookAuthor || ""), 100);
      const errorDetails =
        sanitizeText(String(body.errorDetails || ""), 400) ||
        "O leitor reportou que o arquivo PDF desta obra apresenta falha ou indisponibilidade.";

      if (!bookTitle) {
        return NextResponse.json(
          { error: "Informe o título do livro para reportar o problema." },
          { status: 400 }
        );
      }

      const reporter = sessionUser
        ? `${sessionUser.name} (${sessionUser.email})`
        : sanitizeText(String(body.reporterName || "Leitor da Biblioteca"), 80);

      const issueId = reportPdfIssue(
        bookTitle,
        bookAuthor || "Autor não informado",
        errorDetails,
        reporter
      );

      return NextResponse.json({
        success: true,
        issueId,
        message:
          "Chamado registrado! O Administrador foi notificado para corrigir o PDF desta obra."
      });
    }

    // All other actions require Admin privileges
    if (!sessionUser || sessionUser.role !== "admin") {
      return NextResponse.json(
        {
          error:
            "Permissão negada. Apenas o Bibliotecário Administrador pode executar esta ação."
        },
        { status: 403 }
      );
    }

    const db = getDb();
    const nowFormatted = new Date().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    // 2. Admin Action: Fix / Upload / Bind a working PDF URL or file for a book
    if (action === "fix_pdf_issue") {
      const issueId = body.issueId ? Number(body.issueId) : null;
      const bookTitle = sanitizeText(String(body.bookTitle || ""), 140);
      const bookAuthor =
        sanitizeText(String(body.bookAuthor || ""), 100) || "Autor do Acervo";
      let finalPdfUrl = String(body.pdfUrl || "").trim();
      const pdfBase64 = String(body.pdfBase64 || "").trim();

      if (!bookTitle) {
        return NextResponse.json(
          { error: "O título do livro é obrigatório." },
          { status: 400 }
        );
      }

      const bookKey = normalizeDbBookKey(bookTitle);

      // If Admin uploaded a local .PDF file as base64
      if (pdfBase64) {
        const base64Clean = pdfBase64.replace(
          /^data:application\/pdf;base64,/,
          ""
        );
        const buffer = Buffer.from(base64Clean, "base64");

        // Validate PDF magic bytes (%PDF)
        const magic = buffer.subarray(0, 4).toString("utf8");
        if (magic !== "%PDF") {
          return NextResponse.json(
            {
              error:
                "O arquivo enviado não é um documento PDF válido (cabeçalho %PDF ausente)."
            },
            { status: 400 }
          );
        }

        const pdfDir = path.join(process.cwd(), "storage", "pdfs");
        if (!fs.existsSync(pdfDir)) {
          fs.mkdirSync(pdfDir, { recursive: true });
        }

        const safeSlug =
          bookKey.replace(/[^a-z0-9]+/g, "-") || `livro-${Date.now()}`;
        const storedFileName = `${safeSlug}-${Date.now()}.pdf`;
        fs.writeFileSync(path.join(pdfDir, storedFileName), buffer);

        finalPdfUrl = `local://${storedFileName}`;
      } else if (
        !finalPdfUrl ||
        (!finalPdfUrl.startsWith("http://") &&
          !finalPdfUrl.startsWith("https://") &&
          !finalPdfUrl.startsWith("local://"))
      ) {
        return NextResponse.json(
          {
            error:
              "Informe uma URL válida (https://...) para o PDF ou envie um arquivo .PDF do seu computador."
          },
          { status: 400 }
        );
      }

      // Upsert into custom_pdfs
      db.prepare(
        `INSERT INTO custom_pdfs (book_key, book_title, book_author, pdf_url, updated_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(book_key) DO UPDATE SET
           book_title = excluded.book_title,
           book_author = excluded.book_author,
           pdf_url = excluded.pdf_url,
           updated_by = excluded.updated_by,
           updated_at = excluded.updated_at`
      ).run(
        bookKey,
        bookTitle,
        bookAuthor,
        finalPdfUrl,
        sessionUser.name,
        nowFormatted
      );

      // Mark matching issue(s) as resolved
      if (issueId) {
        db.prepare(
          `UPDATE pdf_issues
           SET status = 'resolved', resolved_pdf_url = ?, resolved_at = ?
           WHERE id = ?`
        ).run(finalPdfUrl, nowFormatted, issueId);
      }

      db.prepare(
        `UPDATE pdf_issues
         SET status = 'resolved', resolved_pdf_url = ?, resolved_at = ?
         WHERE LOWER(book_title) = LOWER(?) AND status = 'pending'`
      ).run(finalPdfUrl, nowFormatted, bookTitle);

      return NextResponse.json({
        success: true,
        pdfUrl: finalPdfUrl,
        message: `PDF de "${bookTitle}" atualizado e chamado marcado como resolvido!`
      });
    }

    // 3. Admin Action: Change issue status or delete issue
    if (action === "update_issue_status") {
      const issueId = Number(body.issueId);
      const newStatus = body.status === "resolved" ? "resolved" : "pending";
      db.prepare(
        "UPDATE pdf_issues SET status = ?, resolved_at = ? WHERE id = ?"
      ).run(newStatus, newStatus === "resolved" ? nowFormatted : null, issueId);
      return NextResponse.json({ success: true });
    }

    if (action === "delete_issue") {
      const issueId = Number(body.issueId);
      db.prepare("DELETE FROM pdf_issues WHERE id = ?").run(issueId);
      return NextResponse.json({ success: true });
    }

    // 4. Admin Action: Delete a custom PDF override
    if (action === "delete_custom_pdf") {
      const id = Number(body.id);
      db.prepare("DELETE FROM custom_pdfs WHERE id = ?").run(id);
      return NextResponse.json({ success: true });
    }

    // 5. Admin Action: Moderate / Delete a site review
    if (action === "delete_review") {
      const reviewId = String(body.reviewId || "");
      db.prepare("DELETE FROM reviews WHERE id = ?").run(reviewId);
      return NextResponse.json({
        success: true,
        message: "Avaliação removida pelo Administrador."
      });
    }

    // 6. Admin Action: Toggle user role between reader and admin
    if (action === "toggle_user_role") {
      const targetUserId = Number(body.userId);
      const targetUser = db
        .prepare("SELECT id, email, role FROM users WHERE id = ?")
        .get(targetUserId) as
        | { id: number; email: string; role: string }
        | undefined;

      if (!targetUser) {
        return NextResponse.json(
          { error: "Usuário não encontrado." },
          { status: 404 }
        );
      }

      const envAdminEmail = (process.env.ADMIN_EMAIL || "")
        .trim()
        .toLowerCase();
      if (
        targetUser.id === sessionUser.id ||
        (envAdminEmail && targetUser.email.toLowerCase() === envAdminEmail)
      ) {
        return NextResponse.json(
          {
            error:
              "A conta principal do Bibliotecário Chefe ou a sessão ativa não pode ser rebaixada."
          },
          { status: 400 }
        );
      }

      const nextRole = targetUser.role === "admin" ? "reader" : "admin";
      db.prepare("UPDATE users SET role = ? WHERE id = ?").run(
        nextRole,
        targetUserId
      );

      return NextResponse.json({
        success: true,
        newRole: nextRole
      });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao processar ação administrativa." },
      { status: 500 }
    );
  }
}
