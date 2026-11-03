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
const BY_ID = Object.fromEntries(SKILLS.map(s => [s.id, s]));
export const skillById = id => BY_ID[id];
export const prereqsOf = (id, strength) => EDGES.filter(e => e.skill === id && (!strength || e.strength === strength)).map(e => e.prereq);
export const shortId = id => id.replace('qc_s1_', '');
