// Datas de negócio trafegam como texto `AAAA-MM-DD`, sem horário, para não
// sofrer com fuso horário. "Hoje" é sempre o dia no horário de Brasília.

const FUSO = 'America/Sao_Paulo';
const formatoISO = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function hoje(agora = new Date()) {
  return formatoISO.format(agora);
}

const partes = (data) => data.split('-').map(Number);

export function somarDias(data, dias) {
  const [ano, mes, dia] = partes(data);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

/** Soma anos mantendo o dia; 29/02 vira 28/02 em ano não bissexto. */
export function somarAnos(data, anos) {
  const [ano, mes, dia] = partes(data);
  const resultado = new Date(Date.UTC(ano + anos, mes - 1, dia));
  if (resultado.getUTCMonth() !== mes - 1) resultado.setUTCDate(0);
  return resultado.toISOString().slice(0, 10);
}

export function idadeEm(nascimento, referencia) {
  const [anoN, mesN, diaN] = partes(nascimento);
  const [anoR, mesR, diaR] = partes(referencia);
  let idade = anoR - anoN;
  if (mesR < mesN || (mesR === mesN && diaR < diaN)) idade--;
  return idade;
}
