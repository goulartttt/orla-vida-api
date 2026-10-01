import { ErroApp } from '../lib/erros.js';
import { premioCoberturaCentavos } from './premio.js';

// Catálogo FICTÍCIO de coberturas. Limites e taxas foram inventados para o projeto.
export const COBERTURAS = Object.freeze([
  {
    codigo: 'MORTE',
    nome: 'Morte por qualquer causa',
    descricao:
      'Paga o capital aos beneficiários se o segurado falecer, seja por causa natural ou acidental.',
    obrigatoria: true,
    capitalMinimo: 10_000,
    capitalMaximo: 1_000_000,
    taxaAnual: 0.003,
  },
  {
    codigo: 'INVALIDEZ',
    nome: 'Invalidez permanente total por acidente',
    descricao:
      'Paga o capital ao próprio segurado se um acidente causar invalidez permanente e total.',
    obrigatoria: false,
    capitalMinimo: 10_000,
    capitalMaximo: 500_000,
    taxaAnual: 0.0012,
  },
  {
    codigo: 'DOENCA_TERMINAL',
    nome: 'Antecipação por doença terminal',
    descricao:
      'Antecipa o pagamento ao segurado diagnosticado com uma doença em estágio terminal.',
    obrigatoria: false,
    capitalMinimo: 10_000,
    capitalMaximo: 500_000,
    taxaAnual: 0.0008,
  },
  {
    codigo: 'FUNERAL',
    nome: 'Assistência funeral',
    descricao: 'Reembolsa as despesas com o funeral do segurado, até o limite contratado.',
    obrigatoria: false,
    capitalMinimo: 3_000,
    capitalMaximo: 15_000,
    taxaAnual: 0.01,
  },
]);

const PRINCIPAL = 'MORTE';
const ordem = new Map(COBERTURAS.map((c, i) => [c.codigo, i]));

export const coberturaPorCodigo = (codigo) => COBERTURAS.find((c) => c.codigo === codigo);

const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

/**
 * Valida as coberturas escolhidas e calcula o prêmio de cada uma.
 * Regras: códigos conhecidos e sem repetição, capital dentro dos limites,
 * cobertura principal obrigatória e adicionais com capital até o da principal.
 */
export function validarCoberturas(itens) {
  const erros = [];
  const vistos = new Set();
  const resultado = [];

  itens.forEach((item, i) => {
    const definicao = coberturaPorCodigo(item.codigo);
    if (!definicao) {
      erros.push({ campo: `coberturas.${i}.codigo`, mensagem: 'Cobertura desconhecida.' });
      return;
    }
    if (vistos.has(definicao.codigo)) {
      erros.push({ campo: `coberturas.${i}.codigo`, mensagem: `"${definicao.nome}" foi escolhida duas vezes.` });
      return;
    }
    vistos.add(definicao.codigo);

    if (item.capital < definicao.capitalMinimo || item.capital > definicao.capitalMaximo) {
      erros.push({
        campo: `coberturas.${i}.capital`,
        mensagem: `O capital de "${definicao.nome}" deve ficar entre ${reais.format(definicao.capitalMinimo)} e ${reais.format(definicao.capitalMaximo)}.`,
      });
    }

    resultado.push({
      codigo: definicao.codigo,
      capital: item.capital,
      premioAnualCentavos: premioCoberturaCentavos(item.capital, definicao.taxaAnual),
    });
  });

  for (const obrigatoria of COBERTURAS.filter((c) => c.obrigatoria && !vistos.has(c.codigo))) {
    erros.push({ campo: 'coberturas', mensagem: `A cobertura "${obrigatoria.nome}" é obrigatória.` });
  }

  const principal = resultado.find((r) => r.codigo === PRINCIPAL);
  if (principal) {
    for (const adicional of resultado.filter((r) => r.codigo !== PRINCIPAL && r.capital > principal.capital)) {
      erros.push({
        campo: 'coberturas',
        mensagem: `O capital de "${coberturaPorCodigo(adicional.codigo).nome}" não pode ser maior que o da cobertura principal.`,
      });
    }
  }

  if (erros.length) throw new ErroApp(422, 'Revise as coberturas escolhidas.', erros);

  return resultado.sort((a, b) => ordem.get(a.codigo) - ordem.get(b.codigo));
}
