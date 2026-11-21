"use client";

import React, { useState } from "react";
import {
  X,
  BookOpen,
  UserPlus,
  LogIn,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  KeyRound,
  Mail,
  User
} from "lucide-react";

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: "reader" | "admin";
  literaryTitle: string;
}

export interface WelcomeEmailInfo {
  sent: boolean;
  mode: "smtp" | "ethereal_smtp" | "local_outbox";
  previewUrl?: string | null;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: SessionUser, welcomeEmail?: WelcomeEmailInfo | null) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [literaryTitle, setLiteraryTitle] = useState(
    "Leitor de Clássicos & Poesia"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode,
          name,
          email,
          password,
          literaryTitle
        })
      });

      const data = await res.json();
      if (!res.ok || !data.user) {
        setErrorMsg(data.error || "Não foi possível autenticar.");
        return;
      }

      onSuccess(data.user, data.welcomeEmail || null);
      onClose();
    } catch {
      setErrorMsg("Erro de comunicação com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#1B120C]/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FBF8F3] border-2 border-[#C89D54] rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-[#2C1E16] text-[#FBF8F3] px-6 py-4 flex items-center justify-between border-b border-[#4A3525]">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#C89D54]">
            <BookOpen className="w-4 h-4" />
            <span>Carteira de Leitor • Biblioteca Clarice Assis</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-[#3E2A1E] text-[#E6D7C3] hover:bg-[#C89D54] hover:text-[#2C1E16] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switch Tabs */}
        <div className="grid grid-cols-2 bg-[#F3EDE2] p-1.5 m-6 mb-2 rounded-2xl border border-[#DFD2BE]">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === "login"
                ? "bg-[#2C1E16] text-[#E2B86B] shadow-xs"
                : "text-[#5C4028] hover:text-[#2C1E16]"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Entrar na Conta</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === "register"
                ? "bg-[#2C1E16] text-[#E2B86B] shadow-xs"
                : "text-[#5C4028] hover:text-[#2C1E16]"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Criar Carteira de Leitor</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 pt-3 space-y-4">
          <div className="text-center space-y-1">
            <h3 className="font-serif-title text-xl font-bold text-[#2C1E16]">
              {mode === "login"
                ? "Bem-vindo de volta ao Gabinete"
                : "Emita sua Carteira de Leitor"}
            </h3>
            <p className="text-xs text-[#6E5641]">
              {mode === "login"
                ? "Acesse sua estante pessoal e suas resenhas salvas no banco SQLite."
                : "Sincronize seus livros favoritos e publique resenhas verificadas."}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-900/10 border border-red-800/30 text-red-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === "register" && (
            <>
              <div>
                <label className="block text-xs font-bold text-[#4A3525] mb-1">
                  Seu Nome Completo *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#7A6048] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Matheus Putrique"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#F3EDE2] border border-[#DFD2BE] text-xs text-[#2C1E16] placeholder-[#8C735B] focus:outline-none focus:border-[#8B5E34] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3525] mb-1">
                  Título / Perfil Literário
                </label>
                <input
                  type="text"
                  value={literaryTitle}
                  onChange={(e) => setLiteraryTitle(e.target.value)}
                  placeholder="Ex: Apaixonado por Literatura Brasileira"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F3EDE2] border border-[#DFD2BE] text-xs text-[#2C1E16] placeholder-[#8C735B] focus:outline-none focus:border-[#8B5E34] focus:bg-white"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-[#4A3525] mb-1">
              E-mail *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#7A6048] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#F3EDE2] border border-[#DFD2BE] text-xs text-[#2C1E16] placeholder-[#8C735B] focus:outline-none focus:border-[#8B5E34] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A3525] mb-1">
              Senha *
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#7A6048] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#F3EDE2] border border-[#DFD2BE] text-xs text-[#2C1E16] placeholder-[#8C735B] focus:outline-none focus:border-[#8B5E34] focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-[#3A5A40] hover:bg-[#2D4732] text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isLoading
                ? "Autenticando com Criptografia..."
                : mode === "login"
                ? "Acessar Biblioteca"
                : "Criar Conta & Sincronizar Estante"}
            </span>
          </button>

          {/* Security Footer Note */}
          <div className="pt-2 border-t border-[#E2D5C1] flex items-center justify-between text-[11px] text-[#7A6048]">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#3A5A40]" />
              Criptografia PBKDF2-SHA512 • Sessão Segura
            </span>
            <span>Biblioteca Clarice Assis</span>
          </div>
        </form>
      </div>
    </div>
  );
}
