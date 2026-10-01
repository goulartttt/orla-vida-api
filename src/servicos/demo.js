import { randomBytes } from 'node:crypto';
import { gerarCpfFicticio } from '../lib/cpf.js';
import { hoje, somarDias } from '../lib/datas.js';
import { gerarHashSenha } from '../lib/senha.js';
import { Usuario } from '../models/Usuario.js';
import { criarCotacao, efetivarCotacao } from './cotacoes.js';

const VALIDADE_DEMO_MS = 24 * 60 * 60 * 1000;

/**
 * Cria uma conta de demonstração isolada, com dados FICTÍCIOS de exemplo.
 * Cada visitante ganha a sua; tudo é apagado automaticamente em 24 horas.
 */
export async function criarContaDemo() {
  const expiraEm = new Date(Date.now() + VALIDADE_DEMO_MS);
  const extras = { expiraEm };

  const usuario = await Usuario.create({
    nome: 'Visitante',
    email: `demo-${randomBytes(5).toString('hex')}@orla-vida.test`,
    senhaHash: await gerarHashSenha(randomBytes(24).toString('base64')),
    demo: true,
    expiraEm,
  });

  const dataHoje = hoje();

  await criarCotacao(
    usuario,
    {
      segurado: { nome: 'Cliente Exemplo', cpf: gerarCpfFicticio(), dataNascimento: '1991-05-14' },
      coberturas: [
        { codigo: 'MORTE', capital: 200_000 },
        { codigo: 'INVALIDEZ', capital: 100_000 },
      ],
      inicioVigencia: somarDias(dataHoje, 7),
    },
    extras,
  );

  const contratada = await criarCotacao(
    usuario,
    {
      segurado: { nome: 'Pessoa Exemplo', cpf: gerarCpfFicticio(), dataNascimento: '1986-11-02' },
      coberturas: [
        { codigo: 'MORTE', capital: 350_000 },
        { codigo: 'DOENCA_TERMINAL', capital: 150_000 },
        { codigo: 'FUNERAL', capital: 10_000 },
      ],
      inicioVigencia: dataHoje,
    },
    extras,
  );

  await efetivarCotacao(
    contratada,
    {
      pagamento: { forma: 'parcelado', parcelas: 6 },
      beneficiarios: [
        { nome: 'Beneficiária Exemplo A', parentesco: 'conjuge', percentual: 60 },
        { nome: 'Beneficiário Exemplo B', parentesco: 'filho', percentual: 40 },
      ],
    },
    extras,
  );

  return usuario;
}
