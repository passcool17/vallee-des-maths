// Sauvegarde locale (localStorage), avec valeurs par défaut pour les vieilles sauvegardes.
export const KEY = 'vdm.save.v1';
export function newState(seed = (Math.random() * 1e9) | 0) {
  return {
    v: 2, seed, money: 2500, tools: { canne: 0, arrosoir: 0, filet: 0, pelle: 0, sac: 0 }, upg: {},
    mastery: {}, bag: [], decor: [], bridges: { bleuets: false, erables: false },
    pos: { x: 2, z: 6 }, clock: 0.3, exCount: 0, muted: false, met: {}, journal: { fish: 0, bugs: 0, finds: 0, coins: 0, flowers: 0, rare: 0, sirop: 0 },
    // Étape 2 : prises rares par type, devis gardés jusqu’à l’achat ou au jour suivant, compteur de jours
    rares: {}, quotes: {}, day: 0,
  };
}
const store = () => { try { return globalThis.localStorage || null; } catch { return null; } };
export function load(seed) {
  const s = store(); let raw = null;
  try { raw = s && JSON.parse(s.getItem(KEY)); } catch { raw = null; }
  if (!raw || typeof raw !== 'object' || !(raw.v === 1 || raw.v === 2)) return newState(seed);
  return normalize(raw, seed);
}
// Complète une sauvegarde (v1 de l’étape 1 ou v2) avec les valeurs par défaut ; ne perd rien.
export function normalize(raw, seed) {
  const base = newState(raw.seed ?? seed);
  const obj = x => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  return { ...base, ...raw, v: 2, tools: { ...base.tools, ...obj(raw.tools) }, upg: obj(raw.upg), mastery: obj(raw.mastery), bridges: { ...base.bridges, ...obj(raw.bridges) },
    journal: { ...base.journal, ...obj(raw.journal) }, rares: obj(raw.rares), quotes: obj(raw.quotes), day: Number.isFinite(raw.day) ? raw.day : 0,
    bag: Array.isArray(raw.bag) ? raw.bag : [], decor: Array.isArray(raw.decor) ? raw.decor : [], met: obj(raw.met) };
}
export function save(state) { const s = store(); try { s && s.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; } }
export function reset() { const s = store(); try { s && s.removeItem(KEY); } catch { /* rien */ } }
