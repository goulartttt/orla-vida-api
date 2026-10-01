import jwt from 'jsonwebtoken';
import { config, emProducao } from '../config/env.js';
import { ErroApp } from '../lib/erros.js';
import { Usuario } from '../models/Usuario.js';

export const COOKIE_SESSAO = 'orla_sessao';
const DURACAO_SEGUNDOS = 2 * 60 * 60;

// httpOnly: o JavaScript da página não consegue ler o token (protege contra roubo via XSS).
// sameSite=lax: o navegador não envia o cookie em requisições disparadas por outros sites.
const opcoesCookie = () => ({ httpOnly: true, secure: emProducao(), sameSite: 'lax', path: '/' });

export function iniciarSessao(res, usuario) {
  const token = jwt.sign({ sub: String(usuario._id) }, config().JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: DURACAO_SEGUNDOS,
  });
  res.cookie(COOKIE_SESSAO, token, { ...opcoesCookie(), maxAge: DURACAO_SEGUNDOS * 1000 });
}

export function encerrarSessao(res) {
  res.clearCookie(COOKIE_SESSAO, opcoesCookie());
}

const sessaoExpirada = () => new ErroApp(401, 'Sua sessão expirou. Entre novamente.');

/** Exige um usuário logado e disponibiliza `req.usuario` para as rotas seguintes. */
export async function exigirLogin(req, res, next) {
  const token = req.cookies?.[COOKIE_SESSAO];
  if (!token) throw sessaoExpirada();

  let payload;
  try {
    payload = jwt.verify(token, config().JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    encerrarSessao(res);
    throw sessaoExpirada();
  }

  const usuario = await Usuario.findById(payload.sub);
  if (!usuario) {
    encerrarSessao(res);
    throw sessaoExpirada();
  }

  req.usuario = usuario;
  next();
}
