// Armazenamento no aparelho (IndexedDB). Nada sai do iPhone.
//
// O banco "carolii" tem duas "gavetas":
//   dias -> um registro por dia (ver modelo.js)
//   meta -> informações gerais: schemaVersion, data do último backup etc.

import { SCHEMA_VERSION } from "./modelo.js";

const NOME_BANCO = "carolii";

// Migrações: como converter os dias de uma versão do formato para a seguinte.
// Ex.: quando existir a versão 2, acrescentar
//   1: (dia) => { ...converte um dia da versão 1 para a 2...; return dia; },
// Nunca apagar informação numa migração.
const MIGRACOES = {};

let bancoAberto = null;

function abrirBanco() {
  if (!bancoAberto) {
    bancoAberto = new Promise((ok, erro) => {
      const pedido = indexedDB.open(NOME_BANCO, 1);
      pedido.onupgradeneeded = () => {
        const db = pedido.result;
        db.createObjectStore("dias", { keyPath: "data" });
        db.createObjectStore("meta", { keyPath: "chave" });
      };
      pedido.onsuccess = () => ok(pedido.result);
      pedido.onerror = () => erro(pedido.error);
    });
  }
  return bancoAberto;
}

// Executa uma operação no banco e espera ela terminar de verdade (gravada).
// "operacao" recebe as gavetas e devolve um pedido (ou nada).
async function executar(gavetas, modo, operacao) {
  const db = await abrirBanco();
  return new Promise((ok, erro) => {
    const tx = db.transaction(gavetas, modo);
    const lojas = Object.fromEntries(gavetas.map((g) => [g, tx.objectStore(g)]));
    const pedido = operacao(lojas);
    tx.oncomplete = () => ok(pedido ? pedido.result : undefined);
    tx.onerror = () => erro(tx.error);
    tx.onabort = () => erro(tx.error);
  });
}

// Remove campos vazios: vazio = ausente
function limpar(dia) {
  const limpo = {};
  for (const [campo, valor] of Object.entries(dia)) {
    if (valor !== undefined && valor !== null && valor !== "") limpo[campo] = valor;
  }
  return limpo;
}

// --- meta ---

export async function lerMeta(chave) {
  const registro = await executar(["meta"], "readonly", (l) => l.meta.get(chave));
  return registro ? registro.valor : undefined;
}

export function salvarMeta(chave, valor) {
  return executar(["meta"], "readwrite", (l) => l.meta.put({ chave, valor }));
}

// --- dias ---

// Devolve o registro do dia, ou { data } se nada foi marcado
export async function lerDia(data) {
  const registro = await executar(["dias"], "readonly", (l) => l.dias.get(data));
  return registro || { data };
}

// Grava o dia. Se ficou tudo vazio, apaga o registro.
export function salvarDia(dia) {
  const limpo = limpar(dia);
  if (Object.keys(limpo).length <= 1) {
    return executar(["dias"], "readwrite", (l) => l.dias.delete(dia.data));
  }
  return executar(["dias"], "readwrite", (l) => l.dias.put(limpo));
}

// Todos os dias entre duas datas (incluindo as duas), em ordem
export function lerDiasEntre(inicio, fim) {
  return executar(["dias"], "readonly", (l) => l.dias.getAll(IDBKeyRange.bound(inicio, fim)));
}

export function todosOsDias() {
  return executar(["dias"], "readonly", (l) => l.dias.getAll());
}

// Grava vários dias de uma vez (usado pelos dados fictícios)
export function salvarVariosDias(dias) {
  return executar(["dias"], "readwrite", (l) => {
    for (const dia of dias) l.dias.put(limpar(dia));
  });
}

export function apagarTodosOsDias() {
  return executar(["dias"], "readwrite", (l) => l.dias.clear());
}

// Troca TODOS os dias pelos de um backup. Tudo numa operação só:
// se algo der errado no meio, nada muda (os dados antigos continuam).
export function substituirTodosOsDias(dias) {
  return executar(["dias"], "readwrite", (l) => {
    l.dias.clear();
    for (const dia of dias) l.dias.put(limpar(dia));
  });
}

// Converte dias de um formato antigo ("versao") para o atual
export function migrarDias(dias, versao) {
  for (let v = versao; v < SCHEMA_VERSION; v++) {
    dias = dias.map(MIGRACOES[v]);
  }
  return dias;
}

// Pede ao iPhone para não apagar os dados do app quando faltar espaço.
// Devolve true se o armazenamento é persistente.
export async function pedirArmazenamentoPersistente() {
  if (!navigator.storage || !navigator.storage.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

// --- início ---

// Abre o banco e, se os dados estiverem num formato antigo, converte.
export async function iniciarDados() {
  const versao = await lerMeta("schemaVersion");
  if (versao === undefined) {
    await salvarMeta("schemaVersion", SCHEMA_VERSION);
    return;
  }
  if (versao > SCHEMA_VERSION) {
    // Dados de uma versão mais nova do app: não mexe em nada
    throw new Error("Os dados são de uma versão mais nova do app. Feche e abra de novo.");
  }
  if (versao < SCHEMA_VERSION) {
    const dias = migrarDias(await todosOsDias(), versao);
    // Grava os dias convertidos e a versão nova juntos: ou tudo, ou nada
    await executar(["dias", "meta"], "readwrite", (l) => {
      for (const dia of dias) l.dias.put(dia);
      l.meta.put({ chave: "schemaVersion", valor: SCHEMA_VERSION });
    });
  }
}
