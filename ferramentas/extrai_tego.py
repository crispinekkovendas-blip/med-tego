"""Extrai as questões de uma prova do TEGO (FEBRASGO) com PyMuPDF, a partir de dois
leiautes, e grava as mesmas saídas que o extrai_fundatec.py do AMRIGS (montar.js e o
harness leem as duas): <saida>.txt ("NN.<TAB>enunciado", "(A)<TAB>…"), <saida>-questoes.json
(numero, enunciado, alternativas, imagem, imagens, area, erro?), <saida>-hifens.txt (as
decisões de hífen) e <saida>-rotulos.txt (linhas de texto que viraram rótulo de uma imagem e
saíram do enunciado — leia depois de toda extração).

Os leiautes:

  --leiaute caderno   o caderno oficial (2022): "QUESTÃO" numa linha, o número na linha de
                      baixo, o enunciado à direita; alternativas "A - texto"; cabeçalho de três
                      linhas em toda página ("EXAME DE SUFICIÊNCIA…", "ESPECIALISTA EM…",
                      "PROVA DE … – TEGO – 2022") e o número da página; termina em
                      "GABARITO DA PROVA".
  --leiaute guia      o Guia da Aprovação TEGO 2026 do Estratégia MED (a prova de 2025, só as
                      páginas da prova: --paginas 5-45): "NN-<TAB>enunciado", alternativas
                      "A)<TAB>texto", rodapé "Estratégia MED | Guia…" e número da página, uma
                      imagem de fundo (quase a página inteira) em toda página, ignorada pela
                      largura. A Obstetrícia vem numerada 61–120: --desloca 60 e --faixa 61-120
                      dão a numeração oficial (1–60).

A ÁREA de cada questão não vem de blocos (as provas são só "Ginecologia" e "Obstetrícia"):
vem de um mapa escrito à mão, <saida>-areas.json ({"13": "masto", …}); questão fora do mapa
fica com area "?" (montar.js não a deixa entrar).

IMAGENS DA BANCA: todo bloco de imagem dentro de uma questão é gravado em
figuras/banca/<fonte>-NN.<ext> (-2, -3… se houver várias) e vira a linha "[IMAGEM:<arquivo>]"
no texto; a questão fica com imagem: true e imagens: [{arquivo, w, h, onde}]. Logotipos do
cabeçalho (topo da página), a imagem de fundo do guia e imagens minúsculas são ignorados.

    python ferramentas/extrai_tego.py --pdf ferramentas/cadernos/tego2022g-caderno.pdf --fonte tego2022g --leiaute caderno --saida ferramentas/cadernos/tego2022g
    python ferramentas/extrai_tego.py --pdf ferramentas/cadernos/tego2025-guia-estrategia.pdf --fonte tego2025o --leiaute guia --paginas 5-45 --faixa 61-120 --desloca 60 --saida ferramentas/cadernos/tego2025o
"""
import argparse, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extrai_questoes import juntar_hifens
from extrai_fundatec import separar_fundatec, eh_rotulo, PASTA_BANCA, AREA_MINIMA

CABECALHO_CADERNO = re.compile(r"^(EXAME DE SUFICI[ÊE]NCIA PARA OBTEN[ÇC][ÃA]O DO T[ÍI]TULO DE|ESPECIALISTA EM GINECOLOGIA E OBSTETR[ÍI]CIA|PROVA DE (GINECOLOGIA|OBSTETR[ÍI]CIA)\s*[–-]\s*TEGO\s*[–-]\s*20\d\d|\d{1,2})\s*$")
RODAPE_GUIA = re.compile(r"^(Estrat[ée]gia MED \| Guia da Aprova[çc][ãa]o TEGO \| 20\d\d|\d{1,3})\s*$")
FIM_CADERNO = re.compile(r"^GABARITO DA PROVA")
ALT_CADERNO = re.compile(r"^([A-E])\s*-(\s+|$)")   # "A - texto", ou "A -" sozinho quando a alternativa é uma imagem
ALT_GUIA = re.compile(r"^([A-E])\)\s*\t?\s*")
NUM_GUIA = re.compile(r"^(\d{1,3})-\s*\t?\s*")
TOPO = 75           # pt: imagem com o topo acima disso é logotipo do cabeçalho
LARGURA_FUNDO = 600 # pt: imagem mais larga que isso é a imagem de fundo do guia

