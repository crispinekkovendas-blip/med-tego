/* ============================================================================
   Conferência do banco TEGO. Roda em Node: `node verificar.js`.

   O que ela prova:
     · a forma: áreas de meta.areas, ESPERADO questões em cada uma, ids em
       sequência, ordem (área → fonte → número), cinco alternativas, gabarito
       0..4, alternativas distintas;
     · a FIDELIDADE: enunciado, cada alternativa e o texto de apoio de toda
       questão estão, palavra por palavra (normalizados), no texto do caderno
       oficial guardado em ferramentas/cadernos/<fonte>.txt; e `correta` é a
       letra do gabarito oficial (<fonte>-gabarito.txt), nunca uma anulada;
     · o conteúdo: comentário (tamanho, abertura, veredito único, as cinco
       letras, fecho), Simplificando (tamanho, letra, frases curtas),
       tema, referências, tags permitidas e equilibradas;
     · a página e o caderno montam num DOM de mentira e mostram o que o banco
       diz (etiquetas, filtros, abas, referências, simulado, fichas, mapa,
       nome do estudante); o CSS do caderno deixa a ficha longa correr.

   O harness prova coerência e fidelidade, não verdade médica: o comentário
   de cada questão é lido por uma pessoa antes de a área ser dada por pronta.
   ========================================================================== */
const fs = require("fs"), path = require("path"), vm = require("vm");
const { normalizar } = require("./ferramentas/normalizar.js");
const AQUI = __dirname;
const falhas = [];
const erro = m => falhas.push(m);
let n = 0;
const exige = (c, m) => { n++; if (!c) erro(m); };

/* quantas questões cada área deve ter: 1 no esboço; a tarefa de conteúdo de
   cada área sobe para o número final dela */
const ESPERADO = { obst: 2 };   /* banco de fumaça da sessão 0; Obstetrícia vai a 50 na sessão 1 */
/* "Sobre a matéria": opcional enquanto a primeira área está sendo escrita;
   vira obrigatória (true) a partir da primeira área completa */
const EXIGE_MATERIA = true;
/* vídeos: as escolhas podem estar incompletas enquanto a camada é preenchida;
   vira obrigatório (true) quando as 250 questões têm os dois vídeos */
const EXIGE_VIDEOS = false;   /* a camada de vídeos do TEGO ainda não foi escolhida (sessão própria) */

/* --- carrega o banco ---------------------------------------------------- */
const src = fs.readFileSync(path.join(AQUI, "banco.js"), "utf8");
const ctx = vm.createContext({ window: {} });
vm.runInContext(src, ctx, { filename: "banco.js" });
const B = ctx.window.BANCO;
exige(B && Array.isArray(B.questoes) && B.meta && Array.isArray(B.meta.areas) && Array.isArray(B.meta.fontes), "banco.js não define window.BANCO com meta.areas, meta.fontes e questoes");
const Q = B.questoes;
const LETRAS = "ABCDE";
const AREAS = B.meta.areas;
const IDS_AREA = AREAS.map(a => a.id);
const FONTES = Object.fromEntries(B.meta.fontes.map(f => [f.id, f]));
const dois = x => String(x).padStart(2, "0");
/* largura e altura reais de um JPEG (marcador SOF) ou PNG (IHDR) */
function dimensoes(b) {
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b.length > 4 && b[0] === 0xFF && b[1] === 0xD8) {
    const SOF = [0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF];
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xFF) { i++; continue; }
      const m = b[i + 1];
      if (m === 0xFF) { i++; continue; }
      if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
      if (SOF.includes(m)) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}
const figurasUsadas = new Set();

/* --- a forma ------------------------------------------------------------ */
exige(AREAS.length >= 1 && new Set(IDS_AREA).size === AREAS.length, "meta.areas vazio ou com id repetido");
exige(AREAS.every(a => a.id && a.nome && a.curto), "toda área precisa de id, nome e curto");
exige(Object.keys(ESPERADO).length === AREAS.length && IDS_AREA.every(id => id in ESPERADO), "ESPERADO no harness não cobre as mesmas áreas de meta.areas");
for (const a of AREAS) {
  const qs = Q.filter(q => q.area === a.id);
  exige(qs.length === ESPERADO[a.id], `esperava ${ESPERADO[a.id]} questões em ${a.id}, há ${qs.length}`);
  qs.forEach((q, i) => exige(q.id === a.id + dois(i + 1), `${q.id}: id fora da sequência (esperava ${a.id}${dois(i + 1)})`));
}
const ordemArea = Q.map(q => IDS_AREA.indexOf(q.area));
exige(ordemArea.every((v, i) => i === 0 || v >= ordemArea[i - 1]), "as questões não estão agrupadas por área na ordem de meta.areas");
const ordemFonte = Object.fromEntries(B.meta.fontes.map((f, i) => [f.id, i]));
for (let i = 1; i < Q.length; i++) {
  const a = Q[i - 1], b = Q[i];
  if (a.area !== b.area) continue;
  exige(ordemFonte[a.fonte] < ordemFonte[b.fonte] || (ordemFonte[a.fonte] === ordemFonte[b.fonte] && a.numero < b.numero), `${b.id}: fora da ordem (fonte, número) dentro da área`);
}

/* --- cadernos e gabaritos das fontes ------------------------------------ */
const cadernoDe = {}, gabaritoDe = {};
for (const f of B.meta.fontes) {
  n++;
  const pc = path.join(AQUI, f.caderno || ""), pg = path.join(AQUI, f.gabarito || "");
  if (!f.caderno || !fs.existsSync(pc)) { erro(`fonte ${f.id}: falta o texto do caderno ${f.caderno}`); continue; }
  if (!f.gabarito || !fs.existsSync(pg)) { erro(`fonte ${f.id}: falta o gabarito ${f.gabarito}`); continue; }
  cadernoDe[f.id] = normalizar(fs.readFileSync(pc, "utf8"));
  gabaritoDe[f.id] = {};
  for (const l of fs.readFileSync(pg, "utf8").trim().split(/\r?\n/)) { const [num, x] = l.trim().split(/\s+/); gabaritoDe[f.id][Number(num)] = x; }
  exige(Object.keys(gabaritoDe[f.id]).length >= 50, `fonte ${f.id}: gabarito com menos de 50 linhas`);
  exige(typeof f.rotulo === "string" && /^TEGO (Ginecologia|Obstetrícia) 20\d\d$/.test(f.rotulo), `fonte ${f.id}: rotulo deve ser "TEGO PROVA ANO" ("${f.rotulo}")`);
  exige(Number.isInteger(f.edicao) && String(f.edicao) === String(f.rotulo).slice(-4), `fonte ${f.id}: edicao não bate com o ano do rotulo`);
  exige(typeof f.txt === "string" && f.txt.length >= 40, `fonte ${f.id}: txt (descrição do documento) curto ou ausente`);
  exige(typeof f.nomeOficial === "string" && f.nomeOficial.length >= 20, `fonte ${f.id}: falta nomeOficial (o nome que a banca dá à prova)`);
}
/* o caderno extraído (quem tem imagem) e as questões com recurso respondido */
const questoesDe = {}, recursosDe = {};
for (const f of B.meta.fontes) {
  const base = path.join(AQUI, String(f.caderno || "").replace(/\.txt$/, ""));
  questoesDe[f.id] = fs.existsSync(base + "-questoes.json") ? Object.fromEntries(JSON.parse(fs.readFileSync(base + "-questoes.json", "utf8")).map(q => [q.numero, q])) : {};
  recursosDe[f.id] = fs.existsSync(base + "-recursos.json") ? JSON.parse(fs.readFileSync(base + "-recursos.json", "utf8")) : {};
  exige(Object.keys(questoesDe[f.id]).length >= 50, `fonte ${f.id}: falta ${base}-questoes.json (extrai_tego.py)`);
  exige(fs.existsSync(base + "-recursos.json"), `fonte ${f.id}: falta ${base}-recursos.json (gabarito_tego.py; fica vazio, a FEBRASGO não publica justificativas)`);
}

