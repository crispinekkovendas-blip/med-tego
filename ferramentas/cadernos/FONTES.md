# Documentos-fonte do banco TEGO

Baixados em 2026-11-11. A FEBRASGO publica os cadernos e gabaritos do TEGO só na
área do candidato (plataforma eduCAT, com login) desde 2023; o que está em
público são as cópias hospedadas pelos cursinhos, listadas aqui. Nada foi
retocado: o texto das questões é o da banca, e os comentários do Guia do
Estratégia MED **não** são usados (só o texto da prova, as figuras e o gabarito).

**Os PDFs ficam fora do git** desde que o repositório é público (2026-11-12),
porque são documentos dos cursinhos e da FEBRASGO, não nossos: `.gitignore`
exclui `ferramentas/cadernos/*.pdf`. Para refazer a extração, baixe cada um da
URL da tabela para esta pasta; `testes.py` confere tamanho e md5 dos que estão
aqui e pula os ausentes. O texto extraído (`<fonte>.txt`, `-questoes.json`,
`-gabarito.txt`) e as imagens da banca continuam no git.

| Arquivo | O que é | De onde | Conferência |
|---|---|---|---|
| `tego2022g-caderno.pdf` | Caderno oficial, Prova de Ginecologia, TEGO 2022, com "Gabarito da prova" | https://med.estrategia.com/portal/wp-content/uploads/2022/07/ginecologia-tego-2022.pdf | 1 990 776 bytes; gabarito idêntico ao do Medgrupo |
| `tego2022o-caderno.pdf` | Caderno oficial, Prova de Obstetrícia, TEGO 2022, com "Gabarito da prova" | https://med.estrategia.com/portal/wp-content/uploads/2022/07/obstetricia-tego-2022.pdf | 1 460 186 bytes; gabarito idêntico ao do Medgrupo |
| `tego2022-gabarito-definitivo-medgrupo.pdf` | As duas provas de 2022 num só PDF, "gabarito definitivo" (nome do arquivo do Medgrupo) | https://static.medgrupo.com.br/static/concursos/editais/tego/2022/prova_gabarito_definitivo_tego_2023.pdf | 3 390 881 bytes; só para conferir os gabaritos |
| `tego2025-guia-estrategia.pdf` | Guia da Aprovação TEGO 2026 (Estratégia MED, PDF criado em 20/10/2025): a prova teórica do **TEGO 2025** inteira (pp. 5–45: Ginecologia 1–60, Obstetrícia 61–120), gabarito (pp. 46–47) e comentários do cursinho (pp. 48–227, não usados) | https://cdn.medblog.estrategiaeducacional.com.br/wp-content/uploads/2026/04/13-10_10_Guia_da_Aprovacao_TEGO_2026.pdf | 14 774 300 bytes; é a prova de 2025 porque o PDF é de outubro de 2025 e nenhuma questão citada nos recursos do TEGO 2026 (Medcof, Medway) está nele |
| `tego2026-edital.pdf` | Edital nº 995, TEGO 2026 (estrutura, cronograma, conteúdo programático, bibliografia) | https://cdn.medblog.estrategiaeducacional.com.br/wp-content/uploads/2026/03/TEGO-2026.pdf (cópia do Medcof: https://www.grupomedcof.com.br/blog/wp-content/uploads/2026/07/TEGO-2026-2-1.pdf) | 574 469 bytes |

Extração: `extrai_tego.py` (leiaute `caderno` para 2022, `guia` para 2025) e
`gabarito_tego.py`; as saídas (`<fonte>.txt`, `-questoes.json`, `-gabarito.txt`,
`-recursos.json` vazio, `-hifens.txt`, `-rotulos.txt`) ficam nesta pasta e as
imagens da banca em `figuras/banca/`. Fora do banco por terem alternativas em
imagem: Ginecologia 2022 nº 54 e 55, Ginecologia 2025 nº 45.

Página oficial: https://www.febrasgo.org.br/titulacoes-e-certificacao/ (links
para `exams-febrasgo-20XX.educat.net.br`, com login).
