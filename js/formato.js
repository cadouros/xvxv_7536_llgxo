// Datas e números no formato brasileiro.
//
// Regra importante: datas são sempre texto "AAAA-MM-DD" na data LOCAL do aparelho.
// Nunca usamos toISOString(), porque ela converte para UTC e, à noite,
// daria o dia seguinte.

const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
  "agosto", "setembro", "outubro", "novembro", "dezembro"];

function doisDigitos(n) {
  return String(n).padStart(2, "0");
}

// Date (local) -> "AAAA-MM-DD"
function paraTexto(d) {
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
}

// "AAAA-MM-DD" -> Date local ao meio-dia (meio-dia evita qualquer problema de fuso/horário de verão)
function paraDate(texto) {
  const [a, m, d] = texto.split("-").map(Number);
  return new Date(a, m - 1, d, 12);
}

// (2026, 9, 5) -> "2026-09-05". Mês de 1 a 12.
export function montarData(ano, mes, dia) {
  return `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`;
}

// (2026, 9) -> "setembro 2026"
export function formatarMes(ano, mes) {
  return `${MESES_LONGOS[mes - 1]} ${ano}`;
}

export function hojeISO() {
  return paraTexto(new Date());
}

// Soma (ou subtrai, se negativo) dias a uma data em texto
export function somarDias(texto, n) {
  const d = paraDate(texto);
  d.setDate(d.getDate() + n);
  return paraTexto(d);
}

// "2026-09-29" -> "terça, 29 set"
export function formatarCabecalho(texto) {
  const d = paraDate(texto);
  return `${DIAS_SEMANA[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]}`;
}

// Lê um número digitado ("62,4" ou "62.4"). Arredonda para 1 casa decimal.
// Devolve null se o texto não for um número válido dentro dos limites.
export function lerNumero(texto, minimo, maximo) {
  const limpo = texto.trim().replace(",", ".");
  if (!/^\d+(\.\d*)?$/.test(limpo)) return null;
  const n = Math.round(Number(limpo) * 10) / 10;
  if (n < minimo || n > maximo) return null;
  return n;
}

// 62.4 -> "62,4". casasMinimas = 1 mostra "62,0"; 0 mostra "7" em vez de "7,0".
export function formatarNumero(n, casasMinimas = 1) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: casasMinimas, maximumFractionDigits: 1 });
}
