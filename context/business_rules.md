# Regras de Negócio e Estratificação de Risco (Escala Coelho-Savassi)

Este documento descreve as regras de negócio de domínio para a **Estratificação de Risco Familiar** no sistema PET-Saúde.

---

## 1. Fundamentação Teórica: Escala Coelho-Savassi (ERF-CS)

A Escala de Risco Familiar desenvolvida por Coelho e Savassi (2004) tem como objetivo determinar a prioridade de atenção das equipes de Saúde da Família sobre as famílias de um território adscrito.

A escala avalia **sentinelas biológicos, sociais e ambientais** atribuindo pesos pontuados a cada condição identificada no domicílio ou núcleo familiar.

> **IMPORTANTE**: Os pesos e limites listados abaixo representam a formulação clássica de referência. O sistema deve tratar todos os pesos e faixas como **parâmetros de negócio configuráveis**, permitindo customizações validadas pelas coordenações de APS de Coxim e Corumbá.

> **Implementação Canônica**: A versão vigente destes parâmetros (`COELHO_SAVASSI_V1`) está codificada em `shared/domain/risk-engine/constants.ts` e `shared/domain/risk-engine/types.ts`, e é consumida pelo motor puro em `shared/domain/risk-engine/calculadora.ts`. Este documento e o código-fonte devem permanecer sincronizados — qualquer alteração de peso, indicador ou faixa de corte deve ser refletida em ambos, com o devido versionamento da escala (`versaoEscala`).

---

## 2. Indicadores de Risco de Referência

Abaixo constam as condições sentinelas canônicas frequentemente adotadas na ERF-CS:

| Código | Condição Sentinela | Peso Referência | Tipo de Sentinela |
| :--- | :--- | :---: | :--- |
| `IND_ACAMADO` | Pessoa acamada no domicílio | **3** | Biológico / Dependência |
| `IND_DEFICIENCIA_FISICA` | Portador de deficiência física severa | **3** | Biológico / Dependência |
| `IND_DEFICIENCIA_MENTAL` | Portador de sofrimento mental severo / deficiência intelectual | **3** | Biológico / Dependência |
| `IND_DESNUTRICAO_GRAVE` | Desnutrição grave (criança, gestante ou idoso) | **3** | Biológico / Nutricional |
| `IND_DROGADICAO` | Uso abusivo de álcool e/ou outras drogas | **2** | Social / Comportamental |
| `IND_DESEMPREGO` | Desemprego do provedor familiar | **2** | Social / Econômico |
| `IND_ANALFABETISMO` | Analfabetismo no núcleo familiar | **1** | Social / Escolaridade |
| `IND_MENOR_6_MESES` | Criança menor de 6 meses no domicílio | **1** | Biológico / Ciclo de Vida |
| `IND_MAIOR_70_ANOS` | Pessoa com 70 anos ou mais | **1** | Biológico / Idoso |
| `IND_HIPERTENSAO` | Hipertensão arterial sistêmica | **1** | Biológico / Crônico |
| `IND_DIABETES` | Diabetes mellitus | **1** | Biológico / Crônico |
| `IND_SANEAMENTO_INADEQUADO` | Ausência de rede de esgoto / água encanada tratada | **1** | Ambiental / Sanitário |
| `IND_ADENSAMENTO_EXCESSIVO` | Mais de 1 pessoa por cômodo (relação morador/cômodo > 1) | **1** | Social / Habitacional |

---

## 3. Faixas de Classificação de Risco

A pontuação total é obtida pelo somatório simples das pontuações dos indicadores ativos na família:

$$\text{Pontuação Total} = \sum_{i=1}^{n} \text{peso}(\text{indicador}_i)$$

| Pontuação Total | Classificação de Risco | Sigla | Ação Recomendada na APS |
| :---: | :--- | :---: | :--- |
| **0** | **Sem Risco Identificado** | `R0` | Acompanhamento padrão / rotina da UBS |
| **1 a 4** | **Risco Menor** | `R1` | Visita periódica programada / monitoramento |
| **5 a 6** | **Risco Médio** | `R2` | Acompanhamento prioritário / intervenção da equipe |
| **$\ge$ 7** | **Risco Máximo** | `R3` | Prioridade máxima / visita imediata e plano de cuidado singular |

---

## 4. Requisitos do Motor de Cálculo (Calculation Engine)

1. **Idempotência**: O cálculo para um mesmo conjunto de dados cadastrais e versão de escala deve produzir sempre o mesmo resultado.
2. **Imutabilidade Histórica**: A avaliação de risco gerada em uma data é um registro imutável no banco. Se os dados da família mudarem, uma **nova avaliação** é gerada, mantendo o histórico anterior preservado.
3. **Delta Explicativo**: Quando uma nova avaliação é registrada, o motor deve calcular a diferença em relação à avaliação anterior:
   - Houve aumento ou redução de risco?
   - Quais condições foram adicionadas ou resolvidas?
   - Qual foi a variação de pontuação ($\Delta$ pontos)?
4. **Alerta de Condições Graves (Gatilhos Especiais)**: Caso o município defina condições que elevam automaticamente a família a Risco Máximo (mesmo com pontuação total baixa), essa regra deve ser explícita na configuração e apontada como fator determinante no relatório de auditoria.
