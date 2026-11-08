# Fête de Camille (13 ans) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Décor de fête sur la place de l’île 1, 3 petits défis gratuits qui allument 13 bougies, souffle avec confettis bornés, message final et chapeau de Charlie, sans perte de sauvegarde.

**Architecture:** La logique pure va dans `js/fete.js` (activation, défis, normalisation), testée en Node. Le décor 3D et le chapeau vont dans `js/fete-scene.js`. On ajoute de petits branchements dans `save.js`, `main.js` et `flows.js`. Une carte d’import générée (`tools/importmap.mjs`) versionne chaque module pour GitHub Pages.

**Tech Stack:** JS modules ES, three.js (vendor), Node ≥ 18 pour les tests purs.

## Global Constraints
- Spec : `docs/superpowers/specs/2026-11-08-camille-fete13-design.md` (2a33fd4).
- Activation : `America/Toronto` le `2026-11-08`, ou `?fete=camille13` ; décidée au chargement seulement.
- Message exact : « Bonne fête Camille! 13 ans, 13 bougies : bravo! Charlie a un cadeau pour toi. »
- Sauvegarde : clé `vdm.save.v1`, `v: 5` inchangés ; champ `fete13` optionnel ; règles 1 à 4 de la spec.
- Aucune nouvelle vraie lumière, au plus 150 confettis, aucun si `prefers-reduced-motion`. Aucun son nouveau.
- Pas de Playwright, CDP ni injection JS : seuls les tests Node purs sont lancés ; les `.cjs` restent intacts et non exécutés.
- Branche `feat/fete-camille13` (worktree `wt-fete`) seulement ; pas de push, PR ni fusion.

---

### Task 1: Logique pure et sauvegarde

**Files:**
- Create: `js/fete.js`, `tools/test-fete.mjs`
- Modify: `js/save.js` (import, `newState`, fin de `normalize`)

**Interfaces:**
- Produces: `feteActive(date, search)`, `feteDefaut()`, `normFete(raw)`, `bougies(f)`, `pretASouffler(f)`, `defiDe(id)`, `verifier(id, saisie)`, `etapeErreur(n)`, `reussir(f,id)`, `souffler(f)`, `basculerChapeau(f)`, `nbConfettis(level, reduceMotion)`, constantes `DEFIS`, `DEFI_IDS`, `MESSAGE`, `BANNIERE`, `ENCOURAGE`, `FETE_PARAM`, `CONFETTI_MAX`, `TOTAL_BOUGIES`.

- [ ] **Step 1: Write the failing test** (`tools/test-fete.mjs`; le bloc « Cache Pages » est ajouté à la tâche 2)

