// Sauvegarde locale (localStorage), avec valeurs par défaut pour les vieilles sauvegardes.
export const KEY = 'vdm.save.v1';
export function newState(seed = (Math.random() * 1e9) | 0) {
  return {
    v: 4, seed, money: 2500, tools: { canne: 0, arrosoir: 0, filet: 0, pelle: 0, sac: 0 }, upg: {},
    mastery: {}, bag: [], decor: [], bridges: { bleuets: false, erables: false },
    pos: { x: 2, z: 6 }, clock: 0.3, exCount: 0, muted: false, met: {}, journal: { fish: 0, bugs: 0, finds: 0, coins: 0, flowers: 0, rare: 0, sirop: 0 },
    // Étape 2 : prises rares par type, devis gardés jusqu’à l’achat ou au jour suivant, compteur de jours
    rares: {}, quotes: {}, day: 0,
    // Secondaire 2 : île courante, traversier, phare, appâts rares, kiosque de Bernard
    island: 1, ferry: false, phare: { step: 0, done: false }, appats: 0, kiosk: { day: -1 },
    // v4 : statistiques par compétence pour le carnet et les questions adaptatives ; dernières compétences pigées
    stats: {}, recentQ: [],
  };
}
const store = () => { try { return globalThis.localStorage || null; } catch { return null; } };
export function load(seed) {
  const s = store(); let raw = null;
  try { raw = s && JSON.parse(s.getItem(KEY)); } catch { raw = null; }
  if (!raw || typeof raw !== 'object' || ![1, 2, 3, 4].includes(raw.v)) return newState(seed);
  return normalize(raw, seed);
}
// Complète une sauvegarde (v1 de l’étape 1, v2 de l’étape 2, v3 de l’île 2 ou v4) avec les valeurs par défaut ; ne perd rien.
// v1–v3 → v4 : les statistiques sont reconstruites à partir de la maîtrise (essais, bonnes réponses), sans historique récent.
export function normalize(raw, seed) {
  const base = newState(raw.seed ?? seed);
  const obj = x => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  const ph = obj(raw.phare);
  return { ...base, ...raw, v: 4, stats: statsFrom(raw), recentQ: Array.isArray(raw.recentQ) ? raw.recentQ.filter(x => typeof x === 'string').slice(-4) : [], island: raw.island === 2 ? 2 : 1, ferry: !!raw.ferry, appats: Number.isFinite(raw.appats) ? Math.max(0, raw.appats) : 0,
    phare: { step: Math.max(0, Math.min(3, Number.isFinite(ph.step) ? ph.step : 0)), done: !!ph.done, redo: Number.isFinite(ph.redo) ? ph.redo : 0 }, kiosk: { day: Number.isFinite(obj(raw.kiosk).day) ? raw.kiosk.day : -1 }, tools: { ...base.tools, ...obj(raw.tools) }, upg: obj(raw.upg), mastery: obj(raw.mastery), bridges: { ...base.bridges, ...obj(raw.bridges) },
    journal: { ...base.journal, ...obj(raw.journal) }, rares: obj(raw.rares), quotes: obj(raw.quotes), day: Number.isFinite(raw.day) ? raw.day : 0,
    bag: Array.isArray(raw.bag) ? raw.bag : [], decor: Array.isArray(raw.decor) ? raw.decor : [], met: obj(raw.met) };
}
function statsFrom(raw) {
  const out = {}, st = raw.stats && typeof raw.stats === 'object' && !Array.isArray(raw.stats) ? raw.stats : {};
  for (const [id, s] of Object.entries(st)) if (s && Number.isFinite(s.n) && s.n > 0)
    out[id] = { n: s.n, ok: Math.max(0, Math.min(s.n, Number.isFinite(s.ok) ? s.ok : 0)), h: typeof s.h === 'string' ? s.h.replace(/[^01]/g, '').slice(-10) : '', ...(Number.isFinite(s.sec) ? { sec: s.sec } : {}) };
  const ms = raw.mastery && typeof raw.mastery === 'object' ? raw.mastery : {};
  for (const [id, m] of Object.entries(ms)) if (!out[id] && m && m.tries > 0) out[id] = { n: m.tries, ok: Math.min(m.tries, m.ok || 0), h: '' };
  return out;
}
export function save(state) { const s = store(); try { s && s.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; } }
export function reset() { const s = store(); try { s && s.removeItem(KEY); } catch { /* rien */ } }
