# Diretrizes de Interface e Experiência do Usuário (UI/UX) — PET-Saúde

Princípios de interface, usabilidade e acessibilidade do sistema de apoio à Atenção Primária.

---

## 1. Princípios de design clínico-operacional

Os usuários trabalham sob alta demanda, em ambientes ruidosos ou sob sol forte (visitas domiciliares de ACS em Coxim e Corumbá), muitas vezes sem internet.

1. **Poucos passos para ações frequentes:**
   - Um ACS deve registrar uma reavaliação com o mínimo de toques.
   - Nos novos formulários institucionais e de campo, respostas começam como “Não informado”; o profissional confirma “Sim” ou “Não”. A avaliação exige os 13 indicadores respondidos. Rascunhos incompletos não são classificados. Isso substitui o pré-preenchimento negativo sugerido anteriormente, preservando a distinção entre não coletado e ausente.
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

## 4. Padrão de ícones — Coleções Iconify Padronizadas

O sistema utiliza um conjunto curado e padronizado de coleções Iconify via `@nuxt/icon`, garantindo identidade clínica, rigor acadêmico, suporte à climatologia pantaneira e funcionamento 100% offline em visitas domiciliares:

1. **[Health Icons](https://healthicons.org) (`healthicons:*`, `@iconify-json/healthicons`):**
   - Saúde pública comunitária, atuação de ACS, determinantes sociais, indivíduos e faixas de risco (R0 a R3).
2. **[Medical Icon](https://icon-sets.iconify.design/medical-icon/) (`medical-icon:*`, `@iconify-json/medical-icon`):**
   - Atenção Primária à Saúde (`medical-icon:i-family-practice`), registros médicos / prontuários familiares (`medical-icon:i-medical-records`), serviços sociais em saúde e organização de equipes de cuidado (`medical-icon:i-care-staff-area`).
3. **[Academicons](https://jpswalsh.github.io/academicons/) (`academicons:*`, `@iconify-json/academicons`):**
   - Parceria acadêmica com a Universidade Federal de Mato Grosso do Sul (UFMS), protocolos científicos validados (`academicons:protocols`), ciência aberta e transparência metodológica (`academicons:open-access`, `academicons:open-data`).
4. **[Weather Icons](https://erikflowers.github.io/weather-icons/) (`wi:*`, `@iconify-json/wi`):**
   - Climatologia extrema do Pantanal e Norte de MS (Coxim e Corumbá): alternador de Modo Sol Forte (`wi:day-sunny`), alertas de calor extremo de campo (`wi:hot`), cheias/alagamentos pantaneiros (`wi:flood`) e monitoramento térmico (`wi:thermometer`).
5. **Lucide (`lucide:*`, `@iconify-json/lucide`):**
   - Exclusivamente para controles utilitários genéricos de interface (salvar, filtro, fechar, buscar, chevron, setas).

### 4.1. Regras Operacionais

1. **Mapas centrais, fora do domínio:**
   - Faixa de risco → ícone em `app/utils/estiloFaixaRisco.ts`;
   - Indicadores clínicos → ícone em `app/utils/iconesIndicador.ts`;
   - Ícones gerais, de serviços e utilitários em `app/utils/icones.ts`.
   - O motor em `shared/domain/` não conhece e não importa ícones.
2. **Semântica obrigatória:** Não utilize `lucide:` diretamente em componentes para conceitos de saúde, clima ou pesquisa acadêmica.
3. **Acessibilidade (WCAG AA):** Todo ícone decorativo deve conter `aria-hidden="true"` e vir acompanhado de texto explicativo ou rótulo semântico acessível (`aria-label`).
4. **Empacotamento Offline:** Os pacotes `@iconify-json/healthicons`, `@iconify-json/medical-icon`, `@iconify-json/academicons`, `@iconify-json/wi` e `@iconify-json/lucide` estão instalados em `devDependencies`. O `clientBundle.scan` em `nuxt.config.ts` varre todos os arquivos `app/**/*.{vue,ts}` e empacota os ícones utilizados no bundle final, viabilizando o uso sem internet nas visitas de campo.

### 4.2. Ícones por Indicador de Risco (`app/utils/iconesIndicador.ts`)

| Indicador | Coleção | Ícone |
| :--- | :--- | :--- |
| Acamado | Health Icons | `healthicons:hospitalized` |
| Deficiência física | Health Icons | `healthicons:wheelchair` |
| Deficiência mental | Health Icons | `healthicons:mental-health` |
| Desnutrição grave | Health Icons | `healthicons:malnutrition` |
| Drogadição (álcool/drogas) | Health Icons | `healthicons:alcohol` |
| Desemprego | Health Icons | `healthicons:low-income-level` |
| Analfabetismo | Health Icons | `healthicons:book` |
| Menor de 6 meses | Health Icons | `healthicons:baby-0306m` |
| Maior de 70 anos | Health Icons | `healthicons:elderly` |
| Hipertensão | Health Icons | `healthicons:blood-pressure` |
| Diabetes | Health Icons | `healthicons:diabetes` |
| Saneamento inadequado | Health Icons | `healthicons:water-sanitation` |
| Relação morador/cômodo | Health Icons | `healthicons:i-groups-perspective-crowd` |

### 4.3. Mapa de Ícones do Sistema (`app/utils/icones.ts`)

| Domínio de Uso | Coleção | Ícone |
| :--- | :--- | :--- |
| **Atenção Primária à Saúde** | Medical Icon | `medical-icon:i-family-practice` |
| **Prontuário Familiar** | Medical Icon | `medical-icon:i-medical-records` |
| **Equipe de Saúde e Cuidado** | Medical Icon | `medical-icon:i-care-staff-area` |
| **Serviço Social na APS** | Medical Icon | `medical-icon:i-social-services` |
| **ACS / Avaliador** | Health Icons | `healthicons:community-healthworker-outline` |
| **Família / Indivíduo** | Health Icons | `healthicons:ui-folder-family-outline` / `healthicons:person-outline` |
| **UBS / Município** | Health Icons | `healthicons:ambulatory-clinic-outline` / `healthicons:city-outline` |
| **Selo de Proteção LGPD** | Health Icons | `healthicons:health-data-security-outline` |
| **Modo Sol Forte** | Weather Icons | `wi:day-sunny` |
| **Alerta Climatológico / Calor** | Weather Icons | `wi:hot` |
| **Cheias e Alagamentos Pantanal** | Weather Icons | `wi:flood` |
| **Temperatura de Campo** | Weather Icons | `wi:thermometer` |
| **Pesquisa e Parceria UFMS** | Academicons | `academicons:open-access` |
| **Protocolo Científico** | Academicons | `academicons:protocols` |
| **Dados Abertos e Transparência** | Academicons | `academicons:open-data` |
| **Controles de Interface (Lucide)** | Lucide | `lucide:save`, `filter`, `x`, `search`, `check`, `scale`, `arrow-left`, `chevron-right`, `plus` |

## 5. Temas de gestão e campo (Nuxt UI 4)

- Configuração global em `app/app.config.ts`, dentro do diretório de aplicação do Nuxt 4; conferir a versão instalada antes de alterar props ou slots.
- Paleta operacional `primary: cyan`, `neutral: slate`; semântica clínica permanece no mapa `estiloFaixaRisco.ts`.
- Usar tokens semânticos (`bg-default`, `text-default`, `text-muted`, `border-default`) para acompanhar os modos claro e escuro. Customizações locais usam a prop `ui` com os slots reais de cada componente.
- O seletor oferece Sistema, Claro e Escuro. Sol forte ativa leitura clara com tokens de alto contraste e restaura a preferência anterior ao desligar.
- Gestão usa cabeçalho e sidebar recolhível a partir de telas largas; telas menores mantêm navegação inferior e controles de leitura.
- `pnpm typecheck` verifica contratos Vue/TypeScript; complementar com build e inspeção no navegador.
