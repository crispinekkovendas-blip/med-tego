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

## Obstetrícia (sessão 0: banco de fumaça — 2 questões)

- `obst01` = Obstetrícia 2025 nº 1 — gemelar monocoriônica diamniótica a termo: parto com 37 semanas.
- `obst02` = Obstetrícia 2025 nº 2 — toxoplasmose com acometimento fetal: esquema tríplice imediato.

A escolha das 50 (todas as obstétricas de 2025 que couberem, depois 2022 por
tema) é a sessão 1.
