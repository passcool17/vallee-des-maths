# Cabane à sucre + Bleuetière Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplir la Colline des Érables (nord) et la Pointe-aux-Bleuets (est) avec Lionel l’orignal, Lise la renarde, une action sève et une action bleuet qui déclenchent des questions comme l’érable / la pêche.

**Architecture:** Miroir des patterns existants : nouveaux interactables `kind: 'sap'` et `kind: 'berry'` dans `world.js`, deux villageois dans `villagers.js`, branches dans `main.js` + `flows.actionQ` / `actionq.js`, items + prix dans `shop.js` / labels `flows.js`, sons dans `sons.js`. Ponts inchangés (60 $ / 90 $).

**Tech Stack:** Vanilla JS ES modules, three.js vendored, Puppeteer tests (`tools/*.cjs`), GitHub Pages.

## Global Constraints

- Français québécois cozy ; personnages fictifs (Lionel orignal, Lise renarde).
- Ponts restent payants ; zones inactives / cachées tant que `state.bridges.erables` / `bleuets` est faux.
- Questions pendant l’action seulement ; bouton « Laisser filer » ; aucune pénalité.
- Performant Samsung S20 : fumée / densité plants respectent `fxQ()` de `joli.js`.
- Ne jamais push `main` ; branche `feat/cabane-bleuetiere` ; Pascal dit « go » / « Oui, publie » pour publier.
- Photos / références réelles hors dépôt.

## File map

| File | Role |
| --- | --- |
| `js/world.js` | Cabane, chaudières (`sap`), plants (`berry`), placement Lionel/Lise, gating pont |
| `js/villagers.js` | Modèles + lignes Lionel / Lise |
| `js/actionq.js` | Pools de skills pour `sap` / `berry` |
| `js/flows.js` | Textes ACTION, labels butin, carnet rares |
| `js/shop.js` | Prix barquette / confitures |
| `js/main.js` | Handlers interact + chance question |
| `js/sons.js` | Pitchs Lionel / Lise + SFX légers |
| `js/save.js` | Seulement si nouveau champ rétrocompatible (éviter si possible) |
| `GAME.md` | Documenter les deux coins |
| `tools/test-cabane-bleuet.cjs` | Tests headless |
| `tools/shots-cabane.cjs` | Screenshots avant/après |

---

### Task 1: Items, skills pools, textes ACTION

**Files:**
- Modify: `js/shop.js`, `js/actionq.js`, `js/flows.js`
- Test: `tools/test-cabane-bleuet.cjs` (créé ici, étendu ensuite)

**Interfaces:**
- Produces: item ids `barquette`, `confiture`, `confiture_mamie` ; `question('sap')` / `question('berry')` ; `ACTION.sap` / `ACTION.berry` ; labels dans la table emoji de `flows.js` ; clés rares carnet

- [ ] **Step 1: Write failing test skeleton**

Create `tools/test-cabane-bleuet.cjs` that serves the game like `test-vie.cjs` / `test-animaux.cjs`, opens page, asserts module exports via `page.evaluate` after load:

```js
// tools/test-cabane-bleuet.cjs — assert after import graph is live
const shop = await page.evaluate(() => {
  // expose via window.__mv after main boots, or parse shop by evaluating buy prices from UI later
  return true;
});
```

Prefer asserting through `__mv` if already exposed; else add minimal asserts once main boots:
- `PRICES` or sell values: barquette 400, confiture 800, confiture_mamie 1400 (cents)
- Forcing `force.sap` / `force.berry` later in Task 4

