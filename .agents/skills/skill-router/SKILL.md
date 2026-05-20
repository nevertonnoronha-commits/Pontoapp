---
name: skill-router
description: "This skill should be used before responding to ANY new task request — such as 'add animations', 'create a table', 'adjust layout', 'build a feature', 'fix a bug', 'refactor code', or any implementation prompt. It enforces a mandatory pre-flight check against the project's skill library so the agent always applies the most relevant domain-specific rules before writing any code or proposing solutions."
version: 1.0.0
author: Antigravity
created: 2026-04-16
updated: 2026-04-16
platforms: [claude-code, gemini, codex]
category: meta
tags: [routing, orchestration, meta-skill, pre-flight, skill-selection]
risk: safe
---

# skill-router

## Purpose

Enforce a mandatory skill discovery and loading step before any task is executed. This prevents agents from applying generic knowledge when a project-specific skill exists that defines better patterns, constraints, and conventions for the task at hand.

## When to Use This Skill

This skill is **always** the first step. Trigger it before responding to any of the following:

- Feature implementation requests ("add X", "create Y", "build Z")
- UI/UX tasks ("add animations", "adjust layout", "improve design")
- Database or backend tasks ("create a table", "add an endpoint")
- Bug fixing or refactoring requests
- Any task where a skill file in the project library could inform the approach

Do **not** skip this routing step, even if you believe you already know the answer.

## Mandatory Pre-Flight Workflow

Follow these steps **strictly and completely** before writing any code or proposing any solution.

### Step 1 — Discover Available Skills

List the contents of the project's skills directory to get an index of available skills:

```
Target directory: .agents/skills/
Secondary directory (read-only reference): skills/antigravity-awesome-skills/skills/
```

Retrieve the directory listing. Note every skill folder name.

### Step 2 — Map the Request to a Skill

Analyze the user's request and compare it against the list of available skills. Use the following matching strategy:

1. **Exact keyword match** — Does any skill name contain a key noun from the request? (e.g., request mentions "Supabase" → look for `supabase-*`, `nextjs-supabase-auth`, etc.)
2. **Category match** — Does the request category align with a skill? (e.g., "add animations" → `scroll-experience`, `3d-web-experience`, `ui-skills`)
3. **Technology match** — Does the request reference a framework or tool? (e.g., "Next.js" → `nextjs-best-practices`, `nextjs-app-router-patterns`)
4. **Fallback** — If no specific match, check for general-purpose skills like `frontend-design`, `react-best-practices`, `clean-code`, or `architecture-patterns`.

### Step 3 — Load and Read the Selected Skill

Once the best-matching skill is identified, **read its SKILL.md in full** using the view_file tool before taking any other action.

```
Path pattern: .agents/skills/<skill-name>/SKILL.md
   or: skills/antigravity-awesome-skills/skills/<skill-name>/SKILL.md
```

Do not summarize, skip, or partially read the skill file. Read it completely.

### Step 4 — Apply the Skill's Rules

With the skill file loaded and read:

- Apply all conventions, patterns, constraints, and guidance defined in the skill.
- If the skill defines specific file structures, naming conventions, or code patterns — follow them exactly.
- If the skill defines steps or a workflow — execute those steps.
- Reference the skill explicitly in your response so the user knows which rules you are following.

### Step 5 — Respond to the Task

Only after completing Steps 1–4, respond to the user's original request.

## Decision Rules

| Situation | Action |
|---|---|
| One clear skill match found | Load and apply it |
| Multiple partial matches found | Load the most specific one; mention the others |
| No match found in `.agents/skills/` | Search in `skills/antigravity-awesome-skills/skills/` |
| Still no match after both dirs | Proceed using general best practices; state no skill was found |
| Skill file is empty or malformed | Proceed without it; report the issue |

## Output Format

When this routing step completes, begin your response with a brief one-line note (in Portuguese, matching the project's language):

```
🔧 Skill carregada: `<skill-name>` — aplicando regras definidas.
```

Or, if no skill was found:

```
🔍 Nenhuma skill específica encontrada para este pedido — usando boas práticas gerais.
```

Then proceed directly to the task response. Do not add extra explanation about the routing process.

## Error Handling

- **Skills directory not found**: Proceed without routing; warn the user once.
- **Skill file missing**: Try the secondary skills directory before giving up.
- **Ambiguous request**: Pick the most specific match and note your choice.
- **Agent skips this step**: This is a critical failure. The agent must re-run from Step 1.

## Examples

### Example 1 — UI Animation Request

> User: "Adicione uma animação suave quando o card aparecer na tela"

Routing result:
1. Lists skills → finds `scroll-experience`, `ui-skills`, `react-patterns`
2. Matches: `scroll-experience` (scroll-triggered animation) and `react-patterns` (component pattern)
3. Loads `scroll-experience/SKILL.md`
4. Applies Intersection Observer patterns defined there
5. Responds with animation implementation following the skill's rules

---

### Example 2 — Database Table Request

> User: "Crie uma tabela de `auditoria` no Supabase"

Routing result:
1. Lists skills → finds `supabase-automation`, `nextjs-supabase-auth`, `database-design`
2. Best match: `nextjs-supabase-auth` (project uses Next.js + Supabase)
3. Loads the skill file → reads RLS policy conventions, migration patterns
4. Creates the table migration following those exact patterns

---

### Example 3 — No Match

> User: "Escreva um email de apresentação para o cartório"

Routing result:
1. Lists skills → no email/communication skill found in `.agents/skills/`
2. Searches secondary dir → `email-sequence` exists but is general marketing, not contextual
3. Reports: no specific skill found → proceeds with general guidance

## References

- Local skill index: `.agents/skills/`
- Shared skill library: `skills/antigravity-awesome-skills/skills/`
- Skill format reference: `.agents/skills/skill-creator/SKILL.md`