```js
// Tests Node purs de la fête de Camille (aucun navigateur).
import * as F from '../js/fete.js';
import { newState, normalize } from '../js/save.js';
import { readFileSync } from 'node:fs';
import { apply, modules } from './importmap.mjs';
let pass = 0, fail = 0; const ok = (n, c, x = '') => { if (c) pass++; else { fail++; console.log('FAIL', n, x); } };
const D = s => new Date(s);
// Activation
ok('8 nov. midi Toronto', F.feteActive(D('2026-11-08T17:00:00Z')));
ok('8 nov. 00 h 01 Toronto', F.feteActive(D('2026-11-08T05:01:00Z')));
ok('8 nov. 23 h 59 Toronto = 9 nov. 04 h 59 UTC', F.feteActive(D('2026-11-09T04:59:00Z')));
ok('9 nov. 00 h 00 Toronto', !F.feteActive(D('2026-11-09T05:00:00Z')));
ok('7 nov. 23 h 59 Toronto', !F.feteActive(D('2026-11-08T04:59:00Z')));
ok('lien un autre jour', F.feteActive(D('2027-03-01T12:00:00Z'), '?fete=camille13'));
ok('autre valeur', !F.feteActive(D('2027-03-01T12:00:00Z'), '?fete=autre'));
ok('autres paramètres', F.feteActive(D('2027-03-01T12:00:00Z'), '?seed=3&fete=camille13&debug=1'));
// Défis
ok('13 bougies 5+4+4', F.TOTAL_BOUGIES === 13 && F.DEFIS.map(d => d.bougies).join() === '5,4,4');
ok('PNJ', F.DEFI_IDS.join() === 'gaston,therese,hortense');
for (const [id, good, bad] of [['gaston', ['5', ' 5 '], ['4', '', '13', '5/1']], ['therese', ['9/13', '9 / 13'], ['4/13', '18/26', '0,69', '9']], ['hortense', ['52'], ['51', '17', '52/1']]]) {
  for (const g of good) ok(`${id} bon ${g}`, F.verifier(id, g));
  for (const b of bad) ok(`${id} faux ${b}`, !F.verifier(id, b));
}
ok('id inconnu', !F.verifier('lise', '5'));
ok('échelle erreurs', [1, 2, 3, 7].map(F.etapeErreur).join() === 'encore,indice,reponse,reponse');
ok('message exact', F.MESSAGE === 'Bonne fête Camille! 13 ans, 13 bougies : bravo! Charlie a un cadeau pour toi.');
const textes = [F.MESSAGE, F.BANNIERE, ...F.DEFIS.flatMap(d => [d.q, d.indice, d.explication])].join(' ');
ok('pas d’année ni de nom de famille', !/\b(19|20)\d\d\b/.test(textes) && !/maman|papa|soeur|sœur|frère|grand/i.test(textes));
// Progression et sauvegarde
let f = F.feteDefaut();
ok('0 bougie', F.bougies(f) === 0 && !F.pretASouffler(f));
f = F.reussir(f, 'gaston'); ok('5 bougies', F.bougies(f) === 5);
ok('souffler trop tôt ne fait rien', !F.souffler(f).souffle);
f = F.reussir(F.reussir(f, 'hortense'), 'therese'); ok('13 bougies', F.bougies(f) === 13 && F.pretASouffler(f));
f = F.souffler(f); ok('soufflé → chapeau porté', f.souffle && f.chapeau && f.porte && !F.pretASouffler(f));
f = F.basculerChapeau(f); ok('enlever chapeau', f.chapeau && !f.porte);
ok('remettre chapeau', F.basculerChapeau(f).porte);
ok('basculer sans chapeau', !F.basculerChapeau(F.feteDefaut()).porte);
// normFete : règles 1 à 4
ok('absent → défaut', JSON.stringify(F.normFete(undefined)) === JSON.stringify(F.feteDefaut()));
ok('corrompu → défaut', JSON.stringify(F.normFete('x')) === JSON.stringify(F.feteDefaut()) && JSON.stringify(F.normFete([1])) === JSON.stringify(F.feteDefaut()));
ok('non booléens → false', F.normFete({ defis: { gaston: 1, therese: 'true' }, porte: 1 }).defis.gaston === false);
ok('règle 2', F.normFete({ defis: { gaston: true }, souffle: true }).souffle === false);
const r3 = F.normFete({ defis: { gaston: true, therese: true, hortense: true }, souffle: true });
ok('règle 3', r3.souffle && r3.chapeau && r3.porte === false);
ok('règle 4', F.normFete({ chapeau: false, porte: true }).porte === false);
ok('clés inconnues retirées', !('lise' in F.normFete({ defis: { lise: true } }).defis));
// Confettis
ok('confettis bornés', [-3, 0, 2, 5, 99].every(l => F.nbConfettis(l) <= 150) && F.nbConfettis(5) < F.nbConfettis(0));
ok('mouvement réduit', F.nbConfettis(2, true) === 0);
// Sauvegarde : invariants
ok('nouvelle partie', JSON.stringify(newState(4).fete13) === JSON.stringify(F.feteDefaut()));
const strip = s => { const c = { ...s }; delete c.fete13; return JSON.stringify(c); };
const v5 = normalize({ ...newState(7), money: 98765, bridges: { bleuets: true, erables: false }, rods: { petite: true, moyenne: true, grosse: false }, tools: { canne: 2, arrosoir: 1, filet: 0, pelle: 3, sac: 1 }, stats: { a: { n: 4, ok: 3, h: '1101' } }, island: 2, ferry: true }, 7);
const sans = { ...v5 }; delete sans.fete13;
ok('v5 : avec ≡ sans fete13 hors fete13', strip(normalize(v5, 7)) === strip(normalize(sans, 7)));
ok('v5 : fete13 corrompu ne touche rien d’autre', strip(normalize({ ...v5, fete13: 'zz' }, 7)) === strip(v5));
ok('v5 : fete13 corrompu → défaut', JSON.stringify(normalize({ ...v5, fete13: 'zz' }, 7).fete13) === JSON.stringify(F.feteDefaut()));
const avance = { defis: { gaston: true, therese: false, hortense: true }, souffle: false, chapeau: false, porte: false };
ok('reprise 2/3', JSON.stringify(normalize({ ...v5, fete13: avance }, 7).fete13) === JSON.stringify(avance));
ok('charger→sauver idempotent', JSON.stringify(normalize(JSON.parse(JSON.stringify(v5)), 7)) === JSON.stringify(v5));
ok('argent, ponts, cannes, outils, île', v5.money === 98765 && v5.bridges.bleuets && v5.rods.moyenne && v5.tools.pelle === 3 && v5.island === 2);
for (const v of [1, 2, 3, 4]) {
  const old = { v, seed: 11, money: 4321 + v, tools: { canne: 1 }, mastery: { qc_s1_ari_01: { ok: 3, tries: 4 } }, bridges: { erables: true } };
  const n = normalize(old, 11);
  ok(`v${v} → fete13 défaut, argent intact`, JSON.stringify(n.fete13) === JSON.stringify(F.feteDefaut()) && n.money === 4321 + v && n.bridges.erables && n.tools.canne === 1);
}
console.log(`${pass} PASS, ${fail} FAIL`);
if (fail) process.exit(1);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/test-fete.mjs`
Expected: erreur `Cannot find module .../js/fete.js`.

