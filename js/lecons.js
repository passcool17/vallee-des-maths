// Leçons d’Hortense la tortue : une fiche de théorie par compétence (secondaire 1 et 2).
// idee : 2 à 4 phrases simples · regle : la règle ou la formule clé · ex : un exemple résolu pas à pas.
// chk() refait le calcul de l’exemple : [valeur calculée, valeur annoncée] (vérifié par tools/test-logic.mjs).
const pgcd = (a, b) => (b ? pgcd(b, a % b) : Math.abs(a));
const L = (idee, regle, q, etapes, rep, chk) => ({ idee, regle, ex: { q, etapes, rep }, chk });

export const LECONS = {
  // ---------- Secondaire 1
  qc_s1_ari_01: L(
    ['Dans une chaîne d’opérations, on ne calcule pas simplement de gauche à droite.', 'On commence par l’intérieur des parenthèses, puis on fait les multiplications et les divisions, et on garde les additions et les soustractions pour la fin.'],
    'Parenthèses (de l’intérieur vers l’extérieur) → exposants → × et ÷ de gauche à droite → + et − de gauche à droite',
    'Calcule 3 + 4 × [10 − (2 + 6)] ÷ 2',
    ['Parenthèses intérieures : 2 + 6 = 8', 'Crochets : 10 − 8 = 2', 'Il reste 3 + 4 × 2 ÷ 2. De gauche à droite : 4 × 2 = 8, puis 8 ÷ 2 = 4', 'Addition à la fin : 3 + 4 = 7'],
    '7', () => [3 + 4 * (10 - (2 + 6)) / 2, 7]),
  qc_s1_ari_02: L(
    ['Un nombre négatif, c’est comme une dette ou une température sous zéro.', 'Pour multiplier ou diviser, on calcule sans les signes, puis on décide du signe à la fin.', 'Soustraire un négatif, c’est comme additionner son opposé.'],
    '× et ÷ : mêmes signes → positif ; signes différents → négatif. a − (−b) = a + b',
    'Calcule (−2,5) × 4 − (−6)',
    ['Multiplication d’abord : 2,5 × 4 = 10, signes différents, donc −10', 'Soustraire −6, c’est additionner 6 : −10 + 6', 'Signes différents : 10 − 6 = 4, on garde le signe du plus grand (−)'],
    '−4', () => [(-2.5) * 4 - (-6), -4]),
  qc_s1_ari_03: L(
    ['Deux fractions sont équivalentes quand elles représentent la même part, comme 1/2 et 2/4 d’une pizza.', 'Pour réduire une fraction, on divise le haut et le bas par le même nombre, idéalement leur PGCD.'],
    'a/b = (a × k)/(b × k) = (a ÷ k)/(b ÷ k), avec k ≠ 0',
    'Réduis 18/24',
    ['Diviseurs communs de 18 et 24 : 1, 2, 3, 6. Le plus grand est 6', 'Numérateur : 18 ÷ 6 = 3', 'Dénominateur : 24 ÷ 6 = 4'],
    '3/4', () => [18 / 24 + pgcd(3, 4) - 1, 3 / 4]),
  qc_s1_ari_04: L(
    ['On ne peut additionner que des morceaux de même grandeur.', 'Avant d’additionner ou de soustraire, on transforme les fractions pour qu’elles aient le même dénominateur, puis on additionne seulement les numérateurs.'],
    'a/c + b/c = (a + b)/c — trouve d’abord un dénominateur commun, puis réduis',
    'Calcule 2/3 + 1/4',
    ['Dénominateur commun de 3 et 4 : 12', '2/3 = 8/12 (× 4 en haut et en bas) et 1/4 = 3/12 (× 3)', '8/12 + 3/12 = 11/12', '11 et 12 n’ont pas de diviseur commun : c’est déjà réduit'],
    '11/12', () => [2 / 3 + 1 / 4, 11 / 12]),
  qc_s1_ari_05: L(
    ['Pour multiplier des fractions, c’est le plus simple : haut avec haut, bas avec bas.', 'Diviser par une fraction, c’est se demander « combien de fois elle entre dedans ». On le calcule en multipliant par son inverse.'],
    'a/b × c/d = (a × c)/(b × d) ; a/b ÷ c/d = a/b × d/c',
    'Combien de verres de 1/8 L peut-on remplir avec 3/4 L de jus?',
    ['C’est une division : 3/4 ÷ 1/8', 'On multiplie par l’inverse : 3/4 × 8/1', '(3 × 8)/(4 × 1) = 24/4 = 6'],
    '6 verres', () => [(3 / 4) / (1 / 8), 6]),
  qc_s1_ari_06: L(
    ['Une fraction, un nombre décimal et un pourcentage peuvent dire exactement la même chose.', 'La barre de fraction veut dire « divisé par ». Pour passer au pourcentage, on multiplie par 100.'],
    'a/b = a ÷ b ; décimal × 100 = pourcentage ; pour arrondir, regarde le chiffre juste après la position demandée (5 ou plus : on monte)',
    'Écris 3/8 en décimal et en pourcentage, puis arrondis le décimal au dixième',
    ['3 ÷ 8 = 0,375', '0,375 × 100 = 37,5 %', 'Au dixième : le chiffre après le 3 est 7 (5 ou plus), donc on monte à 0,4'],
    '0,375 = 37,5 % ≈ 0,4', () => [3 / 8 * 100, 37.5]),
  qc_s1_ari_07: L(
    ['Une puissance, c’est une multiplication répétée : 2³ = 2 × 2 × 2.', 'Tout nombre se décompose en facteurs premiers, comme des briques de base.', 'Le PGCD prend les briques communes; le PPCM prend toutes les briques nécessaires.'],
    'PGCD : facteurs communs avec le plus petit exposant ; PPCM : tous les facteurs avec le plus grand exposant',
    'Trouve le PGCD et le PPCM de 60 et 84',
    ['60 = 2 × 2 × 3 × 5 = 2² × 3 × 5', '84 = 2 × 2 × 3 × 7 = 2² × 3 × 7', 'PGCD : facteurs communs 2² × 3 = 12', 'PPCM : 2² × 3 × 5 × 7 = 420'],
    'PGCD = 12, PPCM = 420', () => [pgcd(60, 84) * 1000 + 60 * 84 / pgcd(60, 84), 12 * 1000 + 420]),
  qc_s1_ari_08: L(
    ['« Pour cent » veut dire « sur 100 » : 25 % = 25/100 = 0,25.', 'Pour un rabais, on calcule le montant du rabais, puis on l’enlève du prix.'],
    'p % de N = (p ÷ 100) × N ; prix après rabais = prix − rabais = prix × (1 − p ÷ 100)',
    'Un chandail coûte 48 $. Il est en solde à 25 % de rabais. Quel est le nouveau prix?',
    ['25 % = 0,25', 'Rabais : 0,25 × 48 = 12 $', 'Nouveau prix : 48 − 12 = 36 $'],
    '36 $', () => [48 * (1 - 0.25), 36]),
  qc_s1_pro_01: L(
    ['Un taux unitaire dit combien ça coûte (ou combien on fait) pour UNE unité : 1 L, 1 kg, 1 heure.', 'C’est la meilleure façon de comparer deux offres qui n’ont pas la même grosseur.'],
    'taux unitaire = quantité totale ÷ nombre d’unités',
    'Jus : 3 L pour 7,47 $ ou 2 L pour 5,18 $. Lequel est le meilleur achat?',
    ['Offre A : 7,47 ÷ 3 = 2,49 $ par litre', 'Offre B : 5,18 ÷ 2 = 2,59 $ par litre', '2,49 $ < 2,59 $'],
    'Le format de 3 L', () => [Math.round(7.47 / 3 * 100) / 100 * 100 + Math.round(5.18 / 2 * 100) / 100, 249 + 2.59]),
  qc_s1_pro_02: L(
    ['Deux quantités sont proportionnelles quand, si l’une double, l’autre double aussi.', 'Le truc le plus sûr : le retour à l’unité. On trouve combien pour 1, puis on multiplie.'],
    'y = k × x (k = coefficient de proportionnalité = y ÷ x)',
    'Pour 4 crêpes, il faut 150 mL de lait. Combien pour 10 crêpes?',
    ['Pour 1 crêpe : 150 ÷ 4 = 37,5 mL', 'Pour 10 crêpes : 37,5 × 10 = 375 mL'],
    '375 mL', () => [150 / 4 * 10, 375]),
  qc_s1_alg_01: L(
    ['Dans une suite arithmétique, on ajoute toujours le même nombre d’un terme à l’autre : c’est la raison.', 'La règle relie le rang n (1er, 2e, 3e…) à la valeur du terme, ce qui permet de sauter directement au 20e.'],
    't(n) = raison × n + (1er terme − raison)',
    'Suite : 5, 8, 11, 14, … Trouve la règle et le 20e terme',
    ['Raison : 8 − 5 = 3', 'Valeur au rang 0 : 5 − 3 = 2, donc t(n) = 3n + 2', 'Vérification au rang 1 : 3 × 1 + 2 = 5 ✔', '20e terme : 3 × 20 + 2 = 62'],
    't(n) = 3n + 2 ; 20e terme = 62', () => [3 * 20 + 2 + (3 * 1 + 2 === 5 ? 0 : 1), 62]),
  qc_s1_alg_02: L(
    ['Trouver la valeur numérique, c’est remplacer la lettre par un nombre, puis calculer.', 'Mets toujours le nombre entre parenthèses, surtout s’il est négatif : ça évite les erreurs de signe.'],
    'Remplace la variable par (sa valeur), puis respecte la priorité des opérations',
    'Calcule 2x² − 3x + 1 quand x = −2',
    ['Remplace : 2 × (−2)² − 3 × (−2) + 1', 'Exposant : (−2)² = 4, donc 2 × 4 = 8', '−3 × (−2) = +6', '8 + 6 + 1 = 15'],
    '15', () => { const x = -2; return [2 * x ** 2 - 3 * x + 1, 15]; }),
  qc_s1_alg_03: L(
    ['Des termes semblables ont exactement la même partie avec des lettres : 4x et −x, ou 2x² et x².', 'On additionne seulement leurs coefficients; la partie en lettres ne change pas. Un x et un x² ne se mélangent pas!'],
    'ax + bx = (a + b)x ; on regroupe les x² ensemble, les x ensemble, les nombres ensemble',
    'Réduis 4x + 3 − x + 2x² − 5 + x²',
    ['Les x² : 2x² + x² = 3x²', 'Les x : 4x − x = 3x', 'Les nombres : 3 − 5 = −2', 'Réponse : 3x² + 3x − 2'],
    '3x² + 3x − 2', () => { const f = x => 4 * x + 3 - x + 2 * x * x - 5 + x * x, g = x => 3 * x * x + 3 * x - 2; return [f(2) + f(-1) * 10, g(2) + g(-1) * 10]; }),
  qc_s1_alg_04: L(
    ['Une équation, c’est une balance en équilibre.', 'Tout ce que tu fais d’un côté, tu le fais de l’autre, jusqu’à ce que x soit tout seul.', 'À la fin, remplace x dans l’équation de départ pour vérifier.'],
    'Même opération des deux côtés : on défait d’abord les + et −, ensuite les × et ÷',
    'Résous 3x − 7 = 11',
    ['Ajoute 7 des deux côtés : 3x = 18', 'Divise par 3 des deux côtés : x = 6', 'Vérification : 3 × 6 − 7 = 18 − 7 = 11 ✔'],
    'x = 6', () => [(11 + 7) / 3 + (3 * 6 - 7 === 11 ? 0 : 1), 6]),
  qc_s1_prb_01: L(
    ['Dénombrer, c’est compter toutes les possibilités sans en oublier.', 'Un arbre ou un tableau aide à voir. Quand on fait des choix l’un après l’autre, on multiplie le nombre de choix à chaque étape.'],
    'Principe de multiplication : nombre de résultats = choix 1 × choix 2 × choix 3 …',
    'Camille a 3 chandails, 2 pantalons et 2 tuques. Combien de tenues différentes?',
    ['Étape 1 : 3 chandails', 'Étape 2 : chaque chandail va avec 2 pantalons : 3 × 2 = 6', 'Étape 3 : chaque combinaison va avec 2 tuques : 6 × 2 = 12'],
    '12 tenues', () => [3 * 2 * 2, 12]),
  qc_s1_prb_02: L(
    ['La probabilité dit à quel point un événement a des chances d’arriver, de 0 (impossible) à 1 (certain).', 'Si tous les résultats ont la même chance, on compte les cas qui nous intéressent et on divise par tous les cas possibles.'],
    'P(événement) = nombre de cas favorables ÷ nombre de cas possibles',
    'On lance un dé à 6 faces. Quelle est la probabilité d’obtenir un nombre premier?',
    ['Cas possibles : 1, 2, 3, 4, 5, 6 → 6 cas', 'Nombres premiers : 2, 3, 5 → 3 cas favorables', 'P = 3/6 = 1/2'],
    '1/2 (50 %)', () => [[1, 2, 3, 4, 5, 6].filter(n => [2, 3, 5].includes(n)).length / 6, 1 / 2]),
  qc_s1_sta_01: L(
    ['La moyenne, c’est ce que chacun aurait si on partageait tout également.', 'L’étendue mesure l’écart entre la plus grande et la plus petite donnée. Attention aux nombres négatifs!'],
    'moyenne = somme des données ÷ nombre de données ; étendue = maximum − minimum',
    'Températures de la semaine : −4, 2, 5, −1, 3 °C. Trouve la moyenne et l’étendue',
    ['Somme : −4 + 2 + 5 − 1 + 3 = 5', 'Moyenne : 5 ÷ 5 = 1 °C', 'Étendue : 5 − (−4) = 5 + 4 = 9 °C'],
    'moyenne 1 °C, étendue 9 °C', () => { const d = [-4, 2, 5, -1, 3]; return [d.reduce((a, b) => a + b) / d.length * 100 + Math.max(...d) - Math.min(...d), 100 + 9]; }),
  qc_s1_geo_01: L(
    ['Les trois angles d’un triangle font toujours 180° ensemble.', 'Deux angles complémentaires font 90° (un coin carré); deux angles supplémentaires font 180° (une ligne droite).'],
    'Triangle : a + b + c = 180° ; complémentaires : 90° ; supplémentaires : 180°',
    'Un triangle a deux angles de 47° et 68°. Trouve le troisième',
    ['Additionne les angles connus : 47° + 68° = 115°', 'Enlève de 180° : 180° − 115° = 65°'],
    '65°', () => [180 - (47 + 68), 65]),
  qc_s1_geo_02: L(
    ['Les unités de longueur vont de 10 en 10 : km, hm, dam, m, dm, cm, mm.', 'Vers une unité plus petite, on multiplie par 10 à chaque marche. Pour un périmètre, on met tous les côtés dans la même unité avant d’additionner.'],
    'km → hm → dam → m → dm → cm → mm : × 10 à chaque marche ; périmètre = somme des côtés',
    'Un rectangle mesure 1,2 m sur 45 cm. Trouve son périmètre en cm',
    ['Même unité : 1,2 m = 120 cm (m → cm : 2 marches, × 100)', 'Rectangle : P = 2 × (longueur + largeur)', 'P = 2 × (120 + 45) = 2 × 165 = 330 cm'],
    '330 cm (3,3 m)', () => [2 * (1.2 * 100 + 45), 330]),
  qc_s1_geo_03: L(
    ['L’aire, c’est la surface couverte, en unités carrées (cm², m²).', 'Plusieurs formules viennent du rectangle : un triangle, c’est la moitié d’un rectangle; un trapèze, c’est la moyenne de ses deux bases fois la hauteur.'],
    'Rectangle et parallélogramme : b × h ; triangle : b × h ÷ 2 ; trapèze : (B + b) × h ÷ 2 ; losange : D × d ÷ 2',
    'Un trapèze a une grande base de 10 cm, une petite base de 6 cm et une hauteur de 4 cm. Trouve son aire',
    ['Formule du trapèze : (B + b) × h ÷ 2', 'Bases : 10 + 6 = 16', '16 × 4 = 64, puis 64 ÷ 2 = 32'],
    '32 cm²', () => [(10 + 6) * 4 / 2, 32]),
  qc_s1_geo_04: L(
    ['Le tour d’un cercle (la circonférence) vaut toujours un peu plus de 3 fois son diamètre : c’est π ≈ 3,14.', 'Dans un polygone régulier, tous les angles sont pareils. On trouve la somme des angles, puis on la partage.'],
    'C = π × d = 2 × π × r ; angle intérieur d’un polygone régulier à n côtés = (n − 2) × 180° ÷ n',
    'Trouve la mesure d’un angle intérieur d’un hexagone régulier',
    ['Un hexagone a n = 6 côtés', 'Somme des angles : (6 − 2) × 180° = 720°', 'Un angle : 720° ÷ 6 = 120°'],
    '120°', () => [(6 - 2) * 180 / 6, 120]),
  qc_s1_geo_05: L(
    ['Un point s’écrit (x, y) : d’abord on avance à l’horizontale, ensuite on monte ou on descend.', 'Une translation fait glisser le point. Une réflexion par rapport à un axe le retourne comme dans un miroir.'],
    'Translation (a, b) : (x, y) → (x + a, y + b) ; réflexion axe des y : (x, y) → (−x, y) ; axe des x : (x, y) → (x, −y)',
    'A(3, −2). Trouve son image par la translation (−5, 4), puis par la réflexion sur l’axe des y',
    ['Translation : x : 3 + (−5) = −2 ; y : −2 + 4 = 2 → (−2, 2)', 'Réflexion sur l’axe des y : on change le signe de x → (−3, −2)'],
    '(−2, 2) et (−3, −2)', () => [(3 - 5) * 1000 + (-2 + 4) * 100 + (-3) * 10 + -2, -2 * 1000 + 2 * 100 - 30 - 2]),

  // ---------- Secondaire 2
  qc_s2_ari_01: L(
    ['Avec des fractions, la priorité des opérations ne change pas : × et ÷ avant + et −.', 'Pour diviser, multiplie par l’inverse. Réduis souvent : les calculs restent petits.'],
    'Priorité des opérations ; a/b ÷ c/d = a/b × d/c ; dénominateur commun pour + et −',
    'Calcule 1/2 + 2/3 ÷ 4/9',
    ['La division passe avant : 2/3 ÷ 4/9 = 2/3 × 9/4', '= 18/12 = 3/2 (on divise par 6)', 'Addition : 1/2 + 3/2 = 4/2 = 2'],
    '2', () => [1 / 2 + (2 / 3) / (4 / 9), 2]),
  qc_s2_pro_01: L(
    ['Au Québec, on paie la TPS (5 %) et la TVQ (9,975 %), toutes les deux calculées sur le prix avant taxes.', 'Ensemble, ça donne 14,975 % : le prix taxes incluses est le prix × 1,14975.', 'Pour retrouver le prix de départ (le 100 %), on fait l’inverse : on divise.'],
    'Total = prix × 1,14975 ; prix avant taxes = total ÷ 1,14975 ; si p % = partie, alors 100 % = partie ÷ p × 100',
    'Un livre coûte 40,00 $ avant taxes. Calcule la TPS, la TVQ et le total',
    ['TPS : 40 × 0,05 = 2,00 $', 'TVQ : 40 × 0,09975 = 3,99 $', 'Total : 40,00 + 2,00 + 3,99 = 45,99 $ (ou 40 × 1,14975)'],
    '45,99 $', () => [Math.round(40 * 1.14975 * 100) / 100, 45.99]),
  qc_s2_pro_02: L(
    ['Proportion directe : quand une quantité double, l’autre double aussi (le quotient reste pareil).', 'Proportion inverse : quand une quantité double, l’autre est divisée par 2 (le produit reste pareil). Plus d’amis pour peindre = moins de temps!'],
    'Directe : y ÷ x = constante ; inverse : x × y = constante',
    '4 amis peignent une clôture en 6 h. Combien de temps prendraient 3 amis, au même rythme?',
    ['Plus d’amis → moins de temps : c’est inverse', 'Produit constant : 4 × 6 = 24 heures de travail', '3 amis : 24 ÷ 3 = 8 h'],
    '8 h', () => [4 * 6 / 3, 8]),
  qc_s2_pro_03: L(
    ['Une échelle 1 : 200 veut dire que 1 cm sur le plan vaut 200 cm en vrai.', 'Si on agrandit une figure par un rapport k, les longueurs sont multipliées par k, mais les aires par k × k.'],
    'Longueurs × k ; aires × k² ; échelle 1 : n → réel = plan × n',
    'Un rectangle de 4 cm sur 3 cm est agrandi avec un rapport k = 2,5. Trouve ses côtés et son aire',
    ['Côtés : 4 × 2,5 = 10 cm et 3 × 2,5 = 7,5 cm', 'Aire de départ : 4 × 3 = 12 cm²', 'Nouvelle aire : 10 × 7,5 = 75 cm², et c’est bien 12 × 2,5² = 12 × 6,25'],
    '10 cm sur 7,5 cm ; 75 cm²', () => [4 * 2.5 * 3 * 2.5, 12 * 2.5 ** 2]),
  qc_s2_alg_01: L(
    ['Distribuer, c’est multiplier le facteur devant la parenthèse par CHAQUE terme dedans.', 'Un signe − devant la parenthèse change le signe de tous les termes. Ensuite, on réduit les termes semblables.'],
    'a(b + c) = ab + ac ; −(b − c) = −b + c',
    'Développe et réduis 3x(2x − 5) − 2(x − 4)',
    ['3x × 2x = 6x² et 3x × (−5) = −15x', '−2 × x = −2x et −2 × (−4) = +8', '6x² − 15x − 2x + 8', 'Termes semblables : −15x − 2x = −17x → 6x² − 17x + 8'],
    '6x² − 17x + 8', () => { const f = x => 3 * x * (2 * x - 5) - 2 * (x - 4), g = x => 6 * x * x - 17 * x + 8; return [f(2) + f(-3) * 10, g(2) + g(-3) * 10]; }),
  qc_s2_alg_04: L(
    ['La mise en évidence, c’est la distributivité à l’envers : on sort ce que tous les termes ont en commun.', 'Ça sert aussi en calcul mental : 17 × 23 + 17 × 77 = 17 × 100.'],
    'ab + ac = a(b + c), où a est le plus grand facteur commun',
    'Factorise 12x² + 18x',
    ['Plus grand facteur commun de 12 et 18 : 6', 'Les deux termes ont un x : facteur commun 6x', '12x² ÷ 6x = 2x et 18x ÷ 6x = 3', 'Vérification : 6x(2x + 3) = 12x² + 18x ✔'],
    '6x(2x + 3)', () => { const x = 5; return [6 * x * (2 * x + 3) + 17 * 23 + 17 * 77, 12 * x * x + 18 * x + 17 * 100]; }),
  qc_s2_alg_02: L(
    ['Quand x est des deux côtés, on rassemble d’abord tous les x du même côté, puis les nombres de l’autre.', 'C’est toujours la règle de la balance : même opération des deux côtés.'],
    'ax + b = cx + d → (a − c)x = d − b → x = (d − b) ÷ (a − c)',
    'Résous 5x + 4 = 2x + 19',
    ['Enlève 2x des deux côtés : 3x + 4 = 19', 'Enlève 4 des deux côtés : 3x = 15', 'Divise par 3 : x = 5', 'Vérification : 5 × 5 + 4 = 29 et 2 × 5 + 19 = 29 ✔'],
    'x = 5', () => [(19 - 4) / (5 - 2) + (5 * 5 + 4 === 2 * 5 + 19 ? 0 : 1), 5]),
  qc_s2_alg_03: L(
    ['Une règle y = ax + b décrit une situation qui augmente toujours au même rythme.', 'Le a, c’est le taux de variation : de combien y change quand x augmente de 1. Le b, c’est la valeur de départ, quand x = 0.'],
    'a = (variation de y) ÷ (variation de x) ; b = y − a × x (avec n’importe quel point de la table)',
    'Table : x = 1, 3, 5 ; y = 7, 13, 19. Trouve la règle',
    ['Taux de variation : (13 − 7) ÷ (3 − 1) = 6 ÷ 2 = 3', 'Valeur initiale avec (1, 7) : b = 7 − 3 × 1 = 4', 'Règle : y = 3x + 4', 'Vérification avec x = 5 : 3 × 5 + 4 = 19 ✔'],
    'y = 3x + 4', () => { const a = (13 - 7) / (3 - 1), b = 7 - a; return [a * 10 + b + (a * 5 + b === 19 ? 0 : 1), 34]; }),
  qc_s2_geo_01: L(
    ['L’aire d’un disque, c’est π fois le rayon au carré.', 'Un secteur, c’est une pointe de tarte : on prend la fraction n/360 du disque complet. Même idée pour la longueur d’un arc avec la circonférence.'],
    'A = π × r² ; secteur = (n ÷ 360) × π × r² ; arc = (n ÷ 360) × 2 × π × r',
    'Un secteur a un rayon de 6 cm et un angle de 60°. Trouve son aire',
    ['Fraction du disque : 60 ÷ 360 = 1/6', 'Aire du disque : π × 6² = 36π', 'Secteur : 36π ÷ 6 = 6π ≈ 18,85 cm²'],
    '6π ≈ 18,85 cm²', () => [Math.round(60 / 360 * Math.PI * 36 * 100) / 100, 18.85]),
  qc_s2_geo_02: L(
    ['Imagine qu’on déplie le solide à plat : c’est son développement.', 'L’aire latérale, c’est la somme des faces sur les côtés. L’aire totale ajoute les bases.', 'Pour un prisme droit, le tour se calcule d’un coup : périmètre de la base × hauteur.'],
    'Prisme : A latérale = P base × h ; cylindre : A latérale = 2πr × h ; A totale = A latérale + 2 × A base',
    'Un prisme droit a une base rectangulaire de 5 cm sur 3 cm et une hauteur de 4 cm. Trouve son aire totale',
    ['Périmètre de la base : 2 × (5 + 3) = 16 cm', 'Aire latérale : 16 × 4 = 64 cm²', 'Deux bases : 2 × (5 × 3) = 30 cm²', 'Aire totale : 64 + 30 = 94 cm²'],
    '94 cm²', () => [2 * (5 * 3 + 5 * 4 + 3 * 4), 94]),
  qc_s2_geo_03: L(
    ['Quand une droite (la sécante) coupe deux droites parallèles, plusieurs angles sont pareils.', 'Les angles correspondants, alternes-internes et alternes-externes sont isométriques (de même mesure), comme les angles opposés par le sommet.', 'Deux angles côte à côte sur une droite font 180°.'],
    'Correspondants = alternes-internes = alternes-externes = opposés par le sommet ; adjacents sur une droite : somme de 180°',
    'Deux parallèles sont coupées par une sécante. Un angle mesure 65°. Trouve son alterne-interne et son voisin sur la même droite',
    ['Alterne-interne : même mesure, 65°', 'Voisin sur la droite : supplémentaire, 180° − 65° = 115°'],
    '65° et 115°', () => [180 - 65, 115]),
  qc_s2_prb_01: L(
    ['Pour une suite de tirages, on multiplie les probabilités le long de la branche de l’arbre.', 'Sans remise, ce qu’on a pigé n’est plus dans le sac : le nombre total baisse à chaque tirage.'],
    'P(A puis B) = P(A) × P(B sachant A) ; sans remise : on enlève 1 au total (et à la couleur pigée)',
    'Un sac contient 3 billes rouges et 2 bleues. On en pige 2 sans remise. Probabilité d’avoir 2 rouges?',
    ['1re pige : 3 rouges sur 5 → 3/5', '2e pige : il reste 2 rouges sur 4 → 2/4', '3/5 × 2/4 = 6/20 = 3/10', '(Avec remise, ce serait 3/5 × 3/5 = 9/25)'],
    '3/10', () => [3 / 5 * 2 / 4, 3 / 10]),
};

export const leconOf = id => LECONS[id] || null;
