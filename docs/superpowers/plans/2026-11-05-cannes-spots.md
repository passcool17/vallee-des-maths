# 3 cannes + 3 spots de pêche Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter 3 cannes cash chez Gaston (petite gratuite, moyenne 75 $, grosse 150 $) et 3 spots de pêche (quai île 1 / Lise / Lionel), chacun lié à une canne et à un pool petit/moyen/gros — sans toucher aux niveaux maths de la canne ni à Bernard (île 2).

**Architecture:** `state.rods` rétrocompatible via `normalize`. Catalogue `RODS` + section « Cannes » dans `F.workbench` (cash, pas de taxes). Interactables `kind:'fish'` avec `rod` + `spot` + `zone` ; `startFishing(it)` vérifie la canne et repositionne le bobber ; pools communs/rares choisis par `fishing.rod` / `q.rod`. Île 2 inchangée (`W().fishSpot` sans `rod`).

**Tech Stack:** Vanilla JS ES modules, three.js vendored, Playwright (`tools/test-*.cjs` + `tools/serve.js`), GitHub Pages.

## Global Constraints

- Spec source : `docs/superpowers/specs/2026-11-05-cannes-spots-design.md` (approche 1, approuvée Pascal).
- Prix exacts : petite **0 $** (owned au départ), moyenne **75,00 $** (`7500` cents), grosse **150,00 $** (`15000` cents) ; achat **cash chez Gaston**, **sans** ticket TPS/TVQ.
- Niveaux outil `tools.canne` / établi maths **inchangés** ; île 2 / Bernard / `RARE_FISH2` **inchangés**.
- Accès spot : pont (`bridges.bleuets` / `bridges.erables`) **et** canne du spot ; sinon toast « Il te faut la canne X — passe voir Gaston. »
- Français québécois cozy ; ne jamais push `main` sans « Oui, publie » de Pascal.
- Branche : `feat/cannes-spots`.

## File map

| File | Role |
| --- | --- |
| `js/save.js` | `rods: { petite, moyenne, grosse }` dans `newState` + `normalize` |
| `js/actionq.js` | Pools `RARE_FISH_M` / `RARE_FISH_G` ; `COMMON_FISH` ; `loot(..., rod)` |
| `js/shop.js` | Prix `SELL` des poissons moyens/gros |
| `js/flows.js` | Labels `ITEMS` ; `RODS` ; UI Cannes dans `workbench` ; `buyRod` ; `RARE_KEYS` ; `loot(..., q.rod)` |
| `js/world.js` | Quais Lise/Lionel dans `bleuetDecor` / `cabaneDecor` ; interactables `rod`/`spot`/`zone` ; quai île 1 avec `rod:'petite'` |
| `js/main.js` | `zoneItOk` fish+zone ; `startFishing(it)` gating + bobber + pools ; `fishTick`/`reel` utilisent `fishing.spot`/`fishing.rod` |
| `GAME.md` | Cannes, spots, prix, lien canne↔spot↔grosseur ; champ `rods` |
| `tools/test-cannes-spots.cjs` | Playwright (pattern `test-cabane-bleuet.cjs`) |

---

### Task 1: Save `rods` + normalize

**Files:**
- Modify: `js/save.js`
- Test: `tools/test-cannes-spots.cjs` (créé ici, étendu ensuite)

**Interfaces:**
- Produces: `newState().rods === { petite: true, moyenne: false, grosse: false }` ; `normalize` sans `rods` force `petite: true` et les absentes à `false` ; conserve les booléens existants.

- [ ] **Step 1: Write the failing test**

Create `tools/test-cannes-spots.cjs` en copiant le bootstrap Playwright de `tools/test-cabane-bleuet.cjs` (chromium path, `ok()`, `open()` avec `?fresh=1&seed=4242&adapt=0&time=midi`, `#play`, `__mv.waitT`).

Première série d’asserts (après Jouer), via `page.evaluate` + `import('./js/save.js')` :

```js
const sv = await page.evaluate(async () => {
  const s = await import('./js/save.js');
  const neu = s.newState(7);
  const old = s.normalize({ v: 5, seed: 3, money: 100 }, 3);
  const kept = s.normalize({ v: 5, seed: 3, rods: { petite: true, moyenne: true, grosse: false } }, 3);
  const partial = s.normalize({ v: 5, seed: 3, rods: { moyenne: true } }, 3);
  return {
    neu: neu.rods,
    old: old.rods,
    kept: kept.rods,
    partial: partial.rods,
    v: neu.v,
  };
});
ok('a newState.rods : petite true, moyenne/grosse false',
  sv.neu && sv.neu.petite === true && sv.neu.moyenne === false && sv.neu.grosse === false, JSON.stringify(sv.neu));
ok('a normalize sans rods → petite true',
  sv.old && sv.old.petite === true && sv.old.moyenne === false && sv.old.grosse === false, JSON.stringify(sv.old));
ok('a normalize conserve moyenne owned',
  sv.kept && sv.kept.moyenne === true && sv.kept.grosse === false, JSON.stringify(sv.kept));
ok('a normalize partial : petite true même si omise, moyenne true',
  sv.partial && sv.partial.petite === true && sv.partial.moyenne === true && sv.partial.grosse === false, JSON.stringify(sv.partial));
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node tools/serve.js 8653 &
node tools/test-cannes-spots.cjs 8653
```