- [ ] **Step 3: Write minimal implementation** (`js/fete.js`)

```js
// Fête de Camille, 13 ans : logique pure (activation, défis, sauvegarde). Aucune dépendance au DOM ni à three.js.
export const FETE_PARAM = 'camille13';
export const FETE_DATE = '2026-11-08'; // date de l’événement, à l’heure de Toronto
export const FETE_TZ = 'America/Toronto';
export const MESSAGE = 'Bonne fête Camille! 13 ans, 13 bougies : bravo! Charlie a un cadeau pour toi.';
export const BANNIERE = 'Bonne fête Camille! — 13 ans';
export const DEFIS = [
  { id: 'gaston', bougies: 5, q: 'Camille a 13 ans aujourd’hui! J’ai 13 bougies et j’en plante déjà 8. Combien en manque-t-il?', rep: '5',
    indice: 'Pense à 13 − 8.', explication: '13 − 8 = 5 : il manque 5 bougies.' },
  { id: 'therese', bougies: 4, q: 'Je coupe le gâteau en 13 parts égales. On en mange 4. Quelle fraction du gâteau reste-t-il?', rep: '9/13',
    indice: '13 − 4 = 9 parts restent, sur 13 parts en tout.', explication: '13 − 4 = 9 parts restent sur 13 : il reste 9/13 du gâteau.' },
  { id: 'hortense', bougies: 4, q: '13 × 4 = ? Ce sont les fanions de la guirlande : 13 fanions sur chacun des 4 côtés de la place.', rep: '52',
    indice: '10 × 4 + 3 × 4.', explication: '10 × 4 = 40 et 3 × 4 = 12 ; 40 + 12 = 52 fanions.' },
];
export const DEFI_IDS = DEFIS.map(d => d.id);
export const TOTAL_BOUGIES = DEFIS.reduce((a, d) => a + d.bougies, 0);

// Date locale de Toronto au format AAAA-MM-JJ
export function torontoDate(date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: FETE_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
// Décidé une seule fois au chargement : le jour J à Toronto, ou avec ?fete=camille13
export function feteActive(date, search = '') {
  let q = null; try { q = new URLSearchParams(search).get('fete'); } catch { q = null; }
  if (q === FETE_PARAM) return true;
  try { return torontoDate(date) === FETE_DATE; } catch { return false; }
}

export function feteDefaut() { return { defis: { gaston: false, therese: false, hortense: false }, souffle: false, chapeau: false, porte: false }; }
// Règles de la spec, dans l’ordre : 1) défauts/booléens ; 2) souffle ⇒ 3 défis ; 3) souffle ⇒ chapeau ; 4) pas de chapeau ⇒ pas porté
export function normFete(raw) {
  const f = feteDefaut();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return f;
  const d = raw.defis && typeof raw.defis === 'object' && !Array.isArray(raw.defis) ? raw.defis : {};
  for (const id of DEFI_IDS) f.defis[id] = d[id] === true;
  f.souffle = raw.souffle === true; f.chapeau = raw.chapeau === true; f.porte = raw.porte === true;
  if (f.souffle && !DEFI_IDS.every(id => f.defis[id])) f.souffle = false;
  if (f.souffle) f.chapeau = true;
  if (!f.chapeau) f.porte = false;
  return f;
}
export const bougies = f => DEFIS.reduce((a, d) => a + (f.defis[d.id] ? d.bougies : 0), 0);
export const pretASouffler = f => !f.souffle && DEFI_IDS.every(id => f.defis[id]);
export const defiDe = id => DEFIS.find(d => d.id === id) || null;

// Réponse : espaces ignorés, virgule ou point acceptés pour les entiers ; 9/13 exactement (fraction irréductible)
export function verifier(id, saisie) {
  const d = defiDe(id); if (!d) return false;
  const s = String(saisie ?? '').replace(/\s+/g, '').replace('−', '-');
  return s === d.rep;
}
// Tentative sans pénalité : 1re erreur → encouragement ; 2e → indice ; 3e et plus → on peut voir la réponse
export function etapeErreur(nErreurs) { return nErreurs <= 1 ? 'encore' : nErreurs === 2 ? 'indice' : 'reponse'; }
export const ENCOURAGE = 'Presque! Essaie encore.';
// Réussir (ou voir la réponse) allume les bougies du défi ; renvoie une nouvelle fête normalisée
export function reussir(f, id) { const n = normFete(f); if (DEFI_IDS.includes(id)) n.defis[id] = true; return n; }
export function souffler(f) { const n = normFete(f); if (!pretASouffler(n)) return n; n.souffle = true; n.chapeau = true; n.porte = true; return normFete(n); }
export function basculerChapeau(f) { const n = normFete(f); if (n.chapeau) n.porte = !n.porte; return n; }
// Confettis : bornés, réduits selon le palier de qualité adaptative (0 = plein … 5 = le plus léger), aucun si mouvement réduit
export const CONFETTI_MAX = 150;
export function nbConfettis(level = 0, reduceMotion = false) { if (reduceMotion) return 0; return [150, 150, 100, 100, 60, 60][Math.max(0, Math.min(5, level | 0))]; }
```

