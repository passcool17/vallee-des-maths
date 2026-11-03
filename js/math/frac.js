// Rationnels exacts {n, d} (d > 0, réduits). Les nombres du jeu restent petits : des entiers JS suffisent.
export const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
export const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);
export function F(n, d = 1) {
  if (!Number.isInteger(n) || !Number.isInteger(d) || d === 0) throw new Error(`fraction invalide ${n}/${d}`);
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d); return { n: n / g || 0, d: d / g };
}
export const add = (a, b) => F(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a, b) => F(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a, b) => F(a.n * b.n, a.d * b.d);
export const div = (a, b) => F(a.n * b.d, a.d * b.n);
export const eq = (a, b) => a.n === b.n && a.d === b.d;
export const cmp = (a, b) => Math.sign(a.n * b.d - b.n * a.d);
export const toNumber = a => a.n / a.d;
export const isInt = a => a.d === 1;
// "2.5" ou "2,5" ou "-0.125" → F exact
export function fromDecimalString(s) {
  const m = /^(-?)(\d*)(?:[.,](\d+))?$/.exec(s);
  if (!m || (m[2] === '' && !m[3])) return null;
  const dec = m[3] || '', n = parseInt((m[2] || '0') + dec, 10), d = 10 ** dec.length;
  return F(m[1] ? -n : n, d);
}
// Écriture québécoise : virgule décimale si le dénominateur ne contient que 2 et 5 (≤ 4 décimales), sinon a/b
export function fmt(a, { asFraction = false } = {}) {
  if (a.d === 1) return String(a.n).replace('-', '−');
  let d = a.d, k = 0; while (d % 2 === 0) { d /= 2; k++; } let j = 0; while (d % 5 === 0) { d /= 5; j++; }
  if (!asFraction && d === 1 && Math.max(k, j) <= 4) return fmtDec(toNumber(a), Math.max(k, j));
  return `${a.n < 0 ? '−' : ''}${Math.abs(a.n)}/${a.d}`;
}
export function fmtDec(x, places) {
  const s = (Math.round(x * 10 ** places) / 10 ** places).toFixed(places);
  return s.replace('.', ',').replace('-', '−');
}
export const fmtFrac = a => fmt(a, { asFraction: true });
