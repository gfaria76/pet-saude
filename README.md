# PET-Saúde — Estratificação de Risco Familiar

Sistema de apoio às equipes de Saúde da Família (ESF) da Atenção Primária à Saúde (APS) para identificação, registro e acompanhamento longitudinal de vulnerabilidades sociodemográficas e de saúde de famílias, com estratificação objetiva de risco baseada na Escala de Risco Familiar de Coelho-Savassi (ERF-CS).

Territórios piloto: UBSs dos municípios de **Coxim** e **Corumbá** (Mato Grosso do Sul).

## Documentação do Projeto

- [`CLAUDE.md`](./CLAUDE.md) / [`GEMINI.md`](./GEMINI.md) / [`CODEX.md`](./CODEX.md) / [`.github/copilot-instructions.md`](./.github/copilot-instructions.md) — guias de contexto e engenharia de prompt para cada assistente de IA usado no desenvolvimento.
- [`context/business_rules.md`](./context/business_rules.md) — indicadores, pesos e faixas de corte da Escala Coelho-Savassi.
- [`context/domain_model.md`](./context/domain_model.md) — modelo de entidades e invariantes de domínio.
- [`context/security_privacy.md`](./context/security_privacy.md) — regras de LGPD, auditoria e dados sintéticos.
- [`context/ui_guidelines.md`](./context/ui_guidelines.md) — padrões de UI, acessibilidade e explicabilidade visual do risco.
- [`prompts/task_templates.md`](./prompts/task_templates.md) — templates de prompt para tarefas recorrentes de desenvolvimento.

## Stack Técnica

- [Nuxt 4](https://nuxt.com/docs/getting-started/introduction) + Vue 3
- Cloud Firestore via `firebase` + `vuefire` (dados em tempo real)
- `zod` para validação de schemas (`shared/domain/schemas/`)
- Motor de estratificação de risco puro e testável em `shared/domain/risk-engine/`
- Vitest para testes unitários (`tests/unit/`)

## Setup

Instale as dependências:

```bash
pnpm install
```

## Servidor de Desenvolvimento

Inicie o servidor de desenvolvimento em `http://localhost:3000`:

```bash
pnpm dev
```

## Testes

Execute a suíte de testes unitários (motor de estratificação de risco e demais regras de domínio):

```bash
pnpm test
```

## Produção

Compile a aplicação para produção:

```bash
pnpm build
```

Visualize a build de produção localmente:

```bash
pnpm preview
```

Consulte a [documentação de deploy do Nuxt](https://nuxt.com/docs/getting-started/deployment) para mais informações.
