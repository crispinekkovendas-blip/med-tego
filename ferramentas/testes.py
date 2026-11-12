# Testes das ferramentas. Roda: `python ferramentas/testes.py` (sai 1 se algo falhar).
# Cada tarefa do plano acrescenta os seus testes aqui, antes de escrever a ferramenta.
import sys, os, json, hashlib, subprocess, re
AQUI = os.path.dirname(os.path.abspath(__file__))
CADERNOS = os.path.join(AQUI, "cadernos")
sys.path.insert(0, AQUI)
falhas = []
testes = []

def teste(f):
    testes.append(f)
    return f

def md5(caminho):
    h = hashlib.md5()
    with open(caminho, "rb") as arq:
        for bloco in iter(lambda: arq.read(1 << 20), b""):
            h.update(bloco)
    return h.hexdigest()

def ler(nome):
    with open(os.path.join(CADERNOS, nome), encoding="utf-8", errors="replace") as arq:
        return arq.read()

def gabarito_lido(nome):
    linhas = ler(nome).strip().splitlines()
    return {int(l.split()[0]): l.split()[1] for l in linhas}

# --- fontes: os PDFs originais, com md5 fixo ----------------------------------
FONTES_PDF = {
    "tego2022g-caderno.pdf": ("4bcd76e256c028808abcb55d9e100baa", 1990776),
    "tego2022o-caderno.pdf": ("1ec5818236de6c2c34aa6896361120a4", 1460186),
    "tego2022-gabarito-definitivo-medgrupo.pdf": ("7b339eaa0e7060630767c8c4e9bebab6", 3390881),
    "tego2025-guia-estrategia.pdf": ("26b740d840b5f07e983b2f458170632c", 14774300),
    "tego2026-edital.pdf": ("205be382c44f3a67d4a510675e7b54d3", 574469),
}
FONTES_TEGO = ("tego2025g", "tego2025o", "tego2022g", "tego2022o")

@teste
def test_fontes_tego_baixadas():
    # Os PDFs ficam fora do git desde que o repositório é público (2026-11-12): no
    # GitHub Actions eles não existem, e o teste confere só os que estão na pasta.
    for nome, (h, tam) in FONTES_PDF.items():
        p = os.path.join(CADERNOS, nome)
        if not os.path.exists(p):
            print(f"    (sem {nome} na pasta: fora do git; a URL está em FONTES.md)")
            continue
        assert os.path.getsize(p) == tam and md5(p) == h, f"{nome} não é o documento esperado"
    fontes = ler("FONTES.md")
    for nome in FONTES_PDF:
        assert f"| `{nome}` |" in fontes or f"| {nome} |" in fontes, f"FONTES.md não registra {nome}"

# --- ferramentas herdadas do susp (parse_gabarito.py, extrai_questoes.py) --------
@teste
def test_parse_gabarito_bloco_da_prova_certa():
    # o bloco "002. PROVA OBJETIVA" começa de novo em 1: o parser tem de parar no fim da prova 001
    from parse_gabarito import letras_da_prova
    txt = "001. PROVA OBJETIVA\n 1-E 2-B 3-E\n4 - C 5 - C\n002. PROVA OBJETIVA\n1-C 2-B 3-A 4-D 5-C\n"
    assert letras_da_prova(txt, "001") == {1: "E", 2: "B", 3: "E", 4: "C", 5: "C"}
    assert letras_da_prova(txt, "002") == {1: "C", 2: "B", 3: "A", 4: "D", 5: "C"}

@teste
def test_parse_recursos_anuladas():
    from parse_gabarito import anuladas_do_edital
    raw = "x\n001 - Prova\nObjetiva\n1 4 ANULADA\n003 - Prova\nObjetiva\n1 4 ANULADA\n001 - Prova\nObjetiva\n1 23 Indeferido\n001 - Prova Objetiva 36 ANULADA\n"
    assert anuladas_do_edital(raw, "001") == {4, 36}

@teste
def test_juntar_hifens():
    from extrai_questoes import juntar_hifens
    casos = {
        "hiper-\ntensão": "hipertensão", "dialí\xad\ntica": "dialítica",
        "pré-\nnatal": "pré-natal", "recém-\nnascido": "recém-nascido", "pós-\noperatório": "pós-operatório",
        "anti-\nhistamínico": "anti-histamínico", "intra-\nabdominal": "intra-abdominal", "auto-\nimune": "autoimune",
        "anos-\nmaço": "anos-maço", "sub-\nrogar": "sub-rogar", "contra-\nindicação": "contraindicação",
        "queixa-\n-se": "queixa-se", "Ringer-\n-lactato": "Ringer-lactato", "DNA- \n-HPV": "DNA-HPV", "proges- \nterona": "progesterona",
        "inter-\nrogar": "interrogar", "pré-\nvias": "prévias", "hiper-\nreatividade": "hiperreatividade",
    }
    for entrada, esperado in casos.items():
        saida, _ = juntar_hifens(entrada)
        assert saida == esperado, f"{entrada!r} -> {saida!r}, esperava {esperado!r}"

@teste
def test_separar_questoes_basico():
    from extrai_questoes import separar_questoes
    txt = "41.\tNa Caderneta, há índices.\nQual índice?\n(A)\tPeso.\n(B)\tEstatura.\n(C)\tPeso-para-estatura.\n(D)\tIMC.\n(E)\tEscore-z.\n42.\tMenina, 2 anos.\n(A)\ta\n(B)\tb\n(C)\tc\n(D)\td\n(E)\te\n"
    qs = separar_questoes(txt)
    assert [q["numero"] for q in qs] == [41, 42]
    assert qs[0]["enunciado"] == "Na Caderneta, há índices. Qual índice?"
    assert qs[0]["alternativas"] == ["Peso.", "Estatura.", "Peso-para-estatura.", "IMC.", "Escore-z."]
    assert qs[0]["imagem"] is False

