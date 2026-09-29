// Aba "Peso": um ponto por semana (a média), do começo do histórico até hoje.
// Tocar num ponto mostra o intervalo da semana, a média e quantas pesagens entraram.

import { todosOsDias } from "./dados.js";
import { semanasComPeso } from "./relatorios.js";
import { graficoPesoAcumulado, detalheSemana } from "./graficos.js";
import { plural } from "./formato.js";

export async function mostrarPeso(tela) {
  const semanas = semanasComPeso(await todosOsDias());

  if (semanas.length === 0) {
    tela.innerHTML = `
      <header class="cabecalho"><h1>Peso</h1></header>
      <p>Nenhuma pesagem ainda. Marque o peso na tela Hoje e ele aparece aqui.</p>`;
    return;
  }

  let selecionada = semanas.length - 1; // começa mostrando a semana mais recente

  tela.innerHTML = `
    <header class="cabecalho"><h1>Peso</h1></header>
    <p class="detalhe">Média de cada semana com pelo menos uma pesagem. Toque num ponto para ver os detalhes.</p>
    <div class="cartao rolagem-grafico" id="area-grafico"></div>
    <section class="cartao relatorio" id="detalhe-semana" aria-live="polite"></section>
  `;

  const area = tela.querySelector("#area-grafico");
  const detalhe = tela.querySelector("#detalhe-semana");

  function desenhar() {
    const rolagem = area.scrollLeft;
    area.innerHTML = graficoPesoAcumulado(semanas, selecionada);
    area.scrollLeft = rolagem;
    const d = detalheSemana(semanas[selecionada]);
    detalhe.innerHTML = `
      <h2>${d.intervalo}</h2>
      <p>Média: <strong>${d.media} kg</strong> (${plural(d.n, "pesagem", "pesagens")})</p>`;
    area.querySelectorAll(".ponto-semana").forEach((p) => {
      p.onclick = () => { selecionada = Number(p.dataset.i); desenhar(); };
    });
  }

  desenhar();
  area.scrollLeft = area.scrollWidth; // abre mostrando as semanas mais recentes
}
