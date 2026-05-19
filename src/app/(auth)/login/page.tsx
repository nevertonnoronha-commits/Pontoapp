"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/shared/logo";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError("E-mail ou senha inválidos. Verifique seus dados e tente novamente.");
      setLoading(false);
      return;
    }
    const { data: userData } = await supabase.from("users").select("role").single();
    const role = userData?.role || "employee";
    router.push(role === "admin" || role === "super_admin" ? "/dashboard" : "/ponto");
    router.refresh();
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 py-12 overflow-hidden bg-[#070a13]">
      {/* Background Aurora Elements */}
      <div className="aurora-bg">
        <div className="aurora-glow-1"></div>
        <div className="aurora-glow-2"></div>
        <div className="aurora-glow-3"></div>
      </div>

      <div className="w-full max-w-md z-10 space-y-8">
        {/* Logo and title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-4 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)] mb-2 backdrop-blur-md transform transition-all duration-300 hover:scale-105">
            <Logo size="lg" showText={false} variant="light" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-emerald-400">
            PontoApp
          </h1>
          <p className="text-slate-400 text-sm font-medium tracking-wide">
            Controle de ponto inteligente e seguro
          </p>
        </div>

        {/* Form card */}
        <div className="glass-card rounded-3xl p-8 md:p-10 relative overflow-hidden transition-all duration-300 hover:border-emerald-500/30">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500"></div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white tracking-tight">Acesse sua conta</h2>
            <p className="text-slate-400 text-sm mt-1">Insira suas credenciais abaixo</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                E-mail
              </label>
              <input
                id="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                autoComplete="email"
                className="w-full glass-input rounded-2xl px-4 py-3.5 text-sm bg-white/[0.03] border border-white/[0.08] focus:bg-white/[0.06] focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/15 focus:outline-none transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full glass-input rounded-2xl px-4 py-3.5 pr-12 text-sm bg-white/[0.03] border border-white/[0.08] focus:bg-white/[0.06] focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/15 focus:outline-none transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-200 rounded-2xl p-4 text-sm animate-shake">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:from-emerald-800 disabled:to-teal-900 disabled:opacity-50 text-white font-bold rounded-2xl py-3.5 text-sm transition-all duration-300 shadow-[0_4px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Entrando na conta...</span>
                </>
              ) : (
                <span>Entrar</span>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 tracking-wider">
          © {new Date().getFullYear()} PontoApp · Controle de Ponto Premium
        </p>
      </div>
    </div>
  );
}
