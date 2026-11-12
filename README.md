# Banco TEGO — FEBRASGO

Banco de questões comentadas de **Obstetrícia, Ginecologia, Oncologia,
Reprodução e Mastologia** para o **TEGO** — Exame de Suficiência para
obtenção do Título de Especialista em Ginecologia e Obstetrícia, da FEBRASGO
pela AMB. Questões **reais** das provas teóricas (quatro alternativas, como a
banca as faz), extraídas dos cadernos, com gabarito oficial, comentário,
referências, Simplificando, **uma figura por questão** (Wikimedia Commons,
licença livre) e, quando a questão depende dela, **a imagem da própria
prova**. Sem framework, sem build, sem servidor. Irmão dos bancos SUS-SP
(`med/susp/`) e AMRIGS (`med/amrigs/`), de onde herdou o motor inteiro
(caderno em fluxo corrido, preto e branco, cinco QR codes por ficha,
marca-texto e post-its em OpenDyslexic, uma apostila por área).

| O quê | Onde |
|---|---|
| Banco na tela | https://tego-febrasgo.vercel.app/ |
| Caderno para imprimir | https://tego-febrasgo.vercel.app/caderno/ |
| Vídeos — página de revisão (para o cliente) | https://tego-febrasgo.vercel.app/videos/ (os links curtos dos QR codes: `/v/<id>/q`, `/m`, `/mais`, `/flash`, `/mapa`) |
| Deploy | Pelo GitHub Actions (`.github/workflows/conferir.yml`, a cada push na `main` ou à mão, desde 2026-11-12): o job `conferir` roda o harness, os testes, o README e os controles; o job `apostilas` imprime os PDFs com `pdf.py` (Chrome do runner) e publica com `vercel deploy --prod` usando o segredo `VERCEL_TOKEN` do repositório — sem o segredo, só guarda os PDFs no artefato `apostilas`. Projeto `tego`, domínio `tego-febrasgo.vercel.app` (`tego.vercel.app` já era de outra conta); git em `main`, remoto privado `crispinekkovendas-blip/med-tego`. `vercel.json` desliga o deploy automático do GitHub, porque um build a partir do git não teria os PDFs: o deploy é sempre pela CLI, no Actions ou local (`python ferramentas/pdf.py` e `npx vercel deploy --prod --yes` em `med/tego/`) |
| PDFs prontos | https://tego-febrasgo.vercel.app/pdf/caderno-obst.pdf, `caderno-gine.pdf`, `caderno-repro.pdf` e `caderno-onco.pdf` (`masto` quando existir): uma apostila por área, paginada, com o índice dizendo a página de cada ficha — links no painel do caderno |

## Números (2026-11-12, sessão 4: Obstetrícia, Ginecologia, Reprodução e Oncologia completas)

| Área | TEGO Ginecologia 2025 | TEGO Obstetrícia 2025 | TEGO Ginecologia 2022 | TEGO Obstetrícia 2022 | Total |
|---|---|---|---|---|---|
| Obstetrícia | 0 | 50 | 0 | 0 | 50 |
| Ginecologia | 29 | 0 | 21 | 0 | 50 |
| Reprodução | 19 | 1 | 19 | 1 | 40 |
| Oncologia | 5 | 1 | 9 | 0 | 15 |
| **Total** | **53** | **52** | **49** | **1** | **155** |

Hoje o banco tem **155 questões** — as apostilas de **Obstetrícia** (as 50 da
prova de Obstetrícia do TEGO 2025; a prova tem 56 obstétricas, e seis que
repetiam tema ficaram de fora), de **Ginecologia** (as 29 ginecológicas de
2025 e 21 das 25 de 2022), de **Reprodução** (as 40 que as quatro provas
têm: 19 de cada prova de Ginecologia e uma de cada prova de Obstetrícia —
uma apostila de 40, porque as duas edições não rendem 50) e de **Oncologia**
(as 15 que as quatro provas têm: cinco da Ginecologia 2025, uma da
Obstetrícia 2025 e nove da Ginecologia 2022 — uma apostila de 15, tudo o que
as duas edições rendem) completas — ver `selecao.md`; as áreas entram uma a uma, na ordem Obstetrícia → Ginecologia →
Oncologia → Reprodução → Mastologia, cada uma com as suas questões, figuras e
mini-aulas. Ids `obst01–obst50`, `gine01–…`, `onco01–…`, `repro01–…`,
`masto01–…`; dentro da área, as fontes na ordem de `meta.fontes`
(Ginecologia 2025, Obstetrícia 2025, Ginecologia 2022, Obstetrícia 2022), cada
grupo pelo número da questão na prova. A lista e o motivo de cada escolha
ficam em `ferramentas/selecao.md`.

