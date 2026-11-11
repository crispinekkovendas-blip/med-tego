"""A mesma normalização de normalizar.js — ver o comentário de lá."""
import re, unicodedata

def normalizar(s):
    s = re.sub(r"</?[a-zA-Z][^<>]*>", " ", str(s))
    s = s.replace("\u00ad", "")
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not ("\u0300" <= c <= "\u036f"))
    s = re.sub(r"[\u2018\u2019\u201a\u2032]", "'", s)
    s = re.sub(r"[\u201c\u201d\u201e\u2033]", '"', s)
    s = re.sub(r"[\u2013\u2014\u2212]", "-", s)
    s = s.replace("\u00a0", " ")
    return re.sub(r"\s+", " ", s.lower()).strip()