Expected: FAIL sur `newState.rods` / `normalize` (`rods` undefined).

- [ ] **Step 3: Write minimal implementation**

In `js/save.js` `newState`, after `animaux` line, add:

```js
rods: { petite: true, moyenne: false, grosse: false },
```

In `normalize`, after merging tools/bridges (same return object), add rods handling. Prefer an explicit merge like:

```js
rods: (() => {
  const r = obj(raw.rods);
  return {
    petite: r.petite !== false, // défaut true si absent
    moyenne: !!r.moyenne,
    grosse: !!r.grosse,
  };
})(),
```

Keep `v: 5` (pas de bump de version — champ additif comme `animaux`).

- [ ] **Step 4: Run test to verify it passes**

```bash
node tools/test-cannes-spots.cjs 8653
```

Expected: PASS sur les 4 asserts `a …`.

- [ ] **Step 5: Commit**

```bash
git add js/save.js tools/test-cannes-spots.cjs
git commit -m "feat(cannes): state.rods + normalize rétrocompatible"
```

---

### Task 2: Pools poissons moyens/gros (ITEMS, SELL, loot, RARE_KEYS)

**Files:**
- Modify: `js/shop.js`, `js/actionq.js`, `js/flows.js`
- Test: `tools/test-cannes-spots.cjs`

**Interfaces:**
- Consumes: (none from Task 1 beyond save)
- Produces:
  - Ids communs moyens : `meunier`, `crapet`, `brochet`
  - Ids rares moyens : `ouananiche`, `touladi`, `anguille`
  - Ids communs gros : `laquaiche`, `coregone`, `barbotte`
  - Ids rares gros : `marigane`, `omble_ch`, `esturgeon_n`
  - `COMMON_FISH = { petite: [[id,w],…], moyenne:…, grosse:… }`
  - `RARE_FISH_M`, `RARE_FISH_G`
  - `loot(kind, d, isle = 1, rod = 'petite')` — île 2 ignore `rod` et garde `RARE_FISH2` ; île 1 fish : rod `moyenne`→`RARE_FISH_M`, `grosse`→`RARE_FISH_G`, sinon `RARE_FISH`
  - `ITEMS` + `SELL` + `RARE_KEYS` étendus

Prix (cents) — entre petits île 1 et rares île 2 :

| id | SELL |
| --- | --- |
| meunier | 350 |
| crapet | 450 |
| brochet | 550 |
| ouananiche | 850 |
| touladi | 1050 |
| anguille | 1250 |
| laquaiche | 600 |
| coregone | 750 |
| barbotte | 900 |
| marigane | 1300 |
| omble_ch | 1600 |
| esturgeon_n | 1900 |

- [ ] **Step 1: Write the failing test**

Append to `tools/test-cannes-spots.cjs` :

```js
const pools = await page.evaluate(async () => {
  const shop = await import('./js/shop.js');
  const aq = await import('./js/actionq.js');
  const fl = await import('./js/flows.js');
  return {
    sell: {
      meunier: shop.SELL.meunier, crapet: shop.SELL.crapet, brochet: shop.SELL.brochet,
      ouananiche: shop.SELL.ouananiche, touladi: shop.SELL.touladi, anguille: shop.SELL.anguille,
      laquaiche: shop.SELL.laquaiche, coregone: shop.SELL.coregone, barbotte: shop.SELL.barbotte,
      marigane: shop.SELL.marigane, omble_ch: shop.SELL.omble_ch, esturgeon_n: shop.SELL.esturgeon_n,
      perchaude: shop.SELL.perchaude, gros_dore: shop.SELL.gros_dore,
    },
    loot: {
      p0: aq.loot('fish', 0, 1, 'petite'),
      m1: aq.loot('fish', 1, 1, 'moyenne'),
      g2: aq.loot('fish', 2, 1, 'grosse'),
      i2: aq.loot('fish', 0, 2, 'grosse'),
      berry: aq.loot('berry', 1),
    },
    common: aq.COMMON_FISH,
    items: {
      meunier: fl.ITEMS.meunier, ouananiche: fl.ITEMS.ouananiche,
      laquaiche: fl.ITEMS.laquaiche, marigane: fl.ITEMS.marigane,
    },
  };
});
ok('b SELL moyens/gros',
  pools.sell.meunier === 350 && pools.sell.crapet === 450 && pools.sell.brochet === 550
  && pools.sell.ouananiche === 850 && pools.sell.touladi === 1050 && pools.sell.anguille === 1250
  && pools.sell.laquaiche === 600 && pools.sell.coregone === 750 && pools.sell.barbotte === 900
  && pools.sell.marigane === 1300 && pools.sell.omble_ch === 1600 && pools.sell.esturgeon_n === 1900
  && pools.sell.perchaude === 150 && pools.sell.gros_dore === 900, JSON.stringify(pools.sell));
ok('b loot fish par rod + île 2 inchangé',
  pools.loot.p0 === 'omble' && pools.loot.m1 === 'touladi' && pools.loot.g2 === 'esturgeon_n'
  && pools.loot.i2 === 'gros_dore' && pools.loot.berry === 'confiture', JSON.stringify(pools.loot));
ok('b COMMON_FISH a petite/moyenne/grosse',
  !!(pools.common && pools.common.petite && pools.common.moyenne && pools.common.grosse
    && pools.common.moyenne.some(([k]) => k === 'meunier')
    && pools.common.grosse.some(([k]) => k === 'barbotte')), JSON.stringify(pools.common));
ok('b ITEMS labels québécois',
  pools.items.meunier && pools.items.meunier[1] === 'Meunier noir'
  && pools.items.ouananiche[1] === 'Ouananiche'
  && pools.items.laquaiche[1] === 'Laquaiche aux yeux d’or'
  && pools.items.marigane[1] === 'Marigane noire', JSON.stringify(pools.items));
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
node tools/test-cannes-spots.cjs 8653
```

