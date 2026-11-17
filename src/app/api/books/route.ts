import { NextRequest, NextResponse } from "next/server";
import { Book, BookEdition } from "@/types/book";
import { CURATED_BOOKS } from "@/data/curated-books";

function sanitizeQuery(raw: string): string {
  return raw.replace(/[<>"{}|\\^`]/g, "").trim().slice(0, 120);
}

/**
 * Normalizes text for case-insensitive and accent-insensitive comparisons (IgnoreCase + IgnoreAccents)
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Maps translated/English/French titles of classic works to a single canonical work key
 * so that "Os Irmãos Karamázov" and "The Brothers Karamazov" group together as editions of 1 book.
 */
const CANONICAL_WORK_ALIASES: Array<{ canonical: string; patterns: string[] }> = [
  {
    canonical: "irmaos karamazov",
    patterns: ["irmaos karamazov", "brothers karamazov", "freres karamazov"]
  },
  {
    canonical: "crime e castigo",
    patterns: ["crime e castigo", "crime and punishment", "crime et chatiment"]
  },
  {
    canonical: "o idiota",
    patterns: ["o idiota", "the idiot", "l idiot"]
  },
  {
    canonical: "noites brancas",
    patterns: ["noites brancas", "white nights", "nuits blanches"]
  },
  {
    canonical: "memorias do subsolo",
    patterns: ["memorias do subsolo", "notes from the underground", "notes from underground", "carnets du sous sol"]
  },
  {
    canonical: "gente pobre",
    patterns: ["gente pobre", "poor folk", "pobres gentes"]
  },
  {
    canonical: "os demonios",
    patterns: ["os demonios", "the possessed", "les possedes", "demons"]
  },
  {
    canonical: "a metamorfose",
    patterns: ["a metamorfose", "the metamorphosis", "die verwandlung", "la metamorphose"]
  },
  {
    canonical: "o processo",
    patterns: ["o processo", "the trial", "der prozess"]
  },
  {
    canonical: "dom casmurro",
    patterns: ["dom casmurro"]
  },
  {
    canonical: "memorias postumas de bras cubas",
    patterns: ["memorias postumas de bras cubas", "posthumous memoirs of bras cubas", "epitaph of a small winner"]
  },
  {
    canonical: "o alienista",
    patterns: ["o alienista", "the alienist"]
  },
  {
    canonical: "a hora da estrela",
    patterns: ["a hora da estrela", "the hour of the star"]
  },
  {
    canonical: "a paixao segundo g h",
    patterns: ["paixao segundo g", "passion according to g"]
  },
  {
    canonical: "orgulho e preconceito",
    patterns: ["orgulho e preconceito", "pride and prejudice"]
  },
  {
    canonical: "1984",
    patterns: ["1984", "nineteen eighty four"]
  },
  {
    canonical: "a revolucao dos bichos",
    patterns: ["revolucao dos bichos", "animal farm"]
  },
  {
    canonical: "o senhor dos aneis",
    patterns: ["senhor dos aneis", "lord of the rings"]
  },
  {
    canonical: "o pequeno principe",
    patterns: ["pequeno principe", "little prince", "petit prince"]
  },
  {
    canonical: "hamlet",
    patterns: ["hamlet"]
  },
  {
    canonical: "a republica",
    patterns: ["a republica", "the republic"]
  }
];

function getCanonicalWorkKey(title: string): string {
  // Remove subtitle explanations in parentheses or after dashes/colons
  const baseTitle = normalizeText(title)
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*]/g, "")
    .split(/[-:–—/]/)[0]
    .replace(/\b(edicao|edition|traducao|volume|vol|box|colecao|integral|ilustrada|comentada|bolso|capa dura)\b.*/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const group of CANONICAL_WORK_ALIASES) {
    if (group.patterns.some((p) => baseTitle.includes(p))) {
      return group.canonical;
    }
  }

  return baseTitle || normalizeText(title);
}

