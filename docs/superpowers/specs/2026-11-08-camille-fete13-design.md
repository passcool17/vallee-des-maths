# Fête de Camille — 13 ans (conception)

Statut : conception approuvée par Pascal le 2026-11-08 ; spec à valider avant le plan et le code.
Base : origin/main 46fc954. Branche isolée feat/fete-camille13 (sans cabane, bleuets ni pêche locales).

## But
Une petite surprise jouable aujourd'hui, au navigateur et sur S20 : la place de l'île 1 est décorée, 3 petits défis gratuits allument les 13 bougies d'un gâteau, puis confettis, message et chapeau de fête pour Charlie. Aucune perte de progression.

## Activation
- Événement du calendrier : actif quand la date locale America/Toronto est le 2026-11-08 (Intl.DateTimeFormat avec timeZone 'America/Toronto').
- Lien permanent : `?fete=camille13` active la fête à toute date, sans modifier l'horloge ni la date du jeu.
- La décision est prise une seule fois au chargement : aucune disparition à minuit en pleine partie. Les jours suivants, sans le lien, la fête n'apparaît pas (le chapeau reste, voir plus bas).
- Accessible dès le début d'une nouvelle partie comme d'une sauvegarde existante. Aucune condition de pont, de traversier, d'outil, de niveau ni d'argent.

## Décor (place de l'île 1, près du spawn {x:2,z:6})
- Guirlandes de fanions entre 2–3 poteaux, une table et un gâteau à 2 étages avec 13 bougies (0 à 13 allumées), une bannière « Bonne fête Camille! — 13 ans ».
- Placement hors des chemins, des portes et des zones d'interaction, vérifié au contrôle visuel (voir Tests).
- Flammes = sprites émissifs, sans nouvelle vraie lumière. Géométries fusionnées ou instanciées. Voir la section Tests pour la mesure de la performance.

