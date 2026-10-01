import { coberturaPorCodigo, validarCoberturas } from '../dominio/coberturas.js';
import { calcularPagamento, somarPremios } from '../dominio/premio.js';
import { REGRAS } from '../dominio/regras.js';
import { cifrar, decifrar, hashDeBusca } from '../lib/criptografia.js';
import { formatarCpf, mascararCpf, somenteDigitos } from '../lib/cpf.js';
import { hoje, idadeEm, somarAnos, somarDias } from '../lib/datas.js';
import { ErroApp } from '../lib/erros.js';
import { Apolice } from '../models/Apolice.js';
import { proximoNumero } from '../models/Contador.js';
import { Cotacao } from '../models/Cotacao.js';

function validarVigenciaEIdade({ inicioVigencia, dataNascimento }) {
  const dataHoje = hoje();
  const limite = somarDias(dataHoje, REGRAS.diasMaximosParaInicio);
  const erros = [];

  if (inicioVigencia < dataHoje || inicioVigencia > limite) {
    erros.push({
      campo: 'inicioVigencia',
      mensagem: `O início da vigência deve ser entre hoje e os próximos ${REGRAS.diasMaximosParaInicio} dias.`,
    });
  }

  const idade = idadeEm(dataNascimento, inicioVigencia);
  if (dataNascimento >= dataHoje || idade < REGRAS.idadeMinima || idade > REGRAS.idadeMaxima) {
    erros.push({
      campo: 'segurado.dataNascimento',
      mensagem: `O segurado precisa ter entre ${REGRAS.idadeMinima} e ${REGRAS.idadeMaxima} anos no início da vigência.`,
    });
  }

  if (erros.length) throw new ErroApp(422, 'Revise os dados da cotação.', erros);
}

/** Transforma os dados validados do formulário nos campos que vão para o banco. */
function montarCotacao(dados) {
  validarVigenciaEIdade({ inicioVigencia: dados.inicioVigencia, dataNascimento: dados.segurado.dataNascimento });
  const coberturas = validarCoberturas(dados.coberturas);
  const cpf = somenteDigitos(dados.segurado.cpf);

  return {
    segurado: {
      nome: dados.segurado.nome,
      dataNascimento: dados.segurado.dataNascimento,
      cpfCifrado: cifrar(cpf),
      cpfHash: hashDeBusca(cpf),
    },
    coberturas,
    inicioVigencia: dados.inicioVigencia,
    fimVigencia: somarAnos(dados.inicioVigencia, REGRAS.vigenciaAnos),
    premioAnualCentavos: somarPremios(coberturas),
  };
}

export async function criarCotacao(usuario, dados, extras = {}) {
  const campos = montarCotacao(dados);
  const numero = await proximoNumero('cotacao');
  return Cotacao.create({ ...campos, ...extras, numero, usuario: usuario._id });
}

export async function buscarCotacaoDoUsuario(usuario, numero) {
  // Filtrar sempre pelo dono: quem não é dono recebe 404, como se a cotação não existisse.
  const cotacao = await Cotacao.findOne({ numero, usuario: usuario._id });
  if (!cotacao) throw new ErroApp(404, 'Cotação não encontrada.');
  return cotacao;
}

function exigirAberta(cotacao, acao) {
  if (cotacao.status !== 'aberta') {
    throw new ErroApp(409, `Esta cotação já virou apólice e não pode ser ${acao}.`);
  }
}

export async function atualizarCotacao(cotacao, dados) {
  exigirAberta(cotacao, 'alterada');
  cotacao.set(montarCotacao(dados));
  return cotacao.save();
}

export async function excluirCotacao(cotacao) {
  exigirAberta(cotacao, 'excluída');
  await cotacao.deleteOne();
}

function numeroDaApolice(sequencia, data) {
  const [ano, mes] = data.split('-');
  return `ORL-${ano}-${mes}-${String(sequencia).padStart(6, '0')}`;
}