Expected: FAIL (`SELL.meunier` undefined / `COMMON_FISH` undefined).

- [ ] **Step 3: Add SELL prices**

In `js/shop.js` `SELL`, after the fish lines (keep existing perchaude…bar), add:

```js
meunier: 350, crapet: 450, brochet: 550,
ouananiche: 850, touladi: 1050, anguille: 1250,
laquaiche: 600, coregone: 750, barbotte: 900,
marigane: 1300, omble_ch: 1600, esturgeon_n: 1900,
```

- [ ] **Step 4: Add actionq pools + loot(rod)**

In `js/actionq.js`:

```js
export const RARE_FISH_M = ['ouananiche', 'touladi', 'anguille'];
export const RARE_FISH_G = ['marigane', 'omble_ch', 'esturgeon_n'];
export const COMMON_FISH = {
  petite: [['perchaude', 50], ['achigan', 30], ['dore', 12], ['truite', 8]],
  moyenne: [['meunier', 45], ['crapet', 30], ['brochet', 25]],
  grosse: [['laquaiche', 40], ['coregone', 35], ['barbotte', 25]],
};
```

Replace `loot` with:

```js
export const loot = (kind, d, isle = 1, rod = 'petite') => {
  const i = Math.max(0, Math.min(2, d));
  if (kind === 'fish') {
    if (isle === 2) return RARE_FISH2[i];
    if (rod === 'moyenne') return RARE_FISH_M[i];
    if (rod === 'grosse') return RARE_FISH_G[i];
    return RARE_FISH[i];
  }
  if (kind === 'berry') return BLEUETS[i];
  return SIROP[i];
};
```

Note: weights for petite in `COMMON_FISH` are baselines ; `main.js` `reel` may still add `lvl * 4` for dore/truite on petite only (voir Task 5) — keep `COMMON_FISH.petite` as base weights without level bump here, or document that `reel` mutates weights for petite. Prefer Task 5 to apply level bump only for `rod === 'petite' || !rod` to mirror current behavior on quai + île 2.

- [ ] **Step 5: Add ITEMS + RARE_KEYS**

In `js/flows.js` `ITEMS`:

```js
meunier: ['🐟', 'Meunier noir'], crapet: ['🐟', 'Crapet-soleil'], brochet: ['🐠', 'Brochet maillé'],
ouananiche: ['🐠', 'Ouananiche'], touladi: ['🐟', 'Touladi'], anguille: ['🐋', 'Anguille d’Amérique'],
laquaiche: ['🐟', 'Laquaiche aux yeux d’or'], coregone: ['🐠', 'Corégone'], barbotte: ['🐟', 'Barbotte'],
marigane: ['🐟', 'Marigane noire'], omble_ch: ['🐠', 'Omble chevalier'], esturgeon_n: ['🐋', 'Esturgeon noir'],
```

In `F.carnet` `RARE_KEYS` array, append:
`'ouananiche', 'touladi', 'anguille', 'marigane', 'omble_ch', 'esturgeon_n'`.

In `F.actionQ` win path, change loot call to:

```js
const key = loot(q.kind, q.d, isle, q.rod || 'petite'), got = G.grant(key);
```

- [ ] **Step 6: Run test — expect PASS**

```bash
node tools/test-cannes-spots.cjs 8653
```

Expected: PASS asserts `b …`.

- [ ] **Step 7: Commit**

```bash
git add js/shop.js js/actionq.js js/flows.js tools/test-cannes-spots.cjs
git commit -m "feat(cannes): pools poissons moyens/gros + loot(rod)"
```

---