Puis `save.js` (script d’édition exact) :

```python
# save.js : fete13 par défaut et normalisé, sans changer v ni la clé
p='js/save.js'; s=open(p).read()
s=s.replace("import { animauxDefaut, normAnimaux } from './animaux.js';","import { animauxDefaut, normAnimaux } from './animaux.js';\nimport { feteDefaut, normFete } from './fete.js';",1)
s=s.replace("    rods: { petite: true, moyenne: false, grosse: false },\n  };","    rods: { petite: true, moyenne: false, grosse: false },\n    // Fête de Camille (13 ans) : défis, bougies soufflées, chapeau de Charlie — champ optionnel, même version\n    fete13: feteDefaut(),\n  };",1)
s=s.replace("    })() };\n}","    })(), fete13: normFete(raw.fete13) };\n}",1)
open(p,'w').write(s)
```

- [ ] **Step 4: Run tests**

Run: `node tools/test-fete.mjs && node tools/test-math.mjs | tail -1`
Expected: `… PASS, 0 FAIL` puis `139815 PASS, 0 FAIL`.

- [ ] **Step 5: Commit** — `git add js/fete.js js/save.js tools/test-fete.mjs && git commit -m "feat(fete): logique pure et sauvegarde fete13"`

### Task 2: Cache GitHub Pages (carte d’import)

**Files:**
- Create: `tools/importmap.mjs`
- Modify: `index.html` (généré), `tools/test-fete.mjs` (bloc Cache Pages)

**Interfaces:** Produces `hash(buf)`, `modules(root)`, `render(root)`, `apply(html, root)` ; CLI `node tools/importmap.mjs [--check]`.

- [ ] **Step 1: Ajouter le test** (avant la ligne `console.log` finale de `tools/test-fete.mjs`)

```js
// Cache Pages : carte d’import à jour, chaque module versionné, point d’entrée par la carte
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
ok('carte d’import à jour', apply(html) === html);
ok('chaque module dans la carte', modules().every(m => html.includes(`"./${m}": "./${m}?v=`)), modules().filter(m => !html.includes(`"./${m}"`)).join());
ok('fete.js et fete-scene.js versionnés', html.includes('"./js/fete.js"') && html.includes('"./js/fete-scene.js"'));
ok('entrée par la carte', html.includes("import './js/main.js'") && !html.includes('src="js/main.js"') && html.indexOf('type="importmap"') < html.indexOf("import './js/main.js'"));
ok('style versionné', /style\.css\?v=[0-9a-f]{10}/.test(html));
```
avec, en tête : `import { readFileSync } from 'node:fs';` et `import { apply, modules } from './importmap.mjs';`

- [ ] **Step 2: Vérifier l’échec** — `node tools/test-fete.mjs` → `Cannot find module …/importmap.mjs`.
- [ ] **Step 3: Implémenter** `tools/importmap.mjs` :

```js
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
```

- [ ] **Step 4: Générer et vérifier** — `node tools/importmap.mjs && node tools/importmap.mjs --check && node tools/test-fete.mjs` → `carte d’import à jour`, `… PASS, 0 FAIL`. (Ce test échoue tant que `fete-scene.js` n’existe pas ; il passe à la tâche 3.)
- [ ] **Step 5: Commit** — `git add tools/importmap.mjs tools/test-fete.mjs index.html && git commit -m "build(cache): carte d’import versionnée pour Pages"`

### Task 3: Décor, gâteau, chapeau, confettis et branchement

**Files:**
- Create: `js/fete-scene.js`
- Modify: `js/main.js`, `style.css`, `index.html` (régénéré)

**Interfaces:**
- Consumes: fonctions de la tâche 1 ; `mesh`, `at`, `plaque`, `curved` de `world.js` ; `pets.charlie.body`.
- Produces: `makeFeteScene({scene, world, active})` → `{ setBougies(n), confettis(n), update(dt,time) }` ; `chapeauCharlie(body)` ; `GATEAU = {x:4.6, z:2.4}` ; `G.fete = { on, reussir(id), souffler(), basculer() }` ; interactable `kind: 'gateau'`.

- [ ] **Step 1:** Créer `js/fete-scene.js` :

```js
// Fête de Camille : décor 3D de la place (guirlande, table, gâteau à 13 bougies, bannière), confettis bornés et chapeau de Charlie.
// Aucune vraie lumière : flammes et confettis en matériaux de base (MeshBasic), mailles instanciées.
import * as THREE from '../vendor/three.module.min.js';
import { mesh, at, plaque, curved } from './world.js';
import { BANNIERE, CONFETTI_MAX } from './fete.js';

