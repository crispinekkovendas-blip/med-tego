# -*- coding: utf-8 -*-
"""Wikimedia Commons: procurar imagens com licença aceita e baixá-las já no
tamanho do quadro.

  python ferramentas/commons.py buscar "polycystic ovary ultrasound"
  python ferramentas/commons.py baixar "File:Nome.jpg" figuras/sop/ovario-policistico.jpg

`buscar` lista até 12 resultados com licença, autor e tamanho, marcando com
OK os que o projeto aceita (CC0, domínio público, CC BY, CC BY-SA). `baixar`
pega a versão de até 1400 px, reencoda em JPEG 85 (PNG fica PNG), e imprime a
linha de `fonte:` para os dados e a linha para figuras/FONTES.md.
"""
import io, json, os, re, sys, urllib.parse, urllib.request

UA = "banco-tego/1.0 (https://tego-febrasgo.vercel.app; material de estudo)"
API = "https://commons.wikimedia.org/w/api.php"
ACEITAS = re.compile(r"^(CC0|Public domain|PD|CC BY(-SA)?( [0-9.]+)?)$", re.I)
TAGS = re.compile(r"<[^>]+>")


def sem_tags(s):
    return TAGS.sub("", s or "").strip()


def api(params):
    params = dict(params, format="json")
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.load(r)


def info(pagina):
    ii = pagina["imageinfo"][0]
    md = ii.get("extmetadata", {})
    lic = sem_tags(md.get("LicenseShortName", {}).get("value", "?"))
    return {
        "titulo": pagina["title"], "lic": lic, "ok": bool(ACEITAS.match(lic)),
        "autor": sem_tags(md.get("Artist", {}).get("value", "?"))[:80],
        "mime": ii.get("mime"), "w": ii.get("width"), "h": ii.get("height"),
        "thumb": ii.get("thumburl"), "url": ii.get("url"), "pagina": ii.get("descriptionurl"),
        "desc": sem_tags(md.get("ImageDescription", {}).get("value", ""))[:160],
    }


def buscar(termo, n=12):
    r = api({"action": "query", "generator": "search", "gsrsearch": termo, "gsrnamespace": 6,
             "gsrlimit": n, "prop": "imageinfo", "iiprop": "url|extmetadata|size|mime", "iiurlwidth": 1400})
    paginas = r.get("query", {}).get("pages", {})
    if not paginas:
        print("nada encontrado para:", termo)
    for p in paginas.values():
        i = info(p)
        print("%s %-11s %5sx%-5s %s\n      %s\n      %s" % ("OK " if i["ok"] else "-- ", i["lic"], i["w"], i["h"], i["titulo"], i["autor"], i["desc"]))


def baixar(titulo, destino):
    r = api({"action": "query", "titles": titulo, "prop": "imageinfo",
             "iiprop": "url|extmetadata|size|mime", "iiurlwidth": 1400})
    p = next(iter(r["query"]["pages"].values()))
    if "imageinfo" not in p:
        raise SystemExit("arquivo nao encontrado no Commons: %s" % titulo)
    i = info(p)
    if not i["ok"]:
        raise SystemExit("licença não aceita: %s" % i["lic"])
    fonte_url = i["thumb"] if (i["w"] or 0) > 1400 and i["thumb"] else i["url"]
    req = urllib.request.Request(fonte_url, headers={"User-Agent": UA})
    dados = urllib.request.urlopen(req, timeout=60).read()
    from PIL import Image
    im = Image.open(io.BytesIO(dados))
    im.thumbnail((1400, 1400))
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    if destino.lower().endswith(".png"):
        im.save(destino, "PNG", optimize=True)
    else:
        im.convert("RGB").save(destino, "JPEG", quality=85, optimize=True)
    w, h = im.size
    fonte = "%s · %s · Wikimedia Commons" % (i["autor"], i["lic"])
    print("gravado %s (%dx%d, proporcao %.2f)" % (destino, w, h, w / h))
    print('  figura: { src:"%s", w:%d, h:%d,' % (destino.replace(os.sep, "/"), w, h))
    print('    legenda:"…",')
    print('    fonte:"%s" },' % fonte)
    print("FONTES.md: | %s | %s | %s | %s | %s | %dx%d |" % (destino.replace(os.sep, "/"), i["titulo"], i["autor"], i["lic"], i["pagina"], w, h))


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "buscar":
        buscar(" ".join(sys.argv[2:]))
    elif len(sys.argv) == 4 and sys.argv[1] == "baixar":
        baixar(sys.argv[2], sys.argv[3])
    else:
        print(__doc__)
