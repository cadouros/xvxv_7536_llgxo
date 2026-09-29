// Ponto de partida do app: abre o banco de dados e cuida da navegação entre telas.

import { iniciarDados } from "./dados.js";
import { mostrarHoje } from "./hoje.js";

const tela = document.getElementById("tela");
const barra = document.getElementById("barra");

function mostrarCalendario() {
  // Provisório: o calendário chega na fase 2
  tela.innerHTML = `
    <header class="cabecalho">
      <h1>Calendário</h1>
      <button type="button" class="seta" id="abrir-ajustes" aria-label="Ajustes">⚙︎</button>
    </header>
    <p class="detalhe">O calendário chega na fase 2. Por enquanto, use a tela Hoje e as setas para mudar de dia.</p>`;
  tela.querySelector("#abrir-ajustes").onclick = () => irPara("ajustes");
}

function mostrarPeso() {
  // Provisório: a aba Peso chega na fase 3
  tela.innerHTML = `
    <header class="cabecalho"><h1>Peso</h1></header>
    <p class="detalhe">O gráfico de peso chega na fase 3.</p>`;
}

function mostrarAjustes() {
  tela.innerHTML = `
    <header class="cabecalho">
      <button type="button" class="seta" id="voltar" aria-label="Voltar">‹</button>
      <h1>Ajustes</h1>
      <span class="seta"></span>
    </header>
    <p class="detalhe">Backup, CSV e PDF chegam nas próximas fases.</p>
    <p class="detalhe">Versão ${self.APP_VERSION}</p>`;
  tela.querySelector("#voltar").onclick = () => irPara("calendario");
}

// Troca de tela. "data" só é usada pela tela Hoje (sem data = hoje).
function irPara(nome, data) {
  window.scrollTo(0, 0);
  barra.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("ativo", b.dataset.tela === nome || (nome === "ajustes" && b.dataset.tela === "calendario"));
  });
  if (nome === "hoje") mostrarHoje(tela, data);
  else if (nome === "peso") mostrarPeso();
  else if (nome === "ajustes") mostrarAjustes();
  else mostrarCalendario();
}

barra.querySelectorAll("button").forEach((b) => {
  b.onclick = () => irPara(b.dataset.tela);
});

iniciarDados()
  .then(() => irPara("calendario")) // o app abre no Calendário
  .catch((e) => {
    tela.innerHTML = `<p>Não consegui abrir os dados: ${e.message}</p>`;
  });
