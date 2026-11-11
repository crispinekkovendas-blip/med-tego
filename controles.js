/* Controles negativos do verificar.js. Roda em Node: `node controles.js`.

   Cada controle planta UMA falha num arquivo (banco.js, app.js, app.css,
   caderno/caderno.js ou caderno/caderno.css), roda o verificar.js e exige
   que ele FALHE citando o lugar certo; o arquivo é restaurado aconteça o
   que acontecer. Um harness que passa com a falha plantada é um harness
   cego. Um controle que não altera nada é erro.

   banco.js é gerado, mas plantar nele é legítimo: o que se testa é o
   harness, e o arquivo volta ao original no fim. Nenhum controle cita
   conteúdo de questão nenhuma: os alvos (a primeira questão da primeira
   área, a primeira com imagem da banca, a primeira com e a primeira sem
   parágrafo de recursos) são escolhidos lendo o próprio banco.js, e as
   falhas são plantadas sobre o valor JSON de cada campo.

   Não vai para o deploy (.vercelignore). */
const fs = require("fs"), path = require("path"), cp = require("child_process");
const DIR = __dirname;
const ARQS = ["banco.js", "app.js", "app.css", "caderno/caderno.js", "caderno/caderno.css", "videos.json", "v/destino.js"];
const originais = Object.fromEntries(ARQS.map(a => [a, fs.readFileSync(path.join(DIR, a), "utf8")]));

function roda() {
  const r = cp.spawnSync("node", ["verificar.js"], { cwd: DIR, encoding: "utf8" });
  return { ok: r.status === 0, saida: (r.stdout || "") + (r.stderr || "") };
}
/* substitui exatamente UMA ocorrência ou aborta */
function planta(orig, velho, novo) {
  const partes = orig.split(velho);
  if (partes.length !== 2) throw new Error(`controle inválido: ${partes.length - 1} ocorrência(s) de ${JSON.stringify(velho).slice(0, 80)}`);
  return partes.join(novo);
}
/* a mesma coisa, mas só dentro do bloco de UMA questão de banco.js */
function noBloco(orig, id, velho, novo) {
  const i = orig.indexOf(`{ id: "${id}",`);
  if (i < 0) throw new Error("id inexistente " + id);
  const f = orig.indexOf("\n{ id: ", i + 1);
  const bloco = orig.slice(i, f < 0 ? undefined : f);
  return orig.slice(0, i) + planta(bloco, velho, novo) + (f < 0 ? "" : orig.slice(f));
}
/* o banco, para escolher as questões-alvo sem citar conteúdo nenhum */
const banco = (() => { const vm = require("vm"); const c = vm.createContext({ window: {} }); vm.runInContext(originais["banco.js"], c); return c.window.BANCO; })();
const AREA1 = banco.meta.areas[0];
const Q1 = banco.questoes[0], ID1 = Q1.id;
const LETRAS = "ABCD";
const OUTRA = LETRAS.split("").find(L => L !== LETRAS[Q1.correta]);               /* uma letra errada de Q1 */
const IMG1 = (banco.questoes.find(q => q.imagemBanca) || {}).id;                 /* a primeira com imagem da banca */
const REC1 = (banco.questoes.find(q => /<p>Nos recursos, a banca/.test(q.comentario)) || {}).id;
const SEMREC = (banco.questoes.find(q => !/<p>Nos recursos, a banca/.test(q.comentario)) || {}).id;
const MULTI = banco.meta.areas.filter(a => banco.questoes.some(q => q.area === a.id)).length > 1;   /* o índice só agrupa por área com mais de uma */
const EXIGE_VIDEOS = /const EXIGE_VIDEOS = true/.test(fs.readFileSync(path.join(DIR, "verificar.js"), "utf8"));
if (!IMG1 || !SEMREC) throw new Error("o banco precisa de ao menos uma questão com imagem da banca e uma sem parágrafo de recursos");
/* a FEBRASGO não publica justificativas: REC1 só existe se algum dia uma fonte trouxer recursos (o controle entra junto) */
/* a primeira questão anulada da fonte de Q1, pelo gabarito oficial */
const linhaAnulada = fs.readFileSync(path.join(DIR, "ferramentas", "cadernos", Q1.fonte + "-gabarito.txt"), "utf8").split("\n").find(l => l.trim().endsWith("*"));
const ANULADA = linhaAnulada ? Number(linhaAnulada.trim().split(/\s+/)[0]) : null;   /* nenhuma anulada no TEGO 2022/2025 */
/* o bloco de UMA questão de banco.js: [início, fim) */
const blocoDe = (o, id) => { const i = o.indexOf(`{ id: "${id}",`); if (i < 0) throw new Error("id inexistente " + id); const f = o.indexOf("\n{ id: ", i + 1); return [i, f < 0 ? o.length : f]; };
/* troca o valor de um campo escalar (string ou número) de UMA questão */
function trocaCampo(o, id, nome, f) {
  const [i, fim] = blocoDe(o, id);
  const a = o.indexOf(`\n  ${nome}: `, i) + nome.length + 5;
  if (a < i || a > fim) throw new Error(`campo ${nome} não está em ${id}`);
  const b = o.indexOf("\n", a);
  const bruto = o.slice(a, b).replace(/ \},$/, "").replace(/,$/, "");
  const sufixo = o.slice(a, b).endsWith(" },") ? " }," : ",";
  return o.slice(0, a) + JSON.stringify(f(JSON.parse(bruto))) + sufixo + o.slice(b);
}
/* troca a k-ésima entrada de um campo-lista (alternativas, referencias) */
function trocaItem(o, id, nome, k, f) {
  const [i] = blocoDe(o, id);
  const a = o.indexOf(`\n  ${nome}: [\n`, i) + nome.length + 7, b = o.indexOf("\n  ]", a);
  const linhas = o.slice(a, b).split("\n");
  linhas[k] = "    " + JSON.stringify(f(JSON.parse(linhas[k].trim().replace(/,$/, "")))) + ",";
  return o.slice(0, a) + linhas.join("\n") + o.slice(b);
}
/* apaga a linha de um campo escalar de UMA questão */
const semCampo = (o, id, nome) => { const [i] = blocoDe(o, id); const a = o.indexOf(`\n  ${nome}: `, i); const b = o.indexOf("\n", a + 1); return o.slice(0, a) + o.slice(b); };

