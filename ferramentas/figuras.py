# -*- coding: utf-8 -*-
"""Figuras do banco: uma imagem por questão, do Wikimedia Commons, com
licença aceita (CC0, domínio público, CC BY, CC BY-SA).

  python ferramentas/figuras.py candidatos            # busca CONSULTAS; grava figuras/candidatos.json
  python ferramentas/figuras.py candidatos2..4        # rodadas extras (CONSULTAS2..4) para os ids que ficaram mal
  python ferramentas/figuras.py escolher              # 1ª candidata por questão → figuras/escolhas.json (ponto de partida)
  python ferramentas/figuras.py baixar [id ...]       # baixa as escolhas para figuras/<id>.jpg
  python ferramentas/figuras.py folha [id ...]        # folhas de contato figuras/_folha-N.png, para olhar as escolhas
  python ferramentas/figuras.py trocar <id> "File:X"  # troca a escolha de uma questão e rebaixa
  python ferramentas/figuras.py gerar                 # figuras/figuras.json + figuras/FONTES.md a partir do que foi baixado

O caminho feito: candidatos → (rodadas extras) → escolhas.json ajustado à mão
(cada imagem foi olhada numa folha de contato) → baixar → gerar. A legenda de
cada figura é escrita à mão em ferramentas/legendas.js; montar.js junta
figuras.json + legendas.js à questão pelo id. CONSULTAS: por id do banco, as
buscas em inglês (o Commons responde melhor), da mais específica à mais
genérica."""
import io, json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import commons

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
PASTA = os.path.join(RAIZ, "figuras")
CANDIDATOS = os.path.join(PASTA, "candidatos.json")
ESCOLHAS = os.path.join(PASTA, "escolhas.json")

CONSULTAS = {
  # Obstetrícia — TEGO Obstetrícia 2025 (obst01 = questão 1, obst02 = questão 2)
  "obst01": ["monochorionic diamniotic twin pregnancy ultrasound", "twin pregnancy ultrasound", "twins ultrasound"],
  "obst02": ["Toxoplasma gondii tachyzoites", "congenital toxoplasmosis intracranial calcification", "Toxoplasma gondii"],
}

MIN_LADO = 400


