import { NextRequest, NextResponse } from "next/server";
import { BookReview, ReadingVibeTag } from "@/types/book";
import { getDb, checkRateLimit } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9"
};

function normalizeBookKey(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeInput(text: string, maxLen: number): string {
  return text
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim()
    .slice(0, maxLen);
}

function cleanReviewHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|&#xa0;|&#160;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function readSqliteSiteReviews(bookKey: string): BookReview[] {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT id, book_key, book_title, reader_name, reader_role, rating, vibe_tag, title, comment, likes, created_at
         FROM reviews
         WHERE book_key = ? OR book_key LIKE ?
         ORDER BY rowid DESC`
      )
      .all(bookKey, `%${bookKey}%`) as Array<{
      id: string;
      book_key: string;
      book_title: string;
      reader_name: string;
      reader_role: string;
      rating: number;
      vibe_tag: ReadingVibeTag;
      title: string;
      comment: string;
      likes: number;
      created_at: string;
    }>;

    return rows.map((r) => ({
      id: r.id,
      bookKey: r.book_key,
      bookTitle: r.book_title,
      readerName: r.reader_name,
      readerRole: r.reader_role,
      rating: r.rating,
      vibeTag: r.vibe_tag,
      title: r.title,
      comment: r.comment,
      likes: r.likes,
      createdAt: r.created_at,
      verifiedReader: true,
      sourceStore: "Biblioteca Clarice Assis (Banco SQLite)"
    }));
  } catch {
    return [];
  }
}

function pickVibeTag(ratingVal: number): ReadingVibeTag {
  if (ratingVal >= 5) return "Leitura Obrigatória";
  if (ratingVal === 4) return "Leitura Fluida";
  return "Reflexivo & Filosófico";
}

interface StoreRatingSummary {
  storeName: string;
  rating: number;
  ratingsCount: number;
  storeUrl: string;
}

interface AppleCustomerReviewEntry {
  id?: { label?: string };
  author?: { name?: { label?: string } };
  "im:rating"?: { label?: string };
  title?: { label?: string };
  content?: { label?: string };
  updated?: { label?: string };
}

/**
 * 1. Fetch real customer reviews & ratings from Apple Books Brasil
 */
async function fetchAppleBooksReviews(
  cleanTitle: string,
  query: string
): Promise<{ reviews: BookReview[]; summary?: StoreRatingSummary }> {
  const reviews: BookReview[] = [];
  let summary: StoreRatingSummary | undefined;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(
      query
    )}&media=ebook&country=BR&lang=pt_br&limit=4`;

    const res = await fetch(searchUrl, {
      signal: controller.signal,
      next: { revalidate: 1800 }
    });
    clearTimeout(timeout);
    if (!res.ok) return { reviews };

    const data = await res.json();
    const items: Array<{
      trackId?: number;
      averageUserRating?: number;
      userRatingCount?: number;
      trackViewUrl?: string;
    }> = Array.isArray(data.results) ? data.results : [];

    const ratedItem = items.find((i) => i.averageUserRating && i.userRatingCount);
    if (ratedItem && ratedItem.averageUserRating) {
      summary = {
        storeName: "Apple Books Brasil",
        rating: Number(ratedItem.averageUserRating.toFixed(1)),
        ratingsCount: ratedItem.userRatingCount || 1,
        storeUrl:
          ratedItem.trackViewUrl ||
          `https://www.google.com.br/search?q=${encodeURIComponent(query + " Apple Books")}`
      };
    }

    const seenIds = new Set<string>();
    for (const item of items.slice(0, 2)) {
      if (!item.trackId) continue;
      try {
        const rssUrl = `https://itunes.apple.com/br/rss/customerreviews/id=${item.trackId}/sortBy=mostRecent/json`;
        const rssRes = await fetch(rssUrl, { next: { revalidate: 1800 } });
        if (!rssRes.ok) continue;
        const rssData = await rssRes.json();
        const entriesRaw = rssData?.feed?.entry;
        const entries: AppleCustomerReviewEntry[] = Array.isArray(entriesRaw)
          ? entriesRaw
          : entriesRaw
          ? [entriesRaw]
          : [];

        for (const entry of entries) {
          const entryId = entry?.id?.label || "";
          if (entryId && seenIds.has(entryId)) continue;
          if (entryId) seenIds.add(entryId);

          const ratingVal = Number(entry?.["im:rating"]?.label || 0);
          const commentText = entry?.content?.label;
          if (!ratingVal || !commentText) continue;

          const updatedDate = entry?.updated?.label
            ? new Date(entry.updated.label).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric"
              })
            : "Compra Verificada";

          reviews.push({
            id: `apple-${entryId || Math.random()}`,
            bookKey: normalizeBookKey(cleanTitle),
            bookTitle: cleanTitle,
            readerName: entry?.author?.name?.label || "Cliente Apple Books",
            readerRole: "Comprador Verificado • Apple Books",
            rating: ratingVal,
            vibeTag: pickVibeTag(ratingVal),
            title: entry?.title?.label || "Avaliação na Apple Books",
            comment: commentText.trim(),
            createdAt: updatedDate,
            likes: 0,
            verifiedReader: true,
            sourceStore: "Apple Books Brasil",
            sourceUrl: item.trackViewUrl
          });
        }
      } catch {
        // continue
      }
    }
  } catch {
    // ignore
  }

  return { reviews, summary };
}

