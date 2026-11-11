/* Normaliza texto para comparar o banco com o caderno: tags viram espaço,
   hífen suave some, acentos saem (NFD sem marcas), aspas e traços ficam
   uniformes, NBSP vira espaço, tudo minúsculo, espaços colapsados. NÃO
   junta hífens de fim de linha — o extrator já fez isso dos dois lados.
   A mesma regra vive em normalizar.py; testes.py confere que batem. */
function normalizar(s) {
  return String(s)
    .replace(/<\/?[a-zA-Z][^<>]*>/g, " ")
    .replace(/\u00ad/g, "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019\u201a\u2032]/g, "'")
    .replace(/[\u201c\u201d\u201e\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u00a0/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ").trim();
}
module.exports = { normalizar };
