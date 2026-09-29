// PDF para a nutricionista, gerado dentro do aparelho com a biblioteca jsPDF (pasta lib/).
//
// Conteúdo: período, resumo, gráfico de peso e tabela dia a dia.
// Regra: toda cor tem a palavra escrita ("seguiu", "livre"...), para não depender de cor.
// Fundo branco, texto preto (style.md). Medidas em pontos (1 pt = 1/72 de polegada).

import { REFEICOES, infoValor } from "./modelo.js";
import { datasAteHoje, resumirRefeicoes, mediaDoCampo, contarDias } from "./relatorios.js";
import {
  formatarNumero, formatarPeriodoLongo, formatarMes, formatarDiaCurto, formatarDataComAno,
  diaSemanaCurto, hojeISO, plural,
} from "./formato.js";

// O que ela pode ligar e desligar antes de exportar
export const OPCOES_PDF = [
  { id: "refeicoes", nome: "Refeições (e o que comi nas livres)", padrao: true },
  { id: "peso", nome: "Peso", padrao: true },
  { id: "banheiro", nome: "Banheiro", padrao: true },
  { id: "fome", nome: "Fome", padrao: true },
  { id: "sono", nome: "Sono", padrao: false },
  { id: "treino", nome: "Treino", padrao: false },
  { id: "agua", nome: "Água", padrao: false },
  { id: "dores", nome: "Dores", padrao: false },
  { id: "nota", nome: "Nota livre", padrao: false },
];

const MARGEM = 40;
const A4 = { portrait: 595.28, landscape: 841.89 }; // largura da folha em cada orientação
const ALTURA_LINHA = 16;
const RODAPE = 24;

// Carrega a biblioteca só quando precisa (ela é grande)
let carregando = null;
function carregarJsPDF() {
  if (window.jspdf) return Promise.resolve();
  if (!carregando) {
    carregando = new Promise((ok, erro) => {
      const script = document.createElement("script");
      script.src = "lib/jspdf.umd.min.js";
      script.onload = ok;
      script.onerror = () => {
        carregando = null;
        erro(new Error("Não consegui carregar o gerador de PDF."));
      };
      document.head.appendChild(script);
    });
  }
  return carregando;
}

// As cores vêm do style.css, para ficarem num lugar só
const VARIAVEL_DA_COR = {
  verde: "--seguiu-clara", vermelho: "--livre-clara", azul: "--descanso-clara",
  amarelo: "--sono-ok-clara", laranja: "--fome-clara", lilas: "--dor-clara", bege: "--bege",
};
function corCss(nome) {
  const variavel = VARIAVEL_DA_COR[nome];
  return variavel ? getComputedStyle(document.documentElement).getPropertyValue(variavel).trim() : null;
}

// As fontes padrão do PDF não têm emoji nem alguns símbolos: tira o que não dá para escrever
function textoSeguro(texto) {
  return texto
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E\xA0-\xFF–—‘’“”…]/g, "")
    .trim();
}

function celulaCiclo(ciclo, valor) {
  const info = infoValor(ciclo, valor);
  return { texto: info.palavra, cor: info.cor };
}

