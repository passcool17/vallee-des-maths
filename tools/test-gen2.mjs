// Tests des générateurs de secondaire 2 : 200 graines × 3 niveaux × 12 compétences, oracles indépendants
// (flottants, force brute, géométrie), formes équivalentes (π, 3,14, vraie valeur de π, point, fraction).
import { makeExercise, canonical, GEN2 } from '../js/math/gen.js';
import { SKILLS2, sec1Prereqs, prereqsOf, skillById } from '../js/math/skills.js';
import { checkAnswer, checkField } from '../js/math/check.js';
import { F, fmt } from '../js/math/frac.js';

const N = x => (x && typeof x === 'object' && 'n' in x) ? x.n / x.d : x;
const near = (a, b, t = 1e-9) => Math.abs(N(a) - N(b)) <= t;
const brute = (f, lo = -100, hi = 100) => { for (let x = lo; x <= hi; x++) if (f(x)) return x; return NaN; };
const draws = (R, B, replace) => { const bag = [...Array(R).fill('R'), ...Array(B).fill('B')]; const out = [];
  for (let i = 0; i < bag.length; i++) for (let j = 0; j < bag.length; j++) if (replace || i !== j) out.push(bag[i] + bag[j]); return out; };
// Mesure géométrique de l’angle q (rayons : droite 0°, sécante vers le haut phi, gauche 180°, sécante vers le bas 180 + phi)
const angleAt = (q, phi) => { const pos = (q - 1) % 4; return [180 - phi, phi, phi, 180 - phi][pos]; };
const ORACLE = {
  qc_s2_ari_01: D => [D.mode === 'div' ? (D.a / D.b) / (D.c / D.d) : D.mode === 'addmul' ? (D.a / D.b + D.c / D.d) * D.f / D.g : (D.a / D.b) / (D.c / D.d) - D.f / D.g],
  qc_s2_pro_01: D => [D.mode === 'whole' ? D.V * 100 / D.p : D.mode === 'tax' ? D.P * 1.14975 / 100 : D.A / (1 + (D.up ? D.p : -D.p) / 100)],
  qc_s2_pro_02: D => D.mode === 'prop' ? [D.pos === 0 ? D.a * D.c / D.b : D.b * D.c / D.a] : D.mode === 'inv' ? [D.n1 * D.t1 / D.n2] : 'choice:kind',
  qc_s2_pro_03: D => [D.mode === 'map' ? D.cm * D.k / 100 / (D.km ? 1000 : 1) : D.mode === 'sim' ? (D.big ? D.L * D.kd / D.kn : D.L * D.kn / D.kd) : D.A * (D.kn / D.kd) ** 2],
  qc_s2_alg_01: D => D.mode === 'dev' ? [D.a * D.b, D.a * D.c] : D.mode === 'devsub' ? [(x => D.a * (x + D.b) - D.c * (x + D.d))(1) - (x => D.a * (x + D.b) - D.c * (x + D.d))(0), D.a * D.b - D.c * D.d] : 'choice:reduce',
  qc_s2_alg_04: D => D.mode === 'gcf' ? [brute(m => D.A % m === 0 && D.B % m === 0 && ![...Array(100)].some((_, k) => k + 1 > m && D.A % (k + 1) === 0 && D.B % (k + 1) === 0), 1, 100)]
    : D.mode === 'mental' ? [D.a * D.b + D.a * D.c]
    : (() => { const g = brute(m => D.A % m === 0 && D.B % m === 0 && ![...Array(100)].some((_, k) => k + 1 > m && D.A % (k + 1) === 0 && D.B % (k + 1) === 0), 1, 100); return [g, D.A / g, D.B / g]; })(),
  qc_s2_alg_02: D => [D.mode === 'eq' ? brute(x => D.a * x + D.b === D.c * x + D.d) : D.mode === 'tarif' ? brute(h => D.f1 + D.r1 * h === D.f2 + D.r2 * h, 0, 200) : brute(x => D.a * (x + D.b) === D.c * x + D.d)],
  qc_s2_alg_03: D => { const a = (D.ys[1] - D.ys[0]) / (D.xs[1] - D.xs[0]), b = D.ys[0] - a * D.xs[0]; return D.mode === 'val' ? [a * D.N + b] : D.mode === 'rule' ? [a, b] : 'choice:rule'; },
  qc_s2_geo_01: D => [D.mode === 'disk' ? D.r * D.r : D.mode === 'sector' ? D.deg / 360 * D.r * D.r : D.deg / 360 * 2 * D.r],
  qc_s2_geo_02: D => [D.mode === 'prism' ? 2 * (D.L * D.l + D.L * D.h + D.l * D.h) : D.mode === 'cylL' ? 2 * D.r * D.h : D.mode === 'cylT' ? 2 * D.r * D.r + 2 * D.r * D.h : D.c * D.c + 4 * D.c * D.a / 2],
  qc_s2_geo_03: D => D.mode === 'pair' ? 'choice:pair' : D.mode === 'value' ? [angleAt(D.m, D.phi)] : [brute(x => { const vk = D.a * x + D.b, vm = D.c * x + D.e; return vk === angleAt(D.k, D.phi) && vm === angleAt(D.m, D.phi); }, -100, 200)],
  qc_s2_prb_01: D => { const all = draws(D.R, D.B, D.mode === 'avec'); const fav = all.filter(s => D.ev === 'RR' ? s === 'RR' : D.ev === 'RB' ? s === 'RB' || s === 'BR' : s.includes('R')); return [fav.length / all.length]; },
};
const parseLin = c => { const m = c.replace(/^y = /, '').replace(/−/g, '-').replace(/ /g, '').match(/^(-?\d*)x([+-]\d+)?$/) || c.replace(/^y = /, '').replace(/−/g, '-').replace(/ /g, '').match(/^()()(-?\d+)$/); if (!m) return null;
  if (m[3] !== undefined && m[1] === '' && !c.includes('x')) return [0, +m[3]]; return [m[1] === '' ? 1 : m[1] === '-' ? -1 : +m[1], +(m[2] || 0)]; };