## Les 3 défis (PNJ de l'île 1, déjà présents près de la place)
L'ordre est libre. Chacun s'ouvre en parlant au PNJ (une option « 🎂 Défi de fête » s'ajoute ; son dialogue habituel reste accessible). Il n'y a ni chrono ni pénalité, et rien n'est retiré ni payé.

1. Gaston le castor — 5 bougies
   « Camille a 13 ans aujourd'hui! J'ai 13 bougies et j'en plante déjà 8. Combien en manque-t-il? » Réponse : 5.
2. Thérèse l'orignale — 4 bougies
   « Je coupe le gâteau en 13 parts égales. On en mange 4. Quelle fraction du gâteau reste-t-il? » Réponse : 9/13 (fraction irréductible ; accepter 9/13).
3. Hortense la tortue — 4 bougies
   « 13 × 4 = ? Ce sont les fanions de la guirlande : 13 fanions sur chacun des 4 côtés de la place. » Réponse : 52.

Saisie : le même pavé ou clavier que les questions du jeu (fractions déjà prises en charge).
Erreur : message doux (« Presque! Essaie encore. ») et, dès la 2e erreur, un indice (1 : 13 − 8 ; 2 : 13 − 4 parts restent sur 13 ; 3 : 10×4 + 3×4). À la 3e erreur, le bouton « Voir la réponse » donne la réponse avec son explication et allume quand même les bougies. Aucun échec bloquant. Ces défis n'entrent ni dans `stats`, ni dans `mastery`, ni dans les questions adaptatives.

## Surprise finale
Quand les 13 bougies sont allumées, on s'approche du gâteau puis on souffle (bouton « Souffler les bougies 🎂 » ou touche E) :
- les flammes s'éteignent, puis environ 2 s de confettis (au plus 150 particules, réduites selon la qualité adaptative). Avec prefers-reduced-motion, pas de confettis animés : la bannière brille seulement ;
- un panneau qu'on peut fermer affiche : « Bonne fête Camille! 13 ans, 13 bougies : bravo! Charlie a un cadeau pour toi. » ;
- Charlie porte désormais un chapeau de fête conique.
Aucun son nouveau (on réutilise au besoin un son existant). Aucune autre donnée personnelle : ni année de naissance, ni nom de famille, ni lien de parenté.

## Sauvegarde
Champ optionnel `fete13` ajouté sans changer `v` (5) ni la clé `vdm.save.v1` :
`fete13: { defis: { gaston: bool, therese: bool, hortense: bool }, souffle: bool, chapeau: bool, porte: bool }`
- Les bougies affichées sont calculées depuis `defis` (5/4/4), jamais stockées. La reprise après rechargement est garantie.
- Règles de `normalize` (dans l'ordre) :
  1. `fete13` absent ou pas un objet → défaut, tout à false ; chaque clé non booléenne → false ;
  2. `souffle` vrai alors qu'un défi est faux → `souffle = false` (on ne peut pas avoir soufflé sans les 13 bougies) ;
  3. `souffle` vrai → `chapeau = true` ;
  4. `chapeau` faux → `porte = false`.
- Invariants testés : pour une sauvegarde v5 donnée, normalize(avec fete13) et normalize(sans fete13) sont identiques sur tous les champs autres que `fete13` (argent, outils, ponts, cannes, stats, animaux…). Pour les sauvegardes v1 à v4, c'est la normalisation existante qui s'applique, et c'est attendu : la référence est le résultat normalisé actuel de main, pas les données brutes. Charger puis sauvegarder une sauvegarde v5 déjà normalisée ne change aucun champ hors `fete13`.

## Chapeau (hors date)
Une fois `chapeau` acquis, il l'est pour toujours. `porte` passe à true au déblocage et Charlie le porte même sans fête active. Une case « Chapeau de fête de Charlie » dans la section 🐾 du carnet modifie seulement `porte`.

## Hors périmètre
Île 2, Lionel et Lise, ponts, traversier, boutique, musique, nouveaux sons, autres bots et branches locales non publiées.

## PNJ (vérifié sur origin/main 46fc954)
Gaston, Thérèse et Hortense sont dans `NOMS`/`ISLE_OF` (île 1) et créés sans condition dans main.js (`makeVillagers([... 'gaston','therese','flocon','hortense', ...])`). Leurs maisons sont sur l'île 1 principale, sans pont payant ni traversier. Thérèse vient du renommage Ginette → Thérèse, déjà fusionné (PR #1) ; on ne dépend d'aucune branche en attente.

## Tests et vérification
Interdit pour cette tâche : piloter un navigateur avec Playwright, CDP, Shell ou une injection JS.
- Tests Node purs (nouveau `tools/test-fete.mjs`), sur des fonctions extraites sans DOM :
  - activation : `feteActive(date, search)` → vrai le 2026-11-08 à Toronto (y compris 23 h 59 Toronto = 04 h 59 UTC le 9) ; faux le 9 ; vrai avec `?fete=camille13` ; faux avec une autre valeur ;
  - vérificateur des 3 réponses (5, 9/13, 52) ; échelle d'indice et « Voir la réponse » sur le modèle d'état des défis ;
  - `normalize` : règles 1 à 4, sauvegardes v1 à v5 sans `fete13`, `fete13` corrompu, invariants de la section Sauvegarde ;
  - données : 13 bougies = 5+4+4, le message exact, aucune autre donnée personnelle.
- Tests existants : relancer les tests Node purs (test-math.mjs, test-gen*.mjs, test-logic.mjs) et rapporter leurs sorties réelles. Les tests `.cjs` (Playwright : test.cjs, test-s2, animaux, vie, cannes-spots, caméra, sons, musique) ne sont ni lancés, ni modifiés, ni supprimés. Le rapport les marque explicitement « non exécutés ». Les « PASS » de PROGRESS.md ne valent pas preuve.
- Contrôle visuel : fait par le coordinateur, avec l'usage normal de l'ordinateur (clics et touches seulement), sur ordinateur et dans des fenêtres d'environ 390 et 360 px de large :
  - les 3 défis jouables, avec et sans erreur ;
  - le décor sans obstacle (on peut atteindre Gaston, Thérèse, Hortense, le magasin et le quai) ;
  - le rechargement à 1/3 et 2/3 ;
  - le souffle, les confettis, le message et le chapeau ;
  - une sauvegarde existante qui garde son argent visible.
  Les points qui ne peuvent pas être vérifiés ainsi sont rapportés comme non vérifiés.
- Performance : aucun chiffre n'est promis. Option : un petit encart de débug visible seulement avec `?fete=camille13&debug=1`, qui affiche i/s et appels de dessin (`renderer.info.render.calls`) pour une lecture à l'écran, sans console ni eval. Si la lecture est impossible, le rapport le dit. Règles de construction qui restent obligatoires : aucune nouvelle vraie lumière, au plus 150 confettis, géométries fusionnées.

## Déploiement
Commits sur feat/fete-camille13 seulement, puis poussée de cette branche et PR vers main. Pas de fusion sans l'accord de Pascal. Après la fusion : lien de test `https://passcool17.github.io/vallee-des-maths/?fete=camille13&v=<sha>`.
Risques : l'ouverture de la PR a déjà été bloquée une fois (Pascal devra peut-être cliquer « Create pull request ») ; le cache de Pages ; la fenêtre est courte pour aujourd'hui.
