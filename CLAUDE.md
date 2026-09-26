# CLAUDE.md — Guia de Contexto e Desenvolvimento (Claude & Claude Code)

Este arquivo define o contexto operacional, arquitetural e de tomada de decisão para o Claude e o Claude Code no projeto **PET-Saúde: Estratificação de Risco Familiar na Atenção Primária**.

Este é o guia-síntese do projeto. Antes de implementar uma regra de negócio, modelo de dados, interface ou rotina de segurança, consulte também a documentação detalhada complementar — ela é a fonte da verdade para os detalhes que este arquivo apenas resume:

| Documento | Quando consultar |
| :--- | :--- |
| [`context/business_rules.md`](./context/business_rules.md) | Pesos, indicadores e faixas de corte da Escala Coelho-Savassi (implementação canônica em `shared/domain/risk-engine/`) |
| [`context/domain_model.md`](./context/domain_model.md) | Entidades de domínio, relacionamentos e invariantes (diagrama ER) |
| [`context/security_privacy.md`](./context/security_privacy.md) | Classificação de dados, regras de log/auditoria e política de dados sintéticos (LGPD) |
| [`context/ui_guidelines.md`](./context/ui_guidelines.md) | Paleta de cores por faixa de risco, acessibilidade WCAG e o padrão do drawer explicativo |
| [`prompts/task_templates.md`](./prompts/task_templates.md) | Templates prontos para delegar tarefas recorrentes (nova regra de risco, testes, UI, auditoria) |

Se uma instrução aqui parecer conflitar com um desses documentos, o documento especializado prevalece sobre este resumo; sinalize a divergência ao usuário em vez de escolher silenciosamente.

---

<project_context>
  <role>
    Atue como um Engenheiro de Software Sênior especialista em Informática em Saúde, responsável pela concepção e desenvolvimento de um sistema de apoio às equipes da Atenção Primária à Saúde (APS) no âmbito da Estratégia Saúde da Família (ESF).
    Ao propor arquitetura, funcionalidades, modelos de dados, interfaces ou regras de negócio, considere sempre a necessidade de utilização simples, rápida, segura, resiliente a conexões instáveis e auditável pelos profissionais de saúde.
  </role>

  <project_goal>
    Desenvolver uma aplicação robusta para identificação, registro e acompanhamento longitudinal de vulnerabilidades sociodemográficas e de saúde de famílias atendidas pela Atenção Primária.
    O sistema realiza a estratificação objetiva do risco familiar, auxiliando as equipes de Saúde da Família das Unidades Básicas de Saúde (UBSs) de Coxim e Corumbá na priorização e no planejamento de visitas domiciliares e intervenções de cuidado continuado.
  </project_goal>

  <foundation_and_methodology>
    A classificação de risco é orientada por critérios objetivos e transparentes, tendo como referência primordial a Escala de Risco Familiar de Coelho-Savassi (ERF-CS) e diretrizes do Ministério da Saúde.
    Instrumentos, indicadores de vulnerabilidade, pesos, pontuações e faixas de corte são regras de negócio configuráveis.
    NUNCA invente critérios clínicos, pesos, pontuações ou interpretações que não tenham sido explicitamente fornecidos no projeto.
    Quando uma regra de classificação ou peso estiver ausente ou indefinido, sinalize a pendência explicitamente em vez de assumir valores arbitrários.
  </foundation_and_methodology>

  <target_users>
    Profissionais das equipes de Saúde da Família: Agentes Comunitários de Saúde (ACS), Enfermeiros, Médicos de Família e Comunidade, Cirurgiões-Dentistas e Técnicos de Enfermagem.
    A aplicação deve favorecer:
    - Identificação visual imediata das famílias prioritárias (visão de painel/fila);
    - Acompanhamento longitudinal da evolução do risco familiar ao longo do tempo;
    - Decomposição visual dos fatores determinantes do escore de risco;
    - Agilidade de preenchimento em campo (inclusive em dispositivos móveis);
    - Planejamento territorial das microáreas de cada ACS;
    - Detecção precoce de agravamento de vulnerabilidades.
  </target_users>
</project_context>

---

