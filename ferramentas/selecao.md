# Seleção das questões — banco TEGO

Regra geral (spec de 2026-11-11, `docs/superpowers/specs/`): cinco apostilas de
50 questões — Obstetrícia, Ginecologia, Oncologia, Reprodução, Mastologia —,
só questões reais do TEGO, das edições públicas (2022: caderno oficial; 2025:
a prova reproduzida no Guia da Aprovação TEGO 2026 do Estratégia MED).
Prioridade: tudo de 2025 que cabe na apostila, depois 2022 completa até 50 por
cobertura de tema. Ids `<area>NN` na ordem das fontes (`meta.fontes`:
Ginecologia 2025, Obstetrícia 2025, Ginecologia 2022, Obstetrícia 2022) e,
dentro da fonte, pelo número da questão.

## Fora do banco (alternativas em imagem)

- Ginecologia 2022 nº 54 (POP-Q em quadros) e nº 55 (desenhos de cirurgias).
- Ginecologia 2025 nº 45 (quatro ultrassonografias como alternativas).

## A área de cada questão (mapa em `cadernos/<fonte>-areas.json`)

Classificação à mão das 240 questões, pelos enunciados, em 2026-11-11.
Totais por área: Obstetrícia 115 · Ginecologia 54 · Reprodução 40 · Oncologia
15 · Mastologia 13 (= 237 + 3 fora).

| Fonte | Obstetrícia | Ginecologia | Oncologia | Reprodução | Mastologia |
|---|---|---|---|---|---|
| Ginecologia 2025 | — | 29 | 5 | 19 | 6 |
| Obstetrícia 2025 | 56 | — | 1 (nº 11, câncer de colo na gestação) | 1 (nº 41, DIU na cesárea) | 2 (nº 8, mastite puerperal; nº 21, nódulo na gestante) |
| Ginecologia 2022 | — | 25 | 9 | 19 | 5 |
| Obstetrícia 2022 | 59 | — | — | 1 (nº 58, laqueadura na cesárea) | — |

Só Obstetrícia chega a 50 com duas edições. As outras quatro apostilas saem
com o que há e crescem quando entrar a terceira fonte (decisão do usuário:
Guia 2024 do Estratégia, cadernos da área do candidato, ou outra).

## Obstetrícia (sessão 1, 2026-11-11 — 50 questões, todas do TEGO Obstetrícia 2025)

A prova de Obstetrícia de 2025 tem 56 questões obstétricas (as outras quatro
são de Mastologia — 8 e 21 —, Oncologia — 11 — e Reprodução — 41). Pela regra
"edição mais nova primeiro", as 50 vêm todas de 2025; ficaram de fora seis que
repetiam um tema já coberto por outra questão da mesma prova:

- 3 (fórceps de Simpson que falha — o parto instrumental está nas 9 e 55);
- 7 (perda ponderal fisiológica de 1 kg com 12 semanas);
- 14 (alterações metabólicas da hiperêmese — a conduta está na 13);
- 19 (gestante pós-bariátrica com dor epigástrica — a bariátrica está na 13);
- 29 (ascaridíase na gestação);
- 56 (eclâmpsia iminente no puerpério — o sulfato de magnésio está nas 43 e 59).

`obst01`–`obst50` = Obstetrícia 2025 nº 1, 2, 4, 5, 6, 9, 10, 12, 13, 15, 16, 17, 18, 20,
22, 23, 24, 25, 26, 27, 28, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 42, 43, 44,
45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 57, 58, 59, 60 (ordem do caderno).

As 59 questões obstétricas de **Obstetrícia 2022** ficam disponíveis para uma
segunda apostila de Obstetrícia ou para trocas que o cliente peça.

## Ginecologia (sessão 2, 2026-11-11 — 50 questões: 29 de 2025 e 21 de 2022)

Entram todas as 29 ginecológicas (mapa de áreas) da prova de Ginecologia de
2025 — nº 1, 2, 5, 7, 10, 11, 12, 13, 14, 19, 21, 22, 29, 31, 32, 33, 34, 37, 39,
42, 43, 44, 46, 48, 49, 54, 57, 58, 60 (`gine01`–`gine29`) — e 21 das 25 de 2022:
nº 2, 8, 14, 17, 19, 22, 23, 24, 25, 27, 28, 29, 30, 31, 44, 50, 51, 52, 53, 59, 60
(`gine30`–`gine50`). Ficaram de fora, de 2022, quatro cujo tema 2025 já cobre:

- 18 (SUA pela FIGO com imagem — a 43 e a 48 de 2025 fazem o mesmo);
- 21 (vaginose citolítica — a 46, a 54 e a 58 de 2025 cobrem as vulvovaginites);
- 56 (incontinência de esforço — a 5 de 2025 e a 29 de 2022 cobrem a uroginecologia);
- 58 (profilaxia pós-estupro — igual à 60 de 2025).

## Reprodução (sessão 3, 2026-11-11 — 40 questões: 19 + 19 + 1 + 1)

Entram todas as 40 questões que o mapa de áreas marca como Reprodução — a
área não chega a 50 com as duas edições, e a apostila sai com o que existe,
sem repetir tema. Da prova de Ginecologia de 2025, nº 3, 4, 15, 16, 17, 20, 25,
26, 27, 30, 35, 36, 38, 41, 50, 52, 53, 55, 56 (`repro01`–`repro19`); da de
Ginecologia de 2022, nº 1, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 20, 26, 32, 33, 34,
38, 39, 57 (`repro20`–`repro38`); da de Obstetrícia de 2025, nº 41, o DIU na
cesárea (`repro39`); da de Obstetrícia de 2022, nº 58, a laqueadura sem
consentimento (`repro40`). Três temas aparecem duas vezes e ficaram os dois,
porque a resposta muda com o caso: contracepção de emergência (2025 nº 38 e 2022
nº 1 e 12), hidrossalpinge (2022 nº 26 e 38) e SOP (2025 nº 16, 2022 nº 4, 7 e
20, cada uma com uma pergunta diferente — induzir, diabetes, pele, hirsutismo
refratário).
