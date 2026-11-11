# Banco TEGO (FEBRASGO) — commented question bank — design

Date: 2026-11-11 · Project: `med/tego/` (new; own Vercel project `tego`) · Status: user said "start" after the source recon; decisions below are the user's where marked, mine otherwise

This spec is in English because it is a working document. Everything it
produces (data files, app, caderno, README, code comments, tooling output,
commits) stays in pt-BR, as the study projects require.

The engine is **not** designed here: it is the AMRIGS bank (`med/amrigs`,
HEAD `80ddcbf`, itself a fork of SUS-SP) copied as it is — screen app, caderno
in continuous flow, black-and-white design with the seal of Iyar, five QR codes
per ficha, highlighter and OpenDyslexic post-its, per-area apostilas, harness,
controls, tests. This document says what the new bank is, where its questions
come from, what changes in the copy, and in what order it gets built.

## 1. Goal

A commented bank of **real questions of the TEGO** — the Exame de Suficiência
para obtenção do Título de Especialista em Ginecologia e Obstetrícia, run by
the **FEBRASGO** under the AMB — for the same client as the SUS-SP and AMRIGS
banks. Same deliverable: screen app with three tabs per question (Comentário,
Simplificando, Sobre a matéria), a Commons figure per question, the banca's own
image when the question depends on one, printable caderno, PDFs at `/pdf/`.

**User decisions (2026-11-11) — do not re-open**

- Five volumes, **50 questions each**: **Obstetrícia, Ginecologia, Oncologia,
  Reprodução, Mastologia** (the user's names and order).
- Sources to start with: **TEGO 2022** and the prova reproduced in Estratégia
  MED's "Guia da Aprovação TEGO 2026", which is the **TEGO 2025** teórica (the
  PDF was created on 2025-10-20 and holds none of the questions quoted in the
  2026 recursos; the 2026 caderno exists only behind the eduCAT login).
- Same design as AMRIGS, "exactly the same and more".

**My calls (say so in the README; the user can overrule)**

- Each prova is its own fonte (§3.2): the TEGO numbers Ginecologia and
  Obstetrícia 1–60 separately, so "Questão 13 (TEGO Obstetrícia 2025)" is the
  only honest label. The harness' rótulo rule widens to allow the prova name.
- Volumes are assigned **by theme, by hand** (the provas are only "Ginecologia"
  and "Obstetrícia"); the map is a file per fonte (§3.4) and the reason per
  question goes to `selecao.md`.
- With two editions only Obstetrícia reaches 50. The other four are built with
  what the two editions give (roughly Ginecologia 43, Reprodução 35, Mastologia
  22, Oncologia 20, by a keyword pass to be confirmed by hand) and grow when a
  third source arrives — Estratégia's 2024 guide (behind a name-and-email form
  the user fills) or the eduCAT cadernos 2023–2026 if the client has a login.
  Until then the README says how many each volume has; nothing says "em breve".

## 2. Folder, repo, deploy

- `med/tego/` — git repo (`main` = production), private GitHub remote
  `med-tego` under the same account as `med-amrigs`.
- Vercel project **`tego`** → `tego.vercel.app` (free on 2026-11-11: the URL
  answers DEPLOYMENT_NOT_FOUND; `meta.site` records whatever it ends up being).
  Static, no build. Deploy: `python ferramentas/pdf.py` then
  `npx vercel deploy --prod --yes`. `vercel.json` keeps git auto-deploy off
  (`pdf/` is outside git), as in AMRIGS.
- **The fork** (done by `fork-tego.py` in the session scratchpad): every file
  tracked by `med/amrigs` except `banco.js`, `videos.json`, `README.md`,
  `figuras/*`, `ferramentas/cadernos/*`, `ferramentas/entrada/*`,
  `ferramentas/materia/*`, `ferramentas/videos/*`, `ferramentas/legendas.js`
  (replaced by an empty module), `ferramentas/selecao.md`, `docs/`. After the
  string sweep (§5), `grep -riw "amrigs\|fundatec"` outside `docs/` returns
  nothing but the "irmão do banco AMRIGS" line of the README.

## 3. The exam and the sources

### 3.1 Structure (edital nº 995, TEGO 2026; same since 2021)

1ª fase: **two provas teóricas de múltipla escolha, 60 questões cada,
Ginecologia e Obstetrícia, 4 alternativas (A–D), uma correta**, on-line on the
eduCAT platform, 4h30 in 2026 (Ginecologia 8h–10h, Obstetrícia 10h30–12h30).
Passing to the 2ª fase (teórico-prática, presencial): **nota ≥ 6,00 em cada
prova** (60%). 2026 dates: inscrições 26/03–29/04, teórica 26/07, gabarito
preliminar same day, recursos until 28/07, gabarito definitivo 28/08, 2ª fase
18/10, resultado final 08/12/2026. The conteúdo programático (39 Ginecologia
topics, 34 Obstetrícia topics, 8 common themes) and the bibliography are in
the edital (`ferramentas/cadernos/tego2026-edital.pdf`).