**O que as duas edições rendem por área** (classificação à mão de todas as
240 questões, em `cadernos/<fonte>-areas.json`): Obstetrícia 115, Ginecologia
54, Reprodução 40, Oncologia 15, Mastologia 13 — fora as três com
alternativas em imagem. Só Obstetrícia chega a 50 com 2022 e 2025; as outras
quatro apostilas saem com o que as duas edições têm e crescem quando entrar
uma terceira fonte (o Guia da Aprovação TEGO 2024 do Estratégia MED, atrás de
um formulário, ou os cadernos de 2023 a 2026 da área do candidato).

Hoje: **0 vídeos da questão** e **0 da matéria** escolhidos, de 26 canais
(`conferir_readme.js` confere esta frase) — a camada de vídeos ainda não foi
preenchida para o TEGO; `EXIGE_VIDEOS = false` no harness, e os QR codes caem
na página `v/` até lá. A lista branca (`ferramentas/videos/canais.json`) é a
herdada do AMRIGS, a ser revista para GO.

## A prova e as fontes

Edital nº 995 (TEGO 2026): a 1ª fase são **duas provas teóricas de múltipla
escolha, 60 questões cada — Ginecologia e Obstetrícia —, quatro alternativas
(A–D), uma correta**, on-line na plataforma eduCAT, 4h30 (em 2026:
Ginecologia 8h–10h, Obstetrícia 10h30–12h30, em 26/07/2026). Vai à 2ª fase
(teórico-prática, presencial) quem faz **nota ≥ 6,00 em cada prova** (60%).
Cronograma de 2026 e o que se sabe de 2027 em `ferramentas/meta.js` (`prova`,
`cronograma`, `estrutura`, `numeros`), de onde a página e o caderno leem. O
conteúdo programático (39 temas de Ginecologia, 34 de Obstetrícia, 8 comuns)
e a bibliografia estão no edital (`cadernos/tego2026-edital.pdf`).

**As fontes são uma por prova**, porque a FEBRASGO numera Ginecologia e
Obstetrícia de 1 a 60 separadamente: `tego2025g` (TEGO Ginecologia 2025),
`tego2025o`, `tego2022g`, `tego2022o`. O comentário abre com "Questão 13
(TEGO Obstetrícia 2025)". Desde 2023 a FEBRASGO publica os cadernos e
gabaritos só na área do candidato (eduCAT, com login); o que existe em público
são as cópias dos cursinhos: o **caderno oficial de 2022** (as duas provas,
com o "Gabarito da prova", hospedado pelo Estratégia MED e conferido com a
cópia do Medgrupo) e a **prova de 2025 inteira, com o gabarito oficial,
reproduzida no Guia da Aprovação TEGO 2026 do Estratégia MED** (o PDF é de
outubro de 2025 e nenhuma questão citada nos recursos do TEGO 2026 está nele;
os comentários do cursinho não são usados — só o texto da prova, as figuras e
o gabarito). Tudo em `ferramentas/cadernos/`, com URL, tamanho e md5 em
`FONTES.md` — os PDFs ficam fora do git desde que o repositório é público
(2026-11-12; baixe-os das URLs de `FONTES.md`, e `testes.py` confere o md5
dos que estão na pasta). Nenhuma questão anulada nas duas edições. A FEBRASGO não
publica justificativas de recursos: `cadernos/<fonte>-recursos.json` fica
vazio e nenhum comentário tem o parágrafo "Nos recursos, a banca".

**A área de cada questão é dada à mão** (`cadernos/<fonte>-areas.json`): as
provas são só "Ginecologia" e "Obstetrícia", e as cinco apostilas são as que o
usuário pediu. Fronteiras: Mastologia = tudo cujo objeto é a mama (benigno,
câncer, imagem, mastite da lactação); Oncologia = lesões precursoras e câncer
de colo, endométrio, ovário, vulva e vagina, doença trofoblástica, câncer
hereditário, rastreamento, câncer na gestação; Reprodução = endocrinologia
ginecológica (puberdade, amenorreia, SOP, hiperandrogenismo,
hiperprolactinemia), infertilidade e reprodução assistida, anticoncepção e
planejamento familiar, climatério; Ginecologia = o resto da prova de
Ginecologia (SUA, miomas, endometriose, dor pélvica, DIP e ISTs,
vulvovaginites, uroginecologia, prolapso, cirurgia e complicações, anatomia,
malformações, sexualidade, ética); Obstetrícia = tudo o que é obstétrico.
Fora do banco, por terem alternativas em imagem: Ginecologia 2022 nº 54 e 55,
Ginecologia 2025 nº 45.

