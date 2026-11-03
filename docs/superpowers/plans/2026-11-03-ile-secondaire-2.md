# Île de Secondaire 2 — plan d’implémentation

> **Pour l’agent :** exécuter tâche par tâche, en ligne (executing-plans). Commiter après chaque tâche. **Ne pas pousser.**

**Goal :** ajouter l’île de Secondaire 2 (traversier, monde, villageois, 12 compétences S2, niveau 4, phare, kiosque, carnet S2, sauvegarde v3).
**Architecture :** modules ES sans build. Maths pures dans `js/math/` (testées en Node), logique pure dans `progression.js`/`actionq.js`/`save.js`/`phare.js`, rendu de l’île 2 dans `js/island2.js` construit paresseusement, bascule de visibilité des deux `root`.
**Tech stack :** three.js r170 (vendor), Playwright (SwiftShader) pour l’E2E, Node pour les tests unitaires.
**Spec :** `docs/superpowers/specs/2026-11-03-ile-secondaire-2.md`.

## Contraintes globales
- Français québécois partout ; personnages fictifs ; aucun stéréotype.
- Identifiants `qc_s2_*` ; `SKILLS` reste la liste S1 (22) ; `SKILLS2` (12) ; `ALL_SKILLS`.
- Vérification exacte (frac.js) ; π via `pi: true` ; tolérances explicites seulement (taxes au cent ±1 ¢).
- Sauvegarde : clé `vdm.save.v1`, `v: 3`, v1/v2 acceptées.
- Tests : `node tools/test-math.mjs` ; `node tools/test.cjs 8653` ; `node tools/test-s2.cjs 8653`.

## Tâche 1 — Compétences S2, vérificateur π, générateurs
**Fichiers :** `js/math/skills.js` (SKILLS2, EDGES S2, `ALL_SKILLS`, `shortId` S1/S2, `sec1Prereqs`), `js/math/check.js` (π), `js/math/gen2.js` (nouveau, `GEN2`), `js/math/gen.js` (`makeExercise` cherche dans GEN puis GEN2 ; `canonical` gère π), `tools/test-gen2.mjs` (nouveau), `tools/test-math.mjs` (charge test-gen2, tests π).
**Interfaces :**
- `checkField(input, { value, pi: true, places })` → ok si l’entrée contient π et que le coefficient = value, ou si |x − value·3,14| ou |x − value·π| ≤ 0,5·10^−places.
- `GEN2[id](r, d)` → `{ prompt, answer, hints[3], data, figure? }` (figure = SVG pour les angles).
**Étapes :** écrire les tests π dans test-math (échec) → coder check.js → écrire test-gen2 (oracles indépendants, 200 graines × 3 niveaux) → coder gen2.js → `node tools/test-math.mjs` vert → commit « S2 : compétences, générateurs, vérificateur π ».

## Tâche 2 — Progression niveau 4, sauvegarde v3, phare/kiosque purs
**Fichiers :** `js/progression.js` (TOOLS[].s2, STATS/BENEFITS niveau 4, `stats` 0..4, `nextUpgrade(state, tool)` niveau 4 avec `island2: true`, `warmupFor` → préalable S1, `defiChoices(state, level)`, `masteryCount(state, list)`, `canFerry`, `ferryProgress`), `js/save.js` (v3), `js/actionq.js` (`pickQuestion(..., isle)`, `RARE_FISH2`, `loot(kind, d, isle)`, π dans `timeFor`), `js/phare.js` (nouveau : `phareSteps(seed)`), `js/shop.js` (prix des nouvelles prises), `tools/test-logic.mjs` (tests).
**Étapes :** tests d’abord (niveau 4 seulement via S2, canFerry, v1/v2→v3, phareSteps exacts, pickQuestion île 2 ⊂ S2) → code → vert → commit.

## Tâche 3 — Monde : quai du traversier sur l’île 1, île 2 paresseuse, villageois
**Fichiers :** `js/world.js` (lac/ciel hors du root, quai + traversier ouest, `FERRY`, walkable du quai), `js/island2.js` (nouveau : `buildIsland2(scene, G)` → `{ root, update, setNight, interactables, walkable, obstacles, bobber, butterflies: [], beds: [], phare: { lit, light } , repairPhare() }`), `js/villagers.js` (Rosalie, Bernard ; `makeVillagers(parent, ids)`), `js/main.js` (île active `W`, villageois actifs, `travel(n)`, pêche par `spot`, appât rare, crochets `__mv.unlockFerry/travel/isle/isle2`).
**Étapes :** coder → capture rapide de l’île 2 et du quai → FPS île 1 vs île 2 → commit.

## Tâche 4 — Parcours d’interface S2
**Fichiers :** `js/flows.js` (`F.ferry`, atelier de Rosalie via `F.workbench({ host })`, `F.phare`, `F.kiosk`, `F.defi` S2, questions d’action île 2, figure SVG, pavé avec π, carnet à onglets), `js/ui.js` (`numpad(onKey, { pi })`, fondu), `style.css`, `index.html` (rien ou presque).
**Étapes :** coder → vérif manuelle Playwright → commit.

## Tâche 5 — E2E S2, captures, docs
**Fichiers :** `tools/test-s2.cjs` (nouveau), `tools/test.cjs` (v1 → v3), `README.md`, `GAME.md`, `../PROGRESS.md`.
**Étapes :** captures « avant » depuis main (`shots/avant-s2/`) → test-s2 bureau + mobile vert → test.cjs complet vert → test-math vert → docs → commit.

## Auto-revue
- Couverture spec : traversier (T3/T4/T5), île 2 + perf (T3), 12 compétences + π + préalables + réchauffement S1 (T1/T2), carnet S2 (T4), niveau 4 / poissons / érables / phare / kiosque (T2–T4), sauvegarde v3 (T2), docs + tests + captures (T5). ✔
- Noms cohérents : `SKILLS2`, `GEN2`, `canFerry`, `phareSteps`, `buildIsland2`, `travel`. ✔
