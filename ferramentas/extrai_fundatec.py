"""Extrai as questões de um caderno da Fundatec (Prova AMB, AMRIGS, ACM e AMMS)
com PyMuPDF. O caderno é de uma coluna: "QUESTÃO NN – enunciado…" com o
enunciado na mesma linha, alternativas "A) …" a "D) …", cabeçalho em toda
página ("1010_AD_NS_DM", data e hora, "Execução: Fundatec", "RESIDÊNCIA COM
ACESSO DIRETO E AUTOAVALIAÇÃO"). As páginas antes da primeira questão (capa,
instruções, rascunho) são puladas.

Saídas, no mesmo formato do extrai_questoes.py do susp (montar.js e o harness
leem as duas): <saida>.txt ("NN.<TAB>enunciado", "(A)<TAB>…"), <saida>-questoes.json
(numero, enunciado, alternativas, imagem, imagens, area, erro?),
<saida>-hifens.txt (as decisões de hífen, para revisão) e <saida>-rotulos.txt
(as linhas de texto que viraram rótulo de uma imagem e saíram do enunciado —
leia depois de toda extração: uma linha de enunciado consumida por engano não
é pega pela conferência de fidelidade, porque some dos dois lados).

IMAGENS DA BANCA: todo bloco de imagem dentro de uma questão é gravado, com a
codificação original, em figuras/banca/<fonte>-NN.<ext> (-2, -3… se houver
várias) e vira a linha "[IMAGEM:<arquivo>]" no texto; a questão fica com
imagem: true e imagens: [{arquivo, w, h, onde}] (onde = "enunciado" ou
"alternativas"). O logotipo do cabeçalho (topo da página) e imagens minúsculas
são ignorados. Alternativa sem texto = alternativa que é imagem: erro
"alternativa vazia (imagem)", e montar.js não deixa a questão entrar.

    python ferramentas/extrai_fundatec.py --pdf ferramentas/cadernos/amrigs2025-caderno.pdf --fonte amrigs2025 --saida ferramentas/cadernos/amrigs2025
"""
import argparse, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extrai_questoes import juntar_hifens

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
PASTA_BANCA = os.path.join(RAIZ, "figuras", "banca")
BLOCOS_PADRAO = "cm:1-20,cir:21-40,go:41-60,ped:61-80,prev:81-100"
CABECALHO = re.compile(r"^(\d+_AD_NS(_DM)?|Execução: Fundatec|RESIDÊNCIA COM ACESSO DIRETO E AUTOAVALIAÇÃO|\d{1,2}/\d{2}/\d{4}\s*\d{2}:\d{2}:\d{2}|V\d_\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2}|QR|code|\d{1,2})\s*$")
QUESTAO = re.compile(r"^QUEST[ÃA]O\s+(\d{1,3})\s*[–-]\s*")
ALTERNATIVA = re.compile(r"^([A-D])\)[ \t]*")
TOPO_CABECALHO = 70        # pt: imagem com o topo acima disso é o logotipo do cabeçalho
AREA_MINIMA = 4000         # px²: menor que isso é enfeite

def converter(bruto):
    """'QUESTÃO 01 – x' → '01.<TAB>x'; 'A) y' → '(A)<TAB>y' (o estilo que o resto das ferramentas lê)."""
    linhas = []
    for l in bruto.split("\n"):
        m = QUESTAO.match(l)
        if m: l = m.group(1).zfill(2) + ".\t" + l[m.end():]
        else:
            m = ALTERNATIVA.match(l)
            if m: l = "(" + m.group(1) + ")\t" + l[m.end():]
        linhas.append(l)
    return "\n".join(linhas)

def separar_fundatec(texto):
    partes = re.split(r"(?m)^(\d{2,3})\.\t", texto)
    limpa = lambda s: re.sub(r"\s+", " ", re.sub(r"\[IMAGEM:[^\]]+\]", " ", s)).strip()
    questoes = []
    for i in range(1, len(partes), 2):
        numero, corpo = int(partes[i]), partes[i + 1]
        m = re.search(r"(?m)^\(A\)\t", corpo)
        if not m:
            questoes.append({"numero": numero, "erro": "sem alternativa (A)"}); continue
        enunciado, resto = corpo[:m.start()], corpo[m.start():]
        imagens = [{"arquivo": x.group(1), "onde": "enunciado" if x.start() < m.start() else "alternativas"} for x in re.finditer(r"\[IMAGEM:([^\]]+)\]", corpo)]
        alts = re.split(r"(?m)^\(([A-E])\)\t", resto)
        letras, textos = alts[1::2], [limpa(t) for t in alts[2::2]]
        q = {"numero": numero, "enunciado": limpa(enunciado), "alternativas": textos, "imagem": bool(imagens), "imagens": imagens}
        if letras != list("ABCD"): q["erro"] = f"alternativas {letras}"
        elif any(not t for t in textos): q["erro"] = "alternativa vazia (imagem)"
        questoes.append(q)
    return questoes

