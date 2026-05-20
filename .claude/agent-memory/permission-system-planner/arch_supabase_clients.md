---
name: arch-supabase-clients
description: Padrões de clientes Supabase neste projeto — onde cada client vive e quando usar cada um
metadata:
  type: project
---

Existem três clientes Supabase distintos no projeto:

1. `lib/supabase/server.ts` — `createClient()` async, usa `cookies()` do `next/headers`. Para Server Components e Server Actions que operam com o usuário logado (anon key, RLS aplicado).
2. `lib/supabase/client.ts` — `createClient()` sync, usa `createBrowserClient`. Para Client Components.
3. `lib/supabase/admin.ts` — `createAdminClient()` sync, usa `createClient` do `@supabase/supabase-js` com `SUPABASE_SERVICE_ROLE_KEY`. Bypassa RLS. Usado exclusivamente em Server Actions do painel admin.

**Why:** O projeto usa RLS estrito. O service_role só é aceito em Server Actions (`'use server'`) dentro de `/app/admin/`.

**How to apply:** Nunca usar `createAdminClient()` no middleware (`proxy.ts`) nem em Client Components. Em permissões do dashboard, usar o client `server.ts` com anon key (o usuário lê suas próprias linhas via RLS).