export const GATEAU = { x: 4.6, z: 2.4 }; // place de l’île 1, à l’est du sentier, près de l’arrivée (2, 6)
const basic = (color, extra = {}) => curved(new THREE.MeshBasicMaterial({ color, toneMapped: false, ...extra }));

export function makeFeteScene({ scene, world, active }) {
  const root = new THREE.Group(); root.visible = active; world.root.add(root);
  const { x: cx, z: cz } = GATEAU, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s1 = new THREE.Vector3(1, 1, 1), col = new THREE.Color();
  let flames = null, candles = null;
  if (active) {
    // Table et gâteau à 2 étages
    root.add(at(mesh(new THREE.BoxGeometry(1.6, 0.08, 1.0), '#c98f5a'), cx, 0.72, cz));
    for (const [dx, dz] of [[-0.7, -0.4], [0.7, -0.4], [-0.7, 0.4], [0.7, 0.4]]) root.add(at(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.72, 5), '#8a5a2b'), cx + dx, 0.36, cz + dz));
    root.add(at(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.24, 16), '#f7e1ea'), cx, 0.88, cz));
    root.add(at(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 16), '#fbeff4'), cx, 1.1, cz));
    // 13 bougies en cercle sur l’étage du bas (une maille instanciée) ; flammes instanciées, on n’affiche que celles allumées
    candles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 5), basic('#ffffff'), 13);
    flames = new THREE.InstancedMesh(new THREE.ConeGeometry(0.03, 0.08, 5), basic('#ffcf4a'), 13);
    const pal = ['#ff7aa8', '#7ac8ff', '#ffd36a', '#9be27a'];
    for (let i = 0; i < 13; i++) {
      const a = (i / 13) * Math.PI * 2, x = cx + Math.cos(a) * 0.35, z = cz + Math.sin(a) * 0.35;
      m4.makeTranslation(x, 1.07, z); candles.setMatrixAt(i, m4); candles.setColorAt(i, col.set(pal[i % 4]));
      m4.makeTranslation(x, 1.18, z); flames.setMatrixAt(i, m4);
    }
    flames.count = 0; root.add(candles, flames);
    // Deux poteaux et une guirlande de 13 fanions
    const p1 = [cx - 2.2, cz - 1.2], p2 = [cx + 2.2, cz - 1.2];
    for (const [px, pz] of [p1, p2]) root.add(at(mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.6, 6), '#8a5a2b'), px, 1.3, pz));
    const tri = new THREE.ConeGeometry(0.12, 0.26, 3); tri.rotateX(Math.PI); // pointe vers le bas
    const flags = new THREE.InstancedMesh(tri, basic('#ffffff', { side: THREE.DoubleSide }), 13);
    for (let i = 0; i < 13; i++) {
      const t = (i + 0.5) / 13, x = p1[0] + (p2[0] - p1[0]) * t, y = 2.45 - Math.sin(t * Math.PI) * 0.45;
      m4.makeTranslation(x, y, p1[1]); flags.setMatrixAt(i, m4); flags.setColorAt(i, col.set(['#ff6f91', '#ffd36a', '#6fc3ff', '#8be07a', '#c99bff'][i % 5]));
    }
    root.add(flags);
    const ban = plaque(BANNIERE, 0.42, 4.2, { size: 30, color: '#7a2e4a', bg: 'rgba(255,240,246,0.95)' }); ban.position.set(cx, 2.85, p1[1]); root.add(ban);
    world.obstacles.push({ x: cx, z: cz, r: 0.85 }, { x: p1[0], z: p1[1], r: 0.15 }, { x: p2[0], z: p2[1], r: 0.15 });
  }
  // Confettis : une maille instanciée de CONFETTI_MAX au plus, cachée hors animation
  const conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.08, 0.05), basic('#ffffff', { side: THREE.DoubleSide }), CONFETTI_MAX);
  conf.visible = false; conf.frustumCulled = false; scene.add(conf);
  const parts = []; let confT = 0;
  for (let i = 0; i < CONFETTI_MAX; i++) conf.setColorAt(i, col.set(['#ff6f91', '#ffd36a', '#6fc3ff', '#8be07a', '#c99bff'][i % 5]));

  const api = {
    active, root,
    setBougies(n) { if (flames) flames.count = Math.max(0, Math.min(13, n)); },
    confettis(n) {
      if (!n) return; parts.length = 0; confT = 2.2; conf.count = n; conf.visible = true;
      for (let i = 0; i < n; i++) parts.push({ x: cx, y: 1.3, z: cz, vx: (Math.random() - 0.5) * 4, vy: 3 + Math.random() * 3, vz: (Math.random() - 0.5) * 4, r: Math.random() * 6 });
    },
    update(dt, time) {
      if (flames && flames.count) flames.position.y = Math.sin(time * 18) * 0.004; // léger tremblement
      if (confT <= 0) return; confT -= dt;
      if (confT <= 0) { conf.visible = false; return; }
      for (let i = 0; i < parts.length; i++) { const p = parts[i]; p.vy -= 6 * dt; p.vx *= 0.99; p.vz *= 0.99; p.x += p.vx * dt; p.y = Math.max(0.03, p.y + p.vy * dt); p.z += p.vz * dt; p.r += dt * 8;
        m4.compose(v.set(p.x, p.y, p.z), q.setFromEuler(e.set(p.r, p.r * 0.7, 0)), s1); conf.setMatrixAt(i, m4); }
      conf.instanceMatrix.needsUpdate = true;
    },
  };
  return api;
}
// Chapeau de fête conique pour Charlie (2 petites mailles, attachées à son corps)
export function chapeauCharlie(body) {
  const g = new THREE.Group(); g.add(at(mesh(new THREE.ConeGeometry(0.075, 0.2, 8), '#ff6f91'), 0, 0.78, 0.22)); g.add(at(mesh(new THREE.SphereGeometry(0.03, 6, 5), '#ffd36a'), 0, 0.89, 0.22));
  g.visible = false; body.add(g); return g;
}
```

- [ ] **Step 2:** Éditer `main.js` (script exact, assertions d’unicité) :

```python
# main.js : activation au chargement, décor, gâteau, chapeau, confettis, encart de débug
p='js/main.js'; s=open(p).read()
def rep(a,b):
    global s
    assert s.count(a)==1, a[:60]
    s=s.replace(a,b)
