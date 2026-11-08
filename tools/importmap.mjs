// Cache de GitHub Pages : chaque module JS reçoit ?v=<empreinte de son contenu> par une carte d’import dans index.html.
// Un ?v= sur main.js seul n’invaliderait pas ses dépendances ; la carte d’import remappe chaque URL de module.
// node tools/importmap.mjs        → réécrit index.html
// node tools/importmap.mjs --check → échoue si index.html n’est pas à jour
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const A = '<!-- importmap:debut -->', B = '<!-- importmap:fin -->';
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
export const hash = buf => createHash('sha256').update(buf).digest('hex').slice(0, 10);
export function modules(root = ROOT) {
  return [...walk(join(root, 'js')), join(root, 'vendor', 'three.module.min.js')].filter(p => p.endsWith('.js')).map(p => relative(root, p).split('\\').join('/')).sort();
}
export function render(root = ROOT) {
  const imports = {}; for (const m of modules(root)) imports[`./${m}`] = `./${m}?v=${hash(readFileSync(join(root, m)))}`;
  const css = hash(readFileSync(join(root, 'style.css')));
  return `${A}\n<script type="importmap">\n${JSON.stringify({ imports }, null, 1)}\n</script>\n<link rel="stylesheet" href="style.css?v=${css}">\n${B}`;
}
export function apply(html, root = ROOT) {
  const block = render(root);
  const entry = html.replace('<script type="module" src="js/main.js"></script>', '<script type="module">import \'./js/main.js\';</script>'); // une balise src ne passe pas par la carte d’import
  if (entry.includes(A)) return entry.replace(new RegExp(`${A}[\\s\\S]*?${B}`), () => block);
  return entry.replace('<link rel="stylesheet" href="style.css">', () => block);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const f = join(ROOT, 'index.html'), html = readFileSync(f, 'utf8'), out = apply(html);
  if (process.argv.includes('--check')) { if (out !== html) { console.log('index.html : carte d’import pas à jour (node tools/importmap.mjs)'); process.exit(1); } console.log('carte d’import à jour'); }
  else { writeFileSync(f, out); console.log('index.html mis à jour'); }
}
