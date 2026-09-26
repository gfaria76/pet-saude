# Instruções para GitHub Copilot / OpenAI Codex — PET-Saúde

Este repositório contém o sistema de **Estratificação de Risco Familiar** para a Atenção Primária à Saúde (APS / ESF), com foco nas UBSs de **Coxim** e **Corumbá**.

**Documentação complementar**: pesos e faixas de corte em [`context/business_rules.md`](../context/business_rules.md) (implementados em `shared/domain/risk-engine/`), modelo de entidades em [`context/domain_model.md`](../context/domain_model.md), regras de LGPD/auditoria em [`context/security_privacy.md`](../context/security_privacy.md), padrões de UI em [`context/ui_guidelines.md`](../context/ui_guidelines.md). Persistência real do projeto: Cloud Firestore (`firebase` + `vuefire`), validado via `zod` (`shared/domain/schemas/`).

## Princípios Centrais para Geração de Código

1. **Explicabilidade Total**: Nenhuma pontuação de risco pode ser gerada como um número isolado. Todo cálculo de estratificação deve retornar:
   - Lista detalhada de fatores identificados;
   - Pontuação individual de cada indicador;
   - Pontuação total consolidada;
   - Regra de corte que determinou a classificação final;
   - Data/hora e versão da escala utilizada.

2. **Zero Invenção de Regras Médicas / Clínicas**:
   - NUNCA invente indicadores de risco, pontuações, pesos ou critérios clínicos que não estejam documentados no projeto.
   - Trate pesos e tabelas como regras de negócio configuráveis (`ConfiguracaoEscalaRisco`).
   - Se faltar uma regra, aponte a ausência em vez de usar valores arbitrários.

3. **Arquitetura Desacoplada**:
   - Mantenha o motor de cálculo de risco em serviços puros de domínio, sem dependências de frameworks de UI (React, Vue, etc.) ou ORM.
   - Proibido "números mágicos" soltos no código: utilize enums e constantes tipadas.

4. **Priorização de Módulos Nuxt (Evitar Reinventar a Roda)**:
   - Priorize módulos oficiais e consolidados do ecossistema Nuxt (<https://nuxt.com/modules>), como `@nuxt/icon`, `@nuxt/fonts`, `@nuxtjs/tailwindcss`, `nuxt-qrcode`, `vuefire`.
   - **Cuidado Crítico com Nuxt 4**: valide se o módulo é compatível com Nuxt 4 (evite pacotes limitados a Nuxt 2/3). Em caso de incompatibilidade, utilize bibliotecas modernas ou APIs nativas fáceis de configurar no Nuxt 4.

5. **Privacidade e LGPD**:
   - NUNCA utilize dados reais de pacientes em fixtures, testes, seeds ou exemplos.
   - Não registre dados pessoais (CPF, CNS, nomes) em logs.
   - Implemente auditoria para alterações de dados familiares e avaliações de risco.

6. **Interface Operacional para Saúde**:
   - Telas e formulários otimizados para uso ágil em campo (tablets e smartphones de ACS).
   - Destaque visual claro para famílias com Risco Máximo/Médio.
   - Permitir ao profissional inspecionar a composição da nota de risco em 1 clique.

7. **Hierarquia de Decisão**:
   Integridade dos dados > Segurança/Privacidade > Clareza da regra de negócio > Usabilidade > Facilidade de implementação.
