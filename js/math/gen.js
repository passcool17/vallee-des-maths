// Générateurs seedés : GEN[id](rng, d) → { prompt, answer, hints[3], data }.
// d : 0 = base, 1 = standard, 2 = avancé. answer = { kind:'num', fields:[{ value:F, label?, tol?, irreducible? }] } | { kind:'choice', choices, correct }.
import { F, add, sub, mul, div, fmt, fmtFrac, fmtDec, toNumber, gcd, lcm } from './frac.js';
import { makeRng, hashSeed } from './rng.js';
import { GEN2 } from './gen2.js';

const n = x => fmt(typeof x === 'number' ? F(x) : x);              // 3 · −2 · 2,5 · 1/3
const p = x => { const v = typeof x === 'number' ? F(x) : x; return v.n < 0 ? `(${n(v)})` : n(v); };
const fr = x => fmtFrac(typeof x === 'number' ? F(x) : x);           // toujours a/b
const $ = cents => `${fmtDec(cents / 100, 2)} $`;
const num = (value, extra = {}) => ({ kind: 'num', fields: [{ value: typeof value === 'number' ? F(value) : value, ...extra }] });
const fields = (...fs) => ({ kind: 'num', fields: fs.map(f => ({ ...f, value: typeof f.value === 'number' ? F(f.value) : f.value })) });
function choice(rng, good, bads) {
  const uniq = [...new Set(bads.filter(b => b !== good))].slice(0, 3);
  const choices = rng.shuffle([good, ...uniq]);
  return { kind: 'choice', choices, correct: choices.indexOf(good) };
}
const sumS = arr => arr.reduce((a, b) => a + b, 0);

