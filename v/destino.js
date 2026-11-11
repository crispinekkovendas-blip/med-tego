/* Para onde vai um link curto /v/<id>/<qual>. Função pura: roda na página
   v/index.html (window.destino) e no harness (module.exports). Nunca inventa
   um destino: id desconhecido ou vídeo ausente caem num fallback, que a página
   mostra com os botões. */
(function (raiz) {
  /* a correção da prova pode apontar para o minuto da questão: &t=…s é a única forma a mais */
  const URL_YT = /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}(&t=\d+s)?$/;
  function destino(id, qual, videos) {
    const chave = String(id || "").toLowerCase();
    const v = videos && typeof videos === "object" ? videos[chave] : null;
    /* flashcards e mapa mental: enquanto não existem, o código abre a questão no site */
    if (qual === "flash" || qual === "mapa") return { url: "/#" + chave };
    if (!v) return { fallback: "sem-id" };
    const termo = v.busca || v.tema || "";
    if (qual === "mais") return { url: "https://www.youtube.com/results?search_query=" + encodeURIComponent(termo) };
    if (qual === "q" || qual === "m") {
      const p = v[qual];
      return p && URL_YT.test(p.url) ? { url: p.url } : { fallback: "sem-video", id: chave, qual };
    }
    return { fallback: "escolher", id: chave };
  }
  raiz.destino = destino;
  if (typeof module !== "undefined" && module.exports) module.exports = { destino };
})(typeof window !== "undefined" ? window : this);
