// Tests des générateurs : 200 graines × 3 niveaux × 22 compétences, avec des oracles indépendants.
import { GEN, makeExercise, canonical } from '../js/math/gen.js';
import { SKILLS } from '../js/math/skills.js';
import { checkAnswer, parseAnswer } from '../js/math/check.js';
import { F, toNumber, gcd, lcm, fmt } from '../js/math/frac.js';

const N = x => (x && typeof x === 'object' && 'n' in x) ? x.n / x.d : x;
const near = (a, b, t = 1e-9) => Math.abs(N(a) - N(b)) <= t;
// Oracles : recalculent la réponse à partir de data, en flottant / force brute, sans réutiliser le générateur.
const ORACLE = {
  qc_s1_ari_01: D => [Function(`return ${D.js}`)()],
  qc_s1_ari_02: D => [{ '+': (a, b) => a + b, '−': (a, b) => a - b, '×': (a, b) => a * b, '÷': (a, b) => a / b }[D.op](N(D.a), N(D.b))],
  qc_s1_ari_03: D => D.mode === 'missing' ? [D.pp * D.k] : D.mode === 'reduce' ? [D.pp / D.q] : 'choice:equiv',
  qc_s1_ari_04: D => [D.ctx ? 1 - N(D.a) - N(D.b) : D.op === '+' ? N(D.a) + N(D.b) : N(D.a) - N(D.b)],
  qc_s1_ari_05: D => [D.ctx ? D.N / (D.a / D.b) : D.op === '×' ? N(D.a) * N(D.b) : N(D.a) / N(D.b)],
  qc_s1_ari_06: D => D.mode === 'pct' ? [D.pp / D.q * 100] : D.mode === 'frac' ? [N(D.v)] : D.mode === 'round' ? [Math.round(N(D.x) * 10 ** D.k) / 10 ** D.k] : 'choice:pct',
  qc_s1_ari_07: D => D.mode === 'pow' ? [D.a ** D.e] : D.mode === 'sqrt' ? [D.k] : D.mode === 'factor' ? (() => { let x = D.N; return [2, 3, 5].map(pr => { let c = 0; while (x % pr === 0) { x /= pr; c++; } return c; }); })()
    : D.mode === 'ppcm' ? [(() => { for (let m = 1; ; m++) if (m % D.a === 0 && m % D.b === 0) return m; })()] : [(() => { for (let m = Math.min(D.A, D.B); ; m--) if (D.A % m === 0 && D.B % m === 0) return m; })()],
  qc_s1_ari_08: D => D.mode === 'of' ? [D.pc * D.N / 100] : D.mode === 'rabais' ? [D.P / 100 * (1 - D.pc / 100)] : [D.A / D.B * 100],
  qc_s1_pro_01: D => D.mode === 'unit' ? [D.P / 100 / D.q] : D.mode === 'speed' ? [D.D / D.t] : 'choice:best',
  qc_s1_pro_02: D => D.mode === 'unit' ? [N(D.b) / D.a * D.N] : D.mode === 'table' ? [D.y1 / D.x1 * D.x2] : [N(D.q) / D.c * D.N],
  qc_s1_alg_01: D => D.mode === 'term' ? [D.a + (D.R - 1) * D.k] : D.mode === 'rank' ? [(() => { for (let n = 1; n < 500; n++) if (D.a + (n - 1) * D.k === D.T) return n; })()] : 'choice:rule',
  qc_s1_alg_02: D => D.mode === 'lin' ? [D.a * D.x + D.b] : D.mode === 'xy' ? [D.a * D.x - D.b * D.y] : [D.x ** 2 + D.b * D.x],
  qc_s1_alg_03: D => D.mode === 'xx' ? [D.a + D.b] : D.mode === 'mix' ? [D.a + D.c, D.b + D.e] : 'choice:dist',
  qc_s1_alg_04: D => [(() => { for (let x = -50; x <= 50; x++) { if (D.mode === 'add' && x + D.a === D.c) return x; if (D.mode === 'mul' && D.a * x === D.c) return x; if (D.mode === 'affine' && D.a * x + D.b === D.c) return x; if (D.mode === 'story' && D.k * x + D.extra === D.total) return x; } })()],
  qc_s1_prb_01: D => D.mode === 'ab' ? [D.a * D.b] : D.mode === 'abc' ? [D.a * D.b * D.c] : D.mode === 'code' ? [(() => { let c = 0; const tot = D.b ** D.k; for (let i = 0; i < tot; i++) c++; return c; })()] : [(() => { let c = 0; for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) if (i + j === D.S) c++; return c; })()],
  qc_s1_prb_02: D => D.mode === 'atleast' ? [(() => { let c = 0; for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) if (i + j >= D.S) c++; return c / 36; })()] : D.mode === 'bag' ? [D.R / (D.R + D.B)] : D.mode === 'die' ? [(() => { let c = 0; for (let i = 1; i <= D.f; i++) if (i % D.m === 0) c++; return c / D.f; })()] : [(() => { let c = 0; for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) if (i + j === D.S) c++; return c / 36; })()],
  qc_s1_sta_01: D => D.mode === 'range' ? [Math.max(...D.L) - Math.min(...D.L)] : D.mode === 'mean' ? [D.L.reduce((a, b) => a + b) / D.L.length] : [4 * D.M - D.L.reduce((a, b) => a + b)],
  qc_s1_geo_01: D => D.mode === 'tri' ? [180 - D.a - D.b] : D.mode === 'comp' ? [90 - D.a] : D.mode === 'supp' ? [180 - D.a] : D.mode === 'sides' ? 'choice:sides' : 'choice:angles',
  qc_s1_geo_02: D => D.mode === 'conv' ? [N(D.x) * 10 ** (D.j - D.i)] : D.mode === 'poly' ? [D.S.reduce((a, b) => a + N(b), 0)] : [2 * (N(D.L) * 100 + D.l)],
  qc_s1_geo_03: D => D.mode === 'rect' ? [D.b * D.h] : D.mode === 'tri' ? [D.b * D.h / 2] : D.mode === 'trap' ? [(D.B + D.b) * D.h / 2] : [D.D * D.dd / 2],
  qc_s1_geo_04: D => D.mode === 'circ' ? [3.14 * D.D] : D.mode === 'sum' ? [(D.k - 2) * 180] : D.mode === 'reg' ? [(D.k - 2) * 180 / D.k] : [D.R],
  qc_s1_geo_05: D => D.mode === 'quad' ? 'choice:quad' : D.mode === 'trans' ? [D.x + D.a, D.y + D.b] : D.axe === 'x' ? [D.x, -D.y] : [-D.x, D.y],
};
// Juges des QCM, indépendants du générateur.
const fracOf = s => { const [a, b] = s.split('/').map(Number); return a / b; };
const JUDGE = {
  equiv: (D, c) => near(fracOf(c), D.pp / D.q),
  pct: (D, c) => near(Number(c.includes('/') ? fracOf(c) : Number(c.replace(',', '.'))), D.pct / 100),
  best: (D, c) => c === (D.pa / D.qa < D.pb / D.qb ? 'Le format A' : 'Le format B'),
  rule: (D, c) => { const m = c.replace(/−/g, '-').replace(/ /g, '').match(/^(-?\d*)n([+-]\d+)?$/); if (!m) return false; const k = m[1] === '' ? 1 : m[1] === '-' ? -1 : +m[1], b = +(m[2] || 0); return [1, 2, 3, 4].every(n => k * n + b === D.a + (n - 1) * D.k); },
  dist: (D, c) => { const m = c.replace(/−/g, '-').replace(/ /g, '').match(/^(-?\d*)x([+-]\d+)?$/); if (!m) return false; const k = m[1] === '' ? 1 : m[1] === '-' ? -1 : +m[1], b = +(m[2] || 0); return [-2, 0, 1, 3].every(x => k * x + b === D.k * (x + D.m)); },
  sides: (D, c) => c === (new Set(D.sides).size === 1 ? 'équilatéral' : new Set(D.sides).size === 2 ? 'isocèle' : 'scalène'),
  angles: (D, c) => c === (Math.max(...D.A) === 90 ? 'rectangle' : Math.max(...D.A) > 90 ? 'obtusangle' : 'acutangle'),
  quad: (D, c) => c === (D.x > 0 ? (D.y > 0 ? '1er quadrant' : '4e quadrant') : (D.y > 0 ? '2e quadrant' : '3e quadrant')),
};

