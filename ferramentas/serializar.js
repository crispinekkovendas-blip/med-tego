/* Escreve banco.js a partir do objeto: chaves sem aspas, strings em JSON,
   campos na ordem fixa, uma questão por bloco, um cabeçalho por área. Só o
   montar.js chama isto; banco.js nunca é editado como texto. */
const CAMPOS = ["id", "area", "tema", "fonte", "edicao", "numero", "texto", "imagemBanca", "enunciado", "alternativas", "correta", "referencias", "comentario", "simples", "materia", "figura"];
const CABECALHO = `/* ============================================================================
   BANCO DE QUESTÕES COMENTADAS — TEGO · FEBRASGO · título de especialista em GO

   GERADO por ferramentas/montar.js a partir de:
     · ferramentas/cadernos/<fonte>-questoes.json — enunciado e alternativas
       extraídos do caderno oficial (texto da banca, sem retoque) por
       ferramentas/extrai_tego.py;
     · figuras/banca/ — a imagem da própria prova, quando a questão depende
       dela (extraída do caderno por extrai_fundatec.py; campo imagemBanca,
       crédito ao caderno);
     · ferramentas/cadernos/<fonte>-gabarito.txt — o gabarito oficial;
     · ferramentas/entrada/<area>.js — tema, referências, comentário e
       Simplificando, escritos à mão;
     · ferramentas/materia/<area>.js — "Sobre a matéria", a mini-aula de
       livro-texto de cada questão, escrita à mão (campo materia);
     · figuras/figuras.json — arquivo, tamanho, autor e licença da figura
       (Wikimedia Commons, gerado por ferramentas/figuras.py) — e
       ferramentas/legendas.js, a legenda escrita à mão.
   Não edite este arquivo: mude a entrada e rode \`node ferramentas/montar.js\`.
   ========================================================================== */
`;
const j = v => JSON.stringify(v);
function serializar(banco) {
  const linhas = [CABECALHO + "window.BANCO = {"];
  linhas.push("  meta: " + JSON.stringify(banco.meta, null, 2).replace(/\n/g, "\n  ") + ",");
  linhas.push("  questoes: [");
  let area = null;
  for (const q of banco.questoes) {
    if (q.area !== area) {
      area = q.area;
      const nome = (banco.meta.areas.find(a => a.id === area) || {}).nome || area;
      linhas.push("", "/* " + "=".repeat(74), "   " + nome.toUpperCase(), "   " + "=".repeat(74) + " */", "");
    }
    const partes = [];
    for (const k of CAMPOS) {
      if (q[k] === undefined) continue;
      if (k === "alternativas" || k === "referencias") partes.push("  " + k + ": [\n" + q[k].map(a => "    " + j(a) + ",").join("\n") + "\n  ]");
      else partes.push("  " + k + ": " + j(q[k]));
    }
    linhas.push("{ " + partes.join(",\n").replace(/^  /, "") + " },", "");
  }
  linhas.push("  ],", "};");
  return linhas.join("\n") + "\n";
}
module.exports = { serializar, CAMPOS };
