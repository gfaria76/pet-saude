# Roteiro de piloto supervisionado — PET-Saúde

**Situação:** roteiro preparado; execução com profissionais e dispositivos reais ainda pendente. Testes automatizados e demonstrações locais não comprovam adequação clínica ou operacional. Preencher resultados, evidências e responsáveis durante a execução.

## Preparação e decisões institucionais

- [ ] Coordenação APS e GATs designam responsável pelo piloto, profissionais participantes e pessoa que recebe relatos de falhas.
- [ ] Confirmar município como tenant, aprovação e revogação de vínculos, responsáveis pelo bootstrap administrativo e provisão das contas UFMS.
- [ ] Definir se conta Google verificada `@ufms.br` atende à política institucional. O domínio e provedor verificados no Firebase não comprovam por si só pertencimento ao Google Workspace.
- [ ] Definir uso de equipamentos pessoais ou compartilhados, prazo de sessão, retirada de acesso, retenção e descarte de dados no aparelho. Não habilitar armazenamento clínico persistente enquanto essa política estiver pendente.
- [ ] Confirmar quais fluxos entram no piloto. Os únicos perfis implementados são ACS, ENFERMEIRO, MEDICO, TECNICO_ENFERMAGEM, CIRURGIAO_DENTISTA, COORDENADOR_APS e ADMIN. Novos atores precisam de definição e validação próprias.
- [ ] Separar homologação de produção e restringir o piloto inicial a dados explicitamente fictícios. Não copiar dados do e-SUS, prontuários, nomes, CPF ou CNS reais.
- [ ] Registrar configuração e versão do aplicativo, regras, funções e escala usados no piloto. Deployment de produção não faz parte da execução deste roteiro.

## Pendências clínicas que impedem uso assistencial

A fonte primária lista indicadores; não define pesos nem faixas. Manter abertas até decisão registrada as pendências de [business_rules.md](./business_rules.md): P1 pesos dos indicadores, P2 cortes entre faixas, P3 relação morador/cômodo, P4 repetição do mesmo indicador e P5 indicadores novos sem definição. Coordenação APS e GATs devem registrar responsável, fundamento, versão e data da decisão. Não modificar avaliações históricas para adequá-las a uma escala futura.

Nenhum resultado deste piloto autoriza diagnóstico, prescrição, inferência de condições ausentes ou recomendação clínica sem protocolo validado. Enquanto P1–P4 estiverem pendentes, usar a classificação somente na avaliação técnica com casos fictícios e indicação visível de parâmetros pendentes.

## Dispositivos e acessibilidade

Registrar modelo, sistema, navegador/versão, tamanho de tela, uso por uma ou várias pessoas e configuração de acessibilidade. Incluir aparelhos efetivamente disponíveis à equipe, Android e iOS se ambos fizerem parte do campo.

| Cenário | Tarefa | Evidência e aceite esperado |
| --- | --- | --- |
| Tela pequena e orientação retrato | Abrir lista, prontuário e formulário | Conteúdo legível, controles alcançáveis, sem corte ou rolagem horizontal que impeça a tarefa |
| Ambiente externo com claridade | Localizar risco e próxima ação | Profissional reconhece faixa por texto, ícone e cor; dificuldade registrada |
| Fonte ampliada e zoom | Concluir navegação e avaliação fictícia | Conteúdo e ações permanecem acessíveis |
| Teclado e leitor de tela | Percorrer formulário, mensagens e drawer | Rótulos e estados anunciados; foco visível e retorno ao fechar overlay |
| Rede lenta/intermitente | Entrar, consultar vínculos e carregar lista | Estados de espera e erro compreensíveis; nenhuma confirmação fictícia de gravação |
| Reinício do navegador/aparelho | Reabrir aplicação | Comportamento de sessão e armazenamento confere com a política aprovada |

Não atribuir aprovação a plataforma que não tenha sido testada. Limitações de instalação, armazenamento ou retomada devem ser registradas por navegador.

## Tarefas dos profissionais

Executar com ACS e pelo menos representantes dos demais perfis previstos no piloto. Observar sem orientar o próximo toque; registrar conclusão, dúvidas, erros e necessidade de ajuda. Definir metas de tempo e taxa de sucesso com a equipe antes de usar esses números como critérios de aceite.

1. Entrar com conta institucional, identificar o próprio UID, solicitar vínculo e selecionar município aprovado. Conta sem vínculo deve permanecer sem dados operacionais.
2. Localizar família fictícia de seu território. Distinguir demonstração pública de ambiente operacional e reconhecer qual município está ativo.
3. Abrir avaliação e explicar, com o drawer, indicadores, respostas, pontos, soma, versão, regra de corte, autor, datas e comparação anterior.
4. Registrar nova avaliação com respostas completas, incluindo negativas. Tentar prosseguir com respostas ausentes e reconhecer a necessidade de completá-las.
5. Confirmar gravação somente após recibo do servidor. Reabrir histórico e verificar preservação da avaliação anterior, novo registro e resumo correspondente.
6. Simular edição concorrente em dois dispositivos. Reconhecer conflito, preservar o registro original e refazer a avaliação com novo identificador quando aplicável.
7. Encerrar sessão em aparelho compartilhado e verificar que outra pessoa não vê a área operacional ou dados da sessão anterior.

## Isolamento e administração supervisionados