/* --- cada questão -------------------------------------------------------- */
const ids = new Set(), vistosFonteNumero = new Set();
const TAGS = ["p", "strong", "em", "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td", "sub", "sup", "br"];
const TAGS_MATERIA = TAGS.concat(["h4", "dl", "dt", "dd", "div", "details", "summary"]);
const PARTES = ["Objetivos de aprendizagem", "Termos-chave", "O essencial", "Ponto clínico", "Resumo", "Verifique o que aprendeu"];
const impressa = m => m.replace(/<details><summary>Resposta<\/summary>([\s\S]*?)<\/details>/g, '<span class="resp"><em>Resposta:</em> $1</span>');
for (const q of Q) {
  exige(!ids.has(q.id), `id repetido: ${q.id}`); ids.add(q.id);
  exige(IDS_AREA.includes(q.area), `${q.id}: área "${q.area}" não está em meta.areas`);
  exige(q.fonte in FONTES, `${q.id}: fonte "${q.fonte}" não está em meta.fontes`);
  const f = FONTES[q.fonte] || {};
  exige(q.edicao === f.edicao, `${q.id}: edicao ${q.edicao} não bate com a da fonte ${q.fonte} (${f.edicao})`);
  exige(Number.isInteger(q.numero) && q.numero >= 1 && q.numero <= 120, `${q.id}: sem número da questão na prova`);
  const chave = q.fonte + "#" + q.numero;
  exige(!vistosFonteNumero.has(chave), `${q.id}: a questão ${q.numero} de ${q.fonte} entrou duas vezes`); vistosFonteNumero.add(chave);
  /* gabarito oficial */
  const g = (gabaritoDe[q.fonte] || {})[q.numero];
  exige(g !== undefined, `${q.id}: a questão ${q.numero} não está no gabarito de ${q.fonte}`);
  exige(g !== "*", `${q.id}: a questão ${q.numero} de ${q.fonte} foi ANULADA pela banca`);
  exige(Number.isInteger(q.correta) && q.correta >= 0 && q.correta <= 4, `${q.id}: gabarito fora de 0..4`);
  if (g && g !== "*") exige(LETRAS[q.correta] === g, `${q.id}: correta diz ${LETRAS[q.correta]}, o gabarito oficial de ${q.fonte} diz ${g}`);
  /* fidelidade ao caderno */
  const cad = cadernoDe[q.fonte];
  if (cad) {
    exige(cad.includes(normalizar(q.enunciado)), `${q.id}: o enunciado não está, palavra por palavra, no caderno ${q.fonte}`);
    (q.alternativas || []).forEach((a, i) => exige(cad.includes(normalizar(a)), `${q.id}: a alternativa ${LETRAS[i]} não está, palavra por palavra, no caderno ${q.fonte}`));
    if (q.texto) for (const trecho of normalizar(q.texto).split(/[.;:|]/).map(s => s.trim()).filter(s => s.length >= 20)) exige(cad.includes(trecho), `${q.id}: trecho do texto de apoio não está no caderno ("${trecho.slice(0, 40)}…")`);
  }
  exige(typeof q.enunciado === "string" && q.enunciado.length >= 20, `${q.id}: enunciado curto ou ausente`);
  /* cinco alternativas (SUS-SP) ou quatro (UNESP, Einstein) — as que a banca deu */
  exige(Array.isArray(q.alternativas) && (q.alternativas.length === 4 || q.alternativas.length === 5), `${q.id}: precisa de 4 ou 5 alternativas (há ${(q.alternativas || []).length})`);
  exige(Number.isInteger(q.correta) && q.correta < (q.alternativas || []).length, `${q.id}: correta ${q.correta} aponta para uma alternativa que a questão não tem (${(q.alternativas || []).length} alternativas)`);
  const vistas = new Set();
  for (const a of q.alternativas || []) {
    const na = normalizar(a);
    exige(na.length > 0, `${q.id}: alternativa vazia`);
    exige(!vistas.has(na), `${q.id}: alternativa repetida "${na.slice(0, 40)}"`); vistas.add(na);
  }
  exige(typeof q.tema === "string" && q.tema.length >= 8 && q.tema.length <= 70, `${q.id}: tema fora de 8–70 caracteres`);
  exige(Array.isArray(q.referencias) && q.referencias.length >= 1 && q.referencias.length <= 3 && q.referencias.every(r => typeof r === "string" && r.length >= 10 && r.length <= 120), `${q.id}: referencias precisa de 1 a 3 entradas de 10–120 caracteres`);
  /* comentário */
  const letra = LETRAS[q.correta];
  exige(typeof q.comentario === "string" && q.comentario.length >= 600, `${q.id}: comentário curto (${(q.comentario || "").length})`);
  const abre = String(q.comentario || "").replace(/<[^>]+>/g, "").trim();
  exige(abre.startsWith(`Questão ${q.numero} (${f.rotulo})`), `${q.id}: o comentário não abre com "Questão ${q.numero} (${f.rotulo})"`);
  const vereditos = [...String(q.comentario || "").matchAll(/[Gg]abarito <strong>([A-E])<\/strong>/g)].map(m => m[1]);
  exige(vereditos.length === 1, `${q.id}: o comentário precisa de exatamente uma frase "Gabarito <strong>X</strong>" (há ${vereditos.length})`);
  exige(vereditos.every(v => v === letra), `${q.id}: o comentário dá o veredito para ${[...new Set(vereditos)].join("/")}, e o gabarito é ${letra}`);
  const letrasDaQuestao = LETRAS.slice(0, (q.alternativas || []).length || 5);
  for (const L of letrasDaQuestao) exige(String(q.comentario || "").includes(`<strong>${L}</strong>`), `${q.id}: o comentário não explica a alternativa ${L} (falta <strong>${L}</strong>)`);
  for (const L of LETRAS.slice(letrasDaQuestao.length)) exige(!String(q.comentario || "").includes(`<strong>${L}</strong>`), `${q.id}: o comentário fala de uma alternativa ${L} que a questão não tem`);
  exige(/O que a banca testa/.test(q.comentario || ""), `${q.id}: o comentário não fecha dizendo "O que a banca testa"`);
  /* Simplificando */
  exige(typeof q.simples === "string" && q.simples.length >= 200, `${q.id}: sem "simples" (ou curto demais)`);
  if (typeof q.simples === "string") {
    const letrasS = [...q.simples.matchAll(/letra <strong>([A-E])<\/strong>/g)].map(m => m[1]);
    exige(letrasS.length >= 1, `${q.id}: o "simples" não diz "a letra <strong>X</strong>"`);
    exige(letrasS.every(v => v === letra), `${q.id}: o "simples" diz letra ${[...new Set(letrasS)].join("/")}, e o gabarito é ${letra}`);
    const frases = q.simples.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().split(/[.!?…]+\s+|[.!?…]+$/).map(s => s.trim()).filter(Boolean);
    const tam = frases.map(s => s.split(/\s+/).filter(w => /[\p{L}\d]/u.test(w)).length);
    const media = tam.reduce((a, b) => a + b, 0) / tam.length;
    exige(media <= 14, `${q.id}: "simples" com frases longas (média ${media.toFixed(1)} palavras por frase)`);
    exige(Math.max(...tam) <= 26, `${q.id}: "simples" tem uma frase de ${Math.max(...tam)} palavras`);
  }
  /* figura: toda questão tem uma; arquivo real em figuras/, tamanho declarado
     igual ao do arquivo, envelope de tamanho, legenda, fonte com licença livre */
  exige(!!q.figura && typeof q.figura === "object", `${q.id}: sem figura`);
  if (q.figura && typeof q.figura === "object") {
    const fg = q.figura;
    exige(fg.src === `figuras/${q.id}.jpg` || fg.src === `figuras/${q.id}.png`, `${q.id}: figura.src deve ser figuras/${q.id}.jpg (é "${fg.src}")`);
    const arq = path.join(AQUI, String(fg.src || ""));
    const existe = /^figuras\/[a-z]+\d\d\.(jpg|png)$/.test(String(fg.src)) && fs.existsSync(arq);
    exige(existe, `${q.id}: o arquivo da figura não existe (${fg.src})`);
    if (existe) {
      const dim = dimensoes(fs.readFileSync(arq));
      exige(!!dim && dim.w === fg.w && dim.h === fg.h, `${q.id}: figura declara ${fg.w}×${fg.h}, o arquivo tem ${dim ? dim.w + "×" + dim.h : "formato desconhecido"}`);
      const kb = Math.round(fs.statSync(arq).size / 1024);
      exige(kb <= 600, `${q.id}: figura pesada (${kb} KB, limite 600)`);
      figurasUsadas.add(path.basename(fg.src));
    }
    exige(Number.isInteger(fg.w) && Number.isInteger(fg.h) && fg.w >= 400 && fg.h >= 300 && fg.w <= 1400 && fg.h <= 1400 && fg.w / fg.h >= 0.5 && fg.w / fg.h <= 3, `${q.id}: figura de ${fg.w}×${fg.h} fora do envelope (400–1400 px, proporção entre 1:2 e 3:1)`);
    exige(typeof fg.legenda === "string" && fg.legenda.length >= 20 && fg.legenda.length <= 320 && !/<[a-z]/i.test(fg.legenda), `${q.id}: legenda da figura fora de 20–320 caracteres (ou com tag)`);
    exige(typeof fg.fonte === "string" && fg.fonte.length >= 10 && fg.fonte.length <= 200 && /Wikimedia Commons/.test(fg.fonte) && /\b(CC0|CC BY|CC BY-SA|Public domain|domínio público)\b/i.test(fg.fonte), `${q.id}: fonte da figura precisa de autor, licença (CC0, CC BY, CC BY-SA ou domínio público) e "Wikimedia Commons"`);
    exige(!/\bNC\b|\bND\b/.test(String(fg.fonte)), `${q.id}: figura com licença NC ou ND não pode entrar`);
    exige(typeof fg.pagina === "string" && fg.pagina.startsWith("https://commons.wikimedia.org/wiki/File:"), `${q.id}: figura.pagina precisa ser a página do arquivo no Commons`);
  }
  /* imagem da banca: exatamente quando o caderno a tem; arquivo real em
     figuras/banca/, tamanho declarado igual ao do arquivo, crédito ao caderno */
  const cadQ = (questoesDe[q.fonte] || {})[q.numero];
  if (cadQ) exige(!!cadQ.imagem === Array.isArray(q.imagemBanca), `${q.id}: o caderno ${cadQ.imagem ? "tem" : "não tem"} imagem nessa questão, e o banco ${q.imagemBanca ? "traz" : "não traz"} imagemBanca`);
  if (q.imagemBanca !== undefined) {
    exige(Array.isArray(q.imagemBanca) && q.imagemBanca.length >= 1 && q.imagemBanca.length <= 8, `${q.id}: imagemBanca precisa ser uma lista de 1 a 8 imagens`);
    for (const im of Array.isArray(q.imagemBanca) ? q.imagemBanca : []) {
      const ok = /^figuras\/banca\/[a-z]+\d{4}[go]-\d{2,3}(-\d)?\.(png|jpg|jpeg)$/.test(String(im.src));   /* <fonte> = tego2025g/o */
      exige(ok, `${q.id}: imagemBanca.src fora do padrão figuras/banca/<fonte>-NN.<ext> ("${im.src}")`);
      const arq = path.join(AQUI, String(im.src || ""));
      const existe = ok && fs.existsSync(arq);
      exige(existe, `${q.id}: o arquivo da imagem da banca não existe (${im.src})`);
      if (existe) { const dim = dimensoes(fs.readFileSync(arq)); exige(!!dim && dim.w === im.w && dim.h === im.h, `${q.id}: imagem da banca declara ${im.w}×${im.h}, o arquivo tem ${dim ? dim.w + "×" + dim.h : "formato desconhecido"}`); }
      exige(im.onde === "enunciado" || im.onde === "alternativas", `${q.id}: imagemBanca.onde precisa ser enunciado ou alternativas`);
      exige(typeof im.credito === "string" && im.credito.startsWith("Imagem da prova") && im.credito.includes(f.nomeOficial || "\u0000") && im.credito.includes("FEBRASGO"), `${q.id}: crédito da imagem da banca precisa dizer "Imagem da prova", o nome oficial da prova e FEBRASGO`);
    }
  }
  /* recursos: o último parágrafo do comentário conta o que a banca respondeu —
     exatamente nas questões em que ela respondeu */
  const temRecurso = String(q.numero) in (recursosDe[q.fonte] || {});
  const paragrafoRecurso = /<p>Nos recursos, a banca/.test(String(q.comentario || ""));
  exige(!temRecurso || paragrafoRecurso, `${q.id}: a banca respondeu recursos nessa questão (${((recursosDe[q.fonte] || {})[q.numero] || {}).veredito}) e o comentário não termina com "Nos recursos, a banca …"`);
  exige(temRecurso || !paragrafoRecurso, `${q.id}: a banca não respondeu recursos nessa questão, e o comentário tem um parágrafo "Nos recursos, a banca"`);
  if (paragrafoRecurso) exige(/<p>Nos recursos, a banca[^<]*(<(strong|em)>[^<]*<\/(strong|em)>[^<]*)*<\/p>\s*$/.test(String(q.comentario || "").trim()), `${q.id}: o parágrafo "Nos recursos, a banca" tem de ser o último do comentário`);
  /* "Sobre a matéria": a mini-aula — seis partes na ordem, contagens,
     tamanho, e nada sobre o item (letras, gabarito, "alternativa") */
  if (EXIGE_MATERIA) exige(typeof q.materia === "string", `${q.id}: sem "materia" (Sobre a matéria)`);
  if (q.materia !== undefined) {
    const m = String(q.materia);
    const H4 = [...m.matchAll(/<h4>([^<]*)<\/h4>/g)].map(x => x[1]);
    exige(H4.join("|") === PARTES.join("|"), `${q.id}: "materia" precisa das seis partes na ordem (${PARTES.join(" · ")}); há: ${H4.join(" · ") || "nenhuma"}`);
    const secao = nome => { const i = m.indexOf(`<h4>${nome}</h4>`); if (i < 0) return ""; const j = H4.indexOf(nome); const fim = j >= 0 && j + 1 < H4.length ? m.indexOf(`<h4>${H4[j + 1]}</h4>`, i + 1) : -1; return m.slice(i, fim < 0 ? undefined : fim); };
    const conta = (s, tag) => (s.match(new RegExp("<" + tag + "(\\s|>)", "g")) || []).length;
    const nObj = conta(secao(PARTES[0]), "li"), nTer = conta(secao(PARTES[1]), "dt"), nEss = conta(secao(PARTES[2]), "p"), nRes = conta(secao(PARTES[4]), "li"), nVer = conta(secao(PARTES[5]), "li");
    exige(nObj >= 3 && nObj <= 4, `${q.id}: "materia" com ${nObj} objetivos (esperava 3–4)`);
    exige(nTer >= 3 && nTer <= 6 && conta(secao(PARTES[1]), "dd") === nTer, `${q.id}: "materia" com ${nTer} termos-chave (esperava 3–6, cada um com <dt> e <dd>)`);
    exige(nEss >= 3 && nEss <= 5, `${q.id}: "materia" com ${nEss} parágrafos em O essencial (esperava 3–5)`);
    exige(/<div class="ponto"><h4>Ponto clínico<\/h4>(<p>(?:(?!<\/p>)[\s\S])*<\/p>){1,2}<\/div>/.test(m) && (m.match(/<div\b/g) || []).length === 1, `${q.id}: "materia" sem a caixa <div class="ponto"> com o Ponto clínico (1–2 parágrafos, o único <div>)`);
    exige(nRes >= 3 && nRes <= 6, `${q.id}: "materia" com ${nRes} itens no Resumo (esperava 3–6)`);
    exige(nVer >= 2 && nVer <= 3 && (secao(PARTES[5]).match(/<details><summary>Resposta<\/summary>[^<]{3,}<\/details>/g) || []).length === nVer, `${q.id}: "materia" com ${nVer} perguntas no Verifique (esperava 2–3, cada uma com <details><summary>Resposta</summary>…</details>)`);
    const texto = m.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    exige(texto.length >= 1800 && texto.length <= 3600, `${q.id}: "materia" com ${texto.length} caracteres de texto (esperava 1.800–3.600)`);
    exige(!/<strong>[A-E]<\/strong>|[Gg]abarito|[Aa]lternativa|Quest[ãa]o \d/.test(m), `${q.id}: "materia" fala do item (letra, gabarito, alternativa ou "Questão N") — é sobre a matéria, não sobre a questão`);
    exige(!/\n/.test(m), `${q.id}: "materia" com quebra de linha (montar.js devia ter tirado)`);
  }
  /* marcação: só as tags permitidas, equilibradas, nada vazado */
  for (const campo of ["enunciado", "comentario", "texto", "simples", "materia"]) {
    const t = q[campo]; if (!t) continue;
    const permitidas = campo === "materia" ? TAGS_MATERIA : TAGS;
    for (const tag of permitidas) {
      if (tag === "br") continue;
      const abreT = (t.match(new RegExp("<" + tag + "(\\s|>)", "g")) || []).length;
      const fechaT = (t.match(new RegExp("</" + tag + ">", "g")) || []).length;
      exige(abreT === fechaT, `${q.id}: <${tag}> desequilibrado em ${campo} (${abreT} abre, ${fechaT} fecha)`);
    }
    const estranhas = [...t.matchAll(/<\/?([a-z][a-z0-9]*)/g)].map(m => m[1]).filter(tg => !permitidas.includes(tg));
    exige(!estranhas.length, `${q.id}: tag não permitida em ${campo}: <${estranhas[0]}>`);
    exige(!/undefined|\[object Object\]|NaN/.test(t), `${q.id}: vazamento em ${campo}`);
  }
}

