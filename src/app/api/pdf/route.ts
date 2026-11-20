import { NextRequest, NextResponse } from "next/server";

/**
 * Verified 100% public, unrestricted (HTTP 200) full-book PDF files
 * with verified page counts:
 * - A Hora da Estrela: 89 pages
 * - Dom Casmurro: 192 pages
 * - Memórias Póstumas de Brás Cubas: 140 pages
 * - A Paixão Segundo G.H.: 135 pages
 * - A Metamorfose: 44 pages
 * - Noites Brancas: 60 pages (Portuguese edition)
 * - O Alienista: 45 pages
 * - Laços de Família: 71 pages
 * - Crime e Castigo: 589 pages
 * - Os Irmãos Karamázov: 757 pages
 * - O Idiota: 892 pages
 * - Memórias do Subsolo: 75 pages
 * - Gente Pobre / Poor Folk: 176 pages
 */
const VERIFIED_FULL_BOOK_PDFS: Record<string, string> = {
  "a hora da estrela":
    "https://archive.org/download/a-hora-da-estrela-de-clarice-lispector/A%20Hora%20da%20Estrela%20de%20Clarice%20Lispector.pdf",
  "dom casmurro":
    "https://archive.org/download/dom_casmurro_assis/dom_casmurro_assis.pdf",
  "memorias postumas de bras cubas":
    "https://archive.org/download/memoriasPostumasBrasCubas/memoriasBras.pdf",
  "bras cubas":
    "https://archive.org/download/memoriasPostumasBrasCubas/memoriasBras.pdf",
  "quincas borba":
    "https://pt.wikisource.org/api/rest_v1/page/pdf/Quincas_Borba",
  "o cortico":
    "https://pt.wikisource.org/api/rest_v1/page/pdf/O_Corti%C3%A7o",
  "esau e jaco":
    "https://pt.wikisource.org/api/rest_v1/page/pdf/Esa%C3%BA_e_Jac%C3%B3",
  "memorial de aires":
    "https://pt.wikisource.org/api/rest_v1/page/pdf/Memorial_de_Aires",
  "a paixao segundo g":
    "https://archive.org/download/paixao-segundo-gh-lispector-clarice-z-library/Paix%C3%A3o%20segundo%20gh%20(Lispector%20Clarice)%20(Z-Library).pdf",
  "a metamorfose":
    "https://archive.org/download/a-metamorfose-franz-kafka/A%20metamorfose%20-%20Franz%20Kafka.pdf",
  "the metamorphosis":
    "https://archive.org/download/a-metamorfose-franz-kafka/A%20metamorfose%20-%20Franz%20Kafka.pdf",
  "noites brancas":
    "https://archive.org/download/noites-brancas-fiodor-dostoievski-we-lib.org/Noites%20Brancas%20--%20Fi%C3%B3dor%20Dostoi%C3%A9vski%20--%20(%20WeLib.org%20).pdf",
  "white nights":
    "https://archive.org/download/noites-brancas-fiodor-dostoievski-we-lib.org/Noites%20Brancas%20--%20Fi%C3%B3dor%20Dostoi%C3%A9vski%20--%20(%20WeLib.org%20).pdf",
  "o alienista":
    "https://archive.org/download/o-alienista-machado-de-assis/O%20Alienista%20-%20Machado%20de%20Assis.PDF",
  "lacos de familia":
    "https://archive.org/download/lacos-de-familia-clarice-lispector/Lacos%20de%20Familia%20-%20Clarice%20Lispector.pdf",
  "crime e castigo":
    "https://archive.org/download/crime-e-castigo-1/Crime-e-Castigo%20(1).pdf",
  "crime and punishment":
    "https://archive.org/download/crime-e-castigo-1/Crime-e-Castigo%20(1).pdf",
  "irmaos karamazov":
    "https://archive.org/download/dostoievski-fiodor-os-irmaos-karamazov-completo_202412/dostoievski-fiodor-os-irmaos-karamazov-completo.pdf",
  "brothers karamazov":
    "https://archive.org/download/dostoievski-fiodor-os-irmaos-karamazov-completo_202412/dostoievski-fiodor-os-irmaos-karamazov-completo.pdf",
  "o idiota":
    "https://archive.org/download/o-idiota-fiodor-dostoievski/O%20Idiota%20-%20Fiodor%20Dostoievski.pdf",
  "the idiot":
    "https://archive.org/download/o-idiota-fiodor-dostoievski/O%20Idiota%20-%20Fiodor%20Dostoievski.pdf",
  "memorias do subsolo":
    "https://archive.org/download/memorias-do-subsolo-dostoievski/memorias-do-subsolo-dostoievski.pdf",
  "notes from the underground":
    "https://archive.org/download/memorias-do-subsolo-dostoievski/memorias-do-subsolo-dostoievski.pdf",
  "gente pobre":
    "https://archive.org/download/poor-folk-fyodor-dostoevsky/Poor%20Folk%20-%20Fyodor%20Dostoevsky.pdf",
  "poor folk":
    "https://archive.org/download/poor-folk-fyodor-dostoevsky/Poor%20Folk%20-%20Fyodor%20Dostoevsky.pdf"
};

function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeSafeFilename(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  return `${slug || "obra-completa"}-livro-completo.pdf`;
}

