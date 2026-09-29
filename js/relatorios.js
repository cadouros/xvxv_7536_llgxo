// Cálculos dos relatórios (semanal, mensal e aba Peso). Aqui só tem conta, nada de desenho.
//
// Regras:
// - Campo vazio é "não marcado", nunca "não".
// - Todo número vem junto com quantos registros o sustentam (n).
// - Dias futuros não entram nas contas (não podem ser preenchidos).
//
// "porData" é um objeto { "AAAA-MM-DD": registroDoDia } e "datas" é a lista de dias a considerar.

import { REFEICOES } from "./modelo.js";
import { somarDias, hojeISO, inicioDaSemana } from "./formato.js";

// Todas as datas de "inicio" a "fim", sem passar de hoje
export function datasAteHoje(inicio, fim) {
  const hoje = hojeISO();
  const datas = [];
  for (let d = inicio; d <= fim && d <= hoje; d = somarDias(d, 1)) datas.push(d);
  return datas;
}

// Segui / livres / sem marcar: os três números sempre separados
export function resumirRefeicoes(porData, datas) {
  const r = { seguiu: 0, livre: 0, semMarcar: 0 };
  for (const data of datas) {
    const dia = porData[data] || {};
    for (const ref of REFEICOES) {
      if (dia[ref.campo] === "seguiu") r.seguiu++;
      else if (dia[ref.campo] === "livre") r.livre++;
      else r.semMarcar++;
    }
  }
  return r;
}

// Média de um campo numérico (peso, horas de sono) e quantos valores entraram
export function mediaDoCampo(porData, datas, campo) {
  const valores = datas.map((d) => porData[d]?.[campo]).filter((v) => v !== undefined);
  if (valores.length === 0) return { media: null, n: 0 };
  return { media: valores.reduce((s, v) => s + v, 0) / valores.length, n: valores.length };
}

// Quantos dias têm "valor" num campo, e quantos dias foram marcados (qualquer valor)
export function contarDias(porData, datas, campo, valor) {
  let comValor = 0, marcados = 0;
  for (const data of datas) {
    const v = porData[data]?.[campo];
    if (v !== undefined) marcados++;
    if (v === valor) comValor++;
  }
  return { comValor, marcados };
}

// Refeições livres, com o que comeu (se escreveu)
export function listarLivres(porData, datas) {
  const lista = [];
  for (const data of datas) {
    const dia = porData[data] || {};
    for (const ref of REFEICOES) {
      if (dia[ref.campo] === "livre") {
        lista.push({ data, refeicao: ref.nome, texto: dia[ref.campo + "_texto"] || "" });
      }
    }
  }
  return lista;
}

// Aba Peso: média de cada semana que tem pelo menos uma pesagem, em ordem
export function semanasComPeso(todosOsDias) {
  const grupos = {};
  for (const dia of todosOsDias) {
    if (dia.peso === undefined) continue;
    const segunda = inicioDaSemana(dia.data);
    (grupos[segunda] ||= []).push(dia.peso);
  }
  return Object.keys(grupos).sort().map((segunda) => {
    const pesos = grupos[segunda];
    return { segunda, media: pesos.reduce((s, v) => s + v, 0) / pesos.length, n: pesos.length };
  });
}
