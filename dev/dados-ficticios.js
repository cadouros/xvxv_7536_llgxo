// Gera 2 meses de dados de MENTIRA para testar o app.
// Por segurança, só funciona no computador (localhost): no iPhone, com o app
// publicado, esta página não faz nada. Assim nunca mistura com dados reais.

import { REFEICOES, SCHEMA_VERSION } from "../js/modelo.js";
import { iniciarDados, salvarVariosDias, apagarTodosOsDias, salvarMeta } from "../js/dados.js";
import { hojeISO, somarDias } from "../js/formato.js";

const resultado = document.getElementById("resultado");
const local = location.hostname === "localhost" || location.hostname === "127.0.0.1";

// Sorteios
const chance = (p) => Math.random() < p;
const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];
const entre = (a, b) => a + Math.random() * (b - a);
const umaCasa = (n) => Math.round(n * 10) / 10;

// Sorteia um valor com pesos: [["seguiu", 75], ["livre", 15], [undefined, 10]]
function comPesos(opcoes) {
  const total = opcoes.reduce((s, [, p]) => s + p, 0);
  let r = Math.random() * total;
  for (const [valor, peso] of opcoes) {
    if ((r -= peso) < 0) return valor;
  }
}

const COMIDAS = ["pizza", "hambúrguer e batata", "brigadeiro", "sorvete", "pão de queijo",
  "coxinha", "lasanha", "bolo de aniversário", "açaí", "pastel da feira", "chocolate"];
const NOTAS = ["Dia corrido no trabalho.", "Dormi mal por causa do calor.",
  "Treino pesado de pernas.", "Almoço de família.", "Semana de provas."];

function diaFicticio(data, pesoBase) {
  // Uns 5% dos dias ficam totalmente esquecidos
  if (chance(0.05)) return { data };

  const dia = { data };
  for (const r of REFEICOES) {
    dia[r.campo] = comPesos([["seguiu", 75], ["livre", 15], [undefined, 10]]);
    if (dia[r.campo] === "livre" && chance(0.8)) dia[r.campo + "_texto"] = sortear(COMIDAS);
  }
  if (chance(0.6)) dia.peso = umaCasa(pesoBase + entre(-0.6, 0.6));
  if (chance(0.85)) dia.sono_horas = Math.round(entre(10, 18)) / 2; // de meia em meia hora
  dia.sono_qualidade = comPesos([["boa", 50], ["ok", 30], ["ruim", 12], [undefined, 8]]);
  dia.dor_muscular = comPesos([["sim", 15], ["nao", 55], [undefined, 30]]);
  dia.dor_articular = comPesos([["sim", 8], ["nao", 60], [undefined, 32]]);
  dia.treino = comPesos([["treinei", 50], ["nao_treinei", 15], ["descanso", 25], [undefined, 10]]);
  dia.agua = comPesos([["sim", 60], ["nao", 25], [undefined, 15]]);
  dia.leitura_tecnica = comPesos([["sim", 40], ["nao", 40], [undefined, 20]]);
  dia.leitura_lazer = comPesos([["sim", 50], ["nao", 30], [undefined, 20]]);
  if (chance(0.2)) {
    dia.fome = "sim";
    if (chance(0.6)) dia.fome_horario = sortear(["10h", "16h", "16h30", "21h", "22h"]);
  }
  if (chance(0.85)) dia.banheiro = sortear([0, 1, 1, 1, 2, 2, 3]);
  if (chance(0.15)) dia.nota = sortear(NOTAS);
  return dia;
}

async function gerar() {
  if (!confirm("Isso apaga os dias existentes neste navegador e cria 2 meses de dados fictícios. Continuar?")) return;
  await iniciarDados();
  await apagarTodosOsDias();

  const hoje = hojeISO();
  const dias = [];
  let pesoBase = 68;
  for (let i = 60; i >= 0; i--) {
    pesoBase -= 0.04; // tendência de leve queda
    dias.push(diaFicticio(somarDias(hoje, -i), pesoBase));
  }
  await salvarVariosDias(dias.filter((d) => Object.keys(d).length > 1));
  await salvarMeta("schemaVersion", SCHEMA_VERSION);
  resultado.textContent = `Pronto: ${dias.length} dias gerados, de ${dias[0].data} a ${hoje}.`;
}

async function apagar() {
  if (!confirm("Apagar todos os dias deste navegador?")) return;
  await iniciarDados();
  await apagarTodosOsDias();
  resultado.textContent = "Todos os dias foram apagados.";
}

if (local) {
  document.getElementById("gerar").onclick = () => gerar().catch((e) => alert(e.message));
  document.getElementById("apagar").onclick = () => apagar().catch((e) => alert(e.message));
} else {
  document.querySelectorAll("button").forEach((b) => (b.disabled = true));
  resultado.textContent = "Esta página só funciona no computador (localhost). No app publicado ela não faz nada.";
}
