// Tests de la progression, du magasin et de la sauvegarde.
import { TOOLS, nextUpgrade, recordAnswer, isUnlocked, warmupFor, stats, defiChoices, DEFI_SKILLS, MASTERY, canFerry, ferryProgress, MAX_LEVEL } from '../js/progression.js';
import { SKILLS2, EDGES2, isS2 } from '../js/math/skills.js';
import { phareSteps, phareCheck } from '../js/phare.js';
import { checkField } from '../js/math/check.js';
import { RARE_FISH2, canKiosk, kioskExercise, kioskDone, useBait } from '../js/actionq.js';
import { CATALOG, quote, checkTotal } from '../js/shop.js';
import { newState, load, save, reset, KEY } from '../js/save.js';
import { SKILLS, EDGES } from '../js/math/skills.js';
import { makeRng } from '../js/math/rng.js';
import { quoteFor, forgetQuote, SELL } from '../js/shop.js';
import * as AN from '../js/animaux.js';
import { pickQuestion, rareBiteChance, loot, timeFor, makeTimer, FRACTION_SKILLS, RARE_FISH, SIROP } from '../js/actionq.js';
import { makeExercise } from '../js/math/gen.js';
import { missRate, weakList } from '../js/adapt.js';
import { LECONS } from '../js/lecons.js';