### Task 3: Catalogue RODS + UI cash chez Gaston

**Files:**
- Modify: `js/flows.js` (`RODS`, `F.workbench`, `F.buyRod`)
- Test: `tools/test-cannes-spots.cjs`

**Interfaces:**
- Produces:
  - `export const RODS = [{ id, nom, prixCents, desc }, …]`
  - `F.buyRod(id)` : si déjà owned → toast ; si `money < prix` → toast manque ; sinon `money -= prix`, `rods[id]=true`, save, toast, refresh workbench
  - Section « Cannes » sous les outils dans `workbench(isle===1)` seulement (pas chez Rosalie)

Exact catalogue:

```js
export const RODS = [
  { id: 'petite', nom: 'Canne de base', prixCents: 0, desc: 'Quai de l’île 1 — petits poissons.' },
  { id: 'moyenne', nom: 'Canne moyenne', prixCents: 7500, desc: 'Spot de Lise — poissons moyens.' },
  { id: 'grosse', nom: 'Canne grosse', prixCents: 15000, desc: 'Spot de Lionel — gros poissons.' },
];
```

- [ ] **Step 1: Write the failing test**

```js
const rodsUi = await page.evaluate(async () => {
  const fl = await import('./js/flows.js');
  __mv.state.money = 20000;
  __mv.state.rods = { petite: true, moyenne: false, grosse: false };
  __mv.flows.workbench(1);
  const rows = [...document.querySelectorAll('#panel .rods .rod')].map(el => ({
    id: el.dataset.rod,
    owned: el.classList.contains('owned'),
    btn: el.querySelector('button')?.textContent || null,
  }));
  return { RODS: fl.RODS, rows, money: __mv.state.money };
});
ok('c RODS : petite 0, moyenne 7500, grosse 15000',
  rodsUi.RODS && rodsUi.RODS[0].id === 'petite' && rodsUi.RODS[0].prixCents === 0
  && rodsUi.RODS[1].prixCents === 7500 && rodsUi.RODS[2].prixCents === 15000, JSON.stringify(rodsUi.RODS));
ok('c UI Cannes : petite owned, moyenne achetable',
  rodsUi.rows.length === 3 && rodsUi.rows[0].owned && !rodsUi.rows[1].owned
  && /75/.test(rodsUi.rows[1].btn || ''), JSON.stringify(rodsUi.rows));

const bought = await page.evaluate(() => {
  const btn = document.querySelector('#panel .rods .rod[data-rod="moyenne"] button');
  if (btn) btn.click();
  return { rods: { ...__mv.state.rods }, money: __mv.state.money };
});
ok('c buyRod moyenne : −75 $ et owned',
  bought.rods.moyenne === true && bought.money === 12500, JSON.stringify(bought));
```

- [ ] **Step 2: Run — expect FAIL** (`RODS` undefined / `.rods` empty)

- [ ] **Step 3: Implement RODS + buyRod + UI**

Near top of `js/flows.js` (after `ITEMS`):

```js
export const RODS = [
  { id: 'petite', nom: 'Canne de base', prixCents: 0, desc: 'Quai de l’île 1 — petits poissons.' },
  { id: 'moyenne', nom: 'Canne moyenne', prixCents: 7500, desc: 'Spot de Lise — poissons moyens.' },
  { id: 'grosse', nom: 'Canne grosse', prixCents: 15000, desc: 'Spot de Lionel — gros poissons.' },
];
```

Inside `makeFlows`, add:

```js
F.buyRod = (id) => {
  const st = S(), rod = RODS.find(r => r.id === id); if (!rod) return;
  if (!st.rods) st.rods = { petite: true, moyenne: false, grosse: false };
  if (st.rods[id]) { ui.toast(`Tu as déjà la ${rod.nom.toLowerCase()}.`); return; }
  if (rod.prixCents <= 0) { st.rods[id] = true; G.save(); return; }
  if (st.money < rod.prixCents) {
    ui.toast(`Il te manque ${fmtMoney(rod.prixCents - st.money)} pour la ${rod.nom.toLowerCase()}.`);
    return;
  }
  st.money -= rod.prixCents; st.rods[id] = true; G.save(); audio.sfx('coin');
  ui.toast(`🎣 ${rod.nom} achetée!`, 'gold');
  F.workbench(1);
};
```

In `F.workbench`, after building `cards` (TOOLS), when `isle === 1`, build rods section:

```js
const stRods = st.rods || { petite: true, moyenne: false, grosse: false };
const rodRows = isle === 1 ? h('div', { class: 'rods' },
  h('h4', {}, 'Cannes'),
  ...RODS.map(r => {
    const owned = !!stRods[r.id];
    const body = owned
      ? h('p', { class: 'max' }, 'Possédée')
      : h('div', { class: 'row' },
          h('button', {
            class: 'btn primary', 'data-rod': r.id,
            onclick: () => { click(); F.buyRod(r.id); },
          }, r.prixCents ? `Acheter · ${fmtMoney(r.prixCents)}` : 'Prendre'));
    return h('div', { class: `rod ${owned ? 'owned' : ''}`, 'data-rod': r.id },
      h('div', { class: 'ticon' }, '🎣'),
      h('div', { class: 'tbody' },
        h('div', { class: 'thead' }, h('b', {}, r.nom), h('span', { class: 'price' }, r.prixCents ? fmtMoney(r.prixCents) : 'Offerte')),
        h('p', { class: 'benefit' }, r.desc), body));
  })) : null;
```

