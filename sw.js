// Service worker: guarda todos os arquivos do app no aparelho para funcionar offline.
//
// Como funciona a atualização:
// 1. Ao abrir o app, o iPhone confere se este arquivo (ou version.js) mudou.
// 2. Se mudou, baixa todos os arquivos para um "cache" novo, com o nome da versão nova,
//    e apaga o antigo. Nessa abertura a tela ainda é a antiga.
// 3. Na próxima abertura (o "segundo início"), já aparece a versão nova.
// Por isso: a cada publicação, aumente a versão em version.js.
//
// Importante: este arquivo NUNCA mexe nos dados da Carol (que ficarão no IndexedDB).
// Ele só cuida dos arquivos do app.

importScripts("version.js");

const CACHE = "carolii-" + self.APP_VERSION;

// Todos os arquivos do app. Ao criar um arquivo novo, acrescente aqui.
const ARQUIVOS = [
  "./",
  "index.html",
  "style.css",
  "version.js",
  "js/app.js",
  "js/calendario.js",
  "js/dados.js",
  "js/formato.js",
  "js/hoje.js",
  "js/modelo.js",
  "manifest.webmanifest",
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
