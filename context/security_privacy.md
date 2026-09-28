# Segurança, Privacidade e LGPD em Saúde — PET-Saúde

Regras obrigatórias de proteção de dados pessoais e sensíveis, em conformidade com a **LGPD (Lei nº 13.709/2018)** e as normas do Ministério da Saúde.

---

## 1. Classificação dos dados

| Categoria | Exemplos | Tratamento |
| :--- | :--- | :--- |
| **Identificadores pessoais** | Nome civil/social, CPF, CNS, data de nascimento, endereço, contato | TLS em trânsito, criptografia em repouso, acesso por RBAC territorial |
| **Dados pessoais sensíveis** | Hipertensão, diabetes, saúde mental, drogadição, deficiências, acamado | Máxima proteção; só profissionais de saúde do território |
| **Metadados e logs** | Timestamps, IDs, pontuações, códigos de equipe | Pseudonimizados; nenhum dado clínico ou identificador pessoal |

---

## 2. Minimização e menor exposição

- Coletar só o necessário para identificar a família e calcular a vulnerabilidade. O Relatório Técnico prevê como identificação: ACS/microárea, endereço/contato e nome do responsável. **CPF e CNS são opcionais** no modelo.
- Painéis e listagens mostram nome do responsável abreviado ou número de prontuário, sem condições sensíveis na tela inicial.
- Condições clínicas detalhadas só aparecem ao abrir o prontuário familiar, com credencial autorizada.
- **Nome do membro afetado por um indicador:** a avaliação grava apenas `individuoId`. O drawer explicativo resolve o nome a partir do cadastro de `Individuo` **somente** quando o profissional tem acesso ao prontuário; caso contrário mostra "membro da família". Isso concilia a explicabilidade pedida em [`ui_guidelines.md`](./ui_guidelines.md) com a minimização.

---

## 3. Controle de acesso (RBAC territorial)

Implementado localmente em `firestore.rules` e `functions/src/`; protótipo **não publicado**. As coleções operacionais estão em `tenants/{tenantId}/...`, com `tenantId == municipioId`. Caminhos legados na raiz e todas as escritas diretas do cliente são negados. Não houve migração remota.