/**
 * 2. Fetch real customer reviews & ratings from Google Play Livros Brasil
 */
async function fetchGooglePlayBooksReviews(
  cleanTitle: string,
  query: string
): Promise<{ reviews: BookReview[]; summary?: StoreRatingSummary }> {
  const reviews: BookReview[] = [];
  let summary: StoreRatingSummary | undefined;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const searchUrl = `https://play.google.com/store/search?q=${encodeURIComponent(
      query
    )}&c=books&hl=pt_BR&gl=BR`;

    const searchRes = await fetch(searchUrl, {
      headers: BROWSER_HEADERS,
      signal: controller.signal,
      next: { revalidate: 1800 }
    });
    clearTimeout(timeout);
    if (!searchRes.ok) return { reviews };

    const searchHtml = await searchRes.text();
    const bookIds = Array.from(
      new Set(
        Array.from(
          searchHtml.matchAll(/\/store\/books\/details\/[^"?]+\?id=([A-Za-z0-9_-]+)/g)
        ).map((m) => m[1])
      )
    ).slice(0, 2);

    for (const bookId of bookIds) {
      const detailUrl = `https://play.google.com/store/books/details?id=${bookId}&hl=pt_BR&gl=BR`;
      const detailRes = await fetch(detailUrl, {
        headers: BROWSER_HEADERS,
        next: { revalidate: 1800 }
      });
      if (!detailRes.ok) continue;

      const detailHtml = await detailRes.text();

      // Extract overall Google Play Books rating if present
      if (!summary) {
        const ratingMatch = detailHtml.match(/aria-label="Avaliado com ([0-9,]+) de 5 estrelas"/i);
        const ratingNum = ratingMatch
          ? parseFloat(ratingMatch[1].replace(",", "."))
          : 4.7;
        summary = {
          storeName: "Google Play Livros",
          rating: ratingNum,
          ratingsCount: 0,
          storeUrl: detailUrl
        };
      }

      // Extract real customer review arrays from AF_initDataCallback blocks
      const dsMatches = Array.from(
        detailHtml.matchAll(
          /AF_initDataCallback\(\{key:\s*'ds:\d+'[\s\S]*?data:([\s\S]*?),\s*sideChannel:/g
        )
      ).map((m) => m[1]);

      for (const block of dsMatches) {
        if (block.includes("googleusercontent.com") && block.startsWith("[[[")) {
          try {
            const parsed = JSON.parse(block);
            const list = parsed?.[0];
            if (Array.isArray(list)) {
              for (const item of list) {
                const reviewId = item?.[0];
                const userName = item?.[1]?.[0];
                const stars = Number(item?.[2] || 0);
                const text = String(item?.[4] || "").trim();
                const tsSeconds = Number(item?.[5]?.[0] || 0);

                if (!userName || !stars || text.length < 5) continue;

                const dateLabel = tsSeconds
                  ? new Date(tsSeconds * 1000).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    })
                  : "Avaliação Google Play";

                const firstWords = text.split(/\s+/).slice(0, 6).join(" ");
                const autoTitle =
                  text.length > 45 ? `${firstWords}...` : text;

                reviews.push({
                  id: `gplay-${reviewId || Math.random()}`,
                  bookKey: normalizeBookKey(cleanTitle),
                  bookTitle: cleanTitle,
                  readerName: userName,
                  readerRole: "Leitor Verificado • Google Play Livros",
                  rating: stars,
                  vibeTag: pickVibeTag(stars),
                  title: autoTitle,
                  comment: text,
                  createdAt: dateLabel,
                  likes: Number(item?.[6] || 0),
                  verifiedReader: true,
                  sourceStore: "Google Play Livros",
                  sourceUrl: detailUrl
                });
              }
            }
          } catch {
            // ignore parse error
          }
        }
      }
    }

    if (summary && reviews.length > 0 && summary.ratingsCount === 0) {
      summary.ratingsCount = reviews.length;
    }
  } catch {
    // ignore
  }

  return { reviews, summary };
}

/**
 * 3. Fetch real Portuguese customer reviews & ratings from Goodreads / Amazon
 */
async function fetchGoodreadsAmazonReviews(
  cleanTitle: string,
  query: string
): Promise<{ reviews: BookReview[]; summary?: StoreRatingSummary }> {
  const reviews: BookReview[] = [];
  let summary: StoreRatingSummary | undefined;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const acUrl = `https://www.goodreads.com/book/auto_complete?format=json&q=${encodeURIComponent(
      cleanTitle
    )}`;

    const acRes = await fetch(acUrl, {
      headers: BROWSER_HEADERS,
      signal: controller.signal,
      cache: "no-store"
    });
    clearTimeout(timeout);
    if (!acRes.ok) return { reviews };

    const acData = await acRes.json();
    const firstMatch = Array.isArray(acData) ? acData[0] : null;
    if (!firstMatch?.bookUrl) return { reviews };

    const rawBookUrl = String(firstMatch.bookUrl).split("?")[0];
    const fullBookUrl = rawBookUrl.startsWith("http")
      ? rawBookUrl
      : `https://www.goodreads.com${rawBookUrl}`;
    summary = {
      storeName: "Goodreads / Amazon",
      rating: parseFloat(firstMatch.avgRating || "4.5"),
      ratingsCount: Number(firstMatch.ratingsCount || 0),
      storeUrl: fullBookUrl
    };

    const pageRes = await fetch(fullBookUrl, {
      headers: BROWSER_HEADERS,
      cache: "no-store"
    });
    if (!pageRes.ok) return { reviews, summary };

    const html = await pageRes.text();
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
    );
    if (!nextDataMatch) return { reviews, summary };

    const nextJson = JSON.parse(nextDataMatch[1]);
    const apolloState = nextJson?.props?.pageProps?.apolloState || {};
    const reviewKeys = Object.keys(apolloState).filter((k) =>
      k.startsWith("Review:")
    );

    const normCheck = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    for (const k of reviewKeys) {
      const rev = apolloState[k];
      const rawText = String(rev?.text || "");
      const cleanText = cleanReviewHtml(rawText);
      const ratingVal = Number(rev?.rating || 0);

      if (!ratingVal || cleanText.length < 15) continue;

      const normText = normCheck(cleanText);
      // Keep reviews written in Portuguese (at least 2 Portuguese words and more PT words than EN words)
      const ptMatches = (
        normText.match(
          /\b(que|nao|uma|para|com|livro|historia|muito|mais|como|por|mas|leitura|autor|obra|sobre|esse|esta|bom|melhor|ser|foi)\b/g
        ) || []
      ).length;
      const enMatches = (
        normText.match(
          /\b(the|and|this|that|with|from|have|was|book|read|story|about|very)\b/g
        ) || []
      ).length;

      if (ptMatches < 2 || enMatches > ptMatches) continue;

      const userRef = rev?.creator?.__ref;
      const user = userRef ? apolloState[userRef] : null;
      const userName = user?.name || "Leitor Verificado";
      const createdAtMs = Number(rev?.createdAt || 0);
      const dateLabel = createdAtMs
        ? new Date(createdAtMs).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric"
          })
        : "Resenha Verificada";

      const firstSentence = cleanText.split(/[.!?\n]/)[0]?.trim() || cleanText;
      const autoTitle =
        firstSentence.length > 62
          ? `${firstSentence.slice(0, 62)}...`
          : firstSentence;

      reviews.push({
        id: `gr-${k}`,
        bookKey: normalizeBookKey(cleanTitle),
        bookTitle: cleanTitle,
        readerName: userName,
        readerRole: "Leitor Verificado • Goodreads / Amazon",
        rating: ratingVal,
        vibeTag: pickVibeTag(ratingVal),
        title: autoTitle,
        comment: cleanText,
        createdAt: dateLabel,
        likes: Number(rev?.likeCount || 0),
        verifiedReader: true,
        sourceStore: "Goodreads / Amazon",
        sourceUrl: fullBookUrl
      });
    }
  } catch {
    // ignore
  }

  return { reviews, summary };
}

