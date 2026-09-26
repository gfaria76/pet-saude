# CLAUDE.md

@AGENTS.md

## Específico do Claude Code

- **Skills do projeto** (`.claude/skills/`): use `nova-regra-risco`, `testes-motor`, `componente-risco` e `auditoria-lgpd` para as tarefas recorrentes. Para regras do Firestore, use `firestore-rules-creation` e depois `firebase-security-rules-auditor`.
- **Hook:** ao editar arquivos em `shared/domain/`, `pnpm test` roda automaticamente (`.claude/settings.json`). Se falhar, corrija antes de seguir.
- **Planos:** quando o usuário pedir um plano, entregue apenas o plano; implemente só quando ele pedir explicitamente.
