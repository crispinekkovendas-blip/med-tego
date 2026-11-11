/* Metadados do banco: banca, prova, áreas e fontes. É daqui que montar.js
   escreve o `meta` de banco.js — e é de lá que app, caderno e harness leem
   a lista de áreas e de edições. Uma área nova = uma linha aqui + dois
   tokens de cor no CSS (--<id>, --<id>-bg) em app.css e caderno.css (os
   cinco ids deste banco já têm os tokens). `site` é o domínio de produção. */
module.exports = {
  banca: "FEBRASGO",
  orgao: "FEBRASGO — Federação Brasileira das Associações de Ginecologia e Obstetrícia, pela AMB",
  concurso: "TEGO — Exame de Suficiência para obtenção do Título de Especialista em Ginecologia e Obstetrícia",
  prova: "TEGO 2027: edital previsto para março de 2027 (em 2026: inscrições de 26/03 a 29/04, prova teórica on-line em 26/07)",
  /* o resto do cronograma fica aqui, fora da capa (que só cabe uma linha a mais); é o de 2026, edital nº 995 */
  cronograma: "TEGO 2026 (edital nº 995): inscrições de 26/03 a 29/04/2026 · prova teórica on-line (eduCAT) 26/07/2026, 8h, Ginecologia e depois Obstetrícia · gabarito preliminar no mesmo dia · recursos até 28/07 · gabarito definitivo e convocação 28/08 · 2ª fase (teórico-prática, presencial) 18/10 · resultado final 08/12/2026",
  estrutura: "2 provas × 60 questões (Ginecologia e Obstetrícia) · 4 alternativas · 4h30 · on-line",
  /* os mesmos números, estruturados: a página e o caderno leem daqui. porArea = por
     prova (a 1ª fase são duas provas de 60); corte = 60% em cada prova (nota 6,00) para
     ser chamado à 2ª fase */
  numeros: { questoes: 120, porArea: 60, alternativas: 4, horas: 4.5, corte: 60 },
  site: "tego-febrasgo.vercel.app",   /* tego.vercel.app já era de outra conta */
  /* as cinco apostilas, na ordem escolhida pelo usuário; a área de cada questão é dada à
     mão (cadernos/<fonte>-areas.json), porque as provas são só "Ginecologia" e "Obstetrícia".
     As áreas entram uma a uma, conforme são escritas (a linha sai do comentário e ESPERADO
     no harness ganha a contagem dela):
       { id: "onco",  nome: "Oncologia",   curto: "Onco"  },
       { id: "repro", nome: "Reprodução",  curto: "Repro" },
       { id: "masto", nome: "Mastologia",  curto: "Masto" }, */
  areas: [
    { id: "obst",  nome: "Obstetrícia", curto: "Obst"  },
    { id: "gine",  nome: "Ginecologia", curto: "Gine"  },
  ],
  /* uma fonte por prova (a FEBRASGO numera Ginecologia e Obstetrícia de 1 a 60, cada
     uma); os cadernos oficiais de 2023 a 2026 só existem na área do candidato (eduCAT),
     por isso as edições públicas: 2022 (caderno oficial, hospedado pelos cursinhos) e
     2025 (reproduzida, com o gabarito oficial, no Guia da Aprovação TEGO 2026 do
     Estratégia MED — o guia é de outubro de 2025 e a prova de 2026 não está nele) */
  fontes: [
    { id: "tego2025g", edicao: 2025, rotulo: "TEGO Ginecologia 2025", nomeOficial: "Exame de Suficiência para obtenção do Título de Especialista em Ginecologia e Obstetrícia — Prova de Ginecologia, TEGO 2025",
      txt: "TEGO 2025, prova teórica de Ginecologia (FEBRASGO/AMB, on-line, 27/07/2025), 60 questões de quatro alternativas; texto e gabarito oficial reproduzidos no Guia da Aprovação TEGO 2026 do Estratégia MED (pp. 5–45 e 46); nenhuma anulada",
      caderno: "ferramentas/cadernos/tego2025g.txt", gabarito: "ferramentas/cadernos/tego2025g-gabarito.txt" },
    { id: "tego2025o", edicao: 2025, rotulo: "TEGO Obstetrícia 2025", nomeOficial: "Exame de Suficiência para obtenção do Título de Especialista em Ginecologia e Obstetrícia — Prova de Obstetrícia, TEGO 2025",
      txt: "TEGO 2025, prova teórica de Obstetrícia (FEBRASGO/AMB, on-line, 27/07/2025), 60 questões de quatro alternativas; texto e gabarito oficial reproduzidos no Guia da Aprovação TEGO 2026 do Estratégia MED (numeradas 61–120 lá; aqui 1–60, como na prova); nenhuma anulada",
      caderno: "ferramentas/cadernos/tego2025o.txt", gabarito: "ferramentas/cadernos/tego2025o-gabarito.txt" },
    { id: "tego2022g", edicao: 2022, rotulo: "TEGO Ginecologia 2022", nomeOficial: "Exame de Suficiência para obtenção do Título de Especialista em Ginecologia e Obstetrícia — Prova de Ginecologia, TEGO 2022",
      txt: "TEGO 2022, prova teórica de Ginecologia (FEBRASGO/AMB), 60 questões de quatro alternativas; caderno oficial com o gabarito da prova, cópia hospedada pelo Estratégia MED e conferida com a do Medgrupo; nenhuma anulada; as questões 54 e 55 (alternativas em imagem) ficam de fora",
      caderno: "ferramentas/cadernos/tego2022g.txt", gabarito: "ferramentas/cadernos/tego2022g-gabarito.txt" },
    { id: "tego2022o", edicao: 2022, rotulo: "TEGO Obstetrícia 2022", nomeOficial: "Exame de Suficiência para obtenção do Título de Especialista em Ginecologia e Obstetrícia — Prova de Obstetrícia, TEGO 2022",
      txt: "TEGO 2022, prova teórica de Obstetrícia (FEBRASGO/AMB), 60 questões de quatro alternativas; caderno oficial com o gabarito da prova, cópia hospedada pelo Estratégia MED e conferida com a do Medgrupo; nenhuma anulada",
      caderno: "ferramentas/cadernos/tego2022o.txt", gabarito: "ferramentas/cadernos/tego2022o-gabarito.txt" },
  ],
};
