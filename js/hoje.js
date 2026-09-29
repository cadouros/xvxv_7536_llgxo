// Tela "Hoje": o checklist de um dia. Cada toque ou digitação salva na hora.

import { REFEICOES, HABITOS, DORES, BANHEIRO_MAX, proximoValor, infoValor } from "./modelo.js";
import { lerDia, salvarDia } from "./dados.js";
import { hojeISO, somarDias, formatarCabecalho, lerNumero, formatarNumero } from "./formato.js";

// Limites aceitos nos campos numéricos
const PESO = { min: 20, max: 300 };
const SONO = { min: 0, max: 24 };

// Cada abertura de dia ganha um número; se a pessoa trocar de dia rápido,
// uma abertura antiga que termine atrasada é ignorada.
let aberturaAtual = 0;

// Cartão que avança no ciclo a cada toque
function cartaoToque(campo, nome, ciclo, classe = "", icone = "") {
  return `
    <button type="button" class="cartao toque ${classe}" data-campo="${campo}" data-ciclo="${ciclo}">
      ${icone ? `<span class="icone" aria-hidden="true">${icone}</span>` : ""}
      <span class="nome">${nome}</span>
      <span class="estado"></span>
    </button>`;
}

function montarHTML(data) {
  const hoje = hojeISO();
  return `
    <header class="cabecalho">
      <button type="button" class="seta" id="dia-anterior" aria-label="Dia anterior">‹</button>
      <h1>${formatarCabecalho(data)}</h1>
      <button type="button" class="seta" id="dia-seguinte" aria-label="Dia seguinte" ${data >= hoje ? "disabled" : ""}>›</button>
    </header>

    <div class="grade2">
      <div class="cartao medida">
        <label for="peso" class="nome">Peso</label>
        <div class="linha-numero">
          <input id="peso" data-campo="peso" type="text" inputmode="decimal" autocomplete="off" placeholder="—">
          <span>kg</span>
        </div>
      </div>
      <div class="cartao medida">
        <label for="sono-horas" class="nome">Sono</label>
        <div class="linha-numero">
          <input id="sono-horas" data-campo="sono_horas" type="text" inputmode="decimal" autocomplete="off" placeholder="—">
          <span>h</span>
        </div>
        ${cartaoToque("sono_qualidade", "qualidade", "sonoQualidade", "mini")}
      </div>
    </div>

    <div class="grade2">
      ${DORES.map((d) => cartaoToque(d.campo, d.nome, d.ciclo, "pequeno")).join("")}
    </div>

    <h2 class="secao">Refeições</h2>
    ${REFEICOES.map((r) => `
      <div class="bloco">
        ${cartaoToque(r.campo, r.nome, "refeicao", "grande", r.icone)}
        <textarea class="cartao texto" data-campo="${r.campo}_texto" data-mostrar-se="${r.campo}=livre"
          rows="2" placeholder="O que comi" hidden></textarea>
      </div>`).join("")}

    <h2 class="secao">Resto do dia</h2>
    <div class="grade2">
      ${HABITOS.map((h) => cartaoToque(h.campo, h.nome, h.ciclo, "pequeno")).join("")}
    </div>

    <div class="bloco espaco-acima">
      ${cartaoToque("fome", "Fome", "fome", "grande")}
      <input class="cartao texto" data-campo="fome_horario" data-mostrar-se="fome=sim"
        type="text" maxlength="30" autocomplete="off" placeholder="Horário (opcional)" hidden>
    </div>

    <div class="cartao banheiro">
      <span class="nome">Banheiro</span>
      <div class="contador">
        <button type="button" class="redondo" id="banheiro-menos" aria-label="Menos">−</button>
        <span id="banheiro-valor" class="numero"></span>
        <button type="button" class="redondo" id="banheiro-mais" aria-label="Mais">+</button>
      </div>
    </div>

    <h2 class="secao">Nota</h2>
    <textarea class="cartao texto nota" data-campo="nota" rows="4" placeholder="Escreva o que quiser"></textarea>
  `;
}

