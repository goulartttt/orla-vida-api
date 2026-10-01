import { ZodError } from 'zod';

/** Erro esperado de negócio: vira uma resposta HTTP com mensagem para o usuário. */
export class ErroApp extends Error {
  constructor(status, mensagem, campos) {
    super(mensagem);
    this.status = status;
    this.campos = campos;
  }
}

export const naoEncontrado = (recurso) => new ErroApp(404, `${recurso} não encontrada.`);

/** Converte qualquer erro em JSON `{ erro, campos? }` sem vazar detalhes internos. */
// Express identifica o tratador de erros pela aridade (4 parâmetros).
// eslint-disable-next-line no-unused-vars
export function tratarErros(erro, req, res, next) {
  if (erro instanceof ZodError) {
    return res.status(400).json({
      erro: 'Alguns dados não estão corretos.',
      campos: erro.issues.map((issue) => ({ campo: issue.path.join('.'), mensagem: issue.message })),
    });
  }

  if (erro instanceof ErroApp) {
    return res.status(erro.status).json({ erro: erro.message, ...(erro.campos && { campos: erro.campos }) });
  }

  if (erro?.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'O corpo da requisição não é um JSON válido.' });
  }

  if (erro?.type === 'entity.too.large') {
    return res.status(413).json({ erro: 'A requisição é grande demais.' });
  }

  if (erro?.code === 11000) {
    return res.status(409).json({ erro: 'Este registro já existe.' });
  }

  console.error('[erro inesperado]', erro);
  return res.status(500).json({ erro: 'Algo deu errado do nosso lado. Tente novamente em instantes.' });
}
