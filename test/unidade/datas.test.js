import { describe, expect, it } from 'vitest';
import { hoje, idadeEm, somarAnos, somarDias } from '../../src/lib/datas.js';

describe('datas', () => {
  it('"hoje" usa o horário de Brasília', () => {
    // 02h UTC do dia 2 ainda é dia 1 em Brasília (UTC-3).
    expect(hoje(new Date('2026-03-02T02:00:00Z'))).toBe('2026-03-01');
  });

  it('soma dias atravessando meses e anos', () => {
    expect(somarDias('2026-12-25', 10)).toBe('2027-01-04');
  });

  it('soma anos e trata 29 de fevereiro', () => {
    expect(somarAnos('2026-10-01', 1)).toBe('2027-10-01');
    expect(somarAnos('2028-02-29', 1)).toBe('2029-02-28');
  });

  it('calcula a idade considerando se já fez aniversário', () => {
    expect(idadeEm('1990-10-02', '2026-10-01')).toBe(35);
    expect(idadeEm('1990-10-01', '2026-10-01')).toBe(36);
  });
});