def candidatos():
    """Para cada id ainda sem candidatas, até 6 com licença aceita, JPEG/PNG, lado ≥ 400 px.
    Os ids que já estão em candidatos.json não são refeitos."""
    saida = json.load(open(CANDIDATOS, encoding="utf-8")) if os.path.exists(CANDIDATOS) else {}
    for qid, buscas in CONSULTAS.items():
        if qid in saida:
            continue
        lista = []
        for termo in buscas:
            try:
                r = commons.api({"action": "query", "generator": "search", "gsrsearch": termo, "gsrnamespace": 6,
                                 "gsrlimit": 15, "prop": "imageinfo", "iiprop": "url|extmetadata|size|mime", "iiurlwidth": 1400})
            except Exception as e:
                print(qid, termo, "ERRO", e); time.sleep(2); continue
            for p in sorted(r.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 99)):
                i = commons.info(p)
                if i["ok"] and i["mime"] in ("image/jpeg", "image/png") and (i["w"] or 0) >= MIN_LADO and (i["h"] or 0) >= MIN_LADO:
                    i["busca"] = termo
                    if all(i["titulo"] != x["titulo"] for x in lista):
                        lista.append(i)
            if len(lista) >= 4:
                break
            time.sleep(0.3)
        saida[qid] = lista[:6]
        print("%-7s %d candidatas  %s" % (qid, len(lista), (lista[0]["titulo"][:70] if lista else "— NADA —")))
    json.dump(saida, open(CANDIDATOS, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


def escolher():
    c = json.load(open(CANDIDATOS, encoding="utf-8"))
    e = json.load(open(ESCOLHAS, encoding="utf-8")) if os.path.exists(ESCOLHAS) else {}
    for qid, lista in c.items():
        if qid not in e and lista:
            e[qid] = lista[0]["titulo"]
    json.dump(e, open(ESCOLHAS, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("%d escolhas; sem candidata: %s" % (len(e), [q for q in CONSULTAS if q not in e]))


def baixar(ids=None):
    e = json.load(open(ESCOLHAS, encoding="utf-8"))
    linhas = []
    for qid, titulo in e.items():
        if ids and qid not in ids:
            continue
        destino = os.path.join(PASTA, qid + ".jpg")
        if os.path.exists(destino) and not ids:
            continue
        buf = io.StringIO(); antigo = sys.stdout; sys.stdout = buf
        try:
            commons.baixar(titulo, destino)
        except (SystemExit, Exception) as ex:   # 404, rede: segue para a próxima, o gerar acusa depois
            sys.stdout = antigo; print(qid, "FALHOU:", titulo, "->", ex); continue
        finally:
            sys.stdout = antigo
        for l in buf.getvalue().splitlines():
            if l.startswith("FONTES.md: "):
                linhas.append(l[len("FONTES.md: "):].replace(destino.replace(os.sep, "/"), "figuras/" + qid + ".jpg"))
        print(qid, "ok", titulo[:60])
        time.sleep(0.4)
    fontes = os.path.join(PASTA, "FONTES.md")
    if not os.path.exists(fontes):
        open(fontes, "w", encoding="utf-8", newline="\n").write(
            "# Fontes das figuras\n\nToda imagem vem do Wikimedia Commons sob CC0, domínio público, CC BY ou CC BY-SA — nunca NC, nunca ND. "
            "A linha de `fonte:` em ferramentas/figuras.js traz autor e licença; a página de origem fica aqui. "
            "Reduzidas para no máximo 1400 px (JPEG 85) com ferramentas/commons.py, chamado por ferramentas/figuras.py.\n\n"
            "| Arquivo | Título no Commons | Autor | Licença | Página | Tamanho gravado |\n|---|---|---|---|---|---|\n")
    with open(fontes, "a", encoding="utf-8", newline="\n") as f:
        for l in linhas:
            f.write(l + "\n")


def folha(ids=None):
    """Folhas de contato: 20 miniaturas por folha, com o id em cima de cada uma."""
    from PIL import Image, ImageDraw
    ids = ids or [q for q in CONSULTAS if os.path.exists(os.path.join(PASTA, q + ".jpg"))]
    por = 20; larg, alt = 260, 220
    for n in range(0, len(ids), por):
        grupo = ids[n:n + por]
        folha_im = Image.new("RGB", (5 * larg, 4 * (alt + 22)), "white")
        d = ImageDraw.Draw(folha_im)
        for k, qid in enumerate(grupo):
            im = Image.open(os.path.join(PASTA, qid + ".jpg")).convert("RGB")
            im.thumbnail((larg - 8, alt - 8))
            x, y = (k % 5) * larg, (k // 5) * (alt + 22)
            folha_im.paste(im, (x + 4, y + 22))
            d.text((x + 6, y + 4), qid, fill="black")
        nome = os.path.join(PASTA, "_folha-%d.png" % (n // por + 1))
        folha_im.save(nome)
        print(nome, grupo)


# Segunda rodada: ids cuja primeira busca trouxe diagrama ou tema errado.
# Terceira rodada: os que ainda ficaram sem foto.



# Clínica Médica, segunda rodada: as sem candidata e as de primeira escolha ruim (2026-10-07)

# As rodadas extras são por sessão: as da Clínica Médica (cm02, cm07, cm08, cm15,
# cm17, cm23–cm25, cm27, cm30, cm39, cm40, cm42, cm46, cm48–cm50) estão no histórico
# do git (commit 1e913eb); os candidatos que elas acharam seguem em figuras/candidatos.json.
CONSULTAS2 = {
}
CONSULTAS3 = {
}
CONSULTAS4 = {
}

def candidatos2(tabela=None):
    c = json.load(open(CANDIDATOS, encoding="utf-8"))
    for qid, buscas in (tabela or CONSULTAS2).items():
        novos = []
        for termo in buscas:
            try:
                r = commons.api({"action": "query", "generator": "search", "gsrsearch": termo, "gsrnamespace": 6,
                                 "gsrlimit": 15, "prop": "imageinfo", "iiprop": "url|extmetadata|size|mime", "iiurlwidth": 1400})
            except Exception as e:
                print(qid, termo, "ERRO", e); time.sleep(2); continue
            for p in sorted(r.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 99)):
                i = commons.info(p)
                if i["ok"] and i["mime"] in ("image/jpeg", "image/png") and (i["w"] or 0) >= MIN_LADO and (i["h"] or 0) >= MIN_LADO:
                    i["busca"] = termo
                    if all(i["titulo"] != x["titulo"] for x in novos + c.get(qid, [])):
                        novos.append(i)
            time.sleep(0.3)
        c[qid] = novos[:10] + c.get(qid, [])
        print(qid)
        for i in novos[:10]:
            print("    ", i["titulo"][5:95], "|", i["w"], "x", i["h"], "|", i["lic"][:14], "|", i["busca"])
    json.dump(c, open(CANDIDATOS, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


# Autores que o Commons devolve sujos (HTML, aviso, "?") — o nome que entra na fonte.
AUTORES = {
}


def gerar():
    """figuras/figuras.json (fatos da máquina: arquivo, tamanho, autor, licença,
    página) e figuras/FONTES.md, os dois a partir de escolhas.json + candidatos.json
    + os arquivos gravados. A legenda fica à parte, em ferramentas/legendas.js."""
    import re
    from PIL import Image
    c = json.load(open(CANDIDATOS, encoding="utf-8"))
    e = json.load(open(ESCOLHAS, encoding="utf-8"))
    saida = {}
    linhas = ["# Fontes das figuras", "",
              "Toda imagem vem do Wikimedia Commons sob CC0, domínio público, CC BY ou CC BY-SA — nunca NC, nunca ND. "
              "Cada uma foi reduzida para no máximo 1400 px (JPEG 85) por ferramentas/commons.py, chamado por ferramentas/figuras.py; "
              "a escolha está em figuras/escolhas.json e a legenda em ferramentas/legendas.js. "
              "GERADO por `python ferramentas/figuras.py gerar` — não edite à mão.", "",
              "| Questão | Arquivo | Título no Commons | Autor | Licença | Tamanho gravado |", "|---|---|---|---|---|---|"]
    for qid in CONSULTAS:
        titulo = e.get(qid)
        if not titulo:
            print(qid, "SEM ESCOLHA"); continue
        # a escolha pode ter vindo da lista de outra questão (a busca de cir02 achou a foto de cir03)
        info = next((i for i in c.get(qid, []) if i["titulo"] == titulo), None) or next((i for l in c.values() for i in l if i["titulo"] == titulo), None)
        if not info:
            print(qid, "escolha fora de candidatos.json:", titulo); continue
        arq = os.path.join(PASTA, qid + ".jpg")
        if not os.path.exists(arq):
            print(qid, "arquivo não baixado"); continue
        im = Image.open(arq); w, h = im.size
        autor = AUTORES.get(qid) or re.sub(r"<[^>]+>", "", info.get("autor") or "").strip() or "autor não informado"
        autor = re.sub(r"\s+", " ", autor)
        autor = re.sub(r"\s*\(talk\)", "", autor)
        autor = re.sub(r"\s+from\s+[A-Z].*$", "", autor)
        fonte = "%s · %s · Wikimedia Commons" % (autor, info["lic"])
        saida[qid] = {"src": "figuras/%s.jpg" % qid, "w": w, "h": h, "fonte": fonte, "titulo": titulo, "pagina": info["pagina"], "bytes": os.path.getsize(arq)}
        linhas.append("| %s | %s | [%s](%s) | %s | %s | %d×%d, %d KB |" % (qid, saida[qid]["src"], titulo.replace("|", "\\|"), info["pagina"], autor.replace("|", "\\|"), info["lic"], w, h, saida[qid]["bytes"] // 1024))
    json.dump(saida, open(os.path.join(PASTA, "figuras.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    open(os.path.join(PASTA, "FONTES.md"), "w", encoding="utf-8", newline="\n").write("\n".join(linhas) + "\n")
    print("%d figuras em figuras/figuras.json e figuras/FONTES.md" % len(saida))
    for qid, f in saida.items():
        print("%-7s %4dx%-4d %4d KB  %s" % (qid, f["w"], f["h"], f["bytes"] // 1024, f["fonte"][:70]))


if __name__ == "__main__":
    modo = sys.argv[1] if len(sys.argv) > 1 else ""
    if modo == "candidatos":
        candidatos()
    elif modo == "candidatos2":
        candidatos2()
    elif modo == "candidatos3":
        candidatos2(CONSULTAS3)
    elif modo == "candidatos4":
        candidatos2(CONSULTAS4)
    elif modo == "escolher":
        escolher()
    elif modo == "baixar":
        baixar(sys.argv[2:] or None)
    elif modo == "gerar":
        gerar()
    elif modo == "folha":
        folha(sys.argv[2:] or None)
    elif modo == "trocar" and len(sys.argv) == 4:
        e = json.load(open(ESCOLHAS, encoding="utf-8")); e[sys.argv[2]] = sys.argv[3]
        json.dump(e, open(ESCOLHAS, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        p = os.path.join(PASTA, sys.argv[2] + ".jpg")
        if os.path.exists(p): os.remove(p)
        baixar([sys.argv[2]])
    else:
        print(__doc__)
