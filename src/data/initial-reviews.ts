import { BookReview, ReadingVibeTag } from "@/types/book";

export const READING_VIBE_TAGS: ReadingVibeTag[] = [
  "Leitura Obrigatória",
  "Arrebatador & Profundo",
  "Clássico Atemporal",
  "Leitura Fluida",
  "Reflexivo & Filosófico",
  "Final Inesquecível"
];

export function normalizeReviewBookKey(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Zero fictitious pre-populated reviews — all reviews come live from external bookstores or real site users!
export const INITIAL_REVIEWS: BookReview[] = [];
