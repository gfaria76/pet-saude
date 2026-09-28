# Execução e verificação local

Somente dados sintéticos. Não publicar o protótipo nem usar dados assistenciais como consequência destes comandos.

## Instalação e verificações

```bash
pnpm install
npm --prefix functions ci
pnpm test
pnpm typecheck
pnpm build
npm --prefix functions run lint
npm --prefix functions run build
pnpm test:rules
pnpm test:backend
```

Os testes de regras e de backend usam projetos `demo-*` no Firestore Emulator. Execute-os em sequência: os scripts ocupam a porta 8080. Java e Firebase CLI são necessários. Cloud Functions tem Node 24 como alvo; o ambiente desta execução usou Node 26 localmente, portanto homologar também o runtime Node 24 antes da publicação.

## Integração Auth + Firestore + Functions

```bash
npm --prefix functions run build
firebase emulators:start --only auth,firestore,functions --project demo-pet-saude
```

Em outro terminal:

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 GCLOUD_PROJECT=demo-pet-saude node functions/scripts/seed-emulator.mjs
node functions/scripts/smoke-acesso-emulator.mjs
```

O seed cria `admin-ficticio@ufms.br`, `acs-ficticio@ufms.br`, seus vínculos e uma família fictícia. Só aceita hosts locais e projeto `demo-*`. Executá-lo novamente reinicializa as fixtures — não use enquanto estiver verificando mudanças dessas fixtures. O administrador real inicial depende da governança institucional e deve ser provisionado fora da interface; o protótipo não permite autopromoção nem criação de ADMIN pelo cliente.

Configure um ambiente local dedicado:

```dotenv
NUXT_PUBLIC_FIREBASE_EMULATORS=true
NUXT_PUBLIC_FIREBASE_PROJECT_ID=demo-pet-saude
NUXT_PUBLIC_FIREBASE_API_KEY=demo-key
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-pet-saude.firebaseapp.com
NUXT_PUBLIC_FIREBASE_APP_ID=demo-app
```

Inicie `pnpm dev` e abra `/login`. O seletor Google será o do emulador. Use exclusivamente as contas fictícias. Se necessário, escolha adicionar conta no seletor com o mesmo e-mail do seed. Na área institucional, consulte vínculos, ative o município e abra a área operacional. ADMIN gerencia vínculos, mas não consulta famílias.

Todas as funções usam `southamerica-east1`. Após alterar região ou exportações, reinicie o Functions Emulator; recompilar sozinho pode manter o manifesto antigo. `npm --prefix functions run build` inclui os módulos do domínio no bundle, mantendo SDKs e Zod como dependências do pacote Functions.

## PWA e campo offline

A validação PWA exige build de produção, não somente servidor de desenvolvimento:

```bash
pnpm build
PORT=3210 node .output/server/index.mjs
```

Defina as variáveis públicas do ambiente **antes do build**. O shell `/` é prerenderizado e armazenado no precache; trocar somente o ambiente do servidor não substitui o shell instalado. Use origens distintas para builds de demonstração e emulador; limpe o service worker/caches de teste ao mudar a configuração da mesma origem.

Abra `/visitas` online, aguarde ativação do service worker, escolha uma família fictícia e salve um rascunho. Desligue a rede, feche/reabra a aba e retome a visita. Uma rota ainda não visitada deve abrir pelo shell; dados fictícios estão incluídos no bundle. A fila fica pendente porque esta demonstração não envia dados ao backend. Não interpretar isso como confirmação remota.

A fila possui um adaptador de envio real testado separadamente. Habilitá-la para dados clínicos ainda exige política de dispositivo/retencão/expiração e integração da sessão, preparação territorial e recuperação de conflitos. O teste em Chromium não substitui teste em Android/iOS, reinício do aparelho ou piloto com profissionais.

## Cadastro e revisão online — incremento validado

O seed agora inclui `coordenador-ficticio@ufms.br`, além de ACS e ADMIN, e as microáreas `microarea-teste`/`equipe-teste` e `microarea-destino`/`equipe-destino`. Use login Google fictício exclusivamente no Auth Emulator.

1. ACS: abrir `/cadastro`, preencher todas as respostas com dados fictícios e confirmar. Em `/operacional`, consultar e verificar “Sem avaliação”.
2. Coordenação: abrir `/transferencia`, consultar, selecionar família, indicar IDs de destino e aceitar a confirmação. O recibo deve ser confirmado; avaliações antigas não são alteradas.
3. Gerar avaliação com versão anterior do cadastro: servidor deve retornar conflito. Em `/conflitos`, consultar como mesmo autor, comparar, responder 13 indicadores e confirmar nova avaliação. A operação antiga deve permanecer preservada.

Validação deste incremento: 116 unitários, 39 regras, 22 backend, typecheck, lint Functions e ambos os builds passaram. Navegador verificou cadastro, transferência e revisão com Auth/Functions/Firestore locais. Host de teste usa Node 26 enquanto Functions declara Node 24; homologação no runtime de destino permanece necessária. Os testes backend apagam seus tenants de fixtures: não executá-los durante testes manuais que usem `municipio-teste`.