### 3.2 Fontes (ids, rótulos, documents)

| fonte id | rótulo | prova | source document | gabarito |
|---|---|---|---|---|
| `tego2025g` | TEGO Ginecologia 2025 | Ginecologia, 27/07/2025, q. 1–60 | Estratégia MED, Guia da Aprovação TEGO 2026, pp. 5–45 (q. 1–60) | p. 46 (official key, confirmed by the guide's own notes on rejected recursos) |
| `tego2025o` | TEGO Obstetrícia 2025 | Obstetrícia, 27/07/2025, q. 1–60 | same guide, q. 61–120 → **numero = n − 60** | p. 47 |
| `tego2022g` | TEGO Ginecologia 2022 | Ginecologia, 2022, q. 1–60 | official caderno (FEBRASGO layout) hosted by Estratégia MED; the Medgrupo copy carries the same key | "GABARITO DA PROVA" table in the caderno (identical in both hosts) |
| `tego2022o` | TEGO Obstetrícia 2022 | Obstetrícia, 2022, q. 1–60 | idem | idem |

No annulled question in either edition's key. FEBRASGO publishes no
justificativas: every `<fonte>-recursos.json` is `{}` and no comentário has a
"Nos recursos, a banca" paragraph (the harness rule stays, both ways).
`nomeOficial`: "Exame de Suficiência para obtenção do Título de Especialista em
Ginecologia e Obstetrícia — Prova de Ginecologia, TEGO 2025" etc. URLs, download
dates and md5 go to `ferramentas/cadernos/FONTES.md`; the guide's own comments
are **never copied** (copyright): only the question text, the figures and the
key are used, and our comentários are written from scratch as always.

### 3.3 Selection rule

- Candidates: all 240 (none annulled), minus any question whose alternatives
  are images (none seen so far).
- Priority: everything of 2025 that fits a volume, then 2022 fills to 50 by
  topic coverage. Obstetrícia has 120 candidates: all 2025 obst that is
  obstetric (≈ 51), then 2022 for the uncovered topics.
- Ids `<area>01`–`<area>50` in source order (fontes in `meta.fontes` order:
  2025g, 2025o, 2022g, 2022o; by number inside a fonte), as montar.js orders.
- Picks and exclusions, one line per question (number · theme), in
  `ferramentas/selecao.md`.

### 3.4 Area map

`ferramentas/cadernos/<fonte>-areas.json`: `{ "13": "masto", … }` for every
question of the fonte, written by hand from the stems (keyword pass first,
then read each one). `extrai_tego.py` copies it into `area` of
`<fonte>-questoes.json`, so montar.js' "no caderno essa questão é do bloco X"
check keeps working. Boundaries: **Mastologia** = anything whose object is the
breast (benign, cancer, imaging, lactation problems that are breast disease);
**Oncologia** = pre-malignant and malignant disease of cervix, endometrium,
ovary, vulva/vagina, GTD, hereditary cancer, screening, oncofertility;
**Reprodução** = endocrinologia ginecológica (puberty, amenorrhoea, PCOS,
hyperandrogenism, hyperprolactinaemia), infertility and ART, contraception and
family planning, climatério/menopause hormone therapy; **Ginecologia** = the
rest of the Ginecologia prova (SUA, miomas, endometriose, dor pélvica, DIP and
ISTs, vulvovaginites, uroginecologia, prolapse, surgery and complications,
anatomy/embryology, malformations, sexuality, semiology); **Obstetrícia** =
everything obstetric, including the few obstetric questions of the Ginecologia
prova and minus the breast questions of the Obstetrícia prova (lactation
mastitis → masto).

## 4. Data contract — what changes in `window.BANCO`

Everything in the AMRIGS contract holds. Changes:

- `meta`: `banca: "FEBRASGO"`, `orgao: "FEBRASGO — Federação Brasileira das
  Associações de Ginecologia e Obstetrícia, pela AMB"`, `concurso: "TEGO —
  Exame de Suficiência para o Título de Especialista em Ginecologia e
  Obstetrícia"`, `prova` (one line: next edition, 2027, edital expected in
  March; 2026 dates as reference), `cronograma` (2026 full), `estrutura: "2
  provas × 60 questões (Ginecologia e Obstetrícia) · 4 alternativas · 4h30 ·
  on-line (eduCAT)"`, `numeros: { questoes: 120, porArea: 60, alternativas: 4,
  horas: 4.5, corte: 60 }` (porArea = per prova; the page label becomes "por
  prova"), `site`, `areas` = the five volumes with ids `obst, gine, onco,
  repro, masto` (new colour tokens in app.css; greys in caderno.css),
  `fontes` as §3.2.
- Comentário opening: `Questão N (TEGO Ginecologia 2025). Gabarito X.`
- `imagemBanca.credito`: "Imagem da prova · caderno da <nomeOficial>
  (FEBRASGO)".
- Cut-off wording (page, caderno panel, self-assessment): "A FEBRASGO exige
  60% de acertos em cada prova (nota 6,00) para chamar à 2ª fase. Mantendo
  esta taxa nas 120 questões, você estaria acima/abaixo dos 60%."
- `referencias`: the edital's own bibliography first when it covers the topic
  (Tratados FEBRASGO de Ginecologia e de Obstetrícia, Williams, Zugaib,
  Rezende, Berek & Novak, FEBRASGO/FIGO/ACOG guidelines, Tratado de
  Mastologia da SBM), then other guidelines.

## 5. Changes in the copied engine (the only ones)

- **Strings**: titles, sigla "TEGO", h1 "Banco comentado — TEGO · FEBRASGO",
  localStorage keys `tego:*`, footer/`@page` texts ("Caderno TEGO · FEBRASGO",
  "tego.vercel.app"), `pdf.py` AREAS and profile prefix, `commons.py` and
  `videos.py` user agents, `serializar.js` banner, `v/` and `videos/` labels
  (`fonte.replace("amrigs", …)` → a label from the rótulo), comments.
- **Harness**: rótulo regex allows "TEGO Ginecologia 2025"; the
  Certificado-de-Bom-Desempenho checks become the 60%-per-prova wording; the
  sigla check (four letters still needs min-width + padding, keep it);
  `recursos.json` may be `{}`; `ESPERADO` lists the areas as they are filled.
  Controls follow (the ones that cite AMRIGS strings).
- **Extractor** `ferramentas/extrai_tego.py` (new, §6) replaces
  `extrai_fundatec.py` (kept for `separar_fundatec`/`eh_rotulo` and its
  tests); `parse_fundatec.py` is replaced by `gabarito_tego.py` (reads the
  key tables of both layouts, writes `<fonte>-gabarito.txt` and an empty
  `<fonte>-recursos.json`).
- **figuras.py** CONSULTAS and `AUTORES` start empty; `baixar.js` lists the
  TEGO URLs.
- Nothing else.

## 6. Extractor — two layouts, one output

Same outputs as AMRIGS (`<fonte>.txt` in the "NN.\tstem / (A)\t…" format,
`-questoes.json`, `-hifens.txt`, `-rotulos.txt`, images in
`figuras/banca/<fonte>-NN.<ext>`), from:

- **Official caderno 2022**: "QUESTÃO" on one line, the number on the next,
  alternatives "A - text" (wrapping allowed), page header of three lines
  ("EXAME DE SUFICIÊNCIA…", "ESPECIALISTA EM…", "PROVA DE … – TEGO – 2022") and
  a page number; stops at "GABARITO DA PROVA". Images are rasters between the
  stem and the alternatives (33 in Ginecologia, 18 in Obstetrícia).
- **Estratégia guide 2025**: pages 5–45 only; "NN-\tstem", alternatives
  "A)\ttext"; header "Estratégia MED | Guia da Aprovação TEGO | 2026" + page
  number; a 680 × 666 background image on every page (ignored by its bbox);
  question figures are the other rasters. Questions 61–120 become the
  Obstetrícia fonte with `numero − 60`.

Both go through `juntar_hifens`, `eh_rotulo` (labels next to a figure) and
`separar_fundatec`. Images are checked by eye on a contact sheet before any
area is written (a question without its image is unusable).

## 7. Verification

`node verificar.js`, `node controles.js`, `python ferramentas/testes.py` (the
Fundatec tests that read AMRIGS files are replaced by TEGO equivalents:
extraction counts 60/60/60/60, keys 60 letters each and identical to the
second host for 2022, images mapped, areas complete), `node
ferramentas/conferir_readme.js`. Live checks after each deploy as in AMRIGS.

## 8. Delivery, in sessions

0. **Setup** (this session): fork, sources in `cadernos/` + `FONTES.md`,
   `extrai_tego.py` + `gabarito_tego.py` + tests, area maps for the four
   fontes, `meta.js`, string sweep, CSS tokens, harness/controls adjusted,
   README skeleton, a two-question smoke bank in `obst`, harness/controls/tests
   green, git init + remote `med-tego` + push, preview deploy.
1. **Obstetrícia** (50), 2. **Ginecologia**, 3. **Reprodução**, 4. **Mastologia**,
   5. **Oncologia** — each: picks in `selecao.md`, `entrada/<area>.js`,
   figures, captions, `materia/<area>.js`, harness + controls + README, PDFs,
   production deploy, commit + push, vault. Volumes 2–5 ship with what the two
   editions hold and are completed when the third source arrives.
6. Videos layer (whitelist curated for GO: Medcof GO, Estratégia MED, Medway,
   GOBcurso, FEBRASGO's own channel…, plus the cursinhos' corrections of TEGO
   2025 and 2022 as the question video) — its own session, as in AMRIGS.
7. Close: README numbers, memory, vault.

## 9. Out of scope

The TEGO 2ª fase (teórico-prática), the TPI, the áreas de atuação exams,
authored questions (not until the user asks), any change to `med/amrigs` or
`med/susp`.
