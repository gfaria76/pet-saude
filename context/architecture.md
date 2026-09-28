# Arquitetura de Software — PET-Saúde

Clean Architecture leve / DDD leve: o domínio (cálculo de risco e contratos de dados) fica isolado e testável; interface e persistência dependem dele, nunca o contrário.

---

## 1. Camadas e pastas

```text
shared/domain/                  ← DOMÍNIO — TypeScript puro, sem Vue nem Firebase
  risk-engine/
    types.ts                    enums e contratos (FaixaRisco, IndicadorRiscoCodigo…)
    constants.ts                escala versionada (pesos, cortes, metadados)
    calculadora.ts              motor determinístico calcularEstratificacaoRisco()
  schemas/index.ts              schemas Zod = contrato de persistência; montarDocumentoAvaliacao()

app/                            ← INTERFACE (Nuxt 4 / Vue 3.5)
  components/                   só apresentação; nenhum peso ou regra de cálculo
  composables/useFamilias.ts    estado da tela e orquestração do fluxo
  utils/estiloFaixaRisco.ts     faixa → cor/ícone/rótulo (único lugar)
  utils/iconesIndicador.ts      indicador → ícone
  utils/icones.ts               ícones gerais + exceções Lucide
  repositories/                 leitura territorial Firestore (famílias e histórico)
  plugins/firebase.client.ts    inicialização do SDK Firebase

functions/                      vínculos + avaliação transacional e auditoria
firestore.rules                 RBAC territorial + invariantes de imutabilidade
tests/unit/                     Vitest — motor e schemas (sem emulador)
tests/rules/                    Vitest + Firestore Emulator — regras de acesso
```

Os painéis demonstrativos usam memória no `useFamilias.ts`; a área institucional `/operacional` usa repositório territorial e funções. A demonstração de campo usa IndexedDB somente com fixtures sintéticas. Nenhuma publicação remota foi realizada.

### Regra de dependência

- `app/` e `functions/` importam de `shared/domain/`.
- `shared/domain/` **não importa** nada de `app/`, `functions/`, Vue, Nuxt ou Firebase.
- Componentes não chamam o Firestore diretamente: usam composables, que usam repositórios.

---

## 2. Motor de estratificação

```ts
calcularEstratificacaoRisco(entrada, contexto, configuracao = CONFIGURACAO_COELHO_SAVASSI_V1): ResultadoEstratificacaoRisco
```

- `entrada`: família e indicadores presentes (com `individuoId` opcional) e a avaliação anterior, se houver.
- `contexto`: `{ dataAvaliacao, avaliadorId, avaliadorPerfil }`, **injetado** para o cálculo ser determinístico e auditável.
- `configuracao`: versão da escala (`ConfiguracaoEscalaRisco`), com pesos por indicador (`number` ou `null` = não pontuado), limites de corte e gatilhos diretos.
- Saída: pontuação, faixa, regra de decisão em texto, fatores determinantes, indicadores não pontuados, delta e autoria.

Regras detalhadas em [`business_rules.md`](./business_rules.md).

---

## 3. Fluxos de avaliação

A demonstração original calcula prévias e acrescenta avaliações imutáveis em memória. A coleta de campo demonstrativa permite rascunhos incompletos no IndexedDB; somente coletas com 13 respostas explícitas entram como pendentes, sem envio ou confirmação simulados.

Na área institucional online:

1. Login institucional → consulta vínculos → seleção do município → renovação de claims.
2. Repositório lê famílias/histórico do namespace `tenants/{tenantId}` com filtros territoriais e valida Zod.
3. Formulário exige 13 respostas explícitas e fixa ID da operação, cadastro/base anterior e versão da escala; retry preserva o mesmo conteúdo.
4. `registrarAvaliacao` valida identidade, vínculo vigente na transação, território e referências; recalcula pelo motor puro.
5. Avaliação append-only, resumo familiar, recibo e auditoria são escritos atomicamente. Conflito preserva a operação e não altera a família.
6. Cliente recebe recibo validado e recarrega o histórico. Fechar uma coleta online não confirmada exige confirmação e pode perder o estado da tela; persistência clínica offline ainda não está ativada.

`shared/domain/acesso.ts` define vínculo/claims; `shared/domain/sincronizacao.ts` define operações/recibos. `app/offline/fila.ts` isola a máquina de estados e armazenamento local, com adaptador remoto injetável. Os SDKs ficam fora do domínio. O build de Functions inclui o domínio no bundle via esbuild; TypeScript verifica antes de empacotar.

## 4. Decisões registradas

| Decisão | Motivo |
| :--- | :--- |
| Território denormalizado nos documentos | As regras do Firestore validam acesso sem joins; listagens filtram por território. |
| Papéis em custom claims, não em documentos | Impede autopromoção; só o backend atribui papel. |
| Avaliação guarda `individuoId`, não nome | Minimização LGPD; o nome é resolvido só para quem acessa o prontuário. |
| Data e avaliador injetados no motor | Determinismo (mesma entrada ⇒ mesmo resultado) e autoria auditável. |
| Indicador com `peso: null` | Permite coletar variáveis novas dos GATs sem inventar peso. |
| Health Icons como padrão | Ícones de saúde pública; mapas centrais mantêm UI consistente. |


## 5. Entrada institucional e PWA

`/login` usa serviço cliente, sessão por aba, validação de identidade e claims, lista de vínculos e seleção online. `/administracao` permite ao ADMIN gerir vínculos do município, sem autopromoção ou concessão de ADMIN; `/operacional` permite leitura/avaliação clínica segundo RBAC. A autorização efetiva ocorre nas regras e no backend, não no menu.

As regras bloqueiam caminhos legados e todas as escritas cliente. Vínculos são consultados nas regras para revogação online. Selecionar outro município não revoga tokens de outros vínculos ativos; coordenação de tenant único entre abas permanece pendente.

O shell é SPA, prerenderizado, com PWA `@vite-pwa/nuxt` e precache somente de assets. Alterar variáveis públicas exige novo build do shell. Atualização é solicitada e não força reload de formulário. Consulte `desenvolvimento_local.md` para emuladores e `roteiro_piloto.md` para validação ainda não executada com profissionais.

## Incremento online: cadastro, transferência e conflitos

O cadastro inicial cria domicílio, um responsável e família em transação, com recibo idempotente em `operacoes_cadastro` e logs por recurso. Não cria avaliação; o resumo inicial do contrato deve aparecer como **Sem avaliação**. Atualizações cadastrais neste incremento limitam-se a prontuário, contato e status. Gestão completa de membros e edição do domicílio permanecem pendentes.

Transferências exigem coordenação da APS no mesmo município, versão atual, destino cadastrado e domicílio não compartilhado; atualizam família, domicílio e até 50 membros atomicamente. Avaliações anteriores conservam território e conteúdo originais. A equipe de destino não recebe acesso automático ao histórico do território anterior.

A consulta de conflitos ocorre por callable, somente para o autor com vínculo e território atuais. A revisão compara os 13 indicadores e exige nova confirmação, gerando outro identificador; a operação original permanece imutável. Recibos e operações não são legíveis diretamente pelo cliente. Paginação de famílias preserva filtros territoriais em cada página. Nenhum dado clínico deste incremento é persistido offline no navegador.