Include `rodRows` in the `open(...)` content next to `h('div', { class: 'tools' }, cards)`.

Also push a talk option is unnecessary — établi déjà accessible via Gaston / interactable.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add js/flows.js tools/test-cannes-spots.cjs
git commit -m "feat(cannes): section Cannes cash à l’établi de Gaston"
```

---

### Task 4: Quais Lise / Lionel + quai île 1 annoté

**Files:**
- Modify: `js/world.js`
- Test: `tools/test-cannes-spots.cjs`

**Interfaces:**
- Produces: interactables
  - `id:'quai'` already : add `rod:'petite'`, `spot:{x,z,fx,fz}` (mêmes valeurs que `fishSpot` actuel)
  - `id:'quai_lise'`, `kind:'fish'`, `rod:'moyenne'`, `zone:'bleuets'`, `spot:{ x:52, z:6, fx:56, fz:6 }`, mesh dans `bleuetDecor`
  - `id:'quai_lionel'`, `kind:'fish'`, `rod:'grosse'`, `zone:'erables'`, `spot:{ x:-4, z:-56, fx:-4, fz:-60 }`, mesh dans `cabaneDecor`
- `syncZoneDecor` déjà cache `bleuetDecor`/`cabaneDecor` → quais Lise/Lionel absents tant que pont fermé
- Keep exporting `fishSpot` (quai principal) for île 2 / rétrocompat bobber default

Helper (inline in `buildWorld`):

```js
function makeShoreDock(parent, { id, x, z, fx, fz, rod, zone, labelText }) {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) g.add(at(mesh(new THREE.BoxGeometry(1.8, 0.14, 0.42), i % 2 ? '#b88a5c' : '#a77a4f'), 0, 0.05, i * 0.45));
  for (const px of [-0.85, 0.85]) g.add(at(mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.4, 5), '#7a5236'), px, -0.4, 1.5));
  const sg = label(labelText, { size: 22, scale: 0.75 }); sg.position.set(0, 1.6, 0.6); g.add(sg);
  parent.add(at(g, x, 0, z));
  obstacles.push({ x, z, r: 0.9 });
  const spot = { x, z, fx, fz };
  interactables.push({ id, kind: 'fish', rod, zone, pos: new THREE.Vector3(x, 0, z), r: 1.8, label: 'Pêcher', obj: g, spot });
  return spot;
}
```

Call after bleuet table / after cabane sap setup:

```js
makeShoreDock(bleuetDecor, { id: 'quai_lise', x: 52, z: 6, fx: 56, fz: 6, rod: 'moyenne', zone: 'bleuets', labelText: 'Quai de Lise' });
makeShoreDock(cabaneDecor, { id: 'quai_lionel', x: -4, z: -56, fx: -4, fz: -60, rod: 'grosse', zone: 'erables', labelText: 'Quai de Lionel' });
```

On existing quai push, add `rod: 'petite'` and `spot: { x: 6, z: DOCK.z1 - 0.8, fx: 6, fz: DOCK.z1 + 3 }`.

- [ ] **Step 1: Write the failing test**

```js
const spotsClosed = await page.evaluate(() => {
  const its = __mv.world.interactables.filter(i => i.kind === 'fish');
  return {
    ids: its.map(i => i.id),
    rods: Object.fromEntries(its.map(i => [i.id, i.rod])),
    zones: Object.fromEntries(its.map(i => [i.id, i.zone || null])),
    bridges: { ...__mv.state.bridges },
    liseVis: !!its.find(i => i.id === 'quai_lise')?.obj?.visible,
    lionelVis: !!its.find(i => i.id === 'quai_lionel')?.obj?.visible,
  };
});
ok('d quai + quai_lise + quai_lionel existent avec rods',
  spotsClosed.ids.includes('quai') && spotsClosed.ids.includes('quai_lise') && spotsClosed.ids.includes('quai_lionel')
  && spotsClosed.rods.quai === 'petite' && spotsClosed.rods.quai_lise === 'moyenne' && spotsClosed.rods.quai_lionel === 'grosse',
  JSON.stringify(spotsClosed));
ok('d ponts fermés : quais Lise/Lionel non visibles (parent décor)',
  spotsClosed.liseVis === false && spotsClosed.lionelVis === false, JSON.stringify(spotsClosed));

