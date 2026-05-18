CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  plan VARCHAR(20) DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE store_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  wifi_ssid VARCHAR(100),
  wifi_bssid VARCHAR(17),
  gps_latitude DECIMAL(10,8) NOT NULL DEFAULT 0,
  gps_longitude DECIMAL(11,8) NOT NULL DEFAULT 0,
  gps_radius_meters INTEGER DEFAULT 200,
  store_name VARCHAR(200),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID
);

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'employee' CHECK (role IN ('employee', 'admin', 'super_admin')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE employee_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  job_title VARCHAR(100),
  salary DECIMAL(10,2) DEFAULT 0,
  daily_hours DECIMAL(4,2) DEFAULT 8.0,
  monthly_hours DECIMAL(6,2) DEFAULT 176.0,
  compensation_type VARCHAR(20) DEFAULT 'both' CHECK (compensation_type IN ('bank', 'payment', 'both')),
  lunch_break_minutes INTEGER DEFAULT 60,
  admission_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE facial_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  face_descriptor JSONB,
  photo_url TEXT,
  trained_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE time_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  punch_type VARCHAR(20) NOT NULL CHECK (punch_type IN ('entry', 'lunch_out', 'lunch_return', 'exit')),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  gps_latitude DECIMAL(10,8),
  gps_longitude DECIMAL(11,8),
  gps_accuracy_meters DECIMAL(8,2),
  gps_distance_meters INTEGER,
  gps_verified BOOLEAN DEFAULT FALSE,
  wifi_confirmed BOOLEAN DEFAULT FALSE,
  wifi_ssid_reported VARCHAR(100),
  face_verified BOOLEAN DEFAULT FALSE,
  face_similarity DECIMAL(4,3),
  face_photo_url TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'valid' CHECK (status IN ('valid', 'suspicious', 'rejected', 'manual')),
  is_manual_edit BOOLEAN DEFAULT FALSE,
  edited_by UUID REFERENCES users(id),
  edit_reason TEXT,
  original_recorded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workday_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  work_date DATE NOT NULL,
  entry_time TIMESTAMPTZ,
  lunch_out_time TIMESTAMPTZ,
  lunch_return_time TIMESTAMPTZ,
  exit_time TIMESTAMPTZ,
  hours_worked DECIMAL(5,2) DEFAULT 0,
  hours_expected DECIMAL(5,2) DEFAULT 0,
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  bank_balance DECIMAL(5,2) DEFAULT 0,
  overtime_value DECIMAL(10,2) DEFAULT 0,
  is_complete BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, work_date)
);

CREATE TABLE monthly_closures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  total_days_worked INTEGER DEFAULT 0,
  total_hours_worked DECIMAL(7,2) DEFAULT 0,
  total_hours_expected DECIMAL(7,2) DEFAULT 0,
  total_overtime_hours DECIMAL(7,2) DEFAULT 0,
  total_bank_balance DECIMAL(7,2) DEFAULT 0,
  total_overtime_value DECIMAL(10,2) DEFAULT 0,
  salary_base DECIMAL(10,2) DEFAULT 0,
  is_closed BOOLEAN DEFAULT FALSE,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year, month)
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_time_records_user_date ON time_records(user_id, recorded_at DESC);
CREATE INDEX idx_time_records_org_date ON time_records(organization_id, recorded_at DESC);
CREATE INDEX idx_workday_summaries_user_date ON workday_summaries(user_id, work_date DESC);
CREATE INDEX idx_users_org ON users(organization_id, is_active);
CREATE INDEX idx_monthly_closures_user ON monthly_closures(user_id, year DESC, month DESC);

-- RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE facial_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE workday_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_org" ON users FOR ALL USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "store_config_own_org" ON store_configs FOR ALL USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "time_records_employee_own" ON time_records FOR SELECT USING (
  user_id = auth.uid() OR
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'super_admin')
);
CREATE POLICY "time_records_insert_own" ON time_records FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "time_records_admin_update" ON time_records FOR UPDATE USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'super_admin')
);
CREATE POLICY "workday_summaries_access" ON workday_summaries FOR ALL USING (
  user_id = auth.uid() OR
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'super_admin')
);
CREATE POLICY "employee_profiles_access" ON employee_profiles FOR ALL USING (
  user_id = auth.uid() OR
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'super_admin')
);
CREATE POLICY "facial_profiles_access" ON facial_profiles FOR ALL USING (
  user_id = auth.uid() OR
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'super_admin')
);
CREATE POLICY "monthly_closures_access" ON monthly_closures FOR ALL USING (
  user_id = auth.uid() OR
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'super_admin')
);
CREATE POLICY "audit_logs_admin" ON audit_logs FOR ALL USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'super_admin')
);
CREATE POLICY "organizations_own" ON organizations FOR ALL USING (
  id = (SELECT organization_id FROM users WHERE id = auth.uid())
);