@teste
def test_separar_nao_quebra_em_parentese_com_espaco():
    # "(A) " com espaço no meio do enunciado (uma citação) não é alternativa: a banca separa com TAB
    from extrai_questoes import separar_questoes
    txt = "07.\tO item diz:\n(A) o primeiro;\n(B) o segundo.\nAssinale.\n(A)\tum\n(B)\tdois\n(C)\ttrês\n(D)\tquatro\n(E)\tcinco\n"
    qs = separar_questoes(txt)
    assert len(qs) == 1 and qs[0]["alternativas"] == ["um", "dois", "três", "quatro", "cinco"]
    assert "(A) o primeiro" in qs[0]["enunciado"]

@teste
def test_separar_texto_de_apoio_compartilhado():
    # o caso das questões 81 a 83 vem depois da (E) da 80 e não é da 80: vira `texto` de 81, 82 e 83
    from extrai_questoes import separar_questoes
    txt = ("80.\tPergunta oitenta?\n(A)\ta\n(B)\tb\n(C)\tc\n(D)\td\n(E)\tcolectomia total.\n"
           "Considere o seguinte caso clínico para responder às questões de números 81 a 83.\nMenina de 18 meses, adotada.\nExames normais.\n"
           "81.\tVacinas?\n(A)\ta\n(B)\tb\n(C)\tc\n(D)\td\n(E)\te\n82.\tPulmão?\n(A)\ta\n(B)\tb\n(C)\tc\n(D)\td\n(E)\te\n"
           "83.\tSangue?\n(A)\ta\n(B)\tb\n(C)\tc\n(D)\td\n(E)\te\n84.\tOutra?\n(A)\ta\n(B)\tb\n(C)\tc\n(D)\td\n(E)\te\n")
    qs = {q["numero"]: q for q in separar_questoes(txt)}
    assert qs[80]["alternativas"][4] == "colectomia total."
    assert qs[81]["texto"] == qs[82]["texto"] == qs[83]["texto"]
    assert "Menina de 18 meses, adotada. Exames normais." in qs[81]["texto"] and "<em>Considere" in qs[81]["texto"]
    assert "texto" not in qs[84]

@teste
def test_separar_marca_imagem():
    from extrai_questoes import separar_questoes
    txt = "20.\tRealiza o eletrocardiograma a seguir:\n[IMAGEM]\n(A)\ta\n(B)\tb\n(C)\tc\n(D)\td\n(E)\te\n"
    qs = separar_questoes(txt)
    assert qs[0]["imagem"] is True and "[IMAGEM]" not in qs[0]["enunciado"]

@teste
def test_normalizar_js_e_py_batem():
    from normalizar import normalizar
    amostras = ["Recém-<strong>nascido</strong> “a termo” — SatO2 ≥ 95 %", "dialí\xad\ntica;\n  Ácido  fólico", "<p>“Mola” – hCG ‘alto’</p>", "x − y", "(< 7 dias) e PA > 90", "<p>sat &lt; 90</p>"]
    saida_js = subprocess.run(["node", "-e", "const {normalizar}=require('./ferramentas/normalizar.js');const a=JSON.parse(process.argv[1]);process.stdout.write(JSON.stringify(a.map(normalizar)))", json.dumps(amostras)], capture_output=True, text=True, encoding="utf-8", cwd=os.path.join(AQUI, ".."))
    assert saida_js.returncode == 0, saida_js.stderr
    assert json.loads(saida_js.stdout) == [normalizar(s) for s in amostras], f"JS {saida_js.stdout} != PY {[normalizar(s) for s in amostras]}"
    assert normalizar("Recém-<strong>nascido</strong> “a termo”") == 'recem- nascido "a termo"'

@teste
def test_parse_gabarito_sem_cabecalho_e_asterisco():
    # gabarito transcrito (SUS-SP 2021): sem "001. PROVA OBJETIVA", colunas "N- X", anulada = "A*"
    from parse_gabarito import letras_da_prova
    txt = "GABARITO SUS SP\n 2021\n\n1- B   21- B   41- C\n2- A   22- D   42- A\n27- A*  57- A* 100- B\n"
    g = letras_da_prova(txt, "001")
    assert g[1] == "B" and g[21] == "B" and g[42] == "A" and g[100] == "B"
    assert g[27] == "*" and g[57] == "*"

@teste
def test_parse_gabarito_cabecalho_escrita_e_anulada_N():
    # Einstein: "001. PROVA ESCRITA OBJETIVA (TEÓRICA)"; no edital de resultado de 2025 o cabeçalho é "01." e a anulada vem como "N"
    from parse_gabarito import letras_da_prova
    txt = "01. PROVA ESCRITA OBJETIVA (TEÓRICA)\nACESSO DIRETO\n1  -  A\n2  -  C\n11  -  N\n75  -  C\n002. PROVA ESCRITA OBJETIVA (TEÓRICA)\n1  -  B\n"
    g = letras_da_prova(txt, "001")
    assert g[1] == "A" and g[2] == "C" and g[11] == "*" and g[75] == "C" and 3 not in g
    assert letras_da_prova(txt, "002") == {1: "B"}

@teste
def test_separar_estilo_questao_e_quatro_alternativas():
    from extrai_questoes import separar_questoes
    txt = "QUESTÃO  03\t\nRN de 37 semanas.\n(A)\tum.\n(B)\tdois.\n(C)\ttrês.\n(D)\tquatro.\nQUESTÃO  04\t\nOutra.\n(A)\tx.\n(B)\ty.\n(C)\tz.\n(D)\t\n"
    qs = separar_questoes(txt, "questao")
    assert [q["numero"] for q in qs] == [3, 4]
    assert qs[0]["alternativas"] == ["um.", "dois.", "três.", "quatro."] and "erro" not in qs[0]
    assert qs[1]["erro"] == "alternativa vazia (imagem)" and qs[1]["imagem"] is True
    assert "erro" in separar_questoes("01.\tX.\n(A)\ta.\n(B)\tb.\n(C)\tc.\n", "ponto")[0], "três alternativas têm de ser marcadas como problema"

