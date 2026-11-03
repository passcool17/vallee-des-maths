// Réparation du phare de Rosalie : 3 étapes liées (échelle du plan → aire latérale de la lanterne → aire de la lentille).
// phareSteps(seed) → [ex1, ex2, ex3] au même format que makeExercise (skill = compétence de secondaire 2 travaillée).
import { F, fmt, mul } from './math/frac.js';
import { makeRng, hashSeed } from './math/rng.js';

const n = x => fmt(typeof x === 'number' ? F(x) : x);
const PI_TXT = 'Arrondis au centième (π ≈ 3,14) ou réponds en fonction de π (ex. : 12π).';

export function phareData(seed) {
  const r = makeRng(hashSeed('phare', seed));
  const k = r.pick([50, 100, 200]);                 // échelle 1 : k
  const H = r.pick(k === 50 ? [8, 10, 12, 14] : k === 100 ? [9, 11, 12, 13, 15] : [12, 14, 16, 18]); // hauteur réelle (m)
  const rH = r.pick([2, 3, 4]), hH = r.pick([4, 5, 6]);  // rayon et hauteur de la lanterne en demi-mètres
  const D = r.pick([40, 50, 60, 70, 80]);           // diamètre de la lentille (cm)
  return { k, H, rH, hH, D, hp: F(H * 100, k), rp: F(rH * 50, k), hq: F(hH * 50, k) };
}

// Figure simple du phare sur le plan (cotes en cm)
export function phareSVG(p, step) {
  const on = i => (step === i ? ' on' : '');
  return `<svg class="fig" viewBox="0 0 240 162" role="img" aria-label="Plan du phare"><rect x="96" y="44" width="48" height="96" class="side${on(0)}"/>` +
    `<rect x="104" y="20" width="32" height="24" class="glass${on(1)}"/><polygon points="100,20 120,6 140,20"/>` +
    `<circle cx="120" cy="32" r="7" class="lens${on(2)}"/><line x1="84" y1="20" x2="84" y2="140"/>` +
    `<text x="80" y="84" text-anchor="end">${n(p.hp)} cm</text><text x="150" y="36">r = ${n(p.rp)} cm</text><text x="150" y="52">h = ${n(p.hq)} cm</text>` +
    `<text x="120" y="158" text-anchor="middle">Échelle 1 : ${p.k}</text></svg>`;
}

export function phareSteps(seed) {
  const p = phareData(seed), { k, H, rH, hH, D } = p;
  const num = (value, extra = {}) => ({ kind: 'num', fields: [{ value: typeof value === 'number' ? F(value) : value, ...extra }] });
  const lat = F(rH * hH, 2);                        // 2 × (rH/2) × (hH/2)
  const R = D / 2;
  return [
    { id: 'phare1', skill: 'qc_s2_pro_03', d: 1, step: 0, data: { mode: 'phare', ...p },
      prompt: `Étape 1 : Sur le plan de Rosalie (échelle 1 : ${k}), la tour du phare mesure ${n(p.hp)} cm. Quelle est sa hauteur réelle, en mètres ?`,
      answer: num(H, { unit: 'm', label: 'Hauteur' }), figure: phareSVG(p, 0),
      hints: [`1 cm sur le plan = ${k} cm en vrai.`, `${n(p.hp)} × ${k} = ${H * 100} cm.`, `Divise par 100 pour passer en mètres : ${H * 100} ÷ 100.`] },
    { id: 'phare2', skill: 'qc_s2_geo_02', d: 1, step: 1, data: { mode: 'phare', ...p },
      prompt: `Étape 2 : La lanterne vitrée est un cylindre. Sur le même plan, son rayon est ${n(p.rp)} cm et sa hauteur ${n(p.hq)} cm. Quelle aire de vitre faut-il, en m² (aire latérale réelle) ? ${PI_TXT}`,
      answer: num(lat, { pi: true, places: 2, unit: 'm²', label: 'Aire' }), figure: phareSVG(p, 1),
      hints: [`Passe d’abord aux vraies mesures avec l’échelle 1 : ${k}.`, `Rayon réel : ${n(F(rH, 2))} m ; hauteur réelle : ${n(F(hH, 2))} m.`, `Aire latérale = 2πrh = 2 × π × ${n(F(rH, 2))} × ${n(F(hH, 2))}.`] },
    { id: 'phare3', skill: 'qc_s2_geo_01', d: 1, step: 2, data: { mode: 'phare', ...p },
      prompt: `Étape 3 : La nouvelle lentille ronde a un diamètre de ${D} cm. Quelle est son aire, en cm² ? ${PI_TXT}`,
      answer: num(R * R, { pi: true, places: 2, unit: 'cm²', label: 'Aire' }), figure: phareSVG(p, 2),
      hints: ['Le rayon est la moitié du diamètre.', `r = ${R} cm.`, `A = πr² = π × ${R}² = ${R * R}π.`] },
  ];
}
// Valeur numérique attendue (pour les tests)
export const phareCheck = seed => { const p = phareData(seed); return [p.H, p.rH * p.hH / 2 * Math.PI, (p.D / 2) ** 2 * Math.PI]; };
