# Instruções do GitHub Copilot

As instruções deste repositório estão centralizadas em **[AGENTS.md](../AGENTS.md)**. Siga esse arquivo e os documentos em `context/` que ele indica.

Resumo mínimo para autocompletar:
- Pesos, faixas e indicadores de risco ficam só em `shared/domain/risk-engine/` — nunca em componentes Vue.
- Nunca use dados reais de pacientes; nunca registre nome, CPF, CNS ou condições de saúde em logs.
- Ícones: `healthicons:` via mapas em `app/utils/`; não use `lucide:` direto em componentes.