# --- parse_fundatec.py: gabarito definitivo da Fundatec ---------------------------
@teste
def test_parse_fundatec_tabela_em_colunas():
    # o Anexo de gabaritos sai do PDF como vinte números numa coluna e depois as vinte letras
    from parse_fundatec import letras_definitivas
    txt = "1. DAS JUSTIFICATIVAS\nQUESTÃO: 1 – MANTIDA alternativa 'C'.\n2. DOS GABARITOS DEFINITIVOS\n\nAUTOAVALIAÇÃO E ACESSO DIRETO\n\n1\n2\n3\n4\nC\nA\n*\nB\n5\n6\nD\nA\n\nPorto Alegre\n"
    assert letras_definitivas(txt, total=6) == {1: "C", 2: "A", 3: "*", 4: "B", 5: "D", 6: "A"}

@teste
def test_parse_fundatec_para_no_total():
    # depois das 100 do acesso direto vêm as provas de pré-requisito (1..25 de novo): o parser para no total
    from parse_fundatec import letras_definitivas
    txt = "AUTOAVALIAÇÃO E ACESSO DIRETO\n1\n2\nA\nB\n\nPRÉ-REQUISITO\n1\n2\nC\nD\n"
    assert letras_definitivas(txt, total=2) == {1: "A", 2: "B"}

@teste
def test_parse_fundatec_recursos():
    from parse_fundatec import recursos
    txt = ("MATÉRIA: CLÍNICA MÉDICA/MEDICINA INTERNA\nCARGO(S): AUTOAVALIAÇÃO, ACESSO DIRETO\n"
           "QUESTÃO: 1 – MANTIDA alternativa 'C'. Segundo Harrison.\nQUESTÃO: 5 - ANULADA. Após análise.\n"
           "QUESTÃO: 58 – ALTERA GABARITO DE ALTERNATIVA 'B' PARA ALTERNATIVA 'D'. Porque sim.\n"
           "MATÉRIA: CONHECIMENTOS ESPECÍFICOS\nCARGO(S): CARDIOLOGIA\nQUESTÃO: 3 – ANULADA.\n")
    r = recursos(txt)
    assert r == {1: {"veredito": "MANTIDA", "letra": "C"}, 5: {"veredito": "ANULADA", "letra": None}, 58: {"veredito": "ALTERA", "letra": "D"}}
    # aspas curvas (a questão 20 de 2025 sai como 'D’ no PDF) e uma linha sem veredito reconhecível
    from parse_fundatec import sem_veredito
    txt2 = "MATÉRIA: CLÍNICA MÉDICA\nCARGO(S): ACESSO DIRETO\nQUESTÃO: 20 – MANTIDA alternativa 'D’. Após análise.\nQUESTÃO: 21 – ALTERA GABARITO DE ALTERNATIVA ‘A’ PARA ALTERNATIVA ‘B’.\nQUESTÃO: 22 – INDEFERIDO o pedido.\n"
    assert recursos(txt2) == {20: {"veredito": "MANTIDA", "letra": "D"}, 21: {"veredito": "ALTERA", "letra": "B"}}
    assert sem_veredito(txt2) == [22]

# --- gabarito_tego.py: as quatro provas, 60 letras cada, nenhuma anulada ---------
@teste
def test_gabaritos_tego():
    for f in FONTES_TEGO:
        g = gabarito_lido(f + "-gabarito.txt")
        assert sorted(g) == list(range(1, 61)) and all(x in "ABCD" for x in g.values()), f
        assert json.loads(ler(f + "-recursos.json")) == {}, f + ": a FEBRASGO não publica justificativas; recursos.json fica vazio"
    g = gabarito_lido("tego2022g-gabarito.txt"); assert g[1] == "C" and g[2] == "A" and g[60] in "ABCD"
    g = gabarito_lido("tego2022o-gabarito.txt"); assert g[1] == "B" and g[2] == "D"
    g = gabarito_lido("tego2025g-gabarito.txt"); assert g[1] == "C" and g[60] == "A"
    g = gabarito_lido("tego2025o-gabarito.txt"); assert g[1] == "C" and g[2] == "A" and g[60] == "D"

@teste
def test_gabarito_tego_pares():
    from gabarito_tego import pares, quadros
    assert pares(["Questão", "Gabarito", "1", "C", "2", "A", "Estratégia MED | Guia", "47", "3", "B", "1", "D"]) == {1: "C", 2: "A", 3: "B"}
    txt = "x\nGABARITO DA PROVA\nQuestão\nGabarito\n" + "".join(f"{i}\n{'ABCD'[i % 4]}\n" for i in range(1, 61))
    assert quadros(txt, "caderno")[0] == {i: "ABCD"[i % 4] for i in range(1, 61)}

# --- extrai_tego.py: os dois leiautes, 60 questões por prova, fiéis ao texto --------
@teste
def test_extracao_tego():
    from normalizar import normalizar
    for fonte in FONTES_TEGO:
        qs = json.loads(ler(fonte + "-questoes.json"))
        assert len(qs) == 60 and [q["numero"] for q in qs] == list(range(1, 61)), fonte
        assert all(len(q["alternativas"]) == 4 for q in qs if "erro" not in q), fonte + ": alguma questão sem 4 alternativas"
        txt = ler(fonte + ".txt")
        for sobra in ("EXAME DE SUFICIÊNCIA", "PROVA DE GINECOLOGIA", "PROVA DE OBSTETRÍCIA", "Estratégia MED | Guia", "GABARITO DA PROVA", "[IMAGEM", "COMENTÁRIOS:"):
            assert sobra not in txt, f"{fonte}: '{sobra}' sobrou no texto"
        cad = normalizar(txt)
        for q in qs:
            if "erro" in q: continue
            assert normalizar(q["enunciado"]) in cad and all(normalizar(a) in cad for a in q["alternativas"]), f"{fonte} {q['numero']} infiel ao texto"
        areas = {q["numero"]: q["area"] for q in qs}
        assert all(a in ("obst", "gine", "onco", "repro", "masto", "fora") for a in areas.values()), fonte + ": área fora de meta.areas"
    # fora do banco só as três com alternativas em imagem
    fora = {f: sorted(q["numero"] for q in json.loads(ler(f + "-questoes.json")) if "erro" in q) for f in FONTES_TEGO}
    assert fora == {"tego2025g": [45], "tego2025o": [], "tego2022g": [54, 55], "tego2022o": []}, fora
    assert all(q["area"] == "fora" for f in FONTES_TEGO for q in json.loads(ler(f + "-questoes.json")) if "erro" in q)
    # a Obstetrícia de 2025 vem numerada 61–120 no guia e aqui 1–60; a 1 é a gemelar, a 60 a última do guia
    por = {q["numero"]: q for q in json.loads(ler("tego2025o-questoes.json"))}
    assert por[1]["enunciado"].startswith("Secundigesta, 37 semanas") and por[60]["enunciado"].startswith("Gestante com 28 semanas")
    # o guia tem páginas de duas colunas: a 32 continua na coluna da direita e fecha com 4 alternativas
    por = {q["numero"]: q for q in json.loads(ler("tego2025g-questoes.json"))}
    assert por[32]["alternativas"][3].startswith("mastalgia") and por[33]["enunciado"].startswith("Mulher de 72 anos")
    # o caderno de 2022 põe o número abaixo de "QUESTÃO": a 2 (enunciado de uma linha) não se funde com a 1
    por = {q["numero"]: q for q in json.loads(ler("tego2022g-questoes.json"))}
    assert por[1]["alternativas"][3].startswith("Etinilestradiol") and por[2]["enunciado"].startswith("O desenvolvimento da genitália")

