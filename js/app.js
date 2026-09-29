// Ponto de partida do app: abre o banco de dados e cuida da navegação entre telas.

import { iniciarDados, pedirArmazenamentoPersistente } from "./dados.js";
import { mostrarHoje } from "./hoje.js";
import { mostrarCalendario } from "./calendario.js";
import { mostrarPeso } from "./peso.js";
import { mostrarAjustes } from "./ajustes.js";

const tela = document.getElementById("tela");
const barra = document.getElementById("barra");

// Troca de tela. "data" só é usada pela tela Hoje (sem data = hoje).
function irPara(nome, data) {
  window.scrollTo(0, 0);
  barra.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("ativo", b.dataset.tela === nome || (nome === "ajustes" && b.dataset.tela === "calendario"));
  });
  if (nome === "hoje") mostrarHoje(tela, data);
  else if (nome === "peso") mostrarPeso(tela);
  else if (nome === "ajustes") mostrarAjustes(tela, { aoVoltar: () => irPara("calendario") });
  else mostrarCalendario(tela, {
    aoAbrirDia: (dataEscolhida) => irPara("hoje", dataEscolhida),
    aoAbrirAjustes: () => irPara("ajustes"),
  });
}

barra.querySelectorAll("button").forEach((b) => {
  b.onclick = () => irPara(b.dataset.tela);
});

// Pede ao iPhone para não apagar os dados quando faltar espaço
pedirArmazenamentoPersistente();

iniciarDados()
  .then(() => irPara("calendario")) // o app abre no Calendário
  .catch((e) => {
    tela.innerHTML = `<p>Não consegui abrir os dados: ${e.message}</p>`;
  });
