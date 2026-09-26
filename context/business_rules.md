# Regras de Negócio e Estratificação de Risco

Este documento descreve as regras de domínio da **Estratificação de Risco Familiar** do PET-Saúde.

> **Fonte primária dos parâmetros:** [`context/fontes/Relatório Técnico Parâmetros App Pet-Saúde.docx`](./fontes/). Ele define **quais** dados são coletados (seção 2), mas **não define pesos nem faixas de corte**. Todo valor numérico abaixo sem fonte citada é uma **pendência de validação** (ver [§5](#5-pendências-de-validação)).
>
> **Implementação canônica:** `shared/domain/risk-engine/` (`types.ts`, `constants.ts`, `calculadora.ts`). Este documento e o código devem ficar sincronizados. Qualquer mudança de peso, indicador ou faixa exige **nova versão da escala** (`versaoEscala`).

---

## 1. Fundamentação

O relatório descreve o sistema como "inspirado em escalas validadas na Atenção Básica (como a Escala de Risco de Coelho-Savassi)". A Escala de Risco Familiar de Coelho e Savassi (ERF-CS, 2004) atribui pesos a **sentinelas** biológicas, sociais e ambientais observadas na família e soma esses pesos em um escore.

Os pesos e faixas aqui são **parâmetros de negócio configuráveis**, a serem validados pelas coordenações de APS de Coxim e Corumbá e pelos GATs do PET-Saúde.

---

## 2. Indicadores coletados

Os 13 indicadores abaixo são os listados na seção 2 do Relatório Técnico (conferidos com o código). A coluna "Peso atual" mostra o valor em uso na versão `COELHO_SAVASSI_V1` do motor — **nenhum desses pesos tem fonte documentada no projeto** (pendência P1).

| Código | Condição sentinela | Categoria no relatório | Peso atual | Tipo de sentinela |
| :--- | :--- | :--- | :---: | :--- |
| `IND_ACAMADO` | Pessoa acamada no domicílio | Saúde e limitações físicas | 3 ⚠️ | Biológico / Dependência |
| `IND_DEFICIENCIA_FISICA` | Deficiência física | Saúde e limitações físicas | 3 ⚠️ | Biológico / Dependência |
| `IND_DEFICIENCIA_MENTAL` | Deficiência mental | Saúde e limitações físicas | 3 ⚠️ | Biológico / Dependência |
| `IND_DESNUTRICAO_GRAVE` | Desnutrição grave | Saúde e limitações físicas | 3 ⚠️ | Biológico / Nutricional |
| `IND_DROGADICAO` | Dependente químico (álcool/drogas) | Vulnerabilidade social | 2 ⚠️ | Social / Comportamental |
| `IND_DESEMPREGO` | Desemprego | Vulnerabilidade social | 2 ⚠️ | Social / Econômico |
| `IND_ANALFABETISMO` | Analfabetismo | Vulnerabilidade social | 1 ⚠️ | Social / Escolaridade |
| `IND_MENOR_6_MESES` | Menor de 6 meses | Faixas etárias de risco | 1 ⚠️ | Biológico / Ciclo de vida |
| `IND_MAIOR_70_ANOS` | Maior de 70 anos | Faixas etárias de risco | 1 ⚠️ | Biológico / Ciclo de vida |
| `IND_HIPERTENSAO` | Hipertensão arterial sistêmica | Saúde e limitações físicas | 1 ⚠️ | Biológico / Crônico |
| `IND_DIABETES` | Diabetes mellitus | Saúde e limitações físicas | 1 ⚠️ | Biológico / Crônico |
| `IND_SANEAMENTO_INADEQUADO` | Condições de saneamento baixas | Vulnerabilidade social e ambiente | 1 ⚠️ | Ambiental / Sanitário |
| `IND_ADENSAMENTO_EXCESSIVO` | Relação morador por cômodo (> 1) | Vulnerabilidade social e ambiente | 1 ⚠️ | Social / Habitacional |

⚠️ = peso pendente de validação.

### 2.1. Dados de identificação (relatório, seção 2)

ACS/microárea; endereço da família e contato; nome do responsável/entrevistado. O relatório **não** lista CPF nem CNS — por minimização (LGPD), esses campos são opcionais no modelo.

---

## 3. Faixas de classificação (pendentes de validação — P2)

Pontuação total = soma dos pesos dos indicadores **pontuados** presentes na família:

$$\text{Pontuação Total} = \sum_{i=1}^{n} \text{peso}(\text{indicador}_i)$$

| Pontuação atual | Classificação | Sigla | Ação de referência na APS |
| :---: | :--- | :---: | :--- |
| 0 | Sem Risco Identificado | `R0` | Acompanhamento de rotina da UBS |
| 1 a 4 | Risco Menor | `R1` | Visita periódica programada / monitoramento |
| 5 a 6 | Risco Médio | `R2` | Acompanhamento prioritário |
| ≥ 7 | Risco Máximo | `R3` | Prioridade máxima / plano de cuidado singular |

As ações de referência são orientação de gestão do cuidado, não conduta clínica.

---

## 4. Requisitos do motor de cálculo

1. **Determinismo e idempotência:** mesma entrada + mesma versão da escala + mesmo contexto ⇒ mesmo resultado. A data da avaliação e o avaliador são **injetados** (`contexto`), nunca lidos do relógio dentro do motor.
2. **Autoria:** o resultado registra `avaliadorId` e `avaliadorPerfil`.
3. **Imutabilidade histórica:** uma avaliação registrada nunca é alterada. Mudou a família ⇒ nova avaliação, com o histórico preservado.
4. **Delta explicativo:** em relação à avaliação anterior, informar se o risco agravou, ficou estável ou melhorou; quais condições foram adicionadas ou resolvidas; e a variação de pontos.
5. **Gatilhos diretos:** se o município definir condições que elevam direto a R3, elas ficam explícitas na configuração (`condicoesAgravantesDiretas`) e aparecem como fator determinante. Hoje **nenhum** gatilho está definido.
6. **Indicador duplicado:** o mesmo código informado mais de uma vez conta **uma única vez** (comportamento provisório — pendência P4).
7. **Indicador não pontuado:** um indicador pode estar na escala com `peso: null` — é **coletado e exibido**, mas não entra na soma. Serve para os GATs começarem a coletar variáveis novas sem inventar peso. A explicação mostra esses indicadores como "não pontuado nesta versão da escala".

---

## 5. Pendências de validação

| # | Pendência | Situação atual no código | Quem valida |
| :--- | :--- | :--- | :--- |
| P1 | **Pesos dos 13 indicadores** não têm fonte no relatório. Confirmar na publicação original (Coelho & Savassi, 2004) e com a coordenação. Há indícios de que a escala original use pesos diferentes (por exemplo, para saneamento). | Pesos da tabela §2 | Coordenação APS + GATs |
| P2 | **Faixas de corte** não têm fonte no relatório. Há indícios de que a escala original use cortes diferentes (por exemplo, R1 a partir de 5 pontos). Confirmar. | 0 / 1–4 / 5–6 / ≥7 | Coordenação APS + GATs |
| P3 | **Relação morador/cômodo** é tratada pelo relatório como variável graduada; o código usa um booleano (> 1). | Booleano, peso 1 | GATs |
| P4 | **Indicador repetido** (ex.: dois hipertensos na família): pontua uma vez ou por pessoa? | Conta uma vez | Coordenação APS |
| P5 | **Novos indicadores propostos** (relatório §3–4), ainda sem definição nem peso: gestante na residência; insegurança alimentar (graus); saúde mental (ansiedade, depressão); situação vacinal; acompanhamento de pré-natal; tipo de construção (alvenaria, madeira, lona…); exposição a risco biológico (lixões, áreas vulneráveis); violência doméstica; recebimento de benefícios sociais; acesso a transporte; agravos regionais/endêmicos e exposições ocupacionais ligados à vertente **Pet-Saúde: Clima**. | Não implementados | GATs |

Enquanto uma pendência estiver aberta, a interface e os documentos não devem apresentar o valor correspondente como "validado".