@teste
def test_extracao_tego_imagens():
    # as questões que trazem imagem (conferidas a olho nas folhas de contato em 2026-11-11; se o
    # extrator discordar, abra a página do PDF e corrija o extrator ou este mapa — nunca em silêncio)
    esperado = {
        "tego2025g": {2, 7, 8, 9, 10, 11, 13, 21, 23, 24, 27, 29, 30, 31, 33, 34, 37, 39, 40, 41, 42, 43, 45, 48, 49, 51, 54, 57, 58, 59},
        "tego2025o": {2, 8, 9, 12, 17, 18, 20, 21, 25, 26, 32, 33, 34, 36, 40, 49, 51, 52, 55, 60},
        "tego2022g": {14, 15, 16, 18, 19, 23, 24, 25, 26, 35, 36, 37, 38, 44, 45, 46, 48, 49, 50, 53, 54, 55},
        "tego2022o": {10, 16, 19, 20, 22, 23, 24, 34, 35, 39, 43, 44, 51, 55, 56, 57, 59},
    }
    banca = os.path.join(AQUI, "..", "figuras", "banca")
    for fonte, nums in esperado.items():
        qs = {q["numero"]: q for q in json.loads(ler(fonte + "-questoes.json"))}
        assert {n for n, q in qs.items() if q.get("imagens")} == nums, f"{fonte}: imagens em {sorted(n for n, q in qs.items() if q.get('imagens'))}"
        for n in nums:
            for im in qs[n]["imagens"]:
                p = os.path.join(banca, im["arquivo"])
                assert os.path.exists(p) and im["w"] >= 100 and im["h"] >= 60, f"{fonte} {n}: {im}"
                assert im["arquivo"].startswith(f"{fonte}-{n:02d}"), f"{fonte} {n}: nome do arquivo {im['arquivo']}"
    # a imagem de fundo do guia (quase a página inteira) e os logotipos não viram imagem de questão
    assert all(im["w"] < 1300 for q in json.loads(ler("tego2025g-questoes.json")) for im in q.get("imagens", []))
    # a 31 de 2025 (Ginecologia) tem o número sozinho na linha e a figura antes do enunciado
    q31 = {q["numero"]: q for q in json.loads(ler("tego2025g-questoes.json"))}[31]
    assert len(q31["imagens"]) == 1 and q31["enunciado"].startswith("Em pacientes com cirurgias")

@teste
def test_converter_fundatec():
    from extrai_fundatec import converter
    bruto = "QUESTÃO 01 – Em relação ao AVC, é correto afirmar que:\nA) Um.\nB) Dois.\nQUESTÃO 100 – Fim.\nA) a\n"
    txt = converter(bruto)
    assert txt == "01.\tEm relação ao AVC, é correto afirmar que:\n(A)\tUm.\n(B)\tDois.\n100.\tFim.\n(A)\ta\n"

@teste
def test_separar_fundatec_basico():
    from extrai_fundatec import converter, separar_fundatec
    bruto = ("QUESTÃO 01 – Analise o gráfico abaixo.\n[IMAGEM:amrigs2023-01.png]\nQuais?\nA) Um.\nB) Dois.\nC) Três.\nD) Quatro.\n"
             "QUESTÃO 02 – Outra.\nA) a\nB) b\nC) c\nD) \nQUESTÃO 03 – Com imagem nas alternativas.\nA) x\n[IMAGEM:amrigs2023-03.png]\nB) y\nC) z\nD) w\n")
    qs = separar_fundatec(converter(bruto))
    assert [q["numero"] for q in qs] == [1, 2, 3]
    assert qs[0]["enunciado"] == "Analise o gráfico abaixo. Quais?" and qs[0]["alternativas"] == ["Um.", "Dois.", "Três.", "Quatro."]
    assert qs[0]["imagem"] is True and qs[0]["imagens"] == [{"arquivo": "amrigs2023-01.png", "onde": "enunciado"}] and "erro" not in qs[0]
    assert qs[1]["erro"] == "alternativa vazia (imagem)" and qs[1]["imagem"] is False
    assert qs[2]["imagens"] == [{"arquivo": "amrigs2023-03.png", "onde": "alternativas"}] and qs[2]["alternativas"] == ["x", "y", "z", "w"]
    assert "erro" in separar_fundatec("01.\tX.\n(A)\ta.\n(B)\tb.\n(C)\tc.\n")[0], "três alternativas têm de ser problema"

@teste
def test_extrai_fundatec_hifens():
    # as mesmas regras do susp: o texto do caderno passa por juntar_hifens antes de virar questão
    from extrai_fundatec import converter, separar_fundatec
    from extrai_questoes import juntar_hifens
    bruto = "QUESTÃO 07 – Paciente com hiper-\ntensão e pré-\nnatal irregular.\nA) a\nB) b\nC) c\nD) d\n"
    txt, _ = juntar_hifens(converter(bruto))
    assert separar_fundatec(txt)[0]["enunciado"] == "Paciente com hipertensão e pré-natal irregular."

