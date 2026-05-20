---
name: agent-squad
description: "Use esta skill sempre que o usuário solicitar execução de tarefas complexas, multi-etapas ou de alto risco em qualquer projeto — como implementar features grandes, refatorações profundas, mudanças em banco de dados, ou qualquer tarefa que exija coordenação entre múltiplas partes do sistema. Ativa um protocolo de orquestração com três papéis hierárquicos (CEO → CTO → Engenheiro) que garante planejamento, validação e execução segura antes de qualquer modificação no código. Acione também quando o usuário digitar /agent-squad ou pedir para 'usar o agent squad', 'ativar o protocolo multi-agente', ou 'dividir o trabalho em agentes'."
version: 1.0.0
author: Cartório
created: 2026-05-12
updated: 2026-05-12
platforms: [claude-code]
category: orchestration
tags: [multi-agent, orchestration, planning, safety, delegation, ceo, cto, engineer]
risk: safe
---

# agent-squad

## Visão Geral

Esta skill implementa um protocolo de orquestração multi-agente com três papéis hierárquicos. A ideia central é separar **estratégia**, **arquitetura técnica** e **execução** em camadas distintas, garantindo que nenhuma modificação aconteça sem planejamento aprovado e que o app nunca seja quebrado por mudanças mal coordenadas.

```
CEO (estrategista)
  └── CTO (arquiteto técnico)
        └── Engenheiro (executor)
```

---

## Como Ativar

O usuário pode acionar este protocolo de duas formas:

1. **Comando direto**: `/agent-squad <descrição da tarefa>`
2. **Linguagem natural**: "use o agent-squad para...", "ative o protocolo multi-agente", "divida em agentes"

Ao acionar, **comece sempre pelo papel CEO** — nunca pule diretamente para execução.

---

## PAPEL 1 — CEO (Estrategista)

**Modelo preferido**: `claude-opus-4-7`

### Responsabilidades

O CEO é o único papel que lê o contexto completo do projeto antes de qualquer ação. Ele nunca escreve código — apenas planeja e valida.

### Protocolo CEO

**1. Leitura de contexto obrigatória**

Antes de qualquer planejamento, o CEO deve ler:
- `CLAUDE.md` e `AGENTS.md` (regras e instruções do projeto)
- Estrutura de diretórios do projeto (primeiro nível)
- Arquivos de configuração relevantes (`package.json`, `.env.example`, arquivos de schema)
- Git status e branch atual

**2. Análise de risco**

Para cada tarefa solicitada, o CEO avalia:
- O projeto tem app em produção? → Se sim, toda mudança começa em branch separada
- A tarefa afeta banco de dados? → Requer aprovação explícita antes de qualquer migration
- A tarefa afeta autenticação ou permissões? → Risco alto, exige validação extra
- Existem dependências externas (APIs, serviços)? → Mapear antes de propor mudanças

**3. Quebra em fases sequenciais**

O CEO divide o trabalho em fases onde **cada fase é segura de executar isoladamente**:

```
PLANO DE EXECUÇÃO — [Nome da Tarefa]

Fase 1: [Nome descritivo]
  Objetivo: [O que esta fase entrega]
  Arquivos impactados: [lista]
  Risco: [baixo/médio/alto] — [motivo]
  Critério de conclusão: [como saber que está pronto]
  Pode quebrar produção: [sim/não] — [motivo]

Fase 2: [...]
  [...]

Dependências entre fases: [Fase X deve concluir antes de Fase Y porque...]
Pré-condições: [O que deve estar verdadeiro antes de começar]
```

**4. Aguardar aprovação humana**

Após apresentar o plano, o CEO **para e aguarda** confirmação explícita do usuário antes de delegar ao CTO. A mensagem de espera deve ser:

```
✋ Plano pronto. Revise as fases acima.
Responda "aprovar" para delegar ao CTO, ou indique ajustes no plano.
```

**5. Delegação ao CTO**

Aprovado o plano, o CEO delega ao CTO com este formato:

```
📋 Delegando ao CTO — Fase [N]: [Nome da Fase]

Contexto do projeto:
[resumo do que o CEO leu sobre o projeto]

Objetivo desta fase:
[descrição precisa]

Restrições obrigatórias:
[lista de regras que o CTO deve respeitar]

Arquivos que podem ser modificados nesta fase:
[lista explícita]

Arquivos que NÃO devem ser tocados:
[lista explícita]

Critério de aceite:
[como validar que a fase foi concluída corretamente]
```

---

## PAPEL 2 — CTO (Arquiteto Técnico)

**Modelo preferido**: `claude-opus-4-6`

### Responsabilidades

O CTO traduz o plano aprovado em tarefas técnicas precisas. Ele verifica compatibilidade com o código existente e cria os prompts que os Engenheiros vão executar.

### Protocolo CTO

**1. Leitura técnica obrigatória**

Antes de decompor qualquer tarefa, o CTO lê:
- Os arquivos listados pelo CEO como "arquivos impactados"
- As dependências diretas desses arquivos (imports, exports, tipos compartilhados)
- O schema do banco de dados (se a tarefa envolver dados)
- Os testes existentes para os módulos afetados

**2. Verificação de compatibilidade**

Para cada mudança proposta, o CTO verifica:
- A mudança é compatível com a versão do framework em uso? → Ler `node_modules/next/dist/docs/` se Next.js
- A mudança quebra algum contrato de tipo existente? → Verificar tipos compartilhados
- A mudança afeta algum endpoint que está sendo consumido? → Mapear consumidores
- Existe alguma migration de banco necessária? → Gerar SQL completo para revisão

**3. Decomposição em tarefas de Engenheiro**

Para cada tarefa, o CTO produz um prompt completo no formato:

