// Tela "Calendário": o mês em grade (segunda a domingo), com três camadas.
// Tocar em um dia (até hoje) abre esse dia na tela Hoje.

import { REFEICOES, HABITOS, infoValor } from "./modelo.js";
import { lerDiasEntre } from "./dados.js";
import { hojeISO, montarData, formatarMes, formatarCabecalho, formatarNumero } from "./formato.js";

const CAMADAS = [
  { id: "refeicoes", nome: "Refeições" },
  { id: "habitos", nome: "Hábitos" },
  { id: "sono", nome: "Sono" },
];

const DIAS_SEMANA = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

// Legenda de cada camada: cada cor com a sua palavra, e onde fica cada coisa
const LEGENDAS = {
  refeicoes: {
    cores: [["verde", "seguiu"], ["vermelho", "livre"], ["vazio", "sem marcar"]],
    posicao: "Em cima: café da manhã, almoço, lanche 1. Embaixo: lanche 2, jantar.",
  },
  habitos: {
    cores: [["verde", "sim / treinei"], ["vermelho", "não / não treinei"], ["azul", "descanso"], ["vazio", "sem marcar"]],
    posicao: "Em cima: treino, água. Embaixo: leitura técnica, leitura de lazer.",
  },
  sono: {
    cores: [["verde", "boa"], ["amarelo", "ok"], ["vermelho", "ruim"], ["vazio", "sem marcar"]],
    posicao: "O número é quantas horas dormiu.",
  },
};

// O que fica guardado ao sair e voltar para o calendário
const hoje0 = hojeISO();
let ano = Number(hoje0.slice(0, 4));
let mes = Number(hoje0.slice(5, 7)); // 1 a 12
let camada = "refeicoes";
let aberturaAtual = 0;

function quadradinho(ciclo, valor) {
  return `<span class="quadradinho" data-cor="${infoValor(ciclo, valor).cor}"></span>`;
}

// Duas linhas de quadradinhos: "quantosEmCima" na primeira, o resto na segunda
function duasLinhas(quadradinhos, quantosEmCima) {
  return `<span class="linha-q">${quadradinhos.slice(0, quantosEmCima).join("")}</span>
          <span class="linha-q">${quadradinhos.slice(quantosEmCima).join("")}</span>`;
}

// O desenho de dentro do bloco do dia, conforme a camada ativa
function conteudoDia(dia) {
  if (camada === "refeicoes") {
    return duasLinhas(REFEICOES.map((r) => quadradinho("refeicao", dia[r.campo])), 3);
  }
  if (camada === "habitos") {
    return duasLinhas(HABITOS.map((h) => quadradinho(h.ciclo, dia[h.campo])), 2);
  }
  const horas = dia.sono_horas === undefined ? "" : formatarNumero(dia.sono_horas, 0);
  return `<span class="sono-ret" data-cor="${infoValor("sonoQualidade", dia.sono_qualidade).cor}">${horas}</span>`;
}

function montarGrade(porData) {
  const hoje = hojeISO();
  const diasNoMes = new Date(ano, mes, 0).getDate();
  // Quantas casas vazias antes do dia 1 (a semana começa na segunda)
  const casasAntes = (new Date(ano, mes - 1, 1).getDay() + 6) % 7;

  let html = "<span></span>".repeat(casasAntes);
  for (let d = 1; d <= diasNoMes; d++) {
    const data = montarData(ano, mes, d);
    if (data > hoje) {
      // Dia futuro: tracejado, sem quadradinhos e sem toque
      html += `<div class="dia futuro"><span class="num">${d}</span></div>`;
    } else {
      html += `
        <button type="button" class="dia ${data === hoje ? "hoje" : ""}" data-data="${data}"
          aria-label="${formatarCabecalho(data)}">
          <span class="num">${d}</span>
          ${conteudoDia(porData[data] || { data })}
        </button>`;
    }
  }
  return html;
}

function montarLegenda() {
  const { cores, posicao } = LEGENDAS[camada];
  return `
    <div class="legenda">
      ${cores.map(([cor, palavra]) => `
        <span class="item"><span class="quadradinho" data-cor="${cor}"></span>${palavra}</span>`).join("")}
    </div>
    <p class="detalhe">${posicao}</p>`;
}

// aoAbrirDia(data) e aoAbrirAjustes() vêm do app.js, que cuida da troca de telas
export async function mostrarCalendario(tela, { aoAbrirDia, aoAbrirAjustes }) {
  const minhaAbertura = ++aberturaAtual;
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const registros = await lerDiasEntre(montarData(ano, mes, 1), montarData(ano, mes, diasNoMes));
  if (minhaAbertura !== aberturaAtual) return;
  const porData = Object.fromEntries(registros.map((d) => [d.data, d]));

  tela.innerHTML = `
    <header class="cabecalho">
      <button type="button" class="seta" id="mes-anterior" aria-label="Mês anterior">‹</button>
      <h1 class="titulo-mes">${formatarMes(ano, mes)}</h1>
      <button type="button" class="seta" id="mes-seguinte" aria-label="Mês seguinte">›</button>
      <button type="button" class="seta engrenagem" id="abrir-ajustes" aria-label="Ajustes">⚙︎</button>
    </header>

    <div class="camadas">
      ${CAMADAS.map((c) => `
        <button type="button" class="camada ${c.id === camada ? "ativa" : ""}" data-camada="${c.id}"
          aria-pressed="${c.id === camada}">${c.nome}</button>`).join("")}
    </div>

    <div class="semana">${DIAS_SEMANA.map((d) => `<span>${d}</span>`).join("")}</div>
    <div class="mes">${montarGrade(porData)}</div>

    ${montarLegenda()}
  `;

  const redesenhar = () => mostrarCalendario(tela, { aoAbrirDia, aoAbrirAjustes });

  tela.querySelector("#mes-anterior").onclick = () => {
    mes--;
    if (mes === 0) { mes = 12; ano--; }
    redesenhar();
  };
  tela.querySelector("#mes-seguinte").onclick = () => {
    mes++;
    if (mes === 13) { mes = 1; ano++; }
    redesenhar();
  };
  tela.querySelectorAll("[data-camada]").forEach((b) => {
    b.onclick = () => { camada = b.dataset.camada; redesenhar(); };
  });
  tela.querySelectorAll("button.dia").forEach((b) => {
    b.onclick = () => aoAbrirDia(b.dataset.data);
  });
  tela.querySelector("#abrir-ajustes").onclick = aoAbrirAjustes;
}