rep("import { makeRng } from './math/rng.js';\n","import { makeRng } from './math/rng.js';\nimport { feteActive, normFete, reussir, souffler, basculerChapeau, bougies, pretASouffler, nbConfettis, FETE_PARAM } from './fete.js';\nimport { makeFeteScene, chapeauCharlie, GATEAU } from './fete-scene.js';\n")
rep("const flows = makeFlows(G); G.flows = flows;","""// ---------- Fête de Camille (13 ans) : décidée une seule fois au chargement (8 nov. 2026 à Toronto ou ?fete=camille13)
state.fete13 = normFete(state.fete13);
const feteOn = feteActive(new Date(), location.search);
const feteScene = makeFeteScene({ scene, world, active: feteOn });
const chapeau = chapeauCharlie(pets.charlie.body);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const gateauIt = feteOn ? { id: 'gateau', kind: 'gateau', pos: new THREE.Vector3(GATEAU.x, 0, GATEAU.z), r: 2.1, label: 'Voir le gâteau 🎂' } : null;
if (gateauIt) world.interactables.push(gateauIt);
function syncFete() {
  const f = state.fete13; feteScene.setBougies(f.souffle ? 0 : bougies(f)); chapeau.visible = f.chapeau && f.porte;
  if (gateauIt) gateauIt.label = pretASouffler(f) ? 'Souffler les bougies 🎂' : f.souffle ? 'Relire le message 🎉' : 'Voir le gâteau 🎂';
}
G.fete = {
  on: feteOn,
  reussir(id) { state.fete13 = reussir(state.fete13, id); syncFete(); G.save(); },
  souffler() { if (!pretASouffler(state.fete13)) return false; state.fete13 = souffler(state.fete13); feteScene.confettis(nbConfettis(J.quality().level, reduceMotion)); audio.sfx('ok'); syncFete(); G.save(); return true; },
  basculer() { state.fete13 = basculerChapeau(state.fete13); syncFete(); G.save(); },
};
syncFete();
const flows = makeFlows(G); G.flows = flows;""")
rep("    case 'fetch': comp.pickup(); break;","    case 'fetch': comp.pickup(); break;\n    case 'gateau': flows.feteGateau(); break;")
rep("  if (!state.met.intro) { state.met.intro = 1; setTimeout(() => ui.toast('🍁 Bienvenue sur l’île, Camille! Charlie te suit partout. Va voir Gaston, à l’établi, à gauche du sentier.'), 400); }",
"  if (!state.met.intro) { state.met.intro = 1; setTimeout(() => ui.toast('🍁 Bienvenue sur l’île, Camille! Charlie te suit partout. Va voir Gaston, à l’établi, à gauche du sentier.'), 400); }\n  if (feteOn && !state.fete13.souffle) setTimeout(() => ui.toast('🎂 C’est la fête de Camille! Le gâteau t’attend sur la place. Gaston, Thérèse pis Hortense ont chacun un petit défi.', 'gold'), state.island === 2 ? 600 : 3400);")
rep("  updateFx(dt); flows.tick(dt);","  updateFx(dt); flows.tick(dt); feteScene.update(dt, G.time);")
rep("  renderer.render(scene, camera);\n  requestAnimationFrame(frame);\n}\nrequestAnimationFrame(frame);",
"""  renderer.render(scene, camera);
  if (debugEl && (debugT += dt) > 1) { debugT = 0; const q = J.quality(); debugEl.textContent = `${Math.round(fps)} i/s · ${renderer.info.render.calls} appels de dessin · palier ${q.level}`; }
  requestAnimationFrame(frame);
}
// Encart de mesure visible seulement avec ?fete=camille13&debug=1 (lecture à l’écran, sans console)
const debugEl = params.get('fete') === FETE_PARAM && params.get('debug') === '1' ? document.body.appendChild(Object.assign(document.createElement('div'), { id: 'fete-debug' })) : null; let debugT = 0;
requestAnimationFrame(frame);""")
open(p,'w').write(s)
```

- [ ] **Step 3:** Ajouter à `style.css` :

```css

