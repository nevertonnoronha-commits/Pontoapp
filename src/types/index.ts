// PontoApp - TypeScript Types

export type UserRole = "employee" | "admin" | "super_admin";

export type PunchType = "entry" | "lunch_out" | "lunch_return" | "exit";

export type RecordStatus = "valid" | "suspicious" | "rejected" | "manual";

export type CompensationType = "bank" | "payment" | "both";

// Organization
export interface Organization {
  id: string;
  name: string;
  plan: string;
  created_at: string;
  updated_at: string;
}

// Store Config
export interface StoreConfig {
  id: string;
  organization_id: string;
  wifi_ssid: string | null;
  wifi_bssid: string | null;
  gps_latitude: number;
  gps_longitude: number;
  gps_radius_meters: number;
  store_name: string | null;
  updated_at: string;
  updated_by: string | null;
}

// User
export interface User {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Employee Profile
export interface EmployeeProfile {
  id: string;
  user_id: string;
  organization_id: string;
  job_title: string | null;
  salary: number;
  daily_hours: number;
  monthly_hours: number;
  compensation_type: CompensationType;
  lunch_break_minutes: number;
  admission_date: string | null;
  updated_at: string;
}

// Facial Profile
export interface FacialProfile {
  id: string;
  user_id: string;
  organization_id: string;
  face_descriptor: number[] | null;
  photo_url: string | null;
  trained_at: string | null;
  is_active: boolean;
  created_at: string;
}

// Time Record
export interface TimeRecord {
  id: string;
  user_id: string;
  organization_id: string;
  punch_type: PunchType;
  recorded_at: string;
  // GPS
  gps_latitude: number | null;
  gps_longitude: number | null;
  gps_accuracy_meters: number | null;
  gps_distance_meters: number | null;
  gps_verified: boolean;
  // WiFi
  wifi_confirmed: boolean;
  wifi_ssid_reported: string | null;
  // Facial
  face_verified: boolean;
  face_similarity: number | null;
  face_photo_url: string | null;
  // Metadata
  ip_address: string | null;
  user_agent: string | null;
  // Status
  status: RecordStatus;
  // Manual edit
  is_manual_edit: boolean;
  edited_by: string | null;
  edit_reason: string | null;
  original_recorded_at: string | null;
  created_at: string;
}

// Workday Summary
export interface WorkdaySummary {
  id: string;
  user_id: string;
  organization_id: string;
  work_date: string;
  entry_time: string | null;
  lunch_out_time: string | null;
  lunch_return_time: string | null;
  exit_time: string | null;
  hours_worked: number;
  hours_expected: number;
  overtime_hours: number;
  bank_balance: number;
  overtime_value: number;
  is_complete: boolean;
  updated_at: string;
}

// Monthly Closure
export interface MonthlyClosure {
  id: string;
  user_id: string;
  organization_id: string;
  year: number;
  month: number;
  total_days_worked: number;
  total_hours_worked: number;
  total_hours_expected: number;
  total_overtime_hours: number;
  total_bank_balance: number;
  total_overtime_value: number;
  salary_base: number;
  is_closed: boolean;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string;
}

// Audit Log
export interface AuditLog {
  id: string;
  organization_id: string;
  user_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// Combined types for UI
export interface UserWithProfile extends User {
  employee_profile: EmployeeProfile | null;
  facial_profile: FacialProfile | null;
}

export interface TimeRecordWithUser extends TimeRecord {
  user: Pick<User, "id" | "name" | "email">;
}

export interface WorkdaySummaryWithUser extends WorkdaySummary {
  user: Pick<User, "id" | "name" | "email">;
}

// API Request/Response types
export interface RegisterPunchRequest {
  punch_type: PunchType;
  gps_latitude?: number;
  gps_longitude?: number;
  gps_accuracy_meters?: number;
  wifi_confirmed: boolean;
  wifi_ssid_reported?: string;
  face_verified: boolean;
  face_similarity?: number;
  face_photo_url?: string;
}

export interface RegisterPunchResponse {
  success: boolean;
  record?: TimeRecord;
  error?: string;
}

export interface WorkdayCalculation {
  hours_worked: number;
  overtime_hours: number;
  bank_balance: number;
  overtime_value: number;
}

export interface MonthlyTotals {
  total_days_worked: number;
  total_hours_worked: number;
  total_hours_expected: number;
  total_overtime_hours: number;
  total_bank_balance: number;
  total_overtime_value: number;
}

// UI State types
export type PunchButtonState =
  | "idle"
  | "validating"
  | "ready"
  | "registering"
  | "confirmed"
  | "error";

export type LocationStatus = "checking" | "verified" | "failed" | "disabled";

export type FaceStatus =
  | "idle"
  | "loading"
  | "detecting"
  | "verified"
  | "failed";

// Simple in/out labels — entry means clocking in, exit means clocking out
export const PUNCH_TYPE_LABELS: Record<PunchType | "complete", string> = {
  entry: "Registrar Entrada",
  lunch_out: "Registrar Saída",
  lunch_return: "Registrar Entrada",
  exit: "Registrar Saída",
  complete: "Jornada Concluída",
};

export const PUNCH_TYPE_SEQUENCE: PunchType[] = [
  "entry",
  "lunch_out",
  "lunch_return",
  "exit",
];

// Simple alternation: clocked-out → entry, clocked-in → exit
export function getNextPunchType(
  lastPunchType: PunchType | null
): PunchType | "complete" {
  if (!lastPunchType) return "entry";
  const clockedOut = lastPunchType === "exit" || lastPunchType === "lunch_out";
  if (clockedOut) return "entry";
  return "exit";
}

export function isClockedIn(lastPunchType: PunchType | null): boolean {
  if (!lastPunchType) return false;
  return lastPunchType === "entry" || lastPunchType === "lunch_return";
}
