# Vallée des Maths : l’île de Secondaire 2

Un petit jeu 3D douillet pour pratiquer les maths de **Secondaire 1** (programme du Québec, PDA du MEQ). Tu vis sur une île low-poly, tu secoues des érables, tu pêches, tu arroses tes plates-bandes, et tu améliores tes outils chez Gaston en répondant à des questions de maths. Depuis l’étape 2, une touche rare à la pêche ou un coup de sirop à l’érable peut aussi lancer une petite question chronométrée, toujours facultative.

Nouveau : **l’île de Secondaire 2**. Quand tes 5 outils sont au niveau 2, le traversier t’amène chez Rosalie la loutre et Bernard le huard : 12 compétences de Secondaire 2, un phare à réparer en 3 étapes, des érables rouges, des poissons rares et le niveau 4 des outils.

**Jouer :** https://passcool17.github.io/vallee-des-maths/ (après publication)

## Lancer en local

Le jeu n’a pas d’étape de build. Il utilise three.js r170, fourni dans `vendor/`, chargé en modules ES. La police Nunito est aussi fournie localement (`vendor/fonts/`, licence SIL OFL 1.1 dans `OFL-Nunito.txt`).

```bash
node tools/serve.js 8653        # puis ouvrir http://localhost:8653/
```

N’importe quel serveur statique fait l’affaire. Un serveur est nécessaire parce que les modules ES ne se chargent pas en `file://`.

Paramètres d’URL utiles :

| Paramètre | Effet |
| --- | --- |
| `?fresh=1` | Nouvelle partie (efface la sauvegarde) |
| `?seed=1234` | Graine de la partie |
| `?time=matin\|midi\|doree\|nuit` | Fige l’heure de la journée |
| `?traversier` | Ouvre le traversier tout de suite (pour tester l’île 2) |

## Tests

```bash
node tools/test-math.mjs        # 139 743 vérifications : générateurs Sec 1 et Sec 2 (200 graines chacun, oracles indépendants), vérificateur (π compris), progression, niveau 4, traversier, phare, kiosque, sauvegardes v1/v2→v3
node tools/serve.js 8653 &
node tools/test.cjs 8653        # parcours Playwright de l’île 1, bureau 1280×800 puis mobile 390×844 (ONLY=desktop|mobile pour un seul)
node tools/test-s2.cjs          # parcours de l’île de Secondaire 2 (traversier, phare, kiosque, niveau 4, carnet, FPS)
node tools/test-music.cjs 8653  # musique : piste 1 sur l’île 1, piste 2 sur l’île 2, retour, pause, muet, piste introuvable
```

`tools/test.cjs` joue une vraie partie avec de vraies entrées : clavier, clic pour marcher, joystick, bouton ✋ et pavé numérique. Il améliore la canne et l’arrosoir, déclenche un réchauffement, achète un nichoir en calculant le total avec rabais, TPS et TVQ, puis pêche. Pour l’étape 2, il force des touches rares (bonne réponse, mauvaise réponse, « Laisser filer », temps écoulé), vérifie que le chrono s’arrête en pause (P, ⏸, onglet caché), répond à une question de fractions à l’érable, contrôle le carnet et recharge une vieille sauvegarde v1. Il vérifie aussi qu’il n’y a aucune erreur JS et que l’interface ne se chevauche pas. Les captures vont dans `../shots/`.

`tools/test-s2.cjs` fait la même chose sur l’île 2 : traversier fermé puis ouvert, aller-retour, kiosque de Bernard, touche rare au quai, érable rouge, exercice de Secondaire 2 avec la touche π, amélioration au niveau 4 chez Rosalie, les 3 étapes du phare et sa lumière la nuit, l’onglet Sec 2 du carnet. Il recharge aussi des sauvegardes v1 et v2, vérifie qu’on revient sur l’île 2 après un rechargement et compare les FPS des deux îles. Captures : `../shots/{d,m}-s2-*.png`.

## Structure

```
index.html  style.css  favicon.svg  .nojekyll
js/main.js         boucle, caméra, actions (érables, pêche, plates-bandes, fouilles, papillons)
js/world.js        île low-poly, monde courbé (shader), 4 moments de la journée, traversier
js/island2.js      île de Secondaire 2 (construite au premier passage) : phare, sapins, rochers, rivière et chutes, érables rouges, kiosque
js/phare.js        réparation du phare en 3 étapes (plan à l’échelle en SVG)
js/villagers.js    Gaston le castor, Ginette l’orignale, Flocon le harfang, Rosalie la loutre, Bernard le huard
js/flows.js        dialogues, établi, exercices + indices, réchauffements, questions en action, magasin, carnet
js/actionq.js      étape 2 : chance de touche rare, choix de la question et du niveau, butin, chrono (pur, testé)
js/ui.js           HUD, panneaux, pavé numérique
js/input.js        clavier (event.code), clic/tap pour marcher, joystick tactile
js/audio.js        musique de fond par île (fondu au traversier, baisse pendant les questions), effets synthétisés (WebAudio), sourdine
music/             ile1.mp3 et ile2.mp3 (« Une petite île 1 » et « 2 », de passcool17), 128 kb/s
js/progression.js  outils × niveaux, maîtrise, préalables
js/shop.js         catalogue, devis mémorisé jusqu’à l’achat ou au lendemain (rabais + TPS 5 % + TVQ 9,975 %), vérification du total
js/save.js         sauvegarde localStorage (clé vdm.save.v1, format v: 3, normalisation des vieilles parties v1 et v2)
vendor/            three.js r170, police Nunito + licence OFL
js/math/           22 compétences de Sec 1 + 12 de Sec 2 (gen2.js), générateurs seedés, fractions exactes, vérificateur avec π
docs/              spec et plan
```

Le fonctionnement du jeu est décrit dans [GAME.md](GAME.md).