def itens_da_pagina(page, leiaute):
    """Linhas de texto e imagens da página, na ordem de leitura, sem cabeçalho, rodapé,
    logotipos e fundo. Cada item: ("texto", y, x, s, rect), ("imagem", y, x, bloco) ou, no
    caderno, ("marcador", y, x, n) no lugar do par "QUESTÃO" + número.

    No caderno (2022) o número fica numa linha abaixo de "QUESTÃO", em letra grande, e na
    ordem (y, x) cairia depois da primeira alternativa de uma questão de enunciado curto;
    por isso o par vira um marcador na posição de "QUESTÃO". O guia (2025) mistura páginas
    de uma coluna com páginas de duas: quando nenhuma linha da esquerda passa do meio da
    página e há linhas começando à direita dele, lê-se a coluna da esquerda inteira e depois
    a da direita."""
    import fitz
    itens, meio = [], page.rect.width / 2
    for b in page.get_text("dict")["blocks"]:
        if b["type"] == 0:
            for l in b["lines"]:
                s = "".join(sp["text"] for sp in l["spans"]).rstrip()
                if not s.strip(): continue
                if leiaute == "caderno" and (l["bbox"][1] < 80 and CABECALHO_CADERNO.match(s.strip()) or l["bbox"][1] > 720 and s.strip().isdigit()): continue
                if leiaute == "guia" and (l["bbox"][1] > 830 or l["bbox"][1] < 80): continue
                itens.append(("texto", l["bbox"][1], l["bbox"][0], s, fitz.Rect(l["bbox"])))
        else:
            r = fitz.Rect(b["bbox"])
            if r.y0 < TOPO or r.width > LARGURA_FUNDO or b["width"] * b["height"] < AREA_MINIMA: continue
            itens.append(("imagem", r.y0, r.x0, b))
    duas = leiaute == "guia" and any(it[2] >= meio + 5 for it in itens if it[0] == "texto") and all(it[4].x1 <= meio + 5 for it in itens if it[0] == "texto" and it[2] < meio - 5)
    coluna = (lambda it: 0 if it[2] < meio else 1) if duas else (lambda it: 0)
    itens.sort(key=lambda it: (coluna(it), round(it[1]), it[2]))
    if leiaute != "caderno": return itens
    saida, pulados = [], set()
    for i, it in enumerate(itens):
        if i in pulados: continue
        if it[0] == "texto" and re.fullmatch(r"QUEST[ÃA]O", it[3].strip()):
            j = next((k for k in range(i + 1, min(i + 8, len(itens))) if itens[k][0] == "texto" and itens[k][2] < 110 and itens[k][3].strip().isdigit()), None)
            if j is not None:
                saida.append(("marcador", it[1], it[2], int(itens[j][3]))); pulados.add(j); continue
        saida.append(it)
    return saida

def texto_e_imagens(pdf, fonte, leiaute, paginas, faixa, desloca):
    """Devolve (texto bruto já no estilo "NN.<TAB>…"/"(A)<TAB>…" com marcadores de imagem,
    {arquivo: (w, h)}, [(questão, linha que virou rótulo)])."""
    import fitz
    doc = fitz.open(pdf)
    os.makedirs(PASTA_BANCA, exist_ok=True)
    for velho in os.listdir(PASTA_BANCA):
        if velho.startswith(fonte + "-"): os.remove(os.path.join(PASTA_BANCA, velho))
    linhas, tamanhos, rotulos, por_questao = [], {}, [], {}
    atual = None          # número oficial da questão corrente (já deslocado), ou None fora da faixa
    acabou = False
    for pno in range(paginas[0] - 1, min(paginas[1], doc.page_count)):
        if acabou: break
        page = doc[pno]
        itens = itens_da_pagina(page, leiaute)
        # rótulos: linhas curtas na faixa de uma imagem saem do enunciado e entram na imagem
        consumidos, regioes = set(), {}
        for i, it in enumerate(itens):
            if it[0] != "imagem": continue
            r = fitz.Rect(it[3]["bbox"])
            caixa = fitz.Rect(r.x0 - 60, r.y0 - 20, r.x1 + 60, r.y1 + 30)
            # uma linha de alternativa ("A -", "A)") ou de número de questão nunca é rótulo, mesmo curta e colada à imagem
            indices = [j for j, t in enumerate(itens) if t[0] == "texto" and j not in consumidos and eh_rotulo(t[3]) and not (NUM_GUIA.match(t[3].strip()) or ALT_CADERNO.match(t[3].strip()) or ALT_GUIA.match(t[3].strip())) and caixa.contains(fitz.Point((t[4].x0 + t[4].x1) / 2, (t[4].y0 + t[4].y1) / 2))]
            for j in indices: r |= itens[j][4]
            consumidos.update(indices)
            regioes[i] = (r, bool(indices))
        for i, it in enumerate(itens):
            if it[0] == "marcador":
                n = it[3]
                atual = n - desloca if faixa[0] <= n <= faixa[1] else None
                if atual is not None: linhas.append(f"{atual:02d}.\t")
            elif it[0] == "texto":
                s = it[3]; limpo = s.strip()
                if leiaute == "caderno" and FIM_CADERNO.match(limpo): acabou = True; break
                if i in consumidos:
                    if atual is not None: rotulos.append((atual, limpo))
                    continue
                if leiaute == "caderno":
                    m = ALT_CADERNO.match(limpo)
                    if m and atual is not None: linhas.append("(" + m.group(1) + ")\t" + limpo[m.end():]); continue
                else:
                    m = NUM_GUIA.match(limpo)
                    if m and it[2] < 100 or m and it[2] > 350 and len(limpo) > len(m.group(0)):
                        # "31-" sozinho numa linha (a imagem vem antes do enunciado) também abre a questão
                        n = int(m.group(1))
                        atual = n - desloca if faixa[0] <= n <= faixa[1] else None
                        if atual is not None: linhas.append(f"{atual:02d}.\t" + limpo[m.end():])
                        continue
                    m = ALT_GUIA.match(limpo)
                    if m and atual is not None: linhas.append("(" + m.group(1) + ")\t" + limpo[m.end():]); continue
                if atual is not None: linhas.append(s)
            elif atual is not None:
                b = it[3]; r, com_rotulos = regioes[i]
                k = por_questao.get(atual, 0) + 1; por_questao[atual] = k
                base = f"{fonte}-{atual:02d}{'' if k == 1 else '-' + str(k)}"
                if com_rotulos:
                    r = r + (-3, -3, 3, 1)
                    escala = min(2.0, 1600 / max(r.width, 1))
                    pix = page.get_pixmap(matrix=fitz.Matrix(escala, escala), clip=r, alpha=False)
                    if b["ext"] in ("jpeg", "jpg", "jpx"): nome = base + ".jpg"; pix.save(os.path.join(PASTA_BANCA, nome), jpg_quality=85)
                    else: nome = base + ".png"; pix.save(os.path.join(PASTA_BANCA, nome))
                    tamanhos[nome] = (pix.width, pix.height)
                else:
                    ext = "jpg" if b["ext"] in ("jpeg", "jpg") else b["ext"]
                    nome = base + "." + ext
                    with open(os.path.join(PASTA_BANCA, nome), "wb") as f: f.write(b["image"])
                    tamanhos[nome] = (b["width"], b["height"])
                linhas.append(f"[IMAGEM:{nome}]")
    # as linhas "NN.\t" vazias do caderno (número inserido antes do enunciado) grudam na linha seguinte
    saida = []
    for l in linhas:
        if saida and re.fullmatch(r"\d{2}\.\t", saida[-1]) and not l.startswith("[IMAGEM:"): saida[-1] += l.strip()
        else: saida.append(l)
    return "\n".join(saida) + "\n", tamanhos, rotulos

