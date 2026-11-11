"""Gabarito oficial de uma prova do TEGO em <fonte>-gabarito.txt (linhas "NN X", como montar.js
e o harness leem) e <fonte>-recursos.json vazio ({}): a FEBRASGO não publica justificativas de
recursos, então nenhuma questão tem o parágrafo "Nos recursos, a banca".

Dois leiautes de quadro, ambos lidos como pares número/letra em linhas sucessivas do texto:

  --leiaute caderno   o caderno oficial (2022): "GABARITO DA PROVA" / "Questão Gabarito" / 1 / C / 2 / A …
  --leiaute guia      o Guia da Aprovação TEGO 2026 (prova de 2025): "QUESTÕES RESPOSTAS" / 1 / C / 2 / C …,
                      numerado 1–120 (Ginecologia 1–60, Obstetrícia 61–120): --faixa 61-120 --desloca 60

Se um segundo PDF com o mesmo quadro é dado em --confere, os dois têm de bater letra por letra.

    python ferramentas/gabarito_tego.py --pdf ferramentas/cadernos/tego2022g-caderno.pdf --leiaute caderno --confere ferramentas/cadernos/tego2022-gabarito-definitivo-medgrupo.pdf --qual 1 --saida ferramentas/cadernos/tego2022g
    python ferramentas/gabarito_tego.py --pdf ferramentas/cadernos/tego2025-guia-estrategia.pdf --leiaute guia --faixa 61-120 --desloca 60 --saida ferramentas/cadernos/tego2025o
"""
import argparse, json, re, sys

INICIO = {"caderno": "GABARITO DA PROVA", "guia": "QUESTÕES\nRESPOSTAS"}

def texto_do_pdf(pdf):
    import fitz
    return "\n".join(p.get_text() for p in fitz.open(pdf))

def pares(linhas):
    """Pares (número, letra) em linhas sucessivas; para quando o número volta a aparecer."""
    d = {}
    for a, b in zip(linhas, linhas[1:]):
        if a.isdigit() and re.fullmatch(r"[A-E]", b):
            n = int(a)
            if n in d: break
            d[n] = b
    return d

def quadros(texto, leiaute):
    """Os quadros do texto (um por prova no caderno, 60 pares; quatro colunas de 30 no guia),
    cada um {numero: letra}. Linhas de rodapé/cabeçalho no meio do quadro não formam pares."""
    marca = INICIO[leiaute]
    saida = []
    for m in re.finditer(re.escape(marca), texto):
        linhas = [l.strip() for l in texto[m.end():m.end() + 6000].split("\n") if l.strip()]
        d = pares(linhas)
        if len(d) >= 30: saida.append(d)
    return saida

def letras(pdf, leiaute, qual, faixa, desloca):
    qs = quadros(texto_do_pdf(pdf), leiaute)
    if not qs: raise SystemExit(f"nenhum quadro de gabarito em {pdf}")
    if leiaute == "caderno":
        d = qs[qual - 1]
    else:
        d = {}
        for q in qs: d.update(q)
    d = {n - desloca: l for n, l in d.items() if faixa[0] <= n <= faixa[1]}
    esperados = list(range(1, faixa[1] - faixa[0] + 2))
    if sorted(d) != esperados: raise SystemExit(f"gabarito incompleto em {pdf}: {len(d)} letras, faltam {sorted(set(esperados) - set(d))[:10]}")
    return d

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--leiaute", choices=["caderno", "guia"], required=True)
    ap.add_argument("--qual", type=int, default=1, help="qual quadro do PDF (1 = primeiro); o PDF do Medgrupo tem Ginecologia e depois Obstetrícia")
    ap.add_argument("--faixa", default="1-60")
    ap.add_argument("--desloca", type=int, default=0)
    ap.add_argument("--confere", default=None, help="segundo PDF com o mesmo quadro; tem de bater")
    ap.add_argument("--confere-qual", type=int, default=1)
    ap.add_argument("--saida", required=True)
    a = ap.parse_args()
    faixa = tuple(int(x) for x in a.faixa.split("-"))
    d = letras(a.pdf, a.leiaute, a.qual, faixa, a.desloca)
    if a.confere:
        d2 = letras(a.confere, a.leiaute, a.confere_qual, faixa, a.desloca)
        difs = {n: (d[n], d2.get(n)) for n in d if d2.get(n) != d[n]}
        if difs: raise SystemExit(f"os dois quadros divergem: {difs}")
    with open(a.saida + "-gabarito.txt", "w", encoding="utf-8", newline="\n") as f: f.write("".join(f"{n} {d[n]}\n" for n in sorted(d)))
    with open(a.saida + "-recursos.json", "w", encoding="utf-8", newline="\n") as f: f.write("{}\n")
    cont = {l: sum(1 for x in d.values() if x == l) for l in "ABCD"}
    print(f"{len(d)} letras ({cont}); recursos.json vazio (a FEBRASGO não publica justificativas)" + (" — confere com o segundo PDF" if a.confere else ""))

if __name__ == "__main__":
    main()
