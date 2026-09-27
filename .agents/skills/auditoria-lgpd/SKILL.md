---
name: auditoria-lgpd
description: Auditar código ou mudanças recentes quanto a LGPD, sigilo em saúde, logs seguros, RBAC territorial e auditoria append-only. Use antes de concluir mudanças que toquem dados de famílias/indivíduos, logs, firestore.rules ou seeds/fixtures.
---

# Auditoria de segurança e LGPD

Leia antes: `context/security_privacy.md`.

## Checklist

- [ ] **Dados reais:** há nomes, CPF, CNS ou endereços reais em fixtures, testes, seeds ou exemplos? Substituir por dados claramente fictícios.
- [ ] **Logs:** algum `console.*`, logger ou mensagem de erro inclui nome, CPF, CNS, condição de saúde ou token? Só IDs anônimos.
- [ ] **Minimização:** o dado coletado/exibido é necessário? A avaliação guarda `individuoId`, não nome? Listagens evitam condições sensíveis?
- [ ] **RBAC:** toda nova coleção/campo tem regra em `firestore.rules`, escopo territorial e teste em `tests/rules/`? ADMIN continua sem acesso a dados de saúde?
- [ ] **Imutabilidade:** `avaliacoes_risco` e `logs_auditoria` continuam sem update/delete?
- [ ] **Auditoria:** criação/alteração/inativação gera `LogAuditoria` com usuário, perfil, ação, recurso anônimo e data/hora?
- [ ] **Segredos:** nada de configuração real no git (`.env` ignorado; `.env.example` só com chaves vazias).

Relate cada item como OK / problema (arquivo:linha) / não se aplica. Para regras do Firestore, use também a skill `firebase-security-rules-auditor`.
