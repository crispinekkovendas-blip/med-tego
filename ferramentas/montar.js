/* Monta banco.js: junta o texto da banca (questoes.json, de extrai_tego.py,
   com as imagens do caderno em figuras/banca/), o gabarito oficial
   e o que foi escrito à mão (entrada/<area>.js e, se houver, a mini-aula
   "Sobre a matéria" de materia/<area>.js, chave "fonte#numero"). Ids por área, na ordem de
   meta.areas; dentro da área, na ordem de meta.fontes e depois pelo número
   da questão na prova. Aborta em qualquer inconsistência — banco.js só
   existe se tudo bateu. Roda: `node ferramentas/montar.js` */
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");
const meta = require("./meta.js");
const { serializar } = require("./serializar.js");
/* a figura de cada questão: fatos da máquina (figuras.json) + legenda à mão */
const figuras = JSON.parse(fs.readFileSync(path.join(RAIZ, "figuras", "figuras.json"), "utf8"));
const legendas = require("./legendas.js");

const questoesDe = {}, gabaritoDe = {};
for (const f of meta.fontes) {
  const base = path.join(RAIZ, f.caderno.replace(/\.txt$/, ""));
  questoesDe[f.id] = Object.fromEntries(JSON.parse(fs.readFileSync(base + "-questoes.json", "utf8")).map(q => [q.numero, q]));
  gabaritoDe[f.id] = Object.fromEntries(fs.readFileSync(path.join(RAIZ, f.gabarito), "utf8").trim().split(/\r?\n/).map(l => { const [n, x] = l.trim().split(/\s+/); return [Number(n), x]; }));
}
const ordemFonte = Object.fromEntries(meta.fontes.map((f, i) => [f.id, i]));
const questoes = [];
for (const a of meta.areas) {
  const arq = path.join(__dirname, "entrada", a.id + ".js");
  const entradas = fs.existsSync(arq) ? require(arq) : [];
  entradas.sort((x, y) => (ordemFonte[x.fonte] - ordemFonte[y.fonte]) || (x.numero - y.numero));
  /* "Sobre a matéria": opcional por questão enquanto está sendo escrita; uma
     chave que não é entrada nenhuma é erro (número trocado) */
  const arqM = path.join(__dirname, "materia", a.id + ".js");
  const materias = fs.existsSync(arqM) ? require(arqM) : {};
  const chaves = new Set(entradas.map(e => e.fonte + "#" + e.numero));
  for (const k of Object.keys(materias)) if (!chaves.has(k)) throw new Error(`${a.id}: materia/${a.id}.js tem a chave ${k}, que não é nenhuma entrada`);
  const vistos = new Set();
  entradas.forEach((e, i) => {
    const onde = `${a.id} ${e.fonte} #${e.numero}`;
    if (!(e.fonte in questoesDe)) throw new Error(`${onde}: fonte desconhecida`);
    const q = questoesDe[e.fonte][e.numero];
    if (!q) throw new Error(`${onde}: número não existe no caderno`);
    if (q.area !== a.id) throw new Error(`${onde}: no caderno essa questão é do bloco ${q.area}`);
    if (q.erro) throw new Error(`${onde}: a extração marcou problema (${q.erro})`);
    const g = gabaritoDe[e.fonte][e.numero];
    if (!g || g === "*") throw new Error(`${onde}: sem gabarito ou anulada (${g})`);
    if (vistos.has(e.fonte + "#" + e.numero)) throw new Error(`${onde}: repetida`);
    vistos.add(e.fonte + "#" + e.numero);
    for (const k of ["tema", "comentario", "simples"]) if (typeof e[k] !== "string" || !e[k].trim()) throw new Error(`${onde}: falta ${k}`);
    if (!Array.isArray(e.referencias) || !e.referencias.length) throw new Error(`${onde}: falta referencias`);
    const fonte = meta.fontes.find(f => f.id === e.fonte);
    const obj = { id: a.id + String(i + 1).padStart(2, "0"), area: a.id, tema: e.tema, fonte: e.fonte, edicao: fonte.edicao, numero: e.numero };
    if (q.texto) obj.texto = q.texto;       /* texto compartilhado, vindo do caderno */
    if (e.texto) obj.texto = e.texto;       /* ou escrito à mão (tabela em HTML) */
    /* imagem da banca: a questão que no caderno depende de figura traz a(s)
       imagem(ns) extraída(s) do próprio caderno; sem o arquivo, não entra */
    if (q.imagem) {
      if (!Array.isArray(q.imagens) || !q.imagens.length) throw new Error(`${onde}: o caderno marca imagem, mas a extração não guardou nenhuma`);
      obj.imagemBanca = q.imagens.map(im => {
        const src = "figuras/banca/" + im.arquivo;
        if (!fs.existsSync(path.join(RAIZ, src))) throw new Error(`${onde}: falta a imagem da banca ${src}`);
        return { src, w: im.w, h: im.h, onde: im.onde, credito: `Imagem da prova · caderno da ${fonte.nomeOficial} (FEBRASGO)` };
      });
    }
    Object.assign(obj, { enunciado: q.enunciado, alternativas: q.alternativas, correta: "ABCDE".indexOf(g), referencias: e.referencias, comentario: e.comentario, simples: e.simples });
    const fig = figuras[obj.id], leg = legendas[obj.id];
    if (fig && !leg) throw new Error(`${onde}: a figura ${fig.src} está sem legenda em ferramentas/legendas.js`);
    if (leg && !fig) throw new Error(`${onde}: há legenda para ${obj.id} em legendas.js, mas nenhuma figura em figuras/figuras.json`);
    if (fig) obj.figura = { src: fig.src, w: fig.w, h: fig.h, legenda: leg, fonte: fig.fonte, pagina: fig.pagina };
    const m = materias[e.fonte + "#" + e.numero];
    if (m !== undefined) {
      if (typeof m !== "string" || !m.trim()) throw new Error(`${onde}: matéria vazia`);
      /* escrita em linhas (uma tag de bloco por linha); guardada sem as quebras */
      obj.materia = m.split("\n").map(s => s.trim()).filter(Boolean).join("");
    }
    questoes.push(obj);
  });
}
fs.writeFileSync(path.join(RAIZ, "banco.js"), serializar({ meta, questoes }), "utf8");
console.log(`banco.js: ${questoes.length} questões (${meta.areas.map(a => `${a.id} ${questoes.filter(q => q.area === a.id).length}`).join(" · ")}) · ${questoes.filter(q => q.materia).length} com "Sobre a matéria"`);
