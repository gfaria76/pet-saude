# Modelo de Domínio — PET-Saúde

Modelo conceitual das entidades e invariantes do sistema de estratificação de risco na APS. A implementação de referência está em `shared/domain/schemas/index.ts` (Zod) e `firestore.rules` (acesso e persistência).

---

## 1. Entidades e relacionamentos

```mermaid
erDiagram
    MUNICIPIO ||--o{ UNIDADE_BASICA_SAUDE : contem
    UNIDADE_BASICA_SAUDE ||--o{ EQUIPE_SAUDE_FAMILIA : sedia
    EQUIPE_SAUDE_FAMILIA ||--o{ MICROAREA : abrange
    PROFISSIONAL_ACS ||--o{ MICROAREA : responsavel_por
    MICROAREA ||--o{ DOMICILIO : localiza
    DOMICILIO ||--o{ FAMILIA : abriga
    FAMILIA ||--|{ INDIVIDUO : composta_por
    FAMILIA ||--o{ AVALIACAO_RISCO : historico
    AVALIACAO_RISCO ||--o{ FATOR_DETERMINANTE : detalha
    AVALIACAO_RISCO }o--|| ESCALA_CONFIGURACAO : versao
    AVALIACAO_RISCO |o--o| AVALIACAO_RISCO : anterior
    FAMILIA ||--o{ LOG_AUDITORIA : gera
    AVALIACAO_RISCO ||--o{ LOG_AUDITORIA : gera
```

### 1.1. Campos territoriais denormalizados

`Domicilio`, `Familia`, `Individuo` e `AvaliacaoRisco` carregam **`municipioId`, `equipeId` e `microareaId`**. Isso permite que `firestore.rules` verifique o território de cada documento sem consultas extras, e que as listagens filtrem pelo território do profissional. Os três campos só mudam em uma transferência territorial, feita pela coordenação (ver invariante 3).

---

## 2. Dicionário de entidades

### 2.1. `UnidadeBasicaSaude` (UBS)

Estabelecimento do SUS onde as equipes estão alocadas. Identificadores: ID, código CNES, nome, município (Coxim ou Corumbá).

### 2.2. `EquipeSaudeFamilia` (eSF)

Equipe multiprofissional (medicina, enfermagem, técnico de enfermagem, odontologia, ACS) com território adscrito. Identificadores: ID, código INE, nome, UBS de referência.

### 2.3. `Microarea` — schema `MicroareaSchema`

Subdivisão territorial sob responsabilidade de um ACS.

- **Atributos:** `id`, `numero`, `descricao` (opcional), `acsId` (opcional), `equipeId`, `municipioId`.

### 2.4. `Domicilio` — schema `DomicilioSchema`

Edificação e suas condições de infraestrutura.

- **Atributos:** endereço (`logradouro`, `numero`, `bairro`, `cep` opcional), território, `quantidadeComodos`, `quantidadeMoradores`, abastecimento de água, esgotamento sanitário, destino do lixo, `saneamentoInadequado`, `adensamentoExcessivo`.

### 2.5. `Familia` — schema `FamiliaSchema`

Núcleo familiar coabitante no domicílio.

- **Atributos:** `prontuarioFamiliar`, `domicilioId`, território, `responsavelNome`, `responsavelId`, `contato` (opcional — previsto no Relatório Técnico), `status` (`ATIVA`, `MUDOU_SE`, `DESMEMBRADA`), `quantidadeMembros`, resumo da última avaliação (`ultimaClassificacaoRisco`, `ultimaPontuacaoRisco`, `dataUltimaAvaliacao`).
- **Invariante:** exatamente um Responsável Familiar ativo.
- O resumo da última avaliação é uma **cópia de conveniência** para o painel; a fonte da verdade é o histórico em `AvaliacaoRisco`.

### 2.6. `Individuo` — schema `IndividuoSchema`

Pessoa que compõe a família.

- **Atributos:** `nome`, `familiaId`, território, `dataNascimento`, `sexo`, `parentesco`, `cns` e `cpf` (**opcionais** — o Relatório Técnico não os exige; minimização LGPD), marcadores clínicos (`condicoesCronicas`).

### 2.7. `AvaliacaoRisco` — schema `AvaliacaoRiscoSchema`

Registro **imutável** de uma estratificação.

- **Atributos:** `familiaId`, território, `avaliadorId`, `avaliadorNome`, `avaliadorPerfil`, `dataAvaliacao`, `versaoEscala`, `pontuacaoTotal`, `classificacao`, `regraDecisao`, `fatoresDeterminantes` (cada um com código, descrição, pontos, tipo de sentinela e `individuoId` opcional), `indicadoresNaoPontuados` (opcional), `comparativoAvaliacaoAnterior` (delta, opcional).
- Persistido com `registradoEm` = horário do servidor.
- O **nome** do membro afetado não é gravado na avaliação; a interface resolve pelo `individuoId` quando o profissional tem acesso ao prontuário.

### 2.8. `LogAuditoria` — schema `LogAuditoriaSchema`

Registro **append-only** de criação, alteração ou exclusão lógica de `Familia`, `Individuo`, `Domicilio`, `Microarea` ou `AvaliacaoRisco`, conforme [`security_privacy.md`](./security_privacy.md).

- **Atributos:** `usuarioId`, `perfil`, `municipioId`, `acao`, `recursoTipo`, `recursoId` (anônimo/hasheado), `dataHora` (ISO 8601 com fuso), `justificativa` (opcional).
- **Invariante:** nunca contém nome, CPF, CNS ou condição de saúde.

---

## 3. Invariantes do domínio

1. **Imutabilidade das avaliações:** `AvaliacaoRisco` nunca sofre update nem delete. Retificação ⇒ nova avaliação, que referencia a anterior no delta.
2. **Explicabilidade:** uma `AvaliacaoRisco` é inválida se a soma dos pontos de `fatoresDeterminantes` for diferente de `pontuacaoTotal` (validado pelo `.refine` do Zod; as regras do Firestore não conseguem iterar listas, por isso a revalidação no servidor está planejada em `functions/`).
3. **Isolamento territorial:** família e domicílio pertencem a uma microárea e a uma equipe por vez. Transferência só pela coordenação, com registro em `LogAuditoria`.
4. **Auditoria append-only:** toda criação, alteração ou exclusão lógica gera um `LogAuditoria`, que nunca é atualizado ou apagado.
5. **Sem exclusão física:** famílias, domicílios e indivíduos são inativados por `status`, nunca apagados.

---

## 4. Documentação relacionada

- Pontuação e faixas: [`business_rules.md`](./business_rules.md)
- Camadas e fluxo da avaliação: [`architecture.md`](./architecture.md)
- Proteção de dados e RBAC: [`security_privacy.md`](./security_privacy.md)
- Apresentação da classificação: [`ui_guidelines.md`](./ui_guidelines.md)