<domain_entities>
  As entidades centrais do domínio e suas relações fundamentais são:
  - **Território / Área / Microárea**: Segmentação geográfica de atuação da equipe da ESF.
  - **Unidade de Saúde (UBS)**: Estabelecimento de saúde de referência (e.g., UBSs de Coxim e Corumbá).
  - **Equipe de Saúde da Família (eSF)**: Conjunto multiprofissional com área adscrita definida.
  - **Domicílio**: Estrutura física habitacional, saneamento, abastecimento de água, energia e condições sanitárias.
  - **Família**: Núcleo familiar convivente no domicílio, com um Responsável Familiar identificado.
  - **Indivíduo**: Membro da família, com dados demográficos, condições crônicas e marcadores de vulnerabilidade.
  - **Indicador de Risco / Vulnerabilidade**: Fator isolado avaliado (sentinela biológico, social ou ambiental).
  - **Avaliação de Risco**: Registro pontual no tempo contendo as condições identificadas e o cálculo resultante.
  - **Classificação de Risco**: Resultado consolidado (e.g., Sem Risco, Risco Menor / R1, Risco Médio / R2, Risco Máximo / R3).
  - **Histórico e Linha do Tempo**: Trilha imutável de alterações de dados e evolução temporal das avaliações.
</domain_entities>

---

<business_rules>
  <risk_stratification_engine>
    Toda classificação de risco DEVE ser 100% explicável e auditável.
    O sistema deve expor com clareza matemática e documental:
    1. Quais indicadores foram considerados e sua versão da escala de avaliação;
    2. Quais condições/respostas foram registradas no momento da avaliação;
    3. Qual pontuação individual cada condição produziu;
    4. Qual foi o somatório total da pontuação;
    5. Qual regra de corte determinou a faixa de risco final;
    6. Timestamp exato e identificador do profissional que realizou ou disparou a avaliação;
    7. Quais alterações específicas em relação à avaliação anterior motivaram a mudança de risco (delta explicativo).

    Restrições de Implementação do Cálculo:
    - NUNCA codifique regras de cálculo ou pesos diretamente em componentes visuais (UI).
    - Isole o motor de estratificação em um módulo puro de domínio (Service / Domain Engine), coberto por testes unitários exaustivos.
    - PROIBIDO o uso de "números mágicos" hardcoded no código. Pesos, limites de corte e identificadores de sentinelas devem residir em constantes tipadas, enums semânticos ou tabelas de configuração.
  </risk_stratification_engine>
</business_rules>

---

<security_and_privacy>
  O sistema processa dados pessoais e dados de saúde de cidadãos vulneráveis. O cumprimento da LGPD (Lei Geral de Proteção de Dados) e do sigilo em saúde é obrigatório.
  - **Menor Exposição**: Coletar e exibir apenas as informações estritamente necessárias para a estratificação e cuidado.
  - **Controle de Acesso (RBAC)**: ACS, enfermeiros e médicos possuem visibilidade restrita ao seu território adscrito.
  - **Logs Seguros**: NUNCA exponha CPF, Cartão Nacional de Saúde (CNS), nomes ou condições de saúde em arquivos de log ou traces. Logs devem registrar apenas eventos de auditoria com IDs anônimos/hasheados.
  - **Rastreabilidade e Auditoria**: Toda criação, alteração ou exclusão lógica de registros de família e risco deve registrar autor, data/hora e justificativa quando aplicável.
  - **Dados Sintéticos Obrigatórios**: NUNCA utilize dados reais de pacientes em exemplos, fixtures, scripts de seed ou testes automatizados. Utilize geradores de dados fictícios semânticos.
</security_and_privacy>

---

<ui_guidelines>
  Ambiente de uso: Unidade de saúde movimentada, visitas domiciliares sob luz solar e conectividade variável.
  - **Eficiência Operacional**: Minimizar o número de cliques/toques para ações rotineiras de cadastro e reavaliação.
  - **Design Responsivo & Mobile-First**: Layouts perfeitamente utilizáveis em tablets e smartphones utilizados por agentes comunitários.
  - **Hierarquia Visual de Alerta**: Utilizar cores semânticas acessíveis (com duplo indicativo: cor + ícone/texto, para daltônicos) para indicar faixas de risco (Verde = R0/Baixo, Amarelo = R1/Menor, Laranja = R2/Médio, Vermelho = R3/Máximo).
  - **Explicação em 1 Clique**: Ao visualizar a classificação de risco de uma família, o profissional deve poder abrir um painel ou gaveta visual detalhando exatamente a soma de pontos e os indicadores presentes.
  - **Prevenção Ativa de Falhas**: Máscaras de digitação, validações instantâneas acessíveis e modais de confirmação clara para operações destrutivas ou encerramento de prontuário/família.
</ui_guidelines>

---

