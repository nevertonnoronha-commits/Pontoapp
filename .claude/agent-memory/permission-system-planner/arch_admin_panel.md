---
name: arch-admin-panel
description: Convenções do painel admin — estrutura de páginas, Server Actions, e sidebar admin
metadata:
  type: project
---

O painel admin segue este padrão arquitetural:
- `app/admin/layout.tsx` — Server Component que verifica super admin via `createClient()` e renderiza `AdminClientLayout`
- `app/admin/admin-client-layout.tsx` — Client Component com sidebar e header
- `app/admin/_components/admin-sidebar.tsx` — Client Component com array `routes` hardcoded (Visão Geral, Cartórios, Operadores)
- `app/admin/actions.ts` — Server Actions com `'use server'`, usa `createAdminClient()` (service_role), sempre chama `assertSuperAdmin()` primeiro
- Páginas de seção: ex. `app/admin/operadores/page.tsx` — Server Component async que busca dados com `createAdminClient()` e renderiza um Client Component de listagem

Padrão de Server Action no admin:
1. `assertSuperAdmin()` — verifica autenticação
2. `createAdminClient()` — cria client com service_role
3. Query/mutation no banco
4. `revalidatePath('/admin/...')` para invalidar o cache da página

**How to apply:** Nova página `/admin/permissoes` deve seguir exatamente este padrão: page.tsx (Server, busca dados com admin client), actions.ts (Server Actions com assertSuperAdmin + adminClient + revalidatePath).
