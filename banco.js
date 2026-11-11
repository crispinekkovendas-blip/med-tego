/* ============================================================================
   BANCO DE QUESTÕES COMENTADAS — TEGO · FEBRASGO · título de especialista em GO

   GERADO por ferramentas/montar.js a partir de:
     · ferramentas/cadernos/<fonte>-questoes.json — enunciado e alternativas
       extraídos do caderno oficial (texto da banca, sem retoque) por
       ferramentas/extrai_tego.py;
     · figuras/banca/ — a imagem da própria prova, quando a questão depende
       dela (extraída do caderno por extrai_fundatec.py; campo imagemBanca,
       crédito ao caderno);
     · ferramentas/cadernos/<fonte>-gabarito.txt — o gabarito oficial;
     · ferramentas/entrada/<area>.js — tema, referências, comentário e
       Simplificando, escritos à mão;
     · ferramentas/materia/<area>.js — "Sobre a matéria", a mini-aula de
       livro-texto de cada questão, escrita à mão (campo materia);
     · figuras/figuras.json — arquivo, tamanho, autor e licença da figura
       (Wikimedia Commons, gerado por ferramentas/figuras.py) — e
       ferramentas/legendas.js, a legenda escrita à mão.
   Não edite este arquivo: mude a entrada e rode `node ferramentas/montar.js`.
   ========================================================================== */
