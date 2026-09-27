---
name: nova-regra-risco
description: Implementar ou ajustar um indicador, peso, faixa de corte ou gatilho direto no motor de estratificação de risco (shared/domain/risk-engine). Use quando o pedido envolver a Escala de Risco Familiar, pesos, novos indicadores dos GATs ou versão da escala.
---

# Nova regra no motor de risco

Leia antes: `context/business_rules.md` (incluindo §5 — Pendências de validação) e `context/fontes/` (Relatório Técnico).

## 1. Confirme a origem do parâmetro

- O peso, critério ou faixa foi **fornecido pelo usuário ou está documentado** em `business_rules.md`? Se não, **não invente**: cadastre o indicador com `peso: null` ("coletado, não pontuado") e registre a pendência na tabela §5.
- Qualquer mudança de peso, faixa ou indicador pontuado exige **nova versão da escala** (nova `ConfiguracaoEscalaRisco` com `versao` própria). Nunca altere uma versão já usada em avaliações registradas.

## 2. Implemente no domínio (nunca na UI)

- `types.ts`: novo código em `IndicadorRiscoCodigo` (e `TipoSentinela`, se preciso).
- `constants.ts`: metadados em `METADADOS_INDICADORES` e peso na configuração da escala.
- Sem números mágicos: tudo em constantes tipadas.
- `app/utils/iconesIndicador.ts`: ícone `healthicons:` do novo indicador (confira o nome na coleção).
- `app/components/FormEstratificacaoRapida.vue`: inclua o código no grupo adequado.

## 3. Testes obrigatórios (`tests/unit/`)

- Indicador inativo não altera pontos.
- Indicador ativo soma exatamente o peso (ou, se `peso: null`, aparece em `indicadoresNaoPontuados` e não soma).
- Transição de faixa provocada pelo indicador (limites).
- Soma dos `fatoresDeterminantes` == `pontuacaoTotal`.
- Dados sintéticos apenas.

## 4. Documente

Atualize a tabela §2 de `business_rules.md` (e §5 se houver pendência). Rode `pnpm test`.
