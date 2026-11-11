"""Gabarito definitivo da Fundatec (Prova AMB, AMRIGS, ACM e AMMS) em duas saídas:
<fonte>-gabarito.txt — linhas "NN X" (X = A–D, ou * para anulada), como montar.js
e o harness leem — e <fonte>-recursos.json — as questões que têm justificativa
no edital (MANTIDA / ALTERA / ANULADA) e a letra que a banca sustentou. Também
grava o texto do PDF em <fonte>-gabarito-definitivo.txt, para conferência.

    python ferramentas/parse_fundatec.py --pdf ferramentas/cadernos/amrigs2025-gabarito-definitivo.pdf --saida ferramentas/cadernos/amrigs2025

O quadro de gabaritos sai do PDF como colunas: vinte números, depois as vinte
letras; os números abrem vagas e as letras (ou *) as preenchem, na ordem. Depois
das 100 do acesso direto o mesmo edital pode trazer as provas de pré-requisito
(numeração que recomeça): o parser para no total pedido.

As justificativas: "QUESTÃO: N – MANTIDA alternativa 'X'." / "ALTERA GABARITO DE
ALTERNATIVA 'X' PARA ALTERNATIVA 'Y'." / "ANULADA." — com aspas retas ou curvas
(a 20 de 2025 sai como 'D’). Uma linha "QUESTÃO: N –" que não casa com nenhuma
dessas formas é erro: o parser lista e sai 1, para a próxima redação da banca
não passar em silêncio.
"""
import argparse, json, re, sys

CABECALHO_QUADRO = "AUTOAVALIAÇÃO E ACESSO DIRETO"
ASPA = "['‘’\"“”]"
VEREDITO = re.compile(r"QUEST[ÃA]O:?\s*(\d{1,3})\s*[–-]\s*(?:(MANTIDA)\s+alternativa\s+" + ASPA + r"([A-E])" + ASPA +
                      r"|(ALTERA)\s+GABARITO\s+DE\s+ALTERNATIVA\s+" + ASPA + r"[A-E]" + ASPA + r"\s+PARA\s+ALTERNATIVA\s+" + ASPA + r"([A-E])" + ASPA +
                      r"|(ANULADA))", re.I)
LINHA_QUESTAO = re.compile(r"QUEST[ÃA]O:?\s*(\d{1,3})\s*[–-]")

def texto_do_pdf(pdf):
    import fitz
    return "\n".join(p.get_text() for p in fitz.open(pdf))

def letras_definitivas(texto, total=100):
    ini = texto.find(CABECALHO_QUADRO)
    if ini < 0:
        raise SystemExit(f"não achei o quadro '{CABECALHO_QUADRO}' no gabarito")
    letras, vagas = {}, []
    for t in re.findall(r"(?m)^[ \t]*(\d{1,3}|[A-E]|\*)[ \t]*$", texto[ini:]):
        if t.isdigit():
            n = int(t)
            if n < 1 or n > total or n in letras or n in vagas:
                break                      # a numeração recomeçou: acabou o acesso direto
            vagas.append(n)
        elif vagas:
            letras[vagas.pop(0)] = t
        if len(letras) == total:
            break
    if sorted(letras) != list(range(1, total + 1)):
        raise SystemExit(f"gabarito incompleto: {len(letras)} de {total} letras ({sorted(set(range(1, total + 1)) - set(letras))[:10]} faltando)")
    return letras

def secoes_acesso_direto(texto):
    """As seções MATÉRIA cujo CARGO inclui ACESSO DIRETO (ou sem linha de CARGO)."""
    for secao in re.split(r"(?m)^\s*MAT[ÉE]RIA:", texto)[1:]:
        cargo = re.search(r"(?m)^\s*CARGO\(S\):([^\n]*)", secao)
        if cargo and "ACESSO DIRETO" not in cargo.group(1).upper():
            continue
        yield secao

def recursos(texto):
    saida = {}
    for secao in secoes_acesso_direto(texto):
        for m in VEREDITO.finditer(secao):
            n = int(m.group(1))
            if m.group(2): saida.setdefault(n, {"veredito": "MANTIDA", "letra": m.group(3).upper()})
            elif m.group(4): saida.setdefault(n, {"veredito": "ALTERA", "letra": m.group(5).upper()})
            else: saida.setdefault(n, {"veredito": "ANULADA", "letra": None})
    return saida

def sem_veredito(texto):
    """Os números das linhas "QUESTÃO: N –" (acesso direto) que não casam com forma nenhuma de veredito."""
    fora = []
    for secao in secoes_acesso_direto(texto):
        for m in LINHA_QUESTAO.finditer(secao):
            if not VEREDITO.match(secao, m.start()):
                fora.append(int(m.group(1)))
    return fora

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--total", type=int, default=100)
    ap.add_argument("--saida", required=True, help="prefixo, ex.: ferramentas/cadernos/amrigs2025")
    a = ap.parse_args()
    texto = texto_do_pdf(a.pdf)
    with open(a.saida + "-gabarito-definitivo.txt", "w", encoding="utf-8", newline="\n") as f: f.write(texto)
    letras = letras_definitivas(texto, a.total)
    rec = recursos(texto)
    erros = [f"questão {n}: linha de justificativa que o parser não reconhece (nova redação da banca?)" for n in sem_veredito(texto)]
    for n, r in rec.items():
        if n not in letras: erros.append(f"recurso da questão {n}, que não está no quadro"); continue
        if r["veredito"] == "ANULADA" and letras[n] != "*": erros.append(f"questão {n}: ANULADA no texto, {letras[n]} no quadro")
        if r["letra"] and letras[n] != r["letra"]: erros.append(f"questão {n}: o texto sustenta {r['letra']}, o quadro diz {letras[n]}")
    with open(a.saida + "-gabarito.txt", "w", encoding="utf-8", newline="\n") as f:
        f.write("".join(f"{n} {letras[n]}\n" for n in sorted(letras)))
    with open(a.saida + "-recursos.json", "w", encoding="utf-8", newline="\n") as f:
        json.dump({str(n): rec[n] for n in sorted(rec)}, f, ensure_ascii=False, indent=1)
    anuladas = [n for n, x in letras.items() if x == "*"]
    print(f"{len(letras)} letras; anuladas {anuladas}; {len(rec)} questões com justificativa ({sum(1 for r in rec.values() if r['veredito'] == 'ALTERA')} alteradas)")
    for e in erros: print("  !", e)
    if erros: sys.exit(1)

if __name__ == "__main__":
    main()
