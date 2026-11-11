"""Extrai as questões de um caderno VUNESP (PDF) com PyMuPDF.

Por página, os blocos de texto são ordenados assim: um bloco "largo" (cruza
o centro da página) abre uma faixa vertical; dentro de cada faixa vêm primeiro
os blocos da coluna esquerda, depois os da direita, cada um de cima para
baixo. Isso reproduz a ordem de leitura de um caderno em duas colunas em que
algumas questões são compostas na largura toda. Blocos de imagem viram a
linha "[IMAGEM]" (a questão que a contém é marcada `imagem: true`).

Hifens de fim de linha: hífen suave (U+00AD) é sempre hifenização e some;
hífen comum junta as duas partes, salvo quando a parte esquerda é um prefixo
que leva hífen (pré, pós, recém…) ou um prefixo que leva hífen diante de h
ou de vogal igual (anti-histamínico, intra-abdominal). Toda decisão vai para
<saida>-hifens.txt, para revisão humana.

    python ferramentas/extrai_questoes.py --pdf ferramentas/cadernos/susp2026-caderno.pdf \
        --primeira-pagina 3 --rodape "SESA2504/001-AcessoDireto|Confidencial até o momento da aplicação\\." \
        --blocos "cm:1-20,cir:21-40,ped:41-60,go:61-80,prev:81-100" --saida ferramentas/cadernos/susp2026
"""
import argparse, json, re, sys

SEMPRE_HIFEN = {"pré", "pós", "pró", "recém", "ex", "vice", "bem", "mal", "não", "sem", "além", "aquém",
                "grão", "grã", "anos", "beta", "alfa", "gama", "delta", "ômega", "primeiro", "segundo"}
PREFIXOS = {"anti", "auto", "contra", "extra", "infra", "intra", "semi", "sub", "super", "ultra", "micro",
            "macro", "neo", "pan", "co", "multi", "inter", "trans", "hiper", "hipo", "mini", "sobre",
            "pseudo", "retro", "supra", "ante", "arqui", "sócio", "socio", "tele", "agro", "eletro", "geo",
            "hidro", "mega", "poli", "proto", "psico", "auto", "peri", "endo", "epi", "para"}

# palavras inteiras que a quebra faz parecer prefixo + palavra
NAO_SAO_COMPOSTOS = {"pré-via", "pré-vias", "pré-vio", "pré-vios", "inter-rogar", "inter-rogatório", "inter-romper",
                     "inter-rompida", "inter-rompido", "inter-rupção", "super-visão", "sub-stância", "sub-stituir",
                     "sem-pre"}

def juntar_hifens(texto):
    texto = texto.replace("\xad\n", "").replace("\xad", "")
    # hífen repetido na quebra ("queixa-\n-se", "Ringer-\n-lactato"): a banca
    # repete o hífen de um composto/ênclise partido — fica UM hífen, sem quebra
    texto = re.sub(r"([^\W\d_]+)-[ \t]*\n[ \t]*-([^\W\d_]+)", r"\1-\2", texto)
    # espaço perdido entre o hífen e a quebra ("proges- \nterona") vira "-\n"
    texto = re.sub(r"-[ \t]+\n", "-\n", texto)
    decisoes = []
    def f(m):
        a, b = m.group(1), m.group(2)
        al = a.lower()
        composto = (a + "-" + b).lower()
        mantem = composto not in NAO_SAO_COMPOSTOS and (al in SEMPRE_HIFEN or (al in PREFIXOS and (b[0].lower() == "h" or (b[0].lower() == al[-1] and al[-1] in "aeiou") or (al == "sub" and b[0].lower() in "br"))))
        saida = a + "-" + b if mantem else a + b
        decisoes.append(f"{a}-/{b} → {saida}" + (" (mantido)" if mantem else ""))
        return saida
    return re.sub(r"([^\W\d_]+)-\n\s*([^\W\d_]+)", f, texto), decisoes

def texto_ordenado(pdf, primeira_pagina):
    import fitz
    doc = fitz.open(pdf)
    linhas = []
    for pno in range(primeira_pagina - 1, doc.page_count):
        page = doc[pno]
        w = page.rect.width
        blocos = page.get_text("blocks")
        # largo = cruza o centro da página (uma instrução centrada de uma linha
        # também é larga, mesmo com menos de 60 % da largura)
        largo = lambda b: b[0] < w / 2 - 10 and b[2] > w / 2 + 10
        largos = sorted([b for b in blocos if largo(b)], key=lambda b: b[1])
        def faixa(b):
            return sum(1 for l in largos if l[1] <= b[1] + 1)
        def chave(b):
            if largo(b):
                return (2 * largos.index(b), 0, round(b[1]))
            col = 0 if (b[0] + b[2]) / 2 < w / 2 else 1
            return (2 * faixa(b) - 1, col, round(b[1]))
        for b in sorted(blocos, key=chave):
            linhas.append("[IMAGEM]" if b[6] == 1 else b[4].rstrip("\n"))
    return "\n".join(linhas)

def limpar(texto, rodape):
    padrao = r"(?m)^\s*(" + rodape + r"|\d{1,2})\s*$\n?"
    return re.sub(padrao, "", texto)

