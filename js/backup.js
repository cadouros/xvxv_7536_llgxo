// Backup: o arquivo JSON com TODOS os dados, para guardar fora do iPhone.
//
// Formato do arquivo:
//   { "app": "carolii", "schemaVersion": 1, "exportadoEm": "2026-09-29T14:03",
//     "dias": [ { "data": "2026-09-28", "cafe": "seguiu", ... }, ... ] }
//
// Sempre com o mesmo nome, para o iPhone perguntar se quer substituir o anterior.

import { SCHEMA_VERSION, REFEICOES, HABITOS, DORES, CICLOS, BANHEIRO_MAX } from "./modelo.js";
import { migrarDias } from "./dados.js";
import { agoraLocal } from "./formato.js";

export const NOME_BACKUP = "carolii-backup.json";

export function montarBackup(dias) {
  return JSON.stringify({
    app: "carolii",
    schemaVersion: SCHEMA_VERSION,
    exportadoEm: agoraLocal(),
    dias: [...dias].sort((a, b) => (a.data < b.data ? -1 : 1)),
  }, null, 1);
}

// Regras de cada campo, para conferir um arquivo importado
const valoresDoCiclo = (ciclo) => CICLOS[ciclo].map((p) => p.valor);
const REGRAS = {};
for (const r of REFEICOES) {
  REGRAS[r.campo] = valoresDoCiclo("refeicao");
  REGRAS[r.campo + "_texto"] = "texto";
}
for (const c of [...HABITOS, ...DORES]) REGRAS[c.campo] = valoresDoCiclo(c.ciclo);
REGRAS.sono_qualidade = valoresDoCiclo("sonoQualidade");
REGRAS.fome = valoresDoCiclo("fome");
REGRAS.fome_horario = "texto";
REGRAS.nota = "texto";
REGRAS.peso = "numero";
REGRAS.sono_horas = "numero";
REGRAS.banheiro = "banheiro";

function conferirDia(dia, posicao) {
  const problema = (msg) => { throw new Error(`Dia nº ${posicao + 1}: ${msg}`); };
  if (typeof dia !== "object" || dia === null) problema("não é um registro válido.");
  if (typeof dia.data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dia.data)) problema("data inválida.");
  for (const [campo, valor] of Object.entries(dia)) {
    if (campo === "data") continue;
    const regra = REGRAS[campo];
    if (regra === undefined) problema(`campo desconhecido "${campo}".`);
    const certo =
      regra === "texto" ? typeof valor === "string" :
      regra === "numero" ? typeof valor === "number" && Number.isFinite(valor) && valor >= 0 :
      regra === "banheiro" ? Number.isInteger(valor) && valor >= 0 && valor <= BANHEIRO_MAX :
      regra.includes(valor);
    if (!certo) problema(`valor inválido em "${campo}" (${dia.data}).`);
  }
}

// Lê e confere o texto de um arquivo de backup.
// Devolve { dias, exportadoEm } ou lança um erro com a explicação em português.
export function lerBackup(texto) {
  let dados;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new Error("O arquivo não é um backup do carolii (não consegui ler).");
  }
  if (!dados || dados.app !== "carolii" || !Array.isArray(dados.dias)) {
    throw new Error("O arquivo não é um backup do carolii.");
  }
  if (!Number.isInteger(dados.schemaVersion) || dados.schemaVersion < 1) {
    throw new Error("O backup não informa a versão do formato.");
  }
  if (dados.schemaVersion > SCHEMA_VERSION) {
    throw new Error("Este backup veio de uma versão mais nova do app. Atualize o app e tente de novo.");
  }
  const dias = migrarDias(dados.dias, dados.schemaVersion);
  dias.forEach(conferirDia);
  const datas = dias.map((d) => d.data);
  if (new Set(datas).size !== datas.length) throw new Error("O backup tem dias repetidos.");
  return { dias, exportadoEm: typeof dados.exportadoEm === "string" ? dados.exportadoEm : null };
}