const JUDGE = {
  kind: (D, c) => { const q = D.xs.map((x, i) => D.ys[i] / x), p = D.xs.map((x, i) => D.ys[i] * x); const k = q.every(v => near(v, q[0])) ? 'proportionnelle directe' : p.every(v => near(v, p[0])) ? 'proportionnelle inverse' : 'ni l’une ni l’autre'; return c === k; },
  reduce: (D, c) => { const L = parseLin(c); return !!L && [-3, 0, 1, 5].every(x => L[0] * x + L[1] === D.a * (D.b * x + D.c) + D.e * x); },
  rule: (D, c) => { const L = parseLin(c); return !!L && D.xs.every((x, i) => L[0] * x + L[1] === D.ys[i]); },
  pair: (D, c) => { const [i, j] = [Math.min(D.i, D.j), Math.max(D.i, D.j)]; const top = q => q <= 4, left = q => q % 2 === 1, upper = q => (q - 1) % 4 < 2;
    const sameX = top(i) === top(j); if (sameX) return c === (left(i) !== left(j) && upper(i) !== upper(j) ? 'opposés par le sommet' : '?');
    if (left(i) === left(j) && upper(i) === upper(j)) return c === 'correspondants';
    if (left(i) !== left(j) && upper(i) !== upper(j)) { const internal = q => (top(q) ? !upper(q) : upper(q)); return c === (internal(i) && internal(j) ? 'alternes-internes' : !internal(i) && !internal(j) ? 'alternes-externes' : '?'); }
    return false; },
};
const piNum = (c, places, pi) => (Math.round(N(c) * pi * 10 ** places) / 10 ** places).toFixed(places);

