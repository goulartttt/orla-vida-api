# Orla Vida · API

API da **Orla Vida**, uma seguradora de vida **fictícia** criada como projeto de portfólio. Ela cuida de contas, cotações, propostas e apólices, com o cálculo do prêmio feito no servidor.

> **Aviso:** a Orla Vida não existe. Coberturas, taxas e valores foram inventados para demonstração, e nenhum seguro real é oferecido.

O front fica em outro repositório: [orla-vida](https://github.com/goulartttt/orla-vida).

## Tecnologias

- Node.js 22+ e JavaScript (ES Modules)
- Express 5
- MongoDB (Atlas) com Mongoose
- Validação com Zod
- Autenticação por JWT em cookie `httpOnly`
- Helmet e express-rate-limit
- Testes com Vitest, Supertest e MongoDB em memória

## Como rodar

```bash
npm install
cp .env.example .env
npm run gerar-segredos   # cole a saída no .env
npm run dev
```

A API sobe em `http://localhost:3001`. Preencha `MONGODB_URI` com a string de conexão do seu cluster. O nome do banco vai antes do `?`, por exemplo `/orla-vida-dev`.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `MONGODB_URI` | sim | String de conexão do MongoDB |
| `JWT_SECRET` | sim | Assinatura dos tokens de sessão (mín. 32 caracteres) |
| `CPF_CHAVE_CRIPTOGRAFIA` | sim | Chave AES-256 do CPF: 32 bytes em base64 |
| `CPF_CHAVE_HMAC` | sim | Chave do hash de busca do CPF (mín. 32 caracteres) |
| `PROXY_SECRET` | em produção | Segredo compartilhado com o proxy do front |
| `ORIGENS_PERMITIDAS` | não | Origens liberadas no CORS, separadas por vírgula |
| `PORT` | não | Porta local (padrão 3001) |

A API valida essas variáveis ao iniciar e para com uma mensagem clara se faltar alguma.

> **Importante:** não troque `CPF_CHAVE_CRIPTOGRAFIA` nem `CPF_CHAVE_HMAC` num banco que já tem dados, ou os CPFs salvos ficam ilegíveis. Use um par de chaves por ambiente e guarde-o.

## Endpoints

Rotas marcadas com 🔒 exigem login (cookie `orla_sessao`). Erros sempre voltam como `{ "erro": "...", "campos": [{ "campo", "mensagem" }] }`.

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/health` | Verifica se a API está no ar |
| GET | `/coberturas` | Catálogo de coberturas e regras de cálculo |
| POST | `/auth/cadastro` | Cria uma conta e abre a sessão |
| POST | `/auth/login` | Entra com e-mail e senha |
| POST | `/auth/demo` | Cria uma conta demo temporária, com dados de exemplo |
| POST | `/auth/logout` | Encerra a sessão |
| GET | `/auth/me` 🔒 | Usuário logado |
| GET | `/painel` 🔒 | Resumo: cotações em aberto, apólices ativas, prêmio ativo |
| GET | `/cotacoes` 🔒 | Lista as cotações do usuário |
| POST | `/cotacoes` 🔒 | Cria uma cotação |
| GET | `/cotacoes/:numero` 🔒 | Detalhe de uma cotação |
| PUT | `/cotacoes/:numero` 🔒 | Edita uma cotação em aberto |
| DELETE | `/cotacoes/:numero` 🔒 | Exclui uma cotação em aberto |
| POST | `/cotacoes/:numero/efetivar` 🔒 | Contrata: pagamento + beneficiários → emite a apólice |
| GET | `/apolices` 🔒 | Lista as apólices do usuário |
| GET | `/apolices/:numero` 🔒 | Detalhe de uma apólice |

## Regras de negócio (fictícias)

- **Coberturas:** Morte por qualquer causa (obrigatória), Invalidez permanente total por acidente, Antecipação por doença terminal e Assistência funeral. Cada uma tem capital mínimo, capital máximo e taxa anual. As adicionais não podem ter capital maior que o da principal.
- **Prêmio anual:** soma de capital × taxa de cada cobertura. Todo valor em dinheiro é calculado e trafega em **centavos**.
- **Vigência:** 1 ano, com início entre hoje e os próximos 60 dias (horário de Brasília).
- **Segurado:** de 18 a 70 anos no início da vigência, com CPF validado pelos dígitos verificadores.
- **Pagamento:** à vista com 5% de desconto, ou de 2 a 12 parcelas sem juros, com parcela mínima de R$ 20,00. Os centavos que sobram da divisão vão para a primeira parcela.
- **Beneficiários:** de 1 a 5, com percentuais inteiros somando 100%.
- **Apólice:** número `ORL-AAAA-MM-NNNNNN`, imutável depois de emitida. O mesmo segurado não pode ter duas apólices com vigências sobrepostas.
- **Conta demo:** apagada automaticamente pelo MongoDB após 24 horas (índice TTL), junto com as cotações e apólices dela.

## Segurança

- **Senhas** com `scrypt` (parâmetros da OWASP), sal aleatório e comparação em tempo constante.
- **CPF cifrado** com AES-256-GCM: cada gravação usa um IV novo, e a integridade é verificada ao decifrar. Um índice HMAC permite achar duplicidades sem guardar o CPF em texto. Nas respostas, o CPF sai mascarado (`***.982.247-**`); completo, só para o dono editar uma cotação aberta.
- **Sessão** em cookie `httpOnly`, `SameSite=Lax` e `Secure` em produção, com expiração de 2 horas.
- **Autorização por dono:** toda busca filtra pelo usuário logado. Quem tenta acessar o recurso de outra conta recebe 404, como se ele não existisse.
- **Validação** com esquemas estritos, que rejeitam campos extras e bloqueiam injeção de operadores do MongoDB.
- **Login sem vazamento:** a mesma mensagem e o mesmo tempo de resposta para e-mail inexistente e senha errada.
- **Limite de tentativas** em login, cadastro, conta demo e geral. Atrás do proxy do front, o IP do visitante só é aceito com o `PROXY_SECRET`.
- **Helmet** com headers de segurança, CORS restrito, corpo limitado a 20 KB e erros sem detalhes internos.
- **Números sequenciais** gerados por contador atômico, sem colisão entre requisições simultâneas.

## Testes

```bash
npm test
```

Os testes sobem um MongoDB em memória, sem tocar no banco real, e cobrem CPF, cálculo do prêmio e do pagamento, datas, criptografia, senha, autenticação, cotações, efetivação, apólices e isolamento entre usuários.

## Deploy na Vercel

A Vercel detecta o Express a partir de `src/index.js`, sem configuração extra.

1. Importe este repositório na Vercel.
2. Em **Settings → Git**, defina `prd-v1.0` como *Production Branch*. A branch `hml-v1.0` vira o ambiente de homologação.
3. Configure as variáveis de ambiente, uma configuração para cada ambiente. Homologação e produção usam bancos separados no mesmo cluster: `orla-vida-hml` e `orla-vida-prd`.
4. No MongoDB Atlas, libere o acesso de rede para a Vercel (`0.0.0.0/0`, protegido por usuário e senha).

## Estrutura

```
src/
  index.js          monta o app Express (entrada usada pela Vercel)
  local.js          servidor para desenvolvimento local
  config/           leitura e validação das variáveis de ambiente
  db/               conexão reaproveitada com o MongoDB
  dominio/          regras: coberturas, prêmio, limites
  lib/              CPF, criptografia, senha, datas, erros
  middleware/       sessão e limites de tentativas
  models/           esquemas do Mongoose
  rotas/            endpoints e validações
  servicos/         casos de uso (cotar, efetivar, conta demo)
test/               testes de unidade e de API
```

## Versões

- `hml-v1.0`: homologação.
- `prd-v1.0`: produção, só recebe o que foi aprovado em homologação.
