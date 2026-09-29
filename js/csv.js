// CSV: uma linha por dia, uma coluna por campo. Serve para análise no Excel ou no R.
// NÃO é importável e não substitui o backup.
//
// Formato do Excel brasileiro: separador ";" e decimal com vírgula ("62,4").
// Começa com um caractere invisível (BOM) para o Excel reconhecer os acentos.
// No R: read.csv2("carolii-dados.csv", fileEncoding = "UTF-8-BOM")
//
// Valores como estão guardados ("seguiu", "livre", "nao_treinei"...). Célula vazia = não marcado.
// Entram todos os dias, do primeiro registro até hoje, inclusive os dias sem nada marcado.

import { REFEICOES } from "./modelo.js";
import { hojeISO, somarDias } from "./formato.js";

export const NOME_CSV = "carolii-dados.csv";

const COLUNAS = [
  "data",
  ...REFEICOES.flatMap((r) => [r.campo, r.campo + "_texto"]),
  "peso", "sono_horas", "sono_qualidade", "dor_muscular", "dor_articular",
  "treino", "agua", "leitura_tecnica", "leitura_lazer", "fome", "fome_horario",
  "banheiro", "nota",
];

// Protege a célula: se tiver ; aspas ou quebra de linha, vai entre aspas
function celula(valor) {
  if (valor === undefined) return "";
  let texto = typeof valor === "number" ? String(valor).replace(".", ",") : String(valor);
  if (/[;"\r\n]/.test(texto)) texto = `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

// Os textos que só valem junto de outro campo (ver modelo.js)
function valorDaColuna(dia, coluna) {
  if (coluna.endsWith("_texto")) {
    const refeicao = coluna.slice(0, -"_texto".length);
    return dia[refeicao] === "livre" ? dia[coluna] : undefined;
  }
  if (coluna === "fome_horario") return dia.fome === "sim" ? dia.fome_horario : undefined;
  return dia[coluna];
}

export function montarCSV(dias) {
  const linhas = [COLUNAS.join(";")];
  if (dias.length > 0) {
    const porData = Object.fromEntries(dias.map((d) => [d.data, d]));
    const primeiro = dias.map((d) => d.data).sort()[0];
    const hoje = hojeISO();
    for (let data = primeiro; data <= hoje; data = somarDias(data, 1)) {
      const dia = porData[data] || { data };
      linhas.push(COLUNAS.map((c) => celula(valorDaColuna(dia, c))).join(";"));
    }
  }
  return "﻿" + linhas.join("\r\n") + "\r\n";
}
