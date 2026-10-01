import { randomBytes } from 'node:crypto';
import request from 'supertest';
import app from '../../src/index.js';
import { gerarCpfFicticio } from '../../src/lib/cpf.js';
import { hoje, somarDias } from '../../src/lib/datas.js';

/** Cria um usuário novo e devolve um "agente" que guarda o cookie de sessão. */
export async function novoUsuarioLogado() {
  const agente = request.agent(app);
  const email = `pessoa-${randomBytes(4).toString('hex')}@exemplo.test`;
  const resposta = await agente.post('/auth/cadastro').send({ nome: 'Pessoa de Teste', email, senha: 'senhaForte1' });
  if (resposta.status !== 201) throw new Error(`cadastro falhou: ${JSON.stringify(resposta.body)}`);
  return { agente, email, usuario: resposta.body.usuario };
}

export function dadosDeCotacao(sobrescrever = {}) {
  return {
    segurado: { nome: 'Segurado de Teste', cpf: gerarCpfFicticio(), dataNascimento: '1990-01-15' },
    coberturas: [
      { codigo: 'MORTE', capital: 200_000 },
      { codigo: 'INVALIDEZ', capital: 100_000 },
    ],
    inicioVigencia: somarDias(hoje(), 1),
    ...sobrescrever,
  };
}

export const efetivacaoValida = {
  pagamento: { forma: 'parcelado', parcelas: 4 },
  beneficiarios: [
    { nome: 'Beneficiário Um', parentesco: 'conjuge', percentual: 70 },
    { nome: 'Beneficiário Dois', parentesco: 'filho', percentual: 30 },
  ],
};

export { app, request };
