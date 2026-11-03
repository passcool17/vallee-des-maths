# Vallée des Maths : étape 1

Un petit jeu 3D douillet pour pratiquer les maths de **Secondaire 1** (programme du Québec, PDA du MEQ). Tu vis sur une île low-poly, tu secoues des érables, tu pêches, tu arroses tes plates-bandes, et tu améliores tes outils chez Gaston en répondant à des questions de maths.

**Jouer :** https://passcool17.github.io/vallee-des-maths/ (après publication)

## Lancer en local

Le jeu n’a pas d’étape de build. Il utilise three.js r170, fourni dans `vendor/`, chargé en modules ES.

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
node tools/test-math.mjs        # 89 925 vérifications : générateurs (oracles indépendants), vérificateur, progression, magasin, sauvegarde
node tools/serve.js 8653 &
node tools/test.cjs             # parcours Playwright complet, bureau 1280×800 puis mobile 390×844
```

`tools/test.cjs` joue une vraie partie avec de vraies entrées : clavier, clic pour marcher, joystick, bouton ✋ et pavé numérique. Il améliore la canne et l’arrosoir, déclenche un réchauffement, achète un nichoir en calculant le total avec rabais, TPS et TVQ, puis pêche. Il vérifie aussi qu’il n’y a aucune erreur JS et que l’interface ne se chevauche pas. Les captures vont dans `../shots/`.

## Structure

```
index.html  style.css  favicon.svg  .nojekyll
js/main.js         boucle, caméra, actions (érables, pêche, plates-bandes, fouilles, papillons)
js/world.js        île low-poly, monde courbé (shader), 4 moments de la journée
js/villagers.js    Gaston le castor, Ginette l’orignale, Flocon le harfang
js/flows.js        dialogues, établi, exercices + indices, réchauffements, magasin, carnet
js/ui.js           HUD, panneaux, pavé numérique
js/input.js        clavier (event.code), clic/tap pour marcher, joystick tactile
js/audio.js        musique et effets synthétisés (WebAudio), sourdine
js/progression.js  outils × niveaux, maîtrise, préalables
js/shop.js         catalogue, devis (rabais + TPS 5 % + TVQ 9,975 %), vérification du total
js/save.js         sauvegarde localStorage (vdm.save.v1)
js/math/           22 compétences, générateurs seedés, fractions exactes, vérificateur
docs/              spec et plan
```

Le fonctionnement du jeu est décrit dans [GAME.md](GAME.md).
