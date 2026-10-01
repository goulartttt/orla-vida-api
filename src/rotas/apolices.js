import { Router } from 'express';
import { ErroApp } from '../lib/erros.js';
import { Apolice } from '../models/Apolice.js';
import { apoliceParaResposta } from '../servicos/cotacoes.js';
import { numeroApolice } from './validacoes.js';

export const rotasApolices = Router();

rotasApolices.get('/', async (req, res) => {
  const apolices = await Apolice.find({ usuario: req.usuario._id }).sort({ emitidaEm: -1 });
  res.json({ apolices: apolices.map((a) => apoliceParaResposta(a, { completa: false })) });
});

rotasApolices.get('/:numero', async (req, res) => {
  const numero = numeroApolice.safeParse(req.params.numero);
  const apolice = numero.success ? await Apolice.findOne({ numero: numero.data, usuario: req.usuario._id }) : null;
  if (!apolice) throw new ErroApp(404, 'Apólice não encontrada.');
  res.json({ apolice: apoliceParaResposta(apolice) });
});
