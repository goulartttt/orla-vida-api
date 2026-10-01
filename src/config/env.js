import { z } from 'zod';

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  MONGODB_URI: z.string().startsWith('mongodb', 'deve ser uma string de conexão do MongoDB'),
  JWT_SECRET: z.string().min(32, 'deve ter pelo menos 32 caracteres'),
  CPF_CHAVE_CRIPTOGRAFIA: z
    .string()
    .refine((valor) => Buffer.from(valor, 'base64').length === 32, 'deve ter 32 bytes em base64'),
  CPF_CHAVE_HMAC: z.string().min(32, 'deve ter pelo menos 32 caracteres'),
  ORIGENS_PERMITIDAS: z.string().default('http://localhost:5173'),
  // Segredo compartilhado com o proxy do site (orla-vida/api/proxy.js). Opcional em desenvolvimento.
  PROXY_SECRET: z.string().min(32, 'deve ter pelo menos 32 caracteres').optional(),
});

let configuracao;

/**
 * Lê e valida as variáveis de ambiente na primeira chamada.
 * Falha cedo, com uma mensagem clara, se algum segredo estiver ausente ou fraco.
 */
export function config() {
  if (!configuracao) {
    const resultado = esquema.safeParse(process.env);
    if (!resultado.success) {
      const problemas = resultado.error.issues
        .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      throw new Error(`Variáveis de ambiente inválidas:\n${problemas}\nVeja o arquivo .env.example.`);
    }
    configuracao = {
      ...resultado.data,
      origensPermitidas: resultado.data.ORIGENS_PERMITIDAS.split(',').map((o) => o.trim()),
    };
  }
  return configuracao;
}

export function emProducao() {
  return config().NODE_ENV === 'production' || process.env.VERCEL === '1';
}
