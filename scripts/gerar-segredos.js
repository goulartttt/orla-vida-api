// Gera segredos aleatórios para o .env: `npm run gerar-segredos`
// ATENÇÃO: trocar CPF_CHAVE_CRIPTOGRAFIA ou CPF_CHAVE_HMAC num banco que já tem dados
// torna os CPFs salvos ilegíveis. Gere uma vez por ambiente e guarde.
import { randomBytes } from 'node:crypto';

console.log(`JWT_SECRET=${randomBytes(48).toString('base64url')}`);
console.log(`CPF_CHAVE_CRIPTOGRAFIA=${randomBytes(32).toString('base64')}`);
console.log(`CPF_CHAVE_HMAC=${randomBytes(32).toString('base64url')}`);
