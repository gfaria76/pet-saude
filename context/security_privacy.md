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

Implementado em `firestore.rules` (protótipo **não publicado**; testes em `tests/rules/`). Papel e território vêm de **custom claims** do Firebase Auth, atribuídos **somente pelo backend** (Admin SDK) — nenhum documento do banco concede permissão, então ninguém consegue se autopromover.

| Claim | Tipo | Uso |
| :--- | :--- | :--- |
| `perfil` | `ACS` \| `ENFERMEIRO` \| `MEDICO` \| `TECNICO_ENFERMAGEM` \| `CIRURGIAO_DENTISTA` \| `COORDENADOR_APS` \| `ADMIN` | Papel |
| `municipioId` | string | Município (sempre obrigatório) |
| `equipeId` | string | Equipe (ACS e profissionais da eSF) |
| `microareaIds` | lista de strings | Microáreas do ACS |

| Perfil | Pode ler/escrever famílias, domicílios, indivíduos e avaliações de… |
| :--- | :--- |
| ACS | suas microáreas, dentro da sua equipe |
| Profissional da eSF | toda a área da sua equipe |
| COORDENADOR_APS | todo o município; único que faz transferência territorial |
| ADMIN | **nenhum dado de saúde** — gerencia microáreas e lê a auditoria |

Regras adicionais:

- `avaliacoes_risco` e `logs_auditoria` são **append-only** (update e delete negados).
- Nenhuma exclusão física de família, domicílio ou indivíduo: inativação por `status`.
- O avaliador de uma avaliação é sempre o usuário autenticado (`avaliadorId == uid`); não dá para registrar em nome de outro.
- O resumo de risco da família (usado no painel de prioridades) não pode ser alterado diretamente: só muda junto com a criação da avaliação correspondente.
- Limitações conhecidas (a resolver na Cloud Function planejada): o conteúdo de cada item de `fatoresDeterminantes` não é inspecionado pelas regras; o `LogAuditoria` ainda é gravado pelo cliente e não é obrigatório pelas regras; `dataAvaliacao` vem do cliente — ordene o histórico por `registradoEm`.
- Toda consulta de listagem deve filtrar pelo território (`municipioId`, `equipeId`, `microareaId`), senão é negada.

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

IP de origem e User-Agent não são confiáveis quando enviados pelo cliente; serão registrados pela Cloud Function de auditoria (planejada em `functions/`).

---

## 5. Dados em desenvolvimento e testes

- **Proibido usar dados reais:** nada de bases reais, prontuários do e-SUS APS, cadastros municipais de Coxim/Corumbá ou CPFs de cidadãos em desenvolvimento, homologação, seeds ou testes.
- Use geradores de dados sintéticos (ex.: Faker) com CPF/CNS matematicamente válidos, mas fictícios.
- Nomes fictícios claramente ilustrativos: `"Família Silva Exemplo"`, `"Cidadão Teste"`, `"Maria Fictícia dos Santos"`.
- Configuração real do Firebase fica apenas no `.env` (fora do git); o `.env.example` só tem chaves vazias.
