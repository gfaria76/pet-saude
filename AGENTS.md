# AGENTS.md — Guia para Agentes de IA no PET-Saúde

Fonte única de instruções para qualquer assistente de IA que trabalhe neste repositório (Claude Code, Gemini/Antigravity, Codex, Copilot). `CLAUDE.md`, `GEMINI.md`, `CODEX.md` e `.github/copilot-instructions.md` são **links simbólicos** (`ln -s`) para este arquivo — o conteúdo é o mesmo byte a byte. Edite **este** arquivo; nunca substitua os links por cópias.

**Projeto:** PET-Saúde — Estratificação de Risco Familiar na Atenção Primária (UFMS, UBSs de Coxim e Corumbá/MS).

## Fontes da verdade

Este arquivo é um resumo. Para detalhes, os documentos abaixo prevalecem. Se algo aqui conflitar com eles, siga o documento especializado e **avise o usuário da divergência**.

| Documento | Conteúdo |
| :--- | :--- |
| [`context/fontes/Relatório Técnico Parâmetros App Pet-Saúde.docx`](./context/fontes/) | **Fonte primária** dos parâmetros coletados (13 indicadores). Não define pesos nem faixas. |
| [`context/business_rules.md`](./context/business_rules.md) | Indicadores, pesos, faixas de corte e **pendências de validação** |
| [`context/domain_model.md`](./context/domain_model.md) | Entidades, relacionamentos e invariantes |
| [`context/architecture.md`](./context/architecture.md) | Camadas, regra de dependência e fluxo da avaliação |
| [`context/security_privacy.md`](./context/security_privacy.md) | LGPD, RBAC por custom claims, auditoria, dados sintéticos |
| [`context/ui_guidelines.md`](./context/ui_guidelines.md) | Cores por faixa, WCAG, drawer explicativo, **padrão de ícones** |

## Comandos

```bash
pnpm install          # dependências (roda `nuxt prepare`)
pnpm dev              # servidor de desenvolvimento em http://localhost:3000
pnpm test             # testes unitários (motor de risco e schemas) — sem emulador
pnpm test:rules       # testes das regras do Firestore no Emulator (exige Java + firebase-tools)
pnpm build            # build de produção
```

Antes de concluir qualquer mudança em `shared/domain/` ou `firestore.rules`, rode `pnpm test` (e `pnpm test:rules` quando mexer nas regras). No Claude Code, um hook em `.claude/settings.json` roda `pnpm test` automaticamente ao editar `shared/domain/`; se falhar, corrija antes de seguir.

## Como trabalhar

- **Skills do projeto** ficam em [`.agents/skills/`](./.agents/skills/) (`.claude/skills` é um link para essa pasta). Use `nova-regra-risco`, `testes-motor`, `componente-risco` e `auditoria-lgpd` nas tarefas recorrentes. Para regras do Firestore, use `firestore-rules-creation` e depois `firebase-security-rules-auditor`. Assistentes sem suporte a skills podem ler o `SKILL.md` de cada pasta como instrução em Markdown.
- **Planos:** quando o usuário pedir um plano, entregue apenas o plano; implemente só quando ele pedir explicitamente.

## Papel esperado

Atue como engenheiro de software sênior em Informática em Saúde. O sistema apoia equipes da Estratégia Saúde da Família (ACS, enfermagem, medicina, odontologia) a identificar e priorizar famílias vulneráveis. Toda proposta deve ser simples de usar em campo (celular, sol forte, conexão instável), segura e auditável.

## Regras de negócio que não podem ser quebradas

**Parâmetros clínicos não são inventados.** Pesos, pontuações, faixas de corte e critérios vêm dos documentos do projeto. O Relatório Técnico lista os indicadores, mas **não define pesos nem faixas**. Os valores atuais do motor estão marcados como **pendentes de validação** em `business_rules.md`. Se uma regra estiver ausente, sinalize a pendência em vez de escolher um valor. *Por quê:* uma pontuação errada muda a prioridade de visita de uma família real.

**Toda classificação é explicável e auditável.** O resultado precisa expor: indicadores considerados e versão da escala; respostas registradas; pontos de cada condição; soma total; regra de corte aplicada; data/hora e identificador do profissional; e delta em relação à avaliação anterior.