## Imagens da banca

A questão que depende de figura, gráfico ou foto da prova entra com a imagem
da própria prova: `extrai_tego.py` grava cada bloco de imagem em
`figuras/banca/<fonte>-NN.<ext>` e marca a questão; `montar.js` põe em
`imagemBanca` o arquivo, o tamanho e o crédito ("Imagem da prova · caderno
da Exame de Suficiência … — Prova de Obstetrícia, TEGO 2025 (FEBRASGO)"); a
página e a ficha mostram a imagem entre o enunciado e as alternativas (na
tela, clicar amplia; no papel, até 70 mm de altura; a opção "Figuras: Não" do
caderno não a tira, porque ela é parte da questão). O harness exige a imagem
exatamente nas questões em que o caderno a tem. 89 das 240 questões têm
imagem (105 arquivos). As folhas de contato foram conferidas a olho em
2026-11-11.

## Arquivos

```
index.html            casca: fontes do Google + app.css + banco.js + app.js
banco.js              window.BANCO = { meta, questoes } — GERADO por ferramentas/montar.js
app.js  app.css       a página na tela (áreas e edições lidas de meta)
caderno/              o banco em papel (index.html, caderno.js, caderno.css; qrcode.js = qrcode-generator 1.4.4, MIT, Kazuhiko Arase;
                      fontes/ = OpenDyslexic, SIL OFL 1.1, com a OFL.txt — a letra dos post-its)
figuras/              <id>.jpg, uma por questão (≤ 1400 px, ≤ 600 KB) + FONTES.md (proveniência);
                      banca/ — as imagens da própria prova; candidatos.json,
                      escolhas.json e figuras.json ficam fora do ar
pdf/                  os PDFs do caderno (gerados por ferramentas/pdf.py; fora do git, no ar)
videos.json           os vídeos de cada questão (q, m, busca) — GERADO por ferramentas/videos.py gerar
v/                    os links curtos /v/<id>/<q|m|mais|flash|mapa>: destino.js (função pura) + index.html
videos/               a página de revisão dos vídeos, para o cliente (revisao.js + index.html)
vercel.json           desliga o deploy automático do GitHub na Vercel (o deploy é pela CLI, com os PDFs) e reescreve /v/<id>/<qual> para a página v/
verificar.js          o harness — não vai para o ar (.vercelignore)
controles.js          os controles negativos do harness — idem
ferramentas/          fora do ar: metadados, extração, montagem, figuras, vídeos, testes, seleção, cadernos
docs/superpowers/     spec e plano — fora do ar
```

### ferramentas/

- `meta.js` — banca, prova, **áreas** e **fontes**. É daqui que `banco.js`
  ganha o `meta`, e é de lá que página, caderno e harness leem a lista de
  áreas e de edições (`tego2025g`, `tego2025o`, `tego2022g`, `tego2022o`,
  cada uma com `nomeOficial`, que entra no crédito das imagens da banca).
  Área nova = uma linha aqui + dois tokens de cor (`--<id>`, `--<id>-bg`) em
  `app.css` e `caderno/caderno.css` (os cinco ids já têm os tokens).
- `cadernos/` — os documentos-fonte (PDF e texto), com `FONTES.md` dizendo de
  onde veio cada um; `<fonte>-areas.json` é o mapa de áreas escrito à mão.
  `baixar.js` rebaixa o que faltar.
- `extrai_tego.py` — lê a prova com PyMuPDF em dois leiautes (`caderno`, o
  oficial de 2022: "QUESTÃO" numa linha e o número embaixo, alternativas
  "A - …"; `guia`, o do Estratégia: "NN-" e "A)", páginas de uma ou duas
  colunas, imagem de fundo ignorada), trata os hifens de fim de linha com as
  regras de `extrai_questoes.py` (relatório em `<fonte>-hifens.txt`), separa as
  questões, copia a área do mapa e grava as imagens da banca. Saída:
  `<fonte>.txt` (só o texto, referência de fidelidade) e
  `<fonte>-questoes.json` (com `imagem`, `imagens`, `area`, `erro`). A
  Obstetrícia de 2025 vem numerada 61–120 no guia: `--faixa 61-120 --desloca 60`.
- `gabarito_tego.py` — o gabarito em linhas `NN X`, lido do quadro do caderno
  ("Gabarito da prova") ou do guia ("Questões / Respostas"), conferido com um
  segundo PDF quando há (`--confere`), e `<fonte>-recursos.json` vazio.
- `extrai_fundatec.py`, `parse_fundatec.py`, `extrai_questoes.py`,
  `parse_gabarito.py` — as ferramentas dos bancos irmãos, mantidas pelas
  funções que `extrai_tego.py` importa (`separar_fundatec`, `eh_rotulo`,
  `juntar_hifens`) e pelos testes.
- `entrada/<area>.js` — **o que é escrito à mão**: para cada questão,
  `{ fonte, numero, tema, referencias, comentario, simples }`.
- `legendas.js` — **também à mão**: a legenda da figura de cada questão, pelo
  id (`obst01: "…"`). Toda questão tem figura e toda figura tem legenda;
  `montar.js` aborta se faltar um lado.
- `materia/<area>.js` — **também à mão**: a página de livro-texto de cada
  questão ("Sobre a matéria"), pela chave `"fonte#numero"` da entrada, em
  HTML escrito em linhas (uma tag de bloco por linha; `montar.js` tira as
  quebras). Seis partes, nesta ordem, cada uma aberta por `<h4>`: Objetivos
  de aprendizagem (ul, 3–4), Termos-chave (dl, 3–6), O essencial (3–5 p),
  Ponto clínico (`div.ponto` com h4 e 1–2 p), Resumo (ul, 3–6), Verifique o
  que aprendeu (ol, 2–3 li com `<details><summary>Resposta</summary>…`).
- `figuras.py` + `commons.py` — a busca e o download das figuras no Wikimedia
  Commons (só CC0, domínio público, CC BY e CC BY-SA), as folhas de contato
  para revisão visual e o `gerar`, que escreve `figuras/figuras.json` e
  `figuras/FONTES.md`.
- `montar.js` — junta texto da banca + gabarito + entrada + matéria + figura
  (figuras.json + legendas.js) + imagem da banca e reescreve `banco.js`.
  Aborta em qualquer inconsistência (número inexistente, área errada,
  alternativas em imagem, campo faltando, figura sem legenda ou legenda sem
  figura, imagem da banca sem arquivo).
- `serializar.js` — a escrita de `banco.js` (chaves sem aspas, ordem fixa).
- `normalizar.js` / `normalizar.py` — a mesma normalização de texto nas duas
  linguagens (`testes.py` confere a paridade).
- `testes.py` — os testes das ferramentas: `python ferramentas/testes.py`.
- `conferir_readme.js` — a tabela acima contra `banco.js`.
- `pdf.py` — os PDFs do caderno pelo Chrome sem janela, um por área.
- `videos.py` + `questoes_json.js` + `videos/` — a escolha dos vídeos do
  YouTube (lista branca `canais.json`, `candidatos.json`, `escolhas.json`,
  `amostra-busca.json` para os testes) e o `gerar`, que escreve `videos.json`.
  Igual ao AMRIGS (verbos `canais`, `buscar`, `escolher`, `buscar-extra`,
  `trocar`, `comentadas`, `conferir`, `gerar`); a camada ainda não foi
  preenchida para o TEGO.
- `selecao.md` — as escolhas e o motivo de cada uma.

## O modelo de uma questão, a página, o caderno e o PDF

Iguais ao banco AMRIGS (`med/amrigs/README.md`: "O modelo de uma questão",
"Figuras", "Vídeos (QR codes)", "A página na tela", "Caderno", "PDF",
"Verificação" e "Como mexer sem quebrar" valem aqui palavra por palavra), com
estas diferenças: o `meta` (banca FEBRASGO, cinco áreas novas, quatro fontes,
`numeros.porArea` = por prova, `corte` = 60% em cada prova para a 2ª fase); a
abertura do comentário "Questão N (TEGO Ginecologia 2025)"; o crédito da
imagem da banca com FEBRASGO; a projeção da página e do caderno, que fala dos
60% em cada prova (não há Certificado de Bom Desempenho); as chaves do
localStorage `tego:*`; e o cabeçalho corrido "Caderno TEGO · FEBRASGO".

## Verificação

`node verificar.js` (o harness: forma do banco, fidelidade ao texto da prova,
gabarito oficial, comentário, Simplificando, matéria, figuras, imagens da
banca, página e caderno num DOM falso), `node controles.js` (os controles
negativos: cada um planta um defeito e exige que o harness o pegue), `python
ferramentas/testes.py` (as ferramentas: extração dos dois leiautes, gabaritos,
imagens, montagem, vídeos) e `node ferramentas/conferir_readme.js` (a tabela
de números e a frase dos vídeos deste arquivo contra o banco). Tudo verde
antes de cada deploy.
