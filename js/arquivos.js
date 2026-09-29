// Entrega um arquivo gerado no aparelho.
//
// No iPhone: abre o menu de compartilhar (Salvar em Arquivos, WhatsApp, e-mail...).
// Onde isso não existir (ex.: computador): baixa o arquivo.
//
// Atenção: o iPhone só abre o menu de compartilhar se isto for chamado logo
// depois do toque. Por isso o conteúdo do arquivo deve estar pronto ANTES do toque
// (sem esperar o banco de dados no meio).
//
// Devolve true se o arquivo foi entregue, false se ela cancelou.
export async function entregarArquivo(nome, tipo, conteudo) {
  const arquivo = new File([conteudo], nome, { type: tipo });

  if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo] });
      return true;
    } catch (e) {
      if (e.name === "AbortError") return false; // fechou o menu sem escolher nada
      throw e;
    }
  }

  // Plano B: baixar
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return true;
}
