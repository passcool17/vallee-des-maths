# Vallée des Maths (titre de travail) — spec de l'étape 1

Approuvé par Pascal le 2026-11-03. Analyse préalable : `../ANALYSIS.md`.

## But
Jeu navigateur « cozy » en français québécois : on se promène sur une petite île jouet, on secoue des érables, on pêche, on jase avec des villageois animaux, et on **améliore ses outils en réussissant des exercices de maths de secondaire 1** (PFEQ / Progression des apprentissages du MEQ). Ambiance inspirée d'Argon Valley, **code, sons, personnages et textes 100 % originaux**.

## Contraintes globales
- three.js vendored (`vendor/three.module.min.js`, MIT), modules ES, **aucun build**, fichiers statiques, chemins relatifs, `index.html` à la racine, `.nojekyll`.
- Cible : GitHub Pages `https://passcool17.github.io/vallee-des-maths/` ; `.gitlab-ci.yml` minimal pour GitLab Pages.
- Tout le texte d'interface en français québécois. Personnages fictifs seulement, rien qui cible un groupe, aucun stéréotype autochtone.
- Ne rien pousser. Commits fréquents sur `feat/etape1`.

## Monde
- Île principale ronde (r ≈ 30) avec : lac et quai (pêche), érables (secouer → sous), établi de Gaston, magasin général de Thérèse, plates-bandes (arrosoir), taches à creuser (pelle), papillons (filet).
- Deux îlots accessibles seulement après achat d'un pont : **Pointe-aux-Bleuets** (est, papillons rares) et **Colline des Érables** (nord, taches à creuser payantes, érables).
- 4 moments de la journée (matin, midi, heure dorée, nuit) qui défilent (1 journée ≈ 8 min) avec palette pastel chaude, lumière douce, ombres douces, brouillard léger, lanternes la nuit. Monde courbé par un petit décalage du vertex shader (peu coûteux).

## Villageois (fictifs)
- **Gaston le castor** — bricoleur de l'établi (améliorations).
- **Thérèse l'orignale** — tient le magasin général (achat, vente du sac).
- **Flocon le harfang** — prof sympathique : défis libres, carnet, échauffements et indices.
Chacun a 4 répliques québécoises.

## Boucle
Marcher → action contextuelle (E / bouton) : secouer un érable (sous directement dans le portefeuille), pêcher au bout du quai (attendre « Ça mord ! » puis réagir), attraper un papillon, creuser, arroser. Poissons, papillons et trouvailles vont dans le **sac** et se vendent chez Thérèse. L'argent est en dollars (« piastres »), au cent près.

## Outils (5 × 3 niveaux)
Chaque outil commence au niveau 0 (de base) et monte à 3. Monter d'un niveau = **3 bonnes réponses** à la compétence liée. Une amélioration n'est offerte que si les prérequis « durs » de sa compétence sont maîtrisés.

| Outil | Niv. 1 | Niv. 2 | Niv. 3 | Bénéfice réel |
|---|---|---|---|---|
| Canne à pêche | ari_01 | ari_02 | pro_01 | attente plus courte, fenêtre de réaction plus longue, poissons plus payants |
| Arrosoir | geo_01 | geo_02 | geo_03 | arrose plus de plates-bandes d'un coup, rapporte plus |
| Filet | prb_01 | prb_02 | sta_01 | portée plus grande, meilleure chance de capture |
| Pelle | alg_01 | alg_02 | alg_03 | trouvailles plus précieuses |
| Sac | ari_03 | ari_04 | ari_06 | capacité 4 → 8 → 12 → 20 |

Les 7 autres compétences (ari_05, ari_07, ari_08, pro_02, alg_04, geo_04, geo_05) passent par les **défis de Flocon** (payés en argent). Le magasin exerce en plus le calcul de taxes.

## Se débloquer (sans pénalité)
Après 2 erreurs de suite dans un exercice, Flocon propose : (a) un **échauffement** sur la compétence prérequise (dure, sinon molle ; sinon la même compétence en difficulté « base »), (b) des **indices gradués** (3 niveaux ; le dernier montre la démarche). Aucune perte d'argent ni de progression. Une réponse « équivalente mais pas réduite » quand on demande de réduire ne compte pas comme une erreur.

