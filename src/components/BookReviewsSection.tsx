"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Book, BookReview, ReadingVibeTag } from "@/types/book";
import { READING_VIBE_TAGS } from "@/data/initial-reviews";
import {
  MessageSquareQuote,
  Star,
  ThumbsUp,
  Send,
  CheckCircle2,
  Sparkles,
  UserCheck,
  AlertCircle,
  PenTool,
  Store,
  ExternalLink,
  Loader2,
  Trash2
} from "lucide-react";

interface BookReviewsSectionProps {
  book: Book;
  currentUser?: {
    id: number;
    name: string;
    email: string;
    role: "reader" | "admin";
    literaryTitle: string;
  } | null;
}

interface StoreRatingSummary {
  storeName: string;
  rating: number;
  ratingsCount: number;
  storeUrl: string;
}

const LIKES_STORAGE_KEY = "clarice_assis_review_likes_v1";

/**
 * Sanitizes user input to prevent HTML/script injection (XSS protection)
 */
function sanitizeUserText(input: string, maxLength: number): string {
  return input
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim()
    .slice(0, maxLength);
}

export default function BookReviewsSection({
  book,
  currentUser
}: BookReviewsSectionProps) {
  const [reviews, setReviews] = useState<BookReview[]>([]);
  const [storeRatings, setStoreRatings] = useState<StoreRatingSummary[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [filterStar, setFilterStar] = useState<number | null>(null);
  const [filterSource, setFilterSource] = useState<
    "todas" | "gplay" | "goodreads" | "apple" | "site"
  >("todas");
  const [isWriting, setIsWriting] = useState(false);

  // Form states (auto-populated when logged in!)
  const [readerName, setReaderName] = useState(currentUser?.name || "");
  const [readerRole, setReaderRole] = useState(
    currentUser?.literaryTitle || ""
  );

  useEffect(() => {
    if (currentUser) {
      setReaderName(currentUser.name);
      setReaderRole(currentUser.literaryTitle);
    }
  }, [currentUser]);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [vibeTag, setVibeTag] = useState<ReadingVibeTag>("Leitura Obrigatória");
  const [reviewTitle, setReviewTitle] = useState("");
  const [comment, setComment] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    try {
      const savedLikes = localStorage.getItem(LIKES_STORAGE_KEY);
      if (savedLikes) {
        const parsedLikes = JSON.parse(savedLikes);
        if (Array.isArray(parsedLikes)) setLikedIds(parsedLikes);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  // Fetch REAL reviews from external bookstores + real site user reviews stored on backend
  useEffect(() => {
    let active = true;
    setIsLoadingReviews(true);
    setFilterStar(null);

    const params = new URLSearchParams({
      title: book.title,
      author: book.authors[0] || ""
    });

    fetch(`/api/reviews?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (Array.isArray(data.reviews)) {
          setReviews(data.reviews);
        } else {
          setReviews([]);
        }
        if (Array.isArray(data.storeRatings)) {
          setStoreRatings(data.storeRatings);
        }
      })
      .catch(() => {
        if (active) setReviews([]);
      })
      .finally(() => {
        if (active) setIsLoadingReviews(false);
      });

    return () => {
      active = false;
    };
  }, [book.id, book.title, book.authors]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (filterStar && r.rating !== filterStar) return false;
      const store = (r.sourceStore || "").toLowerCase();
      if (filterSource === "gplay" && !store.includes("google play"))
        return false;
      if (filterSource === "goodreads" && !store.includes("goodreads"))
        return false;
      if (filterSource === "apple" && !store.includes("apple")) return false;
      if (filterSource === "site" && !store.includes("clarice assis"))
        return false;
      return true;
    });
  }, [reviews, filterStar, filterSource]);

  // Calculate live rating statistics strictly from real fetched reviews
  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) {
      return {
        avg: book.averageRating || 0,
        total: 0,
        counts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }

    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    for (const r of reviews) {
      const star = Math.min(5, Math.max(1, Math.round(r.rating)));
      counts[star] = (counts[star] || 0) + 1;
      sum += r.rating;
    }

    return {
      avg: Number((sum / total).toFixed(1)),
      total,
      counts
    };
  }, [reviews, book.averageRating]);

  const handleToggleLike = (reviewId: string) => {
    setLikedIds((prev) => {
      const updated = prev.includes(reviewId)
        ? prev.filter((id) => id !== reviewId)
        : [...prev, reviewId];
      try {
        localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  };

  const handleAdminDeleteReview = async (reviewId: string) => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_review",
          reviewId
        })
      });
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      }
    } catch {
      // Ignore
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = sanitizeUserText(readerName, 50);
    const cleanRole = sanitizeUserText(readerRole, 45) || "Leitor da Biblioteca";
    const cleanTitle = sanitizeUserText(reviewTitle, 80);
    const cleanComment = sanitizeUserText(comment, 900);

    if (cleanName.length < 2) {
      setErrorMsg("Por favor, informe seu nome ou apelido (mín. 2 letras).");
      return;
    }
    if (cleanTitle.length < 3) {
      setErrorMsg("Dê um título curto para resumir sua opinião sobre a obra.");
      return;
    }
    if (cleanComment.length < 10) {
      setErrorMsg("Escreva um comentário com pelo menos 10 caracteres.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle: book.title,
          readerName: cleanName,
          readerRole: cleanRole,
          rating,
          vibeTag,
          title: cleanTitle,
          comment: cleanComment
        })
      });

      const data = await res.json();
      if (!res.ok || !data.review) {
        setErrorMsg(data.error || "Não foi possível salvar sua avaliação.");
        return;
      }

      setReviews((prev) => [data.review, ...prev]);
      setReaderName("");
      setReaderRole("");
      setReviewTitle("");
      setComment("");
      setRating(5);
      setIsWriting(false);
      setFilterStar(null);
      setFilterSource("todas");
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 5000);
    } catch {
      setErrorMsg("Erro de conexão ao enviar sua avaliação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-5 pt-4 border-t-2 border-[#E2D5C1]">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#2C1E16] text-[#C89D54] flex items-center justify-center shrink-0">
            <MessageSquareQuote className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-serif-title text-lg font-bold text-[#2C1E16]">
              Avaliações Reais das Lojas & Leitores do Site
            </h4>
            <p className="text-xs text-[#6E5641]">
              Resenhas verificadas importadas das livrarias que vendem{" "}
              <strong>{book.title}</strong> e comentários reais publicados aqui
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsWriting(!isWriting)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2C1E16] hover:bg-[#4A3525] text-[#FBF8F3] text-xs font-bold shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <PenTool className="w-3.5 h-3.5 text-[#C89D54]" />
          <span>{isWriting ? "Fechar Formulário" : "Avaliar pelo Site"}</span>
        </button>
      </div>

      {/* Store Origin Badges / Direct Store Review Links */}
      {storeRatings.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A6048] flex items-center gap-1 mr-1">
            <Store className="w-3.5 h-3.5 text-[#8B5E34]" />
            Fontes das Lojas:
          </span>
          {storeRatings.slice(0, 4).map((sr, i) => (
            <a
              key={`${sr.storeName}-${i}`}
              href={sr.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3EDE2] hover:bg-[#E8DEC8] border border-[#D5C4A8] text-[11px] font-semibold text-[#2C1E16] transition-colors"
            >
              <span>{sr.storeName}</span>
              {sr.rating > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[#8B5E34] font-bold">
                  • ★ {sr.rating.toFixed(1)} ({sr.ratingsCount})
                </span>
              )}
              <ExternalLink className="w-2.5 h-2.5 text-[#7A6048]" />
            </a>
          ))}
        </div>
      )}

      {/* Success Toast Banner */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-[#3A5A40] text-white text-xs font-medium flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            Sua avaliação real foi gravada no servidor da Biblioteca Clarice Assis!
          </span>
        </div>
      )}

      {/* Rating Summary Card + Star Distribution */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-[#F3EDE2] border border-[#D5C4A8]">
        {/* Left: Big Score */}
        <div className="flex flex-col items-center justify-center text-center sm:border-r border-[#DFD2BE] pr-0 sm:pr-4">
          <span className="font-serif-title text-4xl font-bold text-[#2C1E16]">
            {stats.avg > 0 ? stats.avg.toFixed(1) : "—"}
          </span>
          <div className="flex items-center gap-1 my-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= Math.round(stats.avg)
                    ? "fill-[#C89D54] text-[#C89D54]"
                    : "text-[#C4B39B]"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-[#6E5641] font-medium">
            {stats.total}{" "}
            {stats.total === 1
              ? "avaliação real carregada"
              : "avaliações reais carregadas"}
          </span>
        </div>

        {/* Right: Interactive Star Filter Bars */}
        <div className="sm:col-span-2 flex flex-col justify-center space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#7A6048] mb-1">
            <span>Filtrar por loja de origem:</span>
            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  { id: "todas", label: "Todas" },
                  { id: "gplay", label: "Google Play" },
                  { id: "goodreads", label: "Goodreads / Amazon" },
                  { id: "apple", label: "Apple Books" },
                  { id: "site", label: "Do Site" }
                ] as const
              ).map((src) => (
                <button
                  key={src.id}
                  type="button"
                  onClick={() => setFilterSource(src.id)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                    filterSource === src.id
                      ? "bg-[#2C1E16] text-[#E2B86B]"
                      : "bg-[#E8DEC8] text-[#5C4028] hover:bg-[#DFD2BE]"
                  }`}
                >
                  {src.label}
                </button>
              ))}
              {filterStar && (
                <button
                  type="button"
                  onClick={() => setFilterStar(null)}
                  className="text-[#8B5E34] font-bold hover:underline cursor-pointer ml-1"
                >
                  Limpar estrela
                </button>
              )}
            </div>
          </div>

          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.counts[star] || 0;
            const percent =
              stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
            const isActiveFilter = filterStar === star;

            return (
              <button
                key={star}
                type="button"
                onClick={() => setFilterStar(isActiveFilter ? null : star)}
                className={`w-full flex items-center gap-2.5 text-xs py-0.5 px-2 rounded-lg transition-colors cursor-pointer ${
                  isActiveFilter
                    ? "bg-[#2C1E16] text-[#FBF8F3]"
                    : "hover:bg-[#E8DEC8]/70 text-[#4A3525]"
                }`}
              >
                <span className="w-12 text-left font-semibold flex items-center gap-1 shrink-0">
                  {star} <Star className="w-3 h-3 fill-[#C89D54] text-[#C89D54]" />
                </span>
                <div className="flex-1 h-2 rounded-full bg-[#DFD2BE] overflow-hidden">
                  <div
                    className="h-full bg-[#C89D54] rounded-full transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="w-8 text-right text-[11px] opacity-80 shrink-0">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Write a Real Site Review Form */}
      {isWriting && (
        <form
          onSubmit={handleSubmitReview}
          className="p-5 rounded-2xl bg-[#FBF8F3] border-2 border-[#C89D54] shadow-md space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#E2D5C1] pb-3">
            <h5 className="font-serif-title text-base font-bold text-[#2C1E16] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C89D54]" />
              Publicar Avaliação Real na Biblioteca Clarice Assis
            </h5>
            <span className="text-[11px] text-[#7A6048]">
              Origem: Biblioteca Clarice Assis (Site)
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-900/10 border border-red-800/30 text-red-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Row 1: Star Rating & Vibe Tag */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#4A3525] mb-1.5">
                Sua Nota para o Livro *
              </label>
              <div className="flex items-center gap-1.5 bg-[#F3EDE2] px-3.5 py-2 rounded-xl border border-[#DFD2BE] w-fit">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-0.5 transition-transform hover:scale-110 cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          active
                            ? "fill-[#C89D54] text-[#C89D54]"
                            : "text-[#C4B39B]"
                        }`}
                      />
                    </button>
                  );
                })}
                <span className="ml-2 text-xs font-bold text-[#2C1E16]">
                  {rating}.0 / 5.0
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3525] mb-1.5">
                Selo de Impressão Literária
              </label>
              <select
                value={vibeTag}
                onChange={(e) => setVibeTag(e.target.value as ReadingVibeTag)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F3EDE2] border border-[#DFD2BE] text-xs font-semibold text-[#2C1E16] focus:outline-none focus:border-[#8B5E34]"
              >
                {READING_VIBE_TAGS.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Reader Name & Reader Profile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#4A3525] mb-1">
                Seu Nome *
              </label>
              <input
                type="text"
                value={readerName}
                onChange={(e) => setReaderName(e.target.value)}
                placeholder="Ex: Matheus Putrique"
                maxLength={50}
                className="w-full px-3.5 py-2 rounded-xl bg-[#F3EDE2] border border-[#DFD2BE] text-xs text-[#2C1E16] placeholder-[#8C735B] focus:outline-none focus:border-[#8B5E34] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3525] mb-1">
                Seu Perfil de Leitor (opcional)
              </label>
              <input
                type="text"
                value={readerRole}
                onChange={(e) => setReaderRole(e.target.value)}
                placeholder="Ex: Leitor do Site"
                maxLength={45}
                className="w-full px-3.5 py-2 rounded-xl bg-[#F3EDE2] border border-[#DFD2BE] text-xs text-[#2C1E16] placeholder-[#8C735B] focus:outline-none focus:border-[#8B5E34] focus:bg-white"
              />
            </div>
          </div>

          {/* Row 3: Review Title */}
          <div>
            <label className="block text-xs font-bold text-[#4A3525] mb-1">
              Título da sua Avaliação *
            </label>
            <input
              type="text"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              placeholder="Resuma sua experiência com o livro..."
              maxLength={80}
              className="w-full px-3.5 py-2 rounded-xl bg-[#F3EDE2] border border-[#DFD2BE] text-xs text-[#2C1E16] placeholder-[#8C735B] focus:outline-none focus:border-[#8B5E34] focus:bg-white"
            />
          </div>

          {/* Row 4: Review Comment */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-[#4A3525]">
                Seu Comentário *
              </label>
              <span className="text-[10px] text-[#7A6048]">
                {comment.length}/900 caracteres
              </span>
            </div>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Escreva sua avaliação sincera sobre o livro..."
              maxLength={900}
              className="w-full p-3.5 rounded-xl bg-[#F3EDE2] border border-[#DFD2BE] text-xs text-[#2C1E16] placeholder-[#8C735B] focus:outline-none focus:border-[#8B5E34] focus:bg-white leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setIsWriting(false)}
              className="px-4 py-2 rounded-xl bg-[#F3EDE2] hover:bg-[#E8DEC8] text-[#4A3525] text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3A5A40] hover:bg-[#2D4732] text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Publicando..." : "Publicar Avaliação Real"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      {isLoadingReviews ? (
        <div className="p-8 rounded-2xl bg-[#F7F2E7] border border-[#DFD2BE] flex flex-col items-center justify-center gap-2 text-xs text-[#6E5641]">
          <Loader2 className="w-5 h-5 animate-spin text-[#8B5E34]" />
          <span>Buscando avaliações reais de compradores nas lojas que vendem este livro...</span>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#F7F2E7] border border-[#DFD2BE] text-center space-y-3">
          <p className="font-serif-title text-sm font-bold text-[#2C1E16]">
            Nenhuma avaliação encontrada para este filtro no momento.
          </p>
          <p className="text-xs text-[#6E5641] max-w-md mx-auto">
            Não exibimos avaliações fictícias. Você pode consultar as opiniões diretamente nas lojas acima ou ser o primeiro leitor real a avaliar este livro aqui na Biblioteca Clarice Assis!
          </p>
          <button
            type="button"
            onClick={() => setIsWriting(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2C1E16] text-[#E2B86B] text-xs font-bold cursor-pointer"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Ser o Primeiro a Avaliar no Site</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((rev) => {
            const isLiked = likedIds.includes(rev.id);
            const displayLikes = rev.likes + (isLiked ? 1 : 0);
            const isFromSite = rev.sourceStore?.includes("Clarice Assis");

            return (
              <article
                key={rev.id}
                className="p-5 rounded-2xl bg-[#F7F2E7] border border-[#DFD2BE] space-y-3 transition-all hover:border-[#C89D54]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#2C1E16] text-[#E2B86B] font-serif-title font-bold text-sm flex items-center justify-center border border-[#C89D54]">
                      {rev.readerName.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#2C1E16]">
                          {rev.readerName}
                        </span>

                        {/* Explicit Origin Store Badge */}
                        {rev.sourceUrl ? (
                          <a
                            href={rev.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#2C1E16] text-[#E2B86B] hover:bg-[#4A3525] transition-colors"
                          >
                            <Store className="w-2.5 h-2.5" />
                            <span>Origem: {rev.sourceStore || "Loja Parceira"}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                          </a>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              isFromSite
                                ? "bg-[#3A5A40] text-white"
                                : "bg-[#2C1E16] text-[#E2B86B]"
                            }`}
                          >
                            <UserCheck className="w-2.5 h-2.5" />
                            <span>
                              Origem: {rev.sourceStore || "Biblioteca Clarice Assis"}
                            </span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#7A6048]">
                        {rev.readerRole} • {rev.createdAt}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 bg-[#FBF8F3] px-2.5 py-1 rounded-full border border-[#DFD2BE]">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${
                            s <= rev.rating
                              ? "fill-[#C89D54] text-[#C89D54]"
                              : "text-[#D5C4A8]"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="font-serif-title text-sm font-bold text-[#2C1E16] mb-1">
                    &ldquo;{rev.title}&rdquo;
                  </h5>
                  <p className="font-serif-body text-xs text-[#3E2A1E] leading-relaxed whitespace-pre-line">
                    {rev.comment}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#EAE0CE] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleLike(rev.id)}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border transition-all cursor-pointer ${
                        isLiked
                          ? "bg-[#2C1E16] text-[#E2B86B] border-[#2C1E16]"
                          : "bg-[#FBF8F3] text-[#6E5641] border-[#DFD2BE] hover:bg-[#E8DEC8]"
                      }`}
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>Útil ({displayLikes})</span>
                    </button>

                    {currentUser?.role === "admin" && isFromSite && (
                      <button
                        type="button"
                        onClick={() => handleAdminDeleteReview(rev.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-900/10 hover:bg-red-900/20 text-red-900 transition-colors cursor-pointer"
                        title="Moderação Admin: Excluir esta avaliação do banco SQLite"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Excluir (Admin)</span>
                      </button>
                    )}
                  </div>

                  {rev.sourceUrl && (
                    <a
                      href={rev.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-[#8B5E34] hover:underline inline-flex items-center gap-1"
                    >
                      <span>Ver avaliação original na loja</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