def faixa_de(s, padrao):
    if not s: return padrao
    a, b = s.split("-"); return (int(a), int(b))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--fonte", required=True, help="id da fonte, ex.: tego2022g (nomeia as imagens)")
    ap.add_argument("--leiaute", choices=["caderno", "guia"], required=True)
    ap.add_argument("--paginas", default=None, help="páginas a ler, ex.: 5-45 (padrão: todas)")
    ap.add_argument("--faixa", default=None, help="números a aceitar, ex.: 61-120 (padrão: 1-60)")
    ap.add_argument("--desloca", type=int, default=0, help="subtraído do número impresso (61–120 → 1–60)")
    ap.add_argument("--saida", required=True)
    a = ap.parse_args()
    paginas = faixa_de(a.paginas, (1, 9999)); faixa = faixa_de(a.faixa, (1, 60))
    bruto, tamanhos, rotulos = texto_e_imagens(a.pdf, a.fonte, a.leiaute, paginas, faixa, a.desloca)
    with open(a.saida + "-rotulos.txt", "w", encoding="utf-8", newline="\n") as f: f.write("".join(f"{n}\t{s}\n" for n, s in rotulos))
    texto, decisoes = juntar_hifens(bruto)
    with open(a.saida + ".txt", "w", encoding="utf-8", newline="\n") as f: f.write(re.sub(r"(?m)^\[IMAGEM:[^\]]+\]\n", "", texto))
    with open(a.saida + "-hifens.txt", "w", encoding="utf-8", newline="\n") as f: f.write("\n".join(decisoes) + "\n")
    questoes = separar_fundatec(texto)
    mapa = a.saida + "-areas.json"
    areas = {int(k): v for k, v in json.load(open(mapa, encoding="utf-8")).items()} if os.path.exists(mapa) else {}
    for q in questoes:
        q["area"] = areas.get(q["numero"], "?")
        for im in q.get("imagens", []): im["w"], im["h"] = tamanhos[im["arquivo"]]
    with open(a.saida + "-questoes.json", "w", encoding="utf-8", newline="\n") as f: json.dump(questoes, f, ensure_ascii=False, indent=1)
    problemas = [q for q in questoes if "erro" in q]
    esperados = list(range(faixa[0] - a.desloca, faixa[1] - a.desloca + 1))
    print(f"{len(questoes)} questões; {len(problemas)} com problema {[(q['numero'], q['erro']) for q in problemas]}; com imagem: {[q['numero'] for q in questoes if q.get('imagens')]}; sem área: {[q['numero'] for q in questoes if q['area'] == '?'][:10] if areas else 'mapa ausente'}; {len(decisoes)} hifens; {len(rotulos)} rótulos (ver {a.saida}-rotulos.txt)")
    if [q["numero"] for q in questoes] != esperados:
        print("numeração inesperada:", sorted(set(esperados) - set(q["numero"] for q in questoes))[:10], "faltando"); sys.exit(1)

if __name__ == "__main__":
    main()
