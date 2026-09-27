# Templates de Tarefas Recorrentes

Os templates foram convertidos em **skills** em `.agents/skills/` (pasta única; `.claude/skills` é um link simbólico para ela). Claude Code, Codex e Gemini/Antigravity as descobrem automaticamente; outros assistentes (Copilot) podem ler os arquivos `SKILL.md` como instruções em Markdown.

| Tarefa | Arquivo |
| :--- | :--- |
| Implementar/ajustar indicador, peso ou faixa no motor de risco | [`.agents/skills/nova-regra-risco/SKILL.md`](../.agents/skills/nova-regra-risco/SKILL.md) |
| Testes unitários do motor e dos schemas | [`.agents/skills/testes-motor/SKILL.md`](../.agents/skills/testes-motor/SKILL.md) |
| Componentes de visualização de risco (badge, drawer, form) | [`.agents/skills/componente-risco/SKILL.md`](../.agents/skills/componente-risco/SKILL.md) |
| Auditoria de segurança e LGPD | [`.agents/skills/auditoria-lgpd/SKILL.md`](../.agents/skills/auditoria-lgpd/SKILL.md) |

Edite as skills, não este arquivo.
