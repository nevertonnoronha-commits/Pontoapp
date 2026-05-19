"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Save, Loader2, Camera, Upload, CheckCircle2,
  ScanFace, KeyRound, Eye, EyeOff, AlertCircle,
} from "lucide-react";

const MODEL_URL = "/models";

interface FormData {
  name: string; email: string; job_title: string;
  salary: string; daily_hours: string; monthly_hours: string;
  compensation_type: string; lunch_break_minutes: string;
  admission_date: string; is_active: boolean;
}

const defaultForm: FormData = {
  name: "", email: "", job_title: "", salary: "1412",
  daily_hours: "8", monthly_hours: "176",
  compensation_type: "both", lunch_break_minutes: "60",
  admission_date: "", is_active: true,
};

export default function FuncionarioFormPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "novo";
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState<FormData>(defaultForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Senha
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Foto facial
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [faceStatus, setFaceStatus] = useState<"idle" | "training" | "ok" | "photo_only" | "error">("idle");

  function set(field: keyof FormData, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  useEffect(() => {
    if (isNew) return;
    async function load() {
      const { data: u } = await supabase.from("users")
        .select("*, employee_profiles(*), facial_profiles(*)")
        .eq("id", id).single();
      if (u) {
        const p = Array.isArray(u.employee_profiles) ? u.employee_profiles[0] : u.employee_profiles;
        const fp = Array.isArray(u.facial_profiles) ? u.facial_profiles[0] : u.facial_profiles;
        setForm({
          name: u.name, email: u.email, job_title: p?.job_title || "",
          salary: String(p?.salary || ""), daily_hours: String(p?.daily_hours || "8"),
          monthly_hours: String(p?.monthly_hours || "176"),
          compensation_type: p?.compensation_type || "both",
          lunch_break_minutes: String(p?.lunch_break_minutes || "60"),
          admission_date: p?.admission_date || "", is_active: u.is_active,
        });
        if (fp?.photo_url) {
          setExistingPhotoUrl(fp.photo_url);
          setPhotoPreview(fp.photo_url);
          setFaceStatus(fp.face_descriptor ? "ok" : "photo_only");
        }
      }
      setLoading(false);
    }
    load();
  }, [id, isNew]);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/funcionarios", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: isNew ? undefined : id,
          ...form,
          password: isNew ? password : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao salvar.");

      const userId = json.userId || id;

      // Upload de foto se houver
      if (photoFile && userId) {
        await uploadFacePhoto(userId, photoFile);
      }

      setSuccess(isNew ? "Funcionário criado com sucesso!" : "Dados atualizados!");
      setTimeout(() => router.push("/funcionarios"), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadFacePhoto(userId: string, file: File) {
    setFaceStatus("training");
    const fileName = `${userId}/profile-${Date.now()}.jpg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("face-photos")
      .upload(fileName, file, { contentType: file.type, upsert: true });

    if (uploadError || !uploadData) {
      setFaceStatus("error");
      setError("Erro ao enviar foto: " + (uploadError?.message || "bucket não encontrado"));
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("face-photos").getPublicUrl(uploadData.path);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: adminData } = await supabase.from("users").select("organization_id").eq("id", user!.id).single();

    try {
      const faceapi = await import("face-api.js");
      if (!faceapi.nets.tinyFaceDetector.isLoaded) {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);
      }
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise<void>((res) => { img.onload = () => res(); });
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 }))
        .withFaceLandmarks().withFaceDescriptor();

      await supabase.from("facial_profiles").upsert({
        user_id: userId,
        organization_id: adminData?.organization_id,
        face_descriptor: detection ? Array.from(detection.descriptor) : null,
        photo_url: publicUrl,
        trained_at: new Date().toISOString(),
        is_active: true,
      }, { onConflict: "user_id" });

      setFaceStatus(detection ? "ok" : "photo_only");
    } catch {
      await supabase.from("facial_profiles").upsert({
        user_id: userId,
        organization_id: adminData?.organization_id,
        face_descriptor: null,
        photo_url: publicUrl,
        trained_at: new Date().toISOString(),
        is_active: true,
      }, { onConflict: "user_id" });
      setFaceStatus("photo_only");
    }
  }

  async function handleResetPassword() {
    if (!newPassword || newPassword.length < 6) {
      setError("Nova senha precisa ter ao menos 6 caracteres.");
      return;
    }
    setResettingPassword(true);
    setError("");
    try {
      const res = await fetch("/api/funcionarios/reset-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: id, nova_senha: newPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao redefinir senha.");
      setNewPassword("");
      setSuccess("Senha redefinida com sucesso!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao redefinir senha.");
    } finally {
      setResettingPassword(false);
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setFaceStatus("idle");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto neon-glow-green" />
          <p className="text-sm text-slate-400">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/funcionarios")}
          className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {isNew ? "Novo Funcionário" : "Editar Funcionário"}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {isNew ? "Preencha os dados para criar o acesso" : "Atualize os dados do funcionário"}
          </p>
        </div>
      </div>

      {/* Dados pessoais */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-white">Dados Pessoais</h3>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Nome completo *</label>
          <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
            placeholder="João da Silva"
            className="w-full glass-input rounded-xl px-3 py-2.5 text-sm" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">E-mail *</label>
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
            disabled={!isNew}
            placeholder="joao@email.com"
            className="w-full glass-input rounded-xl px-3 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed" />
        </div>

        {isNew && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Senha de acesso *</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full glass-input rounded-xl px-3 py-2.5 pr-10 text-sm" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">O funcionário usará este e-mail e senha para fazer login</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Cargo</label>
          <input type="text" value={form.job_title} onChange={(e) => set("job_title", e.target.value)}
            placeholder="Vendedor, Atendente..."
            className="w-full glass-input rounded-xl px-3 py-2.5 text-sm" />
        </div>

        {!isNew && (
          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)}
              className="w-4 h-4 rounded accent-emerald-500 focus:ring-0 focus:ring-offset-0 bg-transparent border-white/20" />
            <span className="text-sm text-slate-200 font-medium">Conta ativa</span>
          </label>
        )}
      </div>

      {/* Jornada de trabalho */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-white">Jornada de Trabalho</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Salário (R$)", field: "salary" as const, type: "number" },
            { label: "Horas diárias", field: "daily_hours" as const, type: "number" },
            { label: "Horas mensais", field: "monthly_hours" as const, type: "number" },
            { label: "Almoço (min)", field: "lunch_break_minutes" as const, type: "number" },
          ].map(({ label, field, type }) => (
            <div key={field}>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">{label}</label>
              <input type={type} value={String(form[field])} onChange={(e) => set(field, e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2.5 text-sm" />
            </div>
          ))}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Compensação de horas</label>
          <select value={form.compensation_type} onChange={(e) => set("compensation_type", e.target.value)}
            className="w-full glass-input rounded-xl px-3 py-2.5 text-sm [&>option]:bg-[#0d162d] [&>option]:text-white">
            <option value="both">Banco + Pagamento</option>
            <option value="bank">Banco de Horas</option>
            <option value="payment">Pagamento</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Data de admissão</label>
          <input type="date" value={form.admission_date} onChange={(e) => set("admission_date", e.target.value)}
            className="w-full glass-input rounded-xl px-3 py-2.5 text-sm [color-scheme:dark]" />
        </div>
      </div>

      {/* Reconhecimento facial */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <ScanFace size={18} className="text-purple-400" />
            <h3 className="font-semibold text-white">Reconhecimento Facial</h3>
          </div>
          {faceStatus === "ok" && (
            <span className="flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2.5 py-1">
              <CheckCircle2 size={11} />Treinado
            </span>
          )}
          {faceStatus === "photo_only" && (
            <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2.5 py-1">
              Foto salva
            </span>
          )}
          {faceStatus === "training" && (
            <span className="flex items-center gap-1 text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full px-2.5 py-1">
              <Loader2 size={11} className="animate-spin text-purple-400" />Treinando...
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Envie uma foto frontal com boa iluminação. O sistema detecta o rosto e salva o perfil para verificação no ponto.
        </p>
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-xl border-2 border-dashed border-white/10 bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="Foto" className="w-full h-full object-cover" />
            ) : (
              <Camera size={28} className="text-slate-500" />
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="photo-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium text-slate-200 transition-all">
              <Upload size={15} />
              {photoPreview ? "Trocar foto" : "Enviar foto"}
            </label>
            <input id="photo-upload" type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhotoChange} />
            <p className="text-xs text-slate-500">JPG, PNG ou WebP · câmera frontal</p>
          </div>
        </div>
        {faceStatus === "photo_only" && (
          <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl px-4 py-3 text-xs text-amber-200 flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-400" />
            Rosto não detectado. Use foto frontal bem iluminada para ativar o reconhecimento.
          </div>
        )}
      </div>

      {/* Reset de senha (apenas edição) */}
      {!isNew && (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-amber-400" />
            <h3 className="font-semibold text-white">Redefinir Senha</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Use isso se o funcionário esqueceu a senha ou não consegue fazer login.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Nova senha</label>
            <div className="relative">
              <input type={showNewPassword ? "text" : "password"} value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full glass-input rounded-xl px-3 py-2.5 pr-10 text-sm" />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button onClick={handleResetPassword} disabled={resettingPassword || !newPassword}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold rounded-xl py-2.5 text-sm shadow-[0_0_15px_rgba(217,119,6,0.15)] hover:shadow-[0_0_20px_rgba(217,119,6,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {resettingPassword ? (
              <><Loader2 size={15} className="animate-spin" />Redefinindo...</>
            ) : (
              <><KeyRound size={15} />Redefinir Senha</>
            )}
          </button>
        </div>
      )}

      {/* Feedback */}
      {error && (
        <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-500/30 text-red-200 rounded-xl px-4 py-3 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" />{error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 rounded-xl px-4 py-3 text-sm">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />{success}
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex gap-3 pb-8">
        <button onClick={() => router.push("/funcionarios")}
          className="flex-1 border border-white/10 text-slate-300 hover:bg-white/5 rounded-xl py-3 text-sm font-medium transition-colors">
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving || (isNew && !password)}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:from-emerald-800 disabled:to-teal-800 text-white font-semibold rounded-xl py-3 text-sm shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? (
            <><Loader2 size={16} className="animate-spin" />Salvando...</>
          ) : (
            <><Save size={16} />{isNew ? "Criar Funcionário" : "Salvar Alterações"}</>
          )}
        </button>
      </div>
    </div>
  );
}
