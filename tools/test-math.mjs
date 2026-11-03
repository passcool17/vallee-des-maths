// Tests unitaires des maths : node tools/test-math.mjs
import { F, eq, fmt, add, mul } from '../js/math/frac.js';
import { parseAnswer, checkAnswer, checkField } from '../js/math/check.js';
import { makeRng } from '../js/math/rng.js';
let pass = 0, fail = 0; const fails = [];
export const ok = (name, cond, info = '') => { if (cond) pass++; else { fail++; if (fails.length < 40) fails.push(`${name} ${info}`); } };

// --- Vérificateur
const p = s => parseAnswer(s);
ok('6/8 = 3/4', eq(p('6/8'), F(3, 4)));
ok('2,5 = 2.5 = 5/2', eq(p('2,5'), F(5, 2)) && eq(p('2.5'), F(5, 2)));
ok('−3 et -3', eq(p('−3'), F(-3)) && eq(p('-3'), F(-3)));
ok('0,75 = 3/4', eq(p('0,75'), F(3, 4)));
ok('espaces', eq(p(' 3 / 4 '), F(3, 4)));
ok('25 %', eq(p('25 %'), F(25)));
ok('12,50 $', eq(p('12,50 $'), F(25, 2)));
ok('-3/4', eq(p('-3/4'), F(-3, 4)));
ok('abc → null', p('abc') === null && p('') === null && p('3/0') === null && p('1/2/3') === null && p(',') === null);
ok(',5 = 1/2', eq(p(',5'), F(1, 2)));
ok('irréductible → near', checkField('6/8', { value: F(3, 4), irreducible: true }).near === true);
ok('irréductible ok', checkField('3/4', { value: F(3, 4), irreducible: true }).ok);
ok('tolérance', checkField('31,4', { value: F(3142, 100), tol: 0.05 }).ok && !checkField('31', { value: F(3142, 100), tol: 0.05 }).ok);
ok('2 champs', checkAnswer(['3', '-2'], { kind: 'num', fields: [{ value: F(3) }, { value: F(-2) }] }).ok);
ok('choix', checkAnswer(2, { kind: 'choice', choices: ['a', 'b', 'c'], correct: 2 }).ok && !checkAnswer(1, { kind: 'choice', correct: 2 }).ok);
ok('fmt', fmt(F(5, 2)) === '2,5' && fmt(F(1, 3)) === '1/3' && fmt(F(-7)) === '−7');
ok('rng reproductible', makeRng(42).next() === makeRng(42).next() && makeRng('a').int(1, 6) === makeRng('a').int(1, 6));
ok('add/mul', eq(add(F(1, 3), F(1, 4)), F(7, 12)) && eq(mul(F(2, 3), F(3, 4)), F(1, 2)));

const extra = process.argv.includes('--core') ? [] : ['./test-gen.mjs', './test-logic.mjs'];
for (const m of extra) { try { const r = await import(m); const o = await r.run(ok); console.log(o || ''); } catch (e) { if (e.code === 'ERR_MODULE_NOT_FOUND' && e.message.includes(m.slice(2))) console.log(`(${m} absent)`); else { ok(`charge ${m}`, false, e.stack); } } }
console.log(`\n${pass} PASS, ${fail} FAIL`); for (const f of fails) console.log('FAIL', f);
process.exit(fail ? 1 : 0);