export const GEN = {
  // ---------- Arithmétique
  qc_s1_ari_01(r, d) {
    let show, js, step;
    if (d === 0) {
      const [a, b, c] = [r.int(2, 12), r.int(2, 9), r.int(2, 9)];
      const t = r.int(0, 2);
      if (t === 0) { show = `${a} + ${b} × ${c}`; js = `${a}+${b}*${c}`; step = `${b} × ${c} = ${b * c}`; }
      else if (t === 1) { const A = r.int(b * c + 1, b * c + 20); show = `${A} − ${b} × ${c}`; js = `${A}-${b}*${c}`; step = `${b} × ${c} = ${b * c}`; }
      else { show = `(${a} + ${b}) × ${c}`; js = `(${a}+${b})*${c}`; step = `${a} + ${b} = ${a + b}`; }
    } else if (d === 1) {
      const [a, b] = [r.int(2, 20), r.int(2, 9)], c = r.int(5, 15), e = r.int(1, c - 1);
      if (r.chance(0.5)) { show = `${a} + ${b} × (${c} − ${e})`; js = `${a}+${b}*(${c}-${e})`; step = `${c} − ${e} = ${c - e}`; }
      else { const q = r.int(2, 9), dv = r.int(2, 6); show = `(${a} − ${b}) × ${q} + ${q * dv * 2} ÷ ${dv * 2}`; js = `(${a}-${b})*${q}+${q * dv * 2}/${dv * 2}`; step = `${a} − ${b} = ${a - b} et ${q * dv * 2} ÷ ${dv * 2} = ${q}`; }
    } else {
      const [a, b, c, e] = [r.int(10, 40), r.int(2, 9), r.int(2, 9), r.int(2, 5)];
      if (r.chance(0.5)) { show = `[${a} − (${b} + ${c})] × ${e}`; js = `(${a}-(${b}+${c}))*${e}`; step = `(${b} + ${c}) = ${b + c}, puis ${a} − ${b + c} = ${a - b - c}`; }
      else { const f = r.int(2, 6), g = r.int(1, 9); show = `${e} × [${b} + (${g + f} − ${f}) × ${c}] − ${a}`; js = `${e}*(${b}+(${g + f}-${f})*${c})-${a}`; step = `(${g + f} − ${f}) = ${g}, puis ${b} + ${g} × ${c} = ${b + g * c}`; }
    }
    const v = Function(`return (${js})`)();
    return { prompt: `Calcule : ${show}`, answer: num(v), data: { js },
      hints: [/[[]/.test(show) ? 'Commence par les parenthèses les plus intérieures, puis les crochets.' : /[(]/.test(show) ? 'Commence par ce qui est entre parenthèses.' : 'Pas de parenthèses ici : les × et ÷ passent avant les + et −.', 'Ensuite, fais × et ÷ de gauche à droite, et seulement après + et −.', `Première étape : ${step}. Continue à partir de là.`] };
  },
  qc_s1_ari_02(r, d) {
    let a, b, op;
    if (d === 0) { a = F(r.nz(-20, 20)); b = F(r.nz(-20, 20)); op = r.pick(['+', '−']); }
    else if (d === 1) { op = r.pick(['×', '÷']); const x = r.nz(-9, 9), y = r.nz(-9, 9); if (op === '×') { a = F(x); b = F(y); } else { a = F(x * y); b = F(y); } }
    else { op = r.pick(['+', '−', '×']); if (op === '×') { a = F(r.nz(-30, 30), 10); b = F(r.nz(-9, 9)); } else { a = F(r.nz(-500, 500), 100); b = F(r.nz(-90, 90), 10); } }
    const v = op === '+' ? add(a, b) : op === '−' ? sub(a, b) : op === '×' ? mul(a, b) : div(a, b);
    const sign = op === '×' || op === '÷' ? `Signes : ${(a.n < 0) === (b.n < 0) ? 'pareils → résultat positif' : 'différents → résultat négatif'}.` : (op === '−' ? `Soustraire ${p(b)}, c’est additionner ${p(mul(b, F(-1)))}.` : 'Si les signes diffèrent, soustrais les valeurs sans signe et garde le signe du plus « gros ».');
    return { prompt: `Calcule : ${n(a)} ${op} ${p(b)}`, answer: num(v), data: { a, b, op },
      hints: ['Règle des signes : + × + = +, − × − = +, + × − = −.', sign, `Calcule d’abord sans les signes, puis place le bon signe.`] };
  },
  qc_s1_ari_03(r, d) {
    let pp, q; do { q = r.int(2, 12); pp = r.int(1, q - 1); } while (gcd(pp, q) !== 1);
    const k = r.int(2, d === 0 ? 5 : 9);
    if (d === 0) return { prompt: `Complète : ${pp}/${q} = ?/${q * k}`, answer: num(pp * k, { label: 'Numérateur' }), data: { mode: 'missing', pp, q, k },
      hints: ['Deux fractions sont équivalentes si on multiplie le haut ET le bas par le même nombre.', `Par combien multiplie-t-on ${q} pour obtenir ${q * k} ?`, `${q} × ${k} = ${q * k}, alors fais pareil avec ${pp}.`] };
    if (d === 1) return { prompt: `Réduis la fraction ${pp * k}/${q * k} (fraction irréductible).`, answer: num(F(pp, q), { irreducible: true }), data: { mode: 'reduce', pp, q, k },
      hints: ['Divise le numérateur et le dénominateur par un même diviseur commun.', `Cherche le plus grand diviseur commun de ${pp * k} et ${q * k}.`, `Ici, PGCD(${pp * k}, ${q * k}) = ${k * gcd(pp, q)}.`] };
    const good = `${pp * k}/${q * k}`;
    const bads = [`${pp + k}/${q + k}`, `${pp * k}/${q + k}`, `${pp + 1}/${q * k}`, `${q}/${pp}`, `${pp * k + 1}/${q * k}`].filter(s => { const [x, y] = s.split('/').map(Number); return x * q !== y * pp && y > 0; });
    return { prompt: `Quelle fraction est équivalente à ${pp}/${q} ?`, answer: choice(r, good, bads), data: { mode: 'choice', pp, q, k },
      hints: ['Une fraction équivalente s’obtient en multipliant le haut ET le bas par le même nombre.', 'Additionner le même nombre en haut et en bas ne donne PAS une fraction équivalente.', `Essaie de réduire chaque choix et compare avec ${pp}/${q}.`] };
  },
  qc_s1_ari_04(r, d) {
    let a, b, op = '+', ctx = null;
    if (d === 0) { const den = r.int(3, 12); let x = r.int(1, den - 1), y = r.int(1, den - 1); op = r.pick(['+', '−']); if (op === '−' && x < y) [x, y] = [y, x]; a = F(x, den); b = F(y, den);
      const v = op === '+' ? add(a, b) : sub(a, b);
      return { prompt: `Calcule : ${x}/${den} ${op} ${y}/${den}`, answer: num(v), data: { a, b, op, ctx: false },
        hints: ['Même dénominateur : on garde le dénominateur.', `On ${op === '+' ? 'additionne' : 'soustrait'} seulement les numérateurs : ${x} ${op} ${y}.`, `Résultat : ${op === '+' ? x + y : x - y}/${den} (tu peux réduire si tu veux).`] }; }
    if (d === 1) { const b1 = r.int(2, 10), b2 = r.int(2, 10); a = F(r.int(1, b1 - 1), b1); b = F(r.int(1, b2 - 1), b2); op = r.pick(['+', '−']); if (op === '−' && toNumber(a) < toNumber(b)) [a, b] = [b, a]; }
    else { const b1 = r.pick([2, 3, 4, 5, 6, 8]), b2 = r.pick([3, 4, 5, 6, 8, 10]); a = F(1, b1); b = F(r.int(1, Math.max(1, Math.floor(b2 / 3))), b2); if (toNumber(a) + toNumber(b) >= 1) b = F(1, b2 * 2); ctx = true; }
    const v = ctx ? sub(F(1), add(a, b)) : op === '+' ? add(a, b) : sub(a, b);
    const prompt = ctx ? `Gaston a mangé ${fr(a)} de la tarte aux bleuets et Thérèse ${fr(b)}. Quelle fraction de la tarte reste-t-il ?` : `Calcule : ${fr(a)} ${op} ${fr(b)}`;
    const m = lcm(a.d, b.d);
    return { prompt, answer: num(v), data: { a, b, op, ctx: !!ctx },
      hints: ['On ne peut additionner que des fractions qui ont le même dénominateur.', `Dénominateur commun : ${m}.`, ctx ? `La tarte entière vaut ${m}/${m}. Enlève ${a.n * m / a.d}/${m} et ${b.n * m / b.d}/${m}.` : `${fr(a)} = ${a.n * m / a.d}/${m} et ${fr(b)} = ${b.n * m / b.d}/${m}.`] };
  },
  qc_s1_ari_05(r, d) {
    if (d === 2) {
      const a = r.int(1, 3), b = r.int(a + 1, 5), m = r.int(2, 6), N = a * m;
      return { prompt: `Avec ${N} L de sirop d’érable, combien de pots de ${a}/${b} L peux-tu remplir ?`, answer: num(m * b), data: { a, b, N, ctx: true },
        hints: [`On cherche combien de fois ${a}/${b} L entre dans ${N} L : c’est une division.`, `Diviser par ${a}/${b}, c’est multiplier par ${b}/${a}.`, `${N} × ${b}/${a} = ${N * b}/${a}.`] };
    }
    const b1 = r.int(2, 9), b2 = r.int(2, 9), a = F(r.int(1, 9), b1), b = F(r.int(1, 9), b2), op = d === 0 ? '×' : '÷';
    const v = op === '×' ? mul(a, b) : div(a, b);
    return { prompt: `Calcule : ${fr(a)} ${op} ${fr(b)}`, answer: num(v), data: { a, b, op },
      hints: [op === '×' ? 'Multiplie les numérateurs entre eux et les dénominateurs entre eux.' : 'Diviser par une fraction, c’est multiplier par son inverse.', op === '×' ? `(${a.n} × ${b.n}) / (${a.d} × ${b.d})` : `${fr(a)} × ${b.d}/${b.n}`, 'Réduis ton résultat si tu peux (ce n’est pas obligatoire).'] };
  },
  qc_s1_ari_06(r, d) {
    if (d === 0) { const q = r.pick([2, 4, 5, 10, 20, 25, 50]); const pp = r.int(1, q - 1); const v = F(pp * 100, q);
      return { prompt: `Écris ${pp}/${q} en pourcentage.`, answer: num(v, { label: '%' }), data: { mode: 'pct', pp, q },
        hints: ['Un pourcentage, c’est une fraction sur 100.', `Par combien multiplier ${q} pour obtenir 100 ?`, `${pp}/${q} = ${pp * 100 / q}/100.`] }; }
    if (d === 1) { const den = r.pick([4, 5, 10, 20, 25, 50, 100]); const v = F(r.int(1, den - 1), den); const dec = fmt(v);
      return { prompt: `Écris ${dec} en fraction irréductible.`, answer: num(v, { irreducible: true }), data: { mode: 'frac', v },
        hints: ['Lis le nombre : 0,35 se lit « 35 centièmes ».', `Écris-le sur 10, 100 ou 1000, puis réduis.`, `Divise le haut et le bas par leur PGCD.`] }; }
    if (r.chance(0.5)) { const x = F(r.int(1000, 99999), 1000), place = r.pick([['dixième', 1], ['centième', 2], ['unité', 0]]);
      const v = F(Math.round(toNumber(x) * 10 ** place[1] + 1e-9), 10 ** place[1]);
      return { prompt: place[0] === 'unité' ? `Arrondis ${fmtDec(toNumber(x), 3)} à l’unité près.` : `Arrondis ${fmtDec(toNumber(x), 3)} au ${place[0]} près.`, answer: num(v), data: { mode: 'round', x, k: place[1] },
        hints: ['Regarde le chiffre juste à droite de la position demandée.', 'S’il vaut 5 ou plus, on arrondit vers le haut ; sinon on garde.', `Garde ${place[1]} chiffre(s) après la virgule.`] }; }
    const pct = r.pick([10, 20, 25, 40, 50, 60, 75, 80, 5, 12.5]); const v = F(Math.round(pct * 10), 1000);
    const good = fmt(v), bads = [fmt(F(Math.round(pct * 10), 100)), fmt(F(Math.round(pct * 10), 10000)), `${Math.round(pct * 10)}/100`, fr(F(100, Math.max(1, Math.round(pct))))].filter(s => s !== good && s !== fr(v));
    return { prompt: `Lequel de ces nombres vaut ${fmtDec(pct, pct % 1 ? 1 : 0)} % ?`, answer: choice(r, good, bads), data: { mode: 'choice', pct },
      hints: ['« Pour cent » veut dire « sur 100 ».', `${fmtDec(pct, pct % 1 ? 1 : 0)} % = ${fmtDec(pct, pct % 1 ? 1 : 0)}/100.`, 'Divise par 100 : la virgule recule de deux positions.'] };
  },
  qc_s1_ari_07(r, d) {
    if (d === 0) { if (r.chance(0.5)) { const a = r.int(2, 10), e = a <= 5 ? r.int(2, 4) : 2; return { prompt: `Calcule : ${a}${['', '', '²', '³', '⁴'][e]}`, answer: num(a ** e), data: { mode: 'pow', a, e },
        hints: ['Une puissance, c’est une multiplication répétée.', `${a}${['', '', '²', '³', '⁴'][e]} = ${Array(e).fill(a).join(' × ')}`, 'Multiplie deux par deux.'] }; }
      const k = r.int(2, 15); return { prompt: `Calcule : √${k * k}`, answer: num(k), data: { mode: 'sqrt', k }, hints: ['La racine carrée de N est le nombre qui, multiplié par lui-même, donne N.', `Quel nombre × lui-même = ${k * k} ?`, `Essaie ${k - 1} × ${k - 1} et ${k + 1} × ${k + 1} pour encadrer.`] }; }
    if (d === 1) { const i = r.int(1, 4), j = r.int(0, 2), k = r.int(0, 2), N = 2 ** i * 3 ** j * 5 ** k;
      return { prompt: `Décompose ${N} en facteurs premiers : ${N} = 2^a × 3^b × 5^c. Trouve a, b et c.`, answer: fields({ value: i, label: 'a' }, { value: j, label: 'b' }, { value: k, label: 'c' }), data: { mode: 'factor', N },
        hints: ['Divise par 2 tant que tu peux, puis par 3, puis par 5.', 'Compte combien de fois tu as divisé par chacun.', 'Un exposant 0 veut dire que le facteur n’apparaît pas.'] }; }
    const a = r.pick([4, 6, 8, 9, 10, 12, 15]), b = r.pick([6, 8, 10, 12, 14, 15, 18, 20]);
    if (r.chance(0.5) && a !== b) return { prompt: `Le traversier jaune part toutes les ${a} minutes et le vert toutes les ${b} minutes. Ils partent ensemble à 8 h. Dans combien de minutes repartent-ils ensemble ?`, answer: num(lcm(a, b)), data: { mode: 'ppcm', a, b },
      hints: ['On cherche le plus petit multiple commun (PPCM).', `Multiples de ${a} : ${[1, 2, 3, 4, 5].map(x => x * a).join(', ')}…`, `Multiples de ${b} : ${[1, 2, 3, 4, 5].map(x => x * b).join(', ')}…`] };
    const A = a * r.int(2, 5), B = b * r.int(2, 5);
    return { prompt: `Thérèse a ${A} pommes et ${B} poires. Elle fait des paniers identiques, sans reste. Combien de paniers peut-elle faire, au maximum ?`, answer: num(gcd(A, B)), data: { mode: 'pgcd', A, B },
      hints: ['On cherche le plus grand diviseur commun (PGCD).', `Diviseurs de ${A} : ${divisors(A).join(', ')}.`, `Diviseurs de ${B} : ${divisors(B).join(', ')}.`] };
  },
  qc_s1_ari_08(r, d) {
    if (d === 0) { const pc = r.pick([10, 20, 25, 50, 75, 5, 15, 30]), N = r.int(2, 30) * 20; const v = F(pc * N, 100);
      return { prompt: `Combien font ${pc} % de ${N} ?`, answer: num(v), data: { mode: 'of', pc, N }, hints: ['p % de N = p/100 × N.', `10 % de ${N}, c’est ${n(F(N, 10))}.`, `${pc} % = ${pc}/100, donc ${pc} × ${N} ÷ 100.`] }; }
    if (d === 1) { const pc = r.pick([10, 15, 20, 25, 30, 40, 50]), P = r.int(4, 60) * 100 + r.pick([0, 0, 50, 99]);       return { prompt: `Un chandail coûte ${$(P)}. Rabais de ${pc} % ! Combien le paies-tu (avant taxes) ?`, answer: num(F(Math.round(P * (100 - pc) / 100), 100), { tol: 0.0051 }), data: { mode: 'rabais', pc, P },
        hints: ['Prix payé = prix − rabais.', `Le rabais vaut ${pc} % de ${$(P)}.`, `Ou directement : tu paies ${100 - pc} % du prix, soit × ${fmtDec((100 - pc) / 100, 2)}.`] }; }
    const B = r.pick([20, 25, 40, 50, 200, 80]); const A = r.int(1, B - 1); const v = F(A * 100, B); if (v.d !== 1) return GEN.qc_s1_ari_08(r, d);
    return { prompt: `Flocon a réussi ${A} questions sur ${B}. Quel pourcentage a-t-il réussi ?`, answer: num(v, { label: '%' }), data: { mode: 'quel', A, B },
      hints: ['Pourcentage = partie ÷ tout × 100.', `${A}/${B} = ?/100`, `Multiplie ${A} et ${B} par ${100 / B}.`] };
  },
  // ---------- Proportionnalité
  qc_s1_pro_01(r, d) {
    if (d === 0) { const q = r.int(2, 12), u = r.pick([25, 40, 50, 75, 80, 120, 150]); const P = q * u;
      return { prompt: `${q} pommes coûtent ${$(P)}. Quel est le prix d’une pomme ?`, answer: num(F(u, 100)), data: { mode: 'unit', q, P },
        hints: ['Taux unitaire = total ÷ nombre d’unités.', `Divise ${$(P)} par ${q}.`, `Astuce : ${P} cents ÷ ${q} = ? cents.`] }; }
    if (d === 1) { const t = r.int(2, 9), v = r.int(12, 60); return { prompt: `Gaston nage ${v * t} m en ${t} minutes, toujours au même rythme. Combien de mètres nage-t-il par minute ?`, answer: num(v), data: { mode: 'speed', D: v * t, t },
      hints: ['Vitesse = distance ÷ temps.', `${v * t} ÷ ${t}`, 'Vérifie : ta réponse × temps doit redonner la distance.'] }; }
    let qa, pa, qb, pb; do { qa = r.pick([250, 300, 400, 500]); qb = r.pick([600, 750, 900, 1000]); pa = r.int(150, 600); pb = r.int(250, 1200); } while (Math.abs(pa / qa - pb / qb) < 0.0005);
    const best = pa / qa < pb / qb ? 'Le format A' : 'Le format B';
    return { prompt: `Sirop d’érable : format A = ${qa} mL pour ${$(pa)}, format B = ${qb} mL pour ${$(pb)}. Lequel est le meilleur achat ?`, answer: choice(r, best, ['Le format A', 'Le format B', 'Les deux coûtent pareil au mL']), data: { mode: 'best', qa, pa, qb, pb },
      hints: ['Compare le prix pour la même quantité : le prix par mL (ou par 100 mL).', `A : ${$(pa)} ÷ ${qa} mL. B : ${$(pb)} ÷ ${qb} mL.`, `A ≈ ${fmtDec(pa / qa * 100, 1)} ¢/100 mL, B ≈ ${fmtDec(pb / qb * 100, 1)} ¢/100 mL.`] };
  },
  qc_s1_pro_02(r, d) {
    if (d === 0) { const rate = r.pick([F(2), F(3), F(5, 2), F(3, 2), F(4)]); const a = rate.d === 2 ? 2 * r.int(1, 3) : r.int(2, 6); const N = rate.d === 2 ? 2 * r.int(2, 8) : r.int(3, 15); const b = mul(F(a), rate);
      return { prompt: `${a} arrosoirs font fleurir ${n(b)} fleurs. Combien de fleurs pour ${N} arrosoirs ?`, answer: num(mul(F(N), rate)), data: { mode: 'unit', a, b, N },
        hints: ['Retour à l’unité : combien de fleurs pour UN arrosoir ?', `${n(b)} ÷ ${a} = ${n(rate)} fleur(s) par arrosoir.`, `Multiplie ensuite par ${N}.`] }; }
    if (d === 1) { const k = r.int(2, 9), x1 = r.int(2, 9); let x2; do x2 = r.int(2, 20); while (x2 === x1);
      return { prompt: `Tableau de proportionnalité : quand x = ${x1}, y = ${k * x1}. Quand x = ${x2}, combien vaut y ?`, answer: num(k * x2), data: { mode: 'table', x1, y1: k * x1, x2 },
        hints: ['Dans un tableau proportionnel, y = coefficient × x.', `Coefficient : ${k * x1} ÷ ${x1}.`, `Coefficient = ${k}. Calcule ${k} × ${x2}.`] }; }
    const q = r.pick([F(3, 4), F(2, 3), F(1, 2), F(5, 4)]), c = r.pick([4, 6, 8]), N = r.pick([2, 3, 5, 10, 12, 18]);
    return { prompt: `Pour ${c} crêpes, il faut ${fr(q)} tasse de lait. Combien de tasses pour ${N} crêpes ?`, answer: num(div(mul(q, F(N)), F(c))), data: { mode: 'recette', q, c, N },
      hints: ['C’est proportionnel : même rapport lait / crêpes.', `Pour 1 crêpe : ${fr(q)} ÷ ${c}.`, `Puis × ${N}. Une fraction comme réponse, c’est parfait.`] };
  },
  // ---------- Algèbre
  qc_s1_alg_01(r, d) {
    const a = r.int(-5, 12), k = r.nz(d === 0 ? 2 : -4, 7), terms = [0, 1, 2, 3].map(i => a + i * k), c = a - k;
    const rule = (m, b) => `${m === 1 ? '' : m === -1 ? '−' : n(m)}n${b === 0 ? '' : b > 0 ? ` + ${b}` : ` − ${-b}`}`;
    if (d === 0) { const R = r.int(6, 12); return { prompt: `Suite : ${terms.map(n).join(' ; ')} ; … Quel est le ${R}e terme ?`, answer: num(a + (R - 1) * k), data: { mode: 'term', a, k, R },
      hints: ['Trouve ce qu’on ajoute à chaque fois (la raison).', `La raison est ${n(k)}.`, `Terme de rang ${R} = ${n(a)} + ${R - 1} × ${p(k)}.`] }; }
    if (d === 1) { const good = rule(k, c); const bads = [[k, a], [a, k], [k + 1, c - 1], [-k, c], [k, c + k], [k - 1, c + 1]].filter(([m]) => m !== 0).map(([m, b]) => rule(m, b)).filter(s => s !== good);
      return { prompt: `Suite : ${terms.map(n).join(' ; ')} ; … Quelle règle donne le terme selon le rang n ?`, answer: choice(r, good, bads), data: { mode: 'rule', a, k },
        hints: ['Le nombre devant n est la raison (ce qu’on ajoute à chaque fois).', `La raison est ${n(k)} : la règle commence par ${rule(k, 0)}.`, `Vérifie avec n = 1 : la règle doit donner ${n(a)}.`] }; }
    const R = r.int(8, 30), T = a + (R - 1) * k;
    return { prompt: `Suite : ${terms.map(n).join(' ; ')} ; … Quel rang occupe le terme ${n(T)} ?`, answer: num(R), data: { mode: 'rank', a, k, T },
      hints: ['Terme = premier terme + (rang − 1) × raison.', `${n(T)} = ${n(a)} + (n − 1) × ${p(k)}`, `(n − 1) = (${n(T)} − ${p(a)}) ÷ ${p(k)}.`] };
  },
  qc_s1_alg_02(r, d) {
    if (d === 0) { const a = r.nz(-9, 9), b = r.int(-10, 10), x = r.nz(-6, 6); return { prompt: `Calcule ${n(a)}x ${b < 0 ? '−' : '+'} ${Math.abs(b)} si x = ${n(x)}.`, answer: num(a * x + b), data: { mode: 'lin', a, b, x },
      hints: ['Remplace x par sa valeur, entre parenthèses.', `${n(a)} × ${p(x)} ${b < 0 ? '−' : '+'} ${Math.abs(b)}`, 'Fais la multiplication avant l’addition.'] }; }
    if (d === 1) { const a = r.int(2, 6), b = r.int(2, 6), x = r.nz(-5, 5), y = r.nz(-5, 5); return { prompt: `Calcule ${a}x − ${b}y si x = ${n(x)} et y = ${n(y)}.`, answer: num(a * x - b * y), data: { mode: 'xy', a, b, x, y },
      hints: ['Remplace chaque lettre par sa valeur entre parenthèses.', `${a} × ${p(x)} − ${b} × ${p(y)}`, 'Attention : moins un nombre négatif, ça devient plus.'] }; }
    const b = r.int(-6, 6), x = r.nz(-5, 5); return { prompt: `Calcule x² ${b < 0 ? '−' : '+'} ${Math.abs(b)}x si x = ${n(x)}.`, answer: num(x * x + b * x), data: { mode: 'sq', b, x },
      hints: ['x² veut dire x × x.', `${p(x)} × ${p(x)} = ${x * x} (un négatif au carré devient positif).`, `Puis ${b < 0 ? '−' : '+'} ${Math.abs(b)} × ${p(x)}.`] };
  },
  qc_s1_alg_03(r, d) {
    const term = (c, v, first) => { const s = c < 0 ? '−' : '+', m = Math.abs(c); const body = v ? `${m === 1 ? '' : m}${v}` : `${m}`; return first ? `${c < 0 ? '−' : ''}${body}` : ` ${s} ${body}`; };
    if (d === 0) { const a = r.nz(-9, 9), b = r.nz(-9, 9); return { prompt: `Réduis : ${term(a, 'x', true)}${term(b, 'x')} = ?x`, answer: num(a + b, { label: 'Coefficient de x' }), data: { mode: 'xx', a, b },
      hints: ['Des termes semblables ont la même partie littérale (ici x).', 'Additionne seulement les coefficients.', `${n(a)} + ${p(b)}`] }; }
    if (d === 1) { const a = r.nz(-9, 9), b = r.nz(-12, 12), c = r.nz(-9, 9), e = r.nz(-12, 12); if (a + c === 0) return GEN.qc_s1_alg_03(r, d);
      return { prompt: `Réduis : ${term(a, 'x', true)}${term(b, '')}${term(c, 'x')}${term(e, '')}. Donne le coefficient de x et la constante.`, answer: fields({ value: a + c, label: 'Coefficient de x' }, { value: b + e, label: 'Constante' }), data: { mode: 'mix', a, b, c, e },
        hints: ['Regroupe les termes en x ensemble, et les nombres seuls ensemble.', `Termes en x : ${n(a)} et ${n(c)}.`, `Constantes : ${n(b)} et ${n(e)}.`] }; }
    const k = r.int(2, 6), m = r.nz(-7, 7); const lin = (A, B) => `${A === 1 ? '' : A === -1 ? '−' : n(A)}x${B === 0 ? '' : B > 0 ? ` + ${B}` : ` − ${-B}`}`;
    const good = lin(k, k * m), bads = [lin(k, m), lin(k + m, 0), lin(k, k + m), lin(1, k * m), lin(k, -k * m)];
    return { prompt: `Quelle expression est équivalente à ${k}(x ${m < 0 ? '−' : '+'} ${Math.abs(m)}) ?`, answer: choice(r, good, bads), data: { mode: 'dist', k, m },
      hints: ['Distribue : le nombre devant la parenthèse multiplie CHAQUE terme.', `${k} × x et ${k} × ${p(m)}`, 'Vérifie en remplaçant x par 1 dans les deux expressions.'] };
  },
  qc_s1_alg_04(r, d) {
    const x = r.int(-9, 12);
    if (d === 0) { if (r.chance(0.5)) { const a = r.int(-15, 15); return { prompt: `Résous : x ${a < 0 ? '−' : '+'} ${Math.abs(a)} = ${n(x + a)}`, answer: num(x, { label: 'x' }), data: { mode: 'add', a, c: x + a },
        hints: ['Fais l’opération inverse des deux côtés.', `${a < 0 ? 'Ajoute' : 'Enlève'} ${Math.abs(a)} des deux côtés.`, `x = ${n(x + a)} ${a < 0 ? '+' : '−'} ${Math.abs(a)}`] }; }
      const a = r.nz(-9, 9); return { prompt: `Résous : ${n(a)}x = ${n(a * x)}`, answer: num(x, { label: 'x' }), data: { mode: 'mul', a, c: a * x },
        hints: ['x est multiplié par un nombre : divise les deux côtés par ce nombre.', `x = ${n(a * x)} ÷ ${p(a)}`, 'Attention aux signes.'] }; }
    if (d === 1) { const a = r.int(2, 9), b = r.int(-20, 20); return { prompt: `Résous : ${a}x ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${n(a * x + b)}`, answer: num(x, { label: 'x' }), data: { mode: 'affine', a, b, c: a * x + b },
      hints: ['D’abord, enlève la constante des deux côtés.', `${a}x = ${n(a * x + b)} ${b < 0 ? '+' : '−'} ${Math.abs(b)} = ${n(a * x)}`, `Ensuite, divise par ${a}.`] }; }
    const k = r.int(3, 6), X = r.int(4, 15), extra = r.int(1, 9);
    return { prompt: `Gaston remplit ${k} caisses identiques de x pommes, plus ${extra} pommes en vrac. Il a ${k * X + extra} pommes en tout. Combien y a-t-il de pommes par caisse ?`, answer: num(X, { label: 'x' }), data: { mode: 'story', k, extra, total: k * X + extra },
      hints: [`L’équation : ${k}x + ${extra} = ${k * X + extra}.`, `Enlève ${extra} : ${k}x = ${k * X}.`, `Divise par ${k}.`] };
  },
  // ---------- Probabilités
  qc_s1_prb_01(r, d) {
    if (d === 0) { const a = r.int(2, 6), b = r.int(2, 6); return { prompt: `Tu as ${a} tuques et ${b} foulards. Combien d’agencements tuque + foulard différents peux-tu faire ?`, answer: num(a * b), data: { mode: 'ab', a, b },
      hints: ['Fais un arbre : pour chaque tuque, toutes les possibilités de foulard.', `Chaque tuque donne ${b} agencements.`, `${a} tuques × ${b} foulards.`] }; }
    if (d === 1) { const a = r.int(2, 4), b = r.int(2, 5), c = r.int(2, 4); return { prompt: `Au casse-croûte de l’île : ${a} entrées, ${b} plats et ${c} desserts. Combien de repas (1 entrée, 1 plat, 1 dessert) différents ?`, answer: num(a * b * c), data: { mode: 'abc', a, b, c },
      hints: ['Principe de multiplication : on multiplie le nombre de choix à chaque étape.', `${a} × ${b} × …`, `${a} × ${b} × ${c}`] }; }
    if (r.chance(0.4)) { const b = r.int(2, 6), k = r.int(2, 4); return { prompt: `Le cadenas du hangar de Gaston a ${k} roulettes, chacune avec les chiffres 1 à ${b}. Combien de codes différents sont possibles ?`, answer: num(b ** k), data: { mode: 'code', b, k },
      hints: ['Chaque roulette se choisit indépendamment des autres.', `${b} choix pour la 1re roulette, ${b} pour la 2e…`, `${Array(k).fill(b).join(' × ')}`] }; }
    const S = r.int(2, 12); return { prompt: `On lance deux dés à 6 faces. Combien de résultats (dé rouge, dé bleu) donnent une somme de ${S} ?`, answer: num(6 - Math.abs(S - 7)), data: { mode: 'dice', S },
      hints: ['Fais un tableau 6 × 6 : dé rouge en ligne, dé bleu en colonne.', 'Les couples (1, 2) et (2, 1) sont différents.', `Liste les couples dont la somme fait ${S}, en commençant par le dé rouge = ${Math.max(1, S - 6)}.`] };
  },
  qc_s1_prb_02(r, d) {
    if (d === 0) { const R = r.int(1, 9), B = r.int(1, 9); return { prompt: `Un sac contient ${R} billes rouges et ${B} billes bleues. On en tire une au hasard. Quelle est la probabilité qu’elle soit rouge ? (fraction)`, answer: num(F(R, R + B)), data: { mode: 'bag', R, B },
      hints: ['Probabilité = cas favorables ÷ cas possibles.', `Cas favorables : ${R}.`, `Cas possibles : ${R} + ${B} = ${R + B}.`] }; }
    if (d === 1) { const f = r.pick([6, 8, 10, 12]), m = r.pick([2, 3, 4, 5]); const fav = Math.floor(f / m); return { prompt: `On lance un dé à ${f} faces (1 à ${f}). Probabilité d’obtenir un multiple de ${m} ? (fraction)`, answer: num(F(fav, f)), data: { mode: 'die', f, m },
      hints: ['Liste les résultats possibles, puis ceux qui sont favorables.', `Multiples de ${m} jusqu’à ${f} : ${Array.from({ length: fav }, (_, i) => (i + 1) * m).join(', ')}.`, `${fav} cas favorables sur ${f}.`] }; }
    if (r.chance(0.5)) { const S = r.int(3, 12); let c = 0; for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) if (i + j >= S) c++;
      return { prompt: `On lance deux dés à 6 faces. Quelle est la probabilité que la somme soit au moins ${S} ? (fraction)`, answer: num(F(c, 36)), data: { mode: 'atleast', S },
        hints: ['Il y a 6 × 6 = 36 résultats équiprobables : fais le tableau.', `« Au moins ${S} » veut dire ${S} ou plus.`, `Compte les cases du tableau qui valent ${S} ou plus.`] }; }
    const S = r.int(2, 12); return { prompt: `On lance deux dés à 6 faces. Quelle est la probabilité que la somme soit ${S} ? (fraction)`, answer: num(F(6 - Math.abs(S - 7), 36)), data: { mode: 'dice', S },
      hints: ['Il y a 6 × 6 = 36 résultats équiprobables.', `Compte les couples qui donnent ${S}.`, `Il y en a ${6 - Math.abs(S - 7)}.`] };
  },
  // ---------- Statistique
  qc_s1_sta_01(r, d) {
    if (d === 0) { const L = Array.from({ length: 6 }, () => r.int(-15, 12)); return { prompt: `Températures de la semaine (°C) : ${L.map(n).join(' ; ')}. Quelle est l’étendue ?`, answer: num(Math.max(...L) - Math.min(...L)), data: { mode: 'range', L },
      hints: ['Étendue = valeur maximale − valeur minimale.', `Max : ${n(Math.max(...L))}, min : ${n(Math.min(...L))}.`, `${n(Math.max(...L))} − ${p(Math.min(...L))}`] }; }
    if (d === 1) { const k = r.int(4, 6), m = r.int(-6, 10); const dev = Array.from({ length: k - 1 }, () => r.int(-6, 6)); dev.push(-sumS(dev)); const L = dev.map(x => m + x);
      return { prompt: `Températures relevées (°C) : ${L.map(n).join(' ; ')}. Quelle est la moyenne ?`, answer: num(m), data: { mode: 'mean', L },
        hints: ['Moyenne = somme des données ÷ nombre de données.', `Somme : ${n(sumS(L))}.`, `${n(sumS(L))} ÷ ${k}`] }; }
    const M = r.int(65, 85), L = [r.int(55, 95), r.int(55, 95), r.int(55, 95)]; const need = 4 * M - sumS(L); if (need < 0 || need > 100) return GEN.qc_s1_sta_01(r, d);
    return { prompt: `Tes trois premiers tests : ${L.join(' ; ')}. Quelle note te faut-il au 4e pour une moyenne de ${M} ?`, answer: num(need), data: { mode: 'missing', L, M },
      hints: ['Moyenne × nombre de tests = somme totale.', `Il faut une somme de 4 × ${M} = ${4 * M}.`, `Tu as déjà ${sumS(L)}.`] };
  },
  // ---------- Géométrie
  qc_s1_geo_01(r, d) {
    if (d === 0) { const a = r.int(20, 100), b = r.int(15, 160 - a); return { prompt: `Dans un triangle, deux angles mesurent ${a}° et ${b}°. Combien mesure le troisième ?`, answer: num(180 - a - b, { label: '°' }), data: { mode: 'tri', a, b },
      hints: ['La somme des angles d’un triangle est 180°.', `${a} + ${b} = ${a + b}.`, `180 − ${a + b}`] }; }
    if (d === 1) { const comp = r.chance(0.5), a = r.int(5, comp ? 85 : 175); return { prompt: `Quel est le ${comp ? 'complément' : 'supplément'} d’un angle de ${a}° ?`, answer: num((comp ? 90 : 180) - a, { label: '°' }), data: { mode: comp ? 'comp' : 'supp', a },
      hints: ['Complémentaires : somme de 90°. Supplémentaires : somme de 180°.', `Ici, la somme visée est ${comp ? 90 : 180}°.`, `${comp ? 90 : 180} − ${a}`] }; }
    if (r.chance(0.5)) { const kind = r.pick(['équilatéral', 'isocèle', 'scalène']); const s = r.int(3, 12); let sides;
      if (kind === 'équilatéral') sides = [s, s, s]; else if (kind === 'isocèle') { let t; do t = r.int(2, 2 * s - 1); while (t === s); sides = r.shuffle([s, s, t]); } else { let a, b, c; do { a = r.int(3, 12); b = r.int(3, 12); c = r.int(3, 12); } while (a === b || b === c || a === c || a + b <= c || a + c <= b || b + c <= a); sides = [a, b, c]; }
      return { prompt: `Un triangle a des côtés de ${sides.join(' cm, ')} cm. C’est un triangle…`, answer: choice(r, kind, ['équilatéral', 'isocèle', 'scalène', 'rectangle']), data: { mode: 'sides', sides },
        hints: ['Compte combien de côtés sont égaux.', 'Équilatéral : 3 côtés égaux. Isocèle : 2 côtés égaux.', 'Scalène : aucun côté égal.'] }; }
    const a = r.int(20, 120), b = r.int(15, 160 - a), c = 180 - a - b; const max = Math.max(a, b, c); const kind = max === 90 ? 'rectangle' : max > 90 ? 'obtusangle' : 'acutangle';
    return { prompt: `Un triangle a des angles de ${a}°, ${b}° et ${c}°. C’est un triangle…`, answer: choice(r, kind, ['acutangle', 'rectangle', 'obtusangle', 'équilatéral']), data: { mode: 'angles', A: [a, b, c] },
      hints: ['Regarde le plus grand angle.', 'Un angle de 90° : rectangle. Plus de 90° : obtusangle.', 'Tous les angles < 90° : acutangle.'] };
  },
  qc_s1_geo_02(r, d) {
    const U = ['km', 'hm', 'dam', 'm', 'dm', 'cm', 'mm'];
    if (d === 0) { let i, j; do { i = r.int(0, 6); j = r.int(0, 6); } while (i === j || Math.abs(i - j) > 3); const x = F(r.int(1, 9999), r.pick([1, 10, 100])); const v = mul(x, F(10 ** Math.max(0, j - i), 10 ** Math.max(0, i - j)));
      return { prompt: `Convertis : ${n(x)} ${U[i]} = ? ${U[j]}`, answer: num(v, { label: U[j] }), data: { mode: 'conv', x, i, j },
        hints: ['km, hm, dam, m, dm, cm, mm : chaque pas vers la droite multiplie par 10.', `De ${U[i]} à ${U[j]}, il y a ${Math.abs(i - j)} pas vers la ${j > i ? 'droite (× 10 à chaque pas)' : 'gauche (÷ 10 à chaque pas)'}.`, `${j > i ? '× ' + 10 ** (j - i) : '÷ ' + 10 ** (i - j)}`] }; }
    if (d === 1) { const k = r.int(3, 6), S = Array.from({ length: k }, () => F(r.int(10, 150), r.pick([1, 10]))); const v = S.reduce(add, F(0));
      return { prompt: `Un enclos à ${k} côtés mesure ${S.map(n).join(' cm, ')} cm. Quel est son périmètre (cm) ?`, answer: num(v, { label: 'cm' }), data: { mode: 'poly', S },
        hints: ['Le périmètre est la somme de tous les côtés.', 'Aligne bien les virgules en additionnant.', `Il y a ${k} côtés à additionner.`] }; }
    const L = F(r.int(8, 30), 10), l = r.int(20, 75); const v = mul(F(2), add(mul(L, F(100)), F(l)));
    return { prompt: `Le quai rectangulaire mesure ${n(L)} m sur ${l} cm. Quel est son périmètre, en cm ?`, answer: num(v, { label: 'cm' }), data: { mode: 'mixed', L, l },
      hints: ['Mets d’abord toutes les mesures dans la même unité.', `${n(L)} m = ${n(mul(L, F(100)))} cm.`, 'Périmètre du rectangle = 2 × (longueur + largeur).'] };
  },
  qc_s1_geo_03(r, d) {
    if (d === 0) { const b = r.int(2, 20), h = r.int(2, 15), par = r.chance(0.5); return { prompt: `Aire d’un ${par ? 'parallélogramme de base' : 'rectangle de'} ${b} cm ${par ? 'et de hauteur' : 'sur'} ${h} cm ? (cm²)`, answer: num(b * h, { label: 'cm²' }), data: { mode: 'rect', b, h },
      hints: [par ? 'Aire du parallélogramme = base × hauteur.' : 'Aire du rectangle = longueur × largeur.', `${b} × ${h}`, 'L’aire s’exprime en unités carrées (cm²).'] }; }
    if (d === 1) { const b = r.int(3, 20), h = r.int(2, 15); return { prompt: `Aire d’un triangle de base ${b} m et de hauteur ${h} m ? (m²)`, answer: num(F(b * h, 2), { label: 'm²' }), data: { mode: 'tri', b, h },
      hints: ['Un triangle, c’est la moitié d’un parallélogramme.', 'Aire = base × hauteur ÷ 2.', `${b} × ${h} ÷ 2`] }; }
    if (r.chance(0.5)) { const B = r.int(6, 20), b = r.int(2, B - 1), h = r.int(2, 12); return { prompt: `Plate-bande en trapèze : grande base ${B} m, petite base ${b} m, hauteur ${h} m. Aire ? (m²)`, answer: num(F((B + b) * h, 2), { label: 'm²' }), data: { mode: 'trap', B, b, h },
      hints: ['Aire du trapèze = (grande base + petite base) × hauteur ÷ 2.', `(${B} + ${b}) × ${h} ÷ 2`, `${B + b} × ${h} = ${(B + b) * h}, puis ÷ 2.`] }; }
    const D = r.int(4, 20), dd = r.int(2, D); return { prompt: `Un cerf-volant en losange a des diagonales de ${D} dm et ${dd} dm. Aire ? (dm²)`, answer: num(F(D * dd, 2), { label: 'dm²' }), data: { mode: 'los', D, dd },
      hints: ['Aire du losange = grande diagonale × petite diagonale ÷ 2.', `${D} × ${dd} ÷ 2`, `${D * dd} ÷ 2`] };
  },
  qc_s1_geo_04(r, d) {
    if (d === 0) { const D = r.int(2, 40); const v = F(Math.round(314 * D), 100); return { prompt: `Circonférence d’un cercle de diamètre ${D} cm ? Utilise π ≈ 3,14 et arrondis au centième.`, answer: num(v, { tol: 0.011, label: 'cm' }), data: { mode: 'circ', D },
      hints: ['Circonférence = π × diamètre.', `3,14 × ${D}`, 'Si on te donne le rayon, le diamètre est le double.'] }; }
    if (d === 1) { const k = r.int(3, 12); return { prompt: `Quelle est la somme des angles intérieurs d’un polygone à ${k} côtés ?`, answer: num((k - 2) * 180, { label: '°' }), data: { mode: 'sum', k },
      hints: ['Découpe le polygone en triangles à partir d’un sommet.', `Un polygone à ${k} côtés se découpe en ${k} − 2 triangles.`, `(${k} − 2) × 180°`] }; }
    if (r.chance(0.5)) { const k = r.pick([3, 4, 5, 6, 8, 9, 10, 12]); return { prompt: `Combien mesure un angle intérieur d’un polygone régulier à ${k} côtés ?`, answer: num(F((k - 2) * 180, k), { label: '°' }), data: { mode: 'reg', k },
      hints: ['Somme des angles = (n − 2) × 180°.', `Somme : ${(k - 2) * 180}°.`, `Régulier : tous les angles sont égaux, donc ÷ ${k}.`] }; }
    const R = r.int(2, 25); return { prompt: `Un cerceau a une circonférence de ${fmtDec(6.28 * R, 2)} cm. Quel est son rayon ? (π ≈ 3,14)`, answer: num(R, { tol: 0.011, label: 'cm' }), data: { mode: 'radius', R },
      hints: ['C = 2 × π × r.', `r = C ÷ (2 × 3,14) = ${fmtDec(6.28 * R, 2)} ÷ 6,28.`, 'Le rayon est la moitié du diamètre.'] };
  },
  qc_s1_geo_05(r, d) {
    const x = r.nz(-9, 9), y = r.nz(-9, 9);
    if (d === 0) { const Q = x > 0 ? (y > 0 ? '1er quadrant' : '4e quadrant') : (y > 0 ? '2e quadrant' : '3e quadrant');
      return { prompt: `Dans quel quadrant se trouve le point (${n(x)}, ${n(y)}) ?`, answer: choice(r, Q, ['1er quadrant', '2e quadrant', '3e quadrant', '4e quadrant']), data: { mode: 'quad', x, y },
        hints: ['Le 1er quadrant est en haut à droite ; on tourne ensuite dans le sens contraire des aiguilles d’une montre.', 'x positif = à droite ; y positif = en haut.', `x est ${x > 0 ? 'positif' : 'négatif'}, y est ${y > 0 ? 'positif' : 'négatif'}.`] }; }
    if (d === 1) { const a = r.nz(-6, 6), b = r.nz(-6, 6); return { prompt: `On applique au point A(${n(x)}, ${n(y)}) une translation de ${a > 0 ? a + ' vers la droite' : -a + ' vers la gauche'} et ${b > 0 ? b + ' vers le haut' : -b + ' vers le bas'}. Coordonnées de l’image A’ ?`, answer: fields({ value: x + a, label: 'x' }, { value: y + b, label: 'y' }), data: { mode: 'trans', x, y, a, b },
      hints: ['Droite/gauche change x ; haut/bas change y.', `x’ = ${n(x)} ${a > 0 ? '+' : '−'} ${Math.abs(a)}`, `y’ = ${n(y)} ${b > 0 ? '+' : '−'} ${Math.abs(b)}`] }; }
    const axe = r.pick(['x', 'y']); return { prompt: `Réflexion du point B(${n(x)}, ${n(y)}) par rapport à l’axe des ${axe}. Coordonnées de l’image B’ ?`, answer: fields({ value: axe === 'x' ? x : -x, label: 'x' }, { value: axe === 'x' ? -y : y, label: 'y' }), data: { mode: 'refl', x, y, axe },
      hints: ['Une réflexion, c’est un miroir : la distance à l’axe reste la même.', `Par rapport à l’axe des ${axe}, c’est la coordonnée ${axe === 'x' ? 'y' : 'x'} qui change de signe.`, `L’autre coordonnée ne bouge pas.`] };
  },
};
function divisors(N) { const out = []; for (let i = 1; i <= N; i++) if (N % i === 0) out.push(i); return out; }

// Fabrique un exercice reproductible
const FRAC_IDS = new Set(['qc_s1_ari_03', 'qc_s1_ari_04', 'qc_s1_ari_05', 'qc_s1_prb_02', 'qc_s1_pro_02']);
export function makeExercise(id, seed, d = 1) {
  const g = GEN[id] || GEN2[id]; if (!g) throw new Error(`compétence inconnue ${id}`);
  const rng = makeRng(hashSeed(id, seed, d));
  const ex = { id, seed, d, ...g(rng, d) };
  if (ex.answer.kind === 'num' && (FRAC_IDS.has(id) || ex.data.mode === 'frac')) ex.answer.fields.forEach(f => { f.frac = true; });
  return ex;
}
// Réponse canonique (pour l’affichage après réussite et pour les tests)
export function canonical(answer) {
  if (answer.kind === 'choice') return answer.choices[answer.correct];
  return answer.fields.map(f => (f.pi ? piText(f.value) : fmt(f.value, { asFraction: !!f.frac && f.value.d !== 1 }))).join(' ; ');
}
// 12π · π · 3π/4 · π/2
export function piText(c) {
  const sign = c.n < 0 ? '−' : '', a = Math.abs(c.n);
  return `${sign}${a === 1 ? '' : a}π${c.d === 1 ? '' : `/${c.d}`}`;
}

export { GEN2 };
