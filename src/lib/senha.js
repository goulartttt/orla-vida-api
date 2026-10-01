import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

// Parâmetros recomendados pela OWASP para scrypt (N=2^14, r=8, p=1 é o mínimo; usamos 2^15).
const PARAMETROS = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const TAMANHO_HASH = 64;

const normalizar = (senha) => String(senha).normalize('NFKC');

/** Gera `scrypt$N$r$p$sal$hash`, guardando os parâmetros junto para permitir trocá-los no futuro. */
export async function gerarHashSenha(senha) {
  const sal = randomBytes(16);
  const hash = await scryptAsync(normalizar(senha), sal, TAMANHO_HASH, PARAMETROS);
  const { N, r, p } = PARAMETROS;
  return ['scrypt', N, r, p, sal.toString('base64'), hash.toString('base64')].join('$');
}

export async function verificarSenha(senha, armazenado) {
  const [algoritmo, N, r, p, sal, hash] = String(armazenado).split('$');
  if (algoritmo !== 'scrypt' || !sal || !hash) return false;

  const esperado = Buffer.from(hash, 'base64');
  const calculado = await scryptAsync(normalizar(senha), Buffer.from(sal, 'base64'), esperado.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
    maxmem: PARAMETROS.maxmem,
  });
  return timingSafeEqual(esperado, calculado);
}

// Hash de uma senha aleatória, usado para gastar o mesmo tempo quando o e-mail não existe.
// Assim o tempo de resposta não revela quais e-mails têm conta.
let hashFalso;
export async function obterHashFalso() {
  hashFalso ??= await gerarHashSenha(randomBytes(32).toString('base64'));
  return hashFalso;
}
