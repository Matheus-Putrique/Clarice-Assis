"use client";

import React, { useState, useEffect, useRef } from "react";
import { Book, BookEdition } from "@/types/book";
import { BOOK_CATEGORIES, CURATED_BOOKS } from "@/data/curated-books";
import { getStoreOffers, getPdfResource } from "@/lib/book-links";
import BookReviewsSection from "@/components/BookReviewsSection";
import AuthModal, { SessionUser, WelcomeEmailInfo } from "@/components/AuthModal";
import AdminPanelModal from "@/components/AdminPanelModal";
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
  Compass,
  Coffee,
  CheckCircle2,
  ArrowRight,
  Layers,
  ExternalLink,
  ShieldCheck,
  Shuffle,
  SlidersHorizontal,
  PlusCircle,
  UserCheck,
  LogOut,
  LogIn,
  AlertTriangle,
  Wrench,
  Flag,
  ShieldAlert
} from "lucide-react";

export default function ClariceAssisLibrary() {
  const [books, setBooks] = useState<Book[]>(CURATED_BOOKS);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("acervo-clarice-assis");
  const [activeSubTopic, setActiveSubTopic] = useState<string>("");
  const [currentQuery, setCurrentQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMoreBooks, setHasMoreBooks] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [shelfFilter, setShelfFilter] = useState("");
  const [sortBy, setSortBy] = useState<"relevancia" | "nota" | "ano" | "titulo">("relevancia");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [activeEdition, setActiveEdition] = useState<BookEdition | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfNotice, setPdfNotice] = useState<{
    type: "success" | "unavailable";
    title: string;
    message: string;
  } | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [showingSavedOnly, setShowingSavedOnly] = useState(false);
  const [searchLabel, setSearchLabel] = useState<string>("Acervo de Honra: Clarice & Assis");

  // Phase 4 & 5: Authenticated SQLite Session User, Auth Modal & Admin Panel
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [pendingPdfIssuesCount, setPendingPdfIssuesCount] = useState<number>(0);
  const [adminBookToFix, setAdminBookToFix] = useState<{
    title: string;
    author: string;
  } | null>(null);
  const [isReportingPdfIssue, setIsReportingPdfIssue] = useState(false);
  const [welcomeEmailToast, setWelcomeEmailToast] = useState<{
    name: string;
    email: string;
    previewUrl?: string | null;
  } | null>(null);

  // Google-style live autocomplete suggestions state
  const [suggestions, setSuggestions] = useState<Book[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const searchContainerRef = useRef<HTMLFormElement | null>(null);

  const refreshAdminIssuesCount = async () => {
    try {
      const res = await fetch("/api/admin");
      if (!res.ok) return;
      const data = await res.json();
      if (data?.stats && typeof data.stats.pendingIssues === "number") {
        setPendingPdfIssuesCount(data.stats.pendingIssues);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (currentUser?.role === "admin") {
      refreshAdminIssuesCount();
    } else {
      setPendingPdfIssuesCount(0);
    }
  }, [currentUser]);

  const openBookModal = (book: Book) => {
    setSelectedBook(book);
    setActiveEdition(book.editions && book.editions.length > 0 ? book.editions[0] : null);
    setIsDownloadingPdf(false);
    setPdfNotice(null);
    setShowSuggestions(false);
  };

  /**
   * Phase 5: Safe PDF Downloader.
   * If the PDF fails or is unavailable, returns null, shows a clean alert to the user,
   * and automatically notifies the Admin in the SQLite maintenance queue.
   */
  const handleDownloadPdf = async (
    downloadUrl: string,
    bookTitle: string
  ): Promise<string | null> => {
    setIsDownloadingPdf(true);
    setPdfNotice(null);

    try {
      const res = await fetch(downloadUrl);
      const contentType = res.headers.get("content-type") || "";

      if (!res.ok || !contentType.includes("application/pdf")) {
        let errorMsg = `Este PDF ("${bookTitle}") está apresentando algum problema ou indisponibilidade no acervo. O Administrador já foi notificado automaticamente para que uma correção seja feita!`;
        try {
          const errData = await res.json();
          if (errData?.error) errorMsg = errData.error;
        } catch {
          // ignore
        }

        setPdfNotice({
          type: "unavailable",
          title: bookTitle,
          message: errorMsg
        });

        if (currentUser?.role === "admin") {
          refreshAdminIssuesCount();
        }
        return null;
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const tempLink = document.createElement("a");
      tempLink.href = blobUrl;

      let filename = `${bookTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}-livro-completo.pdf`;
      const disposition = res.headers.get("content-disposition");
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match?.[1]) filename = match[1];
      }

      tempLink.download = filename;
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      window.URL.revokeObjectURL(blobUrl);

      setPdfNotice({
        type: "success",
        title: bookTitle,
        message: `O download do arquivo integral "${filename}" foi iniciado com sucesso!`
      });
      setTimeout(() => {
        setPdfNotice((prev) => (prev?.type === "success" ? null : prev));
      }, 6000);
      return filename;
    } catch {
      setPdfNotice({
        type: "unavailable",
        title: bookTitle,
        message:
          "Este PDF apresentou erro de leitura/transferência. Retornado nulo e o Administrador foi notificado para verificação."
      });
      return null;
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  /**
   * Phase 5: Manual User Report button to notify the Admin about any PDF defect
   */
  const handleReportPdfIssue = async (bookTitle: string, bookAuthor: string) => {
    setIsReportingPdfIssue(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "report_pdf_issue",
          bookTitle,
          bookAuthor,
          errorDetails:
            "Alerta enviado pelo leitor na ficha do livro: solicitação de revisão/reparo do arquivo PDF."
        })
      });
      const data = await res.json();
      setPdfNotice({
        type: "unavailable",
        title: bookTitle,
        message:
          data?.message ||
          `O problema no PDF de "${bookTitle}" foi reportado! O Administrador foi notificado no Painel de Manutenção.`
      });
      if (currentUser?.role === "admin") {
        refreshAdminIssuesCount();
      }
    } catch {
      setPdfNotice({
        type: "unavailable",
        title: bookTitle,
        message: "Erro ao comunicar chamado ao Administrador."
      });
    } finally {
      setIsReportingPdfIssue(false);
    }
  };

  // Close autocomplete dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced live autocomplete fetch as the user types
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsSuggesting(false);
      setHighlightedIndex(-1);
      return;
    }

    const norm = trimmed
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    // Instant local matches from curated & currently loaded books first
    const localMatches = [...CURATED_BOOKS, ...books]
      .filter(
        (b, idx, arr) =>
          arr.findIndex((x) => x.title.toLowerCase() === b.title.toLowerCase()) === idx &&
          (b.title
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .includes(norm) ||
            b.authors.some((a) =>
              a
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .includes(norm)
            ))
      )
      .slice(0, 5);

    if (localMatches.length > 0) {
      setSuggestions(localMatches);
    }

    setIsSuggesting(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/books?q=${encodeURIComponent(trimmed)}&page=1&limit=8`
        );
        const data = await res.json();
        if (Array.isArray(data.books)) {
          setSuggestions(data.books.slice(0, 6));
        }
      } catch {
        // Keep local matches if network fails
      } finally {
        setIsSuggesting(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [searchQuery, books]);

  // Load initial grouped curated books and active SQLite session + user shelf on mount
  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.books)) setBooks(d.books);
      })
      .catch(() => {});

    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setCurrentUser(d.user);
          fetch("/api/shelf")
            .then((sr) => sr.json())
            .then((sd) => {
              if (Array.isArray(sd.savedIds)) {
                setSavedIds(sd.savedIds);
              }
            })
            .catch(() => {});
        } else {
          try {
            const raw = localStorage.getItem("clarice_assis_saved");
            if (raw) setSavedIds(JSON.parse(raw));
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" })
    });
    setCurrentUser(null);
  };

  const toggleSaveBook = (id: string, e?: React.MouseEvent, bookObj?: Book) => {
    if (e) e.stopPropagation();
    const targetBook = bookObj || books.find((b) => b.id === id) || selectedBook;

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

    if (currentUser) {
      fetch("/api/shelf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: id, book: targetBook })
      }).catch(() => {});
    }
  };

  const performSearch = async (query: string, label?: string) => {
    setShowingSavedOnly(false);
    setShelfFilter("");
    setCurrentPage(1);
    setCurrentQuery(query);

    setIsLoading(true);
    setSearchLabel(label || (query.trim() ? `Resultados para "${query}"` : "Acervo de Honra: Clarice & Assis"));

    try {
      const res = await fetch(`/api/books?q=${encodeURIComponent(query)}&page=1&limit=12`);
      const data = await res.json();
      if (Array.isArray(data.books)) {
        setBooks(data.books);
        setHasMoreBooks(Boolean(data.hasMore));
      }
    } catch {
      setBooks(CURATED_BOOKS);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMoreBooks = async () => {
    const nextPage = currentPage + 1;
    setIsLoadingMore(true);
    try {
      const res = await fetch(
        `/api/books?q=${encodeURIComponent(currentQuery)}&page=${nextPage}&limit=12`
      );
      const data = await res.json();
      if (Array.isArray(data.books)) {
        setBooks(data.books);
        setCurrentPage(nextPage);
        setHasMoreBooks(Boolean(data.hasMore));
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSurpriseDiscovery = () => {
    const allTopics = BOOK_CATEGORIES.flatMap((c) => c.subQueries);
    const randomTopic =
      allTopics[Math.floor(Math.random() * allTopics.length)] || "Machado de Assis";
    setActiveSubTopic(randomTopic);
    performSearch(randomTopic, `Descoberta Literária: ${randomTopic}`);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveCategory("");
    setActiveSubTopic("");
    performSearch(searchQuery);
  };

  const handleCategorySelect = (catId: string, query: string, label: string) => {
    setActiveCategory(catId);
    setActiveSubTopic("");
    setSearchQuery("");
    if (catId === "acervo-clarice-assis") {
      performSearch("", "Acervo de Honra: Clarice & Assis");
      return;
    }
    performSearch(query, `Estante: ${label}`);
  };

  const currentCategoryObj =
    BOOK_CATEGORIES.find((c) => c.id === activeCategory) || BOOK_CATEGORIES[0];

  // Apply local shelf filter and sorting (all books are already automatically localized to PT-BR by the backend)
  const displayedBooks = books
    .filter((b) => {
      if (showingSavedOnly && !savedIds.includes(b.id)) return false;
      if (shelfFilter.trim()) {
        const term = shelfFilter
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        const titleMatch = b.title
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .includes(term);
        const authorMatch = b.authors.some((a) =>
          a
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .includes(term)
        );
        if (!titleMatch && !authorMatch) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "nota") return b.averageRating - a.averageRating;
      if (sortBy === "titulo") return a.title.localeCompare(b.title);
      if (sortBy === "ano") {
        const ya = parseInt(a.publishedDate, 10) || 0;
        const yb = parseInt(b.publishedDate, 10) || 0;
        return yb - ya;
      }
      return 0;
    });

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
              <Sparkles className="w-3 h-3" /> Fase 5 Ativa: Divisão Usuário vs. Admin & Alertas de PDF
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

          {/* Saved Books Shelf Button + Admin Panel Button + Reader Auth Status */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowingSavedOnly(!showingSavedOnly)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                showingSavedOnly
                  ? "bg-[#3A5A40] text-white border-[#3A5A40] shadow-sm"
                  : "bg-[#F3EDE2] text-[#2C1E16] border-[#D8C8B0] hover:bg-[#E8DEC8]"
              }`}
            >
              <Bookmark className="w-4 h-4 fill-current" />
              <span className="hidden sm:inline">Minha Estante</span>
              <span className="px-1.5 py-0.5 rounded-full bg-[#2C1E16]/10 text-[11px]">
                {savedIds.length}
              </span>
            </button>

            {currentUser?.role === "admin" && (
              <button
                type="button"
                onClick={() => {
                  setAdminBookToFix(null);
                  setIsAdminModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#8B3A2B] hover:bg-[#6E2C20] text-[#FBF8F3] text-xs font-bold border border-[#C89D54] shadow-sm transition-all cursor-pointer"
                title="Abrir Painel do Bibliotecário Chefe (Alertas de PDF, Moderação e Usuários)"
              >
                <Wrench className="w-3.5 h-3.5 text-[#E2B86B]" />
                <span>Painel Admin</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    pendingPdfIssuesCount > 0
                      ? "bg-[#E2B86B] text-[#2C1E16] animate-pulse"
                      : "bg-black/25 text-[#E6D7C3]"
                  }`}
                >
                  {pendingPdfIssuesCount}
                </span>
              </button>
            )}

            {currentUser ? (
              <div className="flex items-center gap-2 bg-[#2C1E16] text-[#FBF8F3] pl-3.5 pr-2 py-1.5 rounded-full border border-[#C89D54]">
                <UserCheck className="w-3.5 h-3.5 text-[#E2B86B] shrink-0" />
                <div className="text-left leading-tight">
                  <p className="text-[11px] font-bold text-[#E2B86B] truncate max-w-[120px]">
                    {currentUser.name}
                  </p>
                  <p className="text-[9px] text-[#D9CBB8] uppercase tracking-wider">
                    {currentUser.role === "admin"
                      ? "Visão: Admin"
                      : "Visão: Leitor"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sair da conta"
                  className="p-1.5 rounded-full bg-[#3E2A1E] hover:bg-red-900/80 text-[#E6D7C3] transition-colors cursor-pointer ml-1"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#2C1E16] hover:bg-[#4A3525] text-[#E2B86B] text-xs font-bold border border-[#C89D54]/60 shadow-xs transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar / Criar Conta</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Welcome Email Dispatched Banner */}
      {welcomeEmailToast && (
        <div className="bg-[#3A5A40] text-white px-4 py-3 border-b border-[#C89D54] shadow-md">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#E2B86B] shrink-0" />
              <span>
                <strong>Carteira de Leitor Emitida!</strong> A Biblioteca Clarice Assis enviou um e-mail oficial de boas-vindas para{" "}
                <strong className="underline">{welcomeEmailToast.email}</strong>.
              </span>
            </div>
            <div className="flex items-center gap-3">
              {welcomeEmailToast.previewUrl && (
                <a
                  href={welcomeEmailToast.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#2C1E16] text-[#E2B86B] font-bold hover:bg-[#4A3525] transition-colors"
                >
                  <span>Visualizar E-mail Enviado</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setWelcomeEmailToast(null)}
                className="text-white/80 hover:text-white font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cozy Classic Hero Section */}
      <section className="relative bg-gradient-to-b from-[#2C1E16] via-[#36251B] to-[#261912] text-[#FBF8F3] border-b-4 border-[#C89D54]">
        {/* Decorative warm glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#C89D54]/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#8B5E34]/15 blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 relative z-20">
          <div className="max-w-3xl mx-auto text-center space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#4A3525]/80 border border-[#C89D54]/40 text-[#E6C786] text-xs font-medium">
              <Coffee className="w-3.5 h-3.5" />
              <span>Sente-se, pegue um café e escolha sua próxima leitura</span>
            </div>

            <h1 className="font-serif-title text-3xl sm:text-5xl font-bold tracking-tight text-[#FBF8F3] leading-tight">
              A sabedoria de <span className="text-[#E2B86B] italic">Clarice</span>, a ironia fina de <span className="text-[#E2B86B] italic">Assis</span> e todos os livros do mundo.
            </h1>

            <p className="font-serif-body text-base sm:text-lg text-[#D9CBB8] max-w-2xl mx-auto leading-relaxed">
              Pesquise em um catálogo global de milhões de obras individuais. Consulte fichas técnicas, edições em PDF completo, links de livrarias e resenhas da comunidade.
            </p>

            {/* Main Hero Search Box with Google-Style Live Autocomplete Dropdown */}
            <form
              ref={searchContainerRef}
              onSubmit={(e) => {
                if (
                  showSuggestions &&
                  highlightedIndex >= 0 &&
                  suggestions[highlightedIndex]
                ) {
                  e.preventDefault();
                  const chosen = suggestions[highlightedIndex];
                  setSearchQuery(chosen.title);
                  setShowSuggestions(false);
                  openBookModal(chosen);
                  return;
                }
                setShowSuggestions(false);
                handleFormSubmit(e);
              }}
              className="mt-6 max-w-2xl mx-auto relative group text-left"
            >
              <div
                className={`flex items-center bg-[#FBF8F3] p-2 shadow-2xl border-2 transition-all ${
                  showSuggestions && searchQuery.trim().length >= 2
                    ? "rounded-t-2xl border-[#E2B86B]"
                    : "rounded-2xl border-[#C89D54]/60 focus-within:border-[#E2B86B]"
                }`}
              >
                <Search className="w-5 h-5 text-[#6E5641] ml-3 mr-2 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setShowSuggestions(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                    setHighlightedIndex(-1);
                  }}
                  onKeyDown={(e) => {
                    if (!showSuggestions || suggestions.length === 0) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setHighlightedIndex((prev) =>
                        prev < suggestions.length - 1 ? prev + 1 : 0
                      );
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setHighlightedIndex((prev) =>
                        prev > 0 ? prev - 1 : suggestions.length - 1
                      );
                    } else if (e.key === "Escape") {
                      setShowSuggestions(false);
                    }
                  }}
                  placeholder="Digite o nome de um livro ou autor (sugestões aparecem ao digitar)..."
                  className="w-full py-2.5 px-2 bg-transparent text-[#2C1E16] placeholder-[#8C735B] text-sm sm:text-base focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSuggestions([]);
                      setShowSuggestions(false);
                    }}
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

              {/* Google-Style Instant Suggestions Dropdown */}
              {showSuggestions && searchQuery.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full bg-[#FBF8F3] border-x-2 border-b-2 border-[#E2B86B] rounded-b-2xl shadow-2xl overflow-hidden z-50 divide-y divide-[#EAE0CE]">
                  <div className="px-4 py-2 bg-[#F3EDE2] flex items-center justify-between text-[11px] font-semibold text-[#7A6048]">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#C89D54]" />
                      {isSuggesting
                        ? "Buscando obras individuais no acervo..."
                        : `Sugestões instantâneas para "${searchQuery.trim()}"`}
                    </span>
                    <span className="hidden sm:inline text-[10px] text-[#8C735B]">
                      Use ↑↓ ou clique para abrir
                    </span>
                  </div>

                  {suggestions.length === 0 && !isSuggesting ? (
                    <div className="p-4 text-center text-xs text-[#6E5641]">
                      Pressione <strong>Enter</strong> ou clique em{" "}
                      <strong>Pesquisar Obra</strong> para buscar no acervo completo.
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto divide-y divide-[#EAE0CE]">
                      {suggestions.map((sug, idx) => {
                        const isHighlighted = idx === highlightedIndex;
                        return (
                          <div
                            key={sug.id}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            onClick={() => {
                              setSearchQuery(sug.title);
                              setShowSuggestions(false);
                              openBookModal(sug);
                            }}
                            className={`flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                              isHighlighted
                                ? "bg-[#E8DEC8]"
                                : "hover:bg-[#F3EDE2]"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-13 rounded bg-[#2C1E16] overflow-hidden shrink-0 border border-[#C89D54]/50 shadow-2xs">
                                {sug.thumbnail && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={sug.thumbnail}
                                    alt={sug.title}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-serif-title font-bold text-sm text-[#2C1E16] truncate">
                                  {sug.title}
                                </p>
                                <p className="text-xs text-[#5C4028] truncate">
                                  {sug.authors.join(", ")} •{" "}
                                  <span className="text-[#7A6048]">
                                    {sug.categories[0] || "Literatura"}
                                  </span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSearchQuery(sug.title);
                                  setShowSuggestions(false);
                                  performSearch(
                                    sug.title,
                                    `Busca: ${sug.title}`
                                  );
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#F3EDE2] hover:bg-[#2C1E16] text-[#5C4028] hover:text-[#FBF8F3] border border-[#D5C4A8] text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                Filtrar na estante
                              </button>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2C1E16] text-[#E2B86B] text-[11px] font-bold">
                                <BookOpen className="w-3 h-3" />
                                Abrir Ficha
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Footer action to show all results in the grid */}
                  <button
                    type="submit"
                    className="w-full px-4 py-2.5 bg-[#F3EDE2] hover:bg-[#E8DEC8] text-xs font-bold text-[#2C1E16] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5 text-[#8B5E34]" />
                    <span>
                      Ver todos os livros individuais para &ldquo;{searchQuery.trim()}&rdquo; na estante
                    </span>
                  </button>
                </div>
              )}
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
        {/* Category Wooden Shelves Navigation & Sub-Topics Explorer */}
        <div className="mb-8 bg-[#F3EDE2] border border-[#DFD2BE] rounded-2xl p-5 space-y-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#7A6048] flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#8B5E34]" />
                Corredores da Biblioteca (Navegue por Gênero & Autores)
              </h2>
              <p className="text-xs text-[#6E5641] mt-0.5">
                {currentCategoryObj.description}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSurpriseDiscovery}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2C1E16] hover:bg-[#4A3525] text-[#E2B86B] text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Descobrir Outros Livros</span>
            </button>
          </div>

          {/* Primary Genres Tabs */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
            {BOOK_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id && !showingSavedOnly;
              return (
                <button
                  key={cat.id}
                  onClick={() =>
                    handleCategorySelect(cat.id, cat.query, cat.label)
                  }
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                    isActive
                      ? "bg-[#2C1E16] text-[#FBF8F3] border-[#2C1E16] shadow-md"
                      : "bg-[#FBF8F3] text-[#4A3525] border-[#DFD2BE] hover:bg-[#E8DEC8]"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Sub-Topics / Authors Chips inside the selected Genre (Explore without typing!) */}
          <div className="pt-2 border-t border-[#E2D5C1] flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A6048] mr-1">
              Explorar nesta estante:
            </span>
            {currentCategoryObj.subQueries.map((sub) => {
              const isSubActive = activeSubTopic === sub;
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => {
                    setActiveSubTopic(sub);
                    performSearch(sub, `${currentCategoryObj.label} • ${sub}`);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all border cursor-pointer ${
                    isSubActive
                      ? "bg-[#8B5E34] text-white border-[#8B5E34] shadow-2xs"
                      : "bg-[#FBF8F3] text-[#5C4028] border-[#D5C4A8] hover:bg-[#E8DEC8]"
                  }`}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Title + Shelf Filter Input, Sort & Language Controls */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 mb-8 border-b border-[#E2D5C1]">
          <div>
            <h3 className="font-serif-title text-2xl sm:text-3xl font-bold text-[#2C1E16]">
              {showingSavedOnly ? "Minha Estante Pessoal" : searchLabel}
            </h3>
            <p className="text-sm text-[#6E5641] font-serif-body mt-0.5">
              {showingSavedOnly
                ? "Livros que você marcou para ler com calma."
                : "Clique em qualquer livro para abrir a ficha catalográfica, baixar o PDF completo ou ver resenhas."}
            </p>
          </div>

          {/* Interactive Shelf Controls: Local Filter Input + Sort Select + PT-BR Toggle */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Instant local filter input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#7A6048] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={shelfFilter}
                onChange={(e) => setShelfFilter(e.target.value)}
                placeholder="Filtrar livros na tela..."
                className="pl-8 pr-7 py-2 rounded-xl bg-[#F3EDE2] border border-[#D8C8B0] text-xs text-[#2C1E16] placeholder-[#8C735B] focus:outline-none focus:border-[#8B5E34] focus:bg-white w-44 sm:w-52"
              />
              {shelfFilter && (
                <button
                  type="button"
                  onClick={() => setShelfFilter("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8C735B] hover:text-[#2C1E16] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort selector */}
            <div className="flex items-center gap-1.5 bg-[#F3EDE2] px-3 py-2 rounded-xl border border-[#D8C8B0] text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#8B5E34]" />
              <span className="text-[#7A6048] font-medium">Ordenar:</span>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as "relevancia" | "nota" | "ano" | "titulo"
                  )
                }
                className="bg-transparent font-bold text-[#2C1E16] focus:outline-none cursor-pointer"
              >
                <option value="relevancia">Destaques</option>
                <option value="nota">Maior Nota</option>
                <option value="titulo">Ordem A-Z</option>
                <option value="ano">Mais Recentes</option>
              </select>
            </div>

            <div className="text-xs font-medium text-[#7A6048] bg-[#F3EDE2] px-3 py-2 rounded-xl border border-[#E2D5C1]">
              <strong>{displayedBooks.length}</strong> obras em Português
            </div>
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

          {/* Load More / Discover More Books Bar at Bottom of Shelf */}
          {!isLoading && !showingSavedOnly && displayedBooks.length > 0 && (
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              {hasMoreBooks && (
                <button
                  type="button"
                  onClick={handleLoadMoreBooks}
                  disabled={isLoadingMore}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2C1E16] hover:bg-[#4A3525] text-[#FBF8F3] text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-60"
                >
                  <PlusCircle className="w-4 h-4 text-[#C89D54]" />
                  <span>
                    {isLoadingMore
                      ? "Buscando mais obras no acervo..."
                      : "Carregar Mais Livros nesta Estante"}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSurpriseDiscovery}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#F3EDE2] hover:bg-[#E8DEC8] text-[#2C1E16] border border-[#D5C4A8] text-xs font-bold transition-all cursor-pointer"
              >
                <Shuffle className="w-4 h-4 text-[#8B5E34]" />
                <span>Explorar Outros Autores & Temas</span>
              </button>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full md:w-auto">
              <div className="p-3.5 rounded-xl bg-[#36251B] border border-[#5C4028] text-xs">
                <div className="flex items-center gap-1.5 text-[#3A5A40] bg-[#E8DEC8] px-2 py-0.5 rounded-full w-fit font-bold mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Fase 1
                </div>
                <p className="text-[#E6D7C3]">Catálogo & Edições</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#36251B] border border-[#5C4028] text-xs">
                <div className="flex items-center gap-1.5 text-[#3A5A40] bg-[#E8DEC8] px-2 py-0.5 rounded-full w-fit font-bold mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Fase 2
                </div>
                <p className="text-[#E6D7C3]">PDF Completo & Livrarias</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#36251B] border border-[#5C4028] text-xs">
                <div className="flex items-center gap-1.5 text-[#3A5A40] bg-[#E8DEC8] px-2 py-0.5 rounded-full w-fit font-bold mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Fase 3
                </div>
                <p className="text-[#E6D7C3]">Avaliações Multi-Lojas</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#36251B] border border-[#5C4028] text-xs">
                <div className="flex items-center gap-1.5 text-[#3A5A40] bg-[#E8DEC8] px-2 py-0.5 rounded-full w-fit font-bold mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Fase 4
                </div>
                <p className="text-[#E6D7C3]">Banco SQLite & Login</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#3E2A1E] border-2 border-[#C89D54] text-xs shadow-md">
                <div className="flex items-center gap-1.5 text-[#E2B86B] font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4" /> Fase 5 (Ativa)
                </div>
                <p className="text-[#FBF8F3]">Painel Admin & Alertas</p>
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

                      <div className="space-y-3 pt-1">
                        {/* Instant Full-Book PDF File Download Handler + Phase 5 Report/Admin Actions */}
                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            disabled={isDownloadingPdf}
                            onClick={() =>
                              handleDownloadPdf(
                                pdfInfo.directDownloadUrl,
                                activeEdition?.title || selectedBook.title
                              )
                            }
                            className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-75 ${
                              isDownloadingPdf
                                ? "bg-[#2C1E16] border border-[#C89D54]"
                                : "bg-[#3A5A40] hover:bg-[#2D4732]"
                            }`}
                          >
                            <Download
                              className={`w-4 h-4 ${
                                isDownloadingPdf
                                  ? "animate-bounce text-[#C89D54]"
                                  : ""
                              }`}
                            />
                            <span>
                              {isDownloadingPdf
                                ? "Verificando & Baixando Livro Completo em PDF..."
                                : "Baixar Livro Completo em .PDF Agora"}
                            </span>
                          </button>

                          <button
                            type="button"
                            disabled={isReportingPdfIssue}
                            onClick={() =>
                              handleReportPdfIssue(
                                activeEdition?.title || selectedBook.title,
                                (activeEdition?.authors || selectedBook.authors).join(", ")
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-3 rounded-xl bg-[#F3EDE2] hover:bg-[#E8DEC8] text-[#5C4028] border border-[#D5C4A8] text-xs font-semibold transition-all cursor-pointer disabled:opacity-60"
                            title="Notificar o Administrador caso este PDF apresente erro ou precise de manutenção"
                          >
                            <Flag className="w-3.5 h-3.5 text-[#8B3A2B]" />
                            <span>
                              {isReportingPdfIssue
                                ? "Notificando Admin..."
                                : "Reportar Problema no PDF"}
                            </span>
                          </button>

                          {currentUser?.role === "admin" && (
                            <button
                              type="button"
                              onClick={() => {
                                setAdminBookToFix({
                                  title: activeEdition?.title || selectedBook.title,
                                  author: (
                                    activeEdition?.authors || selectedBook.authors
                                  ).join(", ")
                                });
                                setIsAdminModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-3 rounded-xl bg-[#2C1E16] hover:bg-[#4A3525] text-[#E2B86B] border border-[#C89D54] text-xs font-bold transition-all cursor-pointer"
                              title="Ação Exclusiva Admin: Vincular ou enviar arquivo PDF corrigido para esta obra"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                              <span>Corrigir PDF (Admin)</span>
                            </button>
                          )}
                        </div>

                        {/* Interactive Notification for PDF Download Results (Phase 5 Null Return & Admin Alert) */}
                        {pdfNotice && (
                          <div
                            className={`p-4 rounded-2xl border text-xs leading-relaxed animate-in fade-in duration-200 ${
                              pdfNotice.type === "success"
                                ? "bg-[#3A5A40]/10 border-[#3A5A40] text-[#1D3122]"
                                : "bg-[#7A2E1E]/10 border-[#8B3A2B] text-[#541E15]"
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              {pdfNotice.type === "success" ? (
                                <CheckCircle2 className="w-4 h-4 text-[#3A5A40] shrink-0 mt-0.5" />
                              ) : (
                                <ShieldAlert className="w-4 h-4 text-[#8B3A2B] shrink-0 mt-0.5" />
                              )}
                              <div className="space-y-1">
                                <p className="font-bold">
                                  {pdfNotice.type === "success"
                                    ? "Download Realizado com Sucesso!"
                                    : "Alerta de Manutenção do PDF (Retorno Nulo • Admin Notificado)"}
                                </p>
                                <p>{pdfNotice.message}</p>
                                {pdfNotice.type === "unavailable" && (
                                  <p className="text-[11px] opacity-90 pt-1 font-semibold">
                                    O chamado já se encontra na fila do Painel do Administrador para reparo. Enquanto isso, você também pode consultar as livrarias parceiras abaixo.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
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

                    {/* 3. PHASE 3 & 4: READER REVIEWS & OPINIONS WALL (SQLite + Multi-Stores) */}
                    <BookReviewsSection
                      book={selectedBook}
                      currentUser={currentUser}
                    />
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Phase 4: Authentication Modal (Login & Reader Card Registration) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user, welcomeEmail: WelcomeEmailInfo | null | undefined) => {
          setCurrentUser(user);
          if (welcomeEmail?.sent) {
            setWelcomeEmailToast({
              name: user.name,
              email: user.email,
              previewUrl: welcomeEmail.previewUrl
            });
          }
          fetch("/api/shelf")
            .then((r) => r.json())
            .then((d) => {
              if (Array.isArray(d.savedIds) && d.savedIds.length > 0) {
                setSavedIds(d.savedIds);
              }
            })
            .catch(() => {});
        }}
      />

      {/* Phase 5: Admin Panel Modal (PDF Issues Queue, Custom PDFs, Review Moderation, Users) */}
      <AdminPanelModal
        isOpen={isAdminModalOpen}
        onClose={() => {
          setIsAdminModalOpen(false);
          setAdminBookToFix(null);
        }}
        onStatsUpdated={(pendingCount) => setPendingPdfIssuesCount(pendingCount)}
        initialBookToFix={adminBookToFix}
      />

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
            Construído passo a passo com Next.js Full-Stack + SQLite • Fase 5 Concluída (Sistema Completo)
          </p>
        </div>
      </footer>
    </div>
  );
}