@teste
def test_nenhuma_string_do_susp_sai_da_maquina():
    # o user agent do Commons e qualquer URL do banco irmão: nada do SUS-SP nos arquivos que rodam
    raiz = os.path.join(AQUI, "..")
    for rel in ("ferramentas/commons.py", "ferramentas/figuras.py", "ferramentas/baixar.js", "ferramentas/pdf.py", "ferramentas/videos.py", "app.js", "caderno/caderno.js", "caderno/caderno.css", "index.html", "caderno/index.html", "v/index.html", "videos/revisao.js"):
        with open(os.path.join(raiz, rel), encoding="utf-8") as arq: t = arq.read()
        assert "susp.vercel.app" not in t and "banco-susp" not in t, f"{rel} ainda se apresenta como o banco SUS-SP"
        assert "amrigs.vercel.app" not in t and "banco-amrigs" not in t and "amrigs:" not in t and "Fundatec" not in t, f"{rel} ainda se apresenta como o banco AMRIGS"

# --- montar.js: a imagem da banca é obrigatória quando o caderno a tem ----------
def roda_montar():
    r = subprocess.run(["node", "ferramentas/montar.js"], capture_output=True, text=True, encoding="utf-8", cwd=os.path.join(AQUI, ".."))
    return r.returncode, (r.stdout or "") + (r.stderr or "")

@teste
def test_montar_recusa_imagem_sem_arquivo():
    # uma questão com imagem no caderno só entra com o arquivo em figuras/banca/
    qs = json.loads(ler("tego2025o-questoes.json"))
    im = next(q for q in qs if q.get("imagens") and "erro" not in q and q["numero"] <= 2)["imagens"][0]["arquivo"]
    p = os.path.join(AQUI, "..", "figuras", "banca", im)
    os.rename(p, p + ".fora")
    try:
        cod, saida = roda_montar()
    finally:
        os.rename(p + ".fora", p)
    assert cod != 0 and "falta a imagem da banca" in saida, saida[-400:]
    cod, saida = roda_montar()
    assert cod == 0, saida[-400:]

@teste
def test_autores_sobrescritos_so_para_credito_sujo():
    # AUTORES (figuras.py) só pode corrigir figuras deste banco cujo autor o Commons devolve sujo;
    # a tabela herdada do susp trocava o crédito de figuras do AMRIGS pelo nome de outro banco
    import figuras
    e = json.load(open(os.path.join(AQUI, "..", "figuras", "escolhas.json"), encoding="utf-8"))
    c = json.load(open(os.path.join(AQUI, "..", "figuras", "candidatos.json"), encoding="utf-8"))
    for qid, nome in figuras.AUTORES.items():
        assert qid in e, f"AUTORES[{qid}] não é figura deste banco"
        info = next(i for i in c[qid] if i["titulo"] == e[qid])
        bruto = (info.get("autor") or "").strip()
        limpo = re.sub(r"<[^>]+>", "", bruto).strip()
        sujo = not limpo or limpo != bruto or "?" in limpo or "machine-readable" in limpo or len(limpo) > 60
        assert sujo, f"AUTORES[{qid}] = {nome!r} sobrescreve o autor limpo {limpo!r} do Commons"

@teste
def test_vercel_json_desliga_o_deploy_automatico_do_git():
    # A Vercel está ligada ao repositório do GitHub com `main` como branch de produção, e cada
    # push dispara um build a partir do git. Esse build não teria a pasta pdf/ (fora do git):
    # o site ficaria sem os PDFs do caderno. O deploy é sempre pela CLI, com os PDFs gerados
    # antes (README, "Deploy"); vercel.json desliga o deploy automático dos dois branches.
    cfg = json.load(open(os.path.join(AQUI, "..", "vercel.json"), encoding="utf-8"))
    ligados = cfg.get("git", {}).get("deploymentEnabled", {})
    for branch in ("main", "construcao"):
        assert ligados.get(branch) is False, f"vercel.json não desliga o deploy automático de {branch}"

@teste
def test_vercel_json_desliga_o_deploy_do_branch_videos():
    # o branch do trabalho dos vídeos também não pode disparar build a partir do git
    cfg = json.load(open(os.path.join(AQUI, "..", "vercel.json"), encoding="utf-8"))
    assert cfg.get("git", {}).get("deploymentEnabled", {}).get("videos") is False, "vercel.json não desliga o deploy automático de videos"

@teste
def test_vercel_json_reescreve_os_links_curtos():
    # /v/<id>/<qual> e /v/<id> caem na página v/ (que lê o caminho e redireciona)
    cfg = json.load(open(os.path.join(AQUI, "..", "vercel.json"), encoding="utf-8"))
    rotas = {(r.get("source"), r.get("destination")) for r in cfg.get("rewrites", [])}
    assert ("/v/:id/:qual", "/v/") in rotas, rotas
    assert ("/v/:id", "/v/") in rotas, rotas
    # o bloco do git continua lá
    assert cfg["git"]["deploymentEnabled"]["main"] is False

# --- vídeos: questoes_json.js e videos.py gerar ----------------------------------
def roda_node(*args):
    r = subprocess.run(["node"] + list(args), capture_output=True, text=True, encoding="utf-8", cwd=os.path.join(AQUI, ".."))
    return r.returncode, (r.stdout or "") + (r.stderr or "")

@teste
def test_questoes_json_lista_uma_linha_por_questao():
    cod, saida = roda_node("ferramentas/questoes_json.js")
    assert cod == 0, saida[-300:]
    qs = json.loads(saida)
    assert len(qs) >= 2 and qs[0]["id"] == "obst01" and all(re.fullmatch(r"(obst|gine|onco|repro|masto)\d\d", q["id"]) for q in qs)
    assert all(set(q) == {"id", "area", "fonte", "numero", "tema", "termo"} for q in qs)
    # termo = primeiro <dt> da mini-aula, sem tags
    assert all(q["termo"] and "<" not in q["termo"] for q in qs), [q["id"] for q in qs if not q["termo"]][:5]

