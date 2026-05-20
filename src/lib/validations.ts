import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .email("E-mail inválido")
    .min(1, "E-mail é obrigatório"),
  password: z
    .string()
    .min(6, "Senha deve ter no mínimo 6 caracteres")
    .min(1, "Senha é obrigatória"),
});

export const registerPunchSchema = z.object({
  punch_type: z.enum(["entry", "lunch_out", "lunch_return", "exit"]),
  gps_latitude: z.number().optional(),
  gps_longitude: z.number().optional(),
  gps_accuracy_meters: z.number().optional(),
  wifi_confirmed: z.boolean(),
  wifi_ssid_reported: z.string().optional(),
  face_verified: z.boolean(),
  face_similarity: z.number().min(0).max(1).optional(),
  face_photo_url: z.string().optional(),
});

export const storeConfigSchema = z.object({
  store_name: z.string().min(1, "Nome da loja é obrigatório"),
  wifi_ssid: z.string().optional(),
  allowed_ip: z.string().optional().nullable(),
  gps_latitude: z
    .number()
    .min(-90)
    .max(90, "Latitude inválida"),
  gps_longitude: z
    .number()
    .min(-180)
    .max(180, "Longitude inválida"),
  gps_radius_meters: z
    .number()
    .min(50, "Raio mínimo de 50 metros")
    .max(500, "Raio máximo de 500 metros"),
});

export const employeeFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  job_title: z.string().optional(),
  salary: z.number().min(0, "Salário inválido"),
  daily_hours: z
    .number()
    .min(1, "Mínimo 1 hora")
    .max(24, "Máximo 24 horas"),
  monthly_hours: z
    .number()
    .min(1, "Mínimo 1 hora")
    .max(744, "Máximo 744 horas"),
  compensation_type: z.enum(["bank", "payment", "both"]),
  lunch_break_minutes: z.number().min(0).max(120),
  admission_date: z.string().optional(),
  is_active: z.boolean(),
});

export const manualAdjustmentSchema = z.object({
  recorded_at: z.string().min(1, "Data e hora são obrigatórias"),
  edit_reason: z
    .string()
    .min(10, "Motivo deve ter no mínimo 10 caracteres")
    .min(1, "Motivo é obrigatório"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterPunchInput = z.infer<typeof registerPunchSchema>;
export type StoreConfigInput = z.infer<typeof storeConfigSchema>;
export type EmployeeFormInput = z.infer<typeof employeeFormSchema>;
export type ManualAdjustmentInput = z.infer<typeof manualAdjustmentSchema>;
