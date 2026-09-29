// Tela "Ajustes": exportar e importar backup, exportar CSV e ver a versão do app.

import { todosOsDias, lerMeta, salvarMeta, substituirTodosOsDias } from "./dados.js";
import { montarBackup, lerBackup, NOME_BACKUP } from "./backup.js";
import { montarCSV, NOME_CSV } from "./csv.js";
import { entregarArquivo } from "./arquivos.js";
import { agoraLocal, hojeISO, diasEntre, formatarDataComAno, plural } from "./formato.js";

// "2026-09-29T14:03" -> "29 set 2026, às 14:03 (hoje)"
function descreverMomento(momento) {
  const [data, hora] = momento.split("T");
  const dias = diasEntre(data, hojeISO());
  const quando = dias === 0 ? "hoje" : dias === 1 ? "ontem" : `há ${dias} dias`;
  return `${formatarDataComAno(data)}${hora ? `, às ${hora}` : ""} (${quando})`;
}

export async function mostrarAjustes(tela, { aoVoltar }) {
  // Os arquivos ficam prontos antes do toque: o iPhone só abre o menu de
  // compartilhar se ele for chamado logo depois do toque.
  let arquivos;
  async function prepararArquivos() {
    const dias = await todosOsDias();
    arquivos = { backup: montarBackup(dias), csv: montarCSV(dias), quantos: dias.length };
  }
  await prepararArquivos();
  const persistente = navigator.storage && navigator.storage.persisted
    ? await navigator.storage.persisted().catch(() => false)
    : false;

  tela.innerHTML = `
    <header class="cabecalho">
      <button type="button" class="seta" id="voltar" aria-label="Voltar">‹</button>
      <h1>Ajustes</h1>
      <span class="seta"></span>
    </header>

    <section class="cartao relatorio">
      <h2>Backup</h2>
      <p>Seus dados ficam só neste iPhone. Salve o backup no app Arquivos (iCloud Drive) de vez em quando.
         Ele tem sempre o mesmo nome, então é só substituir o anterior.</p>
      <p id="ultimo-backup"></p>
      <div class="botoes">
        <button type="button" class="botao principal" id="exportar-backup">Exportar backup</button>
        <button type="button" class="botao" id="importar-backup">Importar backup</button>
      </div>
      <input type="file" id="arquivo-backup" accept=".json,application/json" hidden>
      <div id="area-importacao"></div>
    </section>

    <section class="cartao relatorio">
      <h2>Planilha (CSV)</h2>
      <p>Uma linha por dia, para abrir no Excel ou no R. Não serve como backup e não pode ser importada.</p>
      <div class="botoes">
        <button type="button" class="botao" id="exportar-csv">Exportar CSV</button>
      </div>
    </section>

    <section class="cartao relatorio">
      <h2>Sobre</h2>
      <p>Dias registrados: <span id="quantos-dias">${arquivos.quantos}</span></p>
      <p>Armazenamento: ${persistente
        ? "protegido (o iPhone não apaga sozinho)"
        : "não protegido (o iPhone pode apagar se faltar espaço; faça backup)"}</p>
      <p>Versão ${self.APP_VERSION}</p>
    </section>
  `;

  const ultimo = tela.querySelector("#ultimo-backup");
  async function mostrarUltimo() {
    const momento = await lerMeta("ultimoBackup");
    ultimo.textContent = momento ? `Último backup: ${descreverMomento(momento)}` : "Você ainda não fez nenhum backup.";
  }
  await mostrarUltimo();

  const erro = (e) => alert("Algo deu errado: " + e.message);

  tela.querySelector("#voltar").onclick = aoVoltar;

  // Exportar backup: só marca a data se ela não cancelou o menu
  tela.querySelector("#exportar-backup").onclick = () => {
    entregarArquivo(NOME_BACKUP, "application/json", arquivos.backup)
      .then(async (entregue) => {
        if (!entregue) return;
        await salvarMeta("ultimoBackup", agoraLocal());
        await mostrarUltimo();
      })
      .catch(erro);
  };

  tela.querySelector("#exportar-csv").onclick = () => {
    entregarArquivo(NOME_CSV, "text/csv", arquivos.csv).catch(erro);
  };

  // Importar backup: escolhe o arquivo, mostra o resumo e só troca depois da confirmação
  const entrada = tela.querySelector("#arquivo-backup");
  const area = tela.querySelector("#area-importacao");
  tela.querySelector("#importar-backup").onclick = () => {
    entrada.value = "";
    entrada.click();
  };

  entrada.onchange = async () => {
    const arquivo = entrada.files[0];
    if (!arquivo) return;
    let backup;
    try {
      backup = lerBackup(await arquivo.text());
    } catch (e) {
      area.innerHTML = `<div class="aviso-importacao"><p><strong>Não dá para importar.</strong></p><p class="motivo"></p></div>`;
      area.querySelector(".motivo").textContent = e.message;
      return;
    }

    const datas = backup.dias.map((d) => d.data).sort();
    const periodo = datas.length
      ? `de ${formatarDataComAno(datas[0])} a ${formatarDataComAno(datas[datas.length - 1])}`
      : "sem nenhum dia";
    area.innerHTML = `
      <div class="aviso-importacao">
        <p><strong>Arquivo com ${plural(datas.length, "dia", "dias")}</strong>, ${periodo}.</p>
        ${backup.exportadoEm ? `<p>Exportado em ${descreverMomento(backup.exportadoEm)}.</p>` : ""}
        <p>Isso vai <strong>apagar os ${plural(arquivos.quantos, "dia", "dias")} que estão no aparelho agora</strong>
           e colocar os do arquivo no lugar.</p>
        <div class="botoes">
          <button type="button" class="botao perigo" id="confirmar-importacao">Substituir meus dados</button>
          <button type="button" class="botao" id="cancelar-importacao">Cancelar</button>
        </div>
      </div>`;

    area.querySelector("#cancelar-importacao").onclick = () => { area.innerHTML = ""; };
    area.querySelector("#confirmar-importacao").onclick = async () => {
      try {
        await substituirTodosOsDias(backup.dias);
        // Os dados agora são iguais aos do arquivo: ele conta como último backup
        const anterior = await lerMeta("ultimoBackup");
        if (backup.exportadoEm && (!anterior || anterior < backup.exportadoEm)) {
          await salvarMeta("ultimoBackup", backup.exportadoEm);
        }
        await prepararArquivos();
        await mostrarUltimo();
        tela.querySelector("#quantos-dias").textContent = arquivos.quantos;
        area.innerHTML = `<div class="aviso-importacao"><p><strong>Pronto:</strong> ${plural(arquivos.quantos, "dia importado", "dias importados")}.</p></div>`;
      } catch (e) {
        erro(e);
      }
    };
  };
}

// Faixa no topo do Calendário: "Último backup há X dias", em destaque a partir de 7 dias
export async function faixaBackup() {
  const momento = await lerMeta("ultimoBackup");
  if (!momento) {
    return `<button type="button" class="faixa-backup destaque" id="faixa-backup">Você ainda não fez nenhum backup. Toque para fazer.</button>`;
  }
  const dias = diasEntre(momento.split("T")[0], hojeISO());
  const texto = dias === 0 ? "Último backup hoje" : `Último backup há ${plural(dias, "dia", "dias")}`;
  return `<button type="button" class="faixa-backup ${dias >= 7 ? "destaque" : ""}" id="faixa-backup">${texto}</button>`;
}