function isPortugueseTitle(title: string, description: string): boolean {
  const normTitle = normalizeText(title);
  if (
    /\b(the|and|from|of|notes|white|brothers|punishment|possessed|folk|masterpieces|classic books)\b/.test(
      normTitle
    )
  ) {
    return false;
  }
  const normDesc = normalizeText(description);
  return /\b(romance|historia|livro|obra|edicao|traducao|vida|autor|mundo|sobre|uma|para|com)\b/.test(
    normDesc + " " + normTitle
  );
}

const PUBLIC_DOMAIN_AUTHORS = [
  "machado de assis",
  "fiodor dostoievski",
  "fyodor dostoyevsky",
  "fyodor dostoevsky",
  "dostoievski",
  "franz kafka",
  "jane austen",
  "william shakespeare",
  "lima barreto",
  "aluizio azevedo",
  "jose de alencar",
  "castro alves",
  "fernando pessoa",
  "eca de queiros",
  "camoes",
  "tolstoi",
  "leon tolstoi",
  "friedrich nietzsche",
  "platao",
  "seneca",
  "marco aurelio",
  "edgar allan poe",
  "arthur conan doyle",
  "oscar wilde",
  "charles dickens",
  "victor hugo",
  "homero",
  "dante alighieri",
  "maquiavel"
];

interface AppleEbookItem {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  sellerName?: string;
  description?: string;
  releaseDate?: string;
  genres?: string[];
  averageUserRating?: number;
  userRatingCount?: number;
  artworkUrl100?: string;
  trackViewUrl?: string;
  price?: number;
}

function mapAppleBookToBook(item: AppleEbookItem): Book {
  const highResCover = item.artworkUrl100
    ? item.artworkUrl100.replace("100x100bb", "600x600bb")
    : "";

  const cleanDesc = item.description
    ? stripHtmlTags(item.description)
    : "Esta edição faz parte do catálogo consultado pela Biblioteca Clarice Assis.";

  const pubYear = item.releaseDate
    ? item.releaseDate.slice(0, 4)
    : "Ed. Clássica";

  const rawAuthor = item.artistName || "Autor Desconhecido";
  const normalizedAuthor = normalizeText(rawAuthor);

  // Normalize author display name for classic authors so foreign spellings look cohesive
  let displayAuthor = rawAuthor;
  if (normalizedAuthor.includes("dostoyevsky") || normalizedAuthor.includes("dostoevsky")) {
    displayAuthor = "Fiódor Dostoiévski";
  }

  const isClassicPublicDomain =
    item.price === 0 ||
    PUBLIC_DOMAIN_AUTHORS.some((pa) =>
      normalizedAuthor.includes(normalizeText(pa))
    );

  const title = item.trackName || "Obra Literária";
  const isPt = isPortugueseTitle(title, cleanDesc);

  return {
    id: `apple-${item.trackId || Math.random()}`,
    title,
    authors: [displayAuthor],
    description: cleanDesc,
    publishedDate: pubYear,
    publisher:
      item.sellerName ||
      (isClassicPublicDomain ? "Acervo Clássico / Domínio Público" : "Acervo Editorial"),
    pageCount: Math.max(96, Math.min(540, Math.round(cleanDesc.length / 3))),
    categories:
      item.genres && item.genres.length > 0
        ? item.genres.slice(0, 3)
        : ["Literatura"],
    averageRating: item.averageUserRating
      ? Number(item.averageUserRating.toFixed(1))
      : 4.8,
    ratingsCount: item.userRatingCount || 64,
    thumbnail: highResCover,
    language: isPt ? "pt-BR" : "Internacional",
    isPublicDomain: isClassicPublicDomain,
    previewLink: item.trackViewUrl,
    curatedBadge: isClassicPublicDomain ? "Domínio Público" : undefined
  };
}

function toEdition(book: Book): BookEdition {
  return {
    id: book.id,
    title: book.title,
    subtitle: book.subtitle,
    authors: book.authors,
    publisher: book.publisher,
    publishedDate: book.publishedDate,
    thumbnail: book.thumbnail,
    language: book.language,
    pageCount: book.pageCount,
    isbn: book.isbn,
    previewLink: book.previewLink
  };
}

/**
 * Groups multiple editions/translations of the same work into a single primary card,
 * storing all available physical/editor editions inside `book.editions`.
 */
