// Ponto de entrada da API. A Vercel detecta este arquivo e usa o `export default`.
// Para rodar localmente, veja src/local.js.
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config/env.js';
import { conectarBanco } from './db/conectar.js';
import { tratarErros } from './lib/erros.js';
import { limiteGeral } from './middleware/limites.js';
import { exigirLogin } from './middleware/sessao.js';
import { rotasApolices } from './rotas/apolices.js';
import { rotasAuth } from './rotas/auth.js';
import { rotasCotacoes } from './rotas/cotacoes.js';
import { rotasPainel } from './rotas/painel.js';
import { rotasPublicas } from './rotas/publicas.js';

const app = express();

// A API roda atrás do proxy da Vercel; confiar no primeiro salto para obter o IP real.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: config().origensPermitidas, credentials: true }));
app.use(express.json({ limit: '20kb' }));
app.use(cookieParser());
app.use(limiteGeral());

app.use(rotasPublicas);

app.use(async (req, res, next) => {
  await conectarBanco();
  next();
});

app.use('/auth', rotasAuth);
app.use('/cotacoes', exigirLogin, rotasCotacoes);
app.use('/apolices', exigirLogin, rotasApolices);
app.use('/painel', exigirLogin, rotasPainel);

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

app.use(tratarErros);

export default app;