@teste
def test_videos_consultas():
    import videos
    q = {"id": "cm01", "tema": "Cefaleia — critérios de migrânea", "termo": "Migrânea sem aura"}
    # a cabeça do tema (antes do travessão ou do parêntese) é o que o YouTube entende
    assert videos.cabeca("Cefaleia — critérios de migrânea") == "Cefaleia"
    assert videos.cabeca("Hérnia inguinal (anatomia) — canal") == "Hérnia inguinal"
    assert videos.consulta_q(q) == "Cefaleia residência médica"
    assert videos.consulta_m(q) == "Cefaleia aula"
    assert videos.video_id("https://www.youtube.com/watch?v=7LUXFoe0vNk") == "7LUXFoe0vNk"
    # a correção da prova pode apontar para o minuto da questão (&t=…s); só essa forma a mais
    assert videos.video_id("https://www.youtube.com/watch?v=7LUXFoe0vNk&t=18679s") == "7LUXFoe0vNk"
    assert videos.video_id("https://youtu.be/7LUXFoe0vNk") is None
    assert videos.video_id("https://www.youtube.com/watch?v=7LUXFoe0vNk&list=x") is None

@teste
def test_videos_gerar_vazio_cobre_todas_as_questoes():
    import videos
    qs = videos.questoes()
    esc = {q["id"]: {"q": None, "m": None, "busca": q["tema"]} for q in qs}
    saida = videos.gerar(escolhas=esc, candidatos={}, canais=[], qs=qs, gravar=False)
    assert set(saida) == {q["id"] for q in qs}
    v = saida[qs[0]["id"]]
    assert v["q"] is None and v["m"] is None and v["busca"] == qs[0]["tema"] and v["fonte"] == qs[0]["fonte"] and v["numero"] == qs[0]["numero"] and v["tema"] == qs[0]["tema"]

@teste
def test_videos_gerar_recusa_id_e_url_errados():
    import videos
    qs = videos.questoes()
    esc = {q["id"]: {"q": None, "m": None, "busca": q["tema"]} for q in qs}
    esc["zz99"] = {"q": None, "m": None, "busca": "x" * 10}
    try: videos.gerar(escolhas=esc, candidatos={}, canais=[], qs=qs, gravar=False); assert False, "aceitou id que não é questão"
    except ValueError as e: assert "zz99" in str(e)
    del esc["zz99"]
    cand = {qs[0]["id"]: {"q": [{"url": "https://youtu.be/7LUXFoe0vNk", "videoId": "7LUXFoe0vNk", "titulo": "t", "canal": "c", "canalId": "UC1", "duracao": 600, "views": 1, "data": None}], "m": []}}
    esc[qs[0]["id"]]["q"] = "https://youtu.be/7LUXFoe0vNk"
    try: videos.gerar(escolhas=esc, candidatos=cand, canais=[{"id": "UC1", "nome": "c"}], qs=qs, gravar=False); assert False, "aceitou url fora da forma canônica"
    except ValueError as e: assert qs[0]["id"] in str(e)

@teste
def test_videos_gerar_copia_metadados_e_exige_canal():
    import videos
    qs = videos.questoes()
    esc = {q["id"]: {"q": None, "m": None, "busca": q["tema"]} for q in qs}
    url = "https://www.youtube.com/watch?v=7LUXFoe0vNk"
    cand = {qs[0]["id"]: {"q": [{"url": url, "videoId": "7LUXFoe0vNk", "titulo": "Anatomia", "canal": "Canal X", "canalId": "UC1", "duracao": 662, "views": 32404, "data": None}], "m": []}}
    esc[qs[0]["id"]]["q"] = url
    try: videos.gerar(escolhas=esc, candidatos=cand, canais=[], qs=qs, gravar=False); assert False, "aceitou canal fora da lista"
    except ValueError as e: assert "canal" in str(e)
    saida = videos.gerar(escolhas=esc, candidatos=cand, canais=[{"id": "UC1", "nome": "Canal X"}], qs=qs, gravar=False)
    assert saida[qs[0]["id"]]["q"] == {"url": url, "titulo": "Anatomia", "canal": "Canal X", "canalId": "UC1", "duracao": 662}
    # forçado passa sem canal na lista
    esc[qs[0]["id"]]["forcado"] = {"q": True}
    assert videos.gerar(escolhas=esc, candidatos=cand, canais=[], qs=qs, gravar=False)[qs[0]["id"]]["q"]["url"] == url

@teste
def test_videos_filtrar_lista_branca_duracao_e_ordem():
    import videos
    am = json.load(open(os.path.join(AQUI, "videos", "amostra-busca.json"), encoding="utf-8"))["entries"]
    lista = videos.filtrar(am, {"UCPwesuPLFsTGosBpPqb8-Hw", "UCymJdnj_lQjDDrTqv3BYhxw", "UCdHMuOHKICxcHwecxN8P-AA"})
    # UFES fica de fora (205 s < 4 min); Facilitando e Medcof entram, na ordem da busca
    assert [c["videoId"] for c in lista] == ["7LUXFoe0vNk", "fi7c6ggd5Ks"], lista
    # a ordem da busca (relevância) vale mais que as visualizações
    pouco = {"id": "aaaaaaaaaaa", "title": "a", "channel": "c", "channel_id": "UC1", "duration": 600, "view_count": 1}
    muito = {"id": "bbbbbbbbbbb", "title": "b", "channel": "c", "channel_id": "UC1", "duration": 600, "view_count": 100000}
    assert [c["videoId"] for c in videos.filtrar([pouco, muito], {"UC1"})] == ["aaaaaaaaaaa", "bbbbbbbbbbb"]
    c = lista[0]
    assert c["url"] == "https://www.youtube.com/watch?v=7LUXFoe0vNk" and c["canalId"] == "UCPwesuPLFsTGosBpPqb8-Hw" and c["duracao"] == 662 and c["views"] == 32404 and c["data"] is None
    assert videos.filtrar(am, set()) == []

