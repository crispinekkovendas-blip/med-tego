/* Rebaixa os documentos-fonte que faltarem em ferramentas/cadernos/ (a lista e o porquê estão em
   FONTES.md). São cópias públicas hospedadas pelos cursinhos: a FEBRASGO só publica os cadernos
   na área do candidato. Roda: `node ferramentas/baixar.js` */
const fs = require("fs"), path = require("path"), https = require("https");
const PASTA = path.join(__dirname, "cadernos");
const ARQUIVOS = {
  "tego2022g-caderno.pdf": "https://med.estrategia.com/portal/wp-content/uploads/2022/07/ginecologia-tego-2022.pdf",
  "tego2022o-caderno.pdf": "https://med.estrategia.com/portal/wp-content/uploads/2022/07/obstetricia-tego-2022.pdf",
  "tego2022-gabarito-definitivo-medgrupo.pdf": "https://static.medgrupo.com.br/static/concursos/editais/tego/2022/prova_gabarito_definitivo_tego_2023.pdf",
  "tego2025-guia-estrategia.pdf": "https://cdn.medblog.estrategiaeducacional.com.br/wp-content/uploads/2026/04/13-10_10_Guia_da_Aprovacao_TEGO_2026.pdf",
  "tego2026-edital.pdf": "https://cdn.medblog.estrategiaeducacional.com.br/wp-content/uploads/2026/03/TEGO-2026.pdf",
};
function baixar(url, destino, saltos = 0) {
  return new Promise((ok, falha) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (banco-tego baixar.js)" } }, r => {
      if ([301, 302, 307, 308].includes(r.statusCode) && r.headers.location && saltos < 5) { r.resume(); return baixar(new URL(r.headers.location, url).href, destino, saltos + 1).then(ok, falha); }
      if (r.statusCode !== 200) { r.resume(); return falha(new Error(`HTTP ${r.statusCode} em ${url}`)); }
      const w = fs.createWriteStream(destino); r.pipe(w); w.on("finish", () => w.close(ok)); w.on("error", falha);
    }).on("error", falha);
  });
}
/* um arquivo que falha não impede os outros: o site pode responder 403 a quem não é navegador;
   nesse caso baixe pelo navegador e confira o tamanho e o md5 de FONTES.md */
(async () => {
  for (const [nome, url] of Object.entries(ARQUIVOS)) {
    const destino = path.join(PASTA, nome);
    if (fs.existsSync(destino)) { console.log(`ok     ${nome}`); continue; }
    try { await baixar(url, destino); console.log(`baixou ${nome}`); }
    catch (e) { console.log(`FALHOU ${nome}: ${e.message}`); }
  }
})();
