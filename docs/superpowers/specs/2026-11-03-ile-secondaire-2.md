# Île de Secondaire 2 — spécification (approuvée par Pascal, 2026-11-03)

## But
Une 2e île, plus sauvage, où l’on pratique les 12 compétences de **secondaire 2** (PDA du MEQ) et où les outils montent au **niveau 4**. On y va en traversier depuis l’île 1. Même style jouet low-poly, mêmes 4 moments de la journée, personnages fictifs, français québécois.

## Le traversier
- Un quai **à l’ouest de l’île 1** (x −39 → −29, z ≈ 8), avec un petit traversier et une pancarte « Traversier ».
- **Verrouillé** tant que les 5 outils ne sont pas tous au niveau 2 ou plus. En interagissant, un panneau explique la condition et montre la progression (chaque outil : étoiles / 2, et « k / 5 outils prêts »).
- **Déverrouillé** : « Embarquer vers l’île de Secondaire 2 ». Une fois débloqué (`state.ferry = true`), on fait l’aller-retour quand on veut ; l’île 2 a le même quai au même endroit (« Retour à l’île de Secondaire 1 »).
- Crochet dev/QA : `?traversier=1` dans l’URL ou `__mv.unlockFerry()`.
- Transition : fondu court, le joueur arrive au bout du quai ; sauvegarde immédiate (`state.island`).

## Rendu et performance
- L’île 2 est construite **seulement au premier voyage** (ou au chargement si la sauvegarde est sur l’île 2) dans son propre `Group`.
- Une seule île est visible à la fois : `root.visible` bascule (les objets cachés ne coûtent rien au rendu). Ciel, lumières, étoiles et lac sont partagés (sortis du `root` de l’île 1).
- Conifères et rochers en `InstancedMesh` (compatibles avec le shader de courbure). Objectif : FPS de l’île 2 ≥ 75 % de celui de l’île 1 (SwiftShader).

## L’île 2
- Rayon ~28 ; **phare** rayé rouge et blanc sur une pointe rocheuse au nord-est ; **forêt de conifères** à l’ouest et au nord ; **rochers** ; une **rivière** qui part d’une crête au nord, descend en **deux petites chutes** (écume animée) et se jette au sud-est, avec une **passerelle** ; **érables rouges** (secouables) dans la clairière au centre/sud.
- **Rosalie la loutre** (gardienne du phare, ciré jaune, casquette marine) : dialogue, **atelier niveau 4**, **réparation du phare**, défis de Secondaire 2.
- **Bernard le huard** (veste de pêche) : **kiosque de pêche** avec un petit quai de pêche au sud.
- Personnages fictifs, dialogues en français québécois, aucun stéréotype.

## Les maths de secondaire 2
12 compétences `qc_s2_*` (ANALYSIS.md) : `ari_01` opérations sur les fractions · `pro_01` pourcentages et taxes · `pro_02` proportion directe et inverse · `pro_03` échelle et figures semblables · `alg_01` distributivité · `alg_04` mise en évidence simple · `alg_02` équation, inconnue des deux côtés · `alg_03` table ↔ règle · `geo_01` aire du disque et du secteur · `geo_02` aire du prisme et du cylindre · `geo_03` angles et parallèles · `prb_01` tirages avec ou sans remise.
- Générateurs seedés, 3 niveaux, 3 indices gradués, vérification exacte (fractions, virgule ou point).
- **π** : un champ `{ value: c, pi: true, places }` vaut c·π. On accepte « 12π », « 12 π », « π×12 », « 3π/4 », « pi » ; ou un nombre arrondi à la précision demandée, avec π ≈ 3,14 **ou** la vraie valeur, virgule ou point. Une touche **π** remplace « Effacer » sur le pavé pour ces exercices (au clavier : touche **P** hors questions chronométrées).
- Préalables vers le secondaire 1 (arêtes « hard ») : ari_01←ari_05 ; pro_01←ari_08 ; pro_02←pro_02(S1) ; pro_03←s2 pro_02 ; alg_01←alg_03 ; alg_04←s2 alg_01 ; alg_02←alg_04 ; alg_03←alg_01 ; geo_01←geo_04 ; geo_02←geo_03 ; geo_03←geo_01 ; prb_01←prb_02.
- **Réchauffement** après 2 erreurs : on propose toujours un préalable de **secondaire 1** (on remonte la chaîne si le préalable direct est de secondaire 2).
- Carnet : onglets **Secondaire 1 / Secondaire 2** (le 2e montre les 12 compétences, l’état du phare et les appâts).

## Récompenses
- **Niveau 4** des outils, seulement à l’atelier de Rosalie, avec une compétence de secondaire 2 par outil : canne ← pro_02, arrosoir ← geo_01, filet ← prb_01, pelle ← alg_02, sac ← ari_01. L’établi de Gaston affiche « Niveau 4 : à l’atelier de Rosalie ».
- Stats niveau 4 : canne attente 1,5–2,5 s, 2,4 s pour ferrer, ~46 % de touches rares ; arrosoir 4 plates-bandes à 2 $ ; filet 4 m, 100 % ; pelle chance 4 ; sac 30 places.
- **Pêche sur l’île 2** (quai de Bernard) : touches rares → question de secondaire 2 → **gros doré** (d0, le « doré » commun de l’île 1 existe déjà), **saumon atlantique** (d1), **bar rayé** (d2).
- **Érables rouges** : coup de sirop avec une question de secondaire 2.
- **Phare** : problème en 3 étapes (échelle du plan → aire latérale de la lanterne en vraie grandeur → aire de la lentille). Progression sauvegardée. Une fois réparé, le phare **éclaire l’île la nuit** (lumière ponctuelle + faisceau tournant + lanterne émissive).
- **Kiosque de Bernard** : un tirage par jour (de jeu) : une question de tirages avec ou sans remise ; bonne réponse = **mouche dorée** (appât rare). Un appât rare garantit une touche rare au prochain lancer (n’importe quelle île).

## Sauvegarde
- `v: 3`, même clé `vdm.save.v1`. Nouveaux champs : `island` (1|2), `ferry` (bool), `phare { step, done }`, `appats`, `kiosk { day }`. Les sauvegardes v1 et v2 se chargent sans rien perdre.

## Vérification
- Unitaires : 200 graines × 3 niveaux × 12 générateurs, oracles indépendants (force brute / flottant), formes équivalentes (π, 3,14, vraie valeur, point, fraction non réduite).
- E2E port 8653, vraies entrées, bureau + mobile 390×844 : traversier verrouillé → débloqué → aller-retour ; un exercice S2 qui donne un niveau 4 ; poisson rare île 2 ; question d’érable rouge ; phare complet et allumé la nuit ; un tirage au kiosque ; onglet Secondaire 2 ; sauvegardes v1 et v2. 0 erreur JS, pas de chevauchement mobile, FPS île 2 proche de l’île 1.
- Captures avant/après dans `shots/`.