## Magasin général
Thérèse affiche un prix, parfois un rabais (10, 15, 20, 25, 30 ou 50 %), puis TPS 5 % + TVQ 9,975 %. Le joueur calcule le total au cent près (on accepte l'arrondi taxe par taxe ou global). Bonne réponse et assez d'argent → achat. Catalogue : nichoir, lanterne, massif de lupins, banc, feu de camp, chaise Adirondack, pont de la Pointe-aux-Bleuets, pont de la Colline des Érables. Le décor acheté apparaît dans le monde ; un pont ouvre son îlot. On démarre avec 25,00 $ pour pouvoir faire un premier achat tout de suite.

## Maths
22 compétences de sec 1 (ids `qc_s1_<domaine>_<nn>`), forme inspirée de cn-math-taxonomy (nœud : id, nom, domaine, type, description, critères de maîtrise, références PDA ; arêtes : prérequis dur/mou) sans copier son contenu (CC BY-NC).
Chaque compétence a un générateur JS seedé `gen(rng, d)` (d = 0 base, 1 standard, 2 avancé) qui renvoie énoncé, réponse exacte, indices et données. Vérification exacte : rationnels (`3/4` = `6/8` = `0,75` = `0.75`), virgule ou point, négatifs (`-` ou `−`), `%` et `$` tolérés, choix multiples quand c'est naturel, réponses à 2 champs (coordonnées, coefficients). Tolérance seulement quand l'énoncé demande un arrondi (π = 3,14).
Le **carnet** affiche les 22 compétences par domaine : progression /3, ★ maîtrisée, verrouillée ou non, prérequis, référence MEQ.

## Contrôles
- Clavier par `event.code` (ZQSD et WASD fonctionnent tous deux), flèches, Maj pour courir, E/Espace/Entrée pour interagir, C carnet, M son, Échap ferme.
- Clic / tap au sol pour marcher.
- Mobile : joystick virtuel à gauche, gros bouton d'action à droite (étiquette contextuelle), HUD compact pensé pour 390×844 sans chevauchement.
- Saisie : pavé numérique à l'écran (0–9, `,`, `/`, `-`, effacer, valider), clavier physique aussi ; pas de clavier système sur mobile.

## Audio
WebAudio synthétisé : nappe douce pentatonique qui suit le moment de la journée, effets (pièces, plouf, ça mord, bonne/mauvaise réponse, secouer, clic). Bouton et touche M pour couper ; démarre au premier geste.

## Sauvegarde
localStorage `vdm.save.v1` : argent (cents), niveaux d'outils, progression par compétence, sac, achats, position, heure, son. Autosauvegarde. `?fresh=1` repart à zéro ; `?seed=` fixe le hasard ; `?time=matin|midi|doree|nuit`.

## Fichiers
`js/main.js` (boot, boucle, horloge, crochet de test `window.__mv`), `world.js`, `player.js`, `villagers.js`, `input.js`, `ui.js`, `audio.js`, `progression.js`, `shop.js`, `save.js`, `math/{rng,frac,check,skills,gen}.js`.

## Vérification
- `node tools/test-math.mjs` : 22 générateurs × 3 difficultés × 200 graines ; la réponse canonique passe le vérificateur, un oracle indépendant recalcule la réponse à partir des données, les formes équivalentes passent, une mauvaise réponse échoue, les choix sont distincts avec une seule bonne réponse.
- `node tools/test.cjs [desktop|mobile]` : Playwright headless SwiftShader, un navigateur à la fois, attentes en temps de jeu ; 0 erreur JS ; parcours scripté par vraies entrées (2 outils améliorés, 1 achat) ; indices ; chevauchement HUD/panneaux en 390×844 ; FPS ; captures dans `../shots/`.

## Étape 2 (hors portée)
Questions pendant les actions (morsure à la pêche, érable secoué), île de secondaire 2.