- [ ] ACS consulta apenas suas microáreas/equipe; demais profissionais eSF consultam apenas sua equipe; coordenação consulta apenas seu município.
- [ ] ADMIN gerencia vínculos e auditoria municipal, sem ler famílias, indivíduos, domicílios ou avaliações clínicas.
- [ ] ADMIN não promove a si mesmo, não cria outro ADMIN e não altera vínculo de outro município pelo aplicativo.
- [ ] Alteração e revogação exigem confirmação; atualizar vínculo usando versão antiga apresenta erro recuperável e não sobrescreve mudança concorrente.
- [ ] Revogar vínculo com outra sessão aberta. Consultas online e novas avaliações com token antigo devem ser negadas após a revogação registrada.
- [ ] Trocar município em duas abas/dispositivos e tentar reutilizar requisição preparada no município anterior. Cada requisição precisa corresponder ao tenant do token e ao vínculo vigente.
- [ ] Documentar que seleção de município não revoga outros vínculos: tokens anteriores permanecem autorizados ao seu próprio território enquanto o vínculo correspondente estiver ativo. Se a instituição exigir sessão única ou exclusividade global, definir e implementar essa política antes do aceite.
- [ ] Conta externa, domínio semelhante, e-mail não verificado e provedor diferente de Google não recebem acesso.
- [ ] Conferir auditoria sem nomes de cidadãos, condições clínicas, CPF, CNS ou tokens; conferir autoria e horário de confirmação.

## Offline e recuperação

Esta seção depende da política institucional e das funcionalidades efetivamente habilitadas no ambiente. Registrar **não disponível** quando o fluxo não estiver integrado, sem marcar como aprovado por existir teste unitário de fila.

- [ ] Preparar sessão online e verificar quais telas podem ser abertas sem rede.
- [ ] Desligar rede antes, durante e depois do envio. Nenhum item vira confirmado sem recibo do backend.
- [ ] Recuperar rede e reenviar a mesma operação: deve haver uma única avaliação canônica, um resumo consistente e um recibo estável.
- [ ] Reenviar mesmo ID com conteúdo diferente: deve ser rejeitado.
- [ ] Reiniciar durante envio e verificar comportamento previsto de recuperação sem perda silenciosa.
- [ ] Revogar vínculo enquanto aparelho está offline e reconectar: envio negado, sem reaproveitar permissões antigas.
- [ ] Verificar descarte local no logout/troca de usuário conforme política. Revogação online não apaga retroativamente cópias já baixadas; retenção offline precisa de decisão explícita.
- [ ] Se armazenamento clínico estiver desabilitado, reconhecer limitação na interface; não registrar dados reais supondo que haverá recuperação após fechar a aplicação.

## Registro e decisão de aceite

Para cada tarefa preencher: identificador do caso, papel, dispositivo, versão, cenário, resultado esperado, resultado observado, conclusão sem ajuda/com ajuda/falha, evidência sem dados pessoais, responsável e ação corretiva. Retestar correções nos cenários afetados.

| Decisão | Responsável | Evidência necessária | Situação inicial |
| --- | --- | --- | --- |
| Integridade e segurança técnica | Equipe técnica + responsável institucional | Testes e execução dos casos de autorização, revogação, concorrência e auditoria | Pendente de piloto |
| Usabilidade em campo | Profissionais participantes + coordenação | Tarefas observadas nos aparelhos reais e correções retestadas | Pendente |
| Critérios clínicos | Coordenação APS + GATs | Resolução formal das pendências clínicas e versionamento | Pendente |
| Privacidade e operação de dispositivos | Responsáveis institucionais | Política de acesso, retenção, offline, incidente e desligamento aprovada | Pendente |
| Liberação para uso assistencial | Governança institucional definida | Aprovações anteriores e plano de suporte, implantação e reversão | Não autorizada por este roteiro |

Suspender o cenário se houver exposição territorial indevida, acesso clínico por ADMIN, perda de histórico, gravação inconsistente, confirmação sem recibo ou interpretação da escala pendente como validada. Registrar o problema e reproduzir apenas com dados fictícios antes de retomar.

## Complemento — cadastro, transferência e revisão

Executar com contas fictícias de ACS, coordenação e ADMIN:

1. Cadastrar família com um responsável e domicílio próprio, respondendo explicitamente condições coletadas; verificar “Sem avaliação” e ausência de histórico fabricado.
2. Reenviar a mesma operação após falha de resposta; conferir somente uma família, um domicílio e um responsável, com logs correspondentes.
3. Tentar cadastrar em microárea fora do escopo e alterar o resumo clínico pelo cliente; ambos devem ser negados.
4. Transferir pela coordenação dentro do município; conferir que família, domicílio e membros movem juntos, cadastro avança versão e avaliações anteriores permanecem idênticas.
5. Tentar transferir entre municípios, com outro perfil ou domicílio compartilhado; deve haver recusa sem alteração parcial.
6. Abrir duas avaliações da mesma família, confirmar uma e enviar a outra; a segunda deve produzir conflito preservado.
7. Abrir revisão, comparar as respostas com os dados atuais, confirmar explicitamente cada indicador e enviar uma nova operação; nunca modificar a operação conflitante original.
8. Revogar o vínculo entre abrir e concluir o formulário; nenhum novo dado deve ser gravado e a interface não deve mostrar confirmação falsa.
9. Percorrer múltiplas páginas de famílias; confirmar ausência de duplicações e manutenção do escopo territorial.

O cadastro mínimo contempla somente um responsável. Inclusão e edição clínica de outros membros, domicílios compartilhados e políticas de acesso a históricos anteriores à transferência exigem homologação adicional.
