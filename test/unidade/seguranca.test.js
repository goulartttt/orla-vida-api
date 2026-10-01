import { describe, expect, it } from 'vitest';
import { cifrar, decifrar, hashDeBusca } from '../../src/lib/criptografia.js';
import { gerarHashSenha, verificarSenha } from '../../src/lib/senha.js';

describe('criptografia do CPF', () => {
  it('cifra e decifra, gerando um valor diferente a cada vez', () => {
    const a = cifrar('52998224725');
    const b = cifrar('52998224725');
    expect(a).not.toBe(b);
    expect(a).not.toContain('52998224725');
    expect(decifrar(a)).toBe('52998224725');
  });

  it('detecta adulteração', () => {
    const [versao, iv, tag, dados] = cifrar('52998224725').split(':');
    const adulterado = Buffer.from(dados, 'base64');
    adulterado[0] ^= 1;
    expect(() => decifrar([versao, iv, tag, adulterado.toString('base64')].join(':'))).toThrow();
  });

  it('hash de busca é determinístico e não revela o CPF', () => {
    expect(hashDeBusca('52998224725')).toBe(hashDeBusca('52998224725'));
    expect(hashDeBusca('52998224725')).not.toBe(hashDeBusca('52998224726'));
    expect(hashDeBusca('52998224725')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('senha', () => {
  it('gera hash com sal e confere só a senha certa', async () => {
    const hash = await gerarHashSenha('segredo123');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(hash).not.toBe(await gerarHashSenha('segredo123'));
    expect(await verificarSenha('segredo123', hash)).toBe(true);
    expect(await verificarSenha('segredo124', hash)).toBe(false);
  });
});