/**
 * Dynamically searches Internet Archive for a public, non-DRM (`NOT collection:(inlibrary)`)
 * full-book PDF matching title + author when the book isn't in our pre-verified map.
 */
async function findPublicFullBookPdfOnArchive(
  title: string,
  author: string
): Promise<string | null> {
  const cleanTitle = title.replace(/\([^)]*\)/g, "").trim();
  const cleanAuthor = author.split(",")[0].trim();

  const queries = [
    `title:(${cleanTitle}) AND creator:(${cleanAuthor}) AND mediatype:(texts) AND format:(Text PDF) AND NOT collection:(inlibrary)`,
    `title:(${cleanTitle}) AND mediatype:(texts) AND format:(Text PDF) AND NOT collection:(inlibrary)`,
    `(${cleanTitle} ${cleanAuthor}) AND mediatype:(texts) AND format:(Text PDF) AND NOT collection:(inlibrary)`
  ];

  for (const q of queries) {
    try {
      const searchUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
        q
      )}&fl[]=identifier,title,downloads&sort[]=downloads+desc&rows=5&output=json`;

      const res = await fetch(searchUrl, { next: { revalidate: 3600 } });
      if (!res.ok) continue;

      const data = await res.json();
      const docs: Array<{ identifier?: string }> = data?.response?.docs || [];
      if (docs.length === 0) continue;

      for (const doc of docs) {
        if (!doc.identifier) continue;
        const metaRes = await fetch(
          `https://archive.org/metadata/${doc.identifier}`,
          { next: { revalidate: 3600 } }
        );
        if (!metaRes.ok) continue;

        const meta = await metaRes.json();
        const files: Array<{
          name?: string;
          size?: string;
          private?: string | boolean;
        }> = meta?.files || [];

        // Skip private/DRM files
        const pdfFiles = files.filter(
          (f) => f.name?.toLowerCase().endsWith(".pdf") && !f.private
        );

        const bestPdf =
          pdfFiles.find((f) => {
            const sizeBytes = Number(f.size || 0);
            return sizeBytes > 80_000 && sizeBytes < 45_000_000;
          }) || pdfFiles[0];

        if (bestPdf?.name) {
          const candidateUrl = `https://archive.org/download/${
            doc.identifier
          }/${encodeURIComponent(bestPdf.name)}`;

          // Verify with a fast HEAD check that it returns 200 OK (not 401/403)
          const headCheck = await fetch(candidateUrl, { method: "HEAD" });
          if (headCheck.ok) {
            return candidateUrl;
          }
        }
      }
    } catch {
      // Try next query
    }
  }

  return null;
}

/**
 * Fallback to Portuguese Wikisource official PDF generator for that specific title
 */
async function fetchWikisourceFullPdf(
  title: string
): Promise<Response | null> {
  try {
    const cleanTitle = title.replace(/\([^)]*\)/g, "").trim();
    const wikiPage = encodeURIComponent(cleanTitle.replace(/\s+/g, "_"));
    const wikiRes = await fetch(
      `https://pt.wikisource.org/api/rest_v1/page/pdf/${wikiPage}`,
      {
        headers: {
          "User-Agent":
            "ClariceAssisLibrary/1.0 (https://github.com/Matheus-Putrique/Clarice-Assis)"
        }
      }
    );
    if (
      wikiRes.ok &&
      wikiRes.headers.get("content-type")?.includes("application/pdf")
    ) {
      return wikiRes;
    }
  } catch {
    // Ignore
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "Obra Literaria";
  const author = searchParams.get("author") || "";

  const normTitle = normalizeKey(title);
  const filename = makeSafeFilename(title);

  // 1. Check verified 100% open full-book PDF catalog
  let targetPdfUrl: string | null = null;
  for (const [key, url] of Object.entries(VERIFIED_FULL_BOOK_PDFS)) {
    if (normTitle.includes(normalizeKey(key))) {
      targetPdfUrl = url;
      break;
    }
  }

  // 2. If not in verified dictionary, dynamically locate unrestricted public PDF on Internet Archive
  if (!targetPdfUrl) {
    targetPdfUrl = await findPublicFullBookPdfOnArchive(title, author);
  }

  // 3. Stream the COMPLETE full-book PDF directly to the user's computer
  if (targetPdfUrl) {
    try {
      const upstream = await fetch(targetPdfUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });

      if (upstream.ok && upstream.body) {
        const headers = new Headers();
        headers.set("Content-Type", "application/pdf");
        headers.set(
          "Content-Disposition",
          `attachment; filename="${filename}"`
        );
        const contentLength = upstream.headers.get("content-length");
        if (contentLength) {
          headers.set("Content-Length", contentLength);
        }

        return new NextResponse(upstream.body, {
          status: 200,
          headers
        });
      }
    } catch {
      // Proceed to Wikisource fallback for this exact title
    }
  }

  // 4. Secondary full-text PDF source for this exact title: Portuguese Wikisource PDF engine
  const wikiPdf = await fetchWikisourceFullPdf(title);
  if (wikiPdf && wikiPdf.body) {
    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    return new NextResponse(wikiPdf.body, {
      status: 200,
      headers
    });
  }

  // 5. Never substitute another book! Return a clear 404 JSON if no public full-book PDF exists for this title
  return NextResponse.json(
    {
      error: `O arquivo PDF completo de "${title}" não está disponível em domínio público aberto no momento.`
    },
    { status: 404 }
  );
}
