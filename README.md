# PET-Saúde — Estratificação de Risco Familiar

Sistema de apoio às equipes de Saúde da Família (ESF) da Atenção Primária à Saúde (APS) para identificar, registrar e acompanhar ao longo do tempo as vulnerabilidades sociodemográficas e de saúde das famílias, com estratificação objetiva de risco inspirada na Escala de Risco Familiar de Coelho-Savassi (ERF-CS).

Territórios piloto: UBSs de **Coxim** e **Corumbá** (Mato Grosso do Sul).

> **Estado atual:** protótipo com **dados sintéticos em memória**. Pesos e faixas de corte estão **pendentes de validação** (ver [`context/business_rules.md`](./context/business_rules.md#5-pendências-de-validação)). A persistência no Firestore está planejada.

## Documentação

| Documento | Conteúdo |
| :--- | :--- |
| [`AGENTS.md`](./AGENTS.md) | Instruções para assistentes de IA (fonte única; `CLAUDE.md`, `GEMINI.md`, `CODEX.md` e `.github/copilot-instructions.md` são links simbólicos para ele) |
| [`context/fontes/`](./context/fontes/) | Relatório Técnico de parâmetros (fonte primária dos indicadores) |
| [`context/architecture.md`](./context/architecture.md) | Camadas, regra de dependência e fluxo da avaliação |
| [`context/business_rules.md`](./context/business_rules.md) | Indicadores, pesos, faixas e pendências de validação |
| [`context/domain_model.md`](./context/domain_model.md) | Entidades e invariantes |
| [`context/security_privacy.md`](./context/security_privacy.md) | LGPD, RBAC, auditoria e dados sintéticos |
| [`context/ui_guidelines.md`](./context/ui_guidelines.md) | Cores, acessibilidade, drawer explicativo e padrão de ícones |

## Estrutura

```text
app/             interface Nuxt (componentes, composables, utils de estilo/ícones)
shared/domain/   motor de risco e schemas Zod (TypeScript puro)
tests/unit/      testes do motor e dos schemas
tests/rules/     testes das regras do Firestore (Emulator)
functions/       Cloud Functions (planejado)
firestore.rules  regras de acesso (protótipo, não publicado)
```

## Stack

Nuxt 4 + Vue 3.5 · Tailwind · `@nuxt/icon` com [Health Icons](https://healthicons.org) · Zod · Firebase (Auth/Firestore) · Vitest

## Primeiros passos

```bash
pnpm install
cp .env.example .env   # preencha com a configuração do app web no Console do Firebase
pnpm dev               # http://localhost:3000
```

## Testes

```bash
pnpm test         # motor de risco e schemas (rápido, sem dependências externas)
pnpm test:rules   # regras do Firestore no Emulator (exige Java e firebase-tools)
```

## Produção

```bash
pnpm build
pnpm preview
```

Veja a [documentação de deploy do Nuxt](https://nuxt.com/docs/getting-started/deployment). As regras do Firestore só devem ser publicadas (`firebase deploy --only firestore:rules`) depois de revisadas e com os testes de regras passando.
