// Hasard reproductible (mulberry32) : même graine → même exercice.
export function hashSeed(...parts) {
  let h = 2166136261 >>> 0;
  for (const ch of parts.join('|')) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}
export function makeRng(seed) {
  let a = (typeof seed === 'number' ? seed : hashSeed(seed)) >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
  const pick = arr => arr[Math.floor(next() * arr.length)];
  const shuffle = arr => { const r = arr.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  return { next, int, pick, shuffle, chance: p => next() < p, nz: (lo, hi) => { let v; do v = int(lo, hi); while (v === 0); return v; } };
}
