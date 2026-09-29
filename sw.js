// Service worker: guarda todos os arquivos do app no aparelho para funcionar offline.
//
// Como funciona a atualização:
// 1. Ao abrir o app, o iPhone confere se ESTE arquivo mudou (byte a byte).
// 2. Se mudou, baixa todos os arquivos para um "cache" novo, com o nome da versão nova,
//    e apaga o antigo. Nessa abertura a tela ainda é a antiga.
// 3. Na próxima abertura (o "segundo início"), já aparece a versão nova.
//
// Por isso a versão mora AQUI, e só aqui: a cada publicação, aumente VERSAO.
// (O iPhone não confere arquivos importados por este, como um version.js separado:
// foi assim que a v0.7 ficou presa na v0.6.)
// A tela de Ajustes mostra a versão lendo o nome do cache ("carolii-v0.8").
//
// Importante: este arquivo NUNCA mexe nos dados da Carol (que ficam no IndexedDB).
// Ele só cuida dos arquivos do app.

const VERSAO = "v0.8";
const CACHE = "carolii-" + VERSAO;

// Todos os arquivos do app. Ao criar um arquivo novo, acrescente aqui.
const ARQUIVOS = [
  "./",
  "index.html",
  "style.css",
  "js/ajustes.js",
  "js/app.js",
  "js/arquivos.js",
  "js/backup.js",
  "js/calendario.js",
  "js/csv.js",
  "js/dados.js",
  "js/formato.js",
  "js/graficos.js",
  "js/hoje.js",
  "js/modelo.js",
  "js/pdf.js",
  "js/peso.js",
  "js/relatorios.js",
  "manifest.webmanifest",
  "lib/jspdf.umd.min.js",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE)
      // "reload" garante que baixa do site, e não de uma cópia velha do navegador
      .then((cache) => cache.addAll(ARQUIVOS.map((a) => new Request(a, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(
        nomes.filter((n) => n.startsWith("carolii-") && n !== CACHE).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// Sempre responde com a cópia guardada; só vai à internet se não tiver cópia.
self.addEventListener("fetch", (evento) => {
  if (evento.request.method !== "GET") return;
  evento.respondWith(
    caches.match(evento.request, { ignoreSearch: true })
      .then((resposta) => resposta || fetch(evento.request))
  );
});