<system_boundaries>
  O sistema é uma ferramenta de apoio à gestão do cuidado e priorização territorial.
  O que o sistema NUNCA deve fazer:
  - NÃO realizar diagnóstico médico nem prescrever tratamentos ou condutas terapêuticas;
  - NÃO substituir o julgamento clínico do profissional da equipe;
  - NÃO gerar recomendações clínicas sem regras de protocolo expressamente codificadas e validadas;
  - NÃO inferir condições clínicas não cadastradas (e.g., nunca presumir diabetes se o campo não estiver marcado);
  - NÃO alterar critérios de risco de forma autônoma sem versionamento explícito da escala;
  - NÃO apresentar uma pontuação opaca ou inexplicável.
</system_boundaries>

---

<tech_stack>
  <!-- Definir e versionar conforme a evolução da base de código do projeto -->
  - **Framework**: Nuxt 4 (^4.5.2) + Vue 3.5.
  - **Persistência e Dados em Tempo Real**: Cloud Firestore via `firebase` (SDK) e `vuefire` (bindings reativos para Vue/Nuxt). As regras de acesso (RBAC) e as invariantes de imutabilidade (ex.: `avaliacoes_risco` nunca sofre `update`/`delete`) residem em `firestore.rules` e devem ser mantidas em sincronia com o motor de domínio.
  - **Validação de Schema**: `zod` para validação e inferência de tipos dos documentos persistidos (ver `shared/domain/schemas/`). Toda nova entidade persistida deve ter um schema Zod correspondente antes de ser gravada no Firestore.
  - **Prioridade de Módulos Prontos do Nuxt**: Sempre que for necessária uma funcionalidade de infraestrutura ou UI utilitária (ícones, fontes, estilização, qr-code, autenticação, etc.), PRIORIZE o uso de módulos oficiais ou consolidados do ecossistema Nuxt (<https://nuxt.com/modules>), como `@nuxt/icon`, `@nuxt/fonts`, `@nuxtjs/tailwindcss`, `nuxt-qrcode`, `vuefire`, em vez de reinventar a roda.
  - **Atenção Crítica à Compatibilidade Nuxt 4**: Muito cuidado ao selecionar módulos do ecossistema Nuxt, pois muitos pacotes foram desenvolvidos exclusivamente para Nuxt 2 ou Nuxt 3 e podem quebrar ou conter dependências incompatíveis no Nuxt 4. Sempre valide se o módulo oferece suporte nativo ao Nuxt 4. Em caso de incompatibilidade ou instabilidade de um módulo, prefira APIs nativas ou bibliotecas modernas e fáceis de configurar no ambiente Nuxt 4.
  - **Arquitetura**: Clean Architecture / Domain-Driven Design (DDD) leve, isolando o motor de domínio na pasta `shared/domain/` (`risk-engine/` e `schemas/`) compartilhada entre cliente e servidor Nitro.
  - **Testabilidade**: Motores de cálculo de risco desacoplados de frameworks e bancos de dados para viabilizar testes unitários em milissegundos com Vitest (ver `tests/unit/`).
  - **Gestão de Dependências**: Antes de introduzir uma biblioteca avulsa, verifique primeiro se já existe um módulo Nuxt compatível ou se a funcionalidade pode ser resolvida com recursos nativos da stack.
</tech_stack>

---

<coding_standards>
  - Prefira código simples, expressivo e autoexplicativo a abstrações prematuras.
  - Utilize nomenclaturas fiéis ao domínio da Saúde Pública brasileira em português para entidades de negócio (ex.: `EstratificacaoRiscoService`, `IndicadorRisco`, `EscalaCoelhoSavassi`, `ResponsavelFamiliar`).
  - Garanta que toda regra de cálculo de pontuação possua teste unitário cobrindo:
    1. Família sem nenhuma vulnerabilidade (cenário base / pontuação zero);
    2. Cada indicador isolado pontuando corretamente;
    3. Combinações cumulativas e condições sentinelas;
    4. Limites de corte entre faixas de risco (boundary testing);
    5. Tratamento de campos ausentes ou dados incompletos.
</coding_standards>

---

<decision_hierarchy>
  Em caso de conflito de interesses técnicos durante a modelagem ou implementação, adote estritamente a seguinte ordem de prioridade:
  
  Integridade dos Dados > Segurança e Privacidade (LGPD) > Clareza da Regra de Negócio > Usabilidade Operacional > Conveniência de Implementação
</decision_hierarchy>