const controles = [
  /* --- gabarito oficial e fidelidade ao caderno --------------------------- */
  { nome: `gabarito: correta de ${ID1} movida para outra letra`,
    txt: o => trocaCampo(o, ID1, "correta", v => (v + 1) % 4), cita: /correta diz [A-D], o gabarito oficial de tego\d{4}[go] diz/ },
  { nome: `fidelidade: uma palavra a mais no enunciado de ${ID1}`,
    txt: o => trocaCampo(o, ID1, "enunciado", s => "Xyzzy " + s), cita: /o enunciado não está, palavra por palavra/ },
  { nome: `fidelidade: alternativa B de ${ID1} com uma palavra a mais`,
    txt: o => trocaItem(o, ID1, "alternativas", 1, s => s + " xyzzy"), cita: /a alternativa B não está, palavra por palavra/ },
  ...(ANULADA ? [{ nome: `anulada: ${ID1} passa a dizer que era a questão ${ANULADA} (anulada)`,
    txt: o => trocaCampo(o, ID1, "numero", () => ANULADA), cita: /foi ANULADA pela banca/ }] : []),
  { nome: `edição: ${ID1} com a edição errada`,
    txt: o => trocaCampo(o, ID1, "edicao", v => v - 1), cita: /não bate com a da fonte/ },
  /* --- a forma ------------------------------------------------------------ */
  { nome: `ids: ${ID1} renomeada para ${AREA1.id}09`,
    txt: o => noBloco(o, ID1, `id: "${ID1}",`, `id: "${AREA1.id}09",`), cita: new RegExp(`${AREA1.id}09: id fora da sequência|id repetido`) },
  { nome: `contagem: ${ID1} removida`,
    txt: o => { const [i, f] = blocoDe(o, ID1); return o.slice(0, i) + (f >= o.length ? "  ],\n};\n" : o.slice(f + 1)); }, cita: new RegExp(`esperava \\d+ questões em ${AREA1.id}, há \\d+`) },
  { nome: `área: ${ID1} com área "${AREA1.id}x"`,
    txt: o => trocaCampo(o, ID1, "area", v => v + "x"), cita: new RegExp(`área "${AREA1.id}x" não está em meta.areas`) },
  { nome: `tema: ${ID1} com tema de 80 caracteres`,
    txt: o => trocaCampo(o, ID1, "tema", () => "x".repeat(80)), cita: /tema fora de 8–70/ },
  { nome: `referências: ${ID1} sem referências`,
    txt: o => { const [i] = blocoDe(o, ID1); const a = o.indexOf("referencias: [", i); const b = o.indexOf("]", a); return o.slice(0, a) + "referencias: [" + o.slice(b); }, cita: /referencias precisa de 1 a 3 entradas/ },
  /* --- comentário e Simplificando ---------------------------------------- */
  { nome: `abertura: comentário de ${ID1} abre com outro número`,
    txt: o => trocaCampo(o, ID1, "comentario", s => s.replace(/Questão \d+ \(/, "Questão 999 (")), cita: /não abre com "Questão \d+ \(TEGO (Ginecologia|Obstetrícia) 20\d\d\)"/ },
  { nome: `veredito: comentário de ${ID1} dá outra letra`,
    txt: o => trocaCampo(o, ID1, "comentario", s => s.replace(/Gabarito <strong>[A-D]<\/strong>/, `Gabarito <strong>${OUTRA}</strong>`)), cita: new RegExp(`dá o veredito para ${OUTRA}, e o gabarito é`) },
  { nome: `veredito duplo: comentário de ${ID1} com duas frases de veredito`,
    txt: o => trocaCampo(o, ID1, "comentario", s => s.replace(/(Gabarito <strong>[A-D]<\/strong>)/, "$1. $1")), cita: /exatamente uma frase "Gabarito <strong>X<\/strong>" \(há 2\)/ },
  { nome: `distrator: comentário de ${ID1} deixa de explicar a letra ${OUTRA}`,
    txt: o => trocaCampo(o, ID1, "comentario", s => s.split(`<strong>${OUTRA}</strong>`).join(OUTRA)), cita: new RegExp(`não explica a alternativa ${OUTRA}`) },
  { nome: `fecho: comentário de ${ID1} sem "O que a banca testa"`,
    txt: o => trocaCampo(o, ID1, "comentario", s => s.replace("O que a banca testa", "O que a prova testa")), cita: /não fecha dizendo "O que a banca testa"/ },
  { nome: `simples: ${ID1} diz outra letra`,
    txt: o => trocaCampo(o, ID1, "simples", s => s.replace(/letra <strong>[A-D]<\/strong>/, `letra <strong>${OUTRA}</strong>`)), cita: new RegExp(`o "simples" diz letra ${OUTRA}, e o gabarito é`) },
  { nome: `simples: ${ID1} com uma frase de 40 palavras`,
    txt: o => trocaCampo(o, ID1, "simples", s => s.replace("</p>", " " + "palavra ".repeat(40).trim() + ".</p>")), cita: /"simples" tem uma frase de \d+ palavras/ },
  { nome: `marcação: <span> no comentário de ${ID1}`,
    txt: o => trocaCampo(o, ID1, "comentario", s => s.replace("<strong>", "<span>").replace("</strong>", "</span>")), cita: /tag não permitida em comentario: <span>/ },
  { nome: `marcação: <strong> sem fechamento em ${ID1}`,
    txt: o => trocaCampo(o, ID1, "comentario", s => s.replace("</strong>", "")), cita: /<strong> desequilibrado em comentario/ },
  /* --- a página ---------------------------------------------------------- */
  { arquivo: "app.js", nome: "app: etiqueta sem o rótulo da prova",
    txt: o => planta(o, "const rotuloOrigem = q => `${FONTES[q.fonte].rotulo} · Questão ${dois(q.numero)}`;", "const rotuloOrigem = q => `Questão ${dois(q.numero)}`;"), cita: /etiqueta "Questão \d\d", esperava/ },
  /* os filtros por área só podem ser pegos quando há mais de uma área (com uma, filtrar é mostrar tudo) */
  ...(banco.meta.areas.length > 1 ? [
  { arquivo: "app.js", nome: "app: o filtro por área mostra tudo",
    txt: o => planta(o, "NOME_AREA[f] ? lista.filter(q => q.area === f)", "NOME_AREA[f] ? lista"), cita: new RegExp(`o filtro "${AREA1.nome}" mostrou \\d+ cartões`) },
  { arquivo: "caderno/caderno.js", nome: "caderno: o filtro de área é ignorado",
    txt: o => planta(o, '(op.area === "todas" || q.area === op.area)', "true"), cita: new RegExp(`com a área ${AREA1.id}, o caderno montou \\d+ fichas|o filtro de edição do caderno não funciona`) },
  ] : []),
  { arquivo: "app.js", nome: "app: respostas gravadas na chave do INEPAM",
    txt: o => planta(o, 'const CH_RESP = "tego:respostas";', 'const CH_RESP = "inepam:respostas";'), cita: /gravou numa chave do banco INEPAM|não gravou em tego:respostas/ },
  { arquivo: "app.js", nome: "app: respostas gravadas na chave do SUS-SP",
    txt: o => planta(o, 'const CH_RESP = "tego:respostas";', 'const CH_RESP = "susp:respostas";'), cita: /gravou numa chave do banco SUS-SP|não gravou em tego:respostas/ },
  { arquivo: "app.js", nome: "app: clicar em Simplificando não guarda a escolha",
    txt: o => planta(o, "try { localStorage.setItem(CH_ABA, qual); } catch (e) { /* sem armazenamento */ }", "/* nada */"), cita: /a aba escolhida não foi guardada/ },
  { arquivo: "app.js", nome: "app: o simulado deixa a primeira área de fora",
    txt: o => planta(o, "const ids = AREAS.flatMap(a => embaralhar(", "const ids = AREAS.slice(1).flatMap(a => embaralhar("), cita: /o simulado sorteou \d+ questões, esperava \d+/ },
  { arquivo: "app.js", nome: "app: o comentário sai sem a linha de referências",
    txt: o => planta(o, "html: q.comentario + figura + referencias + fonte", "html: q.comentario + figura + fonte"), cita: /não traz a linha de referências/ },
  { arquivo: "app.js", nome: "app: a tag de área do cartão traz o id, não o nome",
    txt: o => planta(o, 'h("span", { class: "tag " + q.area }, NOME_AREA[q.area]),\n      h("span", { class: "tag tema" }', 'h("span", { class: "tag " + q.area }, q.area),\n      h("span", { class: "tag tema" }'), cita: /a tag de área do cartão não traz a classe e o nome/ },
  { arquivo: "app.js", nome: "app: os dois painéis ficam visíveis ao mesmo tempo",
    txt: o => planta(o, "paineis[k].hidden = k !== qual;", "paineis[k].hidden = false;"), cita: /a aba Comentário não é a visível de início/ },
  /* --- o caderno --------------------------------------------------------- */
  { arquivo: "caderno/caderno.js", nome: "caderno: gabarito resumido com a letra seguinte",
    txt: o => planta(o, "[i + k + 1, LETRAS[q.correta], q.id]", "[i + k + 1, LETRAS[(q.correta + 1) % 4], q.id]"), cita: /o gabarito impresso não bate/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: comentário de outra questão dentro da ficha",
    txt: o => planta(o, 'h("div", { class: "texto-comentario", html: q.comentario })', 'h("div", { class: "texto-comentario", html: Q[Q.length - 1].comentario })'), cita: /alguma ficha não traz/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: a linha dos PDFs volta a vazar a URL crua (flat de um nível só)",
    txt: o => planta(o, "filhos.flat(Infinity)", "filhos.flat()"), cita: /PDF pronto/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: o nome do estudante some da capa",
    txt: o => planta(o, 'h("span", { class: "linha nome" }, op.nome || "")', 'h("span", { class: "linha nome" }, "")'), cita: /trocar o nome não chega à capa e ao rodapé/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: o mapa de temas perde a coluna da página",
    txt: o => planta(o, 'h("td", { class: "tema" }, q.tema), h("td", { class: "pag" }, ""))', 'h("td", { class: "tema" }, q.tema))'), cita: /mapa de temas é o índice/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: as páginas da URL (?paginas=) não chegam ao índice",
    txt: o => planta(o, "preencherIndice(PAGINAS_URL)", "preencherIndice([])"), cita: /com \?paginas= na URL o mapa de temas/ },
  { arquivo: "caderno/caderno.css", nome: "caderno.css: @page sem o contador de páginas",
    txt: o => planta(o, 'counter(page) " de " counter(pages)', 'counter(page)'), cita: /counter\(pages\)/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: Simplificando some da ficha",
    txt: o => planta(o, "op.simples && q.simples ?", "false ?"), cita: /alguma ficha não traz/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: a linha de fonte da ficha traz o documento inteiro",
    txt: o => planta(o, "`Questão ${dois(q.numero)} · ${FONTES[q.fonte].rotulo}.`", "`Questão ${dois(q.numero)} · ${FONTES[q.fonte].rotulo} — ${FONTES[q.fonte].txt}.`"), cita: /a linha de fonte da ficha não é/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: a ficha sai sem referências",
    txt: o => planta(o, 'h("p", { class: "referencias", html: `<span class="rot">Referências</span> ${q.referencias.join(" · ")}` }),', ""), cita: /alguma ficha não traz/ },
  ...(MULTI ? [{ arquivo: "caderno/caderno.js", nome: "caderno: a linha de grupo do índice perde o nome da área",
    txt: o => planta(o, 'h("span", { class: "tag " + q.area }, NOME_AREA[q.area]))));', 'h("span", { class: "tag " + q.area }, q.area))));'), cita: /o índice precisa abrir cada bloco de área com uma linha de grupo/ }] : []),
  { arquivo: "caderno/caderno.css", nome: "caderno.css: overflow: hidden volta à ficha",
    txt: o => planta(o, ".questao { margin: 0 0 7mm; border: 1px solid var(--line-2); border-radius: 3px;", ".questao { margin: 0 0 7mm; border: 1px solid var(--line-2); border-radius: 3px; overflow: hidden;"), cita: /não podem ter overflow: hidden nem break-inside: avoid/ },
  { arquivo: "app.js", nome: "app: aparece filtro de uma edição que não tem questões (edição inventada)",
    txt: o => planta(o, "const EDICOES = B.meta.fontes.filter(f => Q.some(q => q.fonte === f.id));", 'const EDICOES = B.meta.fontes.concat([{ id: "falsa", rotulo: "FALSA 2020" }]);'), cita: /há filtro de edição sem questão nenhuma|há \d+ botões de filtro/ },
  { arquivo: "app.css", nome: "app.css: os filtros voltam a não quebrar linha no celular",
    txt: o => planta(o, "  .seg { flex-wrap: wrap; }\n", ""), cita: /flex-wrap: wrap/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: a medida não é refeita antes de imprimir",
    txt: o => planta(o, 'window.addEventListener("beforeprint", medirFichas)', "void 0"), cita: /beforeprint/ },
  { arquivo: "caderno/caderno.css", nome: "caderno.css: Letra grande sem efeito no comentário",
    txt: o => planta(o, ".letra-grande .texto-comentario { font-size: 11pt; }\n", ""), cita: /Letra grande não chega/ },
  { arquivo: "caderno/caderno.css", nome: "caderno.css: página de 250mm",
    txt: o => planta(o, "--pagina: 256mm", "--pagina: 250mm"), cita: /--pagina deve ser 256mm/ },
  { arquivo: "caderno/caderno.css", nome: "caderno.css: a ficha volta a ocupar a página inteira",
    txt: o => planta(o, "border-radius: 3px;\n  display: flex; flex-direction: column; }", "border-radius: 3px;\n  display: flex; flex-direction: column; min-height: var(--pagina); }"), cita: /fluxo corrido/ },
  { arquivo: "caderno/caderno.css", nome: "caderno.css: a ficha volta a quebrar página depois",
    txt: o => planta(o, ".questao { margin: 0 0 6mm; break-after: auto; page-break-after: auto; }", ".questao { margin: 0; break-after: page; page-break-after: always; }"), cita: /começa logo depois/ },
  /* --- figuras ------------------------------------------------------------ */
  { nome: `figura: ${ID1} declara outra largura`,
    txt: o => { const i = o.indexOf(`{ id: "${ID1}",`); const m = /"w":(\d+)/.exec(o.slice(i)); return o.slice(0, i) + o.slice(i).replace(m[0], `"w":${Number(m[1]) + 10}`); }, cita: /figura declara \d+×\d+, o arquivo tem|imagem da banca declara \d+×\d+/ },
  { nome: `figura: ${ID1} aponta para um arquivo que não existe`,
    txt: o => noBloco(o, ID1, `"src":"figuras/${ID1}.jpg"`, `"src":"figuras/${ID1}x.jpg"`), cita: /figura\.src deve ser|o arquivo da figura não existe/ },
  { nome: `figura: ${ID1} com legenda de 12 caracteres`,
    txt: o => { const i = o.indexOf(`{ id: "${ID1}",`); const m = /"legenda":"[^"]*"/.exec(o.slice(i)); return o.slice(0, i) + o.slice(i).replace(m[0], '"legenda":"Curta demais"'); }, cita: /legenda da figura fora de 20–320/ },
  { nome: `figura: ${ID1} com fonte sem licença`,
    txt: o => { const i = o.indexOf(`{ id: "${ID1}",`); const m = /"fonte":"[^"]*"/.exec(o.slice(i)); return o.slice(0, i) + o.slice(i).replace(m[0], '"fonte":"Fulano · Wikimedia Commons"'); }, cita: /fonte da figura precisa de autor, licença/ },
  { nome: `figura: ${ID1} com licença NC`,
    txt: o => noBloco(o, ID1, ' · Wikimedia Commons"', ' NC · Wikimedia Commons"'), cita: /licença NC ou ND/ },
  { nome: `figura: ${ID1} fica sem figura`,
    txt: o => { const i = o.indexOf(`{ id: "${ID1}",`); const a = o.indexOf(",\n  figura: {", i); const b = o.indexOf("}", a); return o.slice(0, a) + o.slice(b + 1); }, cita: /sem figura/ },
  { arquivo: "app.js", nome: "app: o painel Comentário sai sem a figura",
    txt: o => planta(o, "html: q.comentario + figura + referencias + fonte", "html: q.comentario + referencias + fonte"), cita: /não traz a figura/ },
  { arquivo: "app.js", nome: "app: a imagem sai sem width/height",
    txt: o => planta(o, 'width="${f.w}" height="${f.h}" ', ""), cita: /sem width\/height/ },
  { arquivo: "app.js", nome: "app: clicar na imagem não amplia",
    txt: o => planta(o, 'if (q.figura && e && e.target && e.target.tagName === "IMG") ampliar(q.figura);', "void 0;"), cita: /não abre a figura ampliada/ },
  { arquivo: "app.js", nome: "app: Esc não fecha a figura ampliada",
    txt: o => planta(o, 'const tecla = e => { if (e && e.key === "Escape") fecha(); };', "const tecla = () => {};"), cita: /Esc não fecha/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: a ficha sai sem a figura",
    txt: o => planta(o, 'op.figuras && q.figura ? h("figure"', 'false ? h("figure"'), cita: /alguma ficha não traz a figura/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: a opção Figuras desligada é ignorada",
    txt: o => planta(o, 'op.figuras && q.figura ? h("figure"', 'q.figura ? h("figure"'), cita: /Figuras desligada/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: a figura aponta para figuras/ sem o ../",
    txt: o => planta(o, 'src: "../" + q.figura.src', "src: q.figura.src"), cita: /alguma ficha não traz a figura/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: a medida não é refeita quando as imagens carregam",
    txt: o => planta(o, 'window.addEventListener("load", medirFichas)', "void 0"), cita: /evento load/ },
  { arquivo: "caderno/caderno.css", nome: "caderno.css: a figura da ficha sem limite de altura",
    txt: o => planta(o, "max-height: 52mm;", "max-height: none;"), cita: /max-height em mm/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: a pauta sai sem o quadro dos termos-chave",
    txt: o => planta(o, 'h("span", { class: "rot" }, "Termos-chave"), h("div", { class: "termos" }),', ""), cita: /alguma ficha não traz, dentro dela/ },
  { arquivo: "caderno/caderno.css", nome: "caderno.css: o quadro dos termos-chave perde a altura fixa",
    txt: o => planta(o, ".notas .termos { flex: none; height: 40mm;", ".notas .termos { flex: none; height: auto;"), cita: /40 mm fixos/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: a pauta padrão volta a ser de linhas",
    txt: o => planta(o, 'pauta: "quadriculado", letra', 'pauta: "linhas", letra'), cita: /pauta padrão precisa ser a quadriculada/ },
  { arquivo: "caderno/caderno.css", nome: "caderno.css: o quadriculado some",
    txt: o => planta(o, ".notas.quadriculado .linhas, .notas.quadriculado .termos {", ".notas.quadriculadox .linhas, .notas.quadriculadox .termos {"), cita: /quadriculado de 5 mm/ },
  { arquivo: "app.css", nome: "app.css: a figura ampliada deixa de cobrir a tela",
    txt: o => planta(o, ".ampliar { position: fixed;", ".ampliar { position: static;"), cita: /\.ampliar \{ position: fixed/ },
  /* --- quatro alternativas (todas) ---------------------------------------- */
  { nome: `quatro alternativas: gabarito E numa questão A–D (${ID1})`,
    txt: o => trocaCampo(o, ID1, "correta", () => 4), cita: /aponta para uma alternativa que a questão não tem/ },
  { nome: `quatro alternativas: ${ID1} fica com três alternativas`,
    txt: o => { const [i] = blocoDe(o, ID1); const a = o.indexOf("alternativas: [", i); const b = o.indexOf("\n  ]", a); const linhas = o.slice(a, b).split("\n"); return o.slice(0, a) + linhas.slice(0, -1).join("\n") + o.slice(b); }, cita: /precisa de 4 ou 5 alternativas \(há 3\)/ },
  { nome: `quatro alternativas: o comentário de ${ID1} fala de uma letra E`,
    txt: o => trocaCampo(o, ID1, "comentario", s => s.replace("<strong>D</strong>", "<strong>E</strong>")), cita: /fala de uma alternativa E que a questão não tem/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: a folha de respostas volta a dar 5 bolhas a todas",
    txt: o => planta(o, "i < lista[n - 1].alternativas.length ? h(\"span\", { class: \"bolha\" }) : null", 'h("span", { class: "bolha" })'), cita: /folha de respostas não tem uma bolha por alternativa/ },
  /* --- Sobre a matéria (só quando a primeira questão já tem a mini-aula) --- */
  ...(Q1.materia ? [
  { nome: `materia: ${ID1} sem a parte Resumo`,
    txt: o => noBloco(o, ID1, "<h4>Resumo</h4>", "<h4>Sumário</h4>"), cita: /precisa das seis partes na ordem/ },
  { nome: `materia: ${ID1} com Resumo e Verifique trocados de lugar`,
    txt: o => noBloco(noBloco(noBloco(o, ID1, "<h4>Resumo</h4>", "<h4>TMP</h4>"), ID1, "<h4>Verifique o que aprendeu</h4>", "<h4>Resumo</h4>"), ID1, "<h4>TMP</h4>", "<h4>Verifique o que aprendeu</h4>"), cita: /precisa das seis partes na ordem/ },
  { nome: `materia: ${ID1} com só dois objetivos`,
    txt: o => { const i = o.indexOf(`{ id: "${ID1}",`); const cab = "<h4>Objetivos de aprendizagem</h4><ul>"; const a = o.indexOf(cab, i) + cab.length; const b = o.indexOf("</li>", a) + 5; return o.slice(0, a) + o.slice(b); }, cita: /com 2 objetivos/ },
  { nome: `materia: ${ID1} fala do gabarito`,
    txt: o => noBloco(o, ID1, "<h4>O essencial</h4><p>", "<h4>O essencial</h4><p>Gabarito: "), cita: /fala do item/ },
  { nome: `materia: ${ID1} com uma tag <script>`,
    txt: o => noBloco(o, ID1, "<h4>Resumo</h4>", "<h4>Resumo</h4><script>x</script>"), cita: /tag não permitida em materia/ },
  { nome: `materia: ${ID1} sem a caixa do Ponto clínico`,
    txt: o => noBloco(o, ID1, '<div class=\\"ponto\\">', '<div class=\\"caixa\\">'), cita: /sem a caixa/ },
  { arquivo: "app.js", nome: "app: o cartão sai sem a terceira aba",
    txt: o => planta(o, "if (q.materia) paineis.materia = h(", "if (false) paineis.materia = h("), cita: /tem 2 abas, esperava 3/ },
  { arquivo: "app.js", nome: "app: a aba Sobre a matéria não fica guardada",
    txt: o => planta(o, 'onclick: () => escolhe("materia") }, "Sobre a matéria"', 'onclick: () => mostra("materia") }, "Sobre a matéria"'), cita: /Sobre a matéria não foi guardada/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: a ficha sai sem Sobre a matéria",
    txt: o => planta(o, 'const propria = op.materia === "pagina" && !!q.materia;', "const propria = false;"), cita: /em página própria, o caderno montou/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: a opção Sobre a matéria desligada é ignorada",
    txt: o => planta(o, 'op.materia === "junto" && q.materia ? materiaBloco(q)', "q.materia ? materiaBloco(q)"), cita: /Sobre a matéria desligado ainda aparece/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: as respostas do Verifique saem escondidas no papel",
    txt: o => planta(o, "html: materiaImpressa(q.materia)", "html: q.materia"), cita: /alguma ficha não traz, dentro dela/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: a página Sobre a matéria sai sem a pauta",
    txt: o => planta(o, "materiaBloco(q), notas())];", "materiaBloco(q))];"), cita: /alguma página Sobre a matéria não traz/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: a página Sobre a matéria vem antes da ficha da questão",
    txt: o => planta(planta(o, 'return [a, h("article"', 'return [h("article"'), "notas())];", "notas()), a];"), cita: /precisa vir logo depois da ficha da sua questão/ },
  { arquivo: "caderno/caderno.css", nome: "caderno.css: pauta sem os 50 mm",
    txt: o => planta(o, ".notas .linhas { min-height: 50mm; }", ".notas .linhas { min-height: 16mm; }"), cita: /50 mm fixos/ },
  { arquivo: "caderno/caderno.css", nome: "caderno.css: cabeçalho da ficha pode ficar órfão",
    txt: o => planta(o, ".questao > header { break-after: avoid; page-break-after: avoid; }", ".questao > header { }"), cita: /órfão/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: a mini-aula sai antes do Simplificando",
    txt: o => planta(o, 'op.simples && q.simples ? h("div", { class: "simples" }, h("p", { class: "rot" }, "Simplificando"), h("div", { html: q.simples })) : null,\n        op.materia === "junto" && q.materia ? materiaBloco(q) : null,', 'op.materia === "junto" && q.materia ? materiaBloco(q) : null,\n        op.simples && q.simples ? h("div", { class: "simples" }, h("p", { class: "rot" }, "Simplificando"), h("div", { html: q.simples })) : null,'), cita: /precisa vir depois do Simplificando/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: a ficha da questão volta a ter uma segunda pauta",
    txt: o => planta(o, "propria ? null : notas());", "notas());"), cita: /não pode trazer a mini-aula nem a pauta/ },
  ] : []),
  /* --- imagem da banca ---------------------------------------------------- */
  { nome: `imagem da banca: ${IMG1} aponta para um arquivo que não existe`,
    txt: o => noBloco(o, IMG1, '"src":"figuras/banca/', '"src":"figuras/banca/x'), cita: /o arquivo da imagem da banca não existe/ },
  { nome: `imagem da banca: ${IMG1} perde o campo imagemBanca`,
    txt: o => semCampo(o, IMG1, "imagemBanca"), cita: /o caderno tem imagem nessa questão, e o banco não traz imagemBanca/ },
  { nome: `imagem da banca: ${IMG1} com crédito vazio`,
    txt: o => noBloco(o, IMG1, '"credito":"Imagem da prova', '"credito":"'), cita: /crédito da imagem da banca/ },
  { arquivo: "app.js", nome: "app: o cartão sai sem a imagem da banca",
    txt: o => planta(o, "if (q.imagemBanca) partes.push(...figuraBanca(q));", ""), cita: /a página não traz a imagem da banca|montou \d+ figuras da banca/ },
  { arquivo: "app.js", nome: "app: a imagem da banca sai depois das alternativas",
    txt: o => planta(o, "if (q.imagemBanca) partes.push(...figuraBanca(q));\n    partes.push(alts);", "partes.push(alts);\n    if (q.imagemBanca) partes.push(...figuraBanca(q));"), cita: /precisa ficar entre o enunciado e as alternativas/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: a ficha sai sem a imagem da banca",
    txt: o => planta(o, "q.imagemBanca ? q.imagemBanca.map(im => figuraBanca(im)) : null,", "null,"), cita: /alguma ficha não traz a imagem da banca/ },
  { arquivo: "caderno/caderno.css", nome: "caderno.css: a imagem da banca sem limite de altura",
    txt: o => planta(o, "max-height: 70mm;", "max-height: none;"), cita: /limite de altura da imagem da banca/ },
  /* --- recursos ----------------------------------------------------------- */
  ...(REC1 ? [{ nome: `recursos: ${REC1} perde o parágrafo "Nos recursos, a banca"`,
    txt: o => trocaCampo(o, REC1, "comentario", s => s.replace(/<p>Nos recursos, a banca[\s\S]*?<\/p>\s*$/, "")), cita: /a banca respondeu recursos nessa questão/ }] : []),
  { nome: `recursos: ${SEMREC} ganha um parágrafo "Nos recursos, a banca"`,
    txt: o => trocaCampo(o, SEMREC, "comentario", s => s + "<p>Nos recursos, a banca manteve o gabarito.</p>"), cita: /a banca não respondeu recursos nessa questão/ },
  { arquivo: "app.css", nome: "app.css: a sigla do cabeçalho volta a ser um quadrado fixo (TEGO sai apertado)",
    txt: o => planta(o, "min-width: 34px; height: 34px; padding: 0 8px;", "width: 34px; height: 34px;"), cita: /sigla do cabeçalho/ },
  /* --- vocabulário do TEGO ------------------------------------------------- */
  { arquivo: "app.js", nome: "app: a projeção volta a falar em habilitação",
    txt: o => planta(o, "A FEBRASGO exige <b>${NUM.corte}% de acertos em cada prova</b>", "O edital habilita quem faz"), cita: /de acertos em cada prova|habilita/ },
  /* --- vídeos: videos.json, um por questão, canal da lista, url canônica --- */
  { arquivo: "videos.json", nome: `vídeos: ${ID1} sumiu de videos.json`,
    txt: o => { const V = JSON.parse(o); delete V[ID1]; return JSON.stringify(V, null, 1); }, cita: /videos\.json tem \d+ ids, esperava um por questão/ },
  { arquivo: "videos.json", nome: `vídeos: ${ID1} com url fora da forma canônica`,
    txt: o => { const V = JSON.parse(o); V[ID1].q = { url: "https://youtu.be/aaaaaaaaaaa", titulo: "x", canal: "y", canalId: "UCx", duracao: 600 }; return JSON.stringify(V, null, 1); }, cita: /url do vídeo q não é https:\/\/www\.youtube\.com\/watch/ },
  { arquivo: "videos.json", nome: `vídeos: ${ID1} com canal fora da lista`,
    txt: o => { const V = JSON.parse(o); V[ID1].m = { url: "https://www.youtube.com/watch?v=aaaaaaaaaaa", titulo: "x", canal: "Canal Y", canalId: "UCnaolistado", duracao: 600 }; return JSON.stringify(V, null, 1); }, cita: /não está em canais\.json/ },
  { arquivo: "videos.json", nome: `vídeos: ${ID1} com busca de 3 letras`,
    txt: o => { const V = JSON.parse(o); V[ID1].busca = "abc"; return JSON.stringify(V, null, 1); }, cita: /busca fora de 8–80/ },
  ...(EXIGE_VIDEOS ? [{ arquivo: "videos.json", nome: `vídeos: escolha da questão de ${ID1} ausente`,
    txt: o => { const V = JSON.parse(o); V[ID1].q = null; return JSON.stringify(V, null, 1); }, cita: /sem vídeo da questão/ }] : []),
  /* --- links curtos: destino() ---------------------------------------------- */
  { arquivo: "v/destino.js", nome: "destino: id desconhecido mandado para o YouTube",
    txt: o => planta(o, 'if (!v) return { fallback: "sem-id" };', 'if (!v) return { url: "https://www.youtube.com/" };'), cita: /destino\(\): um id desconhecido/ },
  { arquivo: "v/destino.js", nome: "destino: busca sem codificar",
    txt: o => planta(o, "encodeURIComponent(termo)", "termo"), cita: /destino\(\): a busca não está codificada/ },
  /* --- caderno: a faixa dos três QR codes ---------------------------------- */
  { arquivo: "caderno/caderno.js", nome: "caderno: faixa dos QR codes removida",
    txt: o => planta(o, "op.qr ? videos(q) : null", "null"), cita: /ficha sem os cinco QR codes/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: QR code com a url sem o id",
    txt: o => planta(o, 'BASE_V + q.id + "/" + k', 'BASE_V + k'), cita: /QR code .* href/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: QR code volta ao nível M",
    txt: o => planta(o, 'qrcode(0, "H")', 'qrcode(0, "M")'), cita: /nível H/ },
  { arquivo: "caderno/caderno.css", nome: "caderno.css: QR code encolhe para 18 mm",
    txt: o => planta(o, ".videos .codigo svg { width: 28mm; height: 28mm; display: block; }", ".videos .codigo svg { width: 18mm; height: 18mm; display: block; }"), cita: /28 mm/ },
  { arquivo: "caderno/caderno.css", nome: "caderno.css: marca-texto apagado do comentário",
    txt: o => planta(o, "color: var(--ink); background: var(--marca);", "color: var(--ink);"), cita: /marca-texto/ },
  { arquivo: "caderno/caderno.css", nome: "caderno.css: post-it sem a letra de apoio à dislexia",
    txt: o => planta(o, "rotate(-.4deg); font-family: var(--dislexia);", "rotate(-.4deg); font-family: var(--serif);"), cita: /OpenDyslexic/ },
  { arquivo: "caderno/caderno.css", nome: "caderno.css: Simplificando deixa de ser post-it",
    txt: o => planta(o, "var(--postit) 55%", "#F3F3F3 55%"), cita: /post-it/ },
  { arquivo: "caderno/caderno.css", nome: "caderno.css: volta a cor na tinta",
    txt: o => planta(o, "--accent: #000; --accent-2: #333;", "--accent: #0F4C5C; --accent-2: #333;"), cita: /preto e branco/ },
  /* --- página: os três links de vídeo no painel Comentário ----------------- */
  { arquivo: "app.js", nome: "app: cartão sem os três links de vídeo",
    txt: o => planta(o, "+ fonte + videosHtml(q)", "+ fonte"), cita: /três links de vídeo/ },
  { arquivo: "caderno/caderno.js", nome: "caderno: a página própria da mini-aula repete os QR codes",
    txt: o => planta(o, 'cabecalho(q, numero, "Sobre a matéria"), materiaBloco(q), notas())', 'cabecalho(q, numero, "Sobre a matéria"), materiaBloco(q), videos(q), notas())'), cita: /página própria da mini-aula não pode repetir os QR codes/ },
];

/* `node controles.js <trecho>` roda só os controles cujo nome contém o trecho;
   `node controles.js 1-50` roda a faixa (1-based, inclusiva). Cada controle
   roda o harness inteiro (~8 s com os QR codes do caderno): a lista completa
   leva ~14 min, e em duas faixas cabe em sessões de 10 min. */
const SO = process.argv[2] || "";
const faixa = /^(\d+)-(\d+)$/.exec(SO);
const escolhidos = faixa ? controles.slice(Number(faixa[1]) - 1, Number(faixa[2])) : controles.filter(c => c.nome.includes(SO));
if (!escolhidos.length) { console.log("nenhum controle com " + JSON.stringify(SO)); process.exit(1); }
let falhos = 0;
try {
  for (const c of escolhidos) {
    const arq = c.arquivo || "banco.js";
    let txt;
    try { txt = c.txt(originais[arq]); } catch (e) { console.log(`✗ CONTROLE INVÁLIDO (${e.message.slice(0, 90)}): ${c.nome}`); falhos++; continue; }
    if (txt === originais[arq]) { console.log(`✗ CONTROLE NÃO ALTEROU NADA: ${c.nome}`); falhos++; continue; }
    fs.writeFileSync(path.join(DIR, arq), txt, "utf8");
    const r = roda();
    fs.writeFileSync(path.join(DIR, arq), originais[arq], "utf8");
    const mordeu = !r.ok && c.cita.test(r.saida);
    if (!mordeu) falhos++;
    console.log(`${mordeu ? "✓ mordeu" : "✗ CEGO  "}  ${c.nome}`);
    if (!mordeu) console.log("      saída: " + r.saida.split("\n").filter(l => l.includes("!")).slice(0, 4).join("\n      "));
  }
} finally {
  for (const a of ARQS) fs.writeFileSync(path.join(DIR, a), originais[a], "utf8");
}
const r = roda();
console.log(`\nrestaurado: ${r.ok ? "verde" : "VERMELHO (!!)"} · ${escolhidos.length - falhos}/${escolhidos.length} controles morderam${SO ? ` (filtro ${JSON.stringify(SO)}, de ${controles.length})` : ""}`);
process.exit(falhos || !r.ok ? 1 : 0);