/* --- figuras: nada solto na pasta, FONTES.md registra todas ---------------- */
{
  const pasta = path.join(AQUI, "figuras");
  const soltos = fs.existsSync(pasta) ? fs.readdirSync(pasta).filter(a => /\.(jpg|png)$/i.test(a) && !figurasUsadas.has(a)) : [];
  exige(!soltos.length, `figuras/ tem arquivo que nenhuma questão usa: ${soltos.slice(0, 3).join(", ")}`);
  const fontesMd = fs.existsSync(path.join(pasta, "FONTES.md")) ? fs.readFileSync(path.join(pasta, "FONTES.md"), "utf8") : "";
  for (const q of Q) if (q.figura && q.figura.src) exige(fontesMd.includes(`| ${q.figura.src} |`), `${q.id}: figuras/FONTES.md não registra ${q.figura.src}`);
  exige(!fontesMd.split("\n").some(l => l.startsWith("| ") && /CC BY-NC|CC BY-ND|-NC\b|-ND\b/.test(l)), "figuras/FONTES.md registra uma licença NC ou ND");
}

/* --- vídeos: videos.json, um por questão, canal da lista, url canônica --- */
{
  const pV = path.join(AQUI, "videos.json");
  exige(fs.existsSync(pV), "falta videos.json (python ferramentas/videos.py gerar)");
  let V = {};
  try { V = JSON.parse(fs.readFileSync(pV, "utf8")); } catch (e) { erro("videos.json não é JSON válido"); }
  const canais = JSON.parse(fs.readFileSync(path.join(AQUI, "ferramentas", "videos", "canais.json"), "utf8"));
  const escolhas = JSON.parse(fs.readFileSync(path.join(AQUI, "ferramentas", "videos", "escolhas.json"), "utf8"));
  const idsV = Object.keys(V);
  exige(idsV.length === Q.length && Q.every(q => V[q.id]), `videos.json tem ${idsV.length} ids, esperava um por questão (${Q.length})`);
  exige(idsV.every(id => Q.some(q => q.id === id)), "videos.json tem id que não é questão nenhuma");
  /* a correção da prova pode apontar para o minuto da questão: &t=…s é a única forma a mais */
  const URL_YT = /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}(&t=\d+s)?$/;
  const faltam = { q: 0, m: 0 };
  for (const q of Q) {
    const v = V[q.id]; if (!v) continue;
    exige(v.fonte === q.fonte && v.numero === q.numero && v.tema === q.tema, `${q.id}: videos.json não bate com a questão (fonte, número, tema)`);
    exige(typeof v.busca === "string" && v.busca.length >= 8 && v.busca.length <= 80, `${q.id}: busca fora de 8–80 caracteres`);
    for (const k of ["q", "m"]) {
      const p = v[k];
      if (p == null) { faltam[k]++; if (EXIGE_VIDEOS) erro(`${q.id}: sem vídeo ${k === "q" ? "da questão" : "da matéria"}`); continue; }
      exige(URL_YT.test(p.url), `${q.id}: url do vídeo ${k} não é https://www.youtube.com/watch?v=<11 caracteres> (${p.url})`);
      exige(!!p.titulo && !!p.canal, `${q.id}: vídeo ${k} sem título ou canal`);
      const forcado = !!(escolhas[q.id] && escolhas[q.id].forcado && escolhas[q.id].forcado[k]);
      exige(forcado || canais.some(c => c.id === p.canalId), `${q.id}: o canal do vídeo ${k} (${p.canal}) não está em canais.json`);
      /* a correção da prova (questão comentada) dura horas por natureza: só o mínimo vale para ela */
      exige(p.duracao >= 240 && (p.comentada === true || p.duracao <= 5400), `${q.id}: vídeo ${k} fora de 4–90 minutos (${p.duracao} s)`);
    }
  }
  console.log(`vídeos: ${Q.length - faltam.q} da questão e ${Q.length - faltam.m} da matéria escolhidos; faltam ${faltam.q} e ${faltam.m}`);
}

/* --- links curtos: v/destino.js redireciona, v/index.html é a página --- */
{
  const pD = path.join(AQUI, "v", "destino.js"), pP = path.join(AQUI, "v", "index.html");
  exige(fs.existsSync(pD) && fs.existsSync(pP), "faltam v/destino.js ou v/index.html");
  try {
    const { destino } = require(pD);
    const V = { cm07: { fonte: "amrigs2025", numero: 7, tema: "Hérnia", busca: "hérnia inguinal — anatomia \"x\"",
      q: { url: "https://www.youtube.com/watch?v=aaaaaaaaaaa", titulo: "t", canal: "c", canalId: "UC1", duracao: 600 }, m: null } };
    exige(JSON.stringify(destino("cm07", "q", V)) === JSON.stringify({ url: "https://www.youtube.com/watch?v=aaaaaaaaaaa" }), "destino(): não devolve a url do vídeo da questão");
    exige(destino("cm07", "m", V).fallback === "sem-video", "destino(): sem vídeo da matéria deveria cair em sem-video");
    const mais = destino("cm07", "mais", V).url || "";
    exige(mais === "https://www.youtube.com/results?search_query=" + encodeURIComponent(V.cm07.busca) && !mais.includes(" ") && !mais.includes("\""), "destino(): a busca não está codificada para a URL do YouTube");
    exige(destino("zz99", "q", V).fallback === "sem-id" && !destino("zz99", "q", V).url, "destino(): um id desconhecido precisa cair em sem-id, nunca numa url");
    exige(destino("CM07", "q", V).url === V.cm07.q.url, "destino(): o id precisa aceitar maiúsculas (scanner)");
    exige(destino("cm07", "x", V).fallback === "escolher" && destino("cm07", undefined, V).fallback === "escolher", "destino(): sem qual (ou qual desconhecido) é a página com os três botões");
    exige(destino("cm07", "q", null).fallback === "sem-id", "destino(): sem videos.json carregado precisa cair em sem-id, não estourar");
    exige(destino("cm07", "flash", V).url === "/#cm07" && destino("cm07", "mapa", V).url === "/#cm07" && destino("cm07", "flash", null).url === "/#cm07", "destino(): flash e mapa abrem a questão no site (/#id) enquanto as ferramentas não existem, mesmo sem videos.json");
    const pick = { ...V, cm07: { ...V.cm07, q: { ...V.cm07.q, url: "https://youtu.be/aaaaaaaaaaa" } } };
    exige(destino("cm07", "q", pick).fallback === "sem-video", "destino(): uma url fora da forma canônica não pode ser destino");
    const comT = { ...V, cm07: { ...V.cm07, q: { ...V.cm07.q, url: "https://www.youtube.com/watch?v=aaaaaaaaaaa&t=18679s" } } };
    exige(destino("cm07", "q", comT).url === "https://www.youtube.com/watch?v=aaaaaaaaaaa&t=18679s", "destino(): a url com o minuto da questão (&t=…s) é destino válido");
  } catch (e) { erro(`v/destino.js estourou: ${e.message}`); }
  const pagina = fs.existsSync(pP) ? fs.readFileSync(pP, "utf8") : "";
  for (const t of ['src="/v/destino.js"', 'fetch("/videos.json"', 'id="botao-mais"', 'id="botao-site"', 'id="botao-inicio"', 'lang="pt-BR"', "Vídeo da questão", "Vídeo da matéria", "Mais vídeos do tema", "Abrir a questão no site"])
    exige(pagina.includes(t), `v/index.html não traz ${t}`);
  exige(!/youtube\.com\/embed|ytimg\.com/.test(pagina), "v/index.html não pode carregar nada do YouTube: só redireciona");
}