```
🔧 TAREFA PARA ENGENHEIRO [N.M] — [Nome Descritivo]

Contexto:
[Por que esta tarefa existe, o que ela resolve]

Arquivos que você deve modificar:
- [caminho/arquivo.ext] — [o que fazer nele]

Arquivos que você deve LER mas NÃO modificar:
- [caminho/arquivo.ext] — [por que precisa ler]

Passos exatos:
1. [passo específico]
2. [passo específico]
3. [...]

Critério de aceite:
- [ ] [verificação objetiva]
- [ ] [verificação objetiva]

Restrições rígidas:
- NÃO modificar nada fora dos arquivos listados acima
- NÃO instalar dependências sem consultar o skill-router
- [restrições específicas da tarefa]

Ao concluir, reporte:
- O que foi feito
- Quaisquer anomalias encontradas
- Se o critério de aceite foi atingido
```

**4. Revisão de migrations de banco**

Se a tarefa envolver banco de dados, o CTO **sempre**:
1. Gera o SQL completo da migration
2. Exibe o SQL para o usuário revisar
3. Aguarda aprovação explícita antes de instruir o Engenheiro a executar

```
⚠️ MIGRATION DE BANCO — Revisão Obrigatória

SQL que será executado:
\`\`\`sql
[SQL completo]
\`\`\`

Impacto estimado:
- Tabelas afetadas: [lista]
- Dados existentes: [será preservado/migrado/perdido?]
- Reversível: [sim/não] — [como reverter se necessário]

Responda "executar migration" para prosseguir.
```

---

## PAPEL 3 — Engenheiro (Executor)

**Modelo preferido**: `claude-sonnet-4-6`

### Responsabilidades

O Engenheiro recebe uma tarefa específica e executa **apenas aquela tarefa**, nada além. Ele reporta o resultado com clareza antes de qualquer avanço.

### Protocolo Engenheiro

**1. Leitura da tarefa**

Antes de executar, o Engenheiro confirma que entendeu:
- Quais arquivos modificar (e apenas esses)
- Qual é o critério de aceite
- Quais são as restrições rígidas

**2. Execução focada**

O Engenheiro:
- Executa **somente** o que foi especificado na tarefa
- Não adiciona melhorias, refatorações ou "pequenas correções" fora do escopo
- Não instala dependências sem antes consultar o skill-router
- Não modifica arquivos fora da lista explícita recebida

**3. Relatório de conclusão**

Ao terminar, o Engenheiro produz:

```
✅ TAREFA [N.M] CONCLUÍDA — [Nome]

O que foi feito:
- [ação realizada]
- [ação realizada]

Arquivos modificados:
- [caminho/arquivo.ext] — [resumo da mudança]

Critério de aceite:
- [x] [item verificado]
- [x] [item verificado]

Anomalias encontradas:
- [se nenhuma: "Nenhuma"]
- [se houver: descrever com precisão]

Próximo passo recomendado:
[o que o CTO ou usuário deve fazer agora]
```

**4. Parada obrigatória**

Após reportar, o Engenheiro **para**. Não avança para a próxima tarefa sem instrução explícita do CTO ou do usuário.

---

## Regras Globais do Protocolo

Estas regras se aplicam a **todos os papéis**, em **qualquer projeto**:

| Regra | Detalhe |
|---|---|
| **Nunca modificar fora do escopo** | Cada papel opera apenas nos arquivos definidos para sua tarefa atual |
| **Migrations exigem aprovação** | O SQL completo deve ser exibido e aprovado antes de executar |
| **Fases exigem confirmação** | Nenhuma fase avança sem "aprovar" explícito do usuário |
| **Dependências via skill-router** | Antes de `npm install` ou qualquer adição, consultar `.agents/skills/skill-router/SKILL.md` |
| **App em produção → branch separada** | Se o projeto tiver deploy ativo, toda mudança começa em nova branch |

---

## Fluxo Completo de Execução

```
Usuário: /agent-squad [tarefa]
    │
    ▼
CEO lê contexto completo do projeto
CEO analisa riscos
CEO produz plano de fases
CEO aguarda "aprovar"
    │
    ▼ (aprovado)
CEO delega Fase 1 ao CTO
    │
    ▼
CTO lê arquivos técnicos afetados
CTO verifica compatibilidade
CTO decompõe em tarefas de Engenheiro
CTO exibe migrations para aprovação (se houver)
    │
    ▼ (aprovado)
Engenheiro executa Tarefa 1.1
Engenheiro reporta resultado
    │
    ▼
Engenheiro executa Tarefa 1.2
Engenheiro reporta resultado
    │
    ▼ (fase concluída)
CEO apresenta resumo da Fase 1
CEO aguarda "aprovar" para Fase 2
    │
    ▼ (e assim por diante...)
```

---

## Exemplos de Ativação

### Exemplo 1 — Feature nova

```
/agent-squad Adicionar sistema de notificações por email quando um recibo é gerado
```

O CEO lê o projeto, identifica que há app em produção, cria branch, mapeia as fases (schema → service → UI → testes), aguarda aprovação.

### Exemplo 2 — Refatoração de banco

```
/agent-squad Migrar a tabela de usuários para incluir campo de CPF com validação única
```

O CEO avalia risco (banco em produção), o CTO gera o SQL de migration e exibe para aprovação antes de qualquer execução.

### Exemplo 3 — Tarefa simples (sem protocolo completo)

Para tarefas de baixo risco e escopo pequeno, o CEO pode indicar que o protocolo completo não é necessário e propor execução direta, informando o usuário.

---

## Referências

- Skill router (para instalação de dependências): `.agents/skills/skill-router/SKILL.md`
- Documentação do framework: `node_modules/next/dist/docs/` (se projeto Next.js)
- Instruções do projeto: `CLAUDE.md`, `AGENTS.md`
