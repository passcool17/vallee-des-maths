# Vallée des Maths : étape 2

Un petit jeu 3D douillet pour pratiquer les maths de **Secondaire 1** (programme du Québec, PDA du MEQ). Tu vis sur une île low-poly, tu secoues des érables, tu pêches, tu arroses tes plates-bandes, et tu améliores tes outils chez Gaston en répondant à des questions de maths. Depuis l’étape 2, une touche rare à la pêche ou un coup de sirop à l’érable peut aussi lancer une petite question chronométrée, toujours facultative.

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

## Tests

```bash
node tools/test-math.mjs        # 89 943 vérifications : générateurs (oracles indépendants), vérificateur, progression, magasin, sauvegarde v1→v2, questions en action
node tools/serve.js 8653 &
node tools/test.cjs 8653        # parcours Playwright complet, bureau 1280×800 puis mobile 390×844 (ONLY=desktop|mobile pour un seul)
```

`tools/test.cjs` joue une vraie partie avec de vraies entrées : clavier, clic pour marcher, joystick, bouton ✋ et pavé numérique. Il améliore la canne et l’arrosoir, déclenche un réchauffement, achète un nichoir en calculant le total avec rabais, TPS et TVQ, puis pêche. Pour l’étape 2, il force des touches rares (bonne réponse, mauvaise réponse, « Laisser filer », temps écoulé), vérifie que le chrono s’arrête en pause (P, ⏸, onglet caché), répond à une question de fractions à l’érable, contrôle le carnet et recharge une vieille sauvegarde v1. Il vérifie aussi qu’il n’y a aucune erreur JS et que l’interface ne se chevauche pas. Les captures vont dans `../shots/`.

## Structure

```
index.html  style.css  favicon.svg  .nojekyll
js/main.js         boucle, caméra, actions (érables, pêche, plates-bandes, fouilles, papillons)
js/world.js        île low-poly, monde courbé (shader), 4 moments de la journée
js/villagers.js    Gaston le castor, Ginette l’orignale, Flocon le harfang
js/flows.js        dialogues, établi, exercices + indices, réchauffements, questions en action, magasin, carnet
js/actionq.js      étape 2 : chance de touche rare, choix de la question et du niveau, butin, chrono (pur, testé)
js/ui.js           HUD, panneaux, pavé numérique
js/input.js        clavier (event.code), clic/tap pour marcher, joystick tactile
js/audio.js        musique et effets synthétisés (WebAudio), sourdine
js/progression.js  outils × niveaux, maîtrise, préalables
js/shop.js         catalogue, devis mémorisé jusqu’à l’achat ou au lendemain (rabais + TPS 5 % + TVQ 9,975 %), vérification du total
js/save.js         sauvegarde localStorage (clé vdm.save.v1, format v: 2, normalisation des vieilles parties)
vendor/            three.js r170, police Nunito + licence OFL
js/math/           22 compétences, générateurs seedés, fractions exactes, vérificateur
docs/              spec et plan
```

Le fonctionnement du jeu est décrit dans [GAME.md](GAME.md).