@teste
def test_videos_canais_tabela():
    import videos
    am = json.load(open(os.path.join(AQUI, "videos", "amostra-busca.json"), encoding="utf-8"))["entries"]
    tabela = videos.tabela_canais([am, am[:2]])     # dois temas: os dois primeiros canais aparecem nos dois
    assert all(set(l) >= {"id", "nome", "hits", "mediana_s"} for l in tabela)
    assert tabela[0]["hits"] == 2 and tabela[1]["hits"] == 2 and tabela[2]["hits"] == 1
    assert {l["id"] for l in tabela[:2]} == {"UCPwesuPLFsTGosBpPqb8-Hw", "UCymJdnj_lQjDDrTqv3BYhxw"}
    assert next(l for l in tabela if l["id"] == "UCPwesuPLFsTGosBpPqb8-Hw")["mediana_s"] == 662

@teste
def test_videos_trocar_exige_canal_da_lista_salvo_forcado():
    import videos
    esc = {"cm01": {"q": None, "m": None, "busca": "x" * 10}}
    cands = {}
    info = {"id": "7LUXFoe0vNk", "title": "T", "channel": "C", "channel_id": "UCfora", "duration": 600, "view_count": 5, "upload_date": "20240102"}
    url = "https://www.youtube.com/watch?v=7LUXFoe0vNk"
    try: videos.trocar("cm01", "q", url, escolhas=esc, candidatos=cands, canais=[], extrair=lambda u: info, gravar=False); assert False, "aceitou canal fora da lista"
    except ValueError as e: assert "canal" in str(e)
    videos.trocar("cm01", "q", url, forcar=True, escolhas=esc, candidatos=cands, canais=[], extrair=lambda u: info, gravar=False)
    assert esc["cm01"]["q"] == url and esc["cm01"]["forcado"] == {"q": True}
    assert cands["cm01"]["q"][0]["data"] == "2024-01-02" and cands["cm01"]["q"][0]["canalId"] == "UCfora"
    videos.trocar("cm01", "q", "-", escolhas=esc, candidatos=cands, canais=[], extrair=None, gravar=False)
    assert esc["cm01"]["q"] is None and "forcado" not in esc["cm01"]

@teste
def test_videos_comentadas_aplica_o_mapa_e_marca():
    import videos
    # a correção da prova (questão comentada) vira o vídeo da questão de cada id do mapa,
    # marcada como comentada; o mesmo vídeo é extraído uma vez só; o antigo fica nas candidatas
    antigo = {"url": "https://www.youtube.com/watch?v=aaaaaaaaaaa", "videoId": "aaaaaaaaaaa", "titulo": "a", "canal": "c", "canalId": "UC1", "duracao": 600, "views": 1, "data": None}
    cands = {"cm01": {"q": [antigo], "m": []}, "cm02": {"q": [], "m": []}}
    esc = {"cm01": {"q": antigo["url"], "m": None, "busca": "x" * 10}, "cm02": {"q": None, "m": None, "busca": "y" * 10}}
    chamadas = []
    def extrair(url):
        chamadas.append(url); return {"id": url[32:43], "title": "Correção", "channel": "Ceisc", "channel_id": "UCceisc", "duration": 5000, "view_count": 9, "upload_date": "20251128"}
    mapa = {"cm01": "https://www.youtube.com/watch?v=bbbbbbbbbbb", "cm02": "https://www.youtube.com/watch?v=bbbbbbbbbbb&t=120s"}
    n = videos.comentadas(mapa, forcar=True, escolhas=esc, candidatos=cands, canais=[], extrair=extrair, gravar=False)
    assert n == 2 and chamadas == ["https://www.youtube.com/watch?v=bbbbbbbbbbb"], chamadas
    assert esc["cm01"]["q"] == mapa["cm01"] and esc["cm02"]["q"] == mapa["cm02"]
    assert esc["cm01"]["comentada"] == {"q": True} and esc["cm01"]["forcado"] == {"q": True}
    assert cands["cm01"]["q"][0]["url"] == mapa["cm01"] and cands["cm01"]["q"][1] is antigo
    assert cands["cm02"]["q"][0]["url"] == mapa["cm02"] and cands["cm02"]["q"][0]["videoId"] == "bbbbbbbbbbb"
    # gerar copia a marca para videos.json
    qs = [{"id": "cm01", "area": "cm", "fonte": "f", "numero": 1, "tema": "T"}, {"id": "cm02", "area": "cm", "fonte": "f", "numero": 2, "tema": "T"}]
    saida = videos.gerar(escolhas=esc, candidatos=cands, canais=[], qs=qs, gravar=False)
    assert saida["cm01"]["q"]["comentada"] is True and saida["cm02"]["q"]["url"] == mapa["cm02"] and "comentada" not in (saida["cm01"]["m"] or {})
    # sem --forcar, canal fora da lista é recusado
    try: videos.comentadas({"cm01": mapa["cm01"]}, escolhas=esc, candidatos=cands, canais=[], extrair=extrair, gravar=False); assert False
    except ValueError as e: assert "canal" in str(e)

@teste
def test_videos_conferir_marca_os_que_sumiram():
    import videos
    V = {"cm01": {"q": {"url": "https://www.youtube.com/watch?v=aaaaaaaaaaa"}, "m": {"url": "https://www.youtube.com/watch?v=bbbbbbbbbbb"}},
         "cm02": {"q": {"url": "https://www.youtube.com/watch?v=ccccccccccc"}, "m": None}}
    V["cm03"] = {"q": {"url": "https://www.youtube.com/watch?v=ddddddddddd"}, "m": None}
    def abrir(url):
        if "aaaaaaaaaaa" in url: return 200
        if "ccccccccccc" in url or "ddddddddddd" in url: raise videos.HTTPErro(401)   # o oEmbed não distingue privado de incorporação desligada
        raise videos.HTTPErro(404)
    def extrair(url):
        if "ddddddddddd" in url: raise RuntimeError("Private video")
        return {"id": url[-11:]}
    r = videos.conferir(videos_json=V, abrir=abrir, extrair=extrair)
    assert r == [("cm01", "m", "https://www.youtube.com/watch?v=bbbbbbbbbbb", 404), ("cm03", "q", "https://www.youtube.com/watch?v=ddddddddddd", "privado")], r

@teste
def test_videos_ytdlp_pede_titulos_em_portugues():
    import videos
    o = videos.OPCOES_YTDLP
    assert o["http_headers"]["Accept-Language"].startswith("pt-BR") and o["extractor_args"]["youtube"]["lang"] == ["pt"]

