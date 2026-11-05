// Questions pendant les actions (étape 2) : déclencheurs, choix de la compétence et de la difficulté, chrono, butin.
// Logique pure (aucun DOM) pour être testée en Node.
import { SKILLS, SKILLS2 } from './math/skills.js';
import { isUnlocked, difficultyFor, stats } from './progression.js';
import { pickAdaptive, missRate } from './adapt.js';

export const NIVEAUX = ['basique', 'standard', 'avancé'];
export const FRACTION_SKILLS = ['qc_s1_ari_03', 'qc_s1_ari_04', 'qc_s1_ari_05', 'qc_s1_ari_06'];
// Cabane : proportions (taux unitaire, proportion directe) + mesure la plus proche des volumes (unités SI, aires).
export const SAP_SKILLS = ['qc_s1_pro_01', 'qc_s1_pro_02', 'qc_s1_geo_02', 'qc_s1_geo_03'];
// Bleuetière : dénombrement + moyenne et étendue
export const BERRY_SKILLS = ['qc_s1_prb_01', 'qc_s1_sta_01'];
export const MAPLE_CHANCE = 0.33;
export const BERRY_CHANCE = 0.33;
export const STRETCH_CHANCE = 0.15, BUMP_CHANCE = 0.2;

// Chance qu’une touche soit « rare » : 25 % de base, jusqu’à ~40 % avec la canne niveau 3.
export const rareBiteChance = canneLevel => 0.25 + stats('canne', canneLevel).rare * 0.7;

// Butin selon la difficulté (clé d’objet du sac)
export const RARE_FISH = ['omble', 'maskinonge', 'esturgeon'];
export const SIROP = ['tire', 'sirop', 'coulee'];
export const BLEUETS = ['barquette', 'confiture', 'confiture_mamie'];
// Île de Secondaire 2 : gros doré (trophée), saumon atlantique, bar rayé
export const RARE_FISH2 = ['gros_dore', 'saumon', 'bar'];
export const loot = (kind, d, isle = 1) => {
  const i = Math.max(0, Math.min(2, d));
  if (kind === 'fish') return (isle === 2 ? RARE_FISH2 : RARE_FISH)[i];
  if (kind === 'berry') return BLEUETS[i];
  return SIROP[i]; // maple et sap
};

// Choisit la compétence et la difficulté. rng : { next(), chance(p), pick(list) }.
// isle = 2 : questions de secondaire 2 (pêche au quai de Bernard, érables rouges).
export function pickQuestion(state, kind, rng, isle = 1) {
  const pool = isle === 2 ? SKILLS2.map(s => s.id)
    : kind === 'maple' ? FRACTION_SKILLS
    : kind === 'sap' ? SAP_SKILLS
    : kind === 'berry' ? BERRY_SKILLS
    : SKILLS.map(s => s.id);
  const open = pool.filter(id => isUnlocked(state, id));
  const locked = pool.filter(id => !isUnlocked(state, id));
  if ((locked.length && rng.chance(STRETCH_CHANCE)) || !open.length) {
    const skill = rng.pick(locked.length ? locked : pool);
    return { skill, d: 0, stretch: true };
  }
  // Adaptatif : ~55 % vers ce que Camille rate le plus (dans le bassin permis de l’activité). Sinon, priorité douce
  // aux compétences pas encore maîtrisées : on pige deux fois et on garde la moins maîtrisée.
  const { skill, weak } = pickAdaptive(state, open, rng, list => { const a = rng.pick(list), b = rng.pick(list); return (state.mastery[a]?.ok || 0) <= (state.mastery[b]?.ok || 0) ? a : b; });
  let d = difficultyFor(state, skill);
  if (weak) { if ((missRate(state, skill) ?? 0) >= 0.5) d = Math.min(d, 1); } // on pratique ce qui accroche sans monter la marche
  else if (d < 2 && rng.chance(BUMP_CHANCE)) d++;
  return { skill, d, stretch: false, weak };
}

// Durée du chrono en secondes (généreuse)
export function timeFor(ex, { stretch = false } = {}) {
  const A = ex.answer;
  const extra = (A.kind === 'num' && (A.fields.length > 1 || A.fields.some(f => f.frac)) ? 5 : 0) + (A.kind === 'num' && A.fields.some(f => f.pi) ? 10 : 0) + (ex.figure || ex.table ? 5 : 0) + (stretch ? 5 : 0);
  return [20, 25, 30][ex.d] + extra;
}

// Chronomètre en temps de jeu : n’avance que si on l’appelle (la boucle ne l’appelle pas en pause).
export function makeTimer(total) {
  let left = total, done = false;
  return {
    get left() { return left; }, get total() { return total; }, get done() { return done; },
    tick(dt) { if (done) return false; left = Math.max(0, left - dt); if (left === 0) { done = true; return true; } return false; },
    stop() { done = true; },
  };
}

// Kiosque de Bernard : une pige par journée de jeu ; réussie → un appât rare (touche rare garantie sur l’île 2).
export const canKiosk = state => state.kiosk.day !== state.day;
export function kioskExercise(state, makeExercise, difficulty) {
  return makeExercise('qc_s2_prb_01', `kiosque-${state.seed}-${state.day}`, difficulty);
}
export function kioskDone(state, ok) { state.kiosk.day = state.day; if (ok) state.appats++; return state.appats; }
// Un appât rare est utilisé à la prochaine touche sur l’île 2.
export function useBait(state) { if (state.island !== 2 || state.appats <= 0) return false; state.appats--; return true; }
