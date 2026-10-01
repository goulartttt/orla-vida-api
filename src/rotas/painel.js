import { Router } from 'express';
import { Apolice } from '../models/Apolice.js';
import { Cotacao } from '../models/Cotacao.js';
import { apoliceParaResposta, cotacaoParaResposta, situacaoDaApolice } from '../servicos/cotacoes.js';

export const rotasPainel = Router();

/** Resumo para a tela inicial do usuário logado. */
rotasPainel.get('/', async (req, res) => {
  const [cotacoesAbertas, apolices] = await Promise.all([
    Cotacao.find({ usuario: req.usuario._id, status: 'aberta' }).sort({ numero: -1 }),
    Apolice.find({ usuario: req.usuario._id }).sort({ emitidaEm: -1 }),
  ]);

  const ativas = apolices.filter((a) => situacaoDaApolice(a) !== 'encerrada');

  res.json({
    resumo: {
      cotacoesAbertas: cotacoesAbertas.length,
      apolicesAtivas: ativas.length,
      premioAnualAtivoCentavos: ativas.reduce((total, a) => total + a.premioAnualCentavos, 0),
    },
    ultimasCotacoes: cotacoesAbertas.slice(0, 3).map((c) => cotacaoParaResposta(c)),
    ultimasApolices: apolices.slice(0, 3).map((a) => apoliceParaResposta(a, { completa: false })),
  });
});
