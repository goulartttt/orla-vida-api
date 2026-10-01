import { Router } from 'express';
import { ErroApp } from '../lib/erros.js';
import { gerarHashSenha, obterHashFalso, verificarSenha } from '../lib/senha.js';
import { limiteCadastro, limiteDemo, limiteLogin } from '../middleware/limites.js';
import { encerrarSessao, exigirLogin, iniciarSessao } from '../middleware/sessao.js';
import { Usuario } from '../models/Usuario.js';
import { criarContaDemo } from '../servicos/demo.js';
import { esquemaCadastro, esquemaLogin } from './validacoes.js';

export const rotasAuth = Router();

rotasAuth.post('/cadastro', limiteCadastro(), async (req, res) => {
  const dados = esquemaCadastro.parse(req.body);

  if (await Usuario.exists({ email: dados.email })) {
    throw new ErroApp(409, 'Já existe uma conta com este e-mail.', [
      { campo: 'email', mensagem: 'Este e-mail já está cadastrado.' },
    ]);
  }

  const usuario = await Usuario.create({
    nome: dados.nome,
    email: dados.email,
    senhaHash: await gerarHashSenha(dados.senha),
  });

  iniciarSessao(res, usuario);
  res.status(201).json({ usuario: usuario.publico() });
});

rotasAuth.post('/login', limiteLogin(), async (req, res) => {
  const { email, senha } = esquemaLogin.parse(req.body);
  const usuario = await Usuario.findOne({ email, demo: false }).select('+senhaHash');

  // Mesma mensagem e mesmo custo de tempo para "e-mail não existe" e "senha errada".
  const senhaConfere = await verificarSenha(senha, usuario?.senhaHash ?? (await obterHashFalso()));
  if (!usuario || !senhaConfere) {
    throw new ErroApp(401, 'E-mail ou senha incorretos.');
  }

  iniciarSessao(res, usuario);
  res.json({ usuario: usuario.publico() });
});

rotasAuth.post('/demo', limiteDemo(), async (req, res) => {
  const usuario = await criarContaDemo();
  iniciarSessao(res, usuario);
  res.status(201).json({ usuario: usuario.publico() });
});

rotasAuth.post('/logout', (req, res) => {
  encerrarSessao(res);
  res.status(204).end();
});

rotasAuth.get('/me', exigirLogin, (req, res) => {
  res.json({ usuario: req.usuario.publico() });
});