// Colunas da tabela, conforme o que ela ligou
function montarColunas(opcoes) {
  const colunas = [{ titulo: "Dia", largura: 62, esquerda: true, valor: (dia) => ({ texto: formatarDiaCurto(dia.data) }) }];
  if (opcoes.refeicoes) {
    for (const r of REFEICOES) {
      colunas.push({
        titulo: r.campo === "cafe" ? "Café" : r.nome, refeicao: true,
        valor: (dia) => celulaCiclo("refeicao", dia[r.campo]),
      });
    }
  }
  if (opcoes.peso) {
    colunas.push({ titulo: "Peso (kg)", largura: 44, valor: (dia) => ({ texto: dia.peso === undefined ? "—" : formatarNumero(dia.peso) }) });
  }
  if (opcoes.banheiro) {
    colunas.push({ titulo: "Banheiro", largura: 42, valor: (dia) => ({ texto: dia.banheiro === undefined ? "—" : String(dia.banheiro) }) });
  }
  if (opcoes.fome) {
    colunas.push({
      titulo: "Fome", largura: 54,
      valor: (dia) => dia.fome === "sim"
        ? { texto: dia.fome_horario ? `sim, ${textoSeguro(dia.fome_horario)}` : "sim", cor: "laranja" }
        : { texto: "—" },
    });
  }
  if (opcoes.sono) {
    colunas.push({
      titulo: "Sono", largura: 64,
      valor: (dia) => {
        const q = infoValor("sonoQualidade", dia.sono_qualidade);
        const partes = [
          dia.sono_horas === undefined ? "" : `${formatarNumero(dia.sono_horas, 0)} h`,
          q.valor ? q.palavra : "",
        ].filter(Boolean);
        return { texto: partes.join(", ") || "—", cor: q.cor };
      },
    });
  }
  if (opcoes.treino) colunas.push({ titulo: "Treino", largura: 60, valor: (dia) => celulaCiclo("treino", dia.treino) });
  if (opcoes.agua) colunas.push({ titulo: "Água", largura: 36, valor: (dia) => celulaCiclo("simNao", dia.agua) });
  if (opcoes.dores) {
    colunas.push({ titulo: "Dor musc.", largura: 44, valor: (dia) => celulaCiclo("dor", dia.dor_muscular) });
    colunas.push({ titulo: "Dor art.", largura: 40, valor: (dia) => celulaCiclo("dor", dia.dor_articular) });
  }
  return colunas;
}

// Linhas de texto que vão embaixo do dia na tabela
function textosDoDia(dia, opcoes) {
  const textos = [];
  if (opcoes.refeicoes) {
    const livres = REFEICOES.filter((r) => dia[r.campo] === "livre")
      .map((r) => `${r.nome}: ${textoSeguro(dia[r.campo + "_texto"] || "") || "(sem descrição)"}`);
    if (livres.length) textos.push(`O que comi nas livres: ${livres.join("; ")}`);
  }
  if (opcoes.nota && dia.nota && textoSeguro(dia.nota)) textos.push(`Nota: ${textoSeguro(dia.nota)}`);
  return textos;
}

// Resumo do período. Todo número vem com quantos registros o sustentam.
function linhasResumo(porData, datas, opcoes) {
  const linhas = [];
  if (opcoes.refeicoes) {
    const r = resumirRefeicoes(porData, datas);
    let texto = `Refeições: seguiu ${r.seguiu} · livre ${r.livre} · sem marcar ${r.semMarcar}`;
    const marcadas = r.seguiu + r.livre;
    if (marcadas > 0) texto += ` (seguiu em ${Math.round((r.seguiu / marcadas) * 100)}% das marcadas)`;
    linhas.push(texto);
  }
  if (opcoes.peso) {
    const p = mediaDoCampo(porData, datas, "peso");
    linhas.push(p.n ? `Peso médio: ${formatarNumero(p.media)} kg (${plural(p.n, "pesagem", "pesagens")})` : "Peso: nenhuma pesagem no período");
  }
  if (opcoes.banheiro) {
    const b = mediaDoCampo(porData, datas, "banheiro");
    linhas.push(b.n
      ? `Banheiro: média de ${formatarNumero(b.media)} vez por dia (${plural(b.n, "dia marcado", "dias marcados")})`
      : "Banheiro: nenhum dia marcado");
  }
  if (opcoes.fome) {
    const f = contarDias(porData, datas, "fome", "sim");
    linhas.push(`Fome: marcada em ${plural(f.comValor, "dia", "dias")}`);
  }
  if (opcoes.sono) {
    const s = mediaDoCampo(porData, datas, "sono_horas");
    const q = (v) => contarDias(porData, datas, "sono_qualidade", v).comValor;
    linhas.push((s.n ? `Sono: média de ${formatarNumero(s.media)} h (${plural(s.n, "noite", "noites")})` : "Sono: nenhuma noite com horas marcadas")
      + ` · qualidade: boa ${q("boa")}, ok ${q("ok")}, ruim ${q("ruim")}`);
  }
  if (opcoes.treino) {
    const t = (v) => contarDias(porData, datas, "treino", v);
    linhas.push(`Treino: treinei ${t("treinei").comValor} · não treinei ${t("nao_treinei").comValor} · descanso ${t("descanso").comValor} (${plural(t("treinei").marcados, "dia marcado", "dias marcados")})`);
  }
  if (opcoes.agua) {
    const a = contarDias(porData, datas, "agua", "sim");
    linhas.push(`Água (tomei tudo o que devia): sim em ${a.comValor} de ${plural(a.marcados, "dia marcado", "dias marcados")}`);
  }
  if (opcoes.dores) {
    const m = contarDias(porData, datas, "dor_muscular", "sim");
    const a = contarDias(porData, datas, "dor_articular", "sim");
    linhas.push(`Dor muscular: ${m.comValor} de ${plural(m.marcados, "dia marcado", "dias marcados")} · Dor articular: ${a.comValor} de ${plural(a.marcados, "dia marcado", "dias marcados")}`);
  }
  return linhas;
}

