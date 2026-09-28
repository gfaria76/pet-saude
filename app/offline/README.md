# Campo offline — demonstração sintética

`useCampoOffline` mantém somente famílias sintéticas de Coxim, com allowlist extraída de `FAMILIAS_SINTETICAS`. O identificador de sessão local é `demo-campo`, separado da autenticação institucional. Nenhum adaptador remoto é injetado na demonstração e nenhum recibo é fabricado.

- `/visitas` seleciona uma família fictícia; `/visitas/[id]` permite coletar indicadores sem pressupor respostas negativas, salvar e recuperar rascunho, e submeter uma coleta completa à fila local.
- `/sincronizacao` diferencia rascunho, pendência, erro e confirmação. Descarte exige confirmação explícita; operações confirmadas ou em envio não são descartadas pela interface.
- IndexedDB anuncia sucesso apenas em `transaction.oncomplete`; falhas e quota são propagadas. Chaves e consultas incluem usuário e município.
- `FilaCampo` recebe um adaptador remoto opcional. Um envio só se torna confirmado com recibo do ID correspondente e identificador da avaliação; envios interrompidos mantêm o ID para reenvio idempotente. Conflito interrompe apenas a família afetada.
- Web Locks serializa mutações entre abas. Sem Web Locks, o fallback serializa instâncias na mesma aba; a idempotência do backend continua necessária entre abas/dispositivos.
- `podeEncerrarSessao()` expõe pendências para integração futura com logout/troca de escopo real. A sessão demo nunca contém o usuário institucional.

Limitações: não há cache clínico real, expiração institucional de sessão offline, criptografia com gestão de chaves, sincronização automática, migração de banco além da versão inicial ou interface detalhada para comparar conflitos. Reautenticação e envio real dependem da integração autorizada. Duas coletas da mesma família preservam sua base explícita; divergências devem ser resolvidas sem rebase silencioso. Preparação usa fixtures incluídas no aplicativo; funcionamento das rotas offline também depende do service worker e do primeiro carregamento online.

Antes do uso real, definir aparelhos e navegadores suportados, política de retenção e proteção local, acesso offline/revogação e aceite do piloto. Não interpretar IndexedDB como proteção criptográfica do aparelho.
