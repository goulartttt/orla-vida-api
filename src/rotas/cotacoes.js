import { Router } from 'express';
import { Cotacao } from '../models/Cotacao.js';
import {
  apoliceParaResposta,
  atualizarCotacao,
  buscarCotacaoDoUsuario,
  cotacaoParaResposta,
  criarCotacao,
  efetivarCotacao,
  excluirCotacao,
} from '../servicos/cotacoes.js';
import { ErroApp } from '../lib/erros.js';
import { esquemaCotacao, esquemaEfetivacao, numeroCotacao } from './validacoes.js';

export const rotasCotacoes = Router();

function lerNumero(req) {
  const resultado = numeroCotacao.safeParse(req.params.numero);
  if (!resultado.success) throw new ErroApp(404, 'Cotação não encontrada.');
  return resultado.data;
}

rotasCotacoes.get('/', async (req, res) => {
  const cotacoes = await Cotacao.find({ usuario: req.usuario._id }).sort({ numero: -1 });
  res.json({ cotacoes: cotacoes.map((c) => cotacaoParaResposta(c)) });
});

rotasCotacoes.post('/', async (req, res) => {
  const dados = esquemaCotacao.parse(req.body);
  const cotacao = await criarCotacao(req.usuario, dados, req.usuario.demo ? { expiraEm: req.usuario.expiraEm } : {});
  res.status(201).json({ cotacao: cotacaoParaResposta(cotacao, { cpfCompleto: true }) });
});

rotasCotacoes.get('/:numero', async (req, res) => {
  const cotacao = await buscarCotacaoDoUsuario(req.usuario, lerNumero(req));
  res.json({ cotacao: cotacaoParaResposta(cotacao, { cpfCompleto: cotacao.status === 'aberta' }) });
});

rotasCotacoes.put('/:numero', async (req, res) => {
  const cotacao = await buscarCotacaoDoUsuario(req.usuario, lerNumero(req));
  const dados = esquemaCotacao.parse(req.body);
  await atualizarCotacao(cotacao, dados);
  res.json({ cotacao: cotacaoParaResposta(cotacao, { cpfCompleto: true }) });
});

rotasCotacoes.delete('/:numero', async (req, res) => {
  const cotacao = await buscarCotacaoDoUsuario(req.usuario, lerNumero(req));
  await excluirCotacao(cotacao);
  res.status(204).end();
});

rotasCotacoes.post('/:numero/efetivar', async (req, res) => {
  const cotacao = await buscarCotacaoDoUsuario(req.usuario, lerNumero(req));
  const dados = esquemaEfetivacao.parse(req.body);
  const apolice = await efetivarCotacao(cotacao, dados, req.usuario.demo ? { expiraEm: req.usuario.expiraEm } : {});
  res.status(201).json({ apolice: apoliceParaResposta(apolice) });
});