Minimal first asserts (file can start as node import check if modules aren't window-exposed):

```js
import { createRequire } from 'module';
// Prefer puppeteer integration like tools/test-vie.cjs — copy its server bootstrap.
```

Copy the bootstrap from `tools/test-vie.cjs` (static server + puppeteer). First test:

```js
// After Jouer
const ok = await page.evaluate(() => {
  const f = window.__mv?.flows;
  return !!(f && typeof f.actionQ === 'function');
});
assert(ok, 'flows.actionQ disponible');
```

- [ ] **Step 2: Run test — expect fail or skip until items exist**

Run: `node tools/test-cabane-bleuet.cjs`  
Expected: FAIL until items/ACTION wired (or PASS only on flows.actionQ, then add item asserts)

- [ ] **Step 3: Add shop prices**

In `js/shop.js` next to `tire` / `sirop` / `coulee`:

```js
barquette: 400, confiture: 800, confiture_mamie: 1400,
```

- [ ] **Step 4: Add actionq pools**

In `js/actionq.js`:

```js
export const SAP_SKILLS = [/* ids proportions / volumes already in SKILLS */];
export const BERRY_SKILLS = [/* ids dénombrement / moyenne already in SKILLS */];
```

Pick real ids from `js/math/skills.js` (e.g. whatever maps to « Proportions », « Volumes / capacités », « Dénombrement », « Moyenne »). Wire in `question(kind)`:

```js
const pool = isle === 2 ? SKILLS2.map(s => s.id)
  : kind === 'maple' ? FRACTION_SKILLS
  : kind === 'sap' ? SAP_SKILLS
  : kind === 'berry' ? BERRY_SKILLS
  : SKILLS.map(s => s.id);
```

Also extend loot mapping used by `actionQ` win path (same place SIROP / fish rares are chosen) so `sap` → `['tire','sirop','coulee']` by difficulty and `berry` → `['barquette','confiture','confiture_mamie']`.

- [ ] **Step 5: Add flows labels + ACTION**

In `js/flows.js` item table:

```js
barquette: ['🫐', 'Barquette de bleuets'],
confiture: ['🫙', 'Confiture de bleuets'],
confiture_mamie: ['💜', 'Confiture de grand-mère'],
```

In ACTION map near `maple`:

```js
sap: { icon: '🪣', titre: 'La sève coule!', line: 'Lionel te passe une chaudière pleine! Une petite question de proportions ou de volumes. Tu peux aussi laisser filer.', /* loot keys via existing win path */ },
berry: { icon: '🫐', titre: 'Cueillette!', line: 'Lise te tend un panier! Une petite question de dénombrement ou de moyenne. Tu peux aussi laisser filer.', },
```

Extend `RARE_KEYS` / journal counters: reuse `sirop` journal for sap wins; add `bleuets` journal field default 0 in save if missing (rétrocompatible: `j.bleuets || 0`).

- [ ] **Step 6: Run tests**

Run: `node tools/test-cabane-bleuet.cjs`  
Expected: PASS for item/ACTION presence asserts you added

- [ ] **Step 7: Commit**

```bash
git add js/shop.js js/actionq.js js/flows.js tools/test-cabane-bleuet.cjs js/save.js
git commit -m "Cabane/bleuetière : items, pools de skills et textes ACTION"
```

---

### Task 2: Lionel + Lise (villagers)

**Files:**
- Modify: `js/villagers.js`, `js/sons.js` (pitchs), callers of `makeVillagers` in `js/main.js`
- Test: `tools/test-cabane-bleuet.cjs`

**Interfaces:**
- Consumes: `makeVillagers(parent, ids)`
- Produces: ids `lionel`, `lise` in `NOMS`, `EMOJI`, `ISLE_OF`, `LINES`, mesh builders; spawn only when bridge open (Task 3 may gate position)

- [ ] **Step 1: Failing test**

```js
const names = await page.evaluate(() => ({
  lionel: window.__mv?.villagers?.find?.(v => v.id === 'lionel')?.id,
  // or dialogue open — at minimum NOMS exposed if you attach __mv.villagerMeta
}));
```

Expose `NOMS` on `__mv` for tests if not already: in `main.js` `__mv.NOMS = NOMS`.

Assert `NOMS.lionel` and `NOMS.lise` exist.

- [ ] **Step 2: Implement villagers**

Add to `js/villagers.js`:

```js
// NOMS / EMOJI / ISLE_OF
lionel: 'Lionel l’orignal', lise: 'Lise la renarde'
// emoji 🫎 for Lionel (or distinct), 🦊 for Lise
ISLE_OF.lionel = 1; ISLE_OF.lise = 1;
```

Mesh: clone/adapt `ginette` proportions for Lionel (taller moose), fox-like for Lise (smaller, orange/white). Keep low-poly.

`LINES.lionel` / `LINES.lise`: 4–6 short cozy lines (accueil cabane / bleuetière).

`makeVillagers`: accept `'lionel'|'lise'` in ids list.

- [ ] **Step 3: Sons**

In `js/sons.js` voice table, add pitches: Lionel low slow; Lise medium-high warm.

- [ ] **Step 4: Run test + commit**

```bash
node tools/test-cabane-bleuet.cjs
git add js/villagers.js js/sons.js js/main.js
git commit -m "Villageois Lionel (orignal) et Lise (renarde)"
```

---

### Task 3: World décor + interactables `sap` / `berry`

**Files:**
- Modify: `js/world.js`
- Test: `tools/test-cabane-bleuet.cjs`

**Interfaces:**
- Produces: interactables with `kind: 'sap'|'berry'`, `zone: 'erables'|'bleuets'`, `ready` cooldown; `openBridge` already reveals zone walkability; hide or skip interactables until bridge (same as butterflies: check `G.state.bridges` in update / interaction)

- [ ] **Step 1: Failing test**

With cheats / save injected bridges true:

```js
await page.evaluate(() => {
  const st = window.__mv.state;
  st.bridges.erables = true; st.bridges.bleuets = true;
  window.__mv.world.openBridge('erables');
  window.__mv.world.openBridge('bleuets');
});
const kinds = await page.evaluate(() =>
  window.__mv.world.interactables.map(i => i.kind));
assert(kinds.includes('sap') && kinds.includes('berry'));
```

- [ ] **Step 2: Build cabane + chaudières near `ISLANDS` erables (−4, −47)**

Procedural group: cabin box + roof, evaporator cylinder + smoke particles gated by `fxQ()`, 4–6 `sap` interactables (reuse maple trunk + silver bucket mesh already used on north maples — prefer dedicated `sap` posts around cabin). Label: `Récolter la sève`. `ready: 0`, cooldown 45 s. `zone: 'erables'`.

- [ ] **Step 3: Build bleuetière near bleuets island (~40+, check `ISLANDS` bleuets coords)**

Rows of small bush meshes (blue spheres), 4–6 `berry` interactables. Label: `Cueillir les bleuets`. Cooldown ~40 s. `zone: 'bleuets'`.

- [ ] **Step 4: Place Lionel / Lise**

Set villager home positions next to cabin / berry table when `makeVillagers` runs (pass positions from world or hardcode in villagers like Gaston). If bridge closed: either don’t add them to the active isle list, or park them far / invisible and exclude from talk prompts (`ISLE_OF` + bridge check in talk loop).

Preferred: include in `makeVillagers` always on isle 1, but `talk` / proximity disabled and mesh `visible = state.bridges.*` updated when bridge opens (hook next to `openBridge` or in `main` loop).

- [ ] **Step 5: Run test + commit**

```bash
node tools/test-cabane-bleuet.cjs
git add js/world.js js/villagers.js js/main.js
git commit -m "Monde : cabane, chaudières, bleuetière et plants"
```

---

### Task 4: Interaction handlers + question force flags

**Files:**
- Modify: `js/main.js`, `js/flows.js` (win loot path if not done), `js/actionq.js`
- Test: `tools/test-cabane-bleuet.cjs`

**Interfaces:**
- Consumes: `flows.actionQ`, `question('sap'|'berry')`
- Produces: `__mv.force.sap` / `__mv.force.berry` boolean like `force.maple`

- [ ] **Step 1: Failing test**

```js
await page.evaluate(() => { window.__mv.force.sap = true; /* teleport near sap */ });
// trigger interact
// assert overlay question title contains 'sève' or ACTION.sap.titre
```

- [ ] **Step 2: Handlers in main interact switch**

Mirror tree branch:

```js
case 'sap': {
  if (!st.bridges.erables) break;
  if (G.time < it.ready) { ui.toast('🪣 Cette chaudière se remplit. Reviens tantôt!'); break; }
  it.ready = G.time + 45; audio.sfx('shake'); // or new sfx
  // always small coins like maple shake
  const cents = 50 + rng.int(0, 100); st.money += cents; /* toast */
  const hit = 'sap' in force ? force.sap : rng.chance(MAPLE_CHANCE);
  delete force.sap;
  if (hit) waitT(0.8).then(() => { if (!ui.isOpen) flows.actionQ({ kind: 'sap', ...question('sap') }); });
  break;
}
case 'berry': {
  if (!st.bridges.bleuets) break;
  // similar with berry chance constant ~1/3, coin or bag push of plain 'bleuets' optional
  ...
}
```

On ACTION win, push loot id into `st.bag` / `st.rares` / journal (extend existing win switch on `q.kind`).

- [ ] **Step 3: Ginette sell already uses bag item prices — verify barquette etc. sell**

- [ ] **Step 4: Run full related suites**

```bash
node tools/test-cabane-bleuet.cjs
node tools/test.cjs
node tools/test-vie.cjs
node tools/test-animaux.cjs
node tools/test-sons.cjs
```

Expected: all PASS, 0 console errors

- [ ] **Step 5: Commit**

```bash
git add js/main.js js/flows.js js/actionq.js tools/test-cabane-bleuet.cjs
git commit -m "Actions sève et bleuets branchées sur actionQ"
```

---

### Task 5: GAME.md, screenshots, polish S20

**Files:**
- Modify: `GAME.md`
- Create: `tools/shots-cabane.cjs`
- Shots outside repo root ok: `/workspace/games/math-valley/shots/cabane/`

- [ ] **Step 1: Update GAME.md**

Document Lionel, Lise, ponts, actions sève/bleuet, butin, skills. Update villageois list and boucle de jeu table.

- [ ] **Step 2: Screenshots**

Script opens bridges, teleports north/east, desktop + mobile (360×780): cabane, Lionel, bleuetière, Lise, question overlay. Save under `shots/cabane/`.

- [ ] **Step 3: fxQ smoke / bush density pass**

If draw calls jump a lot on mobile tier, cut smoke and berry decorative instances.

- [ ] **Step 4: Final tests + commit**

```bash
node tools/test-cabane-bleuet.cjs && node tools/test.cjs
git add GAME.md tools/shots-cabane.cjs js/world.js
git commit -m "Docs + shots cabane/bleuetière; polish fxQ"
```

- [ ] **Step 5: Stop for Pascal**

Report branch tip sha, screenshot paths, test summary. **Do not push main.** Wait for « Je publie? » / « go ».

---

## Spec coverage check

| Spec item | Task |
| --- | --- |
| Lionel orignal nord / Lise renarde est | 2, 3 |
| Ponts payants 60/90 | unchanged; gated in 3–4 |
| Action sève + questions proportions/volumes | 1, 4 |
| Action bleuet + dénombrement/moyenne | 1, 4 |
| Butin tire/sirop/coulée + barquette/confitures | 1, 4 |
| Laisser filer / pas de pénalité | reuse actionQ |
| Sons | 2 |
| fxQ S20 | 3, 5 |
| Tests + shots + GAME.md | 1, 4, 5 |
| Hors craft / mini-jeux / île 2 | respected |

## Placeholder scan

None intentional. Skill ids for SAP_SKILLS / BERRY_SKILLS must be copied from `js/math/skills.js` at implement time (open file, pick exact `id` strings).
