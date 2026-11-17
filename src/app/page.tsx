"use client";

import React, { useState, useEffect } from "react";
import { Book, BookEdition } from "@/types/book";
import { BOOK_CATEGORIES, CURATED_BOOKS } from "@/data/curated-books";
import { getStoreOffers, getPdfResource } from "@/lib/book-links";
import {
  Search,
  BookOpen,
  Star,
  Sparkles,
  Feather,
  Bookmark,
  X,
  Calendar,
  Building2,
  FileText,
  Globe,
  ShoppingBag,
  Download,
  MessageSquareQuote,
  Compass,
  Coffee,
  CheckCircle2,
  ArrowRight,
  Layers,
  ExternalLink,
  ShieldCheck
} from "lucide-react";

export default function ClariceAssisLibrary() {
  const [books, setBooks] = useState<Book[]>(CURATED_BOOKS);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("acervo-clarice-assis");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [activeEdition, setActiveEdition] = useState<BookEdition | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [showingSavedOnly, setShowingSavedOnly] = useState(false);
  const [searchLabel, setSearchLabel] = useState<string>("Acervo de Honra: Clarice & Assis");

  const openBookModal = (book: Book) => {
    setSelectedBook(book);
    setActiveEdition(book.editions && book.editions.length > 0 ? book.editions[0] : null);
  };

  // Load initial grouped curated books from our API on mount
  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.books)) setBooks(d.books);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("clarice_assis_saved");
      if (raw) {
        setSavedIds(JSON.parse(raw));
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleSaveBook = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSavedIds((prev) => {
      const updated = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      try {
        localStorage.setItem("clarice_assis_saved", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const performSearch = async (query: string, label?: string) => {
    setShowingSavedOnly(false);
    if (!query.trim()) {
      setBooks(CURATED_BOOKS);
      setSearchLabel("Acervo de Honra: Clarice & Assis");
      return;
    }

    setIsLoading(true);
    setSearchLabel(label || `Resultados para "${query}"`);

    try {
      const res = await fetch(`/api/books?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (Array.isArray(data.books)) {
        setBooks(data.books);
      }
    } catch {
      setBooks(CURATED_BOOKS);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveCategory("");
    performSearch(searchQuery);
  };

  const handleCategorySelect = (catId: string, query: string, label: string) => {
    setActiveCategory(catId);
    setSearchQuery("");
    if (catId === "acervo-clarice-assis") {
      setShowingSavedOnly(false);
      setBooks(CURATED_BOOKS);
      setSearchLabel("Acervo de Honra: Clarice & Assis");
      return;
    }
    performSearch(query, `Estante: ${label}`);
  };

  const displayedBooks = showingSavedOnly
    ? books.filter((b) => savedIds.includes(b.id))
    : books;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Literary Announcement Bar */}
      <div className="bg-[#2C1E16] text-[#E6D7C3] text-xs py-2 px-4 border-b border-[#4A3525]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Feather className="w-3.5 h-3.5 text-[#C89D54]" />
            <span className="font-serif-body italic">
              &ldquo;Liberdade é pouco. O que eu desejo ainda não tem nome.&rdquo; — Clarice Lispector
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] uppercase tracking-wider text-[#C89D54]">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Fase 2 Ativa: PDFs & Livrarias Integradas
            </span>
          </div>
        </div>
      </div>

      {/* Classic Navigation Header */}
      <header className="sticky top-0 z-30 bg-[#FBF8F3]/95 backdrop-blur-md border-b border-[#E2D5C1] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <button
            onClick={() => {
              setActiveCategory("acervo-clarice-assis");
              setSearchQuery("");
              setShowingSavedOnly(false);
              setBooks(CURATED_BOOKS);
              setSearchLabel("Acervo de Honra: Clarice & Assis");
            }}
            className="flex items-center gap-3 text-left group cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-clarice-assis.png"
              alt="Logo Biblioteca Clarice Assis"
              className="h-14 sm:h-16 w-auto object-contain mix-blend-multiply group-hover:scale-[1.02] transition-transform"
            />
          </button>

          {/* Saved Books Shelf Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowingSavedOnly(!showingSavedOnly)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                showingSavedOnly
                  ? "bg-[#3A5A40] text-white border-[#3A5A40] shadow-sm"
                  : "bg-[#F3EDE2] text-[#2C1E16] border-[#D8C8B0] hover:bg-[#E8DEC8]"
              }`}
            >
              <Bookmark className="w-4 h-4 fill-current" />
              <span>Minha Estante</span>
              <span className="px-1.5 py-0.5 rounded-full bg-[#2C1E16]/10 text-[11px]">
                {savedIds.length}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Cozy Classic Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#2C1E16] via-[#36251B] to-[#261912] text-[#FBF8F3] border-b-4 border-[#C89D54]">
        {/* Decorative warm glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#C89D54]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#8B5E34]/15 blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#4A3525]/80 border border-[#C89D54]/40 text-[#E6C786] text-xs font-medium">
              <Coffee className="w-3.5 h-3.5" />
              <span>Sente-se, pegue um café e escolha sua próxima leitura</span>
            </div>

            <h1 className="font-serif-title text-3xl sm:text-5xl font-bold tracking-tight text-[#FBF8F3] leading-tight">
              A sabedoria de <span className="text-[#E2B86B] italic">Clarice</span>, a ironia fina de <span className="text-[#E2B86B] italic">Assis</span> e todos os livros do mundo.
            </h1>

            <p className="font-serif-body text-base sm:text-lg text-[#D9CBB8] max-w-2xl mx-auto leading-relaxed">
              Pesquise em um catálogo global de milhões de obras. Consulte fichas técnicas, edições em PDF de domínio público, links de livrarias e resenhas da comunidade.
            </p>

            {/* Main Hero Search Box */}
            <form
              onSubmit={handleFormSubmit}
              className="mt-6 max-w-2xl mx-auto relative group"
            >
              <div className="flex items-center bg-[#FBF8F3] rounded-2xl p-2 shadow-2xl border-2 border-[#C89D54]/60 focus-within:border-[#E2B86B] transition-all">
                <Search className="w-5 h-5 text-[#6E5641] ml-3 mr-2 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Digite o nome de um livro, autor ou tema (ex: Dom Casmurro, Kafka, Filosofia)..."
                  className="w-full py-2.5 px-2 bg-transparent text-[#2C1E16] placeholder-[#8C735B] text-sm sm:text-base focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="p-1.5 text-[#8C735B] hover:text-[#2C1E16] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-3 rounded-xl bg-[#2C1E16] hover:bg-[#4A3525] text-[#FBF8F3] font-semibold text-sm transition-all shrink-0 shadow-md cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? "Consultando..." : "Pesquisar Obra"}
                </button>
              </div>
            </form>

            {/* Quick Suggestion Pills */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-[#CDBBA3]">
              <span>Sugestões do bibliotecário:</span>
              {[
                "Clarice Lispector",
                "Machado de Assis",
                "Dostoiévski",
                "Jorge Luis Borges",
                "Jane Austen",
                "Domínio Público"
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setSearchQuery(suggestion);
                    setActiveCategory("");
                    performSearch(suggestion, `Busca: ${suggestion}`);
                  }}
                  className="px-2.5 py-1 rounded-full bg-[#3E2A1E] hover:bg-[#C89D54] hover:text-[#2C1E16] text-[#E6D7C3] border border-[#5C4028] transition-colors cursor-pointer"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Category Wooden Shelves Navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#7A6048] flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#8B5E34]" />
              Corredores da Biblioteca
            </h2>
          </div>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
            {BOOK_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id && !showingSavedOnly;
              return (
                <button
                  key={cat.id}
                  onClick={() =>
                    handleCategorySelect(cat.id, cat.query, cat.label)
                  }
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border cursor-pointer ${
                    isActive
                      ? "bg-[#2C1E16] text-[#FBF8F3] border-[#2C1E16] shadow-md"
                      : "bg-[#F3EDE2] text-[#4A3525] border-[#DFD2BE] hover:bg-[#E8DEC8]"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Title & Counter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-6 mb-8 border-b border-[#E2D5C1]">
          <div>
            <h3 className="font-serif-title text-2xl sm:text-3xl font-bold text-[#2C1E16]">
              {showingSavedOnly
                ? "Minha Estante Pessoal"
                : searchLabel}
            </h3>
            <p className="text-sm text-[#6E5641] font-serif-body mt-0.5">
              {showingSavedOnly
                ? "Livros que você marcou para ler com calma."
                : "Clique em qualquer livro para abrir a ficha catalográfica completa, sinopse e opções."}
            </p>
          </div>
          <div className="text-xs font-medium text-[#7A6048] bg-[#F3EDE2] px-3.5 py-2 rounded-lg border border-[#E2D5C1] self-start sm:self-auto">
            Exibindo <strong>{displayedBooks.length}</strong> volumes no catálogo
          </div>
        </div>

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-[#F3EDE2] border border-[#E2D5C1] rounded-2xl p-4 h-96 animate-pulse flex flex-col justify-between"
              >
                <div className="w-32 h-48 bg-[#E2D5C1] rounded-lg mx-auto" />
                <div className="space-y-2">
                  <div className="h-4 bg-[#E2D5C1] rounded w-3/4" />
                  <div className="h-3 bg-[#E2D5C1] rounded w-1/2" />
                  <div className="h-8 bg-[#E2D5C1] rounded w-full mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : displayedBooks.length === 0 ? (
          <div className="bg-[#F3EDE2] border border-[#DFD2BE] rounded-2xl p-12 text-center max-w-lg mx-auto my-8">
            <BookOpen className="w-12 h-12 text-[#8B5E34] mx-auto mb-3 opacity-80" />
            <h4 className="font-serif-title text-xl font-bold text-[#2C1E16] mb-2">
              {showingSavedOnly
                ? "Sua estante pessoal ainda está vazia"
                : "Nenhum volume encontrado com esses termos"}
            </h4>
            <p className="text-sm text-[#6E5641] font-serif-body mb-6">
              {showingSavedOnly
                ? "Explore o catálogo da Biblioteca Clarice Assis e clique no ícone de marcador para guardar seus livros favoritos."
                : "Tente buscar pelo sobrenome do autor, título simplificado ou volte ao Acervo de Honra."}
            </p>
            <button
              onClick={() => {
                setShowingSavedOnly(false);
                setActiveCategory("acervo-clarice-assis");
                setBooks(CURATED_BOOKS);
                setSearchLabel("Acervo de Honra: Clarice & Assis");
              }}
              className="px-5 py-2.5 rounded-xl bg-[#2C1E16] text-[#FBF8F3] text-sm font-medium hover:bg-[#4A3525] transition-colors cursor-pointer"
            >
              Voltar ao Acervo Principal
            </button>
          </div>
        ) : (
          /* Bookshelf Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
            {displayedBooks.map((book) => {
              const isSaved = savedIds.includes(book.id);
              const editionsCount = book.editions?.length || 1;
              return (
                <article
                  key={book.id}
                  onClick={() => openBookModal(book)}
                  className="group bg-[#F7F2E7] hover:bg-white rounded-2xl border border-[#DFD2BE] hover:border-[#C89D54] shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden cursor-pointer relative"
                >
                  {/* Top Curated or Public Domain Ribbon */}
                  <div className="px-4 pt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {book.curatedBadge ? (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#2C1E16] text-[#E2B86B] border border-[#4A3525] truncate">
                          {book.curatedBadge}
                        </span>
                      ) : book.isPublicDomain ? (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#3A5A40]/15 text-[#2D4732] border border-[#3A5A40]/30 truncate">
                          Domínio Público
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-[#7A6048] truncate max-w-[140px]">
                          {book.categories[0] || "Literatura"}
                        </span>
                      )}

                      {editionsCount > 1 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E8DEC8] text-[#5C4028] border border-[#D5C4A8] shrink-0 flex items-center gap-1">
                          <Layers className="w-2.5 h-2.5" />
                          {editionsCount} ed.
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => toggleSaveBook(book.id, e)}
                      title={
                        isSaved
                          ? "Remover da Minha Estante"
                          : "Guardar na Minha Estante"
                      }
                      className={`p-1.5 rounded-full transition-colors cursor-pointer shrink-0 ${
                        isSaved
                          ? "bg-[#3A5A40] text-white"
                          : "bg-[#EBE2D1] text-[#6E5641] hover:bg-[#DFD2BE]"
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>

                  {/* Book Cover Display */}
                  <div className="pt-4 pb-5 px-6 flex justify-center items-center relative">
                    <div className="w-36 h-52 rounded-r-lg rounded-l-xs bg-[#2C1E16] shadow-[6px_8px_16px_rgba(44,30,22,0.22)] overflow-hidden relative border-l-4 border-[#8B5E34] group-hover:-translate-y-1.5 transition-transform duration-300 flex items-center justify-center">
                      {/* Classic leather book cover fallback underneath */}
                      <div className="absolute inset-0 p-3 flex flex-col justify-between text-center bg-gradient-to-br from-[#3E2A1E] to-[#231710] text-[#E6D7C3] z-0">
                        <div className="border border-[#C89D54]/40 h-full p-2 flex flex-col justify-between rounded-xs">
                          <span className="text-[9px] uppercase tracking-widest text-[#C89D54]">
                            Clarice Assis
                          </span>
                          <p className="font-serif-title text-xs font-bold line-clamp-3 text-[#FBF8F3]">
                            {book.title}
                          </p>
                          <span className="text-[10px] italic text-[#C89D54] line-clamp-1">
                            {book.authors[0]}
                          </span>
                        </div>
                      </div>
                      {book.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={book.thumbnail}
                          alt={`Capa do livro ${book.title}`}
                          className="w-full h-full object-cover relative z-10"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : null}
                    </div>
                  </div>

                  {/* Book Metadata */}
                  <div className="px-5 pb-5 flex-1 flex flex-col justify-between border-t border-[#EAE0CE] bg-[#FBF8F3]/60 pt-4">
                    <div>
                      <div className="flex items-center justify-between text-xs text-[#7A6048] mb-1">
                        <span>{book.publishedDate}</span>
                        <span className="flex items-center gap-1 text-[#B07D2B] font-semibold">
                          <Star className="w-3.5 h-3.5 fill-[#C89D54] text-[#C89D54]" />
                          {book.averageRating.toFixed(1)}
                        </span>
                      </div>

                      <h4 className="font-serif-title text-lg font-bold text-[#2C1E16] group-hover:text-[#8B5E34] transition-colors line-clamp-2 leading-snug">
                        {book.title}
                      </h4>

                      <p className="text-xs font-medium text-[#5C4028] mt-1 line-clamp-1">
                        {book.authors.join(", ")}
                      </p>

                      <p className="font-serif-body text-xs text-[#6E5641] mt-2.5 line-clamp-2 leading-relaxed">
                        {book.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#EAE0CE] flex items-center justify-between text-xs font-semibold text-[#2C1E16]">
                      <span className="flex items-center gap-1.5 text-[#5C4028] group-hover:text-[#2C1E16]">
                        <BookOpen className="w-3.5 h-3.5 text-[#8B5E34]" />
                        Abrir Ficha da Obra
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#8B5E34] group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Roadmap Progress Banner at the Bottom */}
        <section className="mt-16 bg-[#2C1E16] text-[#FBF8F3] rounded-3xl p-8 border-2 border-[#C89D54]/50 shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className="text-xs uppercase tracking-widest text-[#C89D54] font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Evolução Passo a Passo (Vibe Coding)
              </span>
              <h3 className="font-serif-title text-2xl font-bold">
                Arquitetura da Biblioteca Clarice Assis
              </h3>
              <p className="text-sm text-[#D9CBB8] font-serif-body">
                Construindo o projeto em etapas seguras para garantir código limpo, zero erros e visual refinado.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full md:w-auto">
              <div className="p-3.5 rounded-xl bg-[#36251B] border border-[#5C4028] text-xs">
                <div className="flex items-center gap-1.5 text-[#3A5A40] bg-[#E8DEC8] px-2 py-0.5 rounded-full w-fit font-bold mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Fase 1 Concluída
                </div>
                <p className="text-[#E6D7C3]">Catálogo, Busca & Edições</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#3E2A1E] border-2 border-[#C89D54] text-xs shadow-md">
                <div className="flex items-center gap-1.5 text-[#E2B86B] font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4" /> Fase 2 (Ativa)
                </div>
                <p className="text-[#FBF8F3]">PDFs Gratuitos & Links de Compra</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#36251B]/60 border border-[#5C4028] text-xs opacity-85">
                <div className="font-bold text-[#C89D54] mb-1">Fase 3 (Próxima)</div>
                <p className="text-[#CDBBA3]">Mural de Opiniões & Avaliações</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#36251B]/60 border border-[#5C4028] text-xs opacity-80">
                <div className="font-bold text-[#C89D54] mb-1">Fase 4</div>
                <p className="text-[#CDBBA3]">Banco de Dados & Segurança</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Book Detail Modal (Ficha Catalográfica Completa) */}
      {selectedBook && (
        <div
          onClick={() => setSelectedBook(null)}
          className="fixed inset-0 z-50 bg-[#1B120C]/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FBF8F3] border-2 border-[#C89D54] rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Modal Top Header */}
            <div className="bg-[#2C1E16] text-[#FBF8F3] px-6 py-4 flex items-center justify-between border-b border-[#4A3525]">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#C89D54]">
                <BookOpen className="w-4 h-4" />
                <span>Ficha Catalográfica • Biblioteca Clarice Assis</span>
              </div>
              <button
                onClick={() => setSelectedBook(null)}
                className="p-1.5 rounded-full bg-[#3E2A1E] text-[#E6D7C3] hover:bg-[#C89D54] hover:text-[#2C1E16] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 max-h-[82vh] overflow-y-auto space-y-6">
              <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                {/* Book Cover (updates dynamically when user clicks another physical edition) */}
                <div className="w-40 h-60 rounded-r-xl rounded-l-xs bg-[#2C1E16] shadow-xl overflow-hidden shrink-0 border-l-4 border-[#8B5E34] relative flex items-center justify-center">
                  {(activeEdition?.thumbnail || selectedBook.thumbnail) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeEdition?.thumbnail || selectedBook.thumbnail}
                      alt={activeEdition?.title || selectedBook.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="p-4 text-center text-[#E6D7C3]">
                      <p className="font-serif-title font-bold text-sm">
                        {activeEdition?.title || selectedBook.title}
                      </p>
                    </div>
                  )}
                </div>

                {/* Main Details */}
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    {selectedBook.categories.map((cat) => (
                      <span
                        key={cat}
                        className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#E8DEC8] text-[#4A3525]"
                      >
                        {cat}
                      </span>
                    ))}
                    {selectedBook.isPublicDomain && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#3A5A40] text-white">
                        Domínio Público
                      </span>
                    )}
                  </div>

                  <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-[#2C1E16]">
                    {activeEdition?.title || selectedBook.title}
                  </h2>

                  {(activeEdition?.subtitle || selectedBook.subtitle) && (
                    <p className="font-serif-body italic text-sm text-[#6E5641]">
                      {activeEdition?.subtitle || selectedBook.subtitle}
                    </p>
                  )}

                  <p className="text-sm font-semibold text-[#5C4028]">
                    Por {(activeEdition?.authors || selectedBook.authors).join(", ")}
                  </p>

                  {/* Rating & Save */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1">
                    <div className="flex items-center gap-1.5 bg-[#F3EDE2] px-3 py-1.5 rounded-lg border border-[#DFD2BE]">
                      <Star className="w-4 h-4 fill-[#C89D54] text-[#C89D54]" />
                      <span className="font-bold text-sm text-[#2C1E16]">
                        {selectedBook.averageRating.toFixed(1)}
                      </span>
                      <span className="text-xs text-[#7A6048]">
                        ({selectedBook.ratingsCount} avaliações)
                      </span>
                    </div>

                    <button
                      onClick={() => toggleSaveBook(selectedBook.id)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        savedIds.includes(selectedBook.id)
                          ? "bg-[#3A5A40] text-white border-[#3A5A40]"
                          : "bg-[#F3EDE2] text-[#2C1E16] border-[#DFD2BE] hover:bg-[#E8DEC8]"
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5 fill-current" />
                      {savedIds.includes(selectedBook.id)
                        ? "Salvo na Minha Estante"
                        : "Salvar na Estante"}
                    </button>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
                    <div className="bg-[#F3EDE2] p-2.5 rounded-xl border border-[#E2D5C1]">
                      <span className="text-[11px] text-[#7A6048] flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Publicação
                      </span>
                      <p className="text-xs font-bold text-[#2C1E16] mt-0.5">
                        {activeEdition?.publishedDate || selectedBook.publishedDate}
                      </p>
                    </div>
                    <div className="bg-[#F3EDE2] p-2.5 rounded-xl border border-[#E2D5C1]">
                      <span className="text-[11px] text-[#7A6048] flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Páginas
                      </span>
                      <p className="text-xs font-bold text-[#2C1E16] mt-0.5">
                        {(activeEdition?.pageCount || selectedBook.pageCount) > 0
                          ? `${activeEdition?.pageCount || selectedBook.pageCount} págs.`
                          : "Consulte ed."}
                      </p>
                    </div>
                    <div className="bg-[#F3EDE2] p-2.5 rounded-xl border border-[#E2D5C1]">
                      <span className="text-[11px] text-[#7A6048] flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> Editora / Selo
                      </span>
                      <p className="text-xs font-bold text-[#2C1E16] mt-0.5 truncate">
                        {activeEdition?.publisher || selectedBook.publisher}
                      </p>
                    </div>
                    <div className="bg-[#F3EDE2] p-2.5 rounded-xl border border-[#E2D5C1]">
                      <span className="text-[11px] text-[#7A6048] flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Edição / Idioma
                      </span>
                      <p className="text-xs font-bold text-[#2C1E16] mt-0.5 truncate">
                        {activeEdition?.isbn || activeEdition?.language || selectedBook.language.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Other Physical & Translated Editions Shelf inside Modal */}
              {selectedBook.editions && selectedBook.editions.length > 1 && (
                <div className="bg-[#F3EDE2] border border-[#DFD2BE] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#5C4028] flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#8B5E34]" />
                      Outras Edições Físicas & Traduções Disponíveis ({selectedBook.editions.length})
                    </h4>
                    <span className="text-[11px] text-[#7A6048]">
                      Clique para alternar a edição
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {selectedBook.editions.map((edition, idx) => {
                      const isSelectedEd =
                        activeEdition?.id === edition.id ||
                        (!activeEdition && idx === 0);
                      return (
                        <button
                          key={edition.id}
                          type="button"
                          onClick={() => setActiveEdition(edition)}
                          className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelectedEd
                              ? "bg-[#2C1E16] text-[#FBF8F3] border-[#C89D54] shadow-sm"
                              : "bg-[#FBF8F3] text-[#2C1E16] border-[#E2D5C1] hover:border-[#8B5E34]"
                          }`}
                        >
                          <div className="w-10 h-14 rounded bg-[#3E2A1E] overflow-hidden shrink-0 border border-[#C89D54]/40">
                            {edition.thumbnail && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={edition.thumbnail}
                                alt={edition.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-xs font-bold truncate ${
                                isSelectedEd ? "text-[#E2B86B]" : "text-[#2C1E16]"
                              }`}
                            >
                              {edition.title}
                            </p>
                            <p
                              className={`text-[11px] truncate ${
                                isSelectedEd ? "text-[#D9CBB8]" : "text-[#6E5641]"
                              }`}
                            >
                              {edition.publisher}
                            </p>
                            <span
                              className={`inline-block mt-0.5 text-[10px] px-1.5 py-0.2 rounded ${
                                isSelectedEd
                                  ? "bg-[#4A3525] text-[#FBF8F3]"
                                  : "bg-[#EAE0CE] text-[#5C4028]"
                              }`}
                            >
                              {edition.language} • {edition.publishedDate}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Featured Literary Quote if present */}
              {selectedBook.featuredQuote && (
                <blockquote className="bg-[#F3EDE2] border-l-4 border-[#C89D54] p-4 rounded-r-xl font-serif-body italic text-sm text-[#3E2A1E]">
                  &ldquo;{selectedBook.featuredQuote}&rdquo;
                </blockquote>
              )}

              {/* Synopsis */}
              <div className="space-y-2">
                <h4 className="font-serif-title text-lg font-bold text-[#2C1E16]">
                  Sinopse & Apresentação da Obra
                </h4>
                <p className="font-serif-body text-sm text-[#3E2A1E] leading-relaxed whitespace-pre-line">
                  {selectedBook.description}
                </p>
              </div>

              {/* PHASE 2: PDF DOWNLOADS & WHERE TO BUY */}
              {(() => {
                const pdfInfo = getPdfResource(selectedBook, activeEdition);
                const storeOffers = getStoreOffers(selectedBook, activeEdition);

                return (
                  <div className="space-y-6 pt-4 border-t-2 border-[#E2D5C1]">
                    {/* 1. PDF Direct Download Hub */}
                    <div className="rounded-2xl bg-[#F3EDE2] border border-[#D5C4A8] p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-[#3A5A40] text-white flex items-center justify-center shrink-0">
                            <Download className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-serif-title text-base font-bold text-[#2C1E16]">
                              Download Direto em PDF
                            </h4>
                            <p className="text-xs font-semibold text-[#3A5A40]">
                              {pdfInfo.statusLabel}
                            </p>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#E8DEC8] text-[#5C4028] w-fit">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#3A5A40]" />
                          Arquivo .PDF Verificado
                        </span>
                      </div>

                      <p className="text-xs text-[#5C4028] font-serif-body leading-relaxed">
                        {pdfInfo.legalNote}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        {/* Instant Direct PDF File Download */}
                        <a
                          href={pdfInfo.directDownloadUrl}
                          download
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3A5A40] hover:bg-[#2D4732] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>Baixar Arquivo .PDF Agora</span>
                        </a>

                        {/* Direct Official MEC PDF if available */}
                        {pdfInfo.officialPublicPdfUrl && (
                          <a
                            href={pdfInfo.officialPublicPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2C1E16] hover:bg-[#4A3525] text-[#FBF8F3] text-xs font-semibold transition-all"
                          >
                            <FileText className="w-4 h-4 text-[#C89D54]" />
                            <span>PDF Integral MEC (Domínio Público)</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* 2. Where to Buy (Bookstores Grid) */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-serif-title text-lg font-bold text-[#2C1E16] flex items-center gap-2">
                          <ShoppingBag className="w-5 h-5 text-[#8B5E34]" />
                          <span>Onde Comprar esta Edição</span>
                        </h4>
                        <span className="text-xs text-[#7A6048]">
                          Busca para: <strong>{activeEdition?.title || selectedBook.title}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {storeOffers.map((store) => (
                          <a
                            key={store.id}
                            href={store.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group p-4 rounded-2xl bg-[#F7F2E7] hover:bg-white border border-[#DFD2BE] hover:border-[#C89D54] shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-serif-title font-bold text-sm text-[#2C1E16] group-hover:text-[#8B5E34] transition-colors">
                                  {store.storeName}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E8DEC8] text-[#5C4028]">
                                  {store.badge}
                                </span>
                              </div>
                              <p className="text-xs text-[#6E5641] leading-relaxed">
                                {store.description}
                              </p>
                            </div>

                            <div className="flex items-center justify-between text-xs font-bold text-[#2C1E16] pt-2 border-t border-[#EAE0CE]">
                              <span className="group-hover:underline">
                                Ver ofertas na {store.storeName}
                              </span>
                              <ExternalLink className="w-3.5 h-3.5 text-[#8B5E34] group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* 3. Preview of Phase 3 (Reviews) */}
                    <div className="p-4 rounded-2xl bg-[#F3EDE2]/70 border border-dashed border-[#C89D54] flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <MessageSquareQuote className="w-5 h-5 text-[#8B5E34] shrink-0" />
                        <div>
                          <h5 className="text-xs font-bold text-[#2C1E16]">
                            Mural de Opiniões & Resenhas dos Leitores
                          </h5>
                          <p className="text-[11px] text-[#6E5641]">
                            Na próxima etapa (Fase 3), os leitores poderão avaliar e publicar resenhas sobre esta obra.
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#E8DEC8] text-[#5C4028] shrink-0">
                        Fase 3
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Classic Footer */}
      <footer className="bg-[#2C1E16] text-[#CDBBA3] border-t-2 border-[#4A3525] py-8 px-4 text-center text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-emblem.png"
              alt="Emblema Biblioteca Clarice Assis"
              className="w-7 h-7 rounded-full object-cover border border-[#C89D54]"
            />
            <span className="font-serif-title font-bold text-[#FBF8F3] text-sm">
              Biblioteca Clarice Assis
            </span>
            <span>— Homenagem a Clarice Lispector & Machado de Assis</span>
          </div>
          <p className="text-[#9E8870]">
            Construído passo a passo com Next.js Full-Stack • Fase 1 Concluída
          </p>
        </div>
      </footer>
    </div>
  );
}