export async function mostrarHoje(tela, data) {
  const hoje = hojeISO();
  if (!data || data > hoje) data = hoje; // dias futuros não podem ser preenchidos

  const minhaAbertura = ++aberturaAtual;
  const dia = await lerDia(data);
  if (minhaAbertura !== aberturaAtual) return;

  tela.innerHTML = montarHTML(data);

  function salvar() {
    salvarDia(dia).catch((e) => alert("Não consegui salvar: " + e.message));
  }

  // Mostra/esconde campos de texto que dependem de outro (ex.: "O que comi" só se livre)
  function atualizarDependentes() {
    tela.querySelectorAll("[data-mostrar-se]").forEach((el) => {
      const [campo, valor] = el.dataset.mostrarSe.split("=");
      el.hidden = dia[campo] !== valor;
    });
  }

  // Setas de dia
  tela.querySelector("#dia-anterior").onclick = () => mostrarHoje(tela, somarDias(data, -1));
  tela.querySelector("#dia-seguinte").onclick = () => mostrarHoje(tela, somarDias(data, 1));

  // Cartões de toque
  tela.querySelectorAll("[data-ciclo]").forEach((botao) => {
    const { campo, ciclo } = botao.dataset;
    const pintar = () => {
      const info = infoValor(ciclo, dia[campo]);
      botao.dataset.cor = info.cor;
      botao.querySelector(".estado").textContent = info.palavra;
    };
    pintar();
    botao.onclick = () => {
      dia[campo] = proximoValor(ciclo, dia[campo]);
      pintar();
      atualizarDependentes();
      salvar();
    };
  });

  // Campos de texto livre: salvam a cada letra
  tela.querySelectorAll("textarea[data-campo], input[data-campo]:not([inputmode])").forEach((el) => {
    el.value = dia[el.dataset.campo] || "";
    el.oninput = () => {
      dia[el.dataset.campo] = el.value;
      salvar();
    };
  });

  // Campos numéricos (peso e horas de sono)
  function ligarNumero(el, limites, casasMinimas) {
    const campo = el.dataset.campo;
    const mostrar = () => {
      el.value = dia[campo] === undefined ? "" : formatarNumero(dia[campo], casasMinimas);
      el.classList.remove("invalido");
    };
    mostrar();
    el.oninput = () => {
      if (el.value.trim() === "") {
        dia[campo] = undefined; // apagar volta para vazio
        el.classList.remove("invalido");
        salvar();
        return;
      }
      const n = lerNumero(el.value, limites.min, limites.max);
      if (n === null) {
        el.classList.add("invalido"); // não salva enquanto não for um número válido
        return;
      }
      el.classList.remove("invalido");
      dia[campo] = n;
      salvar();
    };
    el.onblur = mostrar; // ao sair do campo, mostra o valor guardado já formatado ("62,4")
  }
  ligarNumero(tela.querySelector("#peso"), PESO, 1);
  ligarNumero(tela.querySelector("#sono-horas"), SONO, 0);

  // Banheiro: começa em traço; primeiro + vai a 1, primeiro − vai a 0
  const valorBanheiro = tela.querySelector("#banheiro-valor");
  const pintarBanheiro = () => {
    valorBanheiro.textContent = dia.banheiro === undefined ? "–" : dia.banheiro;
  };
  pintarBanheiro();
  tela.querySelector("#banheiro-mais").onclick = () => {
    dia.banheiro = Math.min(BANHEIRO_MAX, (dia.banheiro ?? 0) + 1);
    pintarBanheiro();
    salvar();
  };
  tela.querySelector("#banheiro-menos").onclick = () => {
    dia.banheiro = Math.max(0, (dia.banheiro ?? 1) - 1);
    pintarBanheiro();
    salvar();
  };

  atualizarDependentes();
}
