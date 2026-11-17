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
  officialPublicPdfUrl?: string;
  statusLabel: string;
  legalNote: string;
}

/**
 * Strips parenthetical edition notes (e.g., "(Edição de Luxo Capa Dura)") and numeric IDs
 * so bookstore search queries contain ONLY the clean book title + author name.
 */
function cleanTitleForStoreSearch(rawTitle: string): string {
  return rawTitle
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*]/g, "")
    .replace(/\b\d{10,13}\b/g, "")
    .replace(/\s+/g, " ")
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
  const author = (activeEdition?.authors || book.authors)[0] || "";

  const searchPhrase = `${cleanTitle} ${author}`.trim();
  const encodedQuery = encodeURIComponent(searchPhrase);

  const offers: StoreOffer[] = [
    {
      id: "amazon-br",
      storeName: "Amazon Brasil",
      badge: "Físico & Kindle",
      description:
        "Edições em capa comum, capa dura e versão digital Kindle com entrega rápida.",
      url: `https://www.amazon.com.br/s?k=${encodedQuery}&i=stripbooks`,
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
      url: `https://lista.mercadolivre.com.br/livros-revistas-comics/${encodedQuery}`,
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
        `https://www.google.com.br/search?tbm=bks&q=${encodedQuery}`,
      accentColor: "#5C4028"
    }
  ];

  return offers;
}

/**
 * Known direct `.pdf` file URLs from Domínio Público (MEC)
 */
const DIRECT_MEC_PDFS: Record<string, string> = {
  "dom casmurro": "http://www.dominiopublico.gov.br/download/texto/bv000180.pdf",
  "memorias postumas de bras cubas":
    "http://www.dominiopublico.gov.br/download/texto/bv000215.pdf",
  "o alienista": "http://www.dominiopublico.gov.br/download/texto/bv000231.pdf",
  "quincas borba":
    "http://www.dominiopublico.gov.br/download/texto/bv000226.pdf",
  "esau e jaco": "http://www.dominiopublico.gov.br/download/texto/bv000184.pdf",
  "o cortico": "http://www.dominiopublico.gov.br/download/texto/bv000015.pdf",
  "triste fim de policarpo quaresma":
    "http://www.dominiopublico.gov.br/download/texto/bv000157.pdf",
  "iracema": "http://www.dominiopublico.gov.br/download/texto/bv000136.pdf",
  "o guarani": "http://www.dominiopublico.gov.br/download/texto/bv000139.pdf",
  "senhora": "http://www.dominiopublico.gov.br/download/texto/bv000143.pdf",
  "os sertoes": "http://www.dominiopublico.gov.br/download/texto/bv000090.pdf"
};

function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getPdfResource(
  book: Book,
  activeEdition?: BookEdition | null
): PdfResource {
  const title = cleanTitleForStoreSearch(activeEdition?.title || book.title);
  const author = (activeEdition?.authors || book.authors)[0] || "";
  const year = activeEdition?.publishedDate || book.publishedDate;
  const publisher = activeEdition?.publisher || book.publisher;

  const normTitle = normalizeKey(title);

  let officialMecPdf: string | undefined;
  for (const [key, url] of Object.entries(DIRECT_MEC_PDFS)) {
    if (normTitle.includes(normalizeKey(key))) {
      officialMecPdf = url;
      break;
    }
  }

  const params = new URLSearchParams({
    title,
    author,
    year,
    publisher,
    description: book.description,
    quote: book.featuredQuote || ""
  });

  const directDownloadUrl = `/api/pdf?${params.toString()}`;
  const isPublic = Boolean(book.isPublicDomain || officialMecPdf);

  return {
    available: isPublic,
    directDownloadUrl,
    officialPublicPdfUrl: officialMecPdf,
    statusLabel: isPublic
      ? "Download Direto de PDF Disponível • Domínio Público"
      : "Caderno de Leitura & Ficha em PDF • Download Direto",
    legalNote: isPublic
      ? "Clique no botão abaixo para baixar o arquivo .PDF diretamente para o seu computador, sem sair da Biblioteca Clarice Assis."
      : "Baixe instantaneamente o Caderno de Leitura e Ficha Catalográfica em formato .PDF direto no seu dispositivo."
  };
}
