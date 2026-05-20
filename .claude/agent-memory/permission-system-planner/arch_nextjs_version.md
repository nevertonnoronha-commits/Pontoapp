---
name: arch-nextjs-version
description: Versão Next.js e APIs confirmadas nos docs internos do node_modules
metadata:
  type: project
---

Next.js versão: **16.2.3** (confirmado em package.json)
React: **19.2.4**

APIs confirmadas nos docs `node_modules/next/dist/docs/`:

- `cookies()` — async function, retorna Promise. Deve usar `await cookies()`. Suportado em Server Components e Server Actions.
- `use cache` — diretiva disponível a partir da v15 (experimental), estabilizada na v16. Requer `cacheComponents: true` no `next.config.ts` para ser habilitada. **O projeto atual NÃO tem `cacheComponents: true` no next.config.ts** — portanto `use cache` não está habilitado.
- `unstable_cache` — DEPRECATED na v16. Substituído por `use cache`.
- `React.cache` — funciona como deduplicação por request, mas tem escopo isolado dentro de `use cache` boundaries.
- `NextRequest.cookies.get(name)` — disponível no middleware, síncrono.

Cache strategy implication: Como `cacheComponents` não está habilitado no projeto, NÃO usar `use cache`. A estratégia de cache para permissões no middleware deve usar cookie-encoding ou `React.cache` (request-scoped) no layout do dashboard.

**How to apply:** Não habilitar `cacheComponents` — mudança de configuração de build que pode afetar comportamento existente. Para o middleware, usar cookie com permissões encoded. Para o layout server component, usar query direta (já é request-scoped por natureza).
