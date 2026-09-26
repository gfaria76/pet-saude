# Templates de Engenharia de Prompt para Tarefas Operacionais

Estes templates podem ser copiados e preenchidos ao delegar tarefas para o **Claude / Claude Code**, **Google Gemini / Antigravity** ou **OpenAI Codex / Copilot**.

---

## 1. Template: Implementação de Nova Regra no Motor de Risco

```markdown
### Tarefa: Implementar/Ajustar Regra de Estratificação de Risco
**Contexto do Projeto**: PET-Saúde (Estratificação de Risco Familiar - Atenção Primária)
**Documentação de Referência**: `context/business_rules.md` e `CLAUDE.md` / `GEMINI.md`

**Objetivo**:
Implementar a condição/indicador de risco: `[NOME_DO_INDICADOR]` com código `[IND_CODIGO]`.

**Especificações da Regra**:
- Peso atribuído: `[PESO_NUMÉRICO]`
- Critério de ativação: `[DESCREVER CRITÉRIO OBJETIVO]`
- Entidade de origem: `[DOMICILIO / FAMILIA / INDIVIDUO]`

**Requisitos Mandatórios**:
1. Isole a regra no motor de domínio, sem acoplar com a interface visual.
2. Não utilize números mágicos; declare constantes/enums semânticos.
3. O retorno do cálculo deve incluir a decomposição deste indicador no relatório explicativo.
4. Forneça testes unitários cobrindo:
   - Cenário onde a condição está inativa (não altera pontos);
   - Cenário onde a condição está ativa (soma exatamente o peso estipulado);
   - Transição de faixa de risco provocada por esta condição.
```

---

## 2. Template: Criação de Testes Unitários de Explicabilidade

```markdown
### Tarefa: Testes Unitários para Motor de Classificação Coelho-Savassi
**Contexto do Projeto**: PET-Saúde

**Objetivo**:
Escrever uma suite completa de testes automatizados para o serviço `EstratificacaoRiscoService`.

**Cenários a Cobrir**:
1. Família saudável/sem vulnerabilidades: score = 0, classificação = `R0 (Sem Risco)`.
2. Família com acamado (peso 3) e saneamento inadequado (peso 1): score = 4, classificação = `R1 (Risco Menor)`.
3. Família no limiar exato entre faixas (boundary conditions):
   - Score 4 (R1) vs Score 5 (R2).
   - Score 6 (R2) vs Score 7 (R3).
4. Verificação de integridade da explicação:
   - A soma dos pontos dos `fatoresDeterminantes` bate 100% com `pontuacaoTotal`.
   - Nenhuma informação de paciente real é utilizada (use dados sintéticos).
```

---

## 3. Template: Criação de Componente de UI (Drawer de Risco Explicável)

```markdown
### Tarefa: Criar Componente de Visualização de Risco Familiar
**Contexto do Projeto**: PET-Saúde
**Documentação de Referência**: `context/ui_guidelines.md`

**Objetivo**:
Desenvolver o componente `BadgeRiscoFamiliar` e o painel de detalhes `DrawerExplicativoRisco`.

**Requisitos de UX e Acessibilidade**:
1. A badge deve exibir Cor + Ícone + Texto (não depender apenas de cor).
2. Seguir contraste WCAG 2.1 AA para as 4 faixas: R0 (Verde), R1 (Âmbar), R2 (Laranja), R3 (Vermelho).
3. Ao clicar na badge, abrir a gaveta lateral apresentando:
   - Pontuação consolidada e regra de corte;
   - Lista detalhada de cada indicador pontuado e seu valor individual;
   - Data da avaliação e profissional responsável;
   - Botão para "Solicitar Reavaliação em Campo".
4. Design responsivo e amigável para uso em tablets e celulares de Agentes Comunitários de Saúde.
```

---

## 4. Template: Auditoria de Segurança e Conformidade com LGPD

```markdown
### Tarefa: Auditoria de Segurança e Privacidade no Código
**Contexto do Projeto**: PET-Saúde
**Documentação de Referência**: `context/security_privacy.md`

**Objetivo**:
Revisar as alterações recentes no módulo `[NOME_DO_MODULO]` buscando vulnerabilidades de vazamento de dados.

**Checklist de Análise**:
- [ ] Há dados reais de cidadãos em fixtures, testes ou seeds? (Se sim, substituir imediatamente por dados fictícios).
- [ ] Há CPF, CNS, nome ou diagnóstico médico sendo impresso em logs ou exceptions?
- [ ] O controle de acesso garante que apenas profissionais da equipe vinculada acessem o prontuário familiar?
- [ ] As operações de criação e alteração geram registros de auditoria imutáveis com timestamp e id do operador?
```
