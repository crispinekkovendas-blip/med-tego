# -*- coding: utf-8 -*-
"""Gera os PDFs do caderno com o Chrome sem janela: um por área (não há PDF
completo: cada apostila é uma área, paginada, com o índice dizendo a página
de cada ficha).

    python ferramentas/pdf.py            -> pdf/caderno-<area>.pdf, um por área
    python ferramentas/pdf.py cm         -> só o de Clínica Médica

Cada área é impressa DUAS vezes: a primeira para ler, com o PyMuPDF, em que
página cada ficha começou (a etiqueta "PROVA ANO · Questão NN" só sai no
cabeçalho da ficha); a segunda com essas páginas na URL (?paginas=6,10,…),
que o caderno escreve no índice (mapa de temas e gabarito) no lugar da
estimativa do navegador. Depois confere o PDF final: o rodapé "Página 1 de
N" bate com o número de páginas e o índice bate com as fichas. Sai 1 se
algo não bater.

As opções do caderno vão pela URL (?area=ped&materia=pagina…), que caderno.js
lê sem gravar; o padrão é Sobre a matéria depois do comentário, com figuras
e quadriculado. O caderno é servido por um http.server local (o file:// não serve para
o banco.js nem para as figuras) e impresso por um perfil próprio do Chrome,
para não brigar com o Chrome aberto. As páginas são contadas com PyMuPDF.
"""
import os, subprocess, sys, time, socket, urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = os.environ.get("CHROME", r"C:\Program Files\Google\Chrome\Application\chrome.exe")
AREAS = ["obst", "gine", "onco", "repro", "masto"]
# só as áreas que já estão em meta.areas são impressas: as outras dariam um caderno vazio
PORTA = 8765
# perfil novo a cada corrida: o cache do Chrome guardava o caderno velho de
# 127.0.0.1:8765 (o http.server não manda cabeçalho de cache) e a página saía vazia
import tempfile
PERFIL = tempfile.mkdtemp(prefix="tego-pdf-chrome-")

