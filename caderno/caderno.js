/* ============================================================================
   CADERNO PARA IMPRIMIR — o banco TEGO em papel, como um livro de estudo.

   Cada questão é uma ficha completa: enunciado, alternativas com bolha, o
   gabarito, o comentário inteiro, as referências, o "Simplificando", a
   fonte, uma linha de autoavaliação (acertei / errei / chutei / revisar) e
   pauta para as anotações do estudante. Nada fica separado no fim: o que vai
   no fim é só um resumo (gabarito em tabela e o quadro de resultado).

   Uma ficha ocupa pelo menos uma página A4; uma ficha longa continua na
   página seguinte em vez de ser espremida. As cores são impressas de
   verdade (print-color-adjust: exact). O painel de opções só aparece na
   tela e é guardado em localStorage (tego:caderno).
   ========================================================================== */
(() => {
  const B = window.BANCO;
  const Q = B.questoes;
  const LETRAS = "ABCDE";
  const AREAS = B.meta.areas;
  const NOME_AREA = Object.fromEntries(AREAS.map(a => [a.id, a.nome]));
  const FONTES = Object.fromEntries(B.meta.fontes.map(f => [f.id, f]));
  const EDICOES = B.meta.fontes.filter(f => Q.some(q => q.fonte === f.id));
  const NUM = B.meta.numeros || { questoes: 100, porArea: 20, alternativas: 5, horas: 5, corte: 50 };
  const CH = "tego:caderno";

  /* --- opções --------------------------------------------------------------- */
  const PADRAO = { area: "todas", edicao: "todas", simples: true, materia: "junto", figuras: true, qr: true, pauta: "quadriculado", letra: "normal", folha: false, resumo: true, nome: "" };   /* sem nome: o aluno escreve o seu na capa */
  /* no papel não há clique: as respostas do "Verifique o que aprendeu" saem à vista */
  const materiaImpressa = m => m.replace(/<details><summary>Resposta<\/summary>([\s\S]*?)<\/details>/g, '<span class="resp"><em>Resposta:</em> $1</span>');
  const ler = () => { try { const s = JSON.parse(localStorage.getItem(CH) || "{}"); const o = Object.assign({}, PADRAO); for (const k in PADRAO) if (k in s) o[k] = s[k]; return o; } catch (e) { return Object.assign({}, PADRAO); } };
  /* valores antigos guardados (true) viram o padrão novo; as opções também
     valem pela URL (?area=ped&materia=junto), sem gravar — é assim que os
     PDFs são gerados (ferramentas/pdf.py) */
  const daUrl = o => { try { const p = new URLSearchParams(window.location.search); for (const k in PADRAO) if (p.has(k)) { const v = p.get(k); o[k] = v === "true" ? true : v === "false" ? false : v; } } catch (e) { /* sem URL */ } return o; };
  const normalizar = o => { if (o.materia === true) o.materia = "junto"; return o; };
  /* o índice exato, pela URL: pdf.py imprime, lê em que página cada ficha
     começou e imprime de novo com ?paginas=6,10,13,… (na ordem das fichas);
     sem isso, o índice traz a estimativa medida no navegador */
  const PAGINAS_URL = (() => { try { return (new URLSearchParams(window.location.search).get("paginas") || "").split(",").filter(Boolean).map(Number); } catch (e) { return []; } })();
  const gravar = () => { try { localStorage.setItem(CH, JSON.stringify(op)); } catch (e) { /* sem armazenamento */ } };
  let op = normalizar(daUrl(ler()));
  if (op.area !== "todas" && !NOME_AREA[op.area]) op.area = "todas";
  if (op.edicao !== "todas" && !EDICOES.some(f => f.id === op.edicao)) op.edicao = "todas";

  /* --- utilidades ------------------------------------------------------------ */
  const h = (tag, attrs, ...filhos) => {
    const el = document.createElement(tag);
    for (const k in (attrs || {})) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "html") el.innerHTML = v;
      else if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const f of filhos.flat(Infinity)) if (f != null && f !== false) el.append(f.nodeType ? f : document.createTextNode(String(f)));
    return el;
  };
  const dois = n => String(n).padStart(2, "0");
  const rotulo = q => `${FONTES[q.fonte].rotulo} · Questão ${dois(q.numero)}`;
  const escolhidas = () => Q.filter(q => (op.area === "todas" || q.area === op.area) && (op.edicao === "todas" || q.fonte === op.edicao));
  const linhas = k => h("div", { class: "linhas" }, Array.from({ length: k }, () => h("div", { class: "linha" })));

  /* --- painel (só na tela) --------------------------------------------------- */
  function opcao(nome, rot, valores) {
    return h("div", { class: "opcao" }, h("span", { class: "rot" }, rot),
      h("div", { class: "seg", role: "group", "aria-label": rot }, valores.map(([v, txt]) =>
        h("button", { type: "button", "aria-pressed": String(op[nome]) === String(v) ? "true" : "false",
          onclick: () => { op[nome] = v; gravar(); render(); } }, txt))));
  }
  function painel() {
    const n = escolhidas().length;
    return h("section", { id: "painel", "aria-label": "Opções do caderno" }, h("div", { class: "miolo" },
      h("div", { class: "cab" },
        h("div", null, h("h1", null, "Caderno para imprimir"), h("p", { class: "sub" }, `${n} fichas · cada questão sai com gabarito, comentário, figura, referências, Simplificando, Sobre a matéria, QR codes dos vídeos e pauta para anotar`),
          /* os PDFs prontos (ferramentas/pdf.py, opções padrão) ficam em /pdf/ */
          h("p", { class: "sub pdfs" }, "PDF pronto, com as opções padrão (um por área, com o índice paginado): ", AREAS.map((a, i) => [i ? " · " : "", h("a", { href: `../pdf/caderno-${a.id}.pdf` }, a.nome)]))),
        h("div", { class: "acoes" },
          h("a", { class: "acao", href: "../" }, "← Banco na tela"),
          h("a", { class: "acao", href: "../videos/", title: "Para o cliente: cada questão com os dois vídeos escolhidos, para vetar ou trocar" }, "Vídeos: página de revisão"),
          h("button", { class: "acao primaria", type: "button", onclick: () => window.print() }, "Imprimir / salvar em PDF"))),
      h("div", { class: "opcoes" },
        h("div", { class: "opcao" }, h("label", { class: "rot", for: "nome" }, "Nome do estudante"),
          h("input", { id: "nome", class: "campo", type: "text", value: op.nome, placeholder: "Nome na capa e no rodapé",
            onchange: e => { op.nome = e.target.value.trim(); gravar(); render(); } })),
        opcao("area", "Área", [["todas", "Todas"]].concat(AREAS.map(a => [a.id, a.nome]))),
        opcao("edicao", "Edição", [["todas", "Todas"]].concat(EDICOES.map(f => [f.id, f.rotulo]))),
        opcao("simples", "Simplificando", [[true, "Incluir"], [false, "Não"]]),
        opcao("materia", "Sobre a matéria", [["junto", "Depois do comentário"], ["pagina", "Em página própria"], [false, "Não"]]),
        /* com figura toda ficha vira duas páginas; sem, 4 em 10 cabem numa */
        opcao("figuras", "Figuras", [[true, "Incluir"], [false, "Não"]]),
        opcao("qr", "QR codes dos vídeos", [[true, "Sim"], [false, "Não"]]),
        opcao("pauta", "Anotações", [["quadriculado", "Quadriculado"], ["linhas", "Pauta"], ["nenhuma", "Em branco"]]),
        opcao("letra", "Letra", [["normal", "Normal"], ["grande", "Grande"]]),
        opcao("folha", "Folha de respostas", [[false, "Não"], [true, "Sim"]]),
        opcao("resumo", "Gabarito resumido no fim", [[true, "Sim"], [false, "Não"]])),
      h("p", { class: "dica" }, "Cada ficha ocupa pelo menos uma página A4: o que o comentário não usa vira pauta para anotar, e uma ficha muito longa continua na página seguinte. Na caixa de impressão: A4, retrato, margens padrão, destino “Salvar como PDF”. As cores saem mesmo com “Gráficos de fundo” desligado.")));
  }

  /* --- folhas ----------------------------------------------------------------- */
  /* as áreas de uma lista, por nome: "Clínica Médica" numa apostila de área, a lista nas de várias */
  const areasDe = lista => { const ns = AREAS.filter(a => lista.some(q => q.area === a.id)).map(a => a.nome); return ns.length > 1 ? ns.slice(0, -1).join(", ") + " e " + ns[ns.length - 1] : (ns[0] || ""); };
  function capa(lista) {
    return h("section", { class: "pagina capa" },
      h("div", { class: "topo" },
        h("div", { class: "faixa" }, h("span", null, B.meta.banca), h("span", null, B.meta.orgao)),
        h("h1", null, "Caderno de questões ", h("em", null, "comentadas")),
        h("p", { class: "area-capa" }, areasDe(lista)),
        /* o selo de Iyar (Touro), por pedido do usuário */
        h("div", { class: "selo", "aria-hidden": "true" }, h("span", { class: "signo" }, "\u2649"), h("span", { class: "mes" }, "Iyar"))),
      h("p", { class: "lema" }, `Questões reais das provas de acesso direto da banca ${B.meta.banca} (${EDICOES.filter(f => lista.some(q => q.fonte === f.id)).map(f => f.rotulo).join(", ")}), para a ${B.meta.concurso}. Prova: ${B.meta.prova}.`),
      h("dl", { class: "fatos" },
        h("div", null, h("dt", null, "Questões"), h("dd", null, String(lista.length))),
        EDICOES.filter(f => lista.some(q => q.fonte === f.id)).map(f => h("div", null, h("dt", null, f.rotulo), h("dd", null, String(lista.filter(q => q.fonte === f.id).length))))),
      h("div", { class: "campos" },
        h("p", null, h("span", { class: "rot" }, "Nome"), h("span", { class: "linha nome" }, op.nome || "")),
        h("p", null, h("span", { class: "rot" }, "Início"), h("span", { class: "linha curta" }), h("span", { class: "rot" }, "Fim"), h("span", { class: "linha curta" }))),
      h("div", { class: "instrucoes" },
        h("h2", null, "Como estudar com este caderno"),
        h("ol", null,
          h("li", null, h("b", null, "Cubra o gabarito e o comentário"), " com uma folha antes de ler cada questão. Marque a bolha da sua resposta. A prova real dá 3 minutos por questão."),
          h("li", null, h("b", null, "Só então destape."), " Confira a letra e leia o comentário inteiro: ele explica também por que cada distrator está errado — e é aí que a banca pega."),
          h("li", null, h("b", null, "Marque a linha de autoavaliação"), " (acertei, errei, chutei) e assinale “revisar” quando o assunto for novo. O quadro do fim reúne isso."),
          h("li", null, h("b", null, "Escreva na pauta"), " a regra com as suas palavras. O “Simplificando” é a mesma explicação em frases curtas: se ele bastar, você entendeu."),
          h("li", null, "Toda ficha é uma questão real: a etiqueta ", h("b", null, "PROVA ANO · Questão NN"), " diz a prova e o número que a questão tinha nela, e o gabarito é o oficial. As referências dizem de onde vem a resposta."))),
      h("p", { class: "nota" }, `Estrutura da 1ª fase, conforme o edital: ${B.meta.estrutura}. Para a 2ª fase: ${NUM.corte}% de acertos (nota 6,00) em cada prova.`));
  }

  function folhaDeRespostas(lista) {
    const colunas = [];
    for (let i = 0; i < lista.length; i += 25) colunas.push(lista.slice(i, i + 25).map((q, k) => i + k + 1));
    return h("section", { class: "pagina folha" },
      h("h2", null, h("span", { class: "sec" }, "Folha"), "Folha de respostas"),
      h("p", { class: "sub" }, "Para quem prefere responder tudo antes de destapar: uma bolha por questão e uma coluna para ✓ ou ✗."),
      h("div", { class: "colunas" }, colunas.map(col => h("table", { class: "grade" },
        h("thead", null, h("tr", null, h("th", null, "Nº"), [..."ABCDE"].map(l => h("th", null, l)), h("th", null, "✓"))),
        /* uma bolha por alternativa: as questões de quatro (UNESP, Einstein) deixam a coluna E vazia */
        h("tbody", null, col.map(n => h("tr", null, h("td", { class: "n" }, dois(n)), [..."ABCDE"].map((L, i) => h("td", null, i < lista[n - 1].alternativas.length ? h("span", { class: "bolha" }) : null)), h("td", { class: "conf" }))))))));
  }

  /* uma linha por questão, agrupadas por área na ordem de meta.areas; é o
     índice: a última coluna é a página da ficha, preenchida por medirFichas */
  function mapaDeTemas(lista) {
    const linhas = []; let area = null;
    lista.forEach((q, i) => {
      if (q.area !== area && AREAS.filter(a => lista.some(x => x.area === a.id)).length > 1) { area = q.area; linhas.push(h("tr", { class: "grupo" }, h("td", { colspan: "3" }, h("span", { class: "tag " + q.area }, NOME_AREA[q.area])))); }
      linhas.push(h("tr", { "data-id": q.id }, h("td", { class: "q" }, `Questão ${dois(i + 1)}`), h("td", { class: "tema" }, q.tema), h("td", { class: "pag" }, "")));
    });
    return h("section", { class: "pagina mapa" },
      h("h2", null, h("span", { class: "sec" }, "Índice"), "Índice de questões"),
      h("p", { class: "sub" }, "Cada questão, o tema que ela cobra e a página em que está. Depois de corrigir, circule as que errou — é a sua lista de revisão."),
      h("table", { class: "temas" }, h("thead", null, h("tr", null, h("th", null, "Questão"), h("th", null, "Tema"), h("th", { class: "pag" }, "Página"))), h("tbody", null, linhas)));
  }

  /* --- a ficha de uma questão ------------------------------------------------- */
  const materiaBloco = q => h("div", { class: "materia" }, h("p", { class: "rot" }, "Sobre a matéria"), h("div", { html: materiaImpressa(q.materia) }));
  /* o fim da ficha é do estudante: um quadro de 40 mm para os termos-chave
     (copiar da mini-aula já é anotação) e "Minhas anotações" até o fim da
     página — quadriculado, pauta ou em branco */
  const notas = () => h("div", { class: "notas " + op.pauta, "aria-label": "Espaço para anotações" },
    h("span", { class: "rot" }, "Termos-chave"), h("div", { class: "termos" }),
    h("span", { class: "rot" }, "Minhas anotações"), h("div", { class: "linhas" }));
  const cabecalho = (q, numero, origem) => h("header", null,
    h("span", { class: "num" }, dois(numero)),
    h("span", { class: "tag " + q.area }, NOME_AREA[q.area]),
    h("span", { class: "tema" }, q.tema),
    h("span", { class: "origem" }, origem));
  /* a imagem da própria prova: parte da questão, sempre impressa (a opção
     Figuras é só para as do Commons); caminho relativo a caderno/ */
  const figuraBanca = im => h("figure", { class: "banca" },
    h("img", { src: "../" + im.src, width: im.w, height: im.h, alt: "Imagem da prova" }),
    h("figcaption", null, im.credito));
  /* --- a faixa dos vídeos: três QR codes com os links curtos do site --------
     q = vídeo da questão, m = vídeo da matéria, mais = busca no YouTube pelo
     tema. A url é só o id: quem redireciona é a página /v/ (videos.json), por
     isso o papel não envelhece quando um vídeo é trocado. O SVG vem de
     qrcode.js (Kazuhiko Arase, MIT), nível M, 18 mm no CSS. */
  const BASE_V = `https://${B.meta.site}/v/`;
  const QRS = [["q", "Vídeo da questão"], ["m", "Vídeo da matéria"], ["mais", "Mais vídeos do tema"], ["flash", "Flashcards"], ["mapa", "Mapa mental"]];
  const qrSVG = texto => { /* nível H (recupera 30 % dos módulos) e margem de 4 módulos — a zona de silêncio que a norma pede — para impressão ruim */
    const c = qrcode(0, "H"); c.addData(texto); c.make(); return c.createSvgTag({ cellSize: 2, margin: 4, scalable: true }); };
  const videos = q => h("div", { class: "videos" }, QRS.map(([k, rot]) => {
    const url = BASE_V + q.id + "/" + k;
    return h("a", { class: "qr", href: url, "data-qual": k }, h("span", { class: "codigo", html: qrSVG(url) }), h("span", { class: "leg" }, rot));
  }));
  /* Devolve uma ou duas fichas. No modo padrão ("Sobre a matéria depois do
     comentário") a questão é uma ficha contínua — enunciado, alternativas,
     comentário, figura, referências, Simplificando, mini-aula, autoavaliação
     e a pauta no fim — que corre por quantas páginas precisar, sem espaço em
     branco no meio. Em "página própria", a mini-aula sai numa segunda ficha
     com a pauta. */
  function ficha(q, numero, apoio) {
    const letra = LETRAS[q.correta];
    const propria = op.materia === "pagina" && !!q.materia;
    const a = h("article", { class: "questao " + q.area, "data-id": q.id },
      cabecalho(q, numero, rotulo(q)),
      apoio,
      h("p", { class: "enunciado", html: q.enunciado }),
      q.imagemBanca ? q.imagemBanca.map(im => figuraBanca(im)) : null,
      h("ol", { class: "alts" }, q.alternativas.map((a, i) => h("li", { class: i === q.correta ? "certa" : "" },
        h("span", { class: "bolha", "aria-hidden": "true" }), h("span", { class: "letra" }, LETRAS[i]), h("span", { class: "txt", html: a })))),
      h("div", { class: "comentario", "data-id": q.id, "data-letra": letra },
        h("div", { class: "gab" }, h("span", { class: "rot" }, "Gabarito"), h("span", { class: "letrao" }, letra), h("span", { class: "alt-certa", html: q.alternativas[q.correta] })),
        h("div", { class: "texto-comentario", html: q.comentario }),
        /* a figura: caminho relativo a caderno/, com largura e altura (a
           medida da ficha precisa do tamanho antes de a imagem carregar) */
        op.figuras && q.figura ? h("figure", { class: "figura" }, h("span", { class: "moldura", style: `--w:${q.figura.w};--h:${q.figura.h}` }, h("img", { src: "../" + q.figura.src, width: q.figura.w, height: q.figura.h, alt: q.figura.legenda })), h("figcaption", null, q.figura.legenda + " ", h("span", { class: "credito" }, q.figura.fonte))) : null,
        h("p", { class: "referencias", html: `<span class="rot">Referências</span> ${q.referencias.join(" · ")}` }),
        op.simples && q.simples ? h("div", { class: "simples" }, h("p", { class: "rot" }, "Simplificando"), h("div", { html: q.simples })) : null,
        op.materia === "junto" && q.materia ? materiaBloco(q) : null,
        h("p", { class: "fonte" }, `Questão ${dois(q.numero)} · ${FONTES[q.fonte].rotulo}.`),
        op.qr ? videos(q) : null),
      h("div", { class: "auto" },
        h("span", { class: "rot" }, "Eu"),
        ["acertei", "errei", "chutei", "revisar"].map(t => h("span", { class: "caixa" }, h("span", { class: "quadrado" }), t))),
      propria ? null : notas());
    if (!propria) return [a];
    return [a, h("article", { class: "questao materia-pagina " + q.area, "data-id": q.id }, cabecalho(q, numero, "Sobre a matéria"), materiaBloco(q), notas())];
  }
  function questoes(lista) {
    const itens = [];
    let area = null;
    lista.forEach((q, i) => {
      const numero = i + 1;
      if (q.area !== area) { area = q.area; itens.push(h("h3", { class: "divisor " + area }, NOME_AREA[area])); }
      /* texto de apoio: dentro da primeira ficha da sequência que o
         compartilha (um bloco solto entre fichas ganhava uma página só para
         ele); as fichas seguintes trazem só a remissão */
      let apoio = null;
      if (q.texto) {
        let ini = i; while (ini > 0 && lista[ini - 1].texto === q.texto) ini--;
        if (ini === i) {
          let fim = i; while (fim + 1 < lista.length && lista[fim + 1].texto === q.texto) fim++;
          apoio = h("div", { class: "texto" }, h("p", { class: "rot" }, fim > i ? `Texto para as fichas ${dois(numero)} a ${dois(fim + 1)}` : `Texto para a ficha ${dois(numero)}`), h("div", { html: q.texto }));
        } else apoio = h("p", { class: "texto-ref" }, `Texto de apoio: o mesmo da ficha ${dois(ini + 1)}.`);
      }
      itens.push(...ficha(q, numero, apoio));
    });
    return h("section", { class: "pagina questoes" }, h("h2", null, h("span", { class: "sec" }, "Fichas"), "Questões comentadas"), itens);
  }

  function gabarito(lista) {
    const colunas = [];
    for (let i = 0; i < lista.length; i += 25) colunas.push(lista.slice(i, i + 25).map((q, k) => [i + k + 1, LETRAS[q.correta], q.id]));
    return h("section", { class: "pagina gabarito" },
      h("h2", null, h("span", { class: "sec" }, "Resumo"), "Gabarito"),
      h("p", { class: "sub" }, "As letras de todas as fichas, para conferir de uma vez."),
      h("div", { class: "colunas" }, colunas.map(col => h("table", { class: "grade chave" }, h("thead", null, h("tr", null, h("th", null, "Questão"), h("th", null, "Letra"), h("th", null, "Página"))), h("tbody", null, col.map(([n, l, id]) => h("tr", { "data-id": id }, h("td", { class: "n" }, dois(n)), h("td", { class: "l", "data-id": id, "data-letra": l }, l), h("td", { class: "pag" }, ""))))))));
  }
  function resultado(lista) {
    return h("section", { class: "pagina resultado" },
      h("h2", null, h("span", { class: "sec" }, "Fim"), "Meu resultado"),
      h("dl", { class: "fatos" },
        h("div", null, h("dt", null, "Acertos"), h("dd", null, h("span", { class: "linha curta" }), ` / ${lista.length}`)),
        AREAS.map(a => h("div", null, h("dt", null, a.nome), h("dd", null, h("span", { class: "linha curta" }), ` / ${lista.filter(q => q.area === a.id).length}`)))),
      h("p", { class: "sub" }, `Na prova real, a FEBRASGO exige ${NUM.corte}% de acertos em cada prova para a 2ª fase. Mantendo a sua taxa nas ${NUM.questoes} questões, você ficaria com `, h("span", { class: "linha curta" }), " pontos."),
      h("h3", null, "Temas para revisar (os que marquei “revisar”)"),
      linhas(8),
      h("h3", null, "O que eu não sabia, com as minhas palavras"),
      linhas(10));
  }

  function documento() {
    const lista = escolhidas();
    const partes = [capa(lista)];
    if (op.folha) partes.push(folhaDeRespostas(lista));
    partes.push(mapaDeTemas(lista), questoes(lista));
    if (op.resumo) partes.push(gabarito(lista));
    partes.push(resultado(lista));
    /* o cabeçalho corrido de toda página impressa (@top-left) leva a área da
       apostila: o CSS não lê o DOM, então o caderno escreve a regra @page na hora */
    const corrido = areasDe(lista) || "Caderno TEGO";
    if (typeof document.head !== "undefined" && document.head && document.head.appendChild) {
      const velho = document.getElementById("cabecalho-corrido-css"); if (velho) velho.remove();
      const st = document.createElement("style"); st.id = "cabecalho-corrido-css";
      st.textContent = `@page { @top-left { content: ${JSON.stringify(corrido)}; font-family: "Segoe UI", system-ui, sans-serif; font-size: 7.5pt; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #000; } }`;
      document.head.appendChild(st);
    }
    return h("main", { id: "documento", class: "letra-" + op.letra }, h("span", { class: "cabecalho-corrido", hidden: true }, corrido), partes,
      /* o rodapé central só leva o nome do aluno: caderno, banca, site e página já saem nas caixas de margem do @page */
      op.nome ? h("div", { class: "rodape-impresso", "aria-hidden": "true" }, op.nome) : null);
  }

  const raiz = document.getElementById("app");
  /* Fluxo corrido: a ficha tem a altura do conteúdo e a seguinte começa logo
     depois. A medida só serve ao índice no navegador — uma estimativa pela
     posição de cada ficha dentro da seção, na geometria da folha impressa
     (classe "medindo" no body); nos PDFs publicados o pdf.py lê as páginas
     reais e as passa pela URL (?paginas=). Só no navegador: o DOM de
     mentira do harness não mede. */
  function medirFichas() {
    const fichas = document.querySelectorAll(".questao");
    if (!fichas.length || typeof fichas[0].getBoundingClientRect !== "function") return;
    const regua = document.createElement("div");
    regua.style.cssText = "position:absolute;visibility:hidden;height:var(--pagina)";
    document.body.appendChild(regua);
    const pagina = regua.getBoundingClientRect().height;
    regua.remove();
    if (!pagina) return;
    document.body.classList.add("medindo");
    const paginasDe = sel => { const el = document.querySelector(sel); return el ? Math.max(1, Math.ceil((el.getBoundingClientRect().height - 1) / pagina)) : 0; };
    const antes = paginasDe(".pagina.capa") + paginasDe(".pagina.folha") + paginasDe(".pagina.mapa");
    const secao = document.querySelector(".questoes") || fichas[0].parentNode;
    const topo = secao.getBoundingClientRect().top;
    const paginaDe = {};
    fichas.forEach(f => {
      const id = f.getAttribute("data-id");
      if (!f.classList.contains("materia-pagina") && !(id in paginaDe)) paginaDe[id] = antes + Math.floor((f.getBoundingClientRect().top - topo) / pagina) + 1;
    });
    document.body.classList.remove("medindo");
    if (!PAGINAS_URL.length) preencherIndice(Object.values(paginaDe));
  }
  /* escreve as páginas nas células .pag do mapa e do gabarito, na ordem das fichas */
  function preencherIndice(paginas) {
    const ids = escolhidas().map(q => q.id);
    const porId = {};
    ids.forEach((id, i) => { porId[id] = paginas[i]; });
    /* seletor simples de propósito: o DOM de mentira do harness só entende classe, id ou tag */
    document.querySelectorAll(".pag").forEach(td => { if (td.tagName === "TH") return; const p = porId[td.parentNode && td.parentNode.getAttribute("data-id")]; td.textContent = p ? "página " + p : ""; });
  }
  function render() {
    raiz.innerHTML = ""; raiz.setAttribute("aria-busy", "false"); raiz.append(painel(), documento());
    if (PAGINAS_URL.length) preencherIndice(PAGINAS_URL);
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(medirFichas);
  }
  render();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(medirFichas);
  /* imprimir de uma tela estreita (celular) não pode dar outro caderno */
  if (typeof window.addEventListener === "function") window.addEventListener("beforeprint", medirFichas);
  /* as figuras chegam depois do primeiro render: a medida é refeita no load */
  if (typeof window.addEventListener === "function") window.addEventListener("load", medirFichas);
})();
