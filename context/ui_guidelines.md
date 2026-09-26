# Diretrizes de Interface e Experiência do Usuário (UI/UX) — PET-Saúde

Princípios de interface, usabilidade e acessibilidade do sistema de apoio à Atenção Primária.

---

## 1. Princípios de design clínico-operacional

Os usuários trabalham sob alta demanda, em ambientes ruidosos ou sob sol forte (visitas domiciliares de ACS em Coxim e Corumbá), muitas vezes sem internet.

1. **Poucos passos para ações frequentes:**
   - Um ACS deve registrar uma reavaliação com o mínimo de toques.
   - Campos com resposta padrão ("Não" / "Ausente") vêm preenchidos, com salvamento explícito.
2. **Formulários objetivos e agrupados:** Domicílio / Saneamento; Condições Sociais; Condições Clínicas / Biológicas; Ciclo de Vida.
3. **Prevenção ativa de erros:**
   - Confirmação em duas etapas para ações críticas (inativar família, trocar responsável familiar).
   - Validação em tempo real com mensagens em linguagem acolhedora, sem jargão técnico.

---

## 2. Acessibilidade e semântica de cores (WCAG 2.1 AA)

> **Regra fundamental:** nunca use só a cor para transmitir a faixa de risco. Combine sempre **cor + ícone + texto**, para profissionais com daltonismo e telas com reflexo solar.

A implementação única dessas combinações fica em `app/utils/estiloFaixaRisco.ts`; componentes não definem cores ou ícones de faixa por conta própria.

| Faixa | Cor base (Tailwind) | Ícone | Rótulo textual obrigatório | Contraste sobre branco |
| :--- | :--- | :--- | :--- | :---: |
| **Sem Risco (R0)** | `#15803D` (`green-700`) | `healthicons:yes` | "Sem Risco Identificado (R0)" | ≥ 4,5:1 |
| **Risco Menor (R1)** | `#B45309` (`amber-700`) | `healthicons:info` | "Risco Menor (R1)" | ≥ 4,5:1 |
| **Risco Médio (R2)** | `#C2410C` (`orange-700`) | `healthicons:alert-triangle` | "Risco Médio (R2)" | ≥ 4,5:1 |
| **Risco Máximo (R3)** | `#B91C1C` (`red-700`) | `healthicons:alert` | "Risco Máximo (R3)" | ≥ 4,5:1 |

Texto branco sobre fundo colorido só é permitido com os tons acima (ou mais escuros). Tons `-600` ou mais claros com texto branco **não** atingem 4,5:1.

---

## 3. Componente de risco explicável (drawer)

Toda classificação exibida (cards, linhas de tabela, painel) é clicável e abre uma **gaveta lateral** ou **modal acessível** com:

1. **Pontuação total e regra de corte aplicada** (ex.: "7 pontos — Risco Máximo: 7 ou mais").
2. **Lista decomposta de condições:**
   - cada indicador com ícone, descrição e peso;
   - indicadores **não pontuados** nesta versão da escala aparecem separados, sem pontos;
   - membro da família associado (quando houver): o nome é resolvido pelo `individuoId` apenas para quem tem acesso ao prontuário; caso contrário, "membro da família" (ver [`security_privacy.md`](./security_privacy.md) §2).
3. **Data e autor reais da avaliação:** "Avaliado por: {perfil} {nome} em 15/08/2026 às 14:30" — nunca um texto genérico.
4. **Histórico comparativo (delta):** se a família piorou, manteve ou melhorou em relação à avaliação anterior, com condições adicionadas e resolvidas.
5. **Versão da escala** usada no cálculo.

---

## 4. Padrão de ícones — Health Icons

O conjunto padrão do app é **[Health Icons](https://healthicons.org)** (`healthicons:*`, licença MIT, pacote `@iconify-json/healthicons`), servido pelo `@nuxt/icon`. Ele foi desenhado para saúde pública e cobre ACS, UBS, condições clínicas e determinantes sociais.

### 4.1. Regras

1. **Health Icons primeiro:** todo ícone com significado de saúde, pessoa, território ou risco usa `healthicons:`.
2. **Lucide só como exceção**, para controles genéricos que não existem na coleção (salvar, filtro, fechar, buscar, cadeado, tendência etc.). As exceções ficam listadas em `app/utils/icones.ts`; **não use `lucide:` direto em componentes**.
3. **Variantes:** a preenchida (`healthicons:<nome>`) indica estado de risco (badges, cards de faixa); a `-outline` é usada em navegação e ícones neutros.
4. **Mapas centrais, fora do domínio:** faixa → ícone em `app/utils/estiloFaixaRisco.ts`; indicador → ícone em `app/utils/iconesIndicador.ts`; ícones gerais e exceções Lucide em `app/utils/icones.ts`. O motor em `shared/domain/` não conhece ícones.
5. **Acessibilidade:** ícone sempre com `aria-hidden="true"` e acompanhado de texto.
6. **Offline:** os ícones usados são empacotados no bundle do cliente (`icon.clientBundle.scan` no `nuxt.config.ts`), para funcionar sem internet em visita domiciliar. Como os mapas ficam em arquivos `.ts`, o `globInclude` do scan inclui `app/**/*.ts` além dos `.vue` (por padrão o `@nuxt/icon` só varre `.vue`).

### 4.2. Ícones por indicador

| Indicador | Ícone |
| :--- | :--- |
| Acamado | `healthicons:hospitalized` |
| Deficiência física | `healthicons:wheelchair` |
| Deficiência mental | `healthicons:mental-health` |
| Desnutrição grave | `healthicons:malnutrition` |
| Drogadição (álcool/drogas) | `healthicons:alcohol` |
| Desemprego | `healthicons:low-income-level` |
| Analfabetismo | `healthicons:book` |
| Menor de 6 meses | `healthicons:baby-0306m` |
| Maior de 70 anos | `healthicons:elderly` |
| Hipertensão | `healthicons:blood-pressure` |
| Diabetes | `healthicons:diabetes` |
| Saneamento inadequado | `healthicons:water-sanitation` |
| Relação morador/cômodo | `healthicons:i-groups-perspective-crowd` |

### 4.3. Ícones gerais

| Uso | Ícone |
| :--- | :--- |
| Logo do app / ACS | `healthicons:community-healthworker` |
| Família | `healthicons:ui-folder-family` |
| Pessoa / avaliador | `healthicons:person` |
| UBS / município | `healthicons:ambulatory-clinic` / `healthicons:city` |
| Selo LGPD | `healthicons:health-data-security` |
| Data da avaliação | `healthicons:calendar` |
| Registro confirmado | `healthicons:i-documents-accepted` |
| Estado vazio | `healthicons:question-circle` |

Os nomes foram conferidos na API do Iconify; a escolha visual final deve ser validada com a equipe de campo.
