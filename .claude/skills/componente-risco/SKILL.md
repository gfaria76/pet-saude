---
name: componente-risco
description: Criar ou alterar componentes Vue que exibem risco familiar (badge, drawer explicativo, painel de métricas, formulário de estratificação). Use para qualquer UI de classificação de risco, cores por faixa ou ícones.
---

# Componente de visualização de risco

Leia antes: `context/ui_guidelines.md`.

## Regras

1. **Nenhum peso ou regra de cálculo em componente.** Use `calcularEstratificacaoRisco` e constantes de `~~/shared/domain/risk-engine`.
2. **Cor + ícone + texto** sempre. Pegue cor, ícone e rótulo de `app/utils/estiloFaixaRisco.ts` (`estiloFaixa(faixa)`); não defina classes de faixa no componente.
3. **Ícones:** `healthicons:` via mapas em `app/utils/` (`icones.ts`, `iconesIndicador.ts`). Nunca `lucide:` direto no componente. Ícones decorativos com `aria-hidden="true"`.
4. **Contraste WCAG AA:** texto branco só sobre tons `-700` ou mais escuros.
5. **Drawer explicativo** (abre ao clicar na badge): pontuação e regra de corte; fatores com ícone e peso; indicadores não pontuados; autor e data reais; delta; versão da escala. Nome de membro só via `individuoId` resolvido com acesso ao prontuário.
6. **Mobile-first:** alvos de toque ≥ 44px, funciona em 360px de largura.
7. Somente dados sintéticos em exemplos.

## Verificação

`pnpm dev` e confira em largura de celular; `grep -rn "lucide:" app/components` deve voltar vazio.
