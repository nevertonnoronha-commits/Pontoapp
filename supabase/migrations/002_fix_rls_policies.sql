-- Corrige recursão infinita nas RLS policies
-- O problema: policy de users faz subquery em users -> recursão

-- 1. Função security definer para obter org_id sem recursão
CREATE OR REPLACE FUNCTION get_auth_org_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_auth_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$;

-- 2. Recriar policies de users (sem recursão)
DROP POLICY IF EXISTS "users_own_org" ON users;
CREATE POLICY "users_own_org" ON users FOR ALL
USING (
  id = auth.uid()
  OR organization_id = get_auth_org_id()
);

-- 3. Recriar policies de store_configs
DROP POLICY IF EXISTS "store_config_own_org" ON store_configs;
CREATE POLICY "store_config_own_org" ON store_configs FOR ALL
USING (organization_id = get_auth_org_id());

-- 4. Recriar policies de organizations
DROP POLICY IF EXISTS "organizations_own" ON organizations;
CREATE POLICY "organizations_own" ON organizations FOR ALL
USING (id = get_auth_org_id());

-- 5. Recriar policies de employee_profiles
DROP POLICY IF EXISTS "employee_profiles_access" ON employee_profiles;
CREATE POLICY "employee_profiles_access" ON employee_profiles FOR ALL
USING (
  user_id = auth.uid()
  OR get_auth_role() IN ('admin', 'super_admin')
);

-- 6. Recriar policies de facial_profiles
DROP POLICY IF EXISTS "facial_profiles_access" ON facial_profiles;
CREATE POLICY "facial_profiles_access" ON facial_profiles FOR ALL
USING (
  user_id = auth.uid()
  OR get_auth_role() IN ('admin', 'super_admin')
);

-- 7. Recriar policies de time_records
DROP POLICY IF EXISTS "time_records_employee_own" ON time_records;
DROP POLICY IF EXISTS "time_records_insert_own" ON time_records;
DROP POLICY IF EXISTS "time_records_admin_update" ON time_records;
CREATE POLICY "time_records_select" ON time_records FOR SELECT
USING (
  user_id = auth.uid()
  OR get_auth_role() IN ('admin', 'super_admin')
);
CREATE POLICY "time_records_insert" ON time_records FOR INSERT
WITH CHECK (user_id = auth.uid());
CREATE POLICY "time_records_update" ON time_records FOR UPDATE
USING (get_auth_role() IN ('admin', 'super_admin'));

-- 8. Recriar policies de workday_summaries
DROP POLICY IF EXISTS "workday_summaries_access" ON workday_summaries;
CREATE POLICY "workday_summaries_access" ON workday_summaries FOR ALL
USING (
  user_id = auth.uid()
  OR get_auth_role() IN ('admin', 'super_admin')
);

-- 9. Recriar policies de monthly_closures
DROP POLICY IF EXISTS "monthly_closures_access" ON monthly_closures;
CREATE POLICY "monthly_closures_access" ON monthly_closures FOR ALL
USING (
  user_id = auth.uid()
  OR get_auth_role() IN ('admin', 'super_admin')
);

-- 10. Recriar policies de audit_logs
DROP POLICY IF EXISTS "audit_logs_admin" ON audit_logs;
CREATE POLICY "audit_logs_admin" ON audit_logs FOR ALL
USING (get_auth_role() IN ('admin', 'super_admin'));