/* Fête de Camille (13 ans) */
.prog.fete { background: #fde6ef; color: #7a2e4a; }
.fete-msg { font-size: 1.15rem; font-weight: 800; color: #7a2e4a; }
#fete-debug { position: fixed; left: 8px; bottom: 8px; z-index: 60; background: rgba(20, 20, 30, .78); color: #fff; font: 700 12px/1.3 ui-monospace, monospace; padding: 4px 8px; border-radius: 8px; pointer-events: none; }
```

- [ ] **Step 4:** `node --check js/fete-scene.js && node --check js/main.js && node tools/importmap.mjs && node tools/test-fete.mjs && node tools/test-math.mjs | tail -1` → tout PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(fete): décor de la place, gâteau à 13 bougies, chapeau de Charlie, confettis bornés" ` (avec `git add js/fete-scene.js`).

### Task 4: Dialogues des défis, gâteau et carnet

**Files:** Modify `js/flows.js`, `index.html` (régénéré).

**Interfaces:** Consumes `G.fete`, `FETE.*` ; Produces `F.feteDefi(id)`, `F.feteGateau()`, `F.feteMessage()`.

- [ ] **Step 1:** Éditer `flows.js` (script exact ; insère le bloc ci-dessous avant « Établi de Gaston ») :

```python
# flows.js : option « 🎂 Défi de fête », dialogues de défi et du gâteau, chapeau dans le carnet
p='js/flows.js'; s=open(p).read()
def rep(a,b):
    global s
    assert s.count(a)==1, a[:60]
    s=s.replace(a,b)
rep("import { FETCH_MAX, COLLIERS } from './animaux.js';","import { FETCH_MAX, COLLIERS } from './animaux.js';\nimport * as FETE from './fete.js';")
rep("    opts.push(['👋 À plus tard!', () => ui.close()]);","    if (G.fete?.on && st.island !== 2 && FETE.DEFI_IDS.includes(v.id) && !st.fete13?.defis?.[v.id]) opts.unshift(['🎂 Défi de fête', () => F.feteDefi(v.id)]);\n    opts.push(['👋 À plus tard!', () => ui.close()]);")
rep("  // ---------- Établi de Gaston\n", open('/tmp/fete/flows-fete.snippet.js').read() + "\n  // ---------- Établi de Gaston\n")
rep("COLLIERS[c][1])))); };","""COLLIERS[c][1]))),
      st.fete13?.chapeau ? h('div', { class: 'ctools' }, h('span', { class: `chip collier chapeau${st.fete13.porte ? ' on' : ''}`, role: 'checkbox', 'aria-checked': st.fete13.porte ? 'true' : 'false', tabindex: '0', title: 'Mettre ou enlever le chapeau de Charlie',
        onclick: () => { click(); G.fete.basculer(); F.carnet(F.carnetTab); } }, st.fete13.porte ? '🎉 Chapeau de fête de Charlie : porté' : '🎉 Chapeau de fête de Charlie : enlevé')) : null); };""")
open(p,'w').write(s)
```

Bloc inséré :

```js
  // ---------- Fête de Camille (13 ans) : 3 petits défis, sans chrono, sans pénalité, hors statistiques
  F.feteDefi = (id) => {
    const st = S(), d = FETE.defiDe(id); if (!d || !G.fete) return;
    let erreurs = 0, fini = false;
    const fb = h('div', { class: 'feedback', role: 'status' }), aide = h('div', { class: 'hints' });
    const prog = () => h('div', { class: 'prog fete' }, `🎂 Bougies allumées : ${FETE.bougies(st.fete13)} sur 13`);
    const progEl = h('div', {}, prog());
    const voir = h('button', { class: 'btn small hidden', onclick: () => { click(); gagne(true); } }, 'Voir la réponse');
    const fin = h('button', { class: 'btn primary hidden', onclick: () => { click(); ui.close(); } }, 'Continuer');
    const ex = { answer: { kind: 'num', fields: [{ label: 'Réponse' }] } };
    function gagne(vue) {
      if (fini) return; fini = true;
      G.fete.reussir(id); audio.sfx('ok');
      fb.className = vue ? 'feedback info' : 'feedback ok';
      fb.replaceChildren(h('b', {}, vue ? 'La réponse : ' : 'Bravo! '), d.explication, h('p', { class: 'benefit' }, `🕯️ ${d.bougies} bougies de plus sur le gâteau!`));
      progEl.replaceChildren(prog()); box.el.classList.add('hidden'); voir.classList.add('hidden'); fin.classList.remove('hidden');
      keyHandler = e => { if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') { fin.click(); return true; } return false; };
      if (FETE.pretASouffler(st.fete13)) ui.toast('🎂 Les 13 bougies sont allumées! Va souffler au gâteau, sur la place.', 'gold');
    }
    const box = answerBox(ex, vals => {
      if (fini) return; const v = String(vals[0] || '').trim();
      if (!v) { fb.className = 'feedback info'; fb.textContent = 'Écris une réponse.'; return; }
      if (FETE.verifier(id, v)) return gagne(false);
      erreurs++; audio.sfx('near'); const etape = FETE.etapeErreur(erreurs);
      fb.className = 'feedback near'; fb.textContent = FETE.ENCOURAGE;
      if (etape !== 'encore' && !aide.childElementCount) aide.append(h('p', { class: 'hintline' }, h('b', {}, 'Indice : '), d.indice));
      if (etape === 'reponse') voir.classList.remove('hidden');
      box.clear();
    });
    open(h('div', { class: 'exercise fete' },
      h('div', { class: 'who' }, face(id), h('div', {}, h('b', {}, `${NOMS[id]} · 🎂 Défi de fête`), h('p', { class: 'line' }, d.q))),
      progEl, box.el, fb, aide, h('div', { class: 'row' }, voir, fin)), { cls: 'talk' });
  };
  F.feteGateau = () => {
    const st = S(); if (!G.fete) return;
    const f = st.fete13, n = FETE.bougies(f);
    if (FETE.pretASouffler(f)) { G.fete.souffler(); return F.feteMessage(); }
    if (f.souffle) return F.feteMessage();
    const reste = FETE.DEFIS.filter(d => !f.defis[d.id]).map(d => `${NOMS[d.id].split(' ')[0]} (${d.bougies})`).join(', ');
    open(h('div', { class: 'dialog' }, h('div', { class: 'who' }, h('div', { class: 'face' }, '🎂'), h('div', {}, h('b', {}, 'Le gâteau de fête'), h('p', { class: 'line' }, `${n} bougie${n > 1 ? 's' : ''} sur 13. Pour allumer les autres, va voir : ${reste}.`))),
      h('div', { class: 'choices' }, h('button', { class: 'btn primary', onclick: () => { click(); ui.close(); } }, 'D’accord'))), { cls: 'talk' });
  };
  F.feteMessage = () => {
    open(h('div', { class: 'dialog fete-fin' }, h('div', { class: 'who' }, h('div', { class: 'face' }, '🎉'), h('div', {}, h('b', {}, '13 ans!'), h('p', { class: 'line fete-msg' }, FETE.MESSAGE))),
      h('div', { class: 'choices' }, h('button', { class: 'btn primary', onclick: () => { click(); ui.close(); } }, 'Merci!'))), { cls: 'talk' });
  };
```

- [ ] **Step 2:** `node --check js/flows.js && node tools/importmap.mjs && node tools/test-fete.mjs && node tools/test-math.mjs | tail -1` → PASS.
- [ ] **Step 3: Commit** — `git commit -am "feat(fete): 3 défis sans pénalité, gâteau, message, chapeau au carnet"`

### Task 5: Docs, aperçu et liste de QA

**Files:** Modify `README.md`, `GAME.md`, ce plan (cases cochées).

- [ ] **Step 1:** Ajouter une section « Fête de Camille (13 ans) » dans `GAME.md` (activation, défis, sauvegarde, chapeau, ce qui n’est pas encore vérifié) et une ligne dans `README.md` (tests Node, `tools/importmap.mjs` à relancer après chaque modification de JS/CSS).
- [ ] **Step 2:** `node tools/importmap.mjs --check && node tools/test-fete.mjs && node tools/test-math.mjs | tail -1`.
- [ ] **Step 3:** Lancer l’aperçu : `node tools/serve.js` sur un port libre, noter le PID.
- [ ] **Step 4: Commit** — `git commit -am "docs(fete): GAME, README, plan coché"`

## Self-review
- Couverture de la spec : activation (T1, T3), décor sans obstacle (T3, QA), 3 défis + aide sans pénalité hors stats (T1, T4), souffle/confettis/message/chapeau (T3, T4), sauvegarde et règles (T1), chapeau hors date et carnet (T3, T4), tests (T1, T2), perf/débug (T3), déploiement (hors plan : PR après revue).
- Aucun espace réservé ; noms identiques d’une tâche à l’autre (`G.fete.reussir/souffler/basculer`, `F.feteDefi/feteGateau/feteMessage`).
