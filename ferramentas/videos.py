# -*- coding: utf-8 -*-
"""Vídeos do banco: para cada questão, um vídeo público do YouTube sobre a
questão (q), um sobre a matéria (m) e uma busca por mais vídeos do tema.

  python ferramentas/videos.py canais                    # amostra de buscas → tabela de canais para o usuário aprovar
  python ferramentas/videos.py canais --aprovar UC…,UC…  # grava videos/canais.json (a lista branca)
  python ferramentas/videos.py buscar <area>             # busca q e m de cada questão da área → videos/candidatos.json
  python ferramentas/videos.py escolher <area>           # 1ª candidata por questão e tipo → videos/escolhas.json (só questões novas; --preencher enche os vazios)
  python ferramentas/videos.py buscar-extra <id> <q|m> "<consulta>"   # busca a mais, à mão, para quem ficou sem candidata
  python ferramentas/videos.py trocar <id> <q|m> <url>   # troca (ou "-" para apagar) uma escolha; --forcar aceita canal fora da lista
  python ferramentas/videos.py comentadas <mapa.json> [--forcar]   # a correção da prova como vídeo da questão: {id: url[&t=…s]}
  python ferramentas/videos.py conferir                  # pergunta ao oEmbed do YouTube se cada vídeo escolhido ainda está público
  python ferramentas/videos.py gerar                     # escreve videos.json (o que o site lê)

As escolhas são por URL canônica (https://www.youtube.com/watch?v=<11>); os
metadados (título, canal, duração) são copiados de candidatos.json no gerar.
Nada aqui é editado à mão. A página v/ lê videos.json e redireciona; o
caderno e o cartão só precisam do id para montar os links curtos.
Só canais da lista branca (canais.json) entram; Claude escolhe por metadados
(título, canal, duração, visualizações) e o cliente revisa em videos/ (página
de revisão). yt-dlp sem chave de API, com pausa entre buscas; nunca contorna
verificação nenhuma."""
import io, json, os, re, subprocess, sys, time, urllib.error, urllib.parse, urllib.request

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.join(AQUI, "..")
PASTA = os.path.join(AQUI, "videos")
CANAIS = os.path.join(PASTA, "canais.json")
CANDIDATOS = os.path.join(PASTA, "candidatos.json")
ESCOLHAS = os.path.join(PASTA, "escolhas.json")
SAIDA = os.path.join(RAIZ, "videos.json")
# a correção da prova pode apontar para o minuto da questão (&t=…s): a única forma a mais
URL_RE = re.compile(r"^https://www\.youtube\.com/watch\?v=([A-Za-z0-9_-]{11})(&t=\d+s)?$")
MIN_S, MAX_S = 240, 5400   # 4 a 90 minutos

def ler_json(p, padrao):
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else padrao

def gravar_json(p, obj):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8", newline="\n") as arq:
        json.dump(obj, arq, ensure_ascii=False, indent=1); arq.write("\n")

def video_id(url):
    m = URL_RE.match(url or "")
    return m.group(1) if m else None

def cabeca(tema):
    """a cabeça do tema: o que vem antes do travessão ou do parêntese (o YouTube
    responde a "Sepse", não a "Sepse — mecanismos da falência orgânica e …")"""
    return tema.split(" — ")[0].split(" (")[0].strip()

def consulta_q(q):
    """vídeo da questão: a cabeça do tema no registro dos cursinhos de residência"""
    return cabeca(q["tema"]) + " residência médica"

def consulta_m(q):
    """vídeo da matéria: a cabeça do tema como aula (o termo-chave era estreito demais)"""
    return cabeca(q["tema"]) + " aula"

def questoes():
    r = subprocess.run(["node", os.path.join(AQUI, "questoes_json.js")], capture_output=True, text=True, encoding="utf-8")
    if r.returncode: raise SystemExit(r.stderr[-500:])
    return json.loads(r.stdout)

def _candidato(cands, qid, qual, url):
    for c in cands.get(qid, {}).get(qual, []):
        if c["url"] == url: return c
    for lista in cands.values():          # a escolha pode ter vindo da busca do outro tipo
        for c in lista.get("q", []) + lista.get("m", []):
            if c["url"] == url: return c
    return None

