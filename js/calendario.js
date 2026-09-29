// Tela "Calendário": o mês em grade (segunda a domingo), com três camadas.
// Tocar em um dia (até hoje) abre esse dia na tela Hoje.

import { REFEICOES, HABITOS, infoValor } from "./modelo.js";
import { lerDiasEntre } from "./dados.js";
import {
  hojeISO, montarData, formatarMes, formatarCabecalho, formatarNumero, formatarSemana,
  formatarDiaCurto, diaSemanaCurto, inicioDaSemana, somarDias, plural,
} from "./formato.js";
import { datasAteHoje, resumirRefeicoes, mediaDoCampo, contarDias, listarLivres } from "./relatorios.js";
import { graficoPesoSemana, graficoSonoSemana } from "./graficos.js";
import { faixaBackup } from "./ajustes.js";

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

// ---------- Relatórios ----------

// Protege textos digitados antes de colocá-los no HTML
function escapar(texto) {
  return texto.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

function linhaRefeicoes(r) {
  return `Segui ${r.seguiu} · Livres ${r.livre} · Sem marcar ${r.semMarcar}`;
}

function linhaPeso(p) {
  if (p.n === 0) return "Peso: nenhuma pesagem";
  return `Peso médio: <strong>${formatarNumero(p.media)} kg</strong> (${plural(p.n, "pesagem", "pesagens")})`;
}

function resumoMensal(porData) {
  const datas = datasAteHoje(montarData(ano, mes, 1), montarData(ano, mes, new Date(ano, mes, 0).getDate()));
  if (datas.length === 0) {
    return `<section class="cartao relatorio"><h2>Resumo do mês</h2><p>Este mês ainda não começou.</p></section>`;
  }
  const treino = contarDias(porData, datas, "treino", "treinei");
  const sono = mediaDoCampo(porData, datas, "sono_horas");
  return `
    <section class="cartao relatorio">
      <h2>Resumo do mês</h2>
      <p>${linhaPeso(mediaDoCampo(porData, datas, "peso"))}</p>
      <p>Refeições: ${linhaRefeicoes(resumirRefeicoes(porData, datas))}</p>
      <p>Treino: treinei ${treino.comValor} de ${plural(treino.marcados, "dia marcado", "dias marcados")}</p>
      <p>Sono médio: ${sono.n ? `${formatarNumero(sono.media)} h (${plural(sono.n, "noite", "noites")})` : "nenhuma noite marcada"}</p>
    </section>`;
}

function cartaoSemanal(segunda, porData) {
  const seteDias = Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
  const datas = datasAteHoje(segunda, seteDias[6]); // só até hoje
  const registros = seteDias.map((d) => porData[d] || {});
  const dorM = contarDias(porData, datas, "dor_muscular", "sim");
  const dorA = contarDias(porData, datas, "dor_articular", "sim");
  const livres = listarLivres(porData, datas);

  // Debaixo de cada dia: o nome do dia e um 💩 por vez que foi ao banheiro
  const colunasDias = (comBanheiro) => `
    <div class="dias7">
      ${seteDias.map((d, i) => `
        <span>
          <span class="dia-curto">${diaSemanaCurto(d)}</span>
          ${comBanheiro ? `<span class="cocos">${"<span>💩</span>".repeat(registros[i].banheiro || 0)}</span>` : ""}
        </span>`).join("")}
    </div>`;

  return `
    <section class="cartao relatorio semana-cartao">
      <h2>${formatarSemana(segunda)}</h2>
      <p>Refeições: ${linhaRefeicoes(resumirRefeicoes(porData, datas))}</p>
      <p>${linhaPeso(mediaDoCampo(porData, datas, "peso"))}</p>
      ${graficoPesoSemana(registros.map((r) => r.peso))}
      ${colunasDias(true)}
      <h3>Sono</h3>
      ${graficoSonoSemana(registros)}
      ${colunasDias(false)}
      <div class="legenda pequena">
        <span class="item"><span class="quadradinho cheio" data-cor="verde"></span>boa</span>
        <span class="item"><span class="quadradinho cheio" data-cor="amarelo"></span>ok</span>
        <span class="item"><span class="quadradinho cheio" data-cor="vermelho"></span>ruim</span>
        <span class="item"><span class="quadradinho cheio" data-cor="vazio"></span>qualidade sem marcar</span>
      </div>
      <p>Dor muscular: ${dorM.comValor} de ${plural(dorM.marcados, "dia marcado", "dias marcados")}</p>
      <p>Dor articular: ${dorA.comValor} de ${plural(dorA.marcados, "dia marcado", "dias marcados")}</p>
      ${livres.length === 0 ? "<p>Nenhuma refeição livre.</p>" : `
        <details class="livres">
          <summary>O que comi nas refeições livres (${livres.length})</summary>
          <ul>
            ${livres.map((l) => `
              <li><span class="quando">${formatarDiaCurto(l.data)} · ${l.refeicao}</span>
                ${l.texto ? escapar(l.texto) : "<em>sem descrição</em>"}</li>`).join("")}
          </ul>
        </details>`}
    </section>`;
}

// Semanas (segundas-feiras) que tocam o mês aberto e já começaram
function semanasDoMes() {
  const hoje = hojeISO();
  const ultimoDia = montarData(ano, mes, new Date(ano, mes, 0).getDate());
  const semanas = [];
  for (let s = inicioDaSemana(montarData(ano, mes, 1)); s <= ultimoDia && s <= hoje; s = somarDias(s, 7)) {
    semanas.push(s);
  }
  return semanas;
}

// aoAbrirDia(data) e aoAbrirAjustes() vêm do app.js, que cuida da troca de telas
export async function mostrarCalendario(tela, { aoAbrirDia, aoAbrirAjustes }) {
  const minhaAbertura = ++aberturaAtual;
  // Lê semanas inteiras: a semana que atravessa dois meses aparece completa nos dois
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const inicio = inicioDaSemana(montarData(ano, mes, 1));
  const fim = somarDias(inicioDaSemana(montarData(ano, mes, diasNoMes)), 6);
  const registros = await lerDiasEntre(inicio, fim);
  const faixa = await faixaBackup();
  if (minhaAbertura !== aberturaAtual) return;
  const porData = Object.fromEntries(registros.map((d) => [d.data, d]));

  tela.innerHTML = `
    ${faixa}

    <header class="cabecalho">
      <button type="button" class="seta" id="mes-anterior" aria-label="Mês anterior">‹</button>
      <h1 class="titulo-mes">${formatarMes(ano, mes)}</h1>
      <button type="button" class="seta" id="mes-seguinte" aria-label="Mês seguinte">›</button>
      <button type="button" class="seta engrenagem" id="abrir-ajustes" aria-label="Ajustes">⚙︎</button>
    </header>

    ${resumoMensal(porData)}

    <div class="camadas">
      ${CAMADAS.map((c) => `
        <button type="button" class="camada ${c.id === camada ? "ativa" : ""}" data-camada="${c.id}"
          aria-pressed="${c.id === camada}">${c.nome}</button>`).join("")}
    </div>

    <div class="semana">${DIAS_SEMANA.map((d) => `<span>${d}</span>`).join("")}</div>
    <div class="mes">${montarGrade(porData)}</div>

    ${montarLegenda()}

    <h2 class="secao">Semanas</h2>
    ${semanasDoMes().map((segunda) => cartaoSemanal(segunda, porData)).join("")}
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
  tela.querySelector("#faixa-backup").onclick = aoAbrirAjustes;
}