/** Contrata a cotação: calcula o pagamento, registra os beneficiários e emite a apólice. */
export async function efetivarCotacao(cotacao, { pagamento, beneficiarios }, extras = {}) {
  exigirAberta(cotacao, 'efetivada novamente');

  if (cotacao.inicioVigencia < hoje()) {
    throw new ErroApp(409, 'A data de início desta cotação já passou. Atualize a cotação antes de contratar.');
  }

  const conflito = await Apolice.exists({
    usuario: cotacao.usuario,
    'segurado.cpfHash': cotacao.segurado.cpfHash,
    inicioVigencia: { $lte: cotacao.fimVigencia },
    fimVigencia: { $gte: cotacao.inicioVigencia },
  });
  if (conflito) {
    throw new ErroApp(409, 'Este segurado já tem uma apólice vigente nesse período.');
  }

  let pagamentoCalculado;
  try {
    pagamentoCalculado = calcularPagamento(cotacao.premioAnualCentavos, pagamento.forma, pagamento.parcelas);
  } catch (erro) {
    if (erro instanceof RangeError) {
      throw new ErroApp(422, erro.message, [{ campo: 'pagamento.parcelas', mensagem: erro.message }]);
    }
    throw erro;
  }

  const numero = numeroDaApolice(await proximoNumero('apolice'), hoje());
  const apolice = await Apolice.create({
    numero,
    usuario: cotacao.usuario,
    numeroCotacao: cotacao.numero,
    segurado: cotacao.segurado.toObject(),
    coberturas: cotacao.coberturas.map((c) => c.toObject()),
    inicioVigencia: cotacao.inicioVigencia,
    fimVigencia: cotacao.fimVigencia,
    premioAnualCentavos: cotacao.premioAnualCentavos,
    pagamento: pagamentoCalculado,
    beneficiarios,
    ...extras,
  });

  cotacao.status = 'efetivada';
  cotacao.numeroApolice = numero;
  await cotacao.save();

  return apolice;
}

export function situacaoDaApolice(apolice, dataHoje = hoje()) {
  if (apolice.inicioVigencia > dataHoje) return 'agendada';
  if (apolice.fimVigencia < dataHoje) return 'encerrada';
  return 'vigente';
}

// ---- Serialização: o que sai da API ------------------------------------------------

function coberturasParaResposta(coberturas) {
  return coberturas.map((c) => ({
    codigo: c.codigo,
    nome: coberturaPorCodigo(c.codigo)?.nome ?? c.codigo,
    capital: c.capital,
    premioAnualCentavos: c.premioAnualCentavos,
  }));
}

function seguradoParaResposta(segurado, cpfCompleto) {
  const cpf = decifrar(segurado.cpfCifrado);
  return {
    nome: segurado.nome,
    dataNascimento: segurado.dataNascimento,
    cpf: cpfCompleto ? formatarCpf(cpf) : mascararCpf(cpf),
  };
}

/** Por padrão o CPF sai mascarado; completo só para o dono editar uma cotação aberta. */
export function cotacaoParaResposta(cotacao, { cpfCompleto = false } = {}) {
  return {
    numero: cotacao.numero,
    status: cotacao.status,
    numeroApolice: cotacao.numeroApolice ?? null,
    segurado: seguradoParaResposta(cotacao.segurado, cpfCompleto),
    coberturas: coberturasParaResposta(cotacao.coberturas),
    inicioVigencia: cotacao.inicioVigencia,
    fimVigencia: cotacao.fimVigencia,
    premioAnualCentavos: cotacao.premioAnualCentavos,
    criadaEm: cotacao.criadoEm,
    atualizadaEm: cotacao.atualizadoEm,
  };
}

export function apoliceParaResposta(apolice, { completa = true } = {}) {
  const resumo = {
    numero: apolice.numero,
    numeroCotacao: apolice.numeroCotacao,
    situacao: situacaoDaApolice(apolice),
    segurado: seguradoParaResposta(apolice.segurado, false),
    inicioVigencia: apolice.inicioVigencia,
    fimVigencia: apolice.fimVigencia,
    premioAnualCentavos: apolice.premioAnualCentavos,
    pagamento: { ...(apolice.pagamento.toObject?.() ?? apolice.pagamento) },
    emitidaEm: apolice.emitidaEm,
  };
  if (!completa) return resumo;

  return {
    ...resumo,
    coberturas: coberturasParaResposta(apolice.coberturas),
    beneficiarios: apolice.beneficiarios.map((b) => ({
      nome: b.nome,
      parentesco: b.parentesco,
      percentual: b.percentual,
    })),
  };
}