# instrução que abre um texto compartilhado por uma faixa de questões; o
# texto vai da instrução até o número da questão seguinte
APOIO = re.compile(r"(?m)^(?:As quest[õo]es de n[úu]meros (\d+) (?:e|a) (\d+) referem-se .*|Considere .*? para responder [àa]s quest[õo]es de n[úu]meros (\d+) (?:e|a) (\d+)\.|Leia o texto a seguir para responder [àa]s quest[õo]es de (\d+) a (\d+):?)[ \t]*$")

def texto_de_apoio(bruto):
    """(texto_sem_apoio, apoio) — apoio = {"de", "ate", "html"} ou None."""
    m = APOIO.search(bruto)
    if not m:
        return bruto, None
    de, ate = [int(g) for g in m.groups() if g][:2]
    instrucao = re.sub(r"\s+", " ", m.group(0)).strip()
    caso = re.sub(r"\s+", " ", bruto[m.end():]).strip()
    html = f"<p><em>{instrucao}</em></p>" + (f"<p>{caso}</p>" if caso else "")
    return bruto[:m.start()], {"de": de, "ate": ate, "html": html}

ESTILOS = {
    "ponto": r"(?m)^(\d{2,3})\.\t[ ]*",              # "01.<TAB>" (SUS-SP, Einstein)
    "questao": r"(?m)^QUESTÃO[  ]+(\d{2,3})\t[ ]*",  # "QUESTÃO 03<TAB>" (UNESP; espaço fino U+2009)
}

def separar_questoes(texto, estilo="ponto"):
    partes = re.split(ESTILOS[estilo], texto)
    limpa = lambda s: re.sub(r"\s+", " ", s).strip()
    questoes = []
    apoios = []
    _, apoio = texto_de_apoio(partes[0])      # um texto antes da primeira questão
    if apoio: apoios.append(apoio)
    for i in range(1, len(partes), 2):
        numero, corpo = int(partes[i]), partes[i + 1]
        m = re.search(r"(?m)^\(A\)\t[ ]*", corpo)
        if not m:
            questoes.append({"numero": numero, "erro": "sem alternativa (A)"}); continue
        enunciado, resto = corpo[:m.start()], corpo[m.start():]
        resto, apoio = texto_de_apoio(resto)   # o texto das questões seguintes vem depois da (E)
        alts = re.split(r"(?m)^\(([A-E])\)\t[ ]*", resto)
        letras, textos = alts[1::2], [limpa(t) for t in alts[2::2]]
        imagem = "[IMAGEM]" in enunciado or any("[IMAGEM]" in t for t in textos)
        enunciado = limpa(enunciado.replace("[IMAGEM]", " "))
        textos = [limpa(t.replace("[IMAGEM]", " ")) for t in textos]
        q = {"numero": numero, "enunciado": enunciado, "alternativas": textos, "imagem": imagem}
        for a in apoios:
            if a["de"] <= numero <= a["ate"]:
                q["texto"] = a["html"]
        # cinco alternativas (SUS-SP) ou quatro (UNESP, Einstein): as que a banca deu
        if letras not in (list("ABCDE"), list("ABCD")):
            q["erro"] = f"alternativas {letras}"
        # alternativa sem texto = alternativa que é uma imagem (formulário de DO na UNESP 2026, questão 87)
        elif any(not t for t in textos):
            q["erro"] = "alternativa vazia (imagem)"; q["imagem"] = True
        questoes.append(q)
        if apoio: apoios.append(apoio)
    return questoes

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--primeira-pagina", type=int, default=1)
    ap.add_argument("--rodape", default=r"Confidencial até o momento da aplicação\.")
    ap.add_argument("--blocos", required=True, help='ex.: "cm:1-20,cir:21-40,ped:41-60,go:61-80,prev:81-100"')
    ap.add_argument("--estilo", default="ponto", choices=sorted(ESTILOS), help='numeração: "ponto" (01.) ou "questao" (QUESTÃO 03)')
    ap.add_argument("--saida", required=True)
    a = ap.parse_args()
    areas = {}
    for parte in a.blocos.split(","):
        area, faixa = parte.split(":"); ini, fim = map(int, faixa.split("-"))
        for n in range(ini, fim + 1): areas[n] = area
    texto = limpar(texto_ordenado(a.pdf, a.primeira_pagina), a.rodape)
    texto, decisoes = juntar_hifens(texto)
    with open(a.saida + ".txt", "w", encoding="utf-8", newline="\n") as f: f.write(texto)
    with open(a.saida + "-hifens.txt", "w", encoding="utf-8", newline="\n") as f: f.write("\n".join(decisoes) + "\n")
    questoes = separar_questoes(texto, a.estilo)
    problemas = [q for q in questoes if "erro" in q]
    for q in questoes:
        q["area"] = areas.get(q["numero"], "?")
    with open(a.saida + "-questoes.json", "w", encoding="utf-8", newline="\n") as f:
        json.dump(questoes, f, ensure_ascii=False, indent=1)
    imagens = [q["numero"] for q in questoes if q.get("imagem")]
    print(f"{len(questoes)} questões; {len(problemas)} com problema {[(q['numero'], q['erro']) for q in problemas]}; com imagem: {imagens}; {len(decisoes)} hifens decididos (ver {a.saida}-hifens.txt)")
    if problemas or len(questoes) != len(areas):
        sys.exit(1)

if __name__ == "__main__":
    main()
