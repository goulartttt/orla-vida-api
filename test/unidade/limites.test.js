import { describe, expect, it } from 'vitest';
import { config } from '../../src/config/env.js';
import { ipDoVisitante } from '../../src/middleware/limites.js';

const requisicao = (cabecalhos, ip = '10.0.0.1') => ({ ip, get: (nome) => cabecalhos[nome.toLowerCase()] });

describe('ipDoVisitante', () => {
  it('usa o IP da conexão quando não há proxy', () => {
    expect(ipDoVisitante(requisicao({}))).toBe('10.0.0.1');
  });

  it('ignora um IP informado sem o segredo do proxy (impede falsificação)', () => {
    expect(ipDoVisitante(requisicao({ 'x-orla-ip': '1.2.3.4' }))).toBe('10.0.0.1');
    expect(ipDoVisitante(requisicao({ 'x-orla-ip': '1.2.3.4', 'x-orla-proxy': 'chute-errado' }))).toBe('10.0.0.1');
  });

  it('confia no IP informado quando o segredo do proxy confere', () => {
    expect(ipDoVisitante(requisicao({ 'x-orla-ip': '1.2.3.4', 'x-orla-proxy': config().PROXY_SECRET }))).toBe('1.2.3.4');
  });
});