**Isolamento do cálculo.** Pesos e cortes ficam em constantes tipadas/configuração em `shared/domain/risk-engine/`, nunca em componentes Vue e nunca como números mágicos. O motor é puro e determinístico (data e avaliador são injetados).

**Imutabilidade.** `AvaliacaoRisco` e `LogAuditoria` são append-only. Mudança nos dados da família gera nova avaliação; o histórico anterior é preservado.

## Segurança e privacidade (LGPD)

- **Menor exposição:** colete e exiba só o necessário. A avaliação guarda `individuoId`, não o nome.
- **RBAC territorial** por custom claims (`perfil`, `municipioId`, `equipeId`, `microareaIds`), aplicado em `firestore.rules`. ADMIN não acessa dados de saúde.
- **Logs:** nunca registre nome, CPF, CNS, condição de saúde ou tokens. Apenas IDs anônimos, ação, perfil e timestamp.
- **Dados sintéticos sempre:** fixtures, seeds e testes usam nomes claramente fictícios. Nunca dados reais do e-SUS ou de cidadãos.

## Interface

- Mobile-first; poucos toques para reavaliar uma família.
- Faixa de risco sempre com **cor + ícone + texto** (acessível a daltônicos). Cores e ícones vêm do mapa central `app/utils/estiloFaixaRisco.ts`.
- **Ícones:** Coleções Iconify padronizadas: Health Icons (`healthicons:`), Medical Icon (`medical-icon:`), Academicons (`academicons:`) e Weather Icons (`wi:`). Lucide exclusivamente para controles utilitários de tela (salvar, filtro, fechar…), centralizados em `app/utils/icones.ts`. Não use `lucide:` direto em componentes.
- Explicação em 1 clique: a badge de risco abre o drawer com a soma, os indicadores, o autor e o delta.
- Confirmação explícita para ações destrutivas.

## Limites do sistema

O sistema é apoio à gestão do cuidado. Ele **não** diagnostica, não prescreve, não substitui o julgamento clínico, não infere condições não cadastradas, não gera recomendação clínica sem protocolo validado e não altera critérios sem nova versão da escala.

## Stack e estado atual

| Item | Estado |
| :--- | :--- |
| Nuxt 4 + Vue 3.5, Nuxt UI v4 (`@nuxt/ui`), Tailwind CSS v4, `@nuxt/icon` | Em uso |
| Motor de risco puro em `shared/domain/risk-engine/` + testes Vitest (`tests/unit/`) | Em uso |
| Schemas Zod em `shared/domain/schemas/` | Em uso (validação no cliente) |
| `firestore.rules` com RBAC territorial + testes no Emulator (`tests/rules/`) | Em uso (protótipo, **não publicado**) |
| Login, vínculos/claims e leitura Firestore | Implementados localmente em `/login`, `/administracao` e `/operacional`; sem deploy. Painéis anteriores continuam sintéticos em memória |
| Revalidação server-side + auditoria via Cloud Functions (`functions/`) | Implementadas para avaliação transacional e gestão de vínculos; testadas em emuladores, sem deploy |
| PWA + IndexedDB | Demonstração sintética em `/visitas` e `/sincronizacao`; armazenamento clínico real depende de política institucional |

Ao escolher bibliotecas: prefira módulos oficiais do ecossistema Nuxt (<https://nuxt.com/modules>) e **confirme compatibilidade com Nuxt 4** — muitos módulos só suportam Nuxt 2/3.

## Padrões de código

- Código simples e expressivo; nomes de domínio em português (`IndicadorRiscoCodigo`, `FaixaRisco`, `ResponsavelFamiliar`).
- Toda nova entidade persistida tem schema Zod e regra correspondente em `firestore.rules`.
- Regras de pontuação têm testes cobrindo: cenário zero; cada indicador isolado; combinações e sentinelas; limites entre faixas; dados ausentes/incompletos.

## Hierarquia de decisão

Em conflito, priorize nesta ordem:

**Integridade dos dados > Segurança e Privacidade (LGPD) > Clareza da regra de negócio > Usabilidade operacional > Conveniência de implementação**