/* --- a página de revisão dos vídeos (para o cliente) ----------------------- */
{
  const pR = path.join(AQUI, "videos", "revisao.js"), pH = path.join(AQUI, "videos", "index.html");
  exige(fs.existsSync(pR) && fs.existsSync(pH), "faltam videos/revisao.js ou videos/index.html");
  try {
    const { htmlRevisao } = require(pR);
    const V = JSON.parse(fs.readFileSync(path.join(AQUI, "videos.json"), "utf8"));
    const html = htmlRevisao(V);
    exige(Q.every(q => html.includes(`data-id="${q.id}"`)), "a revisão não lista todas as questões");
    exige((html.match(/class="pick vazio"/g) || []).length === Object.values(V).reduce((s, v) => s + (v.q ? 0 : 1) + (v.m ? 0 : 1), 0), "a revisão não marca cada escolha ausente como vazia");
    const comQ = Object.entries(V).find(([, v]) => v.q);
    if (comQ) exige(html.includes(`https://i.ytimg.com/vi/${(/v=([A-Za-z0-9_-]{11})/.exec(comQ[1].q.url) || [])[1]}/mqdefault.jpg`) && html.includes(comQ[1].q.titulo), "a revisão não mostra miniatura e título da escolha");
    /* com uma escolha de mentira, a miniatura, o título, o canal e a duração aparecem */
    const V2 = { [Q[0].id]: Object.assign({}, V[Q[0].id], { q: { url: "https://www.youtube.com/watch?v=aaaaaaaaaaa", titulo: "Título <x>", canal: "Canal & Cia", canalId: "UC1", duracao: 662 }, m: null }) };
    const h2 = htmlRevisao(V2);
    const V3 = { [Q[0].id]: Object.assign({}, V[Q[0].id], { q: { url: "https://www.youtube.com/watch?v=aaaaaaaaaaa&t=120s", titulo: "Correção", canal: "Ceisc", canalId: "UCc", duracao: 5000, comentada: true }, m: null }) };
    exige(htmlRevisao(V3).includes("questão comentada") && htmlRevisao(V3).includes("https://i.ytimg.com/vi/aaaaaaaaaaa/mqdefault.jpg"), "a revisão precisa marcar a escolha que é a correção da prova (questão comentada) e achar a miniatura mesmo com &t=");
    exige(h2.includes("https://i.ytimg.com/vi/aaaaaaaaaaa/mqdefault.jpg") && h2.includes("Título &lt;x&gt;") && h2.includes("Canal &amp; Cia") && h2.includes("11:02") && h2.includes("1 vídeos da questão · 0 da matéria"), "a revisão não mostra miniatura, título (escapado), canal, duração mm:ss e a contagem");
    exige(html.includes('class="contagem"') && html.includes(`href="/v/${Q[0].id}/mais"`), "a revisão precisa da contagem e do link Mais vídeos de cada questão");
    const pagina = fs.readFileSync(pH, "utf8");
    exige(pagina.includes('src="/videos/revisao.js"') && pagina.includes('fetch("/videos.json"') && pagina.includes('lang="pt-BR"'), "videos/index.html não carrega revisao.js e videos.json");
  } catch (e) { erro(`videos/revisao.js estourou: ${e.message}`); }
}

/* --- bytes de controle nos arquivos ------------------------------------- */
for (const arq of ["banco.js", "app.js", "app.css", "index.html", "caderno/caderno.js", "caderno/caderno.css", "caderno/index.html"]) {
  n++;
  const p = path.join(AQUI, arq);
  if (!fs.existsSync(p)) { erro(`falta ${arq}`); continue; }
  const t = fs.readFileSync(p, "utf8");
  let maus = 0;
  for (let i = 0; i < t.length; i++) { const c = t.charCodeAt(i); if (c < 32 && c !== 9 && c !== 10 && c !== 13) maus++; }
  if (maus) erro(`${arq}: ${maus} byte(s) de controle`);
}