CAPTION = re.compile(r"^(Fonte|Figura|Imagem|Adaptado|Quadro|Tabela|Gr[áa]fico)\b", re.I)

def eh_rotulo(s):
    """Linha curta ao lado de uma imagem = rótulo do gráfico (eixo, legenda), não
    enunciado. Uma linha que começa em minúscula continua uma frase; uma que
    termina em dois-pontos anuncia a figura; uma pergunta ("Quais estão
    corretas?") ou uma frase com ponto final que não é legenda ("Fonte: …",
    "Figura 1.") é enunciado."""
    s = s.strip()
    if len(s.split()) > 4 or QUESTAO.match(s) or ALTERNATIVA.match(s): return False
    if s[:1].islower() or s.endswith(":") or s.endswith("?"): return False
    if s.endswith(".") and not CAPTION.match(s): return False
    return True

def grupos_vetoriais(page, rasters):
    """Desenhos vetoriais (gráfico, esquema feito no Word) agrupados em regiões.
    Linhas de cabeçalho/rodapé e os separadores de largura de página ficam de
    fora; uma região que coincide com uma imagem embutida é a moldura dela, não
    um desenho à parte. Tudo o que está desenhado na faixa vertical de um grupo
    (as peças pequenas de um esquema) entra na região."""
    import fitz
    rects = []
    for d in page.get_drawings():
        r = fitz.Rect(d["rect"])
        if r.y1 < 60 or r.y0 > 790: continue
        if r.height < 2.5 and r.width > 250: continue
        if r.width < 3 and r.height < 3: continue
        rects.append(r)
    grupos = []
    for r in rects:
        for g in grupos:
            if (g + (-12, -12, 12, 12)).intersects(r): g |= r; break
        else: grupos.append(fitz.Rect(r))
    mudou = True
    while mudou:                                   # grupos vizinhos na mesma faixa (até 150 pt) são um só
        mudou = False
        for i in range(len(grupos)):
            for j in range(i + 1, len(grupos)):
                a, b = grupos[i], grupos[j]
                if (a + (-150, -12, 150, 12)).intersects(b) and min(a.y1, b.y1) > max(a.y0, b.y0):
                    grupos[i] = a | b; del grupos[j]; mudou = True; break
            if mudou: break
    saida = []
    for g in grupos:
        if g.width < 40 or g.height < 20: continue
        if any(g.intersects(fitz.Rect(b["bbox"])) for b in rasters): continue
        for r in rects:
            if r.y0 < g.y1 + 10 and r.y1 > g.y0 - 10: g |= r
        saida.append(g)
    return saida