await page.evaluate(() => {
  __mv.world.openBridge('bleuets');
  __mv.world.openBridge('erables');
});
await page.evaluate(() => __mv.waitT(0.2));
const spotsOpen = await page.evaluate(() => {
  const its = __mv.world.interactables.filter(i => i.kind === 'fish');
  return {
    liseVis: !!its.find(i => i.id === 'quai_lise')?.obj?.visible,
    lionelVis: !!its.find(i => i.id === 'quai_lionel')?.obj?.visible,
  };
});
ok('d ponts ouverts : quais Lise/Lionel visibles',
  spotsOpen.liseVis && spotsOpen.lionelVis, JSON.stringify(spotsOpen));
```

- [ ] **Step 2: Run — expect FAIL** (ids manquants)

- [ ] **Step 3: Implement docks in world.js**

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add js/world.js tools/test-cannes-spots.cjs
git commit -m "feat(cannes): quais Lise et Lionel + rod sur le quai principal"
```

---

### Task 5: Gating canne + pêche multi-spot + pools

**Files:**
- Modify: `js/main.js`
- Test: `tools/test-cannes-spots.cjs`

**Interfaces:**
- Consumes: `it.rod`, `it.spot`, `it.zone`, `state.rods`, `COMMON_FISH`, `loot(..., rod)`
- Produces:
  - `zoneItOk(it)` : aussi faux si `it.kind==='fish' && it.zone && !state.bridges[it.zone]`
  - `startFishing(it)` : île 1 exige `state.rods[it.rod||'petite']` sinon toast ; pose `fishing.rod`, `fishing.spot` ; teleporte + bobber à `spot`
  - `fishTick` / `reel` utilisent `fishing.spot` (fallback `W().fishSpot`)
  - Communs : `weighted(COMMON_FISH[fishing.rod || 'petite'])` ; île 2 garde la table actuelle (pas de rod)
  - Rare : `flows.actionQ({ kind:'fish', rod: fishing.rod || 'petite', ...question('fish') })`

Toast copy exacte selon rod :

```js
const ROD_NEED = {
  petite: 'Il te faut la canne de base — passe voir Gaston.',
  moyenne: 'Il te faut la canne moyenne — passe voir Gaston.',
  grosse: 'Il te faut la canne grosse — passe voir Gaston.',
};
```

- [ ] **Step 1: Write the failing test**

Ensure bridges are open (from Task 4) or reopen them. Helper to fish one catch:

```js
async function fishOnce(p, dockId, { rare = false, rodState } = {}) {
  return p.evaluate(async ({ dockId, rare, rodState }) => {
    if (rodState) __mv.state.rods = rodState;
    __mv.state.bag = [];
    __mv.force.rare = rare;
    const it = __mv.world.interactables.find(i => i.id === dockId);
    __mv.tp(it.pos.x, it.pos.z + 0.2);
    __mv.G.interact(it);
    for (let n = 0; n < 80 && __mv.world.bobber.visible; n++) {
      await __mv.waitT(0.2);
      __mv.G.interact(it); // reel when bite
    }
    return { bag: __mv.state.bag.slice(), bobber: __mv.world.bobber.visible };
  }, { dockId, rare, rodState });
}
```

Sans canne moyenne :

```js
const noRod = await page.evaluate(() => {
  const msgs = [];
  const ui = __mv.G.ui;
  const old = ui.toast.bind(ui);
  ui.toast = (m, k) => { msgs.push(String(m)); old(m, k); };
  __mv.state.rods = { petite: true, moyenne: false, grosse: false };
  __mv.world.openBridge('bleuets');
  const it = __mv.world.interactables.find(i => i.id === 'quai_lise');
  __mv.tp(it.pos.x, it.pos.z + 0.2);
  __mv.G.interact(it);
  ui.toast = old;
  return { msgs, bobber: __mv.world.bobber.visible };
});
ok('e sans canne moyenne : toast Gaston, pas de pêche',
  noRod.msgs.some(m => /canne moyenne/i.test(m)) && noRod.bobber === false, JSON.stringify(noRod));
```

Avec canne moyenne → poisson moyen ; quai → petit ; Lionel + grosse → gros :

```js
const gotM = await fishOnce(p, 'quai_lise', { rodState: { petite: true, moyenne: true, grosse: false } });
ok('e Lise + moyenne → meunier|crapet|brochet',
  gotM.bag.some(k => ['meunier', 'crapet', 'brochet'].includes(k)), JSON.stringify(gotM));

const gotP = await fishOnce(p, 'quai', { rodState: { petite: true, moyenne: false, grosse: false } });
ok('e quai + petite → perchaude|achigan|dore|truite',
  gotP.bag.some(k => ['perchaude', 'achigan', 'dore', 'truite'].includes(k)), JSON.stringify(gotP));

await page.evaluate(() => __mv.world.openBridge('erables'));
const gotG = await fishOnce(p, 'quai_lionel', { rodState: { petite: true, moyenne: true, grosse: true } });
ok('e Lionel + grosse → laquaiche|coregone|barbotte',
  gotG.bag.some(k => ['laquaiche', 'coregone', 'barbotte'].includes(k)), JSON.stringify(gotG));
```

