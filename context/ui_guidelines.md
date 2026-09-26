# Diretrizes de Interface e Experiência do Usuário (UI/UX) — PET-Saúde

Este documento define os princípios de design de interface, usabilidade e acessibilidade para o sistema de apoio à Atenção Primária à Saúde.

---

## 1. Princípios de Design Clínico-Operacional

Os usuários do sistema operam sob alta carga de trabalho, em ambientes ruidosos ou sob luz solar intensa (visitas domiciliares de ACS em Coxim e Corumbá).

1. **Poucos Passos para Ações Frequentes**:
   - Um ACS deve conseguir registrar uma reavaliação de risco com o menor número possível de toques/cliques.
   - Campos com respostas padrão ("Não" / "Ausente") devem ser preenchidos por omissão inteligente com salvamento explícito.
2. **Formulários Objetivos e Agrupados**:
   - Agrupar condições por afinidade: Condições do Domicílio / Saneamento, Condições Sociais, Condições Clínicas / Biológicas.
3. **Prevenção Ativa de Erros**:
   - Confirmação em duas etapas para ações críticas (ex.: inativação de família, alteração de responsável familiar).
   - Validações em tempo real com mensagens em linguagem humana e acolhedora (evitar jargões técnicos de programação).

---

## 2. Acessibilidade e Semântica de Cores (WCAG 2.1 AA)

> **REGRA FUNDAMENTAL**: Nunca confie apenas na cor para transmitir a classificação de risco. Combine sempre **cor + ícone + texto explícito** para garantir usabilidade por profissionais com daltonismo ou sob telas com reflexo solar.

| Faixa de Risco | Cor Base | Ícone Sugerido | Rótulo Textual Obrigatório | Contraste Mínimo |
| :--- | :--- | :---: | :--- | :---: |
| **Sem Risco (R0)** | `#15803D` (Verde Esmeralda Escuro) | `✓` (Check) | `"Sem Risco Identificado (R0)"` | $\ge 4.5:1$ sobre branco |
| **Risco Menor (R1)** | `#B45309` (Âmbar Queimado) | `ℹ` (Informação) | `"Risco Menor (R1)"` | $\ge 4.5:1$ sobre branco |
| **Risco Médio (R2)** | `#C2410C` (Laranja Intenso) | `⚠` (Atenção) | `"Risco Médio (R2)"` | $\ge 4.5:1$ sobre branco |
| **Risco Máximo (R3)** | `#B91C1C` (Vermelho Rubi Escuro) | `⚡` / `🚨` (Alerta Crítico) | `"Risco Máximo (R3)"` | $\ge 4.5:1$ sobre branco |

---

## 3. O Componente de Risco Explicável (Explainable Risk Drawer)

Toda vez que a classificação de risco for exibida (em cards, linhas de tabela ou painel geral), ela deve ser clicável/acionável.

Ao clicar na badge de risco, o sistema abre uma **gaveta lateral (drawer)** ou **modal acessível** contendo:
1. **Pontuação Total Consolidada** com a regra de corte aplicada (ex.: `"7 Pontos — Limiar para Risco Médio: 5 a 6 pontos"`).
2. **Lista Decomposta de Condições**:
   - Cada indicador pontuado listado com seu peso individual;
   - Nome do indivíduo da família que motivou a pontuação (quando aplicável, ex.: `"Hipertensão — Maria da Silva"`).
3. **Data e Autor da Avaliação**:
   - `"Avaliado por: ACS João Santos em 15/08/2026 às 14:30"`.
4. **Histórico Comparativo (Delta)**:
   - Indicador visual se a família piorou, manteve ou melhorou o risco em relação à visita anterior.
