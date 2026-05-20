---
name: arch-middleware
description: Estrutura do middleware proxy.ts — o que faz, o que NÃO pode ser tocado, e onde fica o cartorio_ativo
metadata:
  type: project
---

O middleware principal está em `proxy.ts` na raiz do projeto (não em `middleware.ts`). Ele exporta a função `proxy` (não `middleware`). O arquivo `lib/supabase/middleware.ts` existe mas é um utilitário de sessão legado — o arquivo real é `proxy.ts`.

Fluxo atual do `proxy.ts`:
1. Cria client Supabase SSR com anon key, lendo/escrevendo cookies da request.
2. Chama `supabase.auth.getUser()` para renovar o token (efeito colateral de refresh).
3. Protege `/admin` — exige auth + email == `SUPER_ADMIN_EMAIL`.
4. Redireciona usuário logado fora do `/dashboard` de volta para `/dashboard`.
5. Protege `/dashboard` e `/selecionar-cartorio` — exige auth.
6. Verifica cookie `cartorio_ativo` para quem acessa `/dashboard`.

Cookie `cartorio_ativo`: lido via `request.cookies.get('cartorio_ativo')`. Contém o cartorio_id ativo do operador.

**Why:** A lógica de auth não pode ser alterada — é crítica para funcionamento da sessão SSR com Supabase.

**How to apply:** Qualquer adição de permissões por módulo deve vir DEPOIS da verificação do `cartorio_ativo` (passo 6), sem remover ou reordenar os passos anteriores.