window.BANCO = {
  meta: {
    "banca": "FEBRASGO",
    "orgao": "FEBRASGO — Federação Brasileira das Associações de Ginecologia e Obstetrícia, pela AMB",
    "concurso": "TEGO — Exame de Suficiência para obtenção do Título de Especialista em Ginecologia e Obstetrícia",
    "prova": "TEGO 2027: edital previsto para março de 2027 (em 2026: inscrições de 26/03 a 29/04, prova teórica on-line em 26/07)",
    "cronograma": "TEGO 2026 (edital nº 995): inscrições de 26/03 a 29/04/2026 · prova teórica on-line (eduCAT) 26/07/2026, 8h, Ginecologia e depois Obstetrícia · gabarito preliminar no mesmo dia · recursos até 28/07 · gabarito definitivo e convocação 28/08 · 2ª fase (teórico-prática, presencial) 18/10 · resultado final 08/12/2026",
    "estrutura": "2 provas × 60 questões (Ginecologia e Obstetrícia) · 4 alternativas · 4h30 · on-line",
    "numeros": {
      "questoes": 120,
      "porArea": 60,
      "alternativas": 4,
      "horas": 4.5,
      "corte": 60
    },
    "site": "tego-febrasgo.vercel.app",
    "areas": [
      {
        "id": "obst",
        "nome": "Obstetrícia",
        "curto": "Obst"
      }
    ],
    "fontes": [
      {
        "id": "tego2025g",
        "edicao": 2025,
        "rotulo": "TEGO Ginecologia 2025",
        "nomeOficial": "Exame de Suficiência para obtenção do Título de Especialista em Ginecologia e Obstetrícia — Prova de Ginecologia, TEGO 2025",
        "txt": "TEGO 2025, prova teórica de Ginecologia (FEBRASGO/AMB, on-line, 27/07/2025), 60 questões de quatro alternativas; texto e gabarito oficial reproduzidos no Guia da Aprovação TEGO 2026 do Estratégia MED (pp. 5–45 e 46); nenhuma anulada",
        "caderno": "ferramentas/cadernos/tego2025g.txt",
        "gabarito": "ferramentas/cadernos/tego2025g-gabarito.txt"
      },
      {
        "id": "tego2025o",
        "edicao": 2025,
        "rotulo": "TEGO Obstetrícia 2025",
        "nomeOficial": "Exame de Suficiência para obtenção do Título de Especialista em Ginecologia e Obstetrícia — Prova de Obstetrícia, TEGO 2025",
        "txt": "TEGO 2025, prova teórica de Obstetrícia (FEBRASGO/AMB, on-line, 27/07/2025), 60 questões de quatro alternativas; texto e gabarito oficial reproduzidos no Guia da Aprovação TEGO 2026 do Estratégia MED (numeradas 61–120 lá; aqui 1–60, como na prova); nenhuma anulada",
        "caderno": "ferramentas/cadernos/tego2025o.txt",
        "gabarito": "ferramentas/cadernos/tego2025o-gabarito.txt"
      },
      {
        "id": "tego2022g",
        "edicao": 2022,
        "rotulo": "TEGO Ginecologia 2022",
        "nomeOficial": "Exame de Suficiência para obtenção do Título de Especialista em Ginecologia e Obstetrícia — Prova de Ginecologia, TEGO 2022",
        "txt": "TEGO 2022, prova teórica de Ginecologia (FEBRASGO/AMB), 60 questões de quatro alternativas; caderno oficial com o gabarito da prova, cópia hospedada pelo Estratégia MED e conferida com a do Medgrupo; nenhuma anulada; as questões 54 e 55 (alternativas em imagem) ficam de fora",
        "caderno": "ferramentas/cadernos/tego2022g.txt",
        "gabarito": "ferramentas/cadernos/tego2022g-gabarito.txt"
      },
      {
        "id": "tego2022o",
        "edicao": 2022,
        "rotulo": "TEGO Obstetrícia 2022",
        "nomeOficial": "Exame de Suficiência para obtenção do Título de Especialista em Ginecologia e Obstetrícia — Prova de Obstetrícia, TEGO 2022",
        "txt": "TEGO 2022, prova teórica de Obstetrícia (FEBRASGO/AMB), 60 questões de quatro alternativas; caderno oficial com o gabarito da prova, cópia hospedada pelo Estratégia MED e conferida com a do Medgrupo; nenhuma anulada",
        "caderno": "ferramentas/cadernos/tego2022o.txt",
        "gabarito": "ferramentas/cadernos/tego2022o-gabarito.txt"
      }
    ]
  },
  questoes: [

/* ==========================================================================
   OBSTETRÍCIA
   ========================================================================== */

{ id: "obst01",
  area: "obst",
  tema: "Gemelar monocoriônica diamniótica a termo — parto com 37 semanas",
  fonte: "tego2025o",
  edicao: 2025,
  numero: 1,
  enunciado: "Secundigesta, 37 semanas, com parto vaginal há quatro anos, comparece à maternidade para avaliação. A gestação atual é gemelar, monocoriônica e diamniótica. Atividade uterina ausente, colo uterino centralizado, grosso, com 2 cm de dilatação. Exame ultrassonográfico recente demonstra primeiro feto cefálico e com dorso à esquerda, peso estimado de 2.820 g. Segundo feto com situação transversa e peso estimado em 2.790 g. Líquido amniótico normal no âmnio e placenta com implantação anterior e fúndica. Exame de Doppler normal em ambos os fetos. Considerando os protocolos assistenciais oficiais, assinale a alternativa correta.",
  alternativas: [
    "Orientar retorno com 38 semanas.",
    "Orientar retorno com 39 semanas.",
    "Internar e iniciar indução de parto.",
    "Internar e indicar interrupção por cesariana.",
  ],
  correta: 2,
  referencias: [
    "Ministério da Saúde — Gestação de alto risco: manual técnico, 2022 (Gestação múltipla)",
    "FEBRASGO — Tratado de Obstetrícia, 2ª ed. (Gemelidade)",
  ],
  comentario: "<p>Questão 1 (TEGO Obstetrícia 2025). Gabarito <strong>C</strong>. Gestação gemelar <strong>monocoriônica e diamniótica</strong> que chegou às <strong>37 semanas</strong> sem intercorrência: líquido normal nas duas bolsas, pesos concordantes (2.820 g e 2.790 g), Doppler normal, placenta anterior e fúndica. Os protocolos oficiais (Ministério da Saúde e FEBRASGO) marcam o parto da monocoriônica diamniótica não complicada entre <strong>36 e 37 semanas</strong>, porque a placenta compartilhada eleva o risco de óbito fetal súbito a partir daí. Com 37 semanas completas, a conduta é <strong>internar e induzir</strong>: o primeiro feto é cefálico, o que permite a via vaginal mesmo com o segundo em situação transversa, desde que a equipe saiba fazer a versão interna e a extração podálica do segundo gemelar. O colo com 2 cm de dilatação, centralizado, favorece a indução.</p><p>As opções <strong>A</strong> e <strong>B</strong> adiam o parto para 38 ou 39 semanas, prazo aceito só para a gestação <strong>dicoriônica</strong> (38 semanas); na monocoriônica, esperar além de 37 semanas aumenta a mortalidade perinatal sem ganho de maturidade. A opção <strong>D</strong> indica cesariana por causa da situação transversa do segundo feto, mas a via de parto da gemelar é definida pela apresentação do <strong>primeiro</strong>: cefálico, parto vaginal; a cesariana fica para o primeiro não cefálico, para a monoamniótica, para pesos muito discordantes ou para quem não domina as manobras do segundo gemelar.</p><p><strong>O que a banca testa:</strong> a idade gestacional de resolução por corionicidade (monocoriônica diamniótica 36–37 semanas, dicoriônica 38) e o princípio de que a apresentação do primeiro gemelar decide a via de parto.</p>",
  simples: "<p>A resposta é a letra <strong>C</strong>. São gêmeos que dividem a mesma placenta, cada um na sua bolsa. Esse tipo de gestação deve terminar entre 36 e 37 semanas. A moça já está com 37. Então é hora de internar e começar o parto. O primeiro bebê está de cabeça para baixo. Por isso o parto pode ser normal. O segundo bebê atravessado não obriga a cesariana. O médico vira o segundo bebê depois que o primeiro nasce. Esperar mais semanas aumenta o risco de o bebê morrer dentro do útero.</p>",
  materia: "<h4>Objetivos de aprendizagem</h4><ul><li>Classificar a gestação gemelar pela corionicidade e pela amnionicidade e dizer por que isso muda o risco.</li><li>Saber a idade gestacional de resolução de cada tipo de gemelar não complicada.</li><li>Decidir a via de parto a partir da apresentação do primeiro gemelar.</li></ul><h4>Termos-chave</h4><dl><dt>Monocoriônica diamniótica</dt><dd>Gêmeos com uma placenta e duas bolsas; anastomoses placentárias explicam a transfusão feto-fetal e o óbito súbito tardio.</dd><dt>Dicoriônica</dt><dd>Duas placentas e duas bolsas; o tipo de menor risco, resolvido com 38 semanas quando tudo vai bem.</dd><dt>Sinal do lambda e sinal do T</dt><dd>Na ultrassonografia do primeiro trimestre, a inserção espessa (lambda) marca dicoriônica; a fina (T), monocoriônica.</dd><dt>Versão interna com extração podálica</dt><dd>Manobra que vira o segundo gemelar não cefálico e o extrai pelos pés após o nascimento do primeiro.</dd></dl><h4>O essencial</h4><p>A corionicidade é definida na ultrassonografia de 11 a 14 semanas e dita todo o seguimento. A <strong>dicoriônica</strong> faz ultrassonografia a cada quatro semanas e, sem complicação, tem o parto programado com 38 semanas. A <strong>monocoriônica diamniótica</strong> precisa de controle a cada duas semanas a partir de 16 semanas, para flagrar a síndrome de transfusão feto-fetal e a restrição seletiva, e tem o parto marcado entre <strong>36 e 37 semanas</strong>, porque o risco de morte fetal inexplicada sobe depois disso. A monoamniótica, com cordões entrelaçados, é resolvida por cesariana entre 32 e 34 semanas.</p><p>A via de parto segue a apresentação do <strong>primeiro feto</strong>. Primeiro cefálico, qualquer que seja a posição do segundo, permite o parto vaginal em serviço com equipe treinada, com ultrassonografia na sala para guiar o segundo nascimento; o segundo gemelar pode ser conduzido por versão externa, versão interna com extração podálica ou, se houver sofrimento, cesariana. Primeiro não cefálico, monoamniótica, discordância grande de peso ou restrição grave indicam cesariana.</p><p>O intervalo entre os nascimentos deve ser curto, com ocitocina mantida e monitorização contínua do segundo feto, que corre risco de descolamento e prolapso de cordão após o esvaziamento parcial do útero. O terceiro período exige atenção redobrada à atonia, mais frequente pelo útero sobredistendido.</p><div class=\"ponto\"><h4>Ponto clínico</h4><p>Gemelar monocoriônica diamniótica sem complicação que chega às 37 semanas sem trabalho de parto não espera mais: interna-se e induz-se, se o primeiro feto é cefálico. Deixar para 38 ou 39 semanas, como na dicoriônica, troca um ganho inexistente de maturidade por risco real de óbito fetal.</p></div><h4>Resumo</h4><ul><li>Corionicidade definida de 11 a 14 semanas (lambda = dicoriônica, T = monocoriônica).</li><li>Resolução: dicoriônica 38 semanas; monocoriônica diamniótica 36–37; monoamniótica 32–34 por cesariana.</li><li>Primeiro feto cefálico permite parto vaginal; a posição do segundo não decide a via.</li><li>Segundo gemelar: versão interna e extração podálica quando não cefálico, com ocitocina e monitorização.</li><li>Útero sobredistendido: vigiar atonia e hemorragia no pós-parto.</li></ul><h4>Verifique o que aprendeu</h4><ol><li>Por que a monocoriônica é resolvida antes da dicoriônica?<details><summary>Resposta</summary>Porque a placenta única, com anastomoses, aumenta o risco de óbito fetal súbito depois de 37 semanas.</details></li><li>Primeiro feto cefálico e segundo transverso com 37 semanas: qual a via?<details><summary>Resposta</summary>Parto vaginal com indução, em serviço preparado para a versão interna do segundo gemelar.</details></li></ol>",
  figura: {"src":"figuras/obst01.jpg","w":650,"h":560,"legenda":"Ultrassonografia de gestação gemelar: dois fetos no mesmo útero. É a corionicidade, vista no primeiro trimestre, que define com quantas semanas o parto é marcado.","fonte":"Nevit Dilmen · CC BY-SA 3.0 · Wikimedia Commons","pagina":"https://commons.wikimedia.org/wiki/File:Pregnancy_ultrasound_110324114136_1201400.jpg"} },

{ id: "obst02",
  area: "obst",
  tema: "Toxoplasmose na gestação com acometimento fetal — tratamento tríplice",
  fonte: "tego2025o",
  edicao: 2025,
  numero: 2,
  imagemBanca: [{"src":"figuras/banca/tego2025o-02.jpg","w":584,"h":230,"onde":"enunciado","credito":"Imagem da prova · caderno da Exame de Suficiência para obtenção do Título de Especialista em Ginecologia e Obstetrícia — Prova de Obstetrícia, TEGO 2025 (FEBRASGO)"}],
  enunciado: "Gestante de 26 anos de idade, G1P0, 28 semanas, sem comorbidades, comparece à consulta de pré-natal com resultado de sorologia para toxoplasmose com IgG e IgM positivos. A ultrassonografia obstétrica evidenciou, além de hepatoesplenomegalia, os achados demonstrados na imagem a seguir. Qual é a conduta mais adequada nesse caso?",
  alternativas: [
    "Iniciar tratamento com pirimetamina, sulfadiazina e ácido folínico imediatamente.",
    "Solicitar teste de avidez e, se a avidez for baixa, iniciar pirimetamina, sulfadiazina e ácido folínico.",
    "Iniciar espiramicina, solicitar teste de avidez e, se a avidez for baixa, iniciar pirimetamina, sulfadiazina e ácido folínico.",
    "Solicitar amniocentese para realização de PCR e, se o resultado for positivo, iniciar tratamento com pirimetamina,",
  ],
  correta: 0,
  referencias: [
    "Ministério da Saúde — Protocolo de notificação e investigação: toxoplasmose gestacional e congênita, 2018",
    "FEBRASGO — Tratado de Obstetrícia, 2ª ed. (Infecções congênitas)",
  ],
  comentario: "<p>Questão 2 (TEGO Obstetrícia 2025). Gabarito <strong>A</strong>. Gestante de 28 semanas com <strong>IgG e IgM positivos</strong> para toxoplasmose e, na ultrassonografia, <strong>hepatoesplenomegalia</strong> mais os achados da imagem — sinais de <strong>infecção fetal já estabelecida</strong>. Quando o feto mostra comprometimento, não há mais o que investigar antes de tratar: começa-se de imediato o esquema tríplice, <strong>pirimetamina + sulfadiazina + ácido folínico</strong>, que atravessa a placenta e reduz as sequelas da toxoplasmose congênita; a partir do segundo trimestre ele é seguro (a pirimetamina é evitada só no primeiro).</p><p>A opção <strong>B</strong> condiciona o tratamento ao teste de avidez, mas a avidez só tem valor nas primeiras <strong>16 semanas</strong>: uma avidez alta aí afasta infecção recente; com 28 semanas ela não informa nada e, diante de feto doente, atrasaria o tratamento. A opção <strong>C</strong> prescreve espiramicina, o fármaco da <strong>profilaxia</strong> da transmissão enquanto o feto ainda não está infectado — ela não atravessa bem a placenta e não trata o feto acometido. A opção <strong>D</strong> faz depender da amniocentese com PCR, exame indicado para <strong>confirmar</strong> a infecção fetal quando a ultrassonografia é normal; com hepatoesplenomegalia e os achados da imagem, o diagnóstico fetal já está feito e o resultado não mudaria a conduta.</p><p><strong>O que a banca testa:</strong> o lugar de cada ferramenta na toxoplasmose gestacional — avidez até 16 semanas, espiramicina para profilaxia, PCR do líquido amniótico para confirmar, esquema tríplice imediato quando o feto já está doente.</p>",
  simples: "<p>A resposta é a letra <strong>A</strong>. O exame de sangue da mãe mostra toxoplasmose recente. O ultrassom mostra o bebê doente, com fígado e baço grandes. Então a infecção já passou para o bebê. Não adianta pedir mais exames. O tratamento tem de começar agora. São três remédios juntos: pirimetamina, sulfadiazina e ácido folínico. Eles chegam até o bebê pela placenta. A espiramicina só serve para proteger um bebê que ainda não pegou a doença. O teste de avidez só ajuda no começo da gravidez.</p>",
  materia: "<h4>Objetivos de aprendizagem</h4><ul><li>Interpretar IgG, IgM e avidez para toxoplasmose conforme a idade gestacional.</li><li>Distinguir profilaxia da transmissão de tratamento da infecção fetal.</li><li>Reconhecer na ultrassonografia os sinais de toxoplasmose congênita.</li></ul><h4>Termos-chave</h4><dl><dt>Teste de avidez de IgG</dt><dd>Avidez alta antes de 16 semanas afasta infecção nos últimos 3 a 4 meses; depois disso não ajuda a datar.</dd><dt>Espiramicina</dt><dd>Macrolídeo que se concentra na placenta e reduz a passagem do parasita ao feto; não trata o feto já infectado.</dd><dt>Esquema tríplice</dt><dd>Pirimetamina, sulfadiazina e ácido folínico, do segundo trimestre em diante, para a infecção fetal confirmada ou provável.</dd><dt>PCR no líquido amniótico</dt><dd>Amniocentese a partir de 18 semanas e 4 semanas após a infecção materna, para confirmar a infecção fetal quando o feto parece normal.</dd></dl><h4>O essencial</h4><p>O rastreamento começa no primeiro trimestre. IgG e IgM negativas marcam a gestante suscetível, que repete a sorologia a cada trimestre e recebe orientação sobre carne crua, verduras e gatos. IgG positiva com IgM negativa é imunidade antiga. IgM positiva exige datar a infecção: antes de 16 semanas, a <strong>avidez alta</strong> da IgG afasta infecção recente; depois disso a avidez perde o valor, e a infecção é tratada como possível na gravidez.</p><p>Confirmada ou provável a infecção materna, entra a <strong>espiramicina</strong> para diminuir a transmissão enquanto o feto não está comprometido. A infecção fetal é investigada por amniocentese com PCR, a partir de 18 semanas, e por ultrassonografia seriada. Sinais fetais de toxoplasmose: ventriculomegalia, calcificações intracranianas e hepáticas, hepatoesplenomegalia, ascite, placentomegalia e restrição de crescimento.</p><p>PCR positiva ou ultrassonografia alterada mudam o tratamento para o <strong>esquema tríplice</strong> (pirimetamina, sulfadiazina e ácido folínico), com hemograma periódico pela toxicidade medular. A transmissão é mais frequente no terceiro trimestre, mas a doença fetal é mais grave quando a infecção ocorre no primeiro. O recém-nascido é investigado e tratado por um ano, mesmo assintomático.</p><div class=\"ponto\"><h4>Ponto clínico</h4><p>Com 28 semanas, IgG e IgM positivas e feto com hepatoesplenomegalia e outros sinais à ultrassonografia, o diagnóstico de infecção fetal está feito: começa-se o esquema tríplice no mesmo dia. Avidez e amniocentese não acrescentam nada nessa altura e só atrasariam o remédio que chega ao feto.</p></div><h4>Resumo</h4><ul><li>Avidez de IgG só data a infecção até 16 semanas.</li><li>Espiramicina = profilaxia da transmissão; tríplice = tratamento do feto infectado.</li><li>Amniocentese com PCR a partir de 18 semanas, quando o feto parece normal.</li><li>Feto com sinais na ultrassonografia: tríplice imediato, sem esperar exames.</li><li>Transmissão cresce com a idade gestacional; gravidade é maior no início.</li></ul><h4>Verifique o que aprendeu</h4><ol><li>Gestante de 10 semanas com IgM positiva e avidez alta: o que significa?<details><summary>Resposta</summary>Infecção antiga, anterior à gestação; não há risco fetal e não se trata.</details></li><li>Quando trocar espiramicina pelo esquema tríplice?<details><summary>Resposta</summary>Quando a infecção fetal é confirmada por PCR no líquido amniótico ou sugerida pela ultrassonografia.</details></li></ol>",
  figura: {"src":"figuras/obst02.jpg","w":1325,"h":1321,"legenda":"Taquizoítos de Toxoplasma gondii, a forma do parasita que atravessa a placenta na infecção aguda materna e infecta o feto.","fonte":"NIH NIAID Ryan Kissinger · Public domain · Wikimedia Commons","pagina":"https://commons.wikimedia.org/wiki/File:Toxoplasma_gondii_Tachyzoite_(NIH_BioArt_683).png"} },

  ],
};
