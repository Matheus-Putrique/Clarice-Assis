export interface BookEdition {
  id: string;
  title: string;
  subtitle?: string;
  authors: string[];
  publisher: string;
  publishedDate: string;
  thumbnail: string;
  language: string;
  pageCount: number;
  isbn?: string;
  previewLink?: string;
}

export type ReadingVibeTag =
  | "Leitura Obrigatória"
  | "Arrebatador & Profundo"
  | "Clássico Atemporal"
  | "Leitura Fluida"
  | "Reflexivo & Filosófico"
  | "Final Inesquecível";

export interface BookReview {
  id: string;
  bookKey: string;
  bookTitle: string;
  readerName: string;
  readerRole?: string;
  rating: number; // 1 to 5
  vibeTag: ReadingVibeTag;
  title: string;
  comment: string;
  createdAt: string;
  likes: number;
  verifiedReader?: boolean;
  sourceStore?: string;
  sourceUrl?: string;
}

export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  authors: string[];
  description: string;
  publishedDate: string;
  publisher: string;
  pageCount: number;
  categories: string[];
  averageRating: number;
  ratingsCount: number;
  thumbnail: string;
  language: string;
  isbn?: string;
  isPublicDomain?: boolean;
  pdfUrl?: string;
  previewLink?: string;
  featuredQuote?: string;
  curatedBadge?: string;
  editions?: BookEdition[];
}

export interface BookCategory {
  id: string;
  label: string;
  query: string;
  subQueries: string[];
  description: string;
}