export function run(ok) {
  ok('12 générateurs S2', Object.keys(GEN2).length === 12 && SKILLS2.every(s => GEN2[s.id] && skillById(s.id)), Object.keys(GEN2).length);
  ok('préalables S2 → S1 pour chaque compétence', SKILLS2.every(s => sec1Prereqs(s.id).length >= 1 && sec1Prereqs(s.id).every(p => p.startsWith('qc_s1_'))));
  ok('préalables S2 existent', SKILLS2.every(s => prereqsOf(s.id).every(p => skillById(p))));
  for (const s of SKILLS2) for (const d of [0, 1, 2]) {
    let bad = 0; const prompts = new Set();
    for (let seed = 1; seed <= 200; seed++) {
      const tag = `${s.id} d${d} s${seed}`;
      let e; try { e = makeExercise(s.id, seed, d); } catch (err) { ok(tag + ' génère', false, err.stack); bad++; continue; }
      prompts.add(e.prompt + (e.figure || ''));
      const txt = e.prompt + e.hints.join(' ') + JSON.stringify(e.answer.choices || []) + (e.figure || '') + JSON.stringify(e.table || []);
      if (!ok(tag + ' texte propre', !/undefined|NaN|Infinity|\[object|\$\{|\+ −|− −|\+ -|(^|[^\d,])[01]x|(^|[\s(:])-\d/.test(txt) && e.hints.length === 3, e.prompt + ' || ' + e.hints.join(' | '))) bad++;
      if (e.answer.kind === 'choice') {
        const { choices, correct } = e.answer;
        ok(tag + ' choix uniques', new Set(choices).size === choices.length && choices.length >= 3 && correct >= 0, JSON.stringify(choices));
        ok(tag + ' bonne réponse acceptée', checkAnswer(correct, e.answer).ok);
        ok(tag + ' mauvaise refusée', !checkAnswer((correct + 1) % choices.length, e.answer).ok);
        const o = ORACLE[s.id](e.data), j = JUDGE[String(o).split(':')[1]];
        if (!ok(tag + ' oracle QCM', j && j(e.data, choices[correct]) && choices.filter(c => j(e.data, c)).length === 1, JSON.stringify(choices) + JSON.stringify(e.data))) bad++;
        continue;
      }
      const fs = e.answer.fields, o = ORACLE[s.id](e.data);
      if (!ok(tag + ' oracle', Array.isArray(o) && o.length === fs.length && fs.every((f, i) => Math.abs(N(f.value) - o[i]) <= (f.tol ?? 1e-6)), `${canonical(e.answer)} vs ${o} ${JSON.stringify(e.data)}`)) bad++;
      const canon = canonical(e.answer).split(' ; ');
      ok(tag + ' canonique', checkAnswer(canon, e.answer).ok, canon.join('|'));
      if (fs.some(f => f.pi)) {
        const f = fs[0];
        ok(tag + ' π ≈ 3,14 (virgule)', checkField(piNum(f.value, f.places, 3.14).replace('.', ','), f).ok, piNum(f.value, f.places, 3.14));
        ok(tag + ' π exact arrondi (point)', checkField(piNum(f.value, f.places, Math.PI), f).ok, piNum(f.value, f.places, Math.PI));
        ok(tag + ' forme fraction · π', checkField(`${f.value.n * 2}/${f.value.d * 2}π`, f).ok);
        ok(tag + ' « pi » au clavier', checkField(`${f.value.n}pi/${f.value.d}`, f).ok);
        ok(tag + ' faux refusé (π)', !checkField(`${f.value.n + f.value.d}π/${f.value.d}`, f).ok && !checkField(piNum(F(f.value.n + f.value.d, f.value.d), f.places, 3.14), f).ok);
        continue;
      }
      ok(tag + ' point décimal', checkAnswer(canon.map(c => c.replace(',', '.')), e.answer).ok);
      ok(tag + ' fraction', checkAnswer(fs.map(f => `${f.value.n}/${f.value.d}`), e.answer).ok);
      const dbl = fs.map(f => `${f.value.n * 2}/${f.value.d * 2}`); ok(tag + ' équivalent', checkAnswer(dbl, e.answer).ok);
      const wrong = fs.map((f, i) => i === 0 ? fmt(F(f.value.n + f.value.d, f.value.d)) : fmt(f.value));
      ok(tag + ' faux refusé', !checkAnswer(wrong, e.answer).ok);
    }
    ok(`${s.id} d${d} variété`, prompts.size >= 10, prompts.size);
  }
  // π : formes demandées
  const sp = { value: F(9), pi: true, places: 2 };
  for (const x of ['9π', '9 π', 'π×9', '9pi', '28,26', '28.26', '28,27', '28.27', '18π/2']) ok(`π accepté : ${x}`, checkField(x, sp).ok);
  for (const x of ['28', '9', 'π', '28,5', '3π']) ok(`π refusé : ${x}`, !checkField(x, sp).ok);
  ok('π presque : 28,3 → arrondis', checkField('28,3', sp).near === true);
  const s2 = { value: F(3, 4), pi: true, places: 2 };
  for (const x of ['3π/4', '3/4π', '0,75π', '2,36', '2.36', '2,355']) ok(`3π/4 accepté : ${x}`, checkField(x, s2).ok);
  ok('π/2', checkField('π/2', { value: F(1, 2), pi: true, places: 2 }).ok && checkField('π', { value: F(1), pi: true, places: 2 }).ok);
  ok('reproductible S2', JSON.stringify(makeExercise('qc_s2_geo_03', 42, 2)) === JSON.stringify(makeExercise('qc_s2_geo_03', 42, 2)));
}
