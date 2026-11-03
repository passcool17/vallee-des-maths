// Sauvegarde locale (localStorage), avec valeurs par défaut pour les vieilles sauvegardes.
export const KEY = 'vdm.save.v1';
export function newState(seed = (Math.random() * 1e9) | 0) {
  return {
    v: 1, seed, money: 2500, tools: { canne: 0, arrosoir: 0, filet: 0, pelle: 0, sac: 0 }, upg: {},
    mastery: {}, bag: [], decor: [], bridges: { bleuets: false, erables: false },
    pos: { x: 2, z: 6 }, clock: 0.3, exCount: 0, muted: false, met: {}, journal: { fish: 0, bugs: 0, finds: 0, coins: 0, flowers: 0 },
  };
}
const store = () => { try { return globalThis.localStorage || null; } catch { return null; } };
export function load(seed) {
  const s = store(); let raw = null;
  try { raw = s && JSON.parse(s.getItem(KEY)); } catch { raw = null; }
  if (!raw || raw.v !== 1) return newState(seed);
  const base = newState(raw.seed ?? seed);
  return { ...base, ...raw, tools: { ...base.tools, ...raw.tools }, bridges: { ...base.bridges, ...raw.bridges }, journal: { ...base.journal, ...raw.journal } };
}
export function save(state) { const s = store(); try { s && s.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; } }
export function reset() { const s = store(); try { s && s.removeItem(KEY); } catch { /* rien */ } }