@teste
def test_videos_escolher_nao_repete_o_mesmo_video():
    import videos
    mesmo = {"url": "https://www.youtube.com/watch?v=aaaaaaaaaaa", "videoId": "aaaaaaaaaaa", "titulo": "a", "canal": "c", "canalId": "UC1", "duracao": 600, "views": 1, "data": None}
    outro = {"url": "https://www.youtube.com/watch?v=bbbbbbbbbbb", "videoId": "bbbbbbbbbbb", "titulo": "b", "canal": "c", "canalId": "UC1", "duracao": 600, "views": 1, "data": None}
    cands = {"cm01": {"q": [mesmo], "m": [mesmo, outro]}, "cm02": {"q": [mesmo], "m": [mesmo]}}
    esc = {}
    qs = [{"id": "cm01", "area": "cm", "tema": "T1"}, {"id": "cm02", "area": "cm", "tema": "T2"}]
    sem = videos.escolher("cm", candidatos=cands, escolhas=esc, qs=qs, gravar=False)
    assert esc["cm01"]["q"] == mesmo["url"] and esc["cm01"]["m"] == outro["url"]
    assert esc["cm02"]["q"] == mesmo["url"] and esc["cm02"]["m"] == mesmo["url"] and sem == []

@teste
def test_videos_escolher_nao_restaura_o_que_foi_apagado():
    import videos
    a = {"url": "https://www.youtube.com/watch?v=aaaaaaaaaaa", "videoId": "aaaaaaaaaaa", "titulo": "a", "canal": "c", "canalId": "UC1", "duracao": 600, "views": 1, "data": None}
    b = {"url": "https://www.youtube.com/watch?v=bbbbbbbbbbb", "videoId": "bbbbbbbbbbb", "titulo": "b", "canal": "c", "canalId": "UC1", "duracao": 600, "views": 1, "data": None}
    cands = {"cm01": {"q": [a, b], "m": [a]}}
    qs = [{"id": "cm01", "area": "cm", "tema": "T1"}]
    esc = {"cm01": {"q": a["url"], "m": a["url"], "busca": "T1"}}
    # apagar com trocar registra o veto…
    videos.trocar("cm01", "q", "-", escolhas=esc, candidatos=cands, canais=[], extrair=None, gravar=False)
    assert esc["cm01"]["q"] is None and esc["cm01"]["vetado"] == {"q": [a["url"]]}
    # …e escolher não mexe numa questão que já tem entrada
    videos.escolher("cm", candidatos=cands, escolhas=esc, qs=qs, gravar=False)
    assert esc["cm01"]["q"] is None
    # com --preencher enche o que está vazio, pulando o vetado (e o vídeo da matéria)
    videos.escolher("cm", candidatos=cands, escolhas=esc, qs=qs, gravar=False, preencher=True)
    assert esc["cm01"]["q"] == b["url"]
    # apagar de novo veta o b também; sem candidata restante, fica vazio mesmo com --preencher
    videos.trocar("cm01", "q", "-", escolhas=esc, candidatos=cands, canais=[], extrair=None, gravar=False)
    assert esc["cm01"]["vetado"]["q"] == [a["url"], b["url"]]
    sem = videos.escolher("cm", candidatos=cands, escolhas=esc, qs=qs, gravar=False, preencher=True)
    assert esc["cm01"]["q"] is None and sem == ["cm01/q"]

@teste
def test_videos_buscar_extra_poe_as_candidatas_na_frente():
    import videos
    velha = {"url": "https://www.youtube.com/watch?v=aaaaaaaaaaa", "videoId": "aaaaaaaaaaa", "titulo": "a", "canal": "c", "canalId": "UC1", "duracao": 600, "views": 1, "data": None}
    cands = {"cm08": {"q": [velha], "m": []}}
    nova = {"id": "bbbbbbbbbbb", "title": "b", "channel": "c", "channel_id": "UC1", "duration": 900, "view_count": 2}
    fora = {"id": "ccccccccccc", "title": "x", "channel": "y", "channel_id": "UCfora", "duration": 900, "view_count": 2}
    n = videos.buscar_extra("cm08", "q", "esclerose sistêmica residência médica", candidatos=cands, canais=[{"id": "UC1", "nome": "c"}], buscar=lambda c: [nova, fora, dict(nova)], gravar=False)
    assert n == 1 and [c["videoId"] for c in cands["cm08"]["q"]] == ["bbbbbbbbbbb", "aaaaaaaaaaa"]

@teste
def test_videos_buscar_retoma_de_onde_parou():
    import videos
    # uma busca interrompida (memória, rede) recomeça só pelo que falta; --tudo refaz
    feito = {"url": "https://www.youtube.com/watch?v=aaaaaaaaaaa", "videoId": "aaaaaaaaaaa", "titulo": "a", "canal": "c", "canalId": "UC1", "duracao": 600, "views": 1, "data": None}
    cands = {"cm01": {"q": [feito], "m": []}}
    qs = [{"id": "cm01", "area": "cm", "tema": "T1", "termo": None}, {"id": "cm02", "area": "cm", "tema": "T2", "termo": None}]
    chamadas = []
    def busca(c): chamadas.append(c); return []
    videos.buscar("cm", buscar=busca, candidatos=cands, canais=[{"id": "UC1", "nome": "c"}], qs=qs, gravar=False, pausa=0)
    assert chamadas == ["T2 residência médica", "T2 aula"], chamadas   # cm01 já estava feito (q com lista, m vazio mas feito)
    chamadas.clear()
    videos.buscar("cm", buscar=busca, candidatos=cands, canais=[{"id": "UC1", "nome": "c"}], qs=qs, gravar=False, pausa=0, tudo=True)
    assert len(chamadas) == 4

if __name__ == "__main__":
    for f in testes:
        try:
            f(); print("ok   ", f.__name__)
        except Exception as e:
            falhas.append(f.__name__); print("FALHA", f.__name__, "->", e)
    print(f"\n{len(testes) - len(falhas)}/{len(testes)} testes passaram")
    sys.exit(1 if falhas else 0)
