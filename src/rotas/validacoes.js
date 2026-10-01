import { z } from 'zod';
import { PARENTESCOS, REGRAS } from '../dominio/regras.js';
import { cpfValido } from '../lib/cpf.js';

// Esquemas "strict": campos extras são rejeitados, o que também impede
// a injeção de operadores do MongoDB (ex.: { "$gt": "" }) pelo corpo da requisição.

const nome = z.string().trim().min(3, 'Informe o nome completo.').max(120, 'Nome muito longo.');
const email = z
  .email('Informe um e-mail válido.')
  .max(160, 'E-mail muito longo.')
  .transform((v) => v.toLowerCase());

export const esquemaCadastro = z
  .object({
    nome,
    email,
    senha: z
      .string()
      .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
      .max(72, 'A senha pode ter no máximo 72 caracteres.')
      .regex(/[A-Za-z]/, 'A senha precisa ter pelo menos uma letra.')
      .regex(/\d/, 'A senha precisa ter pelo menos um número.'),
  })
  .strict();

export const esquemaLogin = z
  .object({ email, senha: z.string().min(1, 'Informe a senha.').max(200) })
  .strict();

export const esquemaCotacao = z
  .object({
    segurado: z
      .object({
        nome,
        cpf: z.string().max(14).refine(cpfValido, 'CPF inválido.'),
        dataNascimento: z.iso.date('Data de nascimento inválida.'),
      })
      .strict(),
    coberturas: z
      .array(z.object({ codigo: z.string().max(40), capital: z.number().int('Use um valor inteiro.').positive() }).strict())
      .min(1, 'Escolha pelo menos uma cobertura.')
      .max(10),
    inicioVigencia: z.iso.date('Data de início inválida.'),
  })
  .strict();

export const esquemaEfetivacao = z
  .object({
    pagamento: z
      .object({
        forma: z.enum(['avista', 'parcelado'], 'Escolha a forma de pagamento.'),
        parcelas: z.number().int().optional(),
      })
      .strict(),
    beneficiarios: z
      .array(
        z
          .object({
            nome,
            parentesco: z.enum(PARENTESCOS, 'Escolha o parentesco.'),
            percentual: z.number().int().min(1, 'Mínimo de 1%.').max(100, 'Máximo de 100%.'),
          })
          .strict(),
      )
      .min(1, 'Informe pelo menos um beneficiário.')
      .max(REGRAS.beneficiariosMaximos, `Informe no máximo ${REGRAS.beneficiariosMaximos} beneficiários.`)
      .refine(
        (lista) => lista.reduce((soma, b) => soma + b.percentual, 0) === 100,
        'A soma dos percentuais dos beneficiários deve ser 100%.',
      ),
  })
  .strict();

export const numeroCotacao = z.coerce.number().int().positive();
export const numeroApolice = z.string().regex(/^ORL-\d{4}-\d{2}-\d{6}$/);
