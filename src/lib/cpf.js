export function somenteDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

function digitoVerificador(base) {
  let soma = 0;
  for (let i = 0; i < base.length; i++) {
    soma += Number(base[i]) * (base.length + 1 - i);
  }
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

/** Valida o CPF pelos dígitos verificadores (aceita com ou sem pontuação). */
export function cpfValido(valor) {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  return (
    digitoVerificador(cpf.slice(0, 9)) === Number(cpf[9]) &&
    digitoVerificador(cpf.slice(0, 10)) === Number(cpf[10])
  );
}

export function formatarCpf(valor) {
  return somenteDigitos(valor).replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

/** Mostra só os dígitos do meio: ***.456.789-** */
export function mascararCpf(valor) {
  const cpf = somenteDigitos(valor);
  return `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
}

/**
 * Gera um CPF matematicamente válido e aleatório, usado só nos dados de demonstração.
 * Não corresponde a ninguém de propósito; é um número de teste.
 */
export function gerarCpfFicticio(aleatorio = Math.random) {
  let base;
  do {
    base = Array.from({ length: 9 }, () => Math.floor(aleatorio() * 10)).join('');
  } while (/^(\d)\1{8}$/.test(base));

  const primeiro = digitoVerificador(base);
  const segundo = digitoVerificador(base + primeiro);
  return `${base}${primeiro}${segundo}`;
}