def gerar(escolhas=None, candidatos=None, canais=None, qs=None, gravar=True):
    esc = ler_json(ESCOLHAS, {}) if escolhas is None else escolhas
    cands = ler_json(CANDIDATOS, {}) if candidatos is None else candidatos
    lista = ler_json(CANAIS, []) if canais is None else canais
    ids_canais = {c["id"] for c in lista}
    qs = questoes() if qs is None else qs
    ids = {q["id"] for q in qs}
    for qid in esc:
        if qid not in ids: raise ValueError("escolhas.json tem o id %s, que não é questão nenhuma" % qid)
    saida, faltam = {}, {"q": 0, "m": 0}
    for q in qs:
        e = esc.get(q["id"]) or {"q": None, "m": None, "busca": q["tema"]}
        v = {"fonte": q["fonte"], "numero": q["numero"], "tema": q["tema"]}
        for qual in ("q", "m"):
            url = e.get(qual)
            if not url:
                v[qual] = None; faltam[qual] += 1; continue
            if not video_id(url): raise ValueError("%s: a url do vídeo %s não é https://www.youtube.com/watch?v=<11> (%s)" % (q["id"], qual, url))
            c = _candidato(cands, q["id"], qual, url)
            if not c: raise ValueError("%s: a escolha %s (%s) não está em candidatos.json" % (q["id"], qual, url))
            forcado = (e.get("forcado") or {}).get(qual)
            if c["canalId"] not in ids_canais and not forcado: raise ValueError("%s: o canal %s do vídeo %s não está em canais.json" % (q["id"], c["canal"], qual))
            v[qual] = {"url": url, "titulo": c["titulo"], "canal": c["canal"], "canalId": c["canalId"], "duracao": int(c["duracao"])}
            if (e.get("comentada") or {}).get(qual): v[qual]["comentada"] = True   # a correção da prova, não um vídeo do tema
        v["busca"] = e.get("busca") or q["tema"]
        saida[q["id"]] = v
    if gravar:
        gravar_json(SAIDA, saida)
        print("videos.json: %d questões · faltam %d vídeos da questão e %d da matéria" % (len(saida), faltam["q"], faltam["m"]))
    return saida

# --- yt-dlp -----------------------------------------------------------------------
OPCOES_YTDLP = {"quiet": True, "no_warnings": True, "extract_flat": True,
                "http_headers": {"Accept-Language": "pt-BR,pt;q=0.9"},
                "extractor_args": {"youtube": {"lang": ["pt"]}}}   # sem isso os títulos chegam traduzidos para o inglês

def buscar_bruto(consulta, n=30):   # 30 resultados: com a lista branca estreita, 15 deixavam muita questão sem candidata
    import yt_dlp
    with yt_dlp.YoutubeDL(OPCOES_YTDLP) as y:
        r = y.extract_info("ytsearch%d:%s" % (n, consulta), download=False)
    return list(r.get("entries") or [])

def extrair_bruto(url):
    import yt_dlp
    with yt_dlp.YoutubeDL(dict(OPCOES_YTDLP, extract_flat=False)) as y:
        return y.extract_info(url, download=False)

def _data(e):
    d = e.get("upload_date")
    return "%s-%s-%s" % (d[:4], d[4:6], d[6:]) if d and len(d) == 8 else None

def candidato(e):
    return {"url": "https://www.youtube.com/watch?v=%s" % e["id"], "videoId": e["id"], "titulo": e.get("title") or "",
            "canal": e.get("channel") or e.get("uploader") or "", "canalId": e.get("channel_id") or "",
            "duracao": int(e.get("duration") or 0), "views": int(e.get("view_count") or 0), "data": _data(e)}

def filtrar(entradas, ids_canais, minimo=MIN_S, maximo=MAX_S):
    """só canais da lista e duração na janela; a ordem é a da busca (relevância):
    ordenar por visualizações trazia o vídeo popular errado (Oropouche para influenza)"""
    return [candidato(e) for e in entradas if e.get("id") and e.get("channel_id") in ids_canais and minimo <= int(e.get("duration") or 0) <= maximo]

