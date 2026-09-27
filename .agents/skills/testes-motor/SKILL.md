---
name: testes-motor
description: Escrever ou ampliar testes unitários (Vitest) do motor de estratificação de risco e dos schemas Zod em tests/unit. Use ao criar/alterar regras de pontuação, cortes, delta ou schemas.
---

# Testes do motor de risco e dos schemas

Arquivos: `tests/unit/*.spec.ts`. Rodar com `pnpm test`.

## Cobertura exigida (AGENTS.md — padrões de código)

1. **Cenário zero:** família sem vulnerabilidades ⇒ 0 pontos, `SEM_RISCO_R0`.
2. **Cada indicador isolado** (`it.each` sobre `METADADOS_INDICADORES`) soma o peso da configuração.
3. **Combinações e gatilhos diretos** (`condicoesAgravantesDiretas`).
4. **Limites entre faixas** usando os valores de `LIMITES_CORTE_*` (não números soltos): último ponto de cada faixa e primeiro da seguinte.
5. **Dados ausentes/incompletos:** lista vazia, indicador desconhecido (erro), indicador duplicado (conta uma vez), `peso: null` (não soma).
6. **Delta:** `AGRAVAMENTO`, `ESTAVEL`, `MELHORIA`; fatores adicionados e resolvidos.
7. **Determinismo:** mesma entrada + mesma escala + mesmo `contexto` ⇒ resultado idêntico (`toEqual`).
8. **Explicabilidade:** soma dos `fatoresDeterminantes` == `pontuacaoTotal`; resultado traz `avaliadorId` e `versaoEscala`.
9. **Schemas:** `AvaliacaoRiscoSchema` rejeita soma inconsistente e campos obrigatórios ausentes.

## Regras

- Sempre passe `contexto` fixo (data e avaliador fictícios) — nunca dependa do relógio.
- Somente dados sintéticos (`fam-ficticia-001`, `"Cidadão Fictício A"`).
- Não escreva pesos esperados "de cabeça": derive da configuração da escala sob teste.
