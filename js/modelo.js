// Modelo de dados: quais campos existem, seus valores possíveis e o ciclo de toques.
//
// Um registro por dia, identificado pela data "AAAA-MM-DD". Exemplo:
//   { data: "2026-09-29", cafe: "seguiu", almoco: "livre", almoco_texto: "pizza",
//     peso: 62.4, sono_horas: 7.5, sono_qualidade: "boa", banheiro: 2, nota: "..." }
//
// Campo AUSENTE = "não marcado" (nunca "não"). Um dia esquecido não vira falha.
//
// Campos de texto que acompanham outros:
//   <refeição>_texto  -> "o que comi" quando a refeição é "livre"
//   fome_horario      -> horário opcional quando fome é "sim"
// O texto fica guardado mesmo se a refeição deixar de ser "livre" (para não perder
// o que foi digitado num toque sem querer), mas só é considerado quando é "livre".

// Versão do formato dos dados. Se o formato mudar, aumente e escreva uma migração em dados.js.
export const SCHEMA_VERSION = 1;

export const REFEICOES = [
  { campo: "cafe", nome: "Café da manhã", icone: "☕" },
  { campo: "almoco", nome: "Almoço", icone: "🍽️" },
  { campo: "lanche1", nome: "Lanche 1", icone: "🍎" },
  { campo: "lanche2", nome: "Lanche 2", icone: "🥪" },
  { campo: "jantar", nome: "Jantar", icone: "🍲" },
];

// "Resto do dia", na ordem da grade 2×2
export const HABITOS = [
  { campo: "treino", nome: "Treino", ciclo: "treino" },
  { campo: "agua", nome: "Água", ciclo: "simNao" },
  { campo: "leitura_tecnica", nome: "Leitura técnica", ciclo: "simNao" },
  { campo: "leitura_lazer", nome: "Leitura de lazer", ciclo: "simNao" },
];

export const DORES = [
  { campo: "dor_muscular", nome: "Dor muscular", ciclo: "dor" },
  { campo: "dor_articular", nome: "Dor articular", ciclo: "dor" },
];

export const BANHEIRO_MAX = 5;

// Ciclos de toque. Cada toque avança um passo; depois do último volta para vazio.
//   valor   = o que fica guardado
//   palavra = o que aparece escrito no cartão
//   cor     = nome da cor (definida em style.css)
export const CICLOS = {
  refeicao: [
    { valor: "seguiu", palavra: "seguiu", cor: "verde" },
    { valor: "livre", palavra: "livre", cor: "vermelho" },
  ],
  treino: [
    { valor: "treinei", palavra: "treinei", cor: "verde" },
    { valor: "nao_treinei", palavra: "não treinei", cor: "vermelho" },
    { valor: "descanso", palavra: "descanso", cor: "azul" },
  ],
  simNao: [
    { valor: "sim", palavra: "sim", cor: "verde" },
    { valor: "nao", palavra: "não", cor: "vermelho" },
  ],
  dor: [
    { valor: "sim", palavra: "sim", cor: "lilas" },
    { valor: "nao", palavra: "não", cor: "bege" },
  ],
  fome: [
    { valor: "sim", palavra: "sim", cor: "laranja" },
  ],
  sonoQualidade: [
    { valor: "boa", palavra: "boa", cor: "verde" },
    { valor: "ok", palavra: "ok", cor: "amarelo" },
    { valor: "ruim", palavra: "ruim", cor: "vermelho" },
  ],
};

const VAZIO = { valor: undefined, palavra: "—", cor: "vazio" };

// Próximo valor do ciclo (undefined = vazio)
export function proximoValor(ciclo, atual) {
  const passos = CICLOS[ciclo];
  const i = passos.findIndex((p) => p.valor === atual);
  if (i === -1) return passos[0].valor;     // vazio -> primeiro
  if (i === passos.length - 1) return undefined; // último -> vazio
  return passos[i + 1].valor;
}

// Palavra e cor de um valor
export function infoValor(ciclo, valor) {
  return CICLOS[ciclo].find((p) => p.valor === valor) || VAZIO;
}
