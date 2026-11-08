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
- Placement hors des chemins, des portes et des zones d'interaction ; test de collision : le joueur peut toujours atteindre chaque PNJ, chaque bâtiment et chaque quai depuis le spawn.
- Flammes = sprites émissifs, sans nouvelle vraie lumière. Géométries fusionnées ou instanciées. Le budget en appels de dessin sera mesuré au build (avant/après, bureau et mobile) ; aucun chiffre n'est fixé d'avance.

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
- `normalize` le complète par défaut (tout à false) ; une valeur invalide est remplacée par la valeur par défaut, et les autres champs restent inchangés.
- La progression des défis reprend après un rechargement. Les bougies affichées sont calculées à partir des défis (5/4/4), pas stockées.
- Argent, outils, ponts, cannes, quais, stats et animaux sont identiques à l'octet près avant et après (test).

## Chapeau (hors date)
`chapeau` reste acquis pour toujours. Il est porté par défaut (`porte: true` au déblocage) même sans fête active. Une case « Chapeau de fête de Charlie » dans la section 🐾 du carnet permet de l'enlever ou de le remettre.

## Hors périmètre
Île 2, Lionel et Lise, ponts, traversier, boutique, musique, nouveaux sons, autres bots et branches locales non publiées.

## Tests
- Nouveau `tools/test-fete.cjs` (Playwright, comme les autres) :
  - activation date-mock 8 nov. Toronto vs 9 nov. ; lien `?fete=camille13` un autre jour ; pas de bascule en cours de partie ;
  - les 3 défis, avec bonnes réponses, erreurs, indice et « Voir la réponse » ; reprise après rechargement à 1/3 et 2/3 ;
  - souffle, chapeau persistant hors date, interrupteur dans le carnet ;
  - migration : vieilles sauvegardes v1 à v5 sans `fete13` → aucune perte (comparaison champ par champ) ; `fete13` corrompu → défaut ;
  - accessibilité : chemins vers PNJ, bâtiments et quais ; 0 erreur JS.
- Relancer tous les tests existants (test-math, test.cjs, test-s2, musique, animaux, vie, cannes-spots, caméra, sons) et rapporter les sorties réelles. Les anciens « PASS » de PROGRESS.md ne valent pas preuve.
- Contrôle visuel au navigateur : bureau, 390×844 et 360×800 ; captures dans shots/fete/ ; appels de dessin mesurés avant/après.

## Déploiement
Commits sur feat/fete-camille13 seulement, puis poussée de cette branche et PR vers main. Pas de fusion sans l'accord de Pascal. Après la fusion : lien de test `https://passcool17.github.io/vallee-des-maths/?fete=camille13&v=<sha>`.
Risques : l'ouverture de la PR a déjà été bloquée une fois (Pascal devra peut-être cliquer « Create pull request ») ; le cache de Pages ; la fenêtre est courte pour aujourd'hui.