- [ ] **Step 2: Run — expect FAIL** (toast / mauvais pool)

- [ ] **Step 3: Implement main.js**

1. Import `COMMON_FISH` from `./actionq.js` (alongside existing imports).

2. Update `zoneItOk`:

```js
function zoneItOk(it) {
  if ((it.kind === 'sap' && !state.bridges.erables) || (it.kind === 'berry' && !state.bridges.bleuets)) return false;
  if (it.kind === 'fish' && it.zone && !state.bridges[it.zone]) return false;
  return true;
}
```

3. Replace fishing block:

```js
const fishing = { state: null, t: 0, rare: false, rod: null, spot: null };
const ROD_NEED = {
  petite: 'Il te faut la canne de base — passe voir Gaston.',
  moyenne: 'Il te faut la canne moyenne — passe voir Gaston.',
  grosse: 'Il te faut la canne grosse — passe voir Gaston.',
};
function weighted(table) { /* unchanged */ }
function startFishing(it) {
  const isle2 = state.island === 2;
  const rod = isle2 ? null : (it?.rod || 'petite');
  if (!isle2) {
    if (!state.rods) state.rods = { petite: true, moyenne: false, grosse: false };
    if (!state.rods[rod]) { ui.toast(ROD_NEED[rod] || ROD_NEED.petite); return; }
  }
  const s = stats('canne', state.tools.canne);
  fishing.state = 'wait';
  fishing.t = s.wait[0] + rng.next() * (s.wait[1] - s.wait[0]);
  fishing.rod = rod;
  const f = (it && it.spot) || W().fishSpot;
  fishing.spot = f;
  player.teleport(f.x, f.z); player.face(f.fx, f.fz); hold('canne', 0);
  const b = W().bobber; b.position.set(f.fx, -0.55, f.fz); b.visible = true; audio.sfx('splash');
  fishing.bait = useBait(state);
  ui.toast(fishing.bait ? `🪱 Appât rare de Bernard accroché! Un gros poisson s’en vient… (il t’en reste ${state.appats})` : '🎣 Attends que ça morde… pis appuie au bon moment!');
}
function stopFishing() {
  fishing.state = null; fishing.rare = false; fishing.bait = false; fishing.rod = null; fishing.spot = null;
  W().bobber.visible = false; player.tool.clear();
}
function fishTick(dt) {
  if (!fishing.state) return;
  const f = fishing.spot || W().fishSpot;
  if (Math.hypot(player.pos.x - f.x, player.pos.z - f.z) > 1.2) { stopFishing(); return; }
  // … reste identique (bobber bobbing, rare force, etc.)
}
function reel() {
  const s = stats('canne', state.tools.canne);
  if (fishing.state === 'wait') { ui.toast('Trop tôt! Attends que le bouchon cale.'); stopFishing(); return; }
  const lvl = state.tools.canne;
  const rod = fishing.rod;
  if (fishing.rare) {
    const r = rod || 'petite';
    stopFishing(); audio.sfx('catch');
    flows.actionQ({ kind: 'fish', rod: r, ...question('fish') });
    return;
  }
  let kind;
  if (state.island === 2) {
    kind = weighted([['truite', 40], ['achigan', 25], ['dore', 20 + lvl * 4], ['perchaude', 15]]);
  } else {
    const base = COMMON_FISH[rod || 'petite'] || COMMON_FISH.petite;
    const table = (rod === 'petite' || !rod)
      ? [['perchaude', 50], ['achigan', 30], ['dore', 12 + lvl * 4], ['truite', 4 + lvl * 5]]
      : base;
    kind = weighted(table);
  }
  stopFishing(); if (!bagAdd(kind)) return;
  state.journal.fish++; audio.sfx('catch'); ui.toast(`${ITEMS[kind][0]} Une belle prise : ${ITEMS[kind][1]}!`); G.save();
}
```

4. `case 'fish': startFishing(it); break;`

- [ ] **Step 4: Run full test file — expect PASS**

```bash
node tools/test-cannes-spots.cjs 8653
```

- [ ] **Step 5: Commit**

```bash
git add js/main.js tools/test-cannes-spots.cjs
git commit -m "feat(cannes): gating canne/pont + pêche multi-spot + pools"
```

---

### Task 6: Rare win moyen/gros + régression île 2

**Files:**
- Test only (code already wired in Tasks 2–5): `tools/test-cannes-spots.cjs`

**Interfaces:**
- Consumes: `force.rare`, `force.q`, `typeAnswer`, `loot(..., rod)`

- [ ] **Step 1: Write integration asserts**

Copy `typeAnswer` helper from `tools/test-cabane-bleuet.cjs`.

