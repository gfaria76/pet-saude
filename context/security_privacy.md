# Segurança, Privacidade e LGPD em Saúde — PET-Saúde

Este documento estabelece as regras mandatórias de proteção de dados pessoais e sensíveis no sistema de estratificação de risco familiar, em conformidade com a **Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)** e as normas do Ministério da Saúde.

---

## 1. Classificação de Dados no Sistema

| Categoria | Exemplos | Tratamento de Segurança |
| :--- | :--- | :--- |
| **Identificadores Pessoais** | Nome civil, Nome social, CPF, CNS, Data de Nascimento, Endereço. | Criptografia em trânsito (TLS) e em repouso. Acesso restrito por RBAC. |
| **Dados Pessoais Sensíveis** | Condições crônicas (Hipertensão, Diabetes), Saúde mental, Drogadição, Deficiências, Acamado. | Máxima proteção. Acesso restrito a profissionais de saúde autorizados. |
| **Metadados e Logs** | Timestamps, IDs de requisição, Pontuações calculadas, Códigos de equipe. | Totalmente anonimizados / pseudonimizados. Nenhum dado clínico exposto. |

---

## 2. Princípio da Minimização e Menor Exposição

- O sistema deve solicitar e armazenar apenas os campos estritamente necessários para a correta identificação da família e cálculo da vulnerabilidade.
- Telas de listagem pública ou painéis de visão geral devem exibir nomes abreviados ou números de prontuário, evitando exibir condições sensíveis na tela inicial.
- As condições clínicas detalhadas só devem ser visíveis ao abrir o prontuário familiar específico com credencial autorizada.

---

## 3. Diretrizes de Logs e Auditoria

### ❌ O que NUNCA deve constar em logs (stdout, stderr, arquivos de log, APM):
- Nomes de pacientes ou de membros da família;
- CPF, CNS ou número de documento;
- Diagnósticos ou condições de saúde atribuídas a um indivíduo;
- Tokens de autenticação JWT ou senhas.

### ✅ O que DEVE constar em logs de auditoria:
- Identificador do usuário que realizou a operação (`usuarioId`);
- Perfil do operador (ex.: `ACS`, `ENFERMEIRO`, `MEDICO`);
- Ação executada (ex.: `CRIAR_AVALIACAO_RISCO`, `CONSULTAR_FAMILIA`);
- Identificador anônimo do recurso (`familiaId: "f47ac10b-..."`);
- Data e hora exatas com timezone (ISO 8601);
- IP de origem e User-Agent para rastreabilidade de acessos indevidos.

---

## 4. Política Estrita de Dados em Desenvolvimento e Testes

- **PROIBIÇÃO ABSOLUTA DE DADOS REAIS**: Em hipótese alguma utilize bases de dados reais, prontuários do e-SUS APS, cadastros municipais de Coxim/Corumbá ou CPFs de cidadãos reais em ambientes de desenvolvimento, homologação, scripts de seed ou testes automatizados.
- **Geradores Fictícios**: Use sempre bibliotecas de geração de dados sintéticos (ex.: Faker/Chance) com geradores de CPF/CNS sintéticos matematicamente válidos, mas comprovadamente fictícios.
- Nomes fictícios de exemplo devem ser claramente ilustrativos (ex.: `"Família Silva Exemplo"`, `"Cidadão Teste"`, `"Maria Fictícia dos Santos"`).
