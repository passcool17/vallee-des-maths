# Vallée des Maths — étape 1 : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une île 3D jouet jouable au navigateur où l'on améliore 5 outils en réussissant des exercices de maths de sec 1 (MEQ), avec un magasin à taxes, un carnet et une sauvegarde locale.

**Architecture:** Modules ES statiques autour d'un état de jeu unique `G` (main.js). La partie maths (`js/math/*`, `progression.js`, `shop.js`) est pure et testable sous Node sans navigateur ; le rendu (`world`, `player`, `villagers`) et l'interface (`ui`, `input`, `audio`) la consomment. Un crochet `window.__mv` expose l'état et une attente en temps de jeu pour Playwright.

**Tech Stack:** three.js r170 vendored, JavaScript ES2022, WebAudio, localStorage ; tests Node 24 + Playwright 1.63 (chrome-headless-shell, SwiftShader).

## Global Constraints
- Aucun build, aucune dépendance runtime autre que `vendor/three.module.min.js` ; chemins relatifs ; `.nojekyll`.
- Textes en français québécois ; personnages fictifs (Gaston le castor, Thérèse l'orignale, Flocon le harfang) ; aucun contenu d'Argon Valley.
- Ids de compétences `qc_s1_<ari|pro|alg|prb|sta|geo>_<nn>` ; 22 compétences.
- Amélioration = 3 bonnes réponses ; échauffement après 2 erreurs de suite ; aucune pénalité.
- TPS 5 %, TVQ 9,975 % ; argent stocké en cents entiers.
- Playwright : un navigateur à la fois ; flags `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`.
- Ne rien pousser.

---

### Task 1: Noyau maths (rng, fractions, vérificateur)
**Files:** Create `js/math/rng.js`, `js/math/frac.js`, `js/math/check.js`; Test `tools/test-math.mjs` (section « vérificateur »).
**Interfaces — Produces:**
- `rng.js`: `makeRng(seed:number|string) → {next():float∈[0,1), int(a,b):int, pick(arr), shuffle(arr), chance(p):bool}`; `hashSeed(...parts) → uint32`.
- `frac.js`: `F(n,d=1) → {n:BigInt-free int, d:int>0}` réduite ; `add, sub, mul, div, eq, cmp, toNumber, fmt(f, {comma:true}) → "3/4" | "2,5" | "-3"`; `fromDecimalString("2.5") → F`.
- `check.js`: `parseAnswer(str) → F | null` (accepte `-`/`−`, `,`/`.`, `a/b`, `-a/b`, `%`, `$`, espaces) ; `checkField(input, spec) → {ok, near?, msg?}` où `spec = {value:F, tol?:number, irreducible?:bool}` ; `checkAnswer(inputs:string[]|number, answer) → {ok, near?, msg?}` où `answer = {kind:'num', fields:[spec…]} | {kind:'choice', choices:string[], correct:int}`.
- [ ] Écrire les tests du vérificateur (6/8≡3/4, 2,5≡2.5≡5/2, −3≡-3, 0,75≡3/4, « 3 / 4 », « 25 % », « 12,50 $ », null pour « abc », irréductible → near).
- [ ] Implémenter, `node tools/test-math.mjs` → PASS, commit `feat(math): rng, fractions exactes, vérificateur`.

### Task 2: Taxonomie et 22 générateurs
**Files:** Create `js/math/skills.js`, `js/math/gen.js`; extend `tools/test-math.mjs` with oracles.
**Interfaces — Produces:**
- `skills.js`: `SKILLS: Array<{id, nom, domaine:'Arithmétique'|'Proportionnalité'|'Algèbre'|'Probabilités'|'Statistique'|'Géométrie', type, description, criteres:string[], pda:string}>`; `EDGES: Array<{skill, prereq, strength:'hard'|'soft'}>`; `skillById(id)`; `prereqsOf(id, strength?) → id[]`.
- `gen.js`: `GEN[id](rng, d) → {prompt:string, answer, hints:[string,string,string], data:object}`; `makeExercise(id, seed, d) → exercise & {id, seed, d}`.
- Oracles dans le test : pour chaque id, `ORACLE[id](data) → F | int(choix) | [F,F]`, calculés indépendamment (p. ex. `Function` sur l'expression pour ari_01/02, formule directe ailleurs).
- [ ] Tests : 22 ids × d∈{0,1,2} × 200 graines : réponse canonique OK ; oracle == réponse ; forme non réduite (×2/×2) acceptée sauf champ irréductible (near) ; point au lieu de virgule accepté ; valeur+1 refusée ; choix distincts, une seule bonne réponse ; énoncé sans `NaN`/`undefined`.
- [ ] Implémenter, tests PASS, commit `feat(math): taxonomie sec 1 (22 compétences) + générateurs seedés`.

### Task 3: Progression, magasin, sauvegarde (logique pure)
**Files:** Create `js/progression.js`, `js/shop.js`, `js/save.js`; extend `tools/test-math.mjs`.
**Interfaces — Produces:**
- `progression.js`: `TOOLS = [{id:'canne'|'arrosoir'|'filet'|'pelle'|'sac', nom, emoji, skills:[id1,id2,id3], benefits:[str×4]}]`; `isMastered(state,id)`; `isUnlocked(state,id)` (prérequis durs maîtrisés) ; `nextUpgrade(state, toolId) → {skill, level, unlocked, missing:id[]} | null`; `recordAnswer(state, id, ok, ctx:'upgrade'|'defi'|'echauffement') → {count, done}`; `warmupFor(id) → {skill, d}`; `stats(toolId, level)` (valeurs de jeu).
- `shop.js`: `CATALOG`, `quote(item, rng) → {item, prixCents, rabais, baseCents, tpsCents, tvqCents, totalCents, altTotalCents, hints}`; `checkTotal(input, quote) → {ok,msg?}`.
- `save.js`: `newState(seed)`, `load() → state|null`, `save(state)`, `reset()`.
- [ ] Tests : prérequis bloquent ; 3 bonnes réponses montent l'outil ; taxes (24,00 $ → 27,59 $ ; 120 $ −25 % → 103,48 $) ; ordre d'arrondi alternatif accepté.
- [ ] Commit `feat: progression des outils, magasin à taxes, sauvegarde`.

### Task 4: Monde 3D
**Files:** Create `index.html`, `style.css`, `favicon.svg`, `js/world.js`, `js/main.js` (boucle minimale).
**Interfaces — Produces:** `buildWorld(scene, G) → {update(dt,G), setTime(h), interactables:[{id, kind, pos:Vector3, r, label(G)}], walkable(x,z,G)→bool, groundAt(), placeDecor(itemId), openBridge(id), lake, dockEnd, curve}`.
- [ ] Île, eau, lac, quai, érables, établi, magasin général (enseigne canvas), plates-bandes, taches, îlots + ponts cachés, lanternes ; jour/nuit 4 palettes interpolées ; courbure via `onBeforeCompile`.
- [ ] Smoke Playwright : 0 erreur, capture. Commit.

### Task 5: Joueur, villageois, entrées
**Files:** Create `js/player.js`, `js/villagers.js`, `js/input.js`.
**Interfaces:** `makePlayer(scene) → {obj, pos, update(dt, move:{x,z,run}, world, G)}`; `makeVillagers(scene) → {list:[{id,nom,obj,pos,lines[]}], update(dt,G)}`; `makeInput(canvas, camera, world) → {move(), consumeAct(), consumeKey(code), clickTarget}` (clavier par `code`, joystick, tap au sol).
- [ ] Commit `feat: joueur, villageois, contrôles clavier/clic/joystick`.

### Task 6: Interface (HUD, dialogues, établi, exercice + pavé, indices, magasin, carnet) et audio
**Files:** Create `js/ui.js`, `js/audio.js`; modify `js/main.js`, `style.css`.
- [ ] Actions de jeu (secouer, pêcher, filet, creuser, arroser, vendre), panneaux, pavé numérique, Flocon (échauffement + indices), magasin, carnet, son.
- [ ] Commit.

### Task 7: Vérification bout en bout + docs
**Files:** Create `tools/test.cjs`, `README.md`, `GAME.md`.
- [ ] Parcours scripté desktop puis mobile : dialogue, établi, 2 outils améliorés par vraies entrées (pavé), 2 erreurs → indice/échauffement, achat au magasin, carnet ; chevauchements 390×844 ; FPS ; 0 erreur ; captures.
- [ ] Commit `test: parcours Playwright + docs`.

## Self-review
Couverture : monde (T4), villageois/contrôles (T5), boucle/établi/magasin/carnet/audio (T6), maths (T1–T2), progression/sauvegarde (T3), vérif + docs (T7), CI/.nojekyll (squelette). Noms cohérents : `checkAnswer`, `makeExercise`, `nextUpgrade`, `recordAnswer`, `quote`, `checkTotal`.
Écart assumé : le code complet des tâches 4–6 (rendu, UI) n'est pas recopié dans ce plan ; les interfaces ci-dessus font foi et les tests de T7 vérifient le comportement.
