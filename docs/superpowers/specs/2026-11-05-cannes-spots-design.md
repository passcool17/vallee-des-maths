# Design — 3 cannes + 3 spots de pêche

Date : 2026-11-05  
Jeu : Vallée des Maths  
Approuvé par Pascal (approche 1)

## But

Donner des façons de **dépenser l’argent** : 3 cannes chez Gaston (cash) et 3 spots de pêche, chacun lié à une canne et à une grosseur de poisson.

## Décisions

- Approche 1 : cannes en cash chez Gaston + spots verrouillés par canne ; les **niveaux** de l’outil canne chez Gaston (maths) restent.
- Prix : **petite gratuite**, moyenne **75 $**, grosse **150 $**.
- Spots : (1) quai île 1, (2) Lise / bleuetière (est), (3) Lionel / cabane (nord).
- Accès spot : pont requis **et** canne du spot. Sinon toast explicite.
- Poissons : petits / moyens / gros selon la canne équipée (liée au spot).
- Île 2 (Bernard) : inchangé.
- Achat : cash chez Gaston, **sans** ticket TPS/TVQ (contrairement au magasin de Thérèse).

## Boucle joueur

1. Départ : petite canne déjà possédée → pêche au quai île 1 (petits poissons).
2. Gagne de l’argent → achète canne moyenne chez Gaston → après pont bleuets, pêche chez Lise (moyens).
3. Achète canne grosse → après pont érables, pêche chez Lionel (gros).
4. Améliorer l’outil canne (niveaux) continue d’accélérer les touches / rares partout.

## Cannes

| Id | Nom | Prix | Spot | Poissons |
|----|-----|------|------|----------|
| `petite` | Canne de base | 0 $ (déjà owned) | Quai île 1 | Petits (catalogue actuel île 1) |
| `moyenne` | Canne moyenne | 75,00 $ | Spot Lise | Moyens (nouveaux items + rares moyens) |
| `grosse` | Canne grosse | 150,00 $ | Spot Lionel | Gros (nouveaux items + rares gros) |

Sauvegarde : `rods: { petite: true, moyenne: false, grosse: false }` (normalize : `petite: true` si absent).

UI Gaston : section « Cannes » avec 3 rangées (possédée / acheter cash). Pas de question maths à l’achat.

## Spots monde

- Quai île 1 : existant `kind: 'fish'`, exige `rods.petite` (toujours vrai).
- Nouveau interactable près de Lise (rive est, derrière pont bleuets) : `kind: 'fish'`, `rod: 'moyenne'`, gated comme Lise (pont).
- Nouveau interactable près de Lionel (rive nord, derrière pont érables) : `kind: 'fish'`, `rod: 'grosse'`, gated pont.

Sans la canne : toast du type « Il te faut la canne moyenne — passe voir Gaston. »

## Poissons

Réutiliser le flux pêche actuel (`startFishing` / touche rare / `actionQ`).  
Le spot (ou `rod`) choisit le pool ITEMS :

- Petits : perchaude, etc. (actuel île 1).
- Moyens : 3 communs + 3 rares (noms québécois, prix entre petits et île 2).
- Gros : 3 communs + 3 rares (prix plus hauts).

Vente chez Thérèse via `SELL` comme les autres.

## Hors scope

- Pas de changement île 2 / Bernard.
- Pas de remplacer les niveaux maths de la canne.
- Pas d’achat de cannes chez Thérèse.
- Pas de 4e spot.

## Tests

- Petite owned au new game ; pêche quai OK.
- Sans moyenne : spot Lise refuse.
- Achat moyenne cash → spot Lise OK → poisson moyen dans le sac / journal.
- Idem grosse / Lionel.
- Pont fermé : spots absents ou inactifs (même pattern que décor zone).
- Normalize save sans `rods`.

## GAME.md

Documenter cannes, spots, prix, et le lien canne↔spot↔grosseur.
