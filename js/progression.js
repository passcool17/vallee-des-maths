// Progression : maîtrise des compétences, déblocage par préalables, améliorations d’outils.
import { SKILLS, prereqsOf, skillById } from './math/skills.js';

export const MASTERY = 3; // bonnes réponses pour maîtriser une compétence
export const TOOLS = [
  { id: 'canne', nom: 'Canne à pêche', icone: '🎣', skills: ['qc_s1_ari_01', 'qc_s1_ari_02', 'qc_s1_pro_01'] },
  { id: 'arrosoir', nom: 'Arrosoir', icone: '🚿', skills: ['qc_s1_geo_01', 'qc_s1_geo_02', 'qc_s1_geo_03'] },
  { id: 'filet', nom: 'Filet à papillons', icone: '🦋', skills: ['qc_s1_prb_01', 'qc_s1_prb_02', 'qc_s1_sta_01'] },
  { id: 'pelle', nom: 'Pelle', icone: '⛏️', skills: ['qc_s1_alg_01', 'qc_s1_alg_02', 'qc_s1_alg_03'] },
  { id: 'sac', nom: 'Sac', icone: '🎒', skills: ['qc_s1_ari_03', 'qc_s1_ari_04', 'qc_s1_ari_06'] },
];
export const toolById = id => TOOLS.find(t => t.id === id);
// Compétences hors outils : accessibles par les défis de Flocon.
export const DEFI_SKILLS = SKILLS.map(s => s.id).filter(id => !TOOLS.some(t => t.skills.includes(id)));

// Effets concrets de chaque niveau d’outil
const STATS = {
  canne: [{ wait: [6, 10], window: 1.0, rare: 0 }, { wait: [4, 7], window: 1.3, rare: 0.05 }, { wait: [3, 5], window: 1.6, rare: 0.12 }, { wait: [2, 3.5], window: 2.0, rare: 0.22 }],
  arrosoir: [{ beds: 1, coins: 50 }, { beds: 2, coins: 75 }, { beds: 3, coins: 100 }, { beds: 4, coins: 150 }],
  filet: [{ reach: 1.6, chance: 0.5 }, { reach: 2.2, chance: 0.65 }, { reach: 2.8, chance: 0.8 }, { reach: 3.4, chance: 0.95 }],
  pelle: [{ luck: 0 }, { luck: 1 }, { luck: 2 }, { luck: 3 }],
  sac: [{ cap: 4 }, { cap: 8 }, { cap: 12 }, { cap: 20 }],
};
export const stats = (toolId, level) => STATS[toolId][Math.max(0, Math.min(3, level))];
export const BENEFITS = {
  canne: ['Les poissons mordent plus vite', 'Plus de temps pour ferrer', 'Plus de touches rares (esturgeon jaune!)'],
  arrosoir: ['Arrose 2 plates-bandes d’un coup', 'Arrose 3 plates-bandes, fleurs plus payantes', '4 plates-bandes, fleurs encore plus payantes'],
  filet: ['Attrape de plus loin', 'Attrape plus souvent', 'Presque à tout coup'],
  pelle: ['Trouvailles meilleures', 'Trouvailles encore meilleures', 'Les meilleures trouvailles (fossiles !)'],
  sac: ['8 places', '12 places', '20 places'],
};

const m = (state, id) => state.mastery[id] || (state.mastery[id] = { ok: 0, tries: 0, miss: 0 });
export const isMastered = (state, id) => (state.mastery[id]?.ok || 0) >= MASTERY;
export const isUnlocked = (state, id) => prereqsOf(id, 'hard').every(p => isMastered(state, p));
export const missingPrereqs = (state, id) => prereqsOf(id, 'hard').filter(p => !isMastered(state, p));

export function nextUpgrade(state, toolId) {
  const t = toolById(toolId), level = state.tools[toolId] || 0;
  if (level >= 3) return null;
  const skill = t.skills[level];
  return { skill, level: level + 1, unlocked: isUnlocked(state, skill), missing: missingPrereqs(state, skill), progress: state.upg[toolId] || 0, benefit: BENEFITS[toolId][level] };
}

// Difficulté adaptée : 0 pour la 1re réponse, 1 ensuite, 2 une fois maîtrisée.
export function difficultyFor(state, id) { const ok = state.mastery[id]?.ok || 0; return ok === 0 ? 0 : ok < MASTERY ? 1 : 2; }

// Enregistre une réponse. ctx = { tool?, near? }. Retourne ce qui vient de se passer.
export function recordAnswer(state, id, ok, ctx = {}) {
  const s = m(state, id); s.tries++;
  const out = { mastered: false, upgraded: null, warmup: null };
  if (ok) {
    const before = s.ok >= MASTERY; s.ok++; s.miss = 0;
    out.mastered = !before && s.ok >= MASTERY;
    if (ctx.tool) {
      const up = nextUpgrade(state, ctx.tool);
      if (up && up.skill === id) {
        state.upg[ctx.tool] = (state.upg[ctx.tool] || 0) + 1;
        if (state.upg[ctx.tool] >= MASTERY) { state.tools[ctx.tool] = up.level; state.upg[ctx.tool] = 0; out.upgraded = { tool: ctx.tool, level: up.level }; }
      }
    }
  } else if (!ctx.near) {
    s.miss++;
    if (s.miss >= 2) { out.warmup = warmupFor(id, state); s.miss = 0; }
  }
  return out;
}

// Réchauffement : préalable fort, sinon préalable faible, sinon même compétence au niveau 0.
export function warmupFor(id, state) {
  const hard = prereqsOf(id, 'hard'), soft = prereqsOf(id, 'soft');
  const pick = list => (state ? list.slice().sort((a, b) => (state.mastery[a]?.ok || 0) - (state.mastery[b]?.ok || 0)) : list)[0];
  if (hard.length) return { skill: pick(hard), d: 0, why: 'préalable' };
  if (soft.length) return { skill: pick(soft), d: 0, why: 'préalable' };
  return { skill: id, d: 0, why: 'plus simple' };
}

// Défis de Flocon : compétences débloquées, priorité à celles qui ne sont pas encore maîtrisées.
export function defiChoices(state) {
  const all = SKILLS.map(s => s.id).filter(id => isUnlocked(state, id));
  const notM = all.filter(id => !isMastered(state, id));
  const pref = notM.filter(id => DEFI_SKILLS.includes(id) || TOOLS.some(t => nextUpgrade(state, t.id)?.missing.includes(id)));
  return [...new Set([...pref, ...notM, ...all])];
}
export const masteryCount = state => SKILLS.filter(s => isMastered(state, s.id)).length;
export { skillById };
