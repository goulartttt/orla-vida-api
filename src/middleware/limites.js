import { rateLimit } from 'express-rate-limit';
import { config } from '../config/env.js';

// Observação: o contador fica na memória da instância. Na Vercel cada instância
// conta separadamente, então é uma proteção de "melhor esforço" contra força bruta.
function limitar({ janelaMinutos, maximo, mensagem }) {
  return rateLimit({
    windowMs: janelaMinutos * 60 * 1000,
    limit: config().NODE_ENV === 'test' ? 1000 : maximo,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { erro: mensagem },
  });
}

export const limiteLogin = () =>
  limitar({ janelaMinutos: 15, maximo: 10, mensagem: 'Muitas tentativas de login. Aguarde 15 minutos.' });

export const limiteCadastro = () =>
  limitar({ janelaMinutos: 60, maximo: 10, mensagem: 'Muitos cadastros a partir desta rede. Tente mais tarde.' });

export const limiteDemo = () =>
  limitar({ janelaMinutos: 60, maximo: 10, mensagem: 'Muitas contas demo criadas. Tente novamente em 1 hora.' });

export const limiteGeral = () =>
  limitar({ janelaMinutos: 1, maximo: 120, mensagem: 'Muitas requisições. Aguarde um instante.' });
