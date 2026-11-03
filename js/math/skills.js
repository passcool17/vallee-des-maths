// Taxonomie québécoise de secondaire 1, même forme que cn-math-taxonomy (nœuds + arêtes de prérequis),
// contenu original arrimé à la Progression des apprentissages (MEQ, 2016) et au PFEQ 1er cycle.
// pda : section de la Progression ; « ★ 1re » = l'élève le fait seul à la fin de la 1re, « → 1re » = avec l'enseignant.
export const DOMAINES = ['Arithmétique', 'Proportionnalité', 'Algèbre', 'Probabilités', 'Statistique', 'Géométrie'];

const S = (id, nom, domaine, type, description, criteres, pda) => ({ id, nom, domaine, type, description, criteres, pda });
export const SKILLS = [
  S('qc_s1_ari_01', 'Priorité des opérations', 'Arithmétique', 'procedural', 'Effectuer une chaîne d’opérations avec au plus deux niveaux de parenthèses.', ['Traite les parenthèses de l’intérieur vers l’extérieur', 'Fait × et ÷ avant + et −'], 'Arithmétique · opérations, no 8 : chaînes d’opérations — ★ 1re'),
  S('qc_s1_ari_02', 'Nombres relatifs et décimaux', 'Arithmétique', 'procedural', 'Additionner, soustraire, multiplier et diviser des nombres positifs et négatifs, entiers ou décimaux.', ['Applique les règles des signes', 'Aligne les décimales'], 'Arithmétique · opérations, no 7a : décimaux et nombres négatifs — ★ 1re'),
  S('qc_s1_ari_03', 'Fractions équivalentes', 'Arithmétique', 'conceptual', 'Trouver des fractions équivalentes et réduire une fraction.', ['Multiplie ou divise le numérateur et le dénominateur par le même nombre', 'Reconnaît une fraction irréductible'], 'Arithmétique · sens du nombre : fractions équivalentes — ★ primaire, réinvesti'),
  S('qc_s1_ari_04', 'Addition et soustraction de fractions', 'Arithmétique', 'procedural', 'Additionner et soustraire des fractions positives.', ['Trouve un dénominateur commun', 'Réduit le résultat'], 'Arithmétique · opérations, no 7b : fractions positives — → 1re, ★ 2e'),
  S('qc_s1_ari_05', 'Multiplication et division de fractions', 'Arithmétique', 'procedural', 'Multiplier et diviser des fractions positives, en contexte.', ['Multiplie numérateurs et dénominateurs', 'Divise en multipliant par l’inverse'], 'Arithmétique · opérations, no 7b : fractions positives — → 1re, ★ 2e'),
  S('qc_s1_ari_06', 'Fraction, décimal, pourcentage', 'Arithmétique', 'conceptual', 'Passer d’une écriture à l’autre et arrondir.', ['Convertit fraction ↔ décimal ↔ %', 'Arrondit à la position demandée'], 'Arithmétique · opérations, no 10 : passer d’une écriture à l’autre — ★ primaire, réinvesti ; approximation — → 1re'),
  S('qc_s1_ari_07', 'Puissances et facteurs premiers', 'Arithmétique', 'procedural', 'Calculer des puissances, décomposer en facteurs premiers, trouver un PGCD ou un PPCM.', ['Décompose un nombre en facteurs premiers', 'Utilise PGCD et PPCM en contexte'], 'Arithmétique · opérations, nos 12 et 13 : puissances, facteurs premiers — ★ primaire, réinvesti'),
  S('qc_s1_ari_08', 'Tant pour cent', 'Arithmétique', 'application', 'Calculer un pourcentage d’une quantité, un rabais, un pourcentage.', ['Calcule p % de N', 'Calcule un prix après rabais'], 'Arithmétique · proportionnalité : tant pour cent — ★ 1re'),
  S('qc_s1_pro_01', 'Taux unitaire', 'Proportionnalité', 'application', 'Calculer et comparer des taux unitaires (prix par unité, vitesse).', ['Ramène à une unité', 'Compare deux offres'], 'Arithmétique · proportionnalité : rapports et taux — → 1re, ★ 2e'),
  S('qc_s1_pro_02', 'Proportion directe', 'Proportionnalité', 'reasoning', 'Résoudre une situation de proportionnalité directe (retour à l’unité, coefficient).', ['Trouve le coefficient de proportionnalité', 'Complète un tableau proportionnel'], 'Arithmétique · proportionnalité, nos 7 et 8 : situations de proportionnalité — → 1re, ★ 2e'),
  S('qc_s1_alg_01', 'Suites', 'Algèbre', 'reasoning', 'Trouver un terme, un rang ou la règle d’une suite arithmétique.', ['Lie le terme à son rang', 'Écrit la règle'], 'Algèbre · suites : régularités — ★ primaire, réinvesti ; règle → 1re'),
  S('qc_s1_alg_02', 'Valeur numérique', 'Algèbre', 'procedural', 'Calculer la valeur d’une expression algébrique pour des valeurs données.', ['Remplace correctement la variable', 'Respecte les signes'], 'Algèbre · A. Expressions algébriques : valeur numérique — → 1re, ★ 2e'),
  S('qc_s1_alg_03', 'Termes semblables', 'Algèbre', 'procedural', 'Réduire une expression en regroupant les termes semblables.', ['Reconnaît les termes semblables', 'Reconnaît des expressions équivalentes'], 'Algèbre · A. Expressions algébriques, no 7 : expressions équivalentes — → 1re, ★ 2e'),
  S('qc_s1_alg_04', 'Équations du 1er degré', 'Algèbre', 'procedural', 'Résoudre une équation du 1er degré à une inconnue.', ['Fait la même opération des deux côtés', 'Vérifie sa solution'], 'Algèbre · C. Équations du 1er degré à une inconnue — → 1re, ★ 2e'),
  S('qc_s1_prb_01', 'Dénombrement', 'Probabilités', 'procedural', 'Dénombrer les résultats possibles à l’aide d’un tableau ou d’un arbre.', ['Utilise le principe de multiplication', 'Construit un tableau à double entrée'], 'Probabilités · A, no 9a : dénombrer avec tableaux et arbres — ★ primaire, réinvesti'),
  S('qc_s1_prb_02', 'Probabilité d’un événement', 'Probabilités', 'conceptual', 'Calculer la probabilité théorique d’un événement simple.', ['Compte les cas favorables et possibles', 'Exprime la probabilité en fraction'], 'Probabilités · A, no 13 et B, no 4 : calculer la probabilité d’un événement — → 1re, ★ 2e'),
  S('qc_s1_sta_01', 'Moyenne et étendue', 'Statistique', 'procedural', 'Calculer et interpréter une moyenne arithmétique et une étendue.', ['Calcule une moyenne avec des négatifs', 'Trouve une donnée manquante'], 'Statistique · A, nos 10 et 11 : moyenne arithmétique, étendue — → 1re, ★ 2e'),
  S('qc_s1_geo_01', 'Angles et figures', 'Géométrie', 'conceptual', 'Angles d’un triangle, angles complémentaires et supplémentaires, classement des figures.', ['Utilise la somme 180° du triangle', 'Classe triangles et quadrilatères'], 'Géométrie · Mesure, angles nos 3 et 4 ; figures planes nos 2 et 3 — ★ 1re / → 1re'),
  S('qc_s1_geo_02', 'Périmètre et unités', 'Géométrie', 'procedural', 'Convertir des longueurs SI et calculer des périmètres.', ['Convertit km, m, dm, cm, mm', 'Additionne des côtés dans la même unité'], 'Géométrie · Mesure, longueurs nos 3 et 4 : unités SI, périmètre — ★ 1re / → 1re'),
  S('qc_s1_geo_03', 'Aires', 'Géométrie', 'procedural', 'Calculer l’aire de rectangles, triangles, parallélogrammes, trapèzes et losanges.', ['Choisit la bonne formule', 'Exprime l’aire en unités carrées'], 'Géométrie · Mesure, aires no 4 : aire de figures planes — → 1re, ★ 2e'),
  S('qc_s1_geo_04', 'Cercle et polygones réguliers', 'Géométrie', 'procedural', 'Circonférence, rayon, angles intérieurs des polygones réguliers.', ['Utilise C = π × d', 'Utilise (n − 2) × 180°'], 'Géométrie · figures planes nos 4 et 5 ; longueurs no 4 : circonférence — → 1re, ★ 2e'),
  S('qc_s1_geo_05', 'Plan cartésien', 'Géométrie', 'conceptual', 'Repérer des points et appliquer une translation ou une réflexion.', ['Lit un couple (x, y)', 'Calcule l’image par une transformation'], 'Géométrie · PFEQ 1er cycle : plan cartésien, transformations — → 1re'),
];
// Arêtes « skill dépend de prereq » (dur : bloque l’accès ; mou : utile, sert d’échauffement)
const E = (skill, prereq, strength = 'hard') => ({ skill: `qc_s1_${skill}`, prereq: `qc_s1_${prereq}`, strength });
export const EDGES = [
  E('ari_02', 'ari_01'), E('ari_04', 'ari_03'), E('ari_04', 'ari_07', 'soft'), E('ari_05', 'ari_04'),
  E('ari_06', 'ari_03'), E('ari_08', 'ari_06'), E('pro_01', 'ari_02'), E('pro_02', 'pro_01'),
  E('alg_01', 'ari_01', 'soft'), E('alg_02', 'ari_02'), E('alg_02', 'alg_01', 'soft'), E('alg_03', 'alg_02'), E('alg_04', 'alg_03'),
  E('prb_02', 'prb_01'), E('prb_02', 'ari_03'), E('sta_01', 'ari_02'),
  E('geo_02', 'ari_02'), E('geo_03', 'geo_02'), E('geo_04', 'geo_03'), E('geo_04', 'geo_01', 'soft'), E('geo_05', 'ari_02'),
];
// ---------- Secondaire 2 (2e année du 1er cycle) : île de Secondaire 2
// pda : section de la Progression des apprentissages ; « ★ 2e » = l'élève le fait seul à la fin de la 2e.
export const SKILLS2 = [
  S('qc_s2_ari_01', 'Opérations sur les fractions', 'Arithmétique', 'procedural', 'Enchaîner les quatre opérations sur des fractions positives en respectant la priorité.', ['Divise en multipliant par l’inverse', 'Réduit le résultat final'], 'Arithmétique · opérations, no 7 : fractions (chaînes d’opérations) — ★ 2e'),
  S('qc_s2_pro_01', 'Pourcentages et taxes', 'Proportionnalité', 'application', 'Trouver le tout à partir d’une partie, calculer TPS et TVQ, retrouver un prix initial après une hausse ou une baisse.', ['Utilise p % = p/100 comme multiplicateur', 'Applique TPS 5 % et TVQ 9,975 %'], 'Arithmétique · proportionnalité : tant pour cent (calcul du 100 %) — ★ 2e'),
  S('qc_s2_pro_02', 'Proportion directe et inverse', 'Proportionnalité', 'reasoning', 'Reconnaître et résoudre une situation de proportionnalité directe ou inverse.', ['Produit constant = inverse ; quotient constant = directe', 'Résout une proportion'], 'Arithmétique · proportionnalité : situations directes et inverses — ★ 2e'),
  S('qc_s2_pro_03', 'Échelle et figures semblables', 'Proportionnalité', 'application', 'Utiliser une échelle et le rapport de similitude (longueurs ×k, aires ×k²).', ['Convertit avec l’échelle', 'Sait que les aires varient selon k²'], 'Géométrie · figures semblables, rapport de similitude — ★ 2e'),
  S('qc_s2_alg_01', 'Distributivité', 'Algèbre', 'procedural', 'Multiplier un monôme par un polynôme et réduire.', ['Distribue à chaque terme', 'Respecte les signes avant la parenthèse'], 'Algèbre · A. Manipulation d’expressions (distributivité) — ★ 2e'),
  S('qc_s2_alg_04', 'Mise en évidence simple', 'Algèbre', 'procedural', 'Factoriser par un facteur commun, et s’en servir en calcul mental.', ['Trouve le plus grand facteur commun', 'Vérifie en redistribuant'], 'Algèbre · A. Factorisation (mise en évidence simple) — ★ 2e'),
  S('qc_s2_alg_02', 'Équations (inconnue des deux côtés)', 'Algèbre', 'procedural', 'Résoudre une équation du 1er degré où l’inconnue est des deux côtés, en contexte.', ['Regroupe les termes en x d’un côté', 'Vérifie sa solution'], 'Algèbre · C. Équations du 1er degré à une inconnue — ★ 2e'),
  S('qc_s2_alg_03', 'Table de valeurs et règle', 'Algèbre', 'reasoning', 'Passer d’une table de valeurs à une règle y = ax + b et inversement.', ['Trouve le taux de variation', 'Trouve la valeur initiale'], 'Algèbre · B. Modes de représentation (table, règle, graphique) — ★ 2e'),
  S('qc_s2_geo_01', 'Aire du disque et du secteur', 'Géométrie', 'procedural', 'Calculer l’aire d’un disque, d’un secteur et la longueur d’un arc.', ['Utilise A = πr²', 'Prend la fraction n/360 du disque'], 'Géométrie · Mesure, aires no 4 : disque et secteur — ★ 2e'),
  S('qc_s2_geo_02', 'Aire des solides', 'Géométrie', 'procedural', 'Calculer l’aire latérale et totale de prismes, de cylindres et de pyramides droites.', ['Décompose le développement', 'Additionne les faces'], 'Géométrie · Mesure, aires des solides — ★ 2e'),
  S('qc_s2_geo_03', 'Angles et droites parallèles', 'Géométrie', 'reasoning', 'Utiliser les angles alternes-internes, correspondants, opposés par le sommet.', ['Reconnaît les paires d’angles isométriques', 'Utilise les angles supplémentaires'], 'Géométrie · angles formés par deux parallèles et une sécante — ★ 2e'),
  S('qc_s2_prb_01', 'Tirages avec ou sans remise', 'Probabilités', 'reasoning', 'Calculer la probabilité d’une suite de tirages, avec ou sans remise.', ['Multiplie les probabilités le long d’une branche', 'Ajuste les nombres sans remise'], 'Probabilités · expériences à plusieurs étapes, avec ou sans remise — ★ 2e'),
];
const E2 = (skill, prereq, strength = 'hard') => ({ skill: `qc_s2_${skill}`, prereq: prereq.startsWith('qc_') ? prereq : `qc_s2_${prereq}`, strength });
const s1 = x => `qc_s1_${x}`;
export const EDGES2 = [
  E2('ari_01', s1('ari_05')), E2('pro_01', s1('ari_08')), E2('pro_02', s1('pro_02')), E2('pro_03', 'pro_02'),
  E2('alg_01', s1('alg_03')), E2('alg_04', 'alg_01'), E2('alg_02', s1('alg_04')), E2('alg_03', s1('alg_01')),
  E2('geo_01', s1('geo_04')), E2('geo_02', s1('geo_03')), E2('geo_03', s1('geo_01')), E2('prb_01', s1('prb_02')),
];
export const ALL_SKILLS = [...SKILLS, ...SKILLS2];
const ALL_EDGES = [...EDGES, ...EDGES2];
const BY_ID = Object.fromEntries(ALL_SKILLS.map(s => [s.id, s]));
export const skillById = id => BY_ID[id];
export const prereqsOf = (id, strength) => ALL_EDGES.filter(e => e.skill === id && (!strength || e.strength === strength)).map(e => e.prereq);
export const shortId = id => id.replace(/^qc_s[12]_/, '');
export const isS2 = id => id.startsWith('qc_s2_');
export const levelOf = id => (isS2(id) ? 2 : 1);
// Préalables « durs » de secondaire 1 les plus proches (on remonte la chaîne S2 au besoin) : sert au réchauffement.
export function sec1Prereqs(id) {
  const out = [], seen = new Set(), todo = [id];
  while (todo.length) { const cur = todo.shift(); for (const p of prereqsOf(cur, 'hard')) { if (seen.has(p)) continue; seen.add(p); (isS2(p) ? todo : out).push(p); } }
  return out;
}