Identidade exige e-mail verificado no domínio exato `@ufms.br` e entrada `google.com`. Os [campos do token Firebase](https://firebase.google.com/docs/rules/rules-and-auth) não comprovam isoladamente pertencimento ao Google Workspace.

| Claim | Uso |
| --- | --- |
| `perfil` | ACS, ENFERMEIRO, MEDICO, TECNICO_ENFERMAGEM, CIRURGIAO_DENTISTA, COORDENADOR_APS ou ADMIN |
| `tenantId`, `municipioId` | Município ativo, iguais entre si e ao caminho |
| `equipeId` | Obrigatória para ACS e profissionais da eSF |
| `microareaIds` | Microáreas do ACS; lista limitada no schema |
| `versaoAcesso` | Versão comparada com vínculo vigente para invalidar escopos alterados |

`tenants/{tenantId}/vinculos/{uid}` guarda vínculo `ATIVO`/`INATIVO`, perfil e território, validado por `vinculoSchema`. Somente funções gerem vínculos; escrever documentos pelo cliente não concede permissão. ADMIN administra vínculos no próprio município, sem alterar seu próprio vínculo nem criar/alterar outro ADMIN. Bootstrap administrativo real é externo à aplicação. O seed é exclusivo para emuladores e contas fictícias.

| Perfil | Leitura e registro clínico |
| --- | --- |
| ACS | Suas microáreas dentro da equipe |
| Profissional eSF | Sua equipe |
| COORDENADOR_APS | Seu município |
| ADMIN | Nenhum dado de saúde; gestão de vínculos e leitura de auditoria municipal |

Regras verificam vínculo ativo, versão e correspondência com claims antes da leitura. Backend de avaliação revalida o vínculo **dentro da transação**, além de território, família, domicílio, responsável e membros referenciados. Admin SDK não é protegido pelas regras: estas verificações no servidor são obrigatórias.

- `avaliacoes_risco`, recibos e logs são escritos pelo backend; avaliações e logs são append-only.
- Cálculo e autoria vêm do servidor autenticado; cliente envia respostas, versão da escala, coleta e base esperada, nunca a pontuação autoritativa.
- Resumo da família, avaliação, recibo e auditoria são gravados na mesma transação. Repetição do mesmo ID/conteúdo não duplica; conteúdo diferente com mesmo ID é negado.
- Cadastro ou avaliação base divergente gera recibo de conflito; a operação é preservada sem alterar o histórico.
- Leituras clínicas incluem filtros de município, equipe e microárea correspondentes ao perfil. ADMIN e coordenação consultam apenas auditoria do município.
- Cadastro, inativação e transferência territorial ainda precisam de endpoints próprios; não há escrita cliente alternativa. Transferências entre municípios continuam fora do MVP.
- Seleção de município não revoga outros vínculos ativos. Tokens antigos de outro vínculo continuam válidos até revogação/alteração desse vínculo; tenant único entre abas ainda não é garantido.

## 3.1. Armazenamento e operação offline

A área institucional consulta o servidor e mantém dados somente na memória da tela; não habilita cache Firestore persistente. A demonstração de campo persiste **apenas fixtures sintéticas** no IndexedDB, com allowlist de famílias e escopo `demo-campo` separado da identidade institucional. `FilaCampo` oferece segregação por usuário/tenant e envio injetável, mas a demonstração não injeta envio remoto nem simula recibos.

Service worker guarda somente shell e assets estáticos do build. Dados clínicos e respostas de autenticação não entram em cache HTTP genérico. Atualizações não forçam reload de formulários.

Antes de armazenamento clínico real, definir dispositivos autorizados, retenção, expiração offline, proteção/criptografia e gestão de chaves, logout com pendências, limpeza de escopo e revogação. IndexedDB sozinho não garante proteção física do aparelho. A revogação online não apaga imediatamente um aparelho desconectado.

---

## 4. Logs e auditoria

### ❌ Nunca em logs (stdout, stderr, arquivos, APM)

- Nomes de pacientes ou membros da família;
- CPF, CNS ou qualquer documento;
- Diagnósticos ou condições de saúde de um indivíduo;
- Tokens JWT ou senhas.

### ✅ Sempre no `LogAuditoria`

- `usuarioId` e `perfil` do operador;
- `acao` (ex.: `CRIAR_AVALIACAO_RISCO`, `CONSULTAR_FAMILIA`);
- `recursoTipo` e `recursoId` anônimo;
- `dataHora` ISO 8601 com fuso, mais o horário do servidor (`registradoEm`);
- `justificativa`, quando aplicável.

`LogAuditoriaSchema` cobre avaliações; `LogAcessoSchema` cobre aprovação/revogação de vínculos. Ambos são validados antes da escrita server-side e recebem `registradoEm` do servidor. Auditoria de todas as consultas e operações de cadastro ainda não está implementada. IP/User-Agent não são registrados nesta entrega; valores enviados pelo cliente não seriam prova confiável.

---

## 5. Dados em desenvolvimento e testes

- **Proibido usar dados reais:** nada de bases reais, prontuários do e-SUS APS, cadastros municipais de Coxim/Corumbá ou CPFs de cidadãos em desenvolvimento, homologação, seeds ou testes.
- Use geradores de dados sintéticos (ex.: Faker) com CPF/CNS matematicamente válidos, mas fictícios.
- Nomes fictícios claramente ilustrativos: `"Família Silva Exemplo"`, `"Cidadão Teste"`, `"Maria Fictícia dos Santos"`.
- Configuração real do Firebase fica apenas no `.env` (fora do git); o `.env.example` só tem chaves vazias.

## Incremento online: cadastro, transferência e conflitos

O cadastro inicial cria domicílio, um responsável e família em transação, com recibo idempotente em `operacoes_cadastro` e logs por recurso. Não cria avaliação; o resumo inicial do contrato deve aparecer como **Sem avaliação**. Atualizações cadastrais neste incremento limitam-se a prontuário, contato e status. Gestão completa de membros e edição do domicílio permanecem pendentes.

Transferências exigem coordenação da APS no mesmo município, versão atual, destino cadastrado e domicílio não compartilhado; atualizam família, domicílio e até 50 membros atomicamente. Avaliações anteriores conservam território e conteúdo originais. A equipe de destino não recebe acesso automático ao histórico do território anterior.

A consulta de conflitos ocorre por callable, somente para o autor com vínculo e território atuais. A revisão compara os 13 indicadores e exige nova confirmação, gerando outro identificador; a operação original permanece imutável. Recibos e operações não são legíveis diretamente pelo cliente. Paginação de famílias preserva filtros territoriais em cada página. Nenhum dado clínico deste incremento é persistido offline no navegador.