def texto_e_imagens(pdf, fonte):
    """Linhas do caderno a partir da página da QUESTÃO 01, sem cabeçalho, com as
    imagens gravadas em figuras/banca/ e marcadas no texto. Devolve
    (texto, {arquivo: (w, h)}, [(questão, linha que virou rótulo)]).

    Um gráfico do Word sai do PDF como a imagem das curvas MAIS os rótulos dos
    eixos em texto solto ao redor; nesse caso a região inteira (imagem +
    rótulos) é renderizada a 2× e os rótulos não entram no texto. Uma foto sem
    rótulos é gravada como está, na codificação original. Um desenho vetorial
    (gráfico ou esquema sem imagem embutida) é renderizado do mesmo jeito."""
    import fitz
    doc = fitz.open(pdf)
    primeira = next(i for i, p in enumerate(doc) if re.search(r"QUEST[ÃA]O\s*01\s*[–-]", p.get_text()))
    os.makedirs(PASTA_BANCA, exist_ok=True)
    # só as imagens desta fonte são refeitas: as antigas (de uma extração anterior) saem antes
    for velho in os.listdir(PASTA_BANCA):
        if velho.startswith(fonte + "-"): os.remove(os.path.join(PASTA_BANCA, velho))
    linhas, tamanhos, rotulos, atual, por_questao = [], {}, [], None, {}
    for pno in range(primeira, doc.page_count):
        page = doc[pno]
        itens = []            # ("texto", y, x, s, bbox) ou ("imagem", y, x, bloco)
        rasters = []
        for b in page.get_text("dict")["blocks"]:
            if b["type"] == 0:
                for l in b["lines"]:
                    s = "".join(sp["text"] for sp in l["spans"]).rstrip()
                    if not s.strip() or CABECALHO.match(s.strip()): continue
                    itens.append(("texto", l["bbox"][1], l["bbox"][0], s, fitz.Rect(l["bbox"])))
            elif b["bbox"][1] >= TOPO_CABECALHO and b["width"] * b["height"] >= AREA_MINIMA:
                itens.append(("imagem", b["bbox"][1], b["bbox"][0], b)); rasters.append(b)
        for g in grupos_vetoriais(page, rasters):
            itens.append(("imagem", g.y0, g.x0, {"bbox": tuple(g), "vetor": True, "ext": "png"}))
        itens.sort(key=lambda it: (round(it[1]), it[2]))
        # rótulos: linhas curtas na faixa vertical da imagem (um pouco acima e abaixo) e perto dela na horizontal
        consumidos = set()
        regioes = {}
        for i, it in enumerate(itens):
            if it[0] != "imagem": continue
            r = fitz.Rect(it[3]["bbox"])
            faixa = fitz.Rect(r.x0 - 60, r.y0 - 20, r.x1 + 60, r.y1 + 30)
            indices = [j for j, t in enumerate(itens) if t[0] == "texto" and j not in consumidos and eh_rotulo(t[3]) and faixa.contains(fitz.Point((t[4].x0 + t[4].x1) / 2, (t[4].y0 + t[4].y1) / 2))]
            if indices:
                for j in indices: r |= itens[j][4]
                consumidos.update(indices)
            regioes[i] = (r, bool(indices))
        for i, it in enumerate(itens):
            if it[0] == "texto":
                if i in consumidos:
                    if atual is not None: rotulos.append((atual, it[3].strip()))
                    continue
                s = it[3]
                m = QUESTAO.match(s)
                if m: atual = int(m.group(1))
                linhas.append(s)
            elif atual is not None:
                b = it[3]; r, com_rotulos = regioes[i]
                k = por_questao.get(atual, 0) + 1; por_questao[atual] = k
                base = f"{fonte}-{atual:02d}{'' if k == 1 else '-' + str(k)}"
                if com_rotulos or b.get("vetor"):
                    # a região inteira, a 2× (até 1600 px de largura); foto sai em JPEG, gráfico em PNG
                    r = r + ((-3, -3, 3, 3) if b.get("vetor") else (-3, -3, 3, 1))   # embaixo quase nada: a linha de texto seguinte não pode entrar
                    escala = min(2.0, 1600 / max(r.width, 1))
                    pix = page.get_pixmap(matrix=fitz.Matrix(escala, escala), clip=r, alpha=False)
                    if b["ext"] in ("jpeg", "jpg", "jpx"):
                        nome = base + ".jpg"; pix.save(os.path.join(PASTA_BANCA, nome), jpg_quality=85)
                    else:
                        nome = base + ".png"; pix.save(os.path.join(PASTA_BANCA, nome))
                    tamanhos[nome] = (pix.width, pix.height)
                else:
                    nome = base + "." + b["ext"]
                    with open(os.path.join(PASTA_BANCA, nome), "wb") as f: f.write(b["image"])
                    tamanhos[nome] = (b["width"], b["height"])
                linhas.append(f"[IMAGEM:{nome}]")
    return "\n".join(linhas) + "\n", tamanhos, rotulos

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--fonte", required=True, help="id da fonte, ex.: amrigs2025 (nomeia as imagens)")
    ap.add_argument("--blocos", default=BLOCOS_PADRAO)
    ap.add_argument("--saida", required=True)
    a = ap.parse_args()
    areas = {}
    for parte in a.blocos.split(","):
        area, faixa = parte.split(":"); ini, fim = map(int, faixa.split("-"))
        for n in range(ini, fim + 1): areas[n] = area
    bruto, tamanhos, rotulos = texto_e_imagens(a.pdf, a.fonte)
    # as linhas que viraram rótulo de imagem (e saíram do enunciado), para revisão humana
    with open(a.saida + "-rotulos.txt", "w", encoding="utf-8", newline="\n") as f: f.write("".join(f"{n}\t{s}\n" for n, s in rotulos))
    texto, decisoes = juntar_hifens(converter(bruto))
    # o .txt é o texto da banca, só texto: os marcadores de imagem ficam de fora
    # (o harness confere o enunciado palavra por palavra contra este arquivo)
    with open(a.saida + ".txt", "w", encoding="utf-8", newline="\n") as f: f.write(re.sub(r"(?m)^\[IMAGEM:[^\]]+\]\n", "", texto))
    with open(a.saida + "-hifens.txt", "w", encoding="utf-8", newline="\n") as f: f.write("\n".join(decisoes) + "\n")
    questoes = separar_fundatec(texto)
    for q in questoes:
        q["area"] = areas.get(q["numero"], "?")
        for im in q.get("imagens", []): im["w"], im["h"] = tamanhos[im["arquivo"]]
    with open(a.saida + "-questoes.json", "w", encoding="utf-8", newline="\n") as f: json.dump(questoes, f, ensure_ascii=False, indent=1)
    problemas = [q for q in questoes if "erro" in q]
    print(f"{len(questoes)} questões; {len(problemas)} com problema {[(q['numero'], q['erro']) for q in problemas]}; com imagem: {[q['numero'] for q in questoes if q.get('imagens')]}; {len(decisoes)} hifens decididos; {len(rotulos)} linhas viraram rótulo (ver {a.saida}-rotulos.txt)")
    if len(questoes) != len(areas) or [q["numero"] for q in questoes] != sorted(areas): sys.exit(1)

if __name__ == "__main__":
    main()
