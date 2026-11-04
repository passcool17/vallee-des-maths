// Questions adaptatives : statistiques par compétence (bonnes/mauvaises réponses, temps) et pige pondérée
// vers ce que Camille rate le plus, sans oublier les autres. Logique pure (aucun DOM), testée en Node.
export const WINDOW = 10;      // on regarde les 10 dernières réponses d’une compétence
export const WEAK_SHARE = 0.55; // ~55 % des piges vont aux compétences « à pratiquer », le reste au hasard
export const MAX_STREAK = 2;   // jamais plus de 2 fois de suite la même compétence

// st.stats[id] = { n: réponses, ok: bonnes, h: '0110…' (10 dernières, 1 = bonne), sec: temps moyen (s) }
export function logAnswer(state, id, ok, sec) {
  const all = state.stats || (state.stats = {}), s = all[id] || (all[id] = { n: 0, ok: 0, h: '' });
  s.n++; if (ok) s.ok++; s.h = (s.h + (ok ? '1' : '0')).slice(-WINDOW);
  if (Number.isFinite(sec) && sec > 0) s.sec = Math.round((s.sec ? s.sec * 0.7 + sec * 0.3 : sec) * 10) / 10;
  return s;
}
// Taux d’erreur récent, lissé (une seule erreur ne vaut pas 100 %). null si jamais vue.
export function missRate(state, id) {
  const s = state.stats?.[id]; if (!s || !s.n) return null;
  const h = s.h || '', miss = h ? [...h].filter(c => c === '0').length : s.n - s.ok, n = h ? h.length : s.n;
  return (miss + 1) / (n + 2);
}
export const successRate = (state, id) => { const s = state.stats?.[id]; return s && s.n ? s.ok / s.n : null; };
// Compétences « à pratiquer » : déjà ratées, plus souvent ratées qu’une seule bonne réponse ne l’expliquerait.
export function weakList(state, ids, k = 3) {
  return ids.map(id => ({ id, r: missRate(state, id), n: state.stats?.[id]?.n || 0 })).filter(x => x.r !== null && x.r > 0.34)
    .sort((a, b) => b.r - a.r || b.n - a.n).slice(0, k).map(x => x.id);
}
// Pige une compétence parmi ids. pickOpen(list) = la pige « normale » de l’activité (garde ses propres règles).
export function pickAdaptive(state, ids, rng, pickOpen = list => rng.pick(list)) {
  const rec = state.recentQ || [], last = rec[rec.length - 1];
  const streak = rec.length >= MAX_STREAK && rec.slice(-MAX_STREAK).every(x => x === last);
  const pool = streak && ids.length > 1 ? ids.filter(x => x !== last) : ids;
  const weak = weakList(state, pool, Infinity);
  let skill, weakPick = false;
  if (weak.length && rng.chance(WEAK_SHARE)) {
    const w = weak.map(id => missRate(state, id) ** 2), tot = w.reduce((a, b) => a + b, 0);
    let x = rng.next() * tot, i = 0; while (i < weak.length - 1 && (x -= w[i]) > 0) i++;
    skill = weak[i]; weakPick = true;
  } else skill = pickOpen(pool);
  state.recentQ = [...rec, skill].slice(-4);
  return { skill, weak: weakPick };
}
