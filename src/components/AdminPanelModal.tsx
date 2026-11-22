"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  ShieldAlert,
  CheckCircle2,
  FileWarning,
  Upload,
  Link as LinkIcon,
  Trash2,
  Users,
  MessageSquareQuote,
  FileText,
  RefreshCw,
  Wrench,
  Sparkles,
  ExternalLink,
  UserCheck,
  AlertTriangle,
  PlusCircle
} from "lucide-react";

interface PdfIssueItem {
  id: number;
  book_title: string;
  book_author: string;
  error_details: string;
  reported_by: string;
  status: "pending" | "resolved";
  resolved_pdf_url?: string | null;
  resolved_at?: string | null;
  created_at: string;
}

interface CustomPdfItem {
  id: number;
  book_key: string;
  book_title: string;
  book_author: string;
  pdf_url: string;
  updated_by: string;
  updated_at: string;
}

interface SiteReviewItem {
  id: string;
  book_key: string;
  book_title: string;
  reader_name: string;
  reader_role: string;
  rating: number;
  vibe_tag: string;
  title: string;
  comment: string;
  created_at: string;
}

interface UserAccountItem {
  id: number;
  name: string;
  email: string;
  role: "reader" | "admin";
  literary_title: string;
  created_at: string;
}

interface AdminStats {
  totalUsers: number;
  pendingIssues: number;
  resolvedIssues: number;
  totalCustomPdfs: number;
  totalSiteReviews: number;
  totalSavedBooks: number;
}

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatsUpdated?: (pendingCount: number) => void;
  initialBookToFix?: { title: string; author: string } | null;
}