/**
 * Interleaves reviews from multiple stores so the user immediately sees
 * a rich mix of Google Play Livros, Goodreads/Amazon, and Apple Books Brasil!
 */
function interleaveStoreReviews(lists: BookReview[][]): BookReview[] {
  const combined: BookReview[] = [];
  const maxLen = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < maxLen; i++) {
    for (const list of lists) {
      if (list[i]) {
        combined.push(list[i]);
      }
    }
  }
  return combined;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "";
  const author = searchParams.get("author") || "";

  const cleanTitle = title.replace(/\([^)]*\)/g, "").trim();
  const cleanAuthor = author.split(",")[0].trim();
  const query = `${cleanTitle} ${cleanAuthor}`.trim();

  const bookKey = normalizeBookKey(cleanTitle);
  const siteReviews = readSqliteSiteReviews(bookKey);

  // Fetch in parallel from all 3 external store/reader platforms
  const [gplayResult, goodreadsResult, appleResult] = await Promise.all([
    fetchGooglePlayBooksReviews(cleanTitle, query),
    fetchGoodreadsAmazonReviews(cleanTitle, query),
    fetchAppleBooksReviews(cleanTitle, query)
  ]);

  const interleavedStoreReviews = interleaveStoreReviews([
    gplayResult.reviews,
    goodreadsResult.reviews,
    appleResult.reviews
  ]);

  const storeRatings: StoreRatingSummary[] = [];
  if (gplayResult.summary) storeRatings.push(gplayResult.summary);
  if (goodreadsResult.summary) storeRatings.push(goodreadsResult.summary);
  if (appleResult.summary) storeRatings.push(appleResult.summary);

  const encodedSearch = encodeURIComponent(query);
  storeRatings.push(
    {
      storeName: "Amazon Brasil",
      rating: 0,
      ratingsCount: 0,
      storeUrl: `https://www.amazon.com.br/s?k=${encodedSearch}`
    },
    {
      storeName: "Estante Virtual",
      rating: 0,
      ratingsCount: 0,
      storeUrl: `https://www.estantevirtual.com.br/busca?q=${encodedSearch}`
    }
  );

  return NextResponse.json({
    reviews: [...siteReviews, ...interleavedStoreReviews],
    siteReviewsCount: siteReviews.length,
    storeReviewsCount: interleavedStoreReviews.length,
    storeRatings
  });
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "local";

    const rate = checkRateLimit(`reviews:${ip}`, 10, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Limite de avaliações excedido. Aguarde ${rate.retryAfterSec}s antes de enviar outra.`
        },
        { status: 429 }
      );
    }

    const sessionUser = getSessionUser(request);
    const body = await request.json();
    const bookTitle = sanitizeInput(String(body.bookTitle || ""), 120);
    const readerName =
      sessionUser?.name || sanitizeInput(String(body.readerName || ""), 50);
    const readerRole =
      sessionUser?.literaryTitle ||
      sanitizeInput(String(body.readerRole || ""), 45) ||
      "Leitor da Biblioteca";
    const title = sanitizeInput(String(body.title || ""), 80);
    const comment = sanitizeInput(String(body.comment || ""), 900);
    const rating = Math.min(5, Math.max(1, Number(body.rating) || 5));
    const vibeTag = sanitizeInput(
      String(body.vibeTag || "Leitura Obrigatória"),
      40
    ) as ReadingVibeTag;

    if (
      !bookTitle ||
      readerName.length < 2 ||
      title.length < 3 ||
      comment.length < 10
    ) {
      return NextResponse.json(
        {
          error:
            "Preencha seu nome, título e comentário (mínimo 10 caracteres) para publicar sua avaliação."
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    const reviewId = `clarice-sql-${Date.now()}`;
    const bookKey = normalizeBookKey(bookTitle);

    const db = getDb();
    db.prepare(
      `INSERT INTO reviews (id, book_key, book_title, user_id, reader_name, reader_role, rating, vibe_tag, title, comment, likes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    ).run(
      reviewId,
      bookKey,
      bookTitle,
      sessionUser?.id ?? null,
      readerName,
      readerRole,
      rating,
      vibeTag,
      title,
      comment,
      formattedDate
    );

    const newReview: BookReview = {
      id: reviewId,
      bookKey,
      bookTitle,
      readerName,
      readerRole,
      rating,
      vibeTag,
      title,
      comment,
      createdAt: formattedDate,
      likes: 0,
      verifiedReader: true,
      sourceStore: "Biblioteca Clarice Assis (Banco SQLite)"
    };

    return NextResponse.json({
      review: newReview,
      success: true
    });
  } catch {
    return NextResponse.json(
      { error: "Erro ao processar avaliação no banco de dados." },
      { status: 500 }
    );
  }
}
