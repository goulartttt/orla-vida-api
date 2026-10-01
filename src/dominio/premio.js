import { REGRAS } from './regras.js';

// Todo dinheiro é calculado em CENTAVOS (inteiros) para evitar erros de arredondamento.
// Este arquivo tem uma cópia no front (src/lib/premio.js) para a prévia; o valor
// que vale é sempre o calculado aqui, no servidor.

/** Prêmio anual de uma cobertura: capital (em reais) × taxa anual. */
export function premioCoberturaCentavos(capital, taxaAnual) {
  return Math.round(capital * taxaAnual * 100);
}

export function somarPremios(coberturas) {
  return coberturas.reduce((total, c) => total + c.premioAnualCentavos, 0);
}

/** Quantas parcelas cabem respeitando a parcela mínima. Menos de 2 = só à vista. */
export function parcelasDisponiveis(premioAnualCentavos) {
  return Math.min(REGRAS.parcelasMaximas, Math.floor(premioAnualCentavos / REGRAS.parcelaMinimaCentavos));
}

/**
 * À vista: desconto de 5%. Parcelado: de 2 até 12x sem juros; os centavos que
 * sobram da divisão vão para a primeira parcela.
 */
export function calcularPagamento(premioAnualCentavos, forma, parcelas) {
  if (forma === 'avista') {
    const totalCentavos = Math.round(premioAnualCentavos * (1 - REGRAS.descontoAVista));
    return {
      forma,
      parcelas: 1,
      totalCentavos,
      valorParcelaCentavos: totalCentavos,
      primeiraParcelaCentavos: totalCentavos,
      descontoCentavos: premioAnualCentavos - totalCentavos,
    };
  }

  if (forma === 'parcelado') {
    const maximo = parcelasDisponiveis(premioAnualCentavos);
    if (!Number.isInteger(parcelas) || parcelas < 2 || parcelas > maximo) {
      throw new RangeError(
        maximo < 2
          ? 'Para este valor, o pagamento é apenas à vista.'
          : `Escolha entre 2 e ${maximo} parcelas.`,
      );
    }
    const valorParcelaCentavos = Math.floor(premioAnualCentavos / parcelas);
    return {
      forma,
      parcelas,
      totalCentavos: premioAnualCentavos,
      valorParcelaCentavos,
      primeiraParcelaCentavos: premioAnualCentavos - valorParcelaCentavos * (parcelas - 1),
      descontoCentavos: 0,
    };
  }

  throw new RangeError('Forma de pagamento inválida.');
}