export function run(ok) {
  // Graphe sans cycle, toutes les compétences atteignables en maîtrisant dans l’ordre
  const st = newState(1); const done = new Set(); let guard = 0;
  while (done.size < SKILLS.length && guard++ < 50) for (const s of SKILLS) if (!done.has(s.id) && isUnlocked(st, s.id)) { st.mastery[s.id] = { ok: MASTERY, tries: 3, miss: 0 }; done.add(s.id); }
  ok('toutes les compétences atteignables', done.size === 22, done.size);
  ok('arêtes valides', EDGES.every(e => SKILLS.some(s => s.id === e.skill) && SKILLS.some(s => s.id === e.prereq)));
  ok('15 + 7 compétences', TOOLS.flatMap(t => t.skills).length === 15 && DEFI_SKILLS.length === 7);
  // Au départ, le niveau 1 des 5 outils est débloqué
  const s0 = newState(2);
  ok('niv 1 débloqués', TOOLS.every(t => nextUpgrade(s0, t.id).unlocked), TOOLS.map(t => nextUpgrade(s0, t.id).skill).join());
  // 3 bonnes réponses → amélioration
  let r; for (let i = 0; i < 3; i++) r = recordAnswer(s0, 'qc_s1_ari_01', true, { tool: 'canne' });
  ok('canne niv 1', s0.tools.canne === 1 && r.upgraded?.level === 1 && r.mastered);
  ok('canne niv 2 débloqué (ari_02 ← ari_01)', nextUpgrade(s0, 'canne').unlocked);
  ok('canne niv 3 bloqué tant que ari_02 pas maîtrisé', !isUnlocked(s0, 'qc_s1_pro_01'));
  // 2 erreurs → réchauffement sur un préalable ; « presque » ne compte pas
  recordAnswer(s0, 'qc_s1_ari_02', false, { tool: 'canne' }); recordAnswer(s0, 'qc_s1_ari_02', false, { near: true });
  r = recordAnswer(s0, 'qc_s1_ari_02', false, { tool: 'canne' });
  ok('réchauffement après 2 erreurs', r.warmup?.skill === 'qc_s1_ari_01', JSON.stringify(r.warmup));
  ok('réchauffement racine = même compétence', warmupFor('qc_s1_geo_01').skill === 'qc_s1_geo_01');
  ok('réchauffement faible', warmupFor('qc_s1_alg_01').skill === 'qc_s1_ari_01');
  ok('pas de pénalité', s0.tools.canne === 1 && s0.money === 2500);
  ok('stats croissantes', stats('sac', 0).cap === 4 && stats('sac', 3).cap === 20 && stats('canne', 3).window > stats('canne', 0).window);
  ok('défis proposés', defiChoices(s0).length > 0 && defiChoices(s0).every(id => isUnlocked(s0, id)));
  // Magasin
  const fixed = (rabais) => ({ chance: () => rabais > 0, pick: () => rabais });
  const q1 = quote({ prixCents: 2400 }, fixed(0));
  ok('24,00 $ → 27,59 $', q1.totalCents === 2759 && q1.tpsCents === 120 && q1.tvqCents === 239, JSON.stringify(q1));
  const q2 = quote({ prixCents: 12000 }, fixed(25));
  ok('120 $ −25 % → 103,48 $', q2.totalCents === 10348 && q2.baseCents === 9000, JSON.stringify(q2));
  ok('total accepté (virgule, point, $)', checkTotal('27,59', q1).ok && checkTotal('27.59', q1).ok && checkTotal('27,59 $', q1).ok);
  ok('oubli des taxes détecté', /taxes/.test(checkTotal('24', q1).msg));
  ok('mauvais total refusé', !checkTotal('27,60', q1).ok);
  const rng = makeRng(5); let allOk = true;
  for (let i = 0; i < 500; i++) { const it = CATALOG[i % CATALOG.length], q = quote(it, rng); const s = (q.totalCents / 100).toFixed(2).replace('.', ',');
    if (!checkTotal(s, q).ok || !checkTotal((q.altTotalCents / 100).toFixed(2), q).ok || Math.abs(q.totalCents - q.altTotalCents) > 1) allOk = false; }
  ok('500 devis cohérents', allOk);
  ok('nichoir abordable au départ', quote(CATALOG[0], fixed(0)).totalCents <= 2500);
  // Sauvegarde
  const mem = {}; globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } };
  const s1 = newState(9); s1.money = 1234; s1.tools.sac = 2; save(s1);
  const l1 = load(); ok('sauvegarde/chargement', l1.money === 1234 && l1.tools.sac === 2 && l1.seed === 9);
  mem[KEY] = '{pas du json'; ok('sauvegarde corrompue → neuve', load(3).money === 2500);
  mem[KEY] = JSON.stringify({ v: 1, seed: 4, money: 10 }); const l2 = load(); ok('vieille sauvegarde complétée', l2.tools.canne === 0 && l2.bridges.erables === false && l2.money === 10);
  // Sauvegarde de l’étape 1 (forme réelle v1) → normalisée pour l’étape 2
  const v1 = { v: 1, seed: 77, money: 4321, tools: { canne: 2, arrosoir: 1, filet: 0, pelle: 0, sac: 1 }, upg: { canne: 1 }, mastery: { qc_s1_ari_01: { ok: 3, tries: 4, miss: 0 } }, bag: ['perchaude', 'esturgeon'], decor: ['nichoir'], bridges: { erables: true, plage: false },
    pos: { x: 3, z: 7 }, clock: 0.4, exCount: 12, muted: true, met: { intro: 1, gaston: 2 }, journal: { fish: 5, bugs: 1, finds: 2, coins: 900, flowers: 3 } };
  mem[KEY] = JSON.stringify(v1); const l3 = load();
  ok('sauvegarde v1 chargée sans perte', l3.money === 4321 && l3.tools.canne === 2 && l3.bag.length === 2 && l3.decor[0] === 'nichoir' && l3.bridges.erables && l3.mastery.qc_s1_ari_01.ok === 3 && l3.journal.fish === 5 && l3.exCount === 12 && l3.muted);
  ok('sauvegarde v1 normalisée (→ v5)', l3.v === 5 && l3.island === 1 && l3.ferry === false && l3.phare.step === 0 && l3.appats === 0 && l3.journal.rare === 0 && l3.journal.sirop === 0 && JSON.stringify(l3.rares) === '{}' && JSON.stringify(l3.quotes) === '{}' && l3.day === 0);
  mem[KEY] = JSON.stringify({ ...v1, rares: null, quotes: [], bag: 'x' }); const l4 = load(); ok('champs abîmés réparés', JSON.stringify(l4.rares) === '{}' && JSON.stringify(l4.quotes) === '{}' && Array.isArray(l4.bag));
  save(l3); ok('v5 relue', load().v === 5 && load().money === 4321);
  { const v2 = { ...v1, v: 2, rares: { omble: 2 }, quotes: { nichoir: { rabais: 10 } }, day: 4, journal: { ...v1.journal, rare: 2, sirop: 1 } };
    mem[KEY] = JSON.stringify(v2); const l5 = load();
    ok('sauvegarde v2 chargée sans perte', l5.v === 5 && l5.rares.omble === 2 && l5.quotes.nichoir.rabais === 10 && l5.day === 4 && l5.journal.rare === 2 && l5.money === 4321 && l5.tools.canne === 2 && l5.island === 1 && l5.kiosk.day === -1);
    mem[KEY] = JSON.stringify({ ...v2, v: 3, island: 2, ferry: true, phare: { step: 2, done: false }, appats: 3, tools: { ...v1.tools, canne: 4 } }); const l6 = load();
    ok('sauvegarde v3 (île 2, niveau 4)', l6.island === 2 && l6.ferry && l6.phare.step === 2 && l6.appats === 3 && l6.tools.canne === 4);
    mem[KEY] = JSON.stringify({ ...v2, v: 3, island: 7, phare: 'x', appats: -2, kiosk: null }); const l7 = load();
    ok('champs v3 abîmés réparés', l7.island === 1 && l7.phare.step === 0 && l7.appats === 0 && l7.kiosk.day === -1); }
  // v4 : statistiques par compétence, migrées depuis la maîtrise des vieilles sauvegardes
  ok('v1 → v4 : statistiques reconstruites depuis la maîtrise', l3.stats.qc_s1_ari_01?.n === 4 && l3.stats.qc_s1_ari_01.ok === 3 && l3.stats.qc_s1_ari_01.h === '' && Array.isArray(l3.recentQ));
  { mem[KEY] = JSON.stringify({ ...v1, v: 3, mastery: { qc_s1_ari_04: { ok: 1, tries: 6, miss: 5 }, qc_s1_geo_01: { ok: 0, tries: 0, miss: 0 } } }); const m3 = load();
    ok('v3 → v4 : essais et réussites conservés', m3.v === 5 && m3.stats.qc_s1_ari_04.n === 6 && m3.stats.qc_s1_ari_04.ok === 1 && !m3.stats.qc_s1_geo_01 && m3.money === 4321);
    mem[KEY] = JSON.stringify({ ...v1, v: 4, stats: { qc_s1_ari_05: { n: 4, ok: 1, h: '0100', sec: 22 }, bad: { n: 'x' }, qc_s1_alg_01: { n: 2, ok: 9, h: 'a1' } }, recentQ: ['qc_s1_ari_05', 3] }); const m4 = load();
    ok('v4 relue, stats abîmées réparées', m4.stats.qc_s1_ari_05.h === '0100' && m4.stats.qc_s1_ari_05.sec === 22 && !m4.stats.bad && m4.stats.qc_s1_alg_01.ok === 2 && m4.stats.qc_s1_alg_01.h === '1' && m4.recentQ.join() === 'qc_s1_ari_05');
    mem[KEY] = JSON.stringify({ ...v1, v: 4, stats: [1, 2], recentQ: 'x' }); const m5 = load(); ok('v4 : stats illisibles → vides', JSON.stringify(m5.stats) === JSON.stringify({ qc_s1_ari_01: { n: 4, ok: 3, h: '' } }) && m5.recentQ.length === 0); }
  reset(); ok('reset', !(KEY in mem));
  delete globalThis.localStorage;

  // Devis mémorisé (rabais qui ne change plus en rouvrant l’article)
  { const st = newState(11), it = CATALOG[1]; const a = quoteFor(st, it), b = quoteFor(st, it);
    ok('même devis en rouvrant', a.rabais === b.rabais && a.totalCents === b.totalCents && st.exCount === 1);
    let changed = false; for (let i = 0; i < 20 && !changed; i++) { forgetQuote(st, it); const c = quoteFor(st, it); if (c.rabais !== a.rabais) changed = true; }
    ok('nouveau devis après achat', changed);
    const st2 = newState(12); const d0 = quoteFor(st2, it); let dayChange = false;
    for (let i = 0; i < 20 && !dayChange; i++) { st2.day++; if (quoteFor(st2, it).rabais !== d0.rabais) dayChange = true; }
    ok('nouveau devis le lendemain', dayChange);
    ok('devis par article', (quoteFor(st2, CATALOG[0]), Object.keys(st2.quotes).length === 2)); }

  // Questions en action
  ok('touche rare ≈ 1 sur 4, mieux avec la canne', rareBiteChance(0) === 0.25 && rareBiteChance(3) > rareBiteChance(2) && rareBiteChance(2) > rareBiteChance(1) && rareBiteChance(1) > 0.25 && rareBiteChance(3) <= 0.41);
  ok('butin selon la difficulté', loot('fish', 0) === 'omble' && loot('fish', 2) === 'esturgeon' && loot('maple', 1) === 'sirop' && [...RARE_FISH, ...SIROP].every(k => SELL[k] > 0));
  ok('plus difficile = plus payant', SELL[RARE_FISH[0]] < SELL[RARE_FISH[1]] && SELL[RARE_FISH[1]] < SELL[RARE_FISH[2]] && SELL[SIROP[0]] < SELL[SIROP[1]] && SELL[SIROP[1]] < SELL[SIROP[2]] && SELL.omble > SELL.truite);
  { const st = newState(13), r = makeRng(1); let fishOpen = 0, stretch = 0, maple = 0, mapleBad = 0, dmax = 0; const N = 2000;
    for (let i = 0; i < N; i++) { const q = pickQuestion(st, 'fish', r); if (q.stretch) { stretch++; if (q.d !== 0) dmax = 9; } else { fishOpen += isUnlocked(st, q.skill) ? 1 : 0; dmax = Math.max(dmax, q.d); }
      const m = pickQuestion(st, 'maple', r); maple++; if (!FRACTION_SKILLS.includes(m.skill)) mapleBad++; }
    ok('pêche : surtout des compétences débloquées', fishOpen === N - stretch && stretch > N * 0.1 && stretch < N * 0.2, `${stretch}`);
    ok('érable : toujours des fractions', mapleBad === 0);
    ok('débutant : basique ou standard (petit coup de pouce)', dmax <= 1);
    st.mastery.qc_s1_ari_03 = { ok: 3, tries: 3, miss: 0 }; st.mastery.qc_s1_ari_04 = { ok: 3, tries: 3, miss: 0 }; st.mastery.qc_s1_ari_05 = { ok: 3, tries: 3, miss: 0 }; st.mastery.qc_s1_ari_06 = { ok: 3, tries: 3, miss: 0 };
    let adv = 0; for (let i = 0; i < 200; i++) if (pickQuestion(st, 'maple', r).d === 2) adv++;
    ok('fractions maîtrisées → avancé', adv === 200); }
  // Statistiques par réponse + questions adaptatives
  { const st = newState(31);
    recordAnswer(st, 'qc_s1_ari_01', true, { sec: 12 }); recordAnswer(st, 'qc_s1_ari_01', false, { sec: 30 }); recordAnswer(st, 'qc_s1_ari_01', false, { near: true });
    const s = st.stats.qc_s1_ari_01;
    ok('statistiques : essais, bonnes, historique, temps (« presque » ignoré)', s.n === 2 && s.ok === 1 && s.h === '10' && s.sec === 17.4 && st.mastery.qc_s1_ari_01.tries === 3, JSON.stringify(s));
    for (let i = 0; i < 15; i++) recordAnswer(st, 'qc_s1_ari_02', i % 3 === 0);
    ok('historique limité aux 10 dernières', st.stats.qc_s1_ari_02.h.length === 10 && st.stats.qc_s1_ari_02.n === 15 && st.stats.qc_s1_ari_02.ok === 5);
    ok('taux d’erreur lissé', Math.abs(missRate(st, 'qc_s1_ari_01') - 0.5) < 1e-9 && missRate(st, 'qc_s1_geo_01') === null);
    ok('à pratiquer = les plus ratées d’abord', weakList(st, SKILLS.map(x => x.id)).join() === 'qc_s1_ari_02,qc_s1_ari_01', weakList(st, SKILLS.map(x => x.id)).join()); }
  { // Tout débloqué, deux compétences qui accrochent : elles reçoivent ~55–60 % des piges, les autres ne sont pas oubliées
    const st = newState(32); SKILLS.forEach(x => { st.mastery[x.id] = { ok: MASTERY, tries: 3, miss: 0 }; });
    const ids = SKILLS.map(x => x.id), weak = ['qc_s1_ari_05', 'qc_s1_alg_04'];
    const base = newState(33); base.mastery = st.mastery;
    for (const id of ids) st.stats[id] = { n: 5, ok: 5, h: '11111' };
    st.stats.qc_s1_ari_05 = { n: 8, ok: 2, h: '00100100' }; st.stats.qc_s1_alg_04 = { n: 6, ok: 2, h: '010010' };
    const r = makeRng(5), rb = makeRng(5), N = 6000, cnt = {}, cntB = {}; let w = 0, wb = 0, run = 1, maxRun = 1, prev = null, weakFlag = 0, easyWeak = 0;
    for (let i = 0; i < N; i++) {
      const q = pickQuestion(st, 'fish', r); if (q.stretch) continue; cnt[q.skill] = (cnt[q.skill] || 0) + 1; if (weak.includes(q.skill)) w++;
      if (q.weak) { weakFlag++; if (q.d > 1) easyWeak++; }
      run = q.skill === prev ? run + 1 : 1; maxRun = Math.max(maxRun, run); prev = q.skill;
      const b = pickQuestion(base, 'fish', rb); if (!b.stretch) { cntB[b.skill] = (cntB[b.skill] || 0) + 1; if (weak.includes(b.skill)) wb++; } }
    const tot = Object.values(cnt).reduce((a, b) => a + b, 0), totB = Object.values(cntB).reduce((a, b) => a + b, 0), share = w / tot, shareB = wb / totB;
    const others = ids.filter(id => !weak.includes(id)), minOther = Math.min(...others.map(id => cnt[id] || 0));
    ok('adaptatif : les compétences ratées reçoivent ~50–65 % des piges', share > 0.5 && share < 0.65, share.toFixed(3));
    ok('adaptatif : sans statistiques, part normale (~2/22)', shareB < 0.15, shareB.toFixed(3));
    ok('adaptatif : aucune autre compétence affamée', others.every(id => cnt[id] > 0) && minOther > (tot * (1 - share) / others.length) * 0.4, `${minOther}`);
    ok('adaptatif : jamais 3 fois de suite la même', maxRun <= 2, `${maxRun}`);
    ok('adaptatif : en pratique ciblée, niveau basique ou standard', weakFlag > 0 && easyWeak === 0, `${weakFlag} ${easyWeak}`);
    // Compétences jamais vues : une vraie chance même quand d’autres accrochent
    const sn = newState(34); sn.mastery = st.mastery; sn.stats = { qc_s1_ari_05: { n: 8, ok: 1, h: '00000010' } }; const rn = makeRng(8), seen = new Set();
    for (let i = 0; i < 3000; i++) seen.add(pickQuestion(sn, 'fish', rn).skill);
    ok('adaptatif : les compétences jamais vues sortent aussi', ids.every(id => seen.has(id)), `${seen.size}`);
    // Érable : la pratique ciblée reste dans les fractions
    const rm = makeRng(9); let bad = 0, f5 = 0; for (let i = 0; i < 2000; i++) { const q = pickQuestion(st, 'maple', rm); if (!FRACTION_SKILLS.includes(q.skill)) bad++; if (q.skill === 'qc_s1_ari_05') f5++; }
    ok('érable adaptatif : fractions seulement, la plus ratée en tête', bad === 0 && f5 / 2000 > 0.45, `${bad} ${f5}`);
    ok('défi : la notion à pratiquer proposée en premier', defiChoices(st)[0] === 'qc_s1_ari_05'); }
  { const ex0 = makeExercise('qc_s1_ari_01', 's', 0), ex2 = makeExercise('qc_s1_ari_04', 's', 2);
    const t0 = timeFor(ex0), t2 = timeFor(ex2), ts = timeFor(ex0, { stretch: true });
    ok('chrono généreux 20–35 s', t0 >= 20 && t0 <= 25 && t2 >= 30 && t2 <= 35 && ts === t0 + 5, `${t0} ${t2} ${ts}`);
    const tm = makeTimer(20); tm.tick(5); ok('chrono avance seulement quand on le fait avancer', tm.left === 15 && !tm.done);
    ok('chrono fini', tm.tick(30) === true && tm.done && tm.left === 0 && tm.tick(1) === false); }

  // ——— Secondaire 2 ———
  ok('12 compétences s2, arêtes vers des compétences connues', SKILLS2.length === 12 && EDGES2.every(e => isS2(e.skill) && [...SKILLS, ...SKILLS2].some(s => s.id === e.prereq)));
  { const st = newState(21); const done = new Set(SKILLS.map(s => s.id)); SKILLS.forEach(s => { st.mastery[s.id] = { ok: MASTERY, tries: 3, miss: 0 }; }); let g = 0;
    while (done.size < 34 && g++ < 50) for (const s of SKILLS2) if (!done.has(s.id) && isUnlocked(st, s.id)) { st.mastery[s.id] = { ok: MASTERY, tries: 3, miss: 0 }; done.add(s.id); }
    ok('les 12 compétences s2 atteignables', done.size === 34); }
  ok('réchauffement s2 → préalable de secondaire 1', SKILLS2.every(s => /^qc_s1_/.test(warmupFor(s.id).skill)), SKILLS2.map(s => warmupFor(s.id).skill).join());
  { const st = newState(22);
    ok('traversier verrouillé au départ', !canFerry(st) && ferryProgress(st).length === 5 && ferryProgress(st).every(t => !t.ok));
    TOOLS.forEach(t => { st.tools[t.id] = 2; }); st.tools.sac = 1;
    ok('traversier : il manque le sac', !canFerry(st) && ferryProgress(st).filter(t => !t.ok).map(t => t.id).join() === 'sac');
    st.tools.sac = 3; ok('traversier débloqué (tous ≥ 2)', canFerry(st));
    const s2 = newState(23); s2.ferry = true; ok('crochet QA : ferry forcé', canFerry(s2));
    st.tools.canne = 3; const nu = nextUpgrade(st, 'canne');
    ok('niveau 4 = compétence s2 de l’île 2', nu.level === 4 && nu.island2 && nu.skill === 'qc_s2_pro_02' && TOOLS.every(t => isS2(t.s2)));
    SKILLS.forEach(s => { st.mastery[s.id] = { ok: MASTERY, tries: 3, miss: 0 }; });
    ok('niveau 4 débloqué quand les préalables s1 sont maîtrisés', nextUpgrade(st, 'canne').unlocked);
    let r; for (let i = 0; i < 3; i++) r = recordAnswer(st, 'qc_s2_pro_02', true, { tool: 'canne' });
    ok('canne niveau 4', st.tools.canne === 4 && r.upgraded?.level === 4 && nextUpgrade(st, 'canne') === null && MAX_LEVEL === 4);
    ok('stats niveau 4', stats('canne', 4).window > stats('canne', 3).window && stats('sac', 4).cap === 30 && stats('filet', 9).chance === 1);
    ok('défis s2 proposés', defiChoices(st, 2).length > 0 && defiChoices(st, 2).every(isS2));
    const r2 = makeRng(3); let bad = 0; for (let i = 0; i < 300; i++) { const q = pickQuestion(st, i % 2 ? 'maple' : 'fish', r2, 2); if (!isS2(q.skill)) bad++; }
    ok('île 2 : érables rouges et pêche en s2', bad === 0);
    ok('poissons rares de l’île 2', loot('fish', 0, 2) === 'gros_dore' && loot('fish', 2, 2) === 'bar' && loot('fish', 1) === 'maskinonge' && RARE_FISH2.every(k => SELL[k] > SELL.esturgeon * 0.5) && SELL.bar > SELL.saumon && SELL.saumon > SELL.gros_dore);
    // Kiosque : une pige par jour, appât rare si réussie
    st.island = 2; ok('kiosque ouvert', canKiosk(st)); const kx = kioskExercise(st, makeExercise, 1);
    ok('kiosque : pige de probabilité', kx.id === 'qc_s2_prb_01' && kx.answer.kind === 'num');
    kioskDone(st, true); ok('kiosque : appât gagné, fermé jusqu’à demain', st.appats === 1 && !canKiosk(st));
    st.day++; ok('kiosque rouvre le lendemain', canKiosk(st));
    ok('appât utilisé sur l’île 2 seulement', useBait(st) && st.appats === 0 && !useBait(st)); st.appats = 1; st.island = 1; ok('pas d’appât sur l’île 1', !useBait(st) && st.appats === 1); }
  // Phare : 3 étapes, réponses exactes et arrondies acceptées
  { let allOk = true, ks = new Set();
    for (let s = 0; s < 200; s++) { const steps = phareSteps(s), exp = phareCheck(s); ks.add(steps[0].data.k);
      steps.forEach((ex, i) => { const f = ex.answer.fields[0]; const v = exp[i];
        const typed = f.pi ? (Math.round(v * 100) / 100).toFixed(2).replace('.', ',') : String(v);
        if (!checkField(typed, f).ok || checkField(String(v + 1), f).ok || !ex.figure || ex.hints.length !== 3 || !isS2(ex.skill)) allOk = false;
        if (f.pi && !checkField(`${f.value.n}π${f.value.d > 1 ? '/' + f.value.d : ''}`, f).ok) allOk = false; }); }
    ok('phare : 200 graines, 3 étapes cohérentes', allOk && ks.size === 3); }

  // Leçons d’Hortense : une fiche par compétence, exemples recalculés
  { const ids = [...SKILLS, ...SKILLS2].map(s => s.id), miss = ids.filter(id => !LECONS[id]);
    ok('leçons : une fiche pour chacune des 34 compétences', ids.length === 34 && !miss.length && Object.keys(LECONS).length === 34, miss.join(','));
    const bad = ids.filter(id => { const L = LECONS[id]; return !L || L.idee.length < 2 || L.idee.length > 4 || !L.regle || L.ex.etapes.length < 2 || !L.ex.q || !L.ex.rep; });
    ok('leçons : idée (2 à 4 phrases), règle, exemple en étapes', !bad.length, bad.join(','));
    for (const id of ids) { const [a, b] = LECONS[id].chk(); ok(`leçon ${id} : exemple recalculé`, Number.isFinite(a) && Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`); } }

  // Animaux : rapports de Charlie limités, 3 quêtes qui tournent, récompenses, sauvegarde v5
  { const a = AN.animauxDefaut(), rng = makeRng(3);
    ok('animaux : Charlie rapporte au plus 3 fois par jour, avec une pause', AN.canFetch(a, 0, 100) && (AN.noteFetch(a, 100), !AN.canFetch(a, 0, 120)) && AN.canFetch(a, 0, 141) && (AN.noteFetch(a, 141), AN.noteFetch(a, 300), !AN.canFetch(a, 0, 999)) && AN.canFetch(a, 1, 999) && a.fetchN === 0);
    const seen = new Set(); for (let i = 0; i < 2000; i++) seen.add(AN.pickLoot(rng));
    ok('animaux : trouvailles variées, toutes vendables ou en sous', seen.size === AN.FETCH_LOOT.length && [...seen].every(k => k === 'piece' || SELL[k] > 0));
    const p = new Set(); for (let i = 0; i < 200; i++) p.add(AN.pieceCents(rng)); ok('animaux : pièce de 0,25 $ à 1,00 $', [...p].sort((x, y) => x - y).join() === '25,50,75,100');
    const d0 = AN.questsDuJour(a, 0).map(q => q.id), d1 = AN.questsDuJour(a, 1).map(q => q.id);
    ok('quêtes : au moins 3, ordre qui tourne chaque jour', d0.length >= 3 && d0.join() !== d1.join() && new Set(d1).size === d0.length);
    for (const id of AN.QUETE_IDS) { const b = AN.animauxDefaut();
      ok(`quête ${id} : départ, une seule à la fois`, AN.startQuest(b, id, 5, [1, 2]) && b.quete === id && !AN.startQuest(b, AN.QUETE_IDS.find(x => x !== id), 5, [1, 2]) && AN.questsDuJour(b, 5).find(q => q.id === id).etat === 'active');
      const r = AN.finishQuest(b, 5);
      ok(`quête ${id} : récompense (sous + collier neuf la 1re fois)`, r.cents > 0 && r.collier === AN.QUETES[id].collier && b.collier === r.collier && b.colliers.includes(r.collier) && b.total === 1 && !b.quete);
      ok(`quête ${id} : pas deux fois le même jour, possible le lendemain`, !AN.startQuest(b, id, 5, [1, 2]) && AN.startQuest(b, id, 6, [1, 2]) && AN.finishQuest(b, 6).collier === null); }
    ok('quêtes : cachette déterministe parmi les valides', JSON.stringify(AN.pickSpot([[1, 1], [2, 2], [3, 3]], 4, 'olga', 7)) === JSON.stringify(AN.pickSpot([[1, 1], [2, 2], [3, 3]], 4, 'olga', 7)) && AN.pickSpot([], 1, 'olga') === null);
    const n = AN.normAnimaux({ fetchN: 'x', quete: 'olga', spot: null, colliers: ['rose', 'bidon'], collier: 'bidon', faites: { olga: 3, zz: 1 }, olga: { x: 1, z: 'a' } });
    ok('animaux : données abîmées réparées', n.fetchN === 0 && n.quete === null && n.colliers.join() === 'bleu,rose' && n.collier === 'bleu' && n.faites.olga === 3 && !('zz' in n.faites) && n.olga === null);
    const mem = {}; globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
    for (const v of [1, 2, 3, 4]) { const base = newState(9); delete base.animaux; mem[KEY] = JSON.stringify({ ...base, v }); const l = load(); ok(`v${v} → v5 : animaux par défaut`, l.v === 5 && l.animaux.collier === 'bleu' && l.animaux.quete === null && l.animaux.fetchN === 0); }
    const s5 = newState(9); s5.animaux = { ...AN.animauxDefaut(), quete: 'balle', spot: [3, 4], colliers: ['bleu', 'vert'], collier: 'vert', total: 2, faites: { gisele: 7 } }; save(s5);
    const l5 = load(); ok('v5 relue : quête en cours, colliers, réussites', l5.v === 5 && l5.animaux.quete === 'balle' && l5.animaux.spot.join() === '3,4' && l5.animaux.collier === 'vert' && l5.animaux.total === 2 && l5.animaux.faites.gisele === 7); }
}