def servidor():
    p = subprocess.Popen([sys.executable, "-m", "http.server", str(PORTA), "--bind", "127.0.0.1"], cwd=RAIZ,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        try:
            with socket.create_connection(("127.0.0.1", PORTA), timeout=0.2): return p
        except OSError: time.sleep(0.1)
    p.kill(); raise SystemExit("o http.server não subiu")

def rotulos(area):
    """as etiquetas de origem das fichas da área, na ordem do caderno"""
    import json
    r = subprocess.run(["node", os.path.join(RAIZ, "ferramentas", "questoes_json.js")], capture_output=True, text=True, encoding="utf-8")
    qs = [q for q in json.loads(r.stdout) if q["area"] == area]
    # a etiqueta da ficha é "Questão NN · <rótulo da fonte>" (caderno.js); o rótulo vem de meta.js
    m = subprocess.run(["node", "-e", "console.log(JSON.stringify(require(%s).fontes))" % json.dumps(os.path.join(RAIZ, "ferramentas", "meta.js"))], capture_output=True, text=True, encoding="utf-8")
    rotulo = {f["id"]: f["rotulo"] for f in json.loads(m.stdout)}
    return ["Questão %02d · %s" % (q["numero"], rotulo[q["fonte"]]) for q in qs]

def inicios(caminho, etiquetas):
    """em que página (1-based) cada ficha começa: a etiqueta só sai no cabeçalho dela"""
    import fitz
    doc = fitz.open(caminho); n = doc.page_count
    return [next((i + 1 for i in range(n) if doc[i].search_for(et)), None) for et in etiquetas]

def indice_do_mapa(caminho, quantas):
    """as páginas que o mapa de temas imprime na coluna da direita, de cima para
    baixo (as palavras do rodapé — "Página X de Y" — ficam na margem e saem)"""
    import fitz
    doc = fitz.open(caminho); n = doc.page_count; idx = []
    for i in range(1, n):
        texto = doc[i].get_text()
        if "Índice de questões" not in texto and not idx: continue
        if idx and "Referências" in texto: break    # acabou o índice (que pode ter mais de uma página): começaram as fichas
        r = doc[i].rect
        palavras = sorted([w for w in doc[i].get_text("words") if w[0] > r.width * 0.86 and w[3] < r.height - 36 and w[4].isdigit()], key=lambda w: (round(w[1]), w[0]))
        idx += [int(w[4]) for w in palavras]
        if len(idx) >= quantas: break
    return idx[:quantas]

def conferir_pdf(caminho, etiquetas):
    """devolve a lista de problemas: rodapé e índice contra o conteúdo"""
    import fitz
    doc = fitz.open(caminho); n = doc.page_count; problemas = []
    if not doc[0].search_for("Página 1 de %d" % n): problemas.append("rodapé: a página 1 não diz 'Página 1 de %d'" % n)
    # a capa cabe numa página: a página 2 já é o mapa de temas (ou a folha de respostas)
    if n > 1 and not (doc[1].search_for("Índice de questões") or doc[1].search_for("Folha de respostas")): problemas.append("capa: a página 2 não começa o índice (a capa transbordou)")
    ini = inicios(caminho, etiquetas)
    for et, p in zip(etiquetas, ini):
        if p is None: problemas.append("ficha '%s' não encontrada" % et)
    idx = indice_do_mapa(caminho, len(etiquetas))
    if idx != ini: problemas.append("índice: o mapa diz %s… e as fichas começam em %s…" % (idx[:6], ini[:6]))
    return problemas

def imprimir(nome, query):
    saida = os.path.join(RAIZ, "pdf", nome)
    os.makedirs(os.path.dirname(saida), exist_ok=True)
    if os.path.exists(saida): os.remove(saida)
    url = "http://127.0.0.1:%d/caderno/?%s" % (PORTA, query)
    cmd = [CHROME, "--headless=new", "--disable-gpu", "--no-first-run", "--user-data-dir=" + PERFIL,
           "--no-pdf-header-footer", "--virtual-time-budget=120000", "--run-all-compositor-stages-before-draw",
           "--print-to-pdf=" + saida, url]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
    if not os.path.exists(saida):
        print("FALHOU", nome); print(r.stderr[-2000:]); return None
    import fitz
    doc = fitz.open(saida)
    print("%-24s %4d páginas  %5.1f MB" % (nome, doc.page_count, os.path.getsize(saida) / 1e6), flush=True)
    return doc.page_count

if __name__ == "__main__":
    import re
    presentes = re.findall(r'"id": "(\w+)",\s*\n\s*"nome"', open(os.path.join(RAIZ, "banco.js"), encoding="utf-8").read())
    pedidas = sys.argv[1:] or [a for a in AREAS if a in presentes]
    p = servidor(); erros = 0
    try:
        for a in pedidas:
            ets = rotulos(a); nome = "caderno-%s.pdf" % a; caminho = os.path.join(RAIZ, "pdf", nome)
            # 1ª passada: só para ler onde cada ficha começa
            if imprimir(nome, "area=" + a) is None: erros += 1; continue
            ini = inicios(caminho, ets)
            if None in ini: print("   !", a, "ficha sem etiqueta na 1ª passada", flush=True); erros += 1; continue
            # 2ª passada: o índice exato, pela URL
            if imprimir(nome, "area=%s&paginas=%s" % (a, ",".join(map(str, ini)))) is None: erros += 1; continue
            problemas = conferir_pdf(caminho, ets)
            for pr in problemas: print("   !", a, pr, flush=True)
            print("   %s: %s" % (a, "índice e rodapé conferem" if not problemas else "%d problema(s)" % len(problemas)), flush=True)
            erros += len(problemas)
    finally:
        p.kill()
    sys.exit(1 if erros else 0)
