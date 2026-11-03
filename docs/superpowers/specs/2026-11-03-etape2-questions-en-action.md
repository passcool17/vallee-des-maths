# Étape 2 : questions pendant les actions (spec)

## But
Les maths entrent dans les gestes du quotidien de l’île, pas seulement à l’établi. Ces questions sont **facultatives**, **chronométrées avec générosité** et **récompensées**. Elles ne bloquent jamais le jeu normal.

## Déclencheurs
- **Touche rare (pêche).** Quand ça mord, il y a une chance de touche rare : 25 % avec la canne de base, puis environ 29 %, 33 % et 40 % selon le niveau de la canne. La touche rare se reconnaît (bouchon qui cale fort, message « Ça mord fort! »). Ferrer à temps ouvre la question.
  - Bonne réponse : un poisson rare selon la difficulté. Omble de fontaine en basique, maskinongé en standard, esturgeon jaune en avancé. Il va dans le sac et dans le carnet (section « Prises rares »).
  - Mauvaise réponse, temps écoulé ou « Laisser filer » : le poisson se sauve. Message gentil, aucune autre conséquence.
  - Le poisson rare ne sort plus de la pêche ordinaire. La stat `rare` de la canne alimente maintenant la chance de touche rare.
- **Érable.** Secouer un érable prêt donne toujours ses sous. Une fois sur 3 environ, un « coup de sirop » s’ajoute : une question de fractions, à partir des compétences ari_03 à ari_06.
  - Bonne réponse : tire d’érable en basique, cruchon de sirop ambré en standard, sirop de première coulée en avancé. Ça va dans le sac, ou se convertit en sous si le sac est plein.

## Choix de la question
- Les compétences pêche sont toutes les compétences **débloquées**. Pour l’érable, ce sont les compétences de fractions débloquées.
- La difficulté vient de la maîtrise : 0 bonne réponse → basique, 1 ou 2 → standard, maîtrisée → avancé. Dans 20 % des cas, on monte d’un cran (plafond : avancé).
- **Défi surprise** dans 15 % des cas : une compétence pas encore débloquée, en basique, parmi celles de la même famille pour l’érable.
- Les réponses comptent pour la maîtrise. Les bonnes font monter les points du carnet, les mauvaises ne font que compter un essai. Le réchauffement n’est jamais proposé dans une question en action.

## Chronomètre
- Durée de base : 20 s en basique, 25 s en standard, 30 s en avancé. On ajoute 5 s pour une réponse à plusieurs champs ou en fraction, et 5 s pour un défi surprise.
- Le chrono avance en **temps de jeu**. Il s’arrête quand le jeu est en pause : touche P, bouton ⏸ dans la question, ou onglet caché (pause automatique). Il ne reprend qu’avec « Reprendre ».
- Une réponse « presque » (fraction non réduite, etc.) donne un indice sans faire échouer.
- Les indices restent disponibles. Le bouton « Laisser filer », la touche Échap ou ✕ font sauter la question sans conséquence.

## Correctifs
- Un devis du magasin reste le même (même rabais) jusqu’à l’achat ou jusqu’au jour suivant (`state.day`, `state.quotes`).
- Le gain d’un érable ne s’affiche plus en notification au-dessus de la scène. Une petite pastille « +x,xx $ » sort plutôt de la puce d’argent du HUD.
- Police Nunito (variable, sous-ensemble latin, 39 Ko) fournie dans `vendor/fonts/`, avec sa licence OFL.

## Sauvegarde
La clé `vdm.save.v1` ne change pas. Le champ `v` passe à 2. Une sauvegarde v1 est normalisée au chargement :
- `rares{}`, `quotes{}` et `day: 0` sont ajoutés ;
- `journal.rare` et `journal.sirop` sont ajoutés.

## Plan
1. `js/actionq.js` (logique pure, testée en Node) et la normalisation de la sauvegarde, avec des tests.
2. Le flux `F.actionQ` (chrono, pause, passer), branché sur la pêche et les érables, plus le carnet.
3. Les correctifs : devis, pastille de gain, police.
4. Les tests Playwright de l’étape 2, les captures, les docs.
