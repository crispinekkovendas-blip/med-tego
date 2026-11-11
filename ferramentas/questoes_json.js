/* Lista as questões de banco.js para as ferramentas em Python (videos.py):
   id, área, fonte, número, tema e o primeiro termo-chave da mini-aula
   ("termo", sem tags; null se a questão ainda não tem Sobre a matéria).
   Roda: `node ferramentas/questoes_json.js` — imprime JSON. */
const fs = require("fs"), path = require("path"), vm = require("vm");
const ctx = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "banco.js"), "utf8"), ctx);
const termo = m => { const x = /<dt>([\s\S]*?)<\/dt>/.exec(m || ""); return x ? x[1].replace(/<[^>]+>/g, "").trim() : null; };
process.stdout.write(JSON.stringify(ctx.window.BANCO.questoes.map(q => ({ id: q.id, area: q.area, fonte: q.fonte, numero: q.numero, tema: q.tema, termo: termo(q.materia) }))));