def tabela_canais(resultados):
    """resultados: uma lista de entradas do yt-dlp por tema → canais ordenados por nº de temas em que aparecem."""
    por = {}
    for entradas in resultados:
        vistos = set()
        for e in entradas:
            cid = e.get("channel_id")
            if not cid or cid in vistos: continue
            vistos.add(cid)
            l = por.setdefault(cid, {"id": cid, "nome": e.get("channel") or "", "hits": 0, "duracoes": []})
            l["hits"] += 1; l["duracoes"].append(int(e.get("duration") or 0))
    tabela = []
    for l in por.values():
        d = sorted(l.pop("duracoes")); l["mediana_s"] = d[len(d) // 2] if d else 0; tabela.append(l)
    return sorted(tabela, key=lambda l: (-l["hits"], l["nome"]))

VISTOS = os.path.join(PASTA, "_canais-vistos.json")

def canais(aprovar=None, buscar=buscar_bruto):
    if aprovar:
        ids = [x.strip() for x in aprovar.split(",") if x.strip()]
        atuais = {c["id"]: c for c in ler_json(CANAIS, [])}
        nomes = ler_json(VISTOS, {})
        lista = [atuais.get(i) or {"id": i, "nome": nomes.get(i, "")} for i in ids]
        gravar_json(CANAIS, lista); print("canais.json: %d canais" % len(lista)); return
    qs = questoes(); amostra = []
    for area in sorted({q["area"] for q in qs}):
        da = [q for q in qs if q["area"] == area]
        amostra += [da[i] for i in sorted({0, len(da) // 4, len(da) // 2, 3 * len(da) // 4, len(da) - 1})]
    resultados = []
    for q in amostra:
        print("busca:", q["id"], q["tema"][:60], flush=True); resultados.append(buscar(consulta_q(q))); time.sleep(2)
    tabela = tabela_canais(resultados)
    gravar_json(VISTOS, {l["id"]: l["nome"] for l in tabela})
    print("\n%-26s %-40s %4s %8s" % ("id", "canal", "hits", "mediana"))
    for l in tabela: print("%-26s %-40s %4d %7dm" % (l["id"], l["nome"][:40], l["hits"], l["mediana_s"] // 60))
    print("\naprove com: python ferramentas/videos.py canais --aprovar UC…,UC…")

def exige_canais():
    lista = ler_json(CANAIS, [])
    if not lista: raise SystemExit("canais.json está vazio: rode `videos.py canais` e aprove a lista antes de buscar")
    return lista

def buscar(area, buscar=buscar_bruto, candidatos=None, canais=None, qs=None, gravar=True, pausa=2, tudo=False):
    """as duas buscas de cada questão da área; grava depois de cada uma, e uma
    corrida interrompida recomeça só pelo que falta (--tudo refaz)"""
    ids_canais = {c["id"] for c in (exige_canais() if canais is None else canais)}
    cands = ler_json(CANDIDATOS, {}) if candidatos is None else candidatos
    qs = questoes() if qs is None else qs
    for q in [q for q in qs if q["area"] == area]:
        for qual, consulta in (("q", consulta_q(q)), ("m", consulta_m(q))):
            if not tudo and qual in cands.get(q["id"], {}): continue
            try: lista = filtrar(buscar(consulta), ids_canais)
            except Exception as e: print(q["id"], qual, "ERRO", str(e)[:80], flush=True); time.sleep(10); continue
            cands.setdefault(q["id"], {})[qual] = lista
            if gravar:
                print("%-7s %s %2d candidatas  %s" % (q["id"], qual, len(lista), consulta[:50]), flush=True)
                gravar_json(CANDIDATOS, cands)
            time.sleep(pausa)

def buscar_extra(qid, qual, consulta, candidatos=None, canais=None, buscar=None, gravar=True):
    """uma busca a mais, com consulta escrita à mão, para uma questão que ficou
    sem candidata (ou para dar ao cliente outra opção): o que vier da lista
    branca entra na FRENTE das candidatas daquele tipo, sem repetir url"""
    cands = ler_json(CANDIDATOS, {}) if candidatos is None else candidatos
    lista = ler_json(CANAIS, []) if canais is None else canais
    novas = filtrar((buscar or buscar_bruto)(consulta), {c["id"] for c in lista})
    vistas = set(); unicas = []
    for c in novas:
        if c["url"] in vistas: continue
        vistas.add(c["url"]); unicas.append(c)
    antigas = [c for c in cands.get(qid, {}).get(qual, []) if c["url"] not in vistas]
    cands.setdefault(qid, {"q": [], "m": []})[qual] = unicas + antigas
    if gravar:
        gravar_json(CANDIDATOS, cands)
        print("%-7s %s %2d candidatas novas  %s" % (qid, qual, len(unicas), consulta[:50]))
    return len(unicas)

def escolher(area, candidatos=None, escolhas=None, qs=None, gravar=True, preencher=False):
    """a primeira candidata de cada tipo para as questões que ainda não têm
    entrada; uma questão que já tem entrada não é tocada (um vídeo apagado com
    `trocar -` fica apagado) — `--preencher` enche só os lugares vazios,
    pulando as urls vetadas. O vídeo da matéria não repete o da questão
    quando há outra candidata"""
    cands = ler_json(CANDIDATOS, {}) if candidatos is None else candidatos
    esc = ler_json(ESCOLHAS, {}) if escolhas is None else escolhas
    qs = questoes() if qs is None else qs
    sem = []
    for q in [q for q in qs if q["area"] == area]:
        if q["id"] in esc and not preencher: continue
        e = esc.setdefault(q["id"], {"q": None, "m": None, "busca": q["tema"]})
        for qual in ("q", "m"):
            if e.get(qual) is not None: continue
            vetadas = set((e.get("vetado") or {}).get(qual, []))
            lista = [c for c in cands.get(q["id"], {}).get(qual, []) if c["url"] not in vetadas]
            if qual == "m" and e.get("q"):
                lista = [c for c in lista if c["url"] != e["q"]] or lista
            if lista: e[qual] = lista[0]["url"]
            else: sem.append(q["id"] + "/" + qual)
    if gravar:
        gravar_json(ESCOLHAS, esc)
        print("sem candidata:", ", ".join(sem) or "nenhuma")
    return sem

def _tira_forcado(e, qual):
    if "forcado" in e:
        e["forcado"].pop(qual, None)
        if not e["forcado"]: e.pop("forcado")

def _candidato_de(url, extrair, memo):
    """metadados de uma url (sem o &t=…), extraídos uma vez por vídeo"""
    base = "https://www.youtube.com/watch?v=" + video_id(url)
    if base not in memo: memo[base] = candidato((extrair or extrair_bruto)(base))
    c = dict(memo[base]); c["url"] = url
    return c

def comentadas(mapa, forcar=False, escolhas=None, candidatos=None, canais=None, extrair=None, gravar=True):
    """a correção da prova (questão comentada) como vídeo da questão (q) de cada id
    do mapa {id: url}; a url pode trazer o minuto (&t=…s). Cada vídeo é extraído
    uma vez; a escolha anterior fica nas candidatas. Marca comentada e, se o
    canal está fora da lista, exige --forcar (e marca forcado)."""
    esc = ler_json(ESCOLHAS, {}) if escolhas is None else escolhas
    cands = ler_json(CANDIDATOS, {}) if candidatos is None else candidatos
    lista = ler_json(CANAIS, []) if canais is None else canais
    ids_canais = {x["id"] for x in lista}; memo = {}; n = 0
    for qid, url in mapa.items():
        if not video_id(url): raise ValueError("%s: url fora da forma canônica: %s" % (qid, url))
        c = _candidato_de(url, extrair, memo)
        if c["canalId"] not in ids_canais and not forcar: raise ValueError("%s: o canal %s não está em canais.json (use --forcar só com a palavra do cliente)" % (qid, c["canal"]))
        e = esc.setdefault(qid, {"q": None, "m": None, "busca": ""})
        cands.setdefault(qid, {})["q"] = [c] + [x for x in cands.get(qid, {}).get("q", []) if x["url"] != url]
        e["q"] = url; e.setdefault("comentada", {})["q"] = True
        if c["canalId"] not in ids_canais: e.setdefault("forcado", {})["q"] = True
        else: _tira_forcado(e, "q")
        n += 1
    if gravar:
        gravar_json(ESCOLHAS, esc); gravar_json(CANDIDATOS, cands)
        print("%d questões com a correção da prova como vídeo da questão (%d vídeos distintos)" % (n, len(memo)))
    return n

def trocar(qid, qual, url, forcar=False, escolhas=None, candidatos=None, canais=None, extrair=None, gravar=True):
    esc = ler_json(ESCOLHAS, {}) if escolhas is None else escolhas
    cands = ler_json(CANDIDATOS, {}) if candidatos is None else candidatos
    lista = ler_json(CANAIS, []) if canais is None else canais
    e = esc.setdefault(qid, {"q": None, "m": None, "busca": ""})
    if url == "-":
        # apagar veta a url: escolher --preencher não a traz de volta
        if e.get(qual): e.setdefault("vetado", {}).setdefault(qual, []).append(e[qual])
        e[qual] = None; _tira_forcado(e, qual)
        if "comentada" in e: e["comentada"].pop(qual, None); (not e["comentada"]) and e.pop("comentada")
    else:
        if not video_id(url): raise ValueError("url fora da forma canônica: " + url)
        c = _candidato_de(url, extrair, {})
        if "comentada" in e: e["comentada"].pop(qual, None); (not e["comentada"]) and e.pop("comentada")
        if c["canalId"] not in {x["id"] for x in lista} and not forcar: raise ValueError("o canal %s não está em canais.json (use --forcar só com a palavra do cliente)" % c["canal"])
        cands.setdefault(qid, {"q": [], "m": []})[qual] = [c] + [x for x in cands.get(qid, {}).get(qual, []) if x["url"] != url]
        e[qual] = url
        if forcar: e.setdefault("forcado", {})[qual] = True
        else: _tira_forcado(e, qual)
    if gravar: gravar_json(ESCOLHAS, esc); gravar_json(CANDIDATOS, cands); print("ok", qid, qual, url)

class HTTPErro(Exception):
    def __init__(self, status): super().__init__(status); self.status = status

def _abrir_oembed(url):
    req = urllib.request.Request("https://www.youtube.com/oembed?url=%s&format=json" % urllib.parse.quote(url, safe=""), headers={"User-Agent": "banco-tego videos.py conferir"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r: return r.status
    except urllib.error.HTTPError as e: raise HTTPErro(e.code)

def conferir(videos_json=None, abrir=None, extrair=None):
    V = ler_json(SAIDA, {}) if videos_json is None else videos_json
    abrir = abrir or _abrir_oembed; extrair = extrair or extrair_bruto; ruins = []
    for qid, v in V.items():
        for qual in ("q", "m"):
            p = v.get(qual)
            if not p: continue
            try: st = abrir(p["url"])
            except HTTPErro as e: st = e.status
            if st == 401:
                # o oEmbed responde 401 tanto para incorporação desligada (vídeo público,
                # o link curto leva à página, não a um player) quanto para vídeo privado;
                # o yt-dlp distingue: o privado estoura
                try: extrair(p["url"]); st = 200
                except Exception: st = "privado"
            if st != 200: ruins.append((qid, qual, p["url"], st))
            if abrir is _abrir_oembed: time.sleep(0.5)
    for r in ruins: print("SUMIU  %-7s %s %s (HTTP %s)" % r)
    print("%d vídeos conferidos, %d fora do ar" % (sum(1 for v in V.values() for k in ("q", "m") if v.get(k)), len(ruins)))
    return ruins

if __name__ == "__main__":
    modo = sys.argv[1] if len(sys.argv) > 1 else ""
    if modo == "canais": canais(aprovar=sys.argv[sys.argv.index("--aprovar") + 1] if "--aprovar" in sys.argv else None)
    elif modo == "buscar" and len(sys.argv) > 2: buscar(sys.argv[2], tudo="--tudo" in sys.argv)
    elif modo == "escolher" and len(sys.argv) > 2: escolher(sys.argv[2], preencher="--preencher" in sys.argv)
    elif modo == "buscar-extra" and len(sys.argv) >= 5: buscar_extra(sys.argv[2], sys.argv[3], sys.argv[4])
    elif modo == "trocar" and len(sys.argv) >= 5: trocar(sys.argv[2], sys.argv[3], sys.argv[4], forcar="--forcar" in sys.argv)
    elif modo == "comentadas" and len(sys.argv) >= 3:
        m = json.load(open(sys.argv[2], encoding="utf-8")); comentadas(m.get("mapa", m), forcar="--forcar" in sys.argv)
    elif modo == "conferir": conferir()
    elif modo == "gerar": gerar()
    else: print(__doc__)
