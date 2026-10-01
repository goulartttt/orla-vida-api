import { describe, expect, it } from 'vitest';
import { validarCoberturas } from '../../src/dominio/coberturas.js';
import { calcularPagamento, parcelasDisponiveis, premioCoberturaCentavos } from '../../src/dominio/premio.js';
import { ErroApp } from '../../src/lib/erros.js';

describe('prêmio', () => {
  it('calcula o prêmio anual em centavos (capital × taxa)', () => {
    expect(premioCoberturaCentavos(200_000, 0.003)).toBe(60_000); // R$ 600,00
    expect(premioCoberturaCentavos(10_000, 0.0008)).toBe(800); // R$ 8,00
  });

  it('à vista aplica 5% de desconto', () => {
    expect(calcularPagamento(60_000, 'avista')).toMatchObject({
      parcelas: 1,
      totalCentavos: 57_000,
      descontoCentavos: 3_000,
    });
  });

  it('parcelado divide sem juros e joga os centavos que sobram na primeira parcela', () => {
    const pagamento = calcularPagamento(10_001, 'parcelado', 3);
    expect(pagamento).toMatchObject({ totalCentavos: 10_001, valorParcelaCentavos: 3_333, primeiraParcelaCentavos: 3_335 });
    expect(pagamento.primeiraParcelaCentavos + pagamento.valorParcelaCentavos * 2).toBe(10_001);
  });

  it('respeita a parcela mínima de R$ 20,00 e o máximo de 12x', () => {
    expect(parcelasDisponiveis(3_000)).toBe(1);
    expect(parcelasDisponiveis(10_000)).toBe(5);
    expect(parcelasDisponiveis(1_000_000)).toBe(12);
    expect(() => calcularPagamento(10_000, 'parcelado', 6)).toThrow('Escolha entre 2 e 5 parcelas.');
    expect(() => calcularPagamento(3_000, 'parcelado', 2)).toThrow('apenas à vista');
  });
});

describe('validarCoberturas', () => {
  it('ordena pelo catálogo e calcula o prêmio de cada cobertura', () => {
    const resultado = validarCoberturas([
      { codigo: 'FUNERAL', capital: 5_000 },
      { codigo: 'MORTE', capital: 100_000 },
    ]);
    expect(resultado.map((c) => c.codigo)).toEqual(['MORTE', 'FUNERAL']);
    expect(resultado[1].premioAnualCentavos).toBe(5_000);
  });

  const erroDe = (itens) => {
    try {
      validarCoberturas(itens);
    } catch (erro) {
      return erro;
    }
    throw new Error('deveria ter falhado');
  };

  it('exige a cobertura principal', () => {
    const erro = erroDe([{ codigo: 'INVALIDEZ', capital: 50_000 }]);
    expect(erro).toBeInstanceOf(ErroApp);
    expect(erro.campos[0].mensagem).toContain('obrigatória');
  });

  it('rejeita capital fora dos limites, código desconhecido e repetição', () => {
    const erro = erroDe([
      { codigo: 'MORTE', capital: 5_000 },
      { codigo: 'MORTE', capital: 20_000 },
      { codigo: 'INEXISTENTE', capital: 1 },
    ]);
    expect(erro.campos.map((c) => c.campo)).toEqual(['coberturas.0.capital', 'coberturas.1.codigo', 'coberturas.2.codigo']);
  });

  it('não permite adicional com capital maior que a principal', () => {
    const erro = erroDe([
      { codigo: 'MORTE', capital: 50_000 },
      { codigo: 'INVALIDEZ', capital: 80_000 },
    ]);
    expect(erro.campos[0].mensagem).toContain('não pode ser maior');
  });
});
