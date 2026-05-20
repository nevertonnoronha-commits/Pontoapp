"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/shared/logo";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError("E-mail ou senha inválidos. Verifique seus dados.");
      setLoading(false);
      return;
    }
    const { data: userData } = await supabase.from("users").select("role").single();
    const role = userData?.role || "employee";
    router.push(role === "admin" || role === "super_admin" ? "/dashboard" : "/ponto");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#07080A] relative overflow-hidden">
      {/* Aurora */}
      <div className="aurora-bg">
        <div className="aurora-glow-1" />
        <div className="aurora-glow-2" />
        <div className="aurora-glow-3" />
      </div>

      <div className="w-full max-w-sm z-10">
        {/* Card */}
        <div className="glass-card rounded-3xl border border-white/[0.08] overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.5)]">

          {/* Top gold line */}
          <div className="h-[3px] w-full bg-gradient-to-r from-yellow-500 via-yellow-400 to-amber-300" />

          <div className="px-8 pt-8 pb-10 space-y-7">
            {/* Logo + heading */}
            <div className="flex flex-col items-center gap-4">
              <Logo size="sm" />
              <div className="text-center">
                <h1 className="text-xl font-bold text-white tracking-tight">Entrar na sua conta</h1>
                <p className="text-sm text-slate-400 mt-1">Use suas credenciais de acesso</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  autoComplete="email"
                  className="w-full glass-input rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-yellow-500/40 focus:ring-1 focus:ring-yellow-500/20 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full glass-input rounded-xl px-4 py-3 pr-11 text-sm text-slate-200 placeholder:text-slate-600 focus:border-yellow-500/40 focus:ring-1 focus:ring-yellow-500/20 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold rounded-xl py-3 text-sm transition-all duration-200 shadow-[0_4px_20px_rgba(234,179,8,0.2)] hover:shadow-[0_4px_25px_rgba(234,179,8,0.35)] flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <><Loader2 size={17} className="animate-spin" />Entrando...</>
                ) : (
                  "Entrar"
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          © {new Date().getFullYear()} Camaleão · Controle de Ponto
        </p>
      </div>
    </div>
  );
}
