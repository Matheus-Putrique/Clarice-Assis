import { Book, BookEdition } from "@/types/book";

export interface StoreOffer {
  id: string;
  storeName: string;
  badge: string;
  description: string;
  url: string;
  accentColor: string;
}

export interface PdfResource {
  available: boolean;
  directDownloadUrl: string;
  estimatedPages: number;
  statusLabel: string;
  legalNote: string;
}

/**
 * Strips parenthetical edition notes (e.g., "(Edição de Luxo Capa Dura)"), brackets,
 * subtitles after dashes, and numeric IDs/ISBNs so bookstore search queries contain
 * ONLY the clean book title + primary author name.
 */
export function cleanTitleForStoreSearch(rawTitle: string): string {
  return rawTitle
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*]/g, "")
    .replace(/\b\d{10,13}\b/g, "")
    .replace(/[-–—:]\s*(edi[cç][aã]o|volume|vol\.|cole[cç][aã]o|box|texto integral).*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanAuthorForStoreSearch(rawAuthors: string[]): string {
  const first = rawAuthors[0] || "";
  return first
    .replace(/\([^)]*\)/g, "")
    .replace(/\b\d+\b/g, "")
    .trim();
}

/**
 * Generates safe, direct search/purchase links for the major Brazilian bookstores
 * using ONLY the clean title + author (never appending ISBN or internal IDs).
 */
export function getStoreOffers(
  book: Book,
  activeEdition?: BookEdition | null
): StoreOffer[] {
  const rawTitle = activeEdition?.title || book.title;
  const cleanTitle = cleanTitleForStoreSearch(rawTitle);
  const author = cleanAuthorForStoreSearch(activeEdition?.authors || book.authors);

  const searchPhrase = `${cleanTitle} ${author}`.trim();
  const encodedQuery = encodeURIComponent(searchPhrase);

  const offers: StoreOffer[] = [
    {
      id: "amazon-br",
      storeName: "Amazon Brasil",
      badge: "Físico & Kindle",
      description:
        "Edições em capa comum, capa dura e versão digital Kindle com entrega rápida.",
      url: `https://www.amazon.com.br/s?k=${encodedQuery}`,
      accentColor: "#B87333"
    },
    {
      id: "estante-virtual",
      storeName: "Estante Virtual",
      badge: "Sebos & Raridades",
      description:
        "Garimpe edições antigas, esgotadas ou econômicas em sebos de todo o Brasil.",
      url: `https://www.estantevirtual.com.br/busca?q=${encodedQuery}`,
      accentColor: "#3A5A40"
    },
    {
      id: "mercado-livre",
      storeName: "Mercado Livre Livros",
      badge: "Livrarias Oficiais",
      description:
        "Compare preços de diversas livrarias, boxes e edições de colecionador.",
      url: `https://lista.mercadolivre.com.br/${encodedQuery}#D[A:${encodedQuery}]`,
      accentColor: "#8B5E34"
    },
    {
      id: "google-apple-books",
      storeName:
        activeEdition?.previewLink || book.previewLink
          ? "Apple / Play Livros"
          : "Google Play Livros",
      badge: "E-book Oficial",
      description:
        "Acesso imediato à edição digital oficial para leitura em dispositivos.",
      url:
        activeEdition?.previewLink ||
        book.previewLink ||
        `https://play.google.com/store/search?q=${encodedQuery}&c=books`,
      accentColor: "#5C4028"
    }
  ];

  return offers;
}

export function getPdfResource(
  book: Book,
  activeEdition?: BookEdition | null
): PdfResource {
  const title = cleanTitleForStoreSearch(activeEdition?.title || book.title);
  const author = cleanAuthorForStoreSearch(activeEdition?.authors || book.authors);
  const estimatedPages = activeEdition?.pageCount || book.pageCount || 160;

  const params = new URLSearchParams({
    title,
    author
  });

  const directDownloadUrl = `/api/pdf?${params.toString()}`;

  return {
    available: true,
    directDownloadUrl,
    estimatedPages,
    statusLabel: `Livro Completo em PDF (~${estimatedPages} págs.) • Download Direto`,
    legalNote:
      "Clique no botão abaixo para baixar o arquivo .PDF da obra completa (com todas as páginas) diretamente para o seu computador, sem redirecionar para sites externos."
  };
}