// Gráfico de peso: um ponto por dia do período.
// Na semana, todos os pontos têm o valor escrito; no mês, só o primeiro, o último, o menor e o maior.
function desenharGraficoPeso(doc, x, y, largura, altura, datas, porData, rotularTodos) {
  const pontos = datas.map((data, i) => ({ i, v: porData[data]?.peso })).filter((p) => p.v !== undefined);
  const passo = largura / datas.length;
  const cx = (i) => x + passo * (i + 0.5);

  let min = Math.min(...pontos.map((p) => p.v)), max = Math.max(...pontos.map((p) => p.v));
  if (max - min < 1) { const meio = (min + max) / 2; min = meio - 0.5; max = meio + 0.5; }
  const topo = y + 14, base = y + altura - 16;
  const cy = (v) => base - ((v - min) / (max - min)) * (base - topo);

  // Linha de base e nome dos dias
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(x, base + 6, x + largura, base + 6);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  datas.forEach((data, i) => {
    const rotulo = rotularTodos ? `${diaSemanaCurto(data)} ${Number(data.slice(8))}` : String(Number(data.slice(8)));
    doc.text(rotulo, cx(i), base + 15, { align: "center" });
  });

  // Linha ligando os pontos
  doc.setLineWidth(1.2);
  for (let k = 1; k < pontos.length; k++) {
    doc.line(cx(pontos[k - 1].i), cy(pontos[k - 1].v), cx(pontos[k].i), cy(pontos[k].v));
  }

  // Pontos e valores
  const vs = pontos.map((p) => p.v);
  const destacar = new Set(rotularTodos ? pontos.map((p) => p.i) : [
    pontos[0].i, pontos[pontos.length - 1].i,
    pontos[vs.indexOf(Math.min(...vs))].i, pontos[vs.indexOf(Math.max(...vs))].i,
  ]);
  doc.setFillColor(0, 0, 0);
  doc.setFontSize(7);
  for (const p of pontos) {
    doc.circle(cx(p.i), cy(p.v), 2.2, "F");
    if (destacar.has(p.i)) doc.text(formatarNumero(p.v), cx(p.i), cy(p.v) - 5, { align: "center" });
  }
}

