# Auditoria local do incremento de cadastro e conflitos

Escopo: revisão de código e testes locais, com dados sintéticos. Não constitui homologação ou certificação de segurança.

| Item | Resultado | Evidência/limite |
| --- | --- | --- |
| Dados fictícios | OK | Seeds restritos a emuladores demo; nenhuma base real foi utilizada |
| Logs seguros | OK | Mutações registram IDs, ação, perfil e horário; nenhuma chamada de logger com payload clínico |
| Minimização | OK | Lista por prontuário; resumo de conflito sem nomes; avaliação usa referências de indivíduos |
| RBAC | OK no escopo testado | Identidade institucional, vínculo vigente, versão e território; ADMIN sem saúde; recibos sem leitura direta |
| Imutabilidade | OK | Nenhuma escrita cliente; transferências não reescrevem avaliações; resolução cria nova operação |
| Auditoria | OK para mutações implementadas | Cadastro e transferência são transacionais; auditoria de todas as leituras permanece pendente |
| Segredos | OK | `.env` ignorado e não alterado; exemplo sem configuração de projeto real |

A paginação usa cursor por ID de documento com filtros territoriais em todas as páginas, conforme [cursores Firestore](https://firebase.google.com/docs/firestore/query-data/query-cursors). A revisão de conflitos deve revalidar acesso à família atual e não expor respostas históricas de território que o profissional não pode consultar.

As avaliações anteriores a uma transferência preservam território original. A equipe de destino não recebe automaticamente acesso ao conteúdo histórico do território anterior; a coordenação municipal conserva seu escopo. Rever essa política com a instituição antes de ampliar o acesso.

Avaliação das regras (somente o conjunto local de controles e testes):

```json
{
  "score": 5,
  "summary": "No escopo revisado, cliente não escreve e permissões dependem de vínculo vigente; ausência de bypass conhecido não equivale a garantia de produção.",
  "findings": []
}
```

Política de dispositivos, retenção/expiração offline, bootstrap de administradores, homologação e validação clínica continuam pendentes. Dados clínicos reais não são habilitados no IndexedDB por este incremento.

Correções encontradas na integração: o construtor da avaliação agora seleciona somente os três IDs territoriais, evitando herdar campos da família; o ID canônico é atribuído na persistência. Teste de regressão verifica identidade e ausência de responsável/contato. A consulta omite detalhe inexistente para evitar conversão de `undefined` em `null` no transporte callable. Suite final: 116 unitários, 39 regras e 22 backend aprovados; testes de navegador confirmaram gravação e preservação do conflito original.