/* --- o CSS do caderno deixa a ficha longa correr para a página seguinte --- */
{
  n++;
  const css = fs.readFileSync(path.join(AQUI, "caderno", "caderno.css"), "utf8");
  /* sem os comentários: um comentário com vírgula antes da regra virava o "seletor" e escondia .questao */
  const regras = [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^}]*)\}/g)].map(m => ({ sel: m[1].split(",").map(s => s.trim()), corpo: m[2] }));
  const proibido = regras.filter(r => (r.sel.includes(".questao") || r.sel.includes(".comentario")) && /overflow:\s*hidden|break-inside:\s*avoid|page-break-inside:\s*avoid/.test(r.corpo));
  exige(!proibido.length, "caderno.css: .questao e .comentario não podem ter overflow: hidden nem break-inside: avoid (a ficha longa precisa correr para a página seguinte)");
  exige(/--pagina:\s*256mm/.test(css), "caderno.css: --pagina deve ser 256mm");
  exige(/@page\s*\{[\s\S]*?@bottom-right\s*\{[^}]*counter\(page\)[^}]*counter\(pages\)/.test(css), "caderno.css: @page precisa da caixa @bottom-right com \"Página X de Y\" (counter(page) e counter(pages))");
  exige(/@top-right\s*\{[^}]*content:/.test(css) && /@bottom-left\s*\{[^}]*content:/.test(css), "caderno.css: @page precisa das caixas @top-right (caderno · banca) e @bottom-left (site) — o cabeçalho e o rodapé corridos");
  exige(/\.videos \.codigo svg\s*\{[^}]*width:\s*28mm/.test(css), "caderno.css precisa dimensionar o QR code em 28 mm (.videos .codigo svg)");
  exige(/qrcode\(0, "H"\)[^\n]*margin: 4/.test(fs.readFileSync(path.join(AQUI, "caderno", "caderno.js"), "utf8")), "caderno.js: o QR code precisa do nível H de correção e da margem de 4 módulos (impressão ruim)");
  exige(!/--accent:\s*#(?!000\b|[0-9A-Fa-f]*$)/.test(css) && /--accent:\s*#000;/.test(css) && /--obst:\s*#000;/.test(css) && /--ok:\s*#000;/.test(css), "caderno.css: o caderno impresso é preto e branco (tokens --accent, --obst, --ok em #000)");
  exige(/\.texto-comentario strong\s*\{[^}]*background:\s*var\(--marca\)/.test(css) && /\.materia dt\s*\{[^}]*var\(--marca-2\)/.test(css), "caderno.css: os destaques do comentário e os termos da matéria saem a marca-texto (--marca, --marca-2)");
  exige(/\.simples\s*\{[^}]*var\(--postit\)[^}]*box-shadow/.test(css) && /\.materia \.ponto\s*\{[^}]*var\(--postit-2\)/.test(css), "caderno.css: o Simplificando é um post-it amarelo e o Ponto clínico um post-it azul (--postit, --postit-2)");
  for (const f of ["OpenDyslexic-Regular.otf", "OpenDyslexic-Bold.otf", "OpenDyslexic-Italic.otf", "OpenDyslexic-BoldItalic.otf", "OFL.txt"]) exige(fs.existsSync(path.join(AQUI, "caderno", "fontes", f)), `falta caderno/fontes/${f} (OpenDyslexic vendorizada com a licença)`);
  exige((css.match(/@font-face\s*\{[^}]*"OpenDyslexic"[^}]*fontes\/OpenDyslexic-[A-Za-z]+\.otf/g) || []).length === 4 && /\.simples\s*\{[^}]*var\(--dislexia\)/.test(css) && /\.materia \.ponto\s*\{[^}]*var\(--dislexia\)/.test(css), "caderno.css: os post-its usam a OpenDyslexic (quatro @font-face em fontes/, token --dislexia no .simples e no .materia .ponto)");
  /* revisão final: a pauta não conta como conteúdo, a medida é feita na
     geometria da folha e refeita antes de imprimir; Letra grande chega à
     ficha; no celular os filtros quebram linha em vez de sumir */
  exige(/\.medindo \.pagina\s*\{[^}]*width:\s*210mm/.test(css), "caderno.css: falta .medindo .pagina { width: 210mm … } (a medida das fichas precisa da geometria da folha, não da tela)");
  for (const sel of [".enunciado", ".alts", ".texto-comentario", ".simples", ".materia"]) exige(new RegExp("\\.letra-grande " + sel.replace(".", "\\.") + "\\s*\\{[^}]*font-size").test(css), `caderno.css: a opção Letra grande não chega à ficha (falta .letra-grande ${sel})`);
  const cjs = fs.readFileSync(path.join(AQUI, "caderno", "caderno.js"), "utf8");
  exige(/"beforeprint"/.test(cjs), "caderno.js: a medida das fichas precisa ser refeita antes de imprimir (beforeprint)");
  const acss = fs.readFileSync(path.join(AQUI, "app.css"), "utf8");
  const ini = acss.indexOf("@media (max-width: 720px)");
  let prof = 0, fim = -1;
  for (let i = acss.indexOf("{", ini); i < acss.length; i++) { if (acss[i] === "{") prof++; else if (acss[i] === "}") { prof--; if (!prof) { fim = i; break; } } }
  const estreitas = ini >= 0 && fim > ini ? acss.slice(ini, fim) : "";
  exige(/\.seg\s*\{[^}]*flex-wrap:\s*wrap/.test(estreitas), "app.css: nas telas estreitas .seg precisa de flex-wrap: wrap (os filtros de GO e das edições ficam cortados no celular)");
  /* fluxo corrido: a ficha tem a altura do conteúdo, a seguinte começa logo depois, nada fica em branco */
  exige(!/\.questao\s*\{[^}]*min-height/.test(css) && !/\.questao\.(dupla|tripla)/.test(css), "caderno.css: fluxo corrido — a ficha não pode ter min-height nem as classes dupla/tripla (uma ficha curta deixaria o resto da página em branco)");
  exige(!/classList\.add\("(dupla|tripla)"\)/.test(fs.readFileSync(path.join(AQUI, "caderno", "caderno.js"), "utf8")), "caderno.js: não pode marcar fichas como dupla/tripla (fluxo corrido)");
  exige(/\.questao\s*\{[^}]*margin:\s*0 0 6mm;[^}]*break-after:\s*auto/.test(css), "caderno.css: no impresso a ficha seguinte começa logo depois da anterior (.questao { margin: 0 0 6mm; break-after: auto } no @media print)");
  exige(/\.questao > header\s*\{[^}]*break-after:\s*avoid/.test(css), "caderno.css: o cabeçalho da ficha não pode ficar órfão no fim da página (.questao > header { break-after: avoid })");
  /* figuras: altura limitada na ficha, medida refeita quando as imagens
     carregam, e a versão ampliada da página cobre a tela */
  exige(/\.figura img\s*\{[^}]*max-height:\s*\d+mm/.test(css), "caderno.css: a figura da ficha precisa de max-height em mm (uma foto alta comeria a página)");
  exige(/"load"/.test(cjs), "caderno.js: a medida das fichas precisa ser refeita depois que as imagens carregam (evento load)");
  exige(/\.ampliar\s*\{[^}]*position:\s*fixed/.test(acss), "app.css: falta .ampliar { position: fixed … } (a figura ampliada precisa cobrir a tela)");
  /* Sobre a matéria: ficha de três páginas, caixa do Ponto clínico nos dois CSS */
  exige(/\.notas \.linhas\s*\{[^}]*min-height:\s*50mm/.test(css), "caderno.css: a pauta de anotações (.notas .linhas) precisa de 50 mm fixos (no fluxo corrido ela não cresce até o fim da página)");;
  exige(/\.notas \.termos\s*\{[^}]*height:\s*40mm/.test(css), "caderno.css: o quadro dos termos-chave (.notas .termos) precisa de 40 mm fixos");
  exige(/pauta: "quadriculado"/.test(cjs), "caderno.js: a pauta padrão precisa ser a quadriculada");
  exige(/\.notas\.quadriculado \.linhas[^{]*\{[^}]*background-size:\s*5mm 5mm/.test(css), "caderno.css: a pauta quadriculada (.notas.quadriculado .linhas) precisa do quadriculado de 5 mm");
  exige(/\.materia \.ponto\s*\{/.test(css) && /\.comentario\.materia \.ponto\s*\{/.test(acss), "falta o estilo da caixa Ponto clínico (.materia .ponto no caderno.css, .comentario.materia .ponto no app.css)");
  /* TEGO: a 1ª fase exige 60% em cada prova (nota 6,00) para a 2ª fase — a página e o caderno dizem isso */
  const ajs = fs.readFileSync(path.join(AQUI, "app.js"), "utf8");
  exige(/de acertos em cada prova/.test(ajs) && /de acertos em cada prova/.test(cjs), "app.js e caderno.js precisam dizer que a FEBRASGO exige 60% de acertos em cada prova");
  exige(!/habilita/i.test(ajs) && !/habilita/i.test(cjs), "app.js/caderno.js ainda dizem que a prova 'habilita' alguém (vocabulário do SUS-SP)");
  exige(/\.banca img\s*\{[^}]*max-height/.test(acss) && /\.banca img\s*\{[^}]*max-height:\s*\d+mm/.test(css), "falta o limite de altura da imagem da banca (.banca img) em app.css (vh) e caderno.css (mm)");
  /* a sigla do cabeçalho (TEGO) cresce com o texto, não é um quadrado fixo (herança do AMRIGS, seis letras) */
  const sigla = (acss.match(/#barra \.sigla\s*\{([^}]*)\}/) || [])[1] || "";
  exige(/min-width:\s*34px/.test(sigla) && /padding:\s*0 \d+px/.test(sigla) && !/(^|[^-])width:\s*34px/.test(sigla), "app.css: a sigla do cabeçalho precisa de min-width + padding, não de width fixa (a palavra sai cortada)");
}

/* --- um DOM de mentira ---------------------------------------------------- */
function domDeMentira() {
  const mk = tag => {
    const el = {
      tagName: String(tag).toUpperCase(), children: [], attrs: {}, listeners: {}, _html: "", _text: "",
      style: {}, dataset: {}, disabled: false, hidden: false, parentNode: null,
      get className() { return el.attrs["class"] || ""; }, set className(v) { el.attrs["class"] = v; },
      get id() { return el.attrs["id"] || ""; },
      set innerHTML(v) { el._html = v; el.children = []; }, get innerHTML() { return el._html; },
      set textContent(v) { el._text = String(v); el.children = []; }, get textContent() { return el._text || el.children.map(c => c.textContent).join(""); },
      setAttribute(k, v) { el.attrs[k] = v; }, getAttribute(k) { return el.attrs[k] == null ? null : el.attrs[k]; },
      addEventListener(k, f) { (el.listeners[k] = el.listeners[k] || []).push(f); },
      append(...xs) { for (const x of xs) { const c = typeof x === "object" ? x : { nodeType: 3, textContent: String(x), tagName: "#text", children: [] }; c.parentNode = el; el.children.push(c); } },
      replaceWith(novo) { const p = el.parentNode; if (!p) return; const i = p.children.indexOf(el); if (i >= 0) { p.children[i] = novo; novo.parentNode = p; el.parentNode = null; } },
      remove() { const p = el.parentNode; if (!p) return; const i = p.children.indexOf(el); if (i >= 0) p.children.splice(i, 1); el.parentNode = null; },
      closest() { return null; }, scrollIntoView() {},
      querySelector(sel) { return busca(el, sel)[0] || null; }, querySelectorAll(sel) { return busca(el, sel); },
      nodeType: 1,
    };
    return el;
  };
  function busca(raiz, sel) {
    const out = [];
    const cls = sel.startsWith(".") ? sel.slice(1) : null;
    const id = sel.startsWith("#") ? sel.slice(1) : null;
    (function anda(e) {
      for (const c of e.children || []) {
        if (c.nodeType !== 1) continue;
        if ((cls && (c.className || "").split(/\s+/).includes(cls)) || (id && c.id === id) || (!cls && !id && c.tagName === sel.toUpperCase())) out.push(c);
        anda(c);
      }
    })(raiz);
    return out;
  }
  const app = mk("div"); app.attrs.id = "app";
  const body = mk("body"); body.append(app);
  const document = {
    createElement: mk, createTextNode: t => ({ nodeType: 3, textContent: String(t), tagName: "#text", children: [] }),
    getElementById: id => id === "app" ? app : busca(body, "#" + id)[0] || null,
    body, listeners: {},
    addEventListener(k, f) { (document.listeners[k] = document.listeners[k] || []).push(f); },
    removeEventListener(k, f) { document.listeners[k] = (document.listeners[k] || []).filter(x => x !== f); },
    querySelector: s => busca(body, s)[0] || null, querySelectorAll: s => busca(body, s),
  };
  const armazem = {};
  const window = {
    document, localStorage: { getItem: k => armazem[k] == null ? null : armazem[k], setItem: (k, v) => { armazem[k] = String(v); }, removeItem: k => { delete armazem[k]; } },
    scrollTo() {}, confirm: () => true, setTimeout: f => { f(); return 1; }, setInterval: () => 1, clearInterval() {},
    location: { hash: "", pathname: "/", search: "" }, listeners: {},
    addEventListener(k, f) { (window.listeners[k] = window.listeners[k] || []).push(f); },
    Date, Math, JSON, Object, Array, Number, String, Boolean, RegExp, console, URLSearchParams,
  };
  window.window = window;
  return { window, document, app };
}
const contexto = window => vm.createContext(Object.assign({}, window, { window, document: window.document, setTimeout: window.setTimeout, setInterval: window.setInterval, clearInterval: window.clearInterval, localStorage: window.localStorage, confirm: window.confirm }));
const todos = (el, sel) => el.querySelectorAll(sel);

/* --- a página monta ------------------------------------------------------- */
{
  n++;
  const { window, app } = domDeMentira();
  const c = contexto(window);
  try {
    vm.runInContext(src, c, { filename: "banco.js" });
    vm.runInContext(fs.readFileSync(path.join(AQUI, "app.js"), "utf8"), c, { filename: "app.js" });
    const cartoes = todos(app, ".q");
    exige(cartoes.length === Q.length, `a página montou ${cartoes.length} cartões, esperava ${Q.length}`);
    const alts = todos(app, ".alt");
    const totalAlts = Q.reduce((s, q) => s + q.alternativas.length, 0);
    exige(alts.length === totalAlts, `a página montou ${alts.length} alternativas, esperava ${totalAlts}`);
    exige(todos(app, ".comentario").length === 0, "comentário visível antes de responder");
    /* etiqueta "ROTULO · Questão NN" e tag da área vinda de meta.areas */
    cartoes.forEach((cel, i) => {
      const q = Q[i], e = (cel.querySelector(".origem") || {}).textContent || "";
      const esperado = `${FONTES[q.fonte].rotulo} · Questão ${dois(q.numero)}`;
      n++; if (e !== esperado) erro(`${q.id}: etiqueta "${e}", esperava "${esperado}"`);
      const t = cel.querySelector(".tag");
      n++; if (!(t && t.className.split(/\s+/).includes(q.area) && t.textContent === AREAS.find(a => a.id === q.area).nome)) erro(`${q.id}: a tag de área do cartão não traz a classe e o nome da área de meta.areas`);
    });
    /* filtros: Todas + uma por área + uma por edição com questões */
    const botoes = todos(app, ".seg").flatMap(s => todos(s, "button"));
    const rotulos = botoes.map(b => b.textContent);
    const fontesComQ = B.meta.fontes.filter(f => Q.some(q => q.fonte === f.id));
    exige(botoes.length === 1 + AREAS.length + fontesComQ.length, `há ${botoes.length} botões de filtro, esperava ${1 + AREAS.length + fontesComQ.length} (Todas + áreas + edições com questões)`);
    for (const a of AREAS) exige(rotulos.some(r => r.startsWith(a.nome) && r.endsWith(String(Q.filter(q => q.area === a.id).length))), `falta o filtro "${a.nome}" com a contagem certa`);
    for (const f of fontesComQ) exige(rotulos.some(r => r.startsWith(f.rotulo)), `falta o filtro da edição "${f.rotulo}"`);
    exige(!B.meta.fontes.some(f => !fontesComQ.includes(f) && rotulos.some(r => r.startsWith(f.rotulo))), "há filtro de edição sem questão nenhuma");
    /* responder grava, corrige e abre as abas */
    (alts[0].listeners.click || []).forEach(fn => fn());
    exige(JSON.parse(window.localStorage.getItem("tego:respostas") || "{}")[Q[0].id] === 0, "responder não gravou em tego:respostas");
    exige(window.localStorage.getItem("inepam:respostas") === null && window.localStorage.getItem("inepam:aba") === null, "a página gravou numa chave do banco INEPAM");
    exige(window.localStorage.getItem("susp:respostas") === null, "a página gravou numa chave do banco SUS-SP");
    const c1 = todos(app, ".q")[0];
    exige(c1 && c1.querySelector(".veredito"), "o cartão respondido não foi trocado pelo cartão corrigido");
    const abas = c1 ? todos(c1, ".aba") : [];
    const nAbas = Q[0].materia ? 3 : 2;
    exige(abas.length === nAbas, `o cartão respondido tem ${abas.length} abas, esperava ${nAbas}`);
    const pc = c1 && todos(c1, ".comentario").find(e => !e.className.includes("simples"));
    const ps = c1 && c1.querySelector(".simples");
    exige(pc && ps && pc.hidden === false && ps.hidden === true, "a aba Comentário não é a visível de início");
    exige(pc && pc.innerHTML.startsWith(Q[0].comentario), "o painel Comentário não mostra o comentário");
    exige(pc && pc.innerHTML.includes('class="referencias"') && Q[0].referencias.every(r => pc.innerHTML.includes(r)), "o painel Comentário não traz a linha de referências");
    /* a figura: dentro do painel, com tamanho, legenda e crédito; o clique amplia; Esc fecha */
    if (Q[0].figura) {
      const fg = Q[0].figura;
      exige(pc && pc.innerHTML.includes('<figure class="figura">') && pc.innerHTML.includes(`src="${fg.src}"`) && pc.innerHTML.includes(fg.legenda) && pc.innerHTML.includes(fg.pagina), "o painel Comentário não traz a figura (imagem + legenda + crédito com link)");
      exige(pc && pc.innerHTML.includes(`width="${fg.w}" height="${fg.h}"`), "a imagem do comentário sai sem width/height (a página pularia quando ela carrega)");
      exige(pc && pc.innerHTML.indexOf('<figure class="figura">') < pc.innerHTML.indexOf('class="referencias"'), "a figura precisa vir antes das referências");
      ((pc && pc.listeners.click) || []).forEach(fn => fn({ target: { tagName: "IMG" } }));
      const amp = window.document.querySelector(".ampliar");
      exige(!!amp && !!amp.querySelector("img") && amp.querySelector("img").attrs.src === fg.src && amp.innerHTML.concat(amp.textContent, (amp.querySelector("figcaption") || {}).innerHTML || "").includes(fg.legenda), "clicar na imagem não abre a figura ampliada (.ampliar com a imagem e a legenda)");
      (window.document.listeners.keydown || []).slice().forEach(fn => fn({ key: "Escape" }));
      exige(!window.document.querySelector(".ampliar"), "Esc não fecha a figura ampliada");
    }
    /* os três links de vídeo (links curtos do site) fecham o painel Comentário */
    const baseV = `https://${B.meta.site}/v/${Q[0].id}/`;
    exige(pc && ["q", "m", "mais"].every(k => pc.innerHTML.includes(`class="video" href="${baseV}${k}" target="_blank" rel="noopener"`)) && pc.innerHTML.includes('class="videos"'), "o painel Comentário não traz os três links de vídeo (a.video com os links curtos /v/<id>/q|m|mais)");
    exige(pc && pc.innerHTML.indexOf('class="videos"') > pc.innerHTML.indexOf('class="fonte"'), "os links de vídeo precisam vir depois da linha de fonte");
    /* a imagem da banca: no cartão, entre o enunciado e as alternativas, com
       crédito; clicar amplia */
    const comBanca = Q.map((q, i) => [q, i]).filter(([q]) => q.imagemBanca);
    exige(todos(app, ".banca").length === comBanca.reduce((s, [q]) => s + q.imagemBanca.length, 0), `a página montou ${todos(app, ".banca").length} figuras da banca, esperava ${comBanca.reduce((s, [q]) => s + q.imagemBanca.length, 0)}`);
    for (const [q, i] of comBanca) {
      const cel = todos(app, ".q")[i], figs = cel ? todos(cel, ".banca") : [];
      n++; if (figs.length !== q.imagemBanca.length) { erro(`${q.id}: a página não traz a imagem da banca (${figs.length} de ${q.imagemBanca.length})`); continue; }
      figs.forEach((fg, k) => {
        const im = q.imagemBanca[k], img = fg.querySelector("img");
        exige(!!img && img.attrs.src === im.src && String(img.attrs.width) === String(im.w) && String(img.attrs.height) === String(im.h), `${q.id}: a imagem da banca sai sem src/width/height certos`);
        exige((fg.querySelector("figcaption") || {}).textContent === im.credito, `${q.id}: a imagem da banca sai sem o crédito`);
      });
      const filhos = cel.children.map(c => String(c.className || "").split(" ")[0]);
      exige(filhos.indexOf("banca") > filhos.indexOf("enunciado") && filhos.indexOf("banca") < filhos.indexOf("alts"), `${q.id}: a imagem da banca precisa ficar entre o enunciado e as alternativas`);
      (figs[0].listeners.click || []).forEach(fn => fn({ target: { tagName: "IMG" } }));
      const amp = window.document.querySelector(".ampliar");
      exige(!!amp && !!amp.querySelector("img") && amp.querySelector("img").attrs.src === q.imagemBanca[0].src, `${q.id}: clicar na imagem da banca não abre a versão ampliada`);
      (window.document.listeners.keydown || []).slice().forEach(fn => fn({ key: "Escape" }));
    }
    if (abas.length >= 2) (abas[1].listeners.click || []).forEach(fn => fn());
    exige(ps && ps.hidden === false && pc.hidden === true, "clicar em Simplificando não trocou o painel");
    exige(window.localStorage.getItem("tego:aba") === "simples", "a aba escolhida não foi guardada em tego:aba");
    exige(ps && ps.innerHTML === Q[0].simples, "o painel Simplificando não mostra o texto da questão");
    if (Q.length > 1) {
      const alts2 = todos(todos(app, ".q")[1], ".alt");
      (alts2[1].listeners.click || []).forEach(fn => fn());
      const ps2 = todos(app, ".q")[1].querySelector(".simples");
      exige(ps2 && ps2.hidden === false, "o segundo cartão não abriu na aba guardada (Simplificando)");
    }
    /* a terceira aba, "Sobre a matéria": troca o painel, fica guardada, e o
       próximo cartão com mini-aula abre nela; um cartão sem ela abre no Comentário */
    if (Q[0].materia && abas.length === 3) {
      exige(abas[2].textContent === "Sobre a matéria", `a terceira aba se chama "${abas[2].textContent}", esperava "Sobre a matéria"`);
      (abas[2].listeners.click || []).forEach(fn => fn());
      const pm = c1.querySelector(".materia");
      exige(pm && pm.hidden === false && ps.hidden === true && pc.hidden === true, "clicar em Sobre a matéria não trocou o painel");
      exige(window.localStorage.getItem("tego:aba") === "materia", "a aba Sobre a matéria não foi guardada em tego:aba");
      exige(pm && pm.innerHTML === Q[0].materia, "o painel Sobre a matéria não mostra a mini-aula da questão");
      const k = Q.findIndex((q, i) => i >= 2 && q.materia), s = Q.findIndex((q, i) => i >= 2 && !q.materia);
      if (k >= 0) {
        (todos(todos(app, ".q")[k], ".alt")[0].listeners.click || []).forEach(fn => fn());
        const pmk = todos(app, ".q")[k].querySelector(".materia");
        exige(pmk && pmk.hidden === false, "um cartão respondido depois não abriu na aba guardada (Sobre a matéria)");
      }
      if (s >= 0) {
        (todos(todos(app, ".q")[s], ".alt")[0].listeners.click || []).forEach(fn => fn());
        const cs = todos(app, ".q")[s], pcs = todos(cs, ".comentario").find(e => !e.className.includes("simples") && !e.className.includes("materia"));
        exige(todos(cs, ".aba").length === 2 && pcs && pcs.hidden === false, "um cartão sem Sobre a matéria não abriu no Comentário");
      }
    }
    /* filtro por área */
    const a0 = AREAS[0];
    const bArea = botoes.find(b => b.textContent.startsWith(a0.nome));
    if (bArea) (bArea.listeners.click || []).forEach(fn => fn());
    const soArea = todos(app, ".q");
    exige(bArea && soArea.length === Q.filter(q => q.area === a0.id).length && soArea.every(cel => Q.find(q => q.id === cel.attrs["data-id"]).area === a0.id), `o filtro "${a0.nome}" mostrou ${soArea.length} cartões`);
    exige(window.localStorage.getItem("tego:filtro") === JSON.stringify(a0.id), "o filtro escolhido não foi guardado em tego:filtro");
    /* filtro por edição */
    const f0 = fontesComQ[0];
    const bFonte = todos(app, ".seg").flatMap(s => todos(s, "button")).find(b => b.textContent.startsWith(f0.rotulo));
    if (bFonte) (bFonte.listeners.click || []).forEach(fn => fn());
    exige(bFonte && todos(app, ".q").length === Q.filter(q => q.fonte === f0.id).length, `o filtro "${f0.rotulo}" mostrou ${todos(app, ".q").length} cartões`);
    /* link direto #<id>: abre com todas as questões, marca e rola até o cartão */
    {
      const alvo = Q[Math.min(7, Q.length - 1)];
      const { window: w2, app: app2 } = domDeMentira();
      w2.location.hash = "#" + alvo.id.toUpperCase();
      w2.localStorage.setItem("tego:filtro", JSON.stringify(AREAS[AREAS.length - 1].id));
      const c2 = contexto(w2);
      vm.runInContext(src, c2, { filename: "banco.js" });
      vm.runInContext(fs.readFileSync(path.join(AQUI, "app.js"), "utf8"), c2, { filename: "app.js" });
      const cartao = todos(app2, ".q").find(x => x.attrs["data-id"] === alvo.id);
      exige(todos(app2, ".q").length === Q.length, "com #<id> na URL a página precisa mostrar todas as questões (o filtro guardado não pode esconder o alvo)");
      exige(!!cartao && cartao.className.split(/\s+/).includes("alvo"), `com #${alvo.id} na URL o cartão ${alvo.id} não ganhou a classe alvo`);
      exige(w2.localStorage.getItem("tego:filtro") === JSON.stringify("todas"), "o link direto não voltou o filtro guardado para todas");
    }
    /* capa e rodapé contam a partir dos dados */
    const lead = app.querySelector(".lead");
    exige(lead && lead.innerHTML.includes(`${Q.length} questões`), "a capa não conta as questões a partir dos dados");
    exige(todos(app, ".fontes").flatMap(u => todos(u, "li")).length === B.meta.fontes.length, "o rodapé não lista as fontes");
    /* simulado: min(5, n) de cada área */
    const bSim = todos(app, "button").find(b => b.textContent.startsWith("Simulado"));
    exige(!!bSim, "não há o botão do simulado");
    if (bSim) {
      (bSim.listeners.click || []).forEach(fn => fn());
      const sim = JSON.parse(window.localStorage.getItem("tego:simulado") || "null");
      const esperadoSim = AREAS.reduce((s, a) => s + Math.min(5, Q.filter(q => q.area === a.id).length), 0);
      exige(sim && sim.ids.length === esperadoSim, `o simulado sorteou ${sim && sim.ids.length} questões, esperava ${esperadoSim}`);
      for (const a of AREAS) { const nA = Math.min(5, Q.filter(q => q.area === a.id).length); exige(sim && sim.ids.filter(id => Q.find(q => q.id === id).area === a.id).length === nA, `o simulado não sorteou ${nA} de ${a.nome}`); }
      exige(todos(app, ".q").length === esperadoSim, "a página do simulado não montou os cartões sorteados");
      exige(!!app.querySelector(".relogio"), "o simulado não tem relógio");
    }
  } catch (e) { erro(`app.js estourou no DOM de mentira: ${e.message}`); }
}

/* --- o caderno para imprimir monta ---------------------------------------- */
{
  n++;
  const montar = opcoes => {
    const { window, app } = domDeMentira();
    if (opcoes) window.localStorage.setItem("tego:caderno", JSON.stringify(opcoes));
    const c = contexto(window);
    vm.runInContext(src, c, { filename: "banco.js" });
    vm.runInContext(fs.readFileSync(path.join(AQUI, "caderno", "qrcode.js"), "utf8"), c, { filename: "qrcode.js" });
    vm.runInContext(fs.readFileSync(path.join(AQUI, "caderno", "caderno.js"), "utf8"), c, { filename: "caderno.js" });
    return app;
  };
  try {
    for (const arq of ["caderno/index.html", "caderno/caderno.css"]) exige(fs.existsSync(path.join(AQUI, arq)), `falta ${arq}`);
    let app = montar(null);
    const todasFichas = todos(app, ".questao");
    const qs = todasFichas.filter(f => !f.className.includes("materia-pagina")), paginasM = todasFichas.filter(f => f.className.includes("materia-pagina"));
    exige(qs.length === Q.length, `o caderno padrão montou ${qs.length} fichas, esperava ${Q.length}`);
    /* o painel: a linha "PDF pronto" traz um link por área, com o nome da área, e o
       Completo — nada de URL crua nem vírgula (filhos aninhados em h() pedem flat(Infinity)) */
    const pdfs = app.querySelector(".pdfs");
    const linksPdf = pdfs ? todos(pdfs, "a") : [];
    exige(!!pdfs && linksPdf.length === AREAS.length && AREAS.every((a, i) => linksPdf[i].textContent === a.nome && linksPdf[i].attrs.href === `../pdf/caderno-${a.id}.pdf`) && !/Completo|completo/.test(pdfs.textContent), 'a linha "PDF pronto" do painel não traz um link com o nome de cada área mais o Completo');
    exige(!!pdfs && !/\.pdf|http|object/.test(pdfs.textContent), 'a linha "PDF pronto" do painel vaza texto cru (URL ou objeto): filhos aninhados sem flat(Infinity)');
    exige(!!todos(app, "a").find(a => a.attrs.href === "../videos/" && a.textContent.includes("revisão")), "o painel do caderno não tem o link para a página de revisão dos vídeos");
    const seqAreas = qs.map(f => IDS_AREA.indexOf((Q.find(x => x.id === f.attrs["data-id"]) || {}).area));
    exige(seqAreas.every((v, i) => v >= 0 && (i === 0 || v >= seqAreas[i - 1])), "as fichas não estão agrupadas por área na ordem de meta.areas");
    exige(todos(app, ".alts").flatMap(a => todos(a, ".bolha")).length === Q.reduce((s, q) => s + q.alternativas.length, 0), "as fichas não têm uma bolha por alternativa");
    const fichaOk = f => {
      const d = Q.find(x => x.id === f.attrs["data-id"]);
      const c = f.querySelector(".comentario");
      const refs = c && c.querySelector(".referencias");
      return d && c && c.attrs["data-letra"] === LETRAS[d.correta]
        && c.querySelector(".letrao").textContent === LETRAS[d.correta]
        && c.querySelector(".texto-comentario").innerHTML === d.comentario
        && !!refs && d.referencias.every(r => refs.innerHTML.includes(r))
        && !!c.querySelector(".simples") && todos(c.querySelector(".simples"), "div")[0].innerHTML === d.simples
        && (!d.materia || (!!c.querySelector(".materia") && todos(c.querySelector(".materia"), "div")[0].innerHTML === impressa(d.materia)))
        && todos(f, ".alts").flatMap(a => todos(a, ".certa")).length === 1
        && todos(f, ".auto").flatMap(a => todos(a, ".quadrado")).length === 4
        && todos(f, ".notas").length === 1 && f.querySelector(".notas").className.includes("quadriculado") && !!f.querySelector(".notas").querySelector(".termos") && !!f.querySelector(".notas").querySelector(".linhas")
        && todos(f, ".rascunho").length === 0
        && f.querySelector(".tag").textContent === AREAS.find(a => a.id === d.area).nome;
    };
    exige(qs.every(fichaOk), "alguma ficha não traz, dentro dela, gabarito certo + comentário + referências + Simplificando + Sobre a matéria (depois do comentário, com as respostas à vista) + autoavaliação + pauta quadriculada com termos-chave + tag da área");
    exige(todos(app, ".materia").length === Q.filter(q => q.materia).length, `o caderno imprime ${todos(app, ".materia").length} blocos Sobre a matéria, esperava ${Q.filter(q => q.materia).length}`);
    exige(todos(app, ".materia").every(x => !x.innerHTML.includes("<details")), "no papel, o Verifique o que aprendeu não pode sair com <details> (as respostas ficariam escondidas)");
    /* padrão: a mini-aula vem logo depois do Simplificando, dentro do comentário; nenhuma página própria */
    exige(paginasM.length === 0, "no padrão (Sobre a matéria depois do comentário) não pode haver página própria da mini-aula");
    const posicao = (el, cls) => (el.children || []).findIndex(k => String(k.className || "").split(" ").includes(cls));
    /* (uma questão ainda sem mini-aula só precisa do Simplificando antes da linha de fonte) */
    exige(qs.every(f => { const c = f.querySelector(".comentario"); const s = posicao(c, "simples"), m = posicao(c, "materia"), o = posicao(c, "fonte"); return s >= 0 && (m < 0 ? o > s : (m > s && o > m)); }), "a mini-aula precisa vir depois do Simplificando e antes da linha de fonte");
    const figuraOk = f => {
      const d = Q.find(x => x.id === f.attrs["data-id"]); if (!d || !d.figura) return true;
      const c = f.querySelector(".comentario"), g = c && c.querySelector(".figura"), im = g && g.querySelector("img");
      return !!im && im.attrs.src === "../" + d.figura.src && String(im.attrs.width) === String(d.figura.w) && String(im.attrs.height) === String(d.figura.h)
        && g.textContent.includes(d.figura.legenda) && g.textContent.includes(d.figura.fonte);
    };
    exige(qs.every(figuraOk), "alguma ficha não traz a figura (imagem em ../figuras/ com largura e altura, legenda e fonte) dentro do comentário");
    const bancaOk = f => {
      const d = Q.find(x => x.id === f.attrs["data-id"]); const figs = todos(f, ".banca");
      if (!d.imagemBanca) return figs.length === 0;
      return figs.length === d.imagemBanca.length && figs.every((fg, k) => { const im = d.imagemBanca[k], img = fg.querySelector("img"); return !!img && img.attrs.src === "../" + im.src && String(img.attrs.width) === String(im.w) && fg.textContent.includes(im.credito); })
        && f.children.findIndex(c => String(c.className || "").split(" ").includes("banca")) < f.children.findIndex(c => String(c.className || "").split(" ").includes("alts"));
    };
    exige(qs.every(bancaOk), "alguma ficha não traz a imagem da banca (../figuras/banca/, largura, crédito) entre o enunciado e as alternativas");
    const fontes = qs.map(f => (f.querySelector(".fonte") || {}).textContent || "");
    const fonteOk = (t, i) => { const d = Q.find(x => x.id === qs[i].attrs["data-id"]); return t === `Questão ${dois(d.numero)} · ${FONTES[d.fonte].rotulo}.`; };
    exige(fontes.every(fonteOk), `a linha de fonte da ficha não é "Questão NN · ROTULO." ("${fontes.find((t, i) => !fonteOk(t, i))}")`);
    /* a faixa dos vídeos: três QR codes por ficha, na ordem q · m · mais, cada um
       com a url curta do site, um SVG e a legenda; nunca na página própria da mini-aula */
    const BASE = `https://${B.meta.site}/v/`;
    const LEGS = ["Vídeo da questão", "Vídeo da matéria", "Mais vídeos do tema", "Flashcards", "Mapa mental"];
    const qrOk = f => {
      const d = Q.find(x => x.id === f.attrs["data-id"]); const c = f.querySelector(".comentario"); const faixa = c && c.querySelector(".videos");
      const qrs = faixa ? todos(faixa, ".qr") : [];
      return qrs.length === 5 && ["q", "m", "mais", "flash", "mapa"].every((k, i) => qrs[i].attrs.href === BASE + d.id + "/" + k && qrs[i].attrs["data-qual"] === k
        && String((qrs[i].querySelector(".codigo") || {}).innerHTML || "").startsWith("<svg") && (qrs[i].querySelector(".leg") || {}).textContent === LEGS[i])
        && posicao(c, "videos") > posicao(c, "fonte");
    };
    exige(qs.every(qrOk), "alguma ficha sem os cinco QR codes (a.qr com href https://<site>/v/<id>/q|m|mais, SVG e legenda) depois da linha de fonte — ou um QR code com href errado");
    exige(paginasM.every(f => todos(f, ".qr").length === 0), "a página própria da mini-aula não pode repetir os QR codes");
    exige(fs.existsSync(path.join(AQUI, "caderno", "qrcode.js")) && fs.readFileSync(path.join(AQUI, "caderno", "qrcode.js"), "utf8").includes("Kazuhiko Arase") && fs.readFileSync(path.join(AQUI, "caderno", "index.html"), "utf8").includes('src="qrcode.js"'), "caderno/qrcode.js (MIT, Kazuhiko Arase) precisa existir com o cabeçalho e ser carregado antes de caderno.js");
    exige(todos(app, ".folha").length === 0, "a folha de respostas só entra quando pedida");
    const chave = todos(app, ".chave").flatMap(t => todos(t, ".l"));
    exige(chave.length === Q.length && chave.every(td => { const q = Q.find(x => x.id === td.attrs["data-id"]); return q && td.attrs["data-letra"] === LETRAS[q.correta]; }), "o gabarito impresso não bate com as letras do banco");
    const mapa = app.querySelector(".mapa");
    const linhasMapa = mapa ? todos(mapa, "tr").filter(tr => tr.attrs["data-id"]) : [];
    exige(linhasMapa.length === Q.length, `o índice tem ${linhasMapa.length} linhas de questão, esperava ${Q.length} (uma por questão)`);
    exige(linhasMapa.every((tr, i) => (tr.querySelector(".q") || {}).textContent === `Questão ${dois(i + 1)}`), "cada linha do índice precisa começar por \"Questão NN\" (o número da ficha dentro do título da linha)");
    exige(!!mapa && (mapa.querySelector("h2") || {}).textContent.includes("Índice de questões") && todos(mapa, "th").map(t => t.textContent).join("|") === "Questão|Tema|Página", "o índice precisa do título \"Índice de questões\" e do cabeçalho Questão · Tema · Página");
    exige(todos(app, ".chave").every(t => todos(t, "th").map(x => x.textContent).join("|") === "Questão|Letra|Página"), "o gabarito resumido precisa do cabeçalho Questão · Letra · Página");
    exige(linhasMapa.every((tr, i) => tr.attrs["data-id"] === Q[i].id && !!tr.querySelector(".pag")), "o mapa de temas é o índice: cada linha precisa do data-id da questão e da célula .pag (a página da ficha, preenchida pela medida)");
    exige(todos(app, ".chave").flatMap(t => todos(t, "tbody")).flatMap(t => todos(t, "tr")).every(tr => tr.attrs["data-id"] && !!tr.querySelector(".pag")), "o gabarito resumido precisa da coluna da página (.pag) em cada linha, por id");
    /* com mais de uma área, uma linha de grupo com a tag da área abre cada bloco, na ordem do banco */
    if (AREAS.filter(a => Q.some(q => q.area === a.id)).length > 1) { let areaAtual = null, ok = true, k = 0;
      for (const tr of todos(mapa || app, "tr")) {
        if (tr.className === "grupo") { areaAtual = (tr.querySelector(".tag") || {}).textContent; continue; }
        if (!tr.attrs["data-id"]) continue;
        if (areaAtual !== AREAS.find(a => a.id === Q[k].area).nome) ok = false;
        k++;
      }
      exige(ok && k === Q.length, "o índice precisa abrir cada bloco de área com uma linha de grupo (tr.grupo com a tag da área), na ordem do banco"); }
    exige(todos(app, ".capa").length === 1 && todos(app, ".mapa").length === 1 && todos(app, ".resultado").length === 1, "faltam capa, mapa de temas ou quadro de resultado");
    const nomeCapa = (app.querySelector(".capa").querySelector(".nome") || {}).textContent || "";
    exige(nomeCapa === "", `por padrão a capa não traz nome nenhum — o aluno escreve o seu ("${nomeCapa}")`);
    exige(!app.querySelector(".rodape-impresso"), "sem nome do aluno não pode haver rodapé central (caderno, banca, site e página já saem nas caixas de margem)");
    /* uma área, sem Simplificando, em branco, com folha, sem resumo */
    const a0 = AREAS[0];
    app = montar({ area: a0.id, simples: false, materia: false, figuras: false, pauta: "nenhuma", folha: true, resumo: false, qr: false });
    const qs2 = todos(app, ".questao");
    exige(qs2.length === Q.filter(q => q.area === a0.id).length, `com a área ${a0.id}, o caderno montou ${qs2.length} fichas`);
    exige(todos(app, ".simples").length === 0, "Simplificando desligado ainda aparece");
    exige(todos(app, ".materia").length === 0, "Sobre a matéria desligado ainda aparece");
    exige(todos(app, ".figura").length === 0, "a opção Figuras desligada ainda imprime figuras");
    exige(todos(app, ".qr").length === 0, "a opção QR codes desligada ainda imprime a faixa");
    exige(todos(app, ".banca").length === Q.filter(q => q.area === a0.id && q.imagemBanca).reduce((s, q) => s + q.imagemBanca.length, 0), "a imagem da banca é parte da questão: a opção Figuras desligada não pode tirá-la");
    exige(todos(app, ".notas").length === qs2.length && todos(app, ".notas").every(x => x.className.includes("nenhuma")), "a opção de anotações em branco não chegou às fichas");
    const bolhasEsperadas = Q.filter(q => q.area === a0.id).reduce((s, q) => s + q.alternativas.length, 0);
    exige(todos(app, ".folha").flatMap(f => todos(f, ".bolha")).length === bolhasEsperadas, `a folha de respostas não tem uma bolha por alternativa de cada questão (${todos(app, ".folha").flatMap(f => todos(f, ".bolha")).length}, esperava ${bolhasEsperadas})`);
    exige(todos(app, ".gabarito").length === 0, "com resumo desligado, o gabarito resumido ainda foi impresso");
    /* Sobre a matéria em página própria: a ficha da questão sem pauta nem
       mini-aula e, logo depois, a página da mini-aula (número, área, texto, pauta) */
    app = montar({ materia: "pagina" });
    const fichasP = todos(app, ".questao"), qsP = fichasP.filter(f => !f.className.includes("materia-pagina")), paginasP = fichasP.filter(f => f.className.includes("materia-pagina"));
    exige(qsP.length === Q.length && paginasP.length === Q.filter(q => q.materia).length, `em página própria, o caderno montou ${qsP.length} fichas e ${paginasP.length} páginas Sobre a matéria, esperava ${Q.length} e ${Q.filter(q => q.materia).length}`);
    const paginaMOk = f => { const d = Q.find(x => x.id === f.attrs["data-id"]); const m = f.querySelector(".materia"); const n = f.querySelector(".notas"); return !!d && !!m && todos(m, "div")[0].innerHTML === impressa(d.materia) && todos(f, ".notas").length === 1 && n.className.includes("quadriculado") && !!n.querySelector(".termos") && !!f.querySelector(".num") && (f.querySelector(".tag") || {}).textContent === AREAS.find(a => a.id === d.area).nome; };
    exige(paginasP.every(paginaMOk), "alguma página Sobre a matéria não traz o número, a tag da área, a mini-aula com as respostas à vista e a pauta");
    exige(qsP.every(f => todos(f, ".qr").length === 5), "em página própria, a ficha da questão perdeu os QR codes");
    exige(paginasP.every(f => todos(f, ".qr").length === 0), "a página própria da mini-aula não pode repetir os QR codes");
    exige(qsP.every(f => { const d = Q.find(x => x.id === f.attrs["data-id"]); return !d.materia || (!f.querySelector(".materia") && todos(f, ".notas").length === 0); }), "com Sobre a matéria em página própria, a ficha da questão não pode trazer a mini-aula nem a pauta (a pauta é uma só, na página da mini-aula)");
    exige(fichasP.every((f, i) => !f.className.includes("materia-pagina") || (i > 0 && fichasP[i - 1].attrs["data-id"] === f.attrs["data-id"] && !fichasP[i - 1].className.includes("materia-pagina"))), "a página Sobre a matéria precisa vir logo depois da ficha da sua questão");
    /* o índice exato: pdf.py imprime, lê em que página cada ficha começou e
       imprime de novo passando as páginas pela URL (?paginas=6,10,13,…), na
       ordem das fichas; as células .pag do mapa e do gabarito recebem esses
       números em vez da estimativa */
    {
      const { window: w3, app: app3 } = domDeMentira();
      const n3 = Q.filter(q => q.area === a0.id).length;
      const lista3 = Array.from({ length: n3 }, (_, i) => 5 + 3 * i);
      w3.location.search = `?area=${a0.id}&paginas=${lista3.join(",")}`;
      const c3 = contexto(w3);
      vm.runInContext(src, c3, { filename: "banco.js" });
      vm.runInContext(fs.readFileSync(path.join(AQUI, "caderno", "qrcode.js"), "utf8"), c3, { filename: "qrcode.js" });
      vm.runInContext(fs.readFileSync(path.join(AQUI, "caderno", "caderno.js"), "utf8"), c3, { filename: "caderno.js" });
      const pags = todos(app3.querySelector(".mapa") || app3, "tr").filter(tr => tr.attrs["data-id"]).map(tr => (tr.querySelector(".pag") || {}).textContent);
      /* a capa de uma área diz a área e conta por edição; o cabeçalho corrido leva a área */
      const capa3 = app3.querySelector(".capa");
      exige(!!capa3 && (capa3.querySelector(".area-capa") || {}).textContent === AREAS[0].nome && todos(capa3, ".fatos").length === 1 && todos(capa3.querySelector(".fatos"), "dt").map(d => d.textContent).join("|") === ["Questões"].concat(B.meta.fontes.filter(f => Q.some(q => q.fonte === f.id && q.area === a0.id)).map(f => f.rotulo)).join("|"), "a capa de uma área precisa do nome da área (.area-capa) e dos fatos Questões + uma edição por coluna");
      exige(((app3.querySelector(".cabecalho-corrido") || {}).textContent || "") === AREAS[0].nome, "o cabeçalho corrido (.cabecalho-corrido) precisa levar o nome da área para o @top-left da página");
      exige(pags.length === n3 && pags.every((p, i) => p === `página ${lista3[i]}`), `com ?paginas= na URL o mapa de temas não mostra essas páginas como \"página N\", na ordem (${pags.slice(0, 4)})`);
      const pagsG = todos(app3, ".chave").flatMap(t => todos(t, "tbody")).flatMap(t => todos(t, "tr")).map(tr => (tr.querySelector(".pag") || {}).textContent);
      exige(pagsG.length === n3 && pagsG.every((p, i) => p === `página ${lista3[i]}`), "com ?paginas= na URL o gabarito resumido não mostra as mesmas páginas");
    }
    /* uma edição, outro nome */
    const f0 = B.meta.fontes.find(f => Q.some(q => q.fonte === f.id));
    app = montar({ edicao: f0.id, nome: "Maria Silva" });
    exige(todos(app, ".questao").filter(f => !f.className.includes("materia-pagina")).length === Q.filter(q => q.fonte === f0.id).length, "o filtro de edição do caderno não funciona");
    exige(app.querySelector(".capa").querySelector(".nome").textContent === "Maria Silva" && app.querySelector(".rodape-impresso").textContent === "Maria Silva", "trocar o nome não chega à capa e ao rodapé");
    app = montar({ letra: "grande" });
    exige(todos(app, ".qr").length === 5 * Q.length, "com letra grande, a faixa dos QR codes mudou de contagem");
  } catch (e) { erro(`caderno.js estourou no DOM de mentira: ${e.message}`); }
}

/* --- relatório ------------------------------------------------------------- */
const porArea = AREAS.map(a => `${a.curto} ${Q.filter(q => q.area === a.id).length}`).join(" · ");
let comVideos = 0; try { comVideos = Object.values(JSON.parse(fs.readFileSync(path.join(AQUI, "videos.json"), "utf8"))).filter(v => v.q && v.m).length; } catch (e) { /* sem videos.json: já apontado acima */ }
const porFonte = B.meta.fontes.map(f => `${f.rotulo} ${Q.filter(q => q.fonte === f.id).length}`).join(" · ");
console.log(`\n${falhas.length ? "✗" : "✓"} banco TEGO — ${Q.length} questões (${porArea}; ${porFonte}) · ${Q.filter(q => q.figura).length} figuras · ${Q.filter(q => q.materia).length} com Sobre a matéria · ${comVideos} com os dois vídeos · ${n} conferências`);
for (const f of falhas) console.log("   ! " + f);
console.log(falhas.length ? `\n${falhas.length} problema(s).` : "\ntudo certo.");
process.exit(falhas.length ? 1 : 0);
