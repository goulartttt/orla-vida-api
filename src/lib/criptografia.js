import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { config } from '../config/env.js';

const ALGORITMO = 'aes-256-gcm';
const VERSAO = 'v1';

const chaveCriptografia = () => Buffer.from(config().CPF_CHAVE_CRIPTOGRAFIA, 'base64');

/**
 * Cifra um texto com AES-256-GCM. Cada chamada usa um IV novo, então o mesmo
 * CPF gera valores diferentes no banco. O formato é `v1:iv:tag:dados` (base64).
 */
export function cifrar(texto) {
  const iv = randomBytes(12);
  const cifra = createCipheriv(ALGORITMO, chaveCriptografia(), iv);
  const dados = Buffer.concat([cifra.update(texto, 'utf8'), cifra.final()]);
  const tag = cifra.getAuthTag();
  return [VERSAO, iv, tag, dados].map((parte) => (Buffer.isBuffer(parte) ? parte.toString('base64') : parte)).join(':');
}

/** Decifra e verifica a integridade: se o dado foi adulterado, lança erro. */
export function decifrar(pacote) {
  const [versao, iv, tag, dados] = String(pacote).split(':');
  if (versao !== VERSAO || !iv || !tag || !dados) {
    throw new Error('Formato de dado cifrado desconhecido.');
  }
  const decifra = createDecipheriv(ALGORITMO, chaveCriptografia(), Buffer.from(iv, 'base64'));
  decifra.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decifra.update(Buffer.from(dados, 'base64')), decifra.final()]).toString('utf8');
}

/**
 * "Índice cego": HMAC determinístico do CPF. Permite saber se dois registros
 * têm o mesmo CPF sem precisar decifrar nem guardar o CPF em texto puro.
 */
export function hashDeBusca(texto) {
  return createHmac('sha256', config().CPF_CHAVE_HMAC).update(texto).digest('hex');
}
