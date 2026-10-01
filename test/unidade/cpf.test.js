import { describe, expect, it } from 'vitest';
import { cpfValido, formatarCpf, gerarCpfFicticio, mascararCpf } from '../../src/lib/cpf.js';

describe('cpf', () => {
  it('aceita CPFs com dígitos verificadores corretos, com ou sem pontuação', () => {
    // CPFs de teste gerados pelo algoritmo, sem relação com pessoas reais.
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('52998224725')).toBe(true);
  });

  it('rejeita dígitos errados, tamanho errado e sequências repetidas', () => {
    expect(cpfValido('529.982.247-26')).toBe(false);
    expect(cpfValido('1234567890')).toBe(false);
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cpfValido('')).toBe(false);
  });

  it('formata e mascara', () => {
    expect(formatarCpf('52998224725')).toBe('529.982.247-25');
    expect(mascararCpf('52998224725')).toBe('***.982.247-**');
  });

  it('gera CPFs fictícios sempre válidos', () => {
    for (let i = 0; i < 200; i++) {
      expect(cpfValido(gerarCpfFicticio())).toBe(true);
    }
  });
});
