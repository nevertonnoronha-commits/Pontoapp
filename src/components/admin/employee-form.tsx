"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Camera, Upload, Loader2, CheckCircle2 } from "lucide-react";
import type { UserWithProfile } from "@/types";

interface EmployeeFormProps {
  employee?: UserWithProfile | null;
  organizationId: string;
  onSuccess?: () => void;
}

export function EmployeeForm({
  employee,
  organizationId,
  onSuccess,
}: EmployeeFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const isEditing = !!employee;

  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    employee?.facial_profile?.photo_url || null
  );
  const initialFaceStatus = employee?.facial_profile?.face_descriptor ? "ok" as const
    : employee?.facial_profile?.photo_url ? "photo_only" as const
    : "idle" as const;
  const [faceTrainStatus, setFaceTrainStatus] = useState<"idle" | "training" | "ok" | "photo_only" | "error">(initialFaceStatus);

  const [formData, setFormData] = useState({
    name: employee?.name || "",
    email: employee?.email || "",
    password: "",
    job_title: employee?.employee_profile?.job_title || "",
    salary: String(employee?.employee_profile?.salary || "0"),
    daily_hours: String(employee?.employee_profile?.daily_hours || "8"),
    monthly_hours: String(employee?.employee_profile?.monthly_hours || "176"),
    compensation_type: employee?.employee_profile?.compensation_type || "both",
    lunch_break_minutes: String(
      employee?.employee_profile?.lunch_break_minutes || "60"
    ),
    admission_date: employee?.employee_profile?.admission_date || "",
    is_active: employee?.is_active ?? true,
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(
        isEditing
          ? `/api/funcionarios?id=${employee.id}`
          : "/api/funcionarios",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            organization_id: organizationId,
            salary: parseFloat(formData.salary),
            daily_hours: parseFloat(formData.daily_hours),
            monthly_hours: parseFloat(formData.monthly_hours),
            lunch_break_minutes: parseInt(formData.lunch_break_minutes),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao salvar funcionário");
      }

      // Upload facial photo if provided
      if (photoFile && (result.userId || employee?.id)) {
        const userId = result.userId || employee?.id;
        const fileName = `${userId}/profile-${Date.now()}.jpg`;
        setFaceTrainStatus("training");

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("face-photos")
          .upload(fileName, photoFile, { contentType: photoFile.type, upsert: true });

        if (!uploadError && uploadData) {
          const { data: { publicUrl } } = supabase.storage.from("face-photos").getPublicUrl(uploadData.path);

          try {
            const faceapi = await import("face-api.js");
            if (!faceapi.nets.tinyFaceDetector.isLoaded) {
              await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
                faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
                faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
              ]);
            }
            const img = document.createElement("img");
            img.src = URL.createObjectURL(photoFile);
            await new Promise<void>((res) => { img.onload = () => res(); });

            const detection = await faceapi
              .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.1, inputSize: 512 }))
              .withFaceLandmarks()
              .withFaceDescriptor();

            const descriptor = detection ? Array.from(detection.descriptor) : null;
            const saveRes = await fetch("/api/admin/facial-profile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: userId,
                face_descriptor: descriptor,
                photo_url: publicUrl,
                is_active: !!detection,
              }),
            });
            if (!saveRes.ok) throw new Error("Erro ao salvar perfil facial.");
            setFaceTrainStatus(detection ? "ok" : "photo_only");
          } catch {
            await fetch("/api/admin/facial-profile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: userId,
                face_descriptor: null,
                photo_url: publicUrl,
                is_active: false,
              }),
            });
            setFaceTrainStatus("photo_only");
          }
        } else {
          setFaceTrainStatus("error");
          toast({
            variant: "destructive",
            title: "Erro no upload da foto",
            description: uploadError?.message || "Verifique se o bucket face-photos existe no Supabase Storage",
          });
        }
      } else if (photoFile) {
        setFaceTrainStatus("error");
        toast({
          variant: "destructive",
          title: "Erro ao fazer upload",
          description: "Não foi possível fazer upload da foto. Verifique sua conexão.",
        });
      }

      toast({
        title: isEditing
          ? "Funcionário atualizado!"
          : "Funcionário criado com sucesso!",
        description: isEditing
          ? `Os dados de ${formData.name} foram atualizados.`
          : `${formData.name} foi adicionado ao sistema.`,
      });

      onSuccess?.();
      if (!isEditing) {
        router.push("/funcionarios");
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro desconhecido",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal info */}
      <div className="glass-card rounded-xl border border-white/[0.08] p-6 space-y-4">
        <h3 className="font-semibold text-slate-200">Dados Pessoais</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome completo *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((p) => ({ ...p, name: e.target.value }))
              }
              required
              placeholder="João da Silva"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((p) => ({ ...p, email: e.target.value }))
              }
              required
              placeholder="joao@empresa.com"
              disabled={isEditing}
            />
          </div>
        </div>

        {!isEditing && (
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha inicial *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData((p) => ({ ...p, password: e.target.value }))
              }
              required={!isEditing}
              placeholder="Mínimo 6 caracteres"
              minLength={6}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="job_title">Cargo</Label>
          <Input
            id="job_title"
            value={formData.job_title}
            onChange={(e) =>
              setFormData((p) => ({ ...p, job_title: e.target.value }))
            }
            placeholder="Vendedor, Atendente..."
          />
        </div>

        {isEditing && (
          <div className="flex items-center gap-3">
            <Switch
              checked={formData.is_active}
              onCheckedChange={(val) =>
                setFormData((p) => ({ ...p, is_active: val }))
              }
            />
            <Label>Conta ativa</Label>
          </div>
        )}
      </div>

      {/* Work schedule */}
      <div className="glass-card rounded-xl border border-white/[0.08] p-6 space-y-4">
        <h3 className="font-semibold text-slate-200">Jornada de Trabalho</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="daily_hours">Horas diárias</Label>
            <Input
              id="daily_hours"
              type="number"
              step="0.5"
              min="1"
              max="24"
              value={formData.daily_hours}
              onChange={(e) =>
                setFormData((p) => ({ ...p, daily_hours: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="monthly_hours">Horas mensais</Label>
            <Input
              id="monthly_hours"
              type="number"
              step="1"
              min="1"
              value={formData.monthly_hours}
              onChange={(e) =>
                setFormData((p) => ({ ...p, monthly_hours: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lunch_break_minutes">Almoço (min)</Label>
            <Input
              id="lunch_break_minutes"
              type="number"
              step="5"
              min="0"
              max="120"
              value={formData.lunch_break_minutes}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  lunch_break_minutes: e.target.value,
                }))
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="salary">Salário (R$)</Label>
            <Input
              id="salary"
              type="number"
              step="0.01"
              min="0"
              value={formData.salary}
              onChange={(e) =>
                setFormData((p) => ({ ...p, salary: e.target.value }))
              }
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="compensation_type">Compensação de horas</Label>
            <Select
              value={formData.compensation_type}
              onValueChange={(val) =>
                setFormData((p) => ({ ...p, compensation_type: val as import("@/types").CompensationType }))
              }
            >
              <SelectTrigger id="compensation_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Banco + Pagamento</SelectItem>
                <SelectItem value="bank">Banco de Horas</SelectItem>
                <SelectItem value="payment">Pagamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="admission_date">Data de admissão</Label>
          <Input
            id="admission_date"
            type="date"
            value={formData.admission_date}
            onChange={(e) =>
              setFormData((p) => ({ ...p, admission_date: e.target.value }))
            }
          />
        </div>
      </div>

      {/* Facial photo */}
      <div className="glass-card rounded-xl border border-white/[0.08] p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-slate-200">Reconhecimento Facial</h3>
            <p className="text-sm text-slate-400 mt-0.5">
              Foto do rosto para verificar identidade ao bater ponto.
            </p>
          </div>
          {faceTrainStatus === "ok" && (
            <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-2.5 py-1 shrink-0">
              <CheckCircle2 className="h-3 w-3" />Treinado
            </span>
          )}
          {faceTrainStatus === "photo_only" && (
            <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-1 shrink-0">Foto salva</span>
          )}
          {faceTrainStatus === "training" && (
            <span className="flex items-center gap-1 text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-full px-2.5 py-1 shrink-0">
              <Loader2 className="h-3 w-3 animate-spin" />Treinando...
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="h-24 w-24 rounded-xl bg-white/[0.04] border-2 border-dashed border-white/[0.12] flex items-center justify-center overflow-hidden shrink-0">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="Foto" className="w-full h-full object-cover" />
            ) : (
              <Camera className="h-8 w-8 text-slate-500" />
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="photo-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 border border-white/[0.1] rounded-lg text-sm font-medium text-slate-300 hover:bg-white/[0.05] transition-colors">
                <Upload className="h-4 w-4" />
                {photoPreview ? "Trocar foto" : "Enviar foto"}
              </div>
            </label>
            <input id="photo-upload" type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhotoChange} />
            <p className="text-xs text-slate-500">JPG, PNG ou WebP · máx 5MB</p>
            <p className="text-xs text-slate-500">Use foto frontal, bem iluminada</p>
          </div>
        </div>

        {faceTrainStatus === "photo_only" && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-300">
            Rosto não detectado na foto. Use uma foto frontal com boa iluminação. O reconhecimento não estará ativo para este funcionário.
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Salvando...
            </>
          ) : isEditing ? (
            "Salvar Alterações"
          ) : (
            "Criar Funcionário"
          )}
        </Button>
      </div>
    </form>
  );
}
