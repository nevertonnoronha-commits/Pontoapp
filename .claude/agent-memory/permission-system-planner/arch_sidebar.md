---
name: arch-sidebar
description: Localização e estrutura do menu lateral do dashboard — componente client-side que precisa receber permissões via prop
metadata:
  type: project
---

O menu lateral do dashboard é o componente `DashboardSidebar` em `components/dashboard-sidebar.tsx`.

É um Client Component (`'use client'`). Os grupos de navegação são definidos como array `groups` dentro do componente — hardcoded hoje com dois grupos: "Protocolos" e "Habilitações".

Fluxo atual:
- `app/dashboard/layout.tsx` (Server Component async) busca dados do operador e renderiza `ClientLayout`
- `app/dashboard/client-layout.tsx` (Client Component) recebe `user` e `operadorNome` como props e renderiza `DashboardSidebar`
- `DashboardSidebar` recebe `user` e `operadorNome` como props

Para injetar permissões server-side, o ponto de entrada correto é `app/dashboard/layout.tsx` — ali já existe uma query ao Supabase. A lista de módulos ativos deve ser buscada lá e passada como prop até o `DashboardSidebar`.

**How to apply:** Adicionar prop `modulosAtivos: string[]` na cadeia: `layout.tsx` → `ClientLayout` → `DashboardSidebar`. O sidebar filtrará os grupos com base nessa prop.