```js
const winM = await page.evaluate(async () => {
  __mv.state.rods = { petite: true, moyenne: true, grosse: true };
  __mv.state.bag = [];
  __mv.state.rares = {};
  __mv.flows.actionQ({ kind: 'fish', rod: 'moyenne', skill: 'qc_s1_ari_01', d: 1, stretch: true });
  return true;
});
await typeAnswer(p);
await page.click('#panel .btn.primary'); // Continuer
const afterM = await page.evaluate(() => ({ bag: __mv.state.bag.slice(), rares: { ...__mv.state.rares } }));
ok('f rare moyenne → touladi',
  afterM.bag.includes('touladi') || afterM.rares.touladi >= 1, JSON.stringify(afterM));

await page.evaluate(() => {
  __mv.state.bag = [];
  __mv.state.rares = {};
  __mv.flows.actionQ({ kind: 'fish', rod: 'grosse', skill: 'qc_s1_ari_01', d: 2, stretch: true });
});
await typeAnswer(p);
await page.click('#panel .btn.primary');
const afterG = await page.evaluate(() => ({ bag: __mv.state.bag.slice(), rares: { ...__mv.state.rares } }));
ok('f rare grosse → esturgeon_n',
  afterG.bag.includes('esturgeon_n') || afterG.rares.esturgeon_n >= 1, JSON.stringify(afterG));

// Île 2 inchangée : loot fish isle 2 ignore rod
const i2 = await page.evaluate(async () => {
  const aq = await import('./js/actionq.js');
  return {
    a: aq.loot('fish', 0, 2, 'petite'),
    b: aq.loot('fish', 1, 2, 'moyenne'),
    c: aq.loot('fish', 2, 2, 'grosse'),
  };
});
ok('f île 2 RARE_FISH2 inchangé',
  i2.a === 'gros_dore' && i2.b === 'saumon' && i2.c === 'bar', JSON.stringify(i2));
```

- [ ] **Step 2: Run — expect PASS**

- [ ] **Step 3: Commit**

```bash
git add tools/test-cannes-spots.cjs
git commit -m "test(cannes): rares moyens/gros + régression île 2"
```

---

### Task 7: GAME.md

**Files:**
- Modify: `GAME.md`

- [ ] **Step 1: Update actions table**

Replace the single « Pêcher | bout du quai | … » row with three rows:

```markdown
| Pêcher (petite canne) | quai de l’île 1 | Petits poissons (perchaude, achigan, doré, truite). Touche rare → omble / maskinongé / esturgeon |
| Pêcher (canne moyenne) | quai de Lise (après pont des bleuets) | Poissons moyens. Il faut la canne moyenne (75 $ chez Gaston). Touche rare → ouananiche / touladi / anguille |
| Pêcher (canne grosse) | quai de Lionel (après pont des érables) | Gros poissons. Il faut la canne grosse (150 $ chez Gaston). Touche rare → marigane / omble chevalier / esturgeon noir |
```

After the bridges paragraph (~line 49), add:

```markdown
Chez **Gaston**, en plus d’améliorer les outils (questions maths), on achète des **cannes en cash** (sans taxes) : canne de base offerte dès le départ, canne moyenne **75,00 $**, canne grosse **150,00 $**. Chaque canne débloque son spot. Les **niveaux** de l’outil canne (vitesse de touche, rares) restent et s’appliquent à tous les spots. Le quai de Bernard sur l’île 2 ne change pas.
```

In « Touche rare à la pêche », note that le butin rare dépend de la canne / du spot (pas seulement omble/maskinongé/esturgeon).

In « État et sauvegarde », add:

```markdown
- `rods{ petite, moyenne, grosse }` (booléens ; `petite: true` par défaut si absent à la normalisation)
```

- [ ] **Step 2: Commit**

```bash
git add GAME.md
git commit -m "docs(cannes): GAME.md cannes, spots et rods"
```

---

## Self-review (spec coverage)

| Spec requirement | Task |
| --- | --- |
| Petite gratuite owned ; moyenne 75 $ ; grosse 150 $ ; cash Gaston sans taxes | T1, T3 |
| Spots quai / Lise / Lionel ; canne requise ; pont requis ; toast | T4, T5 |
| Poissons petit/moyen/gros + rares ; SELL/ITEMS | T2, T5, T6 |
| Niveaux outil canne inchangés | T3 (section séparée) / T5 (stats('canne') inchangé) |
| Bernard / île 2 inchangé | T5 (branche island===2), T6 |
| Normalize save sans rods | T1 |
| Tests Playwright listés dans spec | T1–T6 |
| GAME.md | T7 |
| Hors scope (pas Thérèse, pas 4e spot, pas remplacer niveaux) | respecté — aucune tâche contraire |

**Placeholder scan:** aucun TBD / « similar to Task N » sans code.  
**Type consistency:** `rod` ids `petite|moyenne|grosse` ; `state.rods` ; `it.rod` / `it.spot` / `it.zone` ; `loot(..., rod)` ; `q.rod` ; `COMMON_FISH` / `RARE_FISH_M` / `RARE_FISH_G` ; prix 7500 / 15000 cents.

