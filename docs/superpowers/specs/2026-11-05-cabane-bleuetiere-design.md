# Cabane à sucre (nord) + Bleuetière (est)

Date : 2026-11-05  
Jeu : Vallée des Maths (`passcool17/vallee-des-maths`)  
Statut : approuvé en chat par Pascal

## But

Remplir deux zones presque vides de l’île 1, accessibles après l’achat des ponts existants :

- **Colline des Érables** (nord) — pont `erables` (90 $)
- **Pointe-aux-Bleuets** (est) — pont `bleuets` (60 $)

Les maths restent **pendant l’action**, comme la pêche et les érables. Pas de mini-jeu séparé, pas de craft multi-étapes.

## Personnages

| Personnage | Espèce | Zone | Rôle |
| --- | --- | --- | --- |
| **Lionel** (papie) | orignal | nord / cabane | Accueil, explique la cabane, dialoguettes cozy |
| **Lise** (mamie) | renarde | est / bleuetière | Accueil, explique la cueillette, dialoguettes cozy |

Style low-poly comme Gaston / Thérèse / Hortense. Fictifs. Voix « Animal Crossing » via `js/sons.js` (pitch distinct).

## Colline des Érables — cabane

### Décor
Petite cabane de bois, évaporateur qui fume (réduit / coupé selon `fxQ`), 4 à 6 chaudières sur des érables, banc. Lionel près de la cabane.

### Action `seve`
Interagir avec une chaudière prête (recharge ~45 s, comme un érable).

- Toujours un petit gain de sous (pastille HUD).
- Environ 1 fois sur 3 : question chronométrée de **proportions** ou **volumes** (compétences Sec. 1 déjà dans le jeu ; niveau basique / standard / avancé selon maîtrise ; « Laisser filer », indices, théorie Hortense, adaptatif ~55 % faibles).
- Butin selon le niveau : tire d’érable (3 $), cruchon ambré (6 $), première coulée (12 $) — items distincts ou réutilisent la famille sirop déjà en place ; à clarifier à l’implémentation sans casser le carnet.
- Échec / temps écoulé : message gentil, bonne réponse montrée, **aucune pénalité**.

Les érables du nord restent **secouables** pour les sous. Les questions « sirop » liées à la cabane passent par les **chaudières**, pour distinguer ce coin du village.

## Pointe-aux-Bleuets — bleuetière

### Décor
Rangées de plants de bleuets, paniers, petite table de tri. Lise près des plants.

### Action `bleuet`
Interagir avec un plant prêt (recharge comparable aux plates-bandes).

- Toujours quelques bleuets / sous.
- Environ 1 fois sur 3 : question de **dénombrement** ou **moyenne**.
- Butin : barquette (4 $), confiture (8 $), confiture de grand-mère (14 $) → sac → vente chez Thérèse.
- Même règles de douceur (Laisser filer, indices, théorie, pas de pénalité).

Les papillons et trous déjà présents à l’est **restent**.

## Accès

Les ponts restent **payants** comme aujourd’hui (`pont_bleuets` 60 $, `pont_erables` 90 $ chez Thérèse, ticket TPS/TVQ). Lionel et Lise ne sont accessibles qu’après l’ouverture du pont de leur zone. Les personnages / interactables de zone sont absents ou inactifs tant que le pont est fermé (même pattern que les papillons est).

## Technique

- Étendre `js/world.js` (décors + interactables `seve` / `bleuet` + placement Lionel / Lise).
- Étendre `js/villagers.js` (ou équivalent) pour Lionel et Lise.
- Brancher les actions dans `js/flows.js` / `js/actionq.js` sur le pipeline de questions existant.
- Items + prix dans `js/shop.js` ; carnet / journal si besoin dans `js/ui.js` / progression.
- Sons : voices + petits SFX chaudière / panier dans `js/sons.js`.
- Qualité : fumée, densité de plants et particules respectent `fxQ()` (S20).
- Sauvegarde : pas de nouveau schéma lourd ; états `ready` des interactables comme digs/beds. Si besoin d’un flag de première rencontre, le coller dans `save` de façon rétrocompatible.

## Hors scope

- Mini-jeux de cuisson / cueillette chronométrée
- Boucle craft multi-étapes (récolter → transformer → vendre en plusieurs écrans)
- Quêtes / cachettes étendues aux nouvelles zones (idée séparée)
- Observatoire, feu de camp, jardin secret
- Île 2

## Succès

- Après chaque pont, le coin a un villageois, un décor lisible et une action rentable avec questions.
- 0 erreur console ; tests headless étendus (`test-cabane` / `test-bleuet` ou suite existante).
- Screenshots avant/après desktop + mobile ; validation visuelle avec Pascal (« Je publie? ») avant push `main`.
- Performances acceptables sur le tier mobile (draw / fx réduits si besoin).

## Approche retenue

**Miroir des actions actuelles** (approuvée) : même boucle que pêche / érables / plates-bandes, pas de sous-système neuf.