export default function AdminPanelModal({
  isOpen,
  onClose,
  onStatsUpdated,
  initialBookToFix
}: AdminPanelModalProps) {
  const [activeTab, setActiveTab] = useState<
    "pdf_issues" | "custom_pdfs" | "reviews" | "users"
  >("pdf_issues");
  const [isLoading, setIsLoading] = useState(false);
  const [issues, setIssues] = useState<PdfIssueItem[]>([]);
  const [customPdfs, setCustomPdfs] = useState<CustomPdfItem[]>([]);
  const [reviews, setReviews] = useState<SiteReviewItem[]>([]);
  const [users, setUsers] = useState<UserAccountItem[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    pendingIssues: 0,
    resolvedIssues: 0,
    totalCustomPdfs: 0,
    totalSiteReviews: 0,
    totalSavedBooks: 0
  });

  // Form state for fixing an issue or registering a custom PDF
  const [fixingIssueId, setFixingIssueId] = useState<number | null>(null);
  const [fixTitle, setFixTitle] = useState("");
  const [fixAuthor, setFixAuthor] = useState("");
  const [fixPdfUrl, setFixPdfUrl] = useState("");
  const [fixPdfBase64, setFixPdfBase64] = useState("");
  const [fixFileName, setFixFileName] = useState("");
  const [isSavingFix, setIsSavingFix] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchAdminData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin");
      if (!res.ok) return;
      const data = await res.json();
      setIssues(Array.isArray(data.issues) ? data.issues : []);
      setCustomPdfs(Array.isArray(data.customPdfs) ? data.customPdfs : []);
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      setUsers(Array.isArray(data.users) ? data.users : []);
      if (data.stats) {
        setStats(data.stats);
        onStatsUpdated?.(data.stats.pendingIssues || 0);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [onStatsUpdated]);

  useEffect(() => {
    if (isOpen) {
      fetchAdminData();
    }
  }, [isOpen, fetchAdminData]);

  useEffect(() => {
    if (isOpen && initialBookToFix) {
      setActiveTab("pdf_issues");
      setFixingIssueId(-1);
      setFixTitle(initialBookToFix.title);
      setFixAuthor(initialBookToFix.author);
      setFixPdfUrl("");
      setFixPdfBase64("");
      setFixFileName("");
    }
  }, [isOpen, initialBookToFix]);

  if (!isOpen) return null;

  const handleOpenFixForm = (issue: PdfIssueItem) => {
    setFixingIssueId(issue.id);
    setFixTitle(issue.book_title);
    setFixAuthor(issue.book_author);
    setFixPdfUrl(
      issue.resolved_pdf_url && !issue.resolved_pdf_url.startsWith("local://")
        ? issue.resolved_pdf_url
        : ""
    );
    setFixPdfBase64("");
    setFixFileName("");
    setFeedback(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setFeedback({
        type: "error",
        text: "Selecione apenas arquivos com extensão .PDF."
      });
      return;
    }

    setFixFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFixPdfBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPdfFix = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsSavingFix(true);

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "fix_pdf_issue",
          issueId: fixingIssueId && fixingIssueId > 0 ? fixingIssueId : null,
          bookTitle: fixTitle,
          bookAuthor: fixAuthor,
          pdfUrl: fixPdfUrl,
          pdfBase64: fixPdfBase64
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: data.error || "Não foi possível salvar a correção do PDF."
        });
        return;
      }

      setFeedback({
        type: "success",
        text: data.message || "PDF corrigido e vinculado com sucesso!"
      });
      setFixingIssueId(null);
      setFixTitle("");
      setFixAuthor("");
      setFixPdfUrl("");
      setFixPdfBase64("");
      setFixFileName("");
      await fetchAdminData();
    } catch {
      setFeedback({
        type: "error",
        text: "Erro de comunicação ao salvar correção do PDF."
      });
    } finally {
      setIsSavingFix(false);
    }
  };

  const handleUpdateIssueStatus = async (
    issueId: number,
    status: "pending" | "resolved"
  ) => {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_issue_status",
        issueId,
        status
      })
    });
    fetchAdminData();
  };

  const handleDeleteIssue = async (issueId: number) => {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete_issue",
        issueId
      })
    });
    fetchAdminData();
  };

  const handleDeleteCustomPdf = async (id: number) => {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete_custom_pdf",
        id
      })
    });
    fetchAdminData();
  };

  const handleDeleteReview = async (reviewId: string) => {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete_review",
        reviewId
      })
    });
    fetchAdminData();
  };

  const handleToggleUserRole = async (userId: number) => {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggle_user_role",
        userId
      })
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({
        type: "error",
        text: data.error || "Não foi possível alterar o perfil."
      });
    } else {
      fetchAdminData();
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#1B120C]/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FBF8F3] border-2 border-[#C89D54] rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Top Bar */}
        <div className="bg-[#2C1E16] text-[#FBF8F3] px-6 py-4 flex items-center justify-between border-b border-[#4A3525]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C89D54]/20 border border-[#C89D54] flex items-center justify-center text-[#E2B86B]">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-widest text-[#C89D54] font-bold">
                  Curadoria &amp; Manutenção do Acervo
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#3A5A40] text-white text-[10px] font-bold">
                  MODO ADMIN ATIVO
                </span>
              </div>
              <h2 className="font-serif-title text-xl font-bold text-[#FBF8F3]">
                Painel do Bibliotecário Chefe (Admin)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAdminData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#3E2A1E] hover:bg-[#523828] text-[#E6D7C3] text-xs font-semibold transition-colors cursor-pointer"
              title="Atualizar dados do banco SQLite"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
              <span>Atualizar</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-[#3E2A1E] text-[#E6D7C3] hover:bg-[#C89D54] hover:text-[#2C1E16] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#F3EDE2] border-b border-[#DFD2BE]">
          <div className="p-3 rounded-2xl bg-[#FBF8F3] border border-[#DFD2BE] flex items-center justify-between">
            <div>
              <p className="text-[11px] text-[#7A6048] font-semibold">
                Alertas de PDF Pendentes
              </p>
              <p className="font-serif-title text-2xl font-bold text-[#8B3A2B]">
                {stats.pendingIssues}
              </p>
            </div>
            <FileWarning className="w-7 h-7 text-[#8B3A2B]/80" />
          </div>

          <div className="p-3 rounded-2xl bg-[#FBF8F3] border border-[#DFD2BE] flex items-center justify-between">
            <div>
              <p className="text-[11px] text-[#7A6048] font-semibold">
                PDFs Corrigidos / Vinculados
              </p>
              <p className="font-serif-title text-2xl font-bold text-[#3A5A40]">
                {stats.totalCustomPdfs}
              </p>
            </div>
            <CheckCircle2 className="w-7 h-7 text-[#3A5A40]/80" />
          </div>

          <div className="p-3 rounded-2xl bg-[#FBF8F3] border border-[#DFD2BE] flex items-center justify-between">
            <div>
              <p className="text-[11px] text-[#7A6048] font-semibold">
                Resenhas no Site (SQLite)
              </p>
              <p className="font-serif-title text-2xl font-bold text-[#2C1E16]">
                {stats.totalSiteReviews}
              </p>
            </div>
            <MessageSquareQuote className="w-7 h-7 text-[#8B5E34]/80" />
          </div>

          <div className="p-3 rounded-2xl bg-[#FBF8F3] border border-[#DFD2BE] flex items-center justify-between">
            <div>
              <p className="text-[11px] text-[#7A6048] font-semibold">
                Contas de Leitores
              </p>
              <p className="font-serif-title text-2xl font-bold text-[#2C1E16]">
                {stats.totalUsers}
              </p>
            </div>
            <Users className="w-7 h-7 text-[#8B5E34]/80" />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 pt-3 pb-2 bg-[#F7F2E7] border-b border-[#DFD2BE]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("pdf_issues")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "pdf_issues"
                  ? "bg-[#2C1E16] text-[#E2B86B] shadow-xs"
                  : "bg-[#EAE0CE] text-[#5C4028] hover:bg-[#DFD2BE]"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Chamados de Erro em PDF ({issues.length})</span>
              {stats.pendingIssues > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#8B3A2B] text-white text-[10px]">
                  {stats.pendingIssues}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("custom_pdfs")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "custom_pdfs"
                  ? "bg-[#2C1E16] text-[#E2B86B] shadow-xs"
                  : "bg-[#EAE0CE] text-[#5C4028] hover:bg-[#DFD2BE]"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDFs Vinculados pelo Admin ({customPdfs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("reviews")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "reviews"
                  ? "bg-[#2C1E16] text-[#E2B86B] shadow-xs"
                  : "bg-[#EAE0CE] text-[#5C4028] hover:bg-[#DFD2BE]"
              }`}
            >
              <MessageSquareQuote className="w-3.5 h-3.5" />
              <span>Moderação de Avaliações ({reviews.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "users"
                  ? "bg-[#2C1E16] text-[#E2B86B] shadow-xs"
                  : "bg-[#EAE0CE] text-[#5C4028] hover:bg-[#DFD2BE]"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Usuários & Permissões ({users.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveTab("pdf_issues");
              setFixingIssueId(-1);
              setFixTitle("");
              setFixAuthor("");
              setFixPdfUrl("");
              setFixPdfBase64("");
              setFixFileName("");
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3A5A40] hover:bg-[#2D4732] text-white text-xs font-bold cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Vincular Novo PDF ao Acervo</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {feedback && (
            <div
              className={`p-3.5 rounded-2xl border text-xs font-medium flex items-center justify-between ${
                feedback.type === "success"
                  ? "bg-[#3A5A40]/10 border-[#3A5A40] text-[#1D3122]"
                  : "bg-[#8B3A2B]/10 border-[#8B3A2B] text-[#541E15]"
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-[#3A5A40] shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[#8B3A2B] shrink-0" />
                )}
                <span>{feedback.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-xs underline ml-3 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          )}

          {/* Active PDF Fix / Upload Form */}
          {fixingIssueId !== null && (
            <form
              onSubmit={handleSubmitPdfFix}
              className="p-5 rounded-2xl bg-[#F3EDE2] border-2 border-[#C89D54] shadow-md space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#DFD2BE] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#8B5E34]" />
                  <h4 className="font-serif-title text-base font-bold text-[#2C1E16]">
                    {fixingIssueId > 0
                      ? `Resolver Chamado #${fixingIssueId} • Reparar PDF da Obra`
                      : "Vincular ou Enviar Arquivo PDF Oficial para uma Obra"}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setFixingIssueId(null)}
                  className="text-xs text-[#7A6048] hover:text-[#2C1E16] font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#4A3525] mb-1">
                    Título do Livro *
                  </label>
                  <input
                    type="text"
                    required
                    value={fixTitle}
                    onChange={(e) => setFixTitle(e.target.value)}
                    placeholder="Ex: Grande Sertão: Veredas"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#DFD2BE] text-xs text-[#2C1E16] focus:outline-none focus:border-[#8B5E34]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4A3525] mb-1">
                    Autor(a)
                  </label>
                  <input
                    type="text"
                    value={fixAuthor}
                    onChange={(e) => setFixAuthor(e.target.value)}
                    placeholder="Ex: Guimarães Rosa"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#DFD2BE] text-xs text-[#2C1E16] focus:outline-none focus:border-[#8B5E34]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#4A3525] mb-1">
                    Opção 1: URL Direta do Arquivo .PDF (https://...)
                  </label>
                  <div className="relative">
                    <LinkIcon className="w-4 h-4 text-[#7A6048] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={fixPdfUrl}
                      onChange={(e) => setFixPdfUrl(e.target.value)}
                      placeholder="https://archive.org/download/.../livro.pdf"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-[#DFD2BE] text-xs text-[#2C1E16] focus:outline-none focus:border-[#8B5E34]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A3525] mb-1">
                    Opção 2: Enviar Arquivo .PDF do seu Computador
                  </label>
                  <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-dashed border-[#8B5E34] text-xs font-semibold text-[#5C4028] hover:bg-[#FBF8F3] cursor-pointer">
                    <Upload className="w-4 h-4 text-[#8B5E34]" />
                    <span className="truncate">
                      {fixFileName
                        ? `Arquivo pronto: ${fixFileName}`
                        : "Escolher arquivo .PDF local"}
                    </span>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFixingIssueId(null)}
                  className="px-4 py-2 rounded-xl bg-[#EAE0CE] text-[#4A3525] text-xs font-semibold cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={isSavingFix}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3A5A40] hover:bg-[#2D4732] text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSavingFix
                      ? "Salvando no Banco SQLite..."
                      : "Salvar Correção & Ativar Download"}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 1: PDF ISSUES QUEUE */}
          {activeTab === "pdf_issues" && (
            <div className="space-y-3">
              {issues.length === 0 ? (
                <div className="p-10 rounded-2xl bg-[#F3EDE2] border border-[#DFD2BE] text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-[#3A5A40] mx-auto" />
                  <h4 className="font-serif-title text-base font-bold text-[#2C1E16]">
                    Nenhum chamado de erro em PDF no momento!
                  </h4>
                  <p className="text-xs text-[#6E5641] max-w-md mx-auto">
                    Sempre que um usuário tentar baixar um PDF indisponível ou clicar em &ldquo;Reportar problema no PDF&rdquo;, o alerta aparecerá instantaneamente nesta fila para sua correção.
                  </p>
                </div>
              ) : (
                issues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      issue.status === "pending"
                        ? "bg-[#FFF9F5] border-[#D98A6C]"
                        : "bg-[#F3EDE2]/70 border-[#DFD2BE]"
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            issue.status === "pending"
                              ? "bg-[#8B3A2B] text-white"
                              : "bg-[#3A5A40] text-white"
                          }`}
                        >
                          {issue.status === "pending"
                            ? `Chamado Pendente #${issue.id}`
                            : `Corrigido #${issue.id}`}
                        </span>
                        <h5 className="font-serif-title text-base font-bold text-[#2C1E16]">
                          {issue.book_title}
                        </h5>
                        <span className="text-xs text-[#7A6048]">
                          • {issue.book_author}
                        </span>
                      </div>

                      <p className="text-xs text-[#4A3525] leading-relaxed">
                        {issue.error_details}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#7A6048]">
                        <span>
                          Notificado por: <strong>{issue.reported_by}</strong>
                        </span>
                        <span>• Data: {issue.created_at}</span>
                        {issue.resolved_at && (
                          <span className="text-[#3A5A40] font-semibold">
                            • Resolvido em: {issue.resolved_at}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenFixForm(issue)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2C1E16] hover:bg-[#4A3525] text-[#E2B86B] text-xs font-bold cursor-pointer"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Corrigir PDF</span>
                      </button>

                      {issue.status === "pending" ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateIssueStatus(issue.id, "resolved")
                          }
                          className="px-3 py-2 rounded-xl bg-[#3A5A40] hover:bg-[#2D4732] text-white text-xs font-semibold cursor-pointer"
                        >
                          Marcar Resolvido
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateIssueStatus(issue.id, "pending")
                          }
                          className="px-3 py-2 rounded-xl bg-[#EAE0CE] hover:bg-[#DFD2BE] text-[#5C4028] text-xs font-semibold cursor-pointer"
                        >
                          Reabrir
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteIssue(issue.id)}
                        className="p-2 rounded-xl bg-red-900/10 hover:bg-red-900/20 text-red-900 transition-colors cursor-pointer"
                        title="Excluir chamado"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: CUSTOM PDFS OVERRIDES */}
          {activeTab === "custom_pdfs" && (
            <div className="space-y-3">
              {customPdfs.length === 0 ? (
                <div className="p-10 rounded-2xl bg-[#F3EDE2] border border-[#DFD2BE] text-center space-y-2">
                  <FileText className="w-8 h-8 text-[#8B5E34] mx-auto" />
                  <h4 className="font-serif-title text-base font-bold text-[#2C1E16]">
                    Nenhum PDF customizado cadastrado ainda
                  </h4>
                  <p className="text-xs text-[#6E5641] max-w-md mx-auto">
                    Use o botão &ldquo;Vincular Novo PDF ao Acervo&rdquo; acima ou clique em &ldquo;Corrigir PDF&rdquo; em qualquer chamado para definir um link ou arquivo PDF próprio para uma obra.
                  </p>
                </div>
              ) : (
                customPdfs.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-[#F3EDE2] border border-[#DFD2BE] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#3A5A40] text-white text-[10px] font-bold">
                          ATIVO NO ACERVO
                        </span>
                        <h5 className="font-serif-title text-base font-bold text-[#2C1E16]">
                          {item.book_title}
                        </h5>
                        <span className="text-xs text-[#7A6048]">
                          ({item.book_author})
                        </span>
                      </div>
                      <p className="text-xs text-[#5C4028] break-all">
                        Origem:{" "}
                        <strong>
                          {item.pdf_url.startsWith("local://")
                            ? `Arquivo Local no Servidor (${item.pdf_url.replace(
                                "local://",
                                ""
                              )})`
                            : item.pdf_url}
                        </strong>
                      </p>
                      <p className="text-[11px] text-[#7A6048]">
                        Atualizado por {item.updated_by} em {item.updated_at}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`/api/pdf?title=${encodeURIComponent(
                          item.book_title
                        )}&author=${encodeURIComponent(item.book_author)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2C1E16] text-[#E2B86B] text-xs font-bold"
                      >
                        <span>Testar PDF</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomPdf(item.id)}
                        className="p-2 rounded-xl bg-red-900/10 hover:bg-red-900/20 text-red-900 cursor-pointer"
                        title="Remover vínculo de PDF"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: REVIEWS MODERATION */}
          {activeTab === "reviews" && (
            <div className="space-y-3">
              {reviews.length === 0 ? (
                <div className="p-10 rounded-2xl bg-[#F3EDE2] border border-[#DFD2BE] text-center space-y-2">
                  <MessageSquareQuote className="w-8 h-8 text-[#8B5E34] mx-auto" />
                  <h4 className="font-serif-title text-base font-bold text-[#2C1E16]">
                    Nenhuma avaliação publicada diretamente no site ainda
                  </h4>
                  <p className="text-xs text-[#6E5641] max-w-md mx-auto">
                    As avaliações publicadas pelos leitores aqui na Biblioteca Clarice Assis ficam armazenadas no SQLite e podem ser moderadas nesta aba.
                  </p>
                </div>
              ) : (
                reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl bg-[#F3EDE2] border border-[#DFD2BE] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-[#2C1E16] text-[#E2B86B] text-[10px] font-bold">
                          Livro: {rev.book_title}
                        </span>
                        <span className="text-xs font-bold text-[#2C1E16]">
                          {rev.reader_name}
                        </span>
                        <span className="text-[11px] text-[#7A6048]">
                          ({rev.reader_role}) • ★ {rev.rating}/5 •{" "}
                          {rev.created_at}
                        </span>
                      </div>
                      <p className="font-serif-title text-sm font-bold text-[#2C1E16]">
                        &ldquo;{rev.title}&rdquo;
                      </p>
                      <p className="text-xs text-[#4A3525] leading-relaxed">
                        {rev.comment}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteReview(rev.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-900/15 hover:bg-red-900/25 text-red-900 text-xs font-bold shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: USERS & ROLES */}
          {activeTab === "users" && (
            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-4 rounded-2xl bg-[#F3EDE2] border border-[#DFD2BE] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.role === "admin"
                            ? "bg-[#2C1E16] text-[#E2B86B]"
                            : "bg-[#3A5A40] text-white"
                        }`}
                      >
                        {u.role === "admin"
                          ? "Bibliotecário Admin"
                          : "Leitor (Usuário)"}
                      </span>
                      <h5 className="font-bold text-sm text-[#2C1E16]">
                        {u.name}
                      </h5>
                    </div>
                    <p className="text-xs text-[#5C4028]">
                      E-mail: <strong>{u.email}</strong> • Título:{" "}
                      {u.literary_title}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleUserRole(u.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2C1E16] hover:bg-[#4A3525] text-[#E2B86B] text-xs font-bold cursor-pointer shrink-0"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>
                      {u.role === "admin"
                        ? "Tornar Leitor Comum"
                        : "Promover a Admin"}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