export function run(ok) {
  ok('22 générateurs', Object.keys(GEN).length === 22 && SKILLS.every(s => GEN[s.id]), Object.keys(GEN).length);
  for (const s of SKILLS) for (const d of [0, 1, 2]) {
    let bad = 0; const prompts = new Set();
    for (let seed = 1; seed <= 200; seed++) {
      const tag = `${s.id} d${d} s${seed}`;
      let e; try { e = makeExercise(s.id, seed, d); } catch (err) { ok(tag + ' génère', false, err.message); bad++; continue; }
      prompts.add(e.prompt);
      const txt = e.prompt + e.hints.join(' ') + JSON.stringify(e.answer.choices || []);
      if (!ok(tag + ' texte propre', !/undefined|NaN|Infinity|\[object|\$\{/.test(txt) && e.hints.length === 3, e.prompt)) bad++;
      if (e.answer.kind === 'choice') {
        const { choices, correct } = e.answer;
        ok(tag + ' choix uniques', new Set(choices).size === choices.length && choices.length >= 3 && correct >= 0, JSON.stringify(choices));
        ok(tag + ' bonne réponse acceptée', checkAnswer(correct, e.answer).ok);
        ok(tag + ' mauvaise refusée', !checkAnswer((correct + 1) % choices.length, e.answer).ok);
        const o = ORACLE[s.id](e.data); const j = JUDGE[String(o).split(':')[1]];
        if (!ok(tag + ' oracle QCM', j && j(e.data, choices[correct]) && choices.filter(c => j(e.data, c)).length === 1, JSON.stringify(choices))) bad++;
        continue;
      }
      const fs = e.answer.fields, o = ORACLE[s.id](e.data);
      if (!ok(tag + ' oracle', Array.isArray(o) && o.length === fs.length && fs.every((f, i) => near(f.value, o[i], f.tol ?? 1e-9)), `${canonical(e.answer)} vs ${o}`)) bad++;
      // la forme canonique, la forme à point et la forme fraction passent
      const canon = canonical(e.answer).split(' ; ');
      ok(tag + ' canonique', checkAnswer(canon, e.answer).ok, canon.join('|'));
      ok(tag + ' point décimal', checkAnswer(canon.map(c => c.replace(',', '.')), e.answer).ok);
      ok(tag + ' fraction', checkAnswer(fs.map(f => `${f.value.n}/${f.value.d}`), e.answer).ok);
      // forme équivalente non réduite : acceptée, sauf si irréductible exigée (alors « presque »)
      const dbl = fs.map(f => `${f.value.n * 2}/${f.value.d * 2}`); const r2 = checkAnswer(dbl, e.answer);
      ok(tag + ' équivalent', fs.some(f => f.irreducible) ? (!r2.ok && r2.near) : r2.ok, JSON.stringify(r2));
      // une réponse fausse est refusée
      const wrong = fs.map((f, i) => i === 0 ? fmt(F(f.value.n + f.value.d, f.value.d)) : fmt(f.value));
      ok(tag + ' faux refusé', !checkAnswer(wrong, e.answer).ok);
    }
    ok(`${s.id} d${d} variété`, prompts.size >= 10, prompts.size);
  }
  // équivalences demandées explicitement
  const ans = { kind: 'num', fields: [{ value: F(3, 4) }] };
  ok('6/8 = 3/4', checkAnswer(['6/8'], ans).ok); ok('0,75 = 3/4', checkAnswer(['0,75'], ans).ok);
  const ans2 = { kind: 'num', fields: [{ value: F(5, 2) }] };
  ok('2,5', checkAnswer(['2,5'], ans2).ok); ok('2.5', checkAnswer(['2.5'], ans2).ok); ok('5/2', checkAnswer(['5/2'], ans2).ok);
  ok('reproductible', JSON.stringify(makeExercise('qc_s1_ari_04', 42, 1)) === JSON.stringify(makeExercise('qc_s1_ari_04', 42, 1)));
}
