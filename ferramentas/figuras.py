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
  # Obstetrícia — TEGO Obstetrícia 2025: obst01–obst50 = questões 1, 2, 4, 5, 6, 9, 10, 12, 13, 15, 16, 17, 18, 20, 22, 23, 24, 25, 26, 27, 28, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 57, 58, 59, 60
  "obst01": ["monochorionic diamniotic twin pregnancy ultrasound", "twin pregnancy ultrasound", "twins ultrasound"],
  "obst02": ["Toxoplasma gondii tachyzoites", "congenital toxoplasmosis intracranial calcification", "Toxoplasma gondii"],
  "obst03": ["acute pulmonary edema chest x-ray", "pulmonary edema radiograph", "pulmonary edema"],
  "obst04": ["hepatitis B virus", "tenofovir tablets", "hepatitis B"],
  "obst05": ["Bakri balloon", "intrauterine balloon tamponade", "postpartum hemorrhage uterus"],
  "obst06": ["Kielland forceps", "obstetric forceps", "forceps delivery"],
  "obst07": ["schistocytes blood smear", "peripheral blood smear fragmented red cells", "HELLP syndrome"],
  "obst08": ["genital herpes lesions", "herpes simplex virus", "herpes labialis vesicles"],
  "obst09": ["Wernicke encephalopathy MRI", "thiamine", "hyperemesis gravidarum"],
  "obst10": ["breastfeeding newborn latch", "breastfeeding", "lactation"],
  "obst11": ["Graves disease goiter", "propylthiouracil", "thyroid gland"],
  "obst12": ["omphalocele newborn", "omphalocele", "gastroschisis"],
  "obst13": ["placenta histology villi", "chorangiosis", "placental villi microscopy"],
  "obst14": ["umbilical artery doppler ultrasound", "fetal growth restriction ultrasound", "doppler ultrasound pregnancy"],
  "obst15": ["sickle cells blood smear", "hemoglobin electrophoresis", "sickle cell disease"],
  "obst16": ["respiratory syncytial virus", "RSV electron micrograph", "vaccination pregnant woman"],
  "obst17": ["Treponema pallidum dark field", "VDRL test", "syphilis serology"],
  "obst18": ["blood pressure measurement sphygmomanometer", "blood pressure cuff arm", "sphygmomanometer"],
  "obst19": ["Plasmodium falciparum gametocyte", "malaria blood smear", "Anopheles mosquito"],
  "obst20": ["HTLV-1 virus", "human T-lymphotropic virus", "retrovirus electron micrograph"],
  "obst21": ["breech birth", "breech presentation", "frank breech"],
  "obst22": ["pregnant teenager", "hospital consultation adolescent", "pregnancy test"],
  "obst23": ["chorioamnionitis histology", "preterm labor", "amniotic membranes"],
  "obst24": ["fetal circulation diagram", "ductus venosus", "fetal circulation"],
  "obst25": ["cervical length transvaginal ultrasound", "cervical cerclage", "cervix ultrasound"],
  "obst26": ["cesarean scar pregnancy ultrasound", "ectopic pregnancy ultrasound", "methotrexate"],
  "obst27": ["cesarean section incision uterus", "classical cesarean section", "cesarean section"],
  "obst28": ["dengue virus", "Aedes aegypti", "dengue rash"],
  "obst29": ["surgical sponge count", "retained surgical sponge x-ray", "gossypiboma"],
  "obst30": ["middle cerebral artery doppler fetal", "cordocentesis", "Rh disease"],
  "obst31": ["pulmonary embolism CT angiography", "enoxaparin syringe", "pulmonary embolism"],
  "obst32": ["cervical cerclage", "McDonald cerclage", "cervical insufficiency"],
  "obst33": ["lupus anticoagulant test", "antiphospholipid syndrome", "aspirin tablets"],
  "obst34": ["magnesium sulfate injection", "intramuscular injection gluteal", "magnesium sulfate"],
  "obst35": ["postpartum depression", "sertraline tablets", "mother and newborn sad"],
  "obst36": ["mitral valve prolapse echocardiogram", "mitral valve", "heart valves anatomy"],
  "obst37": ["hemorrhagic shock", "blood transfusion bag", "postpartum hemorrhage"],
  "obst38": ["misoprostol tablets", "manual vacuum aspiration", "misoprostol"],
  "obst39": ["external cephalic version", "breech presentation ultrasound", "breech presentation"],
  "obst40": ["monochorionic twins ultrasound T sign", "twin pregnancy ultrasound", "monochorionic twins"],
  "obst41": ["B-Lynch suture", "uterine compression suture", "uterus surgery"],
  "obst42": ["cardiotocography early deceleration", "cardiotocography", "CTG trace"],
  "obst43": ["Ogilvie syndrome abdominal x-ray", "colonic pseudo-obstruction", "abdominal x-ray distended colon"],
  "obst44": ["tranexamic acid", "tranexamic acid ampoule", "postpartum hemorrhage"],
  "obst45": ["placenta accreta", "placenta accreta ultrasound", "hysterectomy specimen"],
  "obst46": ["vacuum extractor", "ventouse delivery", "Kiwi vacuum"],
  "obst47": ["phenytoin", "levetiracetam tablets", "EEG seizure"],
  "obst48": ["thyroid storm", "Graves ophthalmopathy exophthalmos", "propylthiouracil"],
  "obst49": ["hydralazine", "hydralazine injection", "blood pressure monitor"],
  "obst50": ["ductus venosus doppler", "fetal growth restriction", "umbilical artery doppler absent end diastolic flow"],
  # Ginecologia — gine01–gine29 = Ginecologia 2025 nº 1, 2, 5, 7, 10, 11, 12, 13, 14, 19, 21, 22, 29, 31, 32, 33, 34, 37, 39, 42, 43, 44, 46, 48, 49, 54, 57, 58, 60;
  # gine30–gine50 = Ginecologia 2022 nº 2, 8, 14, 17, 19, 22, 23, 24, 25, 27, 28, 29, 30, 31, 44, 50, 51, 52, 53, 59, 60
  "gine01": ["Escherichia coli bacteria", "urinary tract infection diagram", "vaginal estrogen cream"],
  "gine02": ["surgical suture Vicryl", "absorbable suture", "surgical suture needle"],
  "gine03": ["pelvic floor muscles anatomy", "urodynamic study", "Kegel exercise"],
  "gine04": ["vulva anatomy vestibule", "lidocaine gel", "vulvar vestibule"],
  "gine05": ["condyloma acuminatum", "human papillomavirus", "genital warts"],
  "gine06": ["abdominal x-ray dilated bowel loops", "paralytic ileus x-ray", "intravenous fluids bag"],
  "gine07": ["patient safety checklist", "copper intrauterine device", "hospital checklist"],
  "gine08": ["necrotizing fasciitis", "necrotizing fasciitis leg", "surgical debridement"],
  "gine09": ["combined oral contraceptive pill pack", "oral contraceptive pills", "ethinylestradiol"],
  "gine10": ["endometritis histology", "intravenous antibiotic", "uterus anatomy diagram"],
  "gine11": ["cystoscopy", "cystoscope", "bladder cystoscopy image"],
  "gine12": ["vaginal dilators", "vaginismus", "pelvic floor physiotherapy"],
  "gine13": ["endometriosis laparoscopy", "endometriosis", "endometriosis lesions"],
  "gine14": ["laparoscopy trocar insertion", "Veress needle", "laparoscopy abdomen"],
  "gine15": ["menstrual cycle calendar", "premenstrual syndrome", "woman headache"],
  "gine16": ["vaginal pessary ring", "pessary", "pelvic organ prolapse"],
  "gine17": ["uterus ligaments anatomy", "female pelvis anatomy uterosacral", "pelvic ligaments"],
  "gine18": ["uterus didelphys", "Müllerian duct anomalies diagram", "uterine malformation"],
  "gine19": ["retained surgical sponge CT", "gossypiboma", "surgical sponge"],
  "gine20": ["urethral prolapse", "female urethra anatomy", "pediatric examination child doctor"],
  "gine21": ["endometrial polyp hysteroscopy", "hysteroscopy", "submucous fibroid"],
  "gine22": ["pyelonephritis", "kidney anatomy", "pyelonephritis CT"],
  "gine23": ["Gardnerella vaginalis", "clue cells", "bacterial vaginosis"],
  "gine24": ["uterine fibroid ultrasound", "leiomyoma uterus", "hysterectomy specimen fibroids"],
  "gine25": ["secondary syphilis palms", "lumbar puncture", "Treponema pallidum"],
  "gine26": ["clue cell gram stain", "Gram stain bacterial vaginosis", "metronidazole tablets"],
  "gine27": ["sacrospinous ligament anatomy", "pelvic organ prolapse surgery", "sacrospinous fixation"],
  "gine28": ["clue cells wet mount", "bacterial vaginosis microscopy", "vaginal wet mount"],
  "gine29": ["acyclovir tablets", "post-exposure prophylaxis HIV", "emergency contraception"],
  "gine30": ["Müllerian ducts embryology", "embryo development genital ducts", "anti-Müllerian hormone"],
  "gine31": ["uterine fibroids diagram", "leiomyoma", "uterus fibroid types"],
  "gine32": ["Mayer-Rokitansky-Küster-Hauser", "vaginal agenesis", "uterus anatomy"],
  "gine33": ["von Willebrand factor", "coagulation cascade", "blood coagulation test"],
  "gine34": ["adenomyosis ultrasound", "adenomyosis", "adenomyosis MRI"],
  "gine35": ["VDRL test", "syphilis serology", "Treponema pallidum"],
  "gine36": ["condylomata lata", "secondary syphilis", "benzathine penicillin"],
  "gine37": ["genital herpes", "herpes simplex virus electron micrograph", "acyclovir tablets"],
  "gine38": ["Neisseria gonorrhoeae gram stain", "gonorrhea", "ceftriaxone vial"],
  "gine39": ["pelvic inflammatory disease", "salpingitis", "fallopian tube anatomy"],
  "gine40": ["tubo-ovarian abscess ultrasound", "intrauterine device", "copper IUD"],
  "gine41": ["mirabegron", "overactive bladder", "urinary bladder anatomy"],
  "gine42": ["levonorgestrel intrauterine system", "Mirena IUD", "hormonal IUD"],
  "gine43": ["endometriosis MRI", "deep endometriosis", "MRI pelvis"],
  "gine44": ["lichen sclerosus", "lichen sclerosus vulva", "clobetasol"],
  "gine45": ["pelvic floor anatomy DeLancey", "vaginal hysterectomy", "pelvic organ prolapse diagram"],
  "gine46": ["cefazolin vial", "cefazolin", "antibiotic prophylaxis surgery"],
  "gine47": ["cystoscopy ureteral orifice", "ureter anatomy", "cystoscopy"],
  "gine48": ["hysteroscopy", "hysteroscope", "uterine perforation"],
  "gine49": ["hemorrhagic ovarian cyst ultrasound", "ovarian cyst", "laparoscopy ovary"],
  "gine50": ["telemedicine consultation", "informed consent form", "telemedicine"],
  # Reprodução — repro01–repro19 = Ginecologia 2025 nº 3, 4, 15, 16, 17, 20, 25, 26, 27, 30, 35, 36, 38, 41, 50, 52, 53, 55, 56;
  # repro20–repro38 = Ginecologia 2022 nº 1, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 20, 26, 32, 33, 34, 38, 39, 57; repro39 = Obstetrícia 2025 nº 41; repro40 = Obstetrícia 2022 nº 58
  "repro01": ["progestogen only pill blister", "breastfeeding mother infant", "contraceptive pills blister"],
  "repro02": ["antral follicles ovary ultrasound", "ovary histology follicles", "blood sample tubes laboratory"],
  "repro03": ["etonogestrel implant", "contraceptive implant arm", "blood pressure measurement"],
  "repro04": ["polycystic ovary ultrasound", "letrozole tablets", "polycystic ovary syndrome"],
  "repro05": ["gallstones gallbladder specimen", "gallbladder stones", "cholecystectomy laparoscopic"],
  "repro06": ["hypothalamic pituitary ovarian axis", "ovary primordial follicles histology", "hot flash woman"],
  "repro07": ["osteoclast bone resorption", "osteoporosis trabecular bone", "osteoporosis bone micrograph"],
  "repro08": ["testosterone cypionate vial", "testosterone injection vial", "transgender pride flag"],
  "repro09": ["alendronate tablets", "distal radius fracture x-ray", "osteoporosis hip x-ray"],
  "repro10": ["menstrual cycle diagram endometrium", "proliferative endometrium histology", "secretory endometrium histology"],
  "repro11": ["bicornuate uterus ultrasound", "bicornuate uterus", "liver cirrhosis gross"],
  "repro12": ["woman smoking cigarette", "cigarette smoke", "oral contraceptive pills"],
  "repro13": ["copper intrauterine device", "copper IUD T 380", "intrauterine device"],
  "repro14": ["cervical ectropion", "cervix speculum examination photograph", "cervical ectropion colposcopy"],
  "repro15": ["intrauterine device insertion", "IUD insertion illustration", "copper intrauterine device"],
  "repro16": ["contraceptive implant insertion arm", "Implanon insertion", "etonogestrel implant"],
  "repro17": ["female marathon runner", "woman athlete running track", "leptin hormone structure"],
  "repro18": ["mammography machine", "mammogram examination", "colonoscopy procedure"],
  "repro19": ["androgen receptor structure", "androgen insensitivity syndrome", "karyotype 46 XY"],
  "repro20": ["levonorgestrel emergency contraception", "emergency contraceptive pill", "levonorgestrel tablets"],
  "repro21": ["fibrous dysplasia skull x-ray", "cafe au lait spot skin", "fibrous dysplasia bone"],
  "repro22": ["oral glucose tolerance test", "blood glucose meter", "woman walking exercise park"],
  "repro23": ["fluoxetine capsules", "fluoxetine", "antidepressant capsules"],
  "repro24": ["gonadotropin releasing hormone structure", "hand x-ray bone age child", "pituitary gland anatomy"],
  "repro25": ["polycystic ovary ultrasound", "hirsutism face", "combined oral contraceptive pill pack"],
  "repro26": ["migraine aura scintillating scotoma", "migraine aura", "ischemic stroke MRI"],
  "repro27": ["deep vein thrombosis leg", "deep vein thrombosis ultrasound", "copper intrauterine device"],
  "repro28": ["Nexplanon implant", "contraceptive implant", "teenage girl doctor consultation"],
  "repro29": ["copper IUD x-ray pelvis", "intrauterine device", "chemotherapy infusion"],
  "repro30": ["oocyte cryopreservation", "liquid nitrogen cryopreservation tank", "human oocyte microscope"],
  "repro31": ["spironolactone tablets", "spironolactone", "hirsutism"],
  "repro32": ["hydrosalpinx hysterosalpingography", "hysterosalpingography", "Chlamydia trachomatis inclusion"],
  "repro33": ["estradiol transdermal patch", "hormone replacement therapy patch", "estradiol patch skin"],
  "repro34": ["osteoporosis vertebral compression fracture x-ray", "osteoporotic bone", "woman smoking"],
  "repro35": ["gabapentin capsules", "gabapentin", "menopause hot flash"],
  "repro36": ["hydrosalpinx laparoscopy", "hydrosalpinx ultrasound", "salpingectomy laparoscopic"],
  "repro37": ["estradiol valerate ampoule", "estradiol tablets", "transgender woman portrait"],
  "repro38": ["intracytoplasmic sperm injection", "embryo transfer IVF", "IVF laboratory embryologist"],
  "repro39": ["cesarean section surgery uterus", "caesarean section operation", "copper intrauterine device"],
  "repro40": ["tubal ligation illustration", "tubal ligation", "fallopian tube anatomy"],
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
  # os que a 1ª rodada devolveu fora do tema (choque → válvula industrial; versão cefálica → "ECV" aviões e carros)
  "obst37": ["packed red blood cells transfusion bag", "blood transfusion", "massive transfusion"],
  "obst39": ["breech presentation fetus drawing", "breech baby ultrasound", "frank breech birth"],
  "gine27": ["sacrospinous ligament", "pelvis ligaments anatomy sacrotuberous", "female pelvis bones ligaments"],
}
CONSULTAS3 = {
  # 3ª rodada: a 1ª deu uma página de revista (obst05), um rabisco (obst35) e um corte sem os gêmeos (obst40)
  "obst05": ["Foley catheter balloon inflated", "urinary catheter balloon", "Foley catheter"],
  "obst35": ["sertraline tablets", "Zoloft pills", "antidepressant tablets blister"],
  "obst40": ["twin fetuses ultrasound first trimester", "dichorionic twins ultrasound lambda sign", "twins ultrasound 12 weeks"],
  "gine16": ["Gellhorn pessary", "ring pessary silicone", "pessary device prolapse"],
  "gine36": ["Treponema pallidum electron micrograph", "benzathine penicillin vial", "Treponema pallidum"],
  "gine45": ["pelvic organ prolapse illustration", "uterine prolapse diagram", "cystocele diagram"],
  "gine47": ["ureteral jet ultrasound", "rigid cystoscope instrument", "indigo carmine"],
}
CONSULTAS4 = {
  # 4ª rodada: fora do envelope (obst46 540×1110; obst50 3240×1000) e "FGR" devolveu aviões
  "obst46": ["vacuum extraction cup newborn", "ventouse obstetric cup", "obstetric vacuum delivery illustration"],
  "obst50": ["ductus venosus doppler waveform", "fetal doppler ultrasound waveform", "small for gestational age fetus ultrasound"],
}
CONSULTAS5 = {
  # 5ª rodada (Reprodução): a 1ª deu um raio X com marca d'água (repro21), gráficos e ônibus "GTT" (repro22),
  # uma cantora e moedas para "oocyte cryopreservation" (repro30) e um corredor de hospital (repro36)
  "repro21": ["fibrous dysplasia radiograph femur", "McCune-Albright syndrome", "cafe-au-lait macule neurofibromatosis"],
  "repro22": ["glucometer blood glucose test strip", "blood glucose meter finger", "glucose tolerance test drink"],
  "repro30": ["liquid nitrogen dewar cryogenic storage", "cryopreservation straws liquid nitrogen", "IVF laboratory cryostorage"],
  "repro36": ["hydrosalpinx", "fallopian tube hydrosalpinx laparoscopy", "hydrosalpinx MRI"],
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
    elif modo == "candidatos5":
        candidatos2(CONSULTAS5)
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
