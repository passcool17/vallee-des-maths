// Vérification exacte des réponses : rationnels, virgule ou point, négatifs, %, $ et espaces tolérés.
import { F, eq, sub, toNumber, div, fromDecimalString } from './frac.js';

export function normalize(str) {
  return String(str ?? '').trim().replace(/[\u2212\u2013\u2014]/g, '-').replace(/\s+/g, '').replace(/[%$°]/g, '').replace(/^\+/, '');
}
// → F ou null
export function parseAnswer(str) {
  const s = normalize(str);
  if (!s) return null;
  const parts = s.split('/');
  if (parts.length > 2) return null;
  const a = fromDecimalString(parts[0]);
  if (!a) return null;
  if (parts.length === 1) return a;
  const b = fromDecimalString(parts[1]);
  if (!b || b.n === 0) return null;
  return div(a, b);
}
const isReducedForm = str => { // "6/8" n'est pas réduit ; "3/4", "0,75" ou un entier le sont
  const s = normalize(str); const p = s.split('/'); if (p.length !== 2) return true;
  const a = fromDecimalString(p[0]), b = fromDecimalString(p[1]);
  if (!a || !b || a.d !== 1 || b.d !== 1) return false;
  const g = (x, y) => { x = Math.abs(x); y = Math.abs(y); while (y) [x, y] = [y, x % y]; return x; };
  return g(a.n, b.n) === 1 && b.n > 0;
};
export function checkField(input, spec) {
  const v = parseAnswer(input);
  if (!v) return { ok: false, empty: normalize(input) === '', msg: normalize(input) === '' ? 'Écris une réponse.' : 'Je ne comprends pas cette écriture.' };
  if (spec.tol != null) return { ok: Math.abs(toNumber(v) - toNumber(spec.value)) <= spec.tol + 1e-9 };
  if (!eq(v, spec.value)) return { ok: false };
  if (spec.irreducible && !isReducedForm(input)) return { ok: false, near: true, msg: 'C’est équivalent… mais tu peux encore réduire !' };
  return { ok: true };
}
// inputs : string[] (un par champ) ou index du choix
export function checkAnswer(inputs, answer) {
  if (answer.kind === 'choice') return { ok: inputs === answer.correct };
  const res = answer.fields.map((f, i) => checkField(inputs[i], f));
  const bad = res.find(r => !r.ok);
  if (!bad) return { ok: true };
  if (res.some(r => r.empty)) return { ok: false, empty: true, msg: 'Remplis toutes les cases.' };
  if (res.every(r => r.ok || r.near)) return { ok: false, near: true, msg: res.find(r => r.near).msg };
  return { ok: false, msg: bad.msg };
}
export { sub };
