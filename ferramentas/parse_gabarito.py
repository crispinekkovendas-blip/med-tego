"""Gabarito oficial em linhas "NN X" (X = A–E, ou * para anulada).

Entrada: o texto (pdftotext -layout) do edital de divulgação do gabarito, que
lista todas as provas ("001. PROVA OBJETIVA", "002. …") com pares "NN - X";
opcionalmente o texto (pdftotext -raw) do edital de análise de recursos, de
onde saem as anulações da prova pedida, e/ou uma lista manual --anuladas.

    python ferramentas/parse_gabarito.py --preliminar cadernos/susp2026-gabarito-preliminar.txt \
        --recursos cadernos/susp2026-recursos.txt --prova 001 --saida cadernos/susp2026-gabarito.txt

Quando o edital de recursos é uma imagem (UNESP 2026), as trocas entram à
mão: --alteracoes "42=B" e --anuladas "…". Quando o edital de resultado já
traz o gabarito após os recursos (Einstein), ele é a própria --preliminar
("N" = anulada).
"""
import argparse, re, sys

def letras_da_prova(texto, prova):
    """Os pares "NN - X" do bloco da prova pedida, até o bloco seguinte.
    Sem cabeçalho "NNN. PROVA OBJETIVA" (gabarito transcrito por cursinho,
    como o do SUS-SP 2021), o texto inteiro é o bloco. Uma letra seguida de
    asterisco ("27- A*") é questão anulada e vira "*"."""
    # "001. PROVA OBJETIVA" (SUS-SP), "001. PROVA ESCRITA OBJETIVA" (UNESP,
    # Einstein) e até "01. PROVA ESCRITA OBJETIVA" (edital de resultado do
    # Einstein 2025): o número da prova é comparado com zeros à esquerda
    blocos = re.split(r"(?m)^\s*(\d{2,3})\.\s*PROVA\s+(?:ESCRITA\s+)?OBJETIVA", texto)
    # blocos = [antes, "001", corpo, "002", corpo, ...]
    corpo = None
    if len(blocos) == 1:
        corpo = texto
    for i in range(1, len(blocos), 2):
        if blocos[i].zfill(3) == prova.zfill(3):
            corpo = blocos[i + 1]
    if corpo is None:
        raise SystemExit(f"prova {prova} não encontrada no gabarito")
    # "11 - N" (Einstein, gabarito após recursos) é questão anulada
    pares = re.findall(r"(\d{1,3})\s*-\s*([A-EN])(\*?)(?![A-Za-z])", corpo)
    letras = {}
    for n, x, anulada in pares:
        n = int(n)
        if n in letras:
            break          # a numeração recomeçou: acabou a prova
        letras[n] = "*" if anulada or x == "N" else x
    return letras

def anuladas_do_edital(raw, prova):
    """Questões da prova pedida marcadas ANULADA no edital de recursos.
    O -raw do SUS-SP quebra em três linhas: "001 - Prova" / "Objetiva" /
    "1 23 ANULADA" (versão 1, questão 23). Outros editais (FAMEMA) trazem
    tudo numa linha, sem versão: "001 - Prova Objetiva 36 ANULADA"."""
    anuladas = set()
    atual = None
    for linha in raw.splitlines():
        linha = linha.strip()
        m = re.match(r"^(\d{3}) - Prova Objetiva (\d+) ANULADA$", linha)
        if m:
            if m.group(1) == prova:
                anuladas.add(int(m.group(2)))
            atual = None
            continue
        m = re.match(r"^(\d{3}) - Prova(?: Objetiva)?$", linha)
        if m:
            atual = m.group(1)
            continue
        m = re.match(r"^\d+ (\d+) ANULADA$", linha)
        if m and atual == prova:
            anuladas.add(int(m.group(1)))
    return anuladas

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preliminar", required=True)
    ap.add_argument("--recursos")
    ap.add_argument("--anuladas", default="")
    ap.add_argument("--alteracoes", default="", help='letras trocadas pelo edital de recursos, ex.: "42=B,83=B"')
    ap.add_argument("--prova", default="001")
    ap.add_argument("--saida", required=True)
    a = ap.parse_args()
    with open(a.preliminar, encoding="utf-8", errors="replace") as f:
        letras = letras_da_prova(f.read(), a.prova)
    anuladas = set(int(x) for x in a.anuladas.split(",") if x.strip())
    for troca in [x for x in a.alteracoes.split(",") if x.strip()]:
        n, x = troca.split("=")
        if int(n) not in letras:
            raise SystemExit(f"alteração da questão {n}, que não está no gabarito")
        letras[int(n)] = x.strip().upper()
    if a.recursos:
        with open(a.recursos, encoding="utf-8", errors="replace") as f:
            anuladas |= anuladas_do_edital(f.read(), a.prova)
    if sorted(letras) != list(range(1, len(letras) + 1)):
        raise SystemExit(f"numeração com buracos: {sorted(letras)[:10]}…")
    with open(a.saida, "w", encoding="utf-8", newline="\n") as f:
        for n in sorted(letras):
            f.write(f"{n} {'*' if n in anuladas or letras[n] == '*' else letras[n]}\n")
    anuladas |= {n for n, x in letras.items() if x == '*'}
    print(f"{a.saida}: {len(letras)} questões, anuladas {sorted(anuladas) or 'nenhuma'}")

if __name__ == "__main__":
    main()