// Gera o PDF e devolve { blob, nome }.
// tipo: "semana" ou "mes"; porData: { data: registro } com os dias do período.
export async function gerarPdf({ tipo, inicio, fim, opcoes, porData }) {
  await carregarJsPDF();
  const { jsPDF } = window.jspdf;
  const datas = datasAteHoje(inicio, fim);
  const dias = datas.map((d) => porData[d] || { data: d });

  // Largura das colunas. Se não couber em pé, a folha fica deitada.
  const colunas = montarColunas(opcoes);
  const fixo = colunas.filter((c) => !c.refeicao).reduce((s, c) => s + c.largura, 0);
  const util = (o) => A4[o] - 2 * MARGEM;
  const orientacao = opcoes.refeicoes && (util("portrait") - fixo) / 5 < 50 ? "landscape" : "portrait";
  const larguraUtil = util(orientacao);
  for (const c of colunas) if (c.refeicao) c.largura = Math.min(80, (larguraUtil - fixo) / 5);
  const larguraTabela = colunas.reduce((s, c) => s + c.largura, 0);

  const doc = new jsPDF({ orientation: orientacao, unit: "pt", format: "a4" });
  const alturaPagina = doc.internal.pageSize.getHeight();
  const limite = alturaPagina - MARGEM - RODAPE;
  doc.setTextColor(0, 0, 0);
  let y = MARGEM;

  // Cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`carolii · Relatório ${tipo === "semana" ? "semanal" : "mensal"}`, MARGEM, y + 12);
  y += 32;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  const [ano, mes] = inicio.split("-").map(Number);
  doc.text(tipo === "semana" ? formatarPeriodoLongo(inicio, fim) : formatarMes(ano, mes).replace(" ", " de "), MARGEM, y);
  y += 15;
  doc.setFontSize(9);
  let gerado = `Gerado em ${formatarDataComAno(hojeISO())}.`;
  if (fim > hojeISO()) gerado += " Período em andamento: considera os dias até hoje.";
  doc.text(gerado, MARGEM, y);
  y += 22;

  // Resumo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Resumo", MARGEM, y);
  y += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const linha of linhasResumo(porData, datas, opcoes)) {
    for (const parte of doc.splitTextToSize(linha, larguraUtil)) {
      doc.text(parte, MARGEM, y);
      y += 13;
    }
  }
  y += 10;

  // Gráfico de peso
  if (opcoes.peso && dias.some((d) => d.peso !== undefined)) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Peso de cada dia (kg)", MARGEM, y);
    y += 6;
    desenharGraficoPeso(doc, MARGEM, y, Math.min(larguraUtil, 515), 110, datas, porData, tipo === "semana");
    y += 124;
  }

  // Tabela dia a dia
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Dia a dia", MARGEM, y);
  y += 8;

  const desenharCabecalhoTabela = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setLineWidth(0.5);
    doc.setDrawColor(0);
    let x = MARGEM;
    for (const c of colunas) {
      doc.rect(x, y, c.largura, 18, "S");
      doc.text(c.titulo, c.esquerda ? x + 4 : x + c.largura / 2, y + 12, { align: c.esquerda ? "left" : "center" });
      x += c.largura;
    }
    y += 18;
  };
  desenharCabecalhoTabela();

  for (const dia of dias) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const textos = textosDoDia(dia, opcoes).flatMap((t) => doc.splitTextToSize(t, larguraTabela - 8));
    const alturaTextos = textos.length ? textos.length * 10 + 5 : 0;

    // Quebra de página: o dia e seus textos ficam juntos
    if (y + ALTURA_LINHA + alturaTextos > limite) {
      doc.addPage();
      y = MARGEM;
      desenharCabecalhoTabela();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
    }

    let x = MARGEM;
    for (const c of colunas) {
      const { texto, cor } = c.valor(dia);
      const fundo = cor ? corCss(cor) : null;
      if (fundo) doc.setFillColor(fundo);
      doc.rect(x, y, c.largura, ALTURA_LINHA, fundo ? "FD" : "S");
      const cabe = doc.splitTextToSize(texto, c.largura - 6)[0] || "";
      doc.text(cabe, c.esquerda ? x + 4 : x + c.largura / 2, y + 11, { align: c.esquerda ? "left" : "center" });
      x += c.largura;
    }
    y += ALTURA_LINHA;

    if (textos.length) {
      doc.rect(MARGEM, y, larguraTabela, alturaTextos, "S");
      textos.forEach((t, k) => doc.text(t, MARGEM + 4, y + 10 + k * 10));
      y += alturaTextos;
    }
  }

  // Rodapé com o número da página
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`carolii · página ${p} de ${total}`, A4[orientacao] - MARGEM, alturaPagina - MARGEM + 10, { align: "right" });
  }

  const nome = tipo === "semana" ? `carolii-semana-${inicio}.pdf` : `carolii-mes-${inicio.slice(0, 7)}.pdf`;
  return { blob: doc.output("blob"), nome };
}
