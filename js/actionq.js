// Questions pendant les actions (étape 2) : déclencheurs, choix de la compétence et de la difficulté, chrono, butin.
// Logique pure (aucun DOM) pour être testée en Node.
import { SKILLS } from './math/skills.js';
import { isUnlocked, difficultyFor, stats } from './progression.js';

export const NIVEAUX = ['basique', 'standard', 'avancé'];
export const FRACTION_SKILLS = ['qc_s1_ari_03', 'qc_s1_ari_04', 'qc_s1_ari_05', 'qc_s1_ari_06'];
export const MAPLE_CHANCE = 0.33;
export const STRETCH_CHANCE = 0.15, BUMP_CHANCE = 0.2;

// Chance qu’une touche soit « rare » : 25 % de base, jusqu’à ~40 % avec la canne niveau 3.
export const rareBiteChance = canneLevel => 0.25 + stats('canne', canneLevel).rare * 0.7;

// Butin selon la difficulté (clé d’objet du sac)
export const RARE_FISH = ['omble', 'maskinonge', 'esturgeon'];
export const SIROP = ['tire', 'sirop', 'coulee'];
export const loot = (kind, d) => (kind === 'fish' ? RARE_FISH : SIROP)[Math.max(0, Math.min(2, d))];

// Choisit la compétence et la difficulté. rng : { next(), chance(p), pick(list) }.
export function pickQuestion(state, kind, rng) {
  const pool = kind === 'maple' ? FRACTION_SKILLS : SKILLS.map(s => s.id);
  const open = pool.filter(id => isUnlocked(state, id));
  const locked = pool.filter(id => !isUnlocked(state, id));
  if ((locked.length && rng.chance(STRETCH_CHANCE)) || !open.length) {
    const skill = rng.pick(locked.length ? locked : pool);
    return { skill, d: 0, stretch: true };
  }
  // Priorité douce aux compétences pas encore maîtrisées : on pige deux fois et on garde la moins maîtrisée.
  const a = rng.pick(open), b = rng.pick(open);
  const skill = (state.mastery[a]?.ok || 0) <= (state.mastery[b]?.ok || 0) ? a : b;
  let d = difficultyFor(state, skill);
  if (d < 2 && rng.chance(BUMP_CHANCE)) d++;
  return { skill, d, stretch: false };
}

// Durée du chrono en secondes (généreuse)
export function timeFor(ex, { stretch = false } = {}) {
  const A = ex.answer;
  const extra = (A.kind === 'num' && (A.fields.length > 1 || A.fields.some(f => f.frac)) ? 5 : 0) + (stretch ? 5 : 0);
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
