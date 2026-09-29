// Gráficos em SVG (desenho vetorial feito à mão, sem biblioteca).
// As cores vêm do style.css, pelas classes; aqui só ficam as medidas do desenho.

import { formatarNumero, formatarSemana, mesCurto, diasEntre } from "./formato.js";
import { infoValor } from "./modelo.js";

const COLUNA = 46;          // largura de cada dia nos gráficos da semana
const LARGURA_SEMANA = COLUNA * 7;
const centro = (i) => COLUNA * i + COLUNA / 2;

// Ajusta a escala vertical: pelo menos "folgaMinima" entre o menor e o maior,
// para uma variação de 100 g não parecer uma montanha.
function escala(valores, folgaMinima) {
  let min = Math.min(...valores), max = Math.max(...valores);
  if (max - min < folgaMinima) {
    const meio = (min + max) / 2;
    min = meio - folgaMinima / 2;
    max = meio + folgaMinima / 2;
  }
  return { min, max };
}

// Peso da semana: 7 posições (segunda a domingo), com o valor escrito em cada ponto.
// "pesos" é uma lista de 7 números (ou undefined nos dias sem pesagem).
export function graficoPesoSemana(pesos) {
  const ALTURA = 84, TOPO = 24, BASE = ALTURA - 10;
  const valores = pesos.filter((v) => v !== undefined);
  let conteudo;
  if (valores.length === 0) {
    conteudo = `<text x="${LARGURA_SEMANA / 2}" y="${ALTURA / 2}" class="rotulo-grafico" text-anchor="middle">sem pesagens nesta semana</text>`;
  } else {
    const { min, max } = escala(valores, 1);
    const y = (v) => BASE - ((v - min) / (max - min)) * (BASE - TOPO);
    const pontos = pesos.map((v, i) => (v === undefined ? null : { x: centro(i), y: y(v), v })).filter(Boolean);
    conteudo = `
      <polyline class="linha-grafico" points="${pontos.map((p) => `${p.x},${p.y}`).join(" ")}"/>
      ${pontos.map((p) => `
        <circle class="ponto-grafico" cx="${p.x}" cy="${p.y}" r="4"/>
        <text class="rotulo-grafico" x="${p.x}" y="${p.y - 9}" text-anchor="middle">${formatarNumero(p.v)}</text>`).join("")}`;
  }
  return `<svg class="grafico" viewBox="0 0 ${LARGURA_SEMANA} ${ALTURA}" role="img" aria-label="Peso de cada dia da semana">${conteudo}</svg>`;
}

// Sono da semana: barras com altura = horas e cor = qualidade.
// "dias" é uma lista de 7 registros (ou {}).
export function graficoSonoSemana(dias) {
  const ALTURA = 84, TOPO = 16, BASE = ALTURA - 2, LARGURA_BARRA = 22;
  const horas = dias.map((d) => d.sono_horas).filter((v) => v !== undefined);
  const maximo = Math.max(10, ...horas);
  const barras = dias.map((d, i) => {
    if (d.sono_horas === undefined) return "";
    const h = (d.sono_horas / maximo) * (BASE - TOPO);
    const x = centro(i) - LARGURA_BARRA / 2;
    const cor = infoValor("sonoQualidade", d.sono_qualidade).cor;
    return `
      <rect class="cheia" data-cor="${cor}" x="${x}" y="${BASE - h}" width="${LARGURA_BARRA}" height="${h}" rx="4"/>
      <text class="rotulo-grafico" x="${centro(i)}" y="${BASE - h - 4}" text-anchor="middle">${formatarNumero(d.sono_horas, 0)}</text>`;
  }).join("");
  const conteudo = horas.length
    ? barras
    : `<text x="${LARGURA_SEMANA / 2}" y="${ALTURA / 2}" class="rotulo-grafico" text-anchor="middle">sono não marcado nesta semana</text>`;
  return `
    <svg class="grafico" viewBox="0 0 ${LARGURA_SEMANA} ${ALTURA}" role="img" aria-label="Horas de sono de cada dia da semana">
      <line class="eixo-grafico" x1="0" x2="${LARGURA_SEMANA}" y1="${BASE}" y2="${BASE}"/>
      ${conteudo}
    </svg>`;
}

// Aba Peso: um ponto por semana (a média), ligados por uma linha.
// A distância entre os pontos respeita o tempo: semanas sem pesagem deixam um espaço.
// "semanas" vem de semanasComPeso(); "selecionada" é o índice do ponto tocado.
export function graficoPesoAcumulado(semanas, selecionada) {
  const PASSO = 30, MARGEM = 28, ALTURA = 230, TOPO = 30, BASE = ALTURA - 34;
  const primeira = semanas[0].segunda;
  const x = (s) => MARGEM + (diasEntre(primeira, s.segunda) / 7) * PASSO;
  const largura = Math.max(320, x(semanas[semanas.length - 1]) + MARGEM);
  const { min, max } = escala(semanas.map((s) => s.media), 2);
  const y = (v) => BASE - ((v - min) / (max - min)) * (BASE - TOPO);

  // Nome do mês embaixo da primeira semana de cada mês
  let ultimoMes = "";
  const meses = semanas.map((s) => {
    const m = mesCurto(s.segunda);
    if (m === ultimoMes) return "";
    ultimoMes = m;
    return `<text class="rotulo-grafico" x="${x(s)}" y="${ALTURA - 8}" text-anchor="middle">${m}</text>`;
  }).join("");

  const pontos = semanas.map((s, i) => `
    <g class="ponto-semana ${i === selecionada ? "selecionado" : ""}" data-i="${i}">
      <circle class="ponto-grafico" cx="${x(s)}" cy="${y(s.media)}" r="${i === selecionada ? 7 : 5}"/>
      <circle class="alvo-toque" cx="${x(s)}" cy="${y(s.media)}" r="22"/>
    </g>`).join("");

  // Valor escrito só no ponto selecionado (o resto aparece ao tocar)
  const sel = semanas[selecionada];
  const rotulo = `<text class="rotulo-grafico destaque" x="${x(sel)}" y="${y(sel.media) - 14}" text-anchor="middle">${formatarNumero(sel.media)}</text>`;

  return `
    <svg class="grafico-acumulado" width="${largura}" height="${ALTURA}" viewBox="0 0 ${largura} ${ALTURA}"
      role="img" aria-label="Média de peso de cada semana">
      <line class="eixo-grafico" x1="0" x2="${largura}" y1="${BASE + 12}" y2="${BASE + 12}"/>
      <polyline class="linha-grafico" points="${semanas.map((s) => `${x(s)},${y(s.media)}`).join(" ")}"/>
      ${meses}${pontos}${rotulo}
    </svg>`;
}

// Texto do detalhe de uma semana da aba Peso
export function detalheSemana(s) {
  return { intervalo: formatarSemana(s.segunda), media: formatarNumero(s.media), n: s.n };
}