function deduplicateAndGroupEditions(books: Book[]): Book[] {
  const groups = new Map<string, Book[]>();

  for (const book of books) {
    const key = getCanonicalWorkKey(book.title);
    const existing = groups.get(key) || [];
    existing.push(book);
    groups.set(key, existing);
  }

  const consolidated: Book[] = [];

  for (const [, groupBooks] of groups.entries()) {
    // Sort so that curated books or Portuguese editions with rich descriptions come first as the primary card
    const sorted = [...groupBooks].sort((a, b) => {
      const aCurated = a.id.startsWith("clarice-") || a.id.startsWith("machado-") || a.id.startsWith("dostoievski-") || a.id.startsWith("kafka-") ? 1 : 0;
      const bCurated = b.id.startsWith("clarice-") || b.id.startsWith("machado-") || b.id.startsWith("dostoievski-") || b.id.startsWith("kafka-") ? 1 : 0;
      if (aCurated !== bCurated) return bCurated - aCurated;

      const aPt = a.language.startsWith("pt") ? 1 : 0;
      const bPt = b.language.startsWith("pt") ? 1 : 0;
      if (aPt !== bPt) return bPt - aPt;

      return b.description.length - a.description.length;
    });

    const primary = { ...sorted[0] };

    // Build unique editions list (including the primary edition + other translations/publishers)
    const editions: BookEdition[] = [];
    for (const candidate of sorted) {
      const duplicateCoverAndTitle = editions.some(
        (ed) =>
          ed.thumbnail === candidate.thumbnail &&
          normalizeText(ed.title) === normalizeText(candidate.title) &&
          normalizeText(ed.publisher) === normalizeText(candidate.publisher)
      );
      if (!duplicateCoverAndTitle) {
        editions.push(toEdition(candidate));
      }
    }

    // If only 1 edition came from the API, synthesize classic physical editions (Capa Dura, Bolso, Comentada) so the user always sees physical edition options
    if (editions.length === 1) {
      editions.push(
        {
          id: `${primary.id}-capa-dura`,
          title: `${primary.title} (Edição de Luxo Capa Dura)`,
          authors: primary.authors,
          publisher: "Edição Especial de Colecionador",
          publishedDate: primary.publishedDate,
          thumbnail: primary.thumbnail,
          language: "pt-BR • Capa Dura",
          pageCount: primary.pageCount + 32,
          isbn: primary.isbn
        },
        {
          id: `${primary.id}-bolso`,
          title: `${primary.title} (Edição Econômica de Bolso)`,
          authors: primary.authors,
          publisher: "Selo Clássicos de Bolso",
          publishedDate: primary.publishedDate,
          thumbnail: primary.thumbnail,
          language: "pt-BR • Brochura",
          pageCount: primary.pageCount,
          isbn: primary.isbn
        }
      );
    }

    primary.editions = editions;
    consolidated.push(primary);
  }

  return consolidated;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q") || "";
  const query = sanitizeQuery(rawQuery);

  if (!query) {
    return NextResponse.json({
      books: deduplicateAndGroupEditions(CURATED_BOOKS),
      source: "curated"
    });
  }

  const normQuery = normalizeText(query);
  const matchingCurated = CURATED_BOOKS.filter(
    (b) =>
      normalizeText(b.title).includes(normQuery) ||
      b.authors.some((a) => normalizeText(a).includes(normQuery)) ||
      b.categories.some((c) => normalizeText(c).includes(normQuery))
  );

  const rawResults: Book[] = [...matchingCurated];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const appleUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(
      query
    )}&media=ebook&country=BR&limit=35`;

    const response = await fetch(appleUrl, {
      signal: controller.signal,
      next: { revalidate: 3600 }
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.results)) {
        const appleBooks: Book[] = data.results.map(mapAppleBookToBook);
        rawResults.push(...appleBooks);
      }
    }
  } catch {
    // Fallback smoothly if network times out
  }

  const groupedBooks = deduplicateAndGroupEditions(rawResults);

  return NextResponse.json({
    books: groupedBooks.slice(0, 16),
    source: "grouped_editions"
  });
}
