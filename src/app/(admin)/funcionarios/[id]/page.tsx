"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
  const [form, setForm] = useState<FormData>(defaultForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    if (isNew) return;
    async function load() {
      const { data: u } = await supabase.from("users").select("*, employee_profiles(*)").eq("id", id).single();
      if (u) {
        const p = Array.isArray(u.employee_profiles) ? u.employee_profiles[0] : u.employee_profiles;
        setForm({
          name: u.name, email: u.email, job_title: p?.job_title || "",
          salary: String(p?.salary || ""), daily_hours: String(p?.daily_hours || "8"),
          monthly_hours: String(p?.monthly_hours || "176"),
          compensation_type: p?.compensation_type || "both",
          lunch_break_minutes: String(p?.lunch_break_minutes || "60"),
          admission_date: p?.admission_date || "", is_active: u.is_active,
        });
      }
      setLoading(false);
    }
    load();
  }, [id, isNew]);

  function set(field: keyof FormData, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/funcionarios", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: isNew ? undefined : id, ...form }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao salvar.");
      router.push("/funcionarios");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/funcionarios")} className="text-gray-500 hover:text-gray-800">← Voltar</button>
        <h1 className="text-2xl font-bold text-gray-800">{isNew ? "Novo Funcionário" : "Editar Funcionário"}</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {[
          { label: "Nome completo *", field: "name" as const, type: "text" },
          { label: "E-mail *", field: "email" as const, type: "email" },
          { label: "Cargo", field: "job_title" as const, type: "text" },
          { label: "Salário mensal (R$) *", field: "salary" as const, type: "number" },
          { label: "Horas diárias *", field: "daily_hours" as const, type: "number" },
          { label: "Horas mensais *", field: "monthly_hours" as const, type: "number" },
          { label: "Intervalo almoço (min)", field: "lunch_break_minutes" as const, type: "number" },
          { label: "Data admissão", field: "admission_date" as const, type: "date" },
        ].map(({ label, field, type }) => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
              type={type}
              value={String(form[field])}
              onChange={(e) => set(field, e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de compensação</label>
          <select value={form.compensation_type} onChange={(e) => set("compensation_type", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="bank">Banco de horas</option>
            <option value="payment">Pagamento de horas extras</option>
            <option value="both">Ambos</option>
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="w-4 h-4 accent-green-600" />
          <span className="text-sm font-medium text-gray-700">Funcionário ativo</span>
        </label>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

        <button onClick={handleSave} disabled={saving}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg py-3 text-sm transition-colors">
          {saving ? "Salvando..." : "Salvar Funcionário"}
        </button>
      </div>
    </div>
  );
}
