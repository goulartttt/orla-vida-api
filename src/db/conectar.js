import mongoose from 'mongoose';
import { config } from '../config/env.js';

mongoose.set('strictQuery', true);

let conexaoPendente = null;

/**
 * Conecta uma única vez e reaproveita a conexão entre requisições.
 * Na Vercel a mesma instância atende várias chamadas, então isso evita
 * abrir uma conexão nova com o Atlas a cada request.
 */
export function conectarBanco() {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose);

  if (!conexaoPendente) {
    conexaoPendente = mongoose
      .connect(config().MONGODB_URI, { serverSelectionTimeoutMS: 8000, maxPoolSize: 10 })
      .catch((erro) => {
        conexaoPendente = null;
        throw erro;
      });
  }
  return conexaoPendente;
}
