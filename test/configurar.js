import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll } from 'vitest';

// Segredos descartáveis, gerados a cada execução. Nenhum teste usa o banco real.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.CPF_CHAVE_CRIPTOGRAFIA = randomBytes(32).toString('base64');
process.env.CPF_CHAVE_HMAC = randomBytes(32).toString('hex');
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/nao-usado-nos-testes';

let servidor;

beforeAll(async () => {
  servidor = await MongoMemoryServer.create();
  await mongoose.connect(servidor.getUri());
  // Garante os índices (unicidade, TTL) antes dos testes rodarem.
  await Promise.all(Object.values(mongoose.models).map((modelo) => modelo.init()));
});

afterAll(async () => {
  await mongoose.disconnect();
  await servidor?.stop();
});
