/* A página de revisão dos vídeos, para o cliente: cada questão com as duas
   escolhas (miniatura, título, canal, duração, link) e o link "Mais vídeos".
   Função pura (browser e harness). As miniaturas vêm do YouTube — esta é a
   única página do site que carrega algo de lá. */
(function (raiz) {
  const escapa = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const ROT = { q: "Vídeo da questão", m: "Vídeo da matéria" };
  const idDe = url => (/v=([A-Za-z0-9_-]{11})/.exec(url) || [])[1] || "";
  const pick = (k, p) => p
    ? `<div class="pick${p.comentada ? " comentada" : ""}" data-qual="${k}"><a href="${escapa(p.url)}" target="_blank" rel="noopener"><img src="https://i.ytimg.com/vi/${escapa(idDe(p.url))}/mqdefault.jpg" width="320" height="180" alt="" loading="lazy"></a><p class="rot">${ROT[k]}${p.comentada ? " · questão comentada (correção da prova)" : ""}</p><p class="tit"><a href="${escapa(p.url)}" target="_blank" rel="noopener">${escapa(p.titulo)}</a></p><p class="meta">${escapa(p.canal)} · ${mmss(p.duracao)}</p></div>`
    : `<div class="pick vazio" data-qual="${k}"><p class="rot">${ROT[k]}</p><p>sem vídeo</p></div>`;
  function htmlRevisao(videos) {
    const ids = Object.keys(videos || {});
    const nQ = ids.filter(i => videos[i].q).length, nM = ids.filter(i => videos[i].m).length;
    const cab = `<p class="contagem">${nQ} vídeos da questão · ${nM} da matéria · faltam ${ids.length - nQ} e ${ids.length - nM}</p>`;
    return cab + ids.map(id => {
      const v = videos[id];
      return `<article class="rev" data-id="${id}"><header><span class="id">${id}</span> <span class="origem">${escapa(String(v.rotulo || v.fonte))} · Questão ${String(v.numero).padStart(2, "0")}</span><h2>${escapa(v.tema)}</h2></header><div class="picks">${pick("q", v.q)}${pick("m", v.m)}</div><p class="mais"><a href="/v/${id}/mais" target="_blank" rel="noopener">Mais vídeos do tema</a> · <a href="/#${id}">a questão no site</a></p></article>`;
    }).join("");
  }
  raiz.htmlRevisao = htmlRevisao;
  if (typeof module !== "undefined" && module.exports) module.exports = { htmlRevisao };
})(typeof window !== "undefined" ? window : this);
