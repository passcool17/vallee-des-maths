// Parcours de bout en bout de l’île de secondaire 2 (bureau puis mobile 390×844), avec de vraies entrées.
// Usage : node tools/serve.js 8653 & node tools/test-s2.cjs [port]
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
const path = require('path');
const PORT = +process.argv[2] || 8653, URL = `http://localhost:${PORT}/`;
const SHOTS = path.join(__dirname, '..', '..', 'shots');
const EXE = '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
let pass = 0, fail = 0, CUR = null; const FPS = {};
const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };
const OVERLAP = sels => { const R = []; for (const s of sels) for (const el of document.querySelectorAll(s)) { const st = getComputedStyle(el), r = el.getBoundingClientRect(); if (st.display !== 'none' && st.visibility !== 'hidden' && r.width && r.height && !el.closest('.hidden')) R.push([s, r]); }
  const bad = []; for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const [a, ra] = R[i], [b, rb] = R[j]; if (ra.left < rb.right - 1 && rb.left < ra.right - 1 && ra.top < rb.bottom - 1 && rb.top < ra.bottom - 1) bad.push(`${a}×${b}`); }
  const off = R.filter(([, r]) => r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1).map(([s]) => `${s} hors écran`);
  return [...bad, ...off]; };
const HUD = ['#money', '#clock', '#bag', '#btn-carnet', '#btn-son', '#prompt', '#stick', '#act', '#toasts .toast'];
const PANEL = ['#panel .exhead', '#panel .q', '#panel .figure', '#panel .vtable', '#panel .fields', '#panel .numpad', '#panel .btn.hint', '#panel .choices', '#panel .validate'];

async function run(kind) {
  const mobile = kind === 'mobile', px = mobile ? 'm' : 'd';
  const browser = await chromium.launch({ executablePath: EXE, args: ARGS });
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage(); const errs = []; CUR = p;
  p.on('pageerror', e => errs.push(`pageerror: ${e.message}`)); p.on('console', m => { if (m.type() === 'error') errs.push(`console: ${m.text()}`); });
  const ev = (f, a) => p.evaluate(f, a);
  const waitT = s => ev(s => __mv.waitT(s), s);
  const shot = async name => { await waitT(0.35); await p.screenshot({ path: path.join(SHOTS, `${px}-s2-${name}.png`) }); };
  const press = async sel => mobile ? p.tap(sel) : p.click(sel);
  const pressBtn = async re => { const b = p.locator('#panel .btn', { hasText: re }).first(); mobile ? await b.tap() : await b.click(); };
  const act = async () => mobile ? p.tap('#act') : p.keyboard.press('KeyE');
  const near = async (x, z) => { await ev(([x, z]) => __mv.tp(x, z), [x, z]); await waitT(0.3); };
  const toVillager = async id => { const v = await ev(id => { const v = __mv.G.villagers.find(v => v.id === id); return { x: v.pos.x, z: v.pos.z }; }, id); await near(v.x, v.z + 1.4); };
  const toThing = async (id, dz = 0.4) => { const t = await ev(id => { const i = __mv.W().interactables.find(i => i.id === id); return { x: i.pos.x, z: i.pos.z }; }, id); await near(t.x, t.z + dz); };
  const carnet = async () => { if (mobile) await press('#btn-carnet'); else await p.keyboard.press('KeyC'); await p.waitForSelector('#panel .carnet'); };
  const keyFor = ch => (ch === '-' || ch === '−' ? '−' : ch === '.' ? ',' : ch);
  // Saisie réelle au pavé (ou boutons de choix) ; « over » permet d’entrer une autre forme équivalente
  const typeAnswer = async (over) => {
    await p.waitForFunction(() => __mv.flows.cur && !document.querySelector('#panel .feedback.ok'), null, { timeout: 5000 });
    const info = await ev(() => { const c = __mv.flows.cur; return { kind: c.ex ? c.ex.answer.kind : 'num', ans: c.answer() }; });
    if (info.kind === 'choice') { const btns = p.locator('#panel .btn.choice'); const n = await btns.count(); for (let i = 0; i < n; i++) if ((await btns.nth(i).textContent()) === info.ans) { mobile ? await btns.nth(i).tap() : await btns.nth(i).click(); break; } await press('#panel .validate'); return info.ans; }
    const parts = (over || info.ans).split(' ; ');
    for (let f = 0; f < parts.length; f++) { await press(`#panel .field[data-f="${f}"]`); for (const ch of parts[f]) await press(`#panel .numpad [data-k="${keyFor(ch)}"]`); }
    await press('#panel .numpad [data-k="✓"]'); return over || info.ans;
  };
  const nextBtn = async () => { await press('#panel .exercise > .btn.primary:not(.hidden)'); await waitT(0.2); };
  const panelOK = async tag => {
    const lay = await ev(() => { const s = document.querySelector('#panel .sheet'); const r = s.getBoundingClientRect(); return { w: s.scrollWidth <= s.clientWidth + 1, inside: r.left >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && r.top >= 0 }; });
    const ov = await ev(OVERLAP, PANEL);
    // Le pavé (ou les choix) doit être entièrement visible sans défiler
    const padIn = await ev(() => { const n = document.querySelector('#panel .numpad:not(.hidden), #panel .choices'); if (!n) return true; const r = n.getBoundingClientRect(); return r.bottom <= innerHeight + 1; });
    ok(`${px} ${tag} : panneau dans l’écran, pavé visible, sans chevauchement`, lay.w && lay.inside && padIn && ov.filter(x => !x.includes('hors écran')).length === 0, ov.join(' | '));
  };
  const fpsAt = async (x, z) => { await near(x, z); await waitT(2.5); return ev(() => __mv.fps()); };

  await p.goto(`${URL}?fresh=1&seed=4242&time=doree`); await p.waitForSelector('#play');
  await press('#play'); await waitT(1.2);
  FPS[`${px}1`] = await fpsAt(1, 10);

  // 1) Traversier verrouillé sur l’île 1 : explication + progrès
  await toThing('traversier'); ok(`${px} invite « Prendre le traversier »`, (await ev(() => __mv.nearest())) === 'traversier');
  ok(`${px} panneau du quai verrouillé (🔒)`, await ev(() => __mv.G.ferryLock === true));
  await shot('00-avant-traversier-ferme');
  await act(); await p.waitForSelector('#panel .ferry.locked');
  ok(`${px} traversier fermé : 5 outils listés, niveau 2 demandé`, await ev(() => document.querySelectorAll('#panel .fp').length === 5 && /niveau 2/.test(document.querySelector('#panel .line').textContent)));
  ok(`${px} aucun bouton « Embarquer » tant que c’est fermé`, await ev(() => !document.querySelector('#panel .board')));
  await shot('01-traversier-ferme'); await press('#panel .x');
  // 2) Les 5 outils au niveau 2 → ouvert
  await ev(() => { for (const t of Object.keys(__mv.state.tools)) __mv.state.tools[t] = 2; }); await waitT(0.3);
  ok(`${px} outils au niveau 2 → panneau déverrouillé`, await ev(() => __mv.G.ferryLock === false));
  await act(); await p.waitForSelector('#panel .ferry .board'); await shot('02-traversier-ouvert');
  await press('#panel .board'); await p.waitForFunction(() => __mv.island() === 2, null, { timeout: 5000 }); await waitT(1);
  ok(`${px} arrivée sur l’île 2 (une seule île active)`, await ev(() => __mv.isle2().root.visible && !__mv.world.root.visible && __mv.state.island === 2));
  ok(`${px} la sauvegarde suit (île 2 enregistrée)`, await ev(() => JSON.parse(localStorage.getItem('vdm.save.v1')).island === 2));
  ok(`${px} Rosalie et Bernard présents`, await ev(() => ['rosalie', 'bernard'].every(id => __mv.G.villagers.some(v => v.id === id)) && !__mv.G.villagers.some(v => v.id === 'gaston')));
  await near(mobile ? 6 : 2, mobile ? 14 : 12); await shot('03-ile2');
  let hud = await ev(OVERLAP, HUD); ok(`${px} île 2 : HUD sans chevauchement`, hud.length === 0, hud.join(' | '));
  FPS[`${px}2`] = await fpsAt(2, 12);

  // 3) Kiosque de Bernard : une pige → un appât rare
  await toVillager('bernard'); await act(); await p.waitForSelector('#panel .dialog');
  await pressBtn(/Piger au kiosque/); await p.waitForSelector('#panel .pige'); await press('#panel .pige'); await p.waitForSelector('#panel .exercise.kiosk');
  ok(`${px} kiosque : question de tirage (avec ou sans remise)`, await ev(() => __mv.flows.cur.ex.id === 'qc_s2_prb_01'));
  await panelOK('kiosque'); await shot('04-kiosque');
  await typeAnswer(); await p.waitForSelector('#panel .feedback.ok');
  ok(`${px} kiosque réussi → 1 appât rare`, await ev(() => __mv.state.appats === 1));
  await nextBtn();
  await toVillager('bernard'); await act(); await pressBtn(/Piger au kiosque/); await p.waitForSelector('#panel .kiosk');
  ok(`${px} une seule pige par jour`, await ev(() => !document.querySelector('#panel .pige') && /demain/.test(document.querySelector('#panel .line').textContent)));
  await press('#panel .x');

  // 4) Poisson rare de l’île 2 avec l’appât
  await ev(() => { delete __mv.force.rare; delete __mv.force.q; });
  const fs = await ev(() => __mv.W().fishSpot); await near(fs.x, fs.z); await act();
  await ev(() => new Promise(res => { const t = setInterval(() => { if (document.querySelector('#prompt')?.textContent.includes('Ça mord fort')) { clearInterval(t); res(); } }, 30); }));
  ok(`${px} l’appât rare garantit une touche rare`, await ev(() => __mv.state.appats === 0));
  await act(); await p.waitForSelector('#panel .action .tbar');
  ok(`${px} question de secondaire 2 au quai`, await ev(() => __mv.flows.cur.q.skill.startsWith('qc_s2_')), await ev(() => __mv.flows.cur.q.skill));
  await panelOK('pêche île 2'); await shot('05-peche-question');
  await typeAnswer(); await p.waitForSelector('#panel .actionwin');
  const rare = await ev(() => __mv.state.bag.find(k => ['gros_dore', 'saumon', 'bar'].includes(k)));
  ok(`${px} poisson rare de l’île 2 dans le sac`, !!rare, rare); await shot('06-poisson-rare');
  await press('#panel .action .btn.primary');

  // 5) Érable rouge : question de secondaire 2
  const tr = await ev(() => { const t = __mv.W().interactables.find(i => i.kind === 'tree' && i.red && __mv.G.time >= i.ready); return { x: t.pos.x, z: t.pos.z, r: t.r }; });
  await ev(() => { __mv.force.maple = true; });
  await near(tr.x, tr.z + tr.r - 0.3); ok(`${px} invite « Secouer l’érable rouge »`, /rouge/.test(await ev(() => document.querySelector('#prompt').textContent)));
  await act(); await p.waitForSelector('#panel .action.maple .tbar');
  ok(`${px} érable rouge → question de secondaire 2`, await ev(() => __mv.flows.cur.q.skill.startsWith('qc_s2_')), await ev(() => __mv.flows.cur.q.skill));
  await panelOK('érable rouge'); await shot('07-erable-rouge');
  await typeAnswer(); await p.waitForSelector('#panel .actionwin'); await press('#panel .action .btn.primary');
  await ev(() => { __mv.force.maple = false; });

  // 6) Atelier de Rosalie : outil au niveau 4 par une compétence de secondaire 2
  const up = await ev(async () => { const m = await import('./js/progression.js'); __mv.state.tools.canne = 3; const u = m.nextUpgrade(__mv.state, 'canne'); for (const s of u.missing) __mv.state.mastery[s] = { ok: 3, tries: 3, miss: 0 }; return u.skill; });
  await toVillager('rosalie'); await act(); await p.waitForSelector('#panel .dialog');
  await pressBtn(/atelier/); await p.waitForSelector('#panel .tools');
  ok(`${px} atelier : 4 étoiles affichées`, await ev(() => document.querySelector('#panel [data-tool="canne"]')?.closest('.tool').querySelector('.stars').textContent === '★★★☆'));
  await press('#panel [data-tool="canne"]'); await p.waitForSelector('#panel .exercise');
  ok(`${px} exercice de secondaire 2 (${up})`, await ev(u => __mv.flows.cur.ex.id === u, up));
  await panelOK('exercice secondaire 2'); await shot('08-exercice-s2');
  for (let i = 0; i < 3; i++) { const a = await typeAnswer(); await p.waitForSelector('#panel .feedback.ok', { timeout: 4000 }).catch(() => {});
    ok(`${px} niveau 4 : bonne réponse ${i + 1}/3 (« ${a} »)`, await ev(() => !!document.querySelector('#panel .feedback.ok'))); await nextBtn(); }
  await p.waitForSelector('#panel .celebrate');
  ok(`${px} canne au niveau 4`, await ev(() => __mv.state.tools.canne === 4)); await shot('09-niveau4');
  await press('#panel .x');

  // 7) Phare : 3 étapes (échelle → aire latérale → aire), réponses en π ou arrondies, virgule
  await toVillager('rosalie'); await act(); await pressBtn(/phare/); await p.waitForSelector('#panel .dialog.phare .figure svg');
  await shot('10-phare-plan'); await pressBtn(/Étape 1/); await p.waitForSelector('#panel .exercise.phare');
  await typeAnswer(); await p.waitForSelector('#panel .feedback.ok'); await nextBtn();
  ok(`${px} phare : étape 2, touche π présente`, await ev(() => __mv.state.phare.step === 1 && !!document.querySelector('#panel .numpad [data-k="π"]')));
  await panelOK('phare étape 2'); await shot('11-phare-etape2');
  const rounded = await ev(() => { const f = __mv.flows.cur.ex.answer.fields[0]; return (f.value.n / f.value.d * Math.PI).toFixed(2).replace('.', ','); });
  await typeAnswer(rounded); await p.waitForSelector('#panel .feedback.ok');
  ok(`${px} phare : réponse arrondie avec virgule acceptée (${rounded})`, true); await nextBtn();
  const piAns = await typeAnswer(); await p.waitForSelector('#panel .feedback.ok');
  ok(`${px} phare : réponse en fonction de π acceptée (${piAns})`, await ev(() => __mv.state.phare.done === true));
  await nextBtn(); await press('#panel .x');
  await ev(() => { __mv.state.clock = 0.875; }); await near(mobile ? 14 : 12, mobile ? -6 : -8); await waitT(1.5);
  ok(`${px} phare allumé la nuit`, await ev(() => __mv.isle2().light.intensity > 10 && __mv.isle2().beams.visible !== false), await ev(() => String(__mv.isle2().light.intensity)));
  await shot('12-phare-nuit');
  await ev(() => { __mv.state.clock = 0.375; }); await waitT(0.5);

  // 8) Carnet : onglet Secondaire 2
  await carnet();
  ok(`${px} carnet : onglet Secondaire 2 ouvert sur l’île 2, 12 compétences`, await ev(() => document.querySelector('#panel .tab.on').dataset.tab === 's2' && document.querySelectorAll('#panel .sk').length === 12));
  ok(`${px} carnet S2 : préalables de secondaire 1 indiqués`, await ev(() => /sec\. 1/.test(document.querySelector('#panel .cbody').textContent)));
  await shot('13-carnet-s2');
  await press('#panel .tab[data-tab="s1"]');
  ok(`${px} carnet : onglet Secondaire 1 (22 compétences)`, await ev(() => document.querySelectorAll('#panel .sk .pda').length === 22));
  await press('#panel .x');

  // 9) Retour vers l’île 1
  await toThing('traversier2'); await act(); await p.waitForSelector('#panel .ferry .board'); await press('#panel .board');
  await p.waitForFunction(() => __mv.island() === 1, null, { timeout: 5000 }); await waitT(0.8);
  ok(`${px} retour sur l’île 1, partie conservée`, await ev(() => __mv.world.root.visible && !__mv.isle2().root.visible && __mv.state.tools.canne === 4 && __mv.state.phare.done && __mv.G.villagers.some(v => v.id === 'gaston')));
  hud = await ev(OVERLAP, HUD); ok(`${px} HUD sans chevauchement au retour`, hud.length === 0, hud.join(' | '));

  // 10) Sauvegardes v1 et v2 sous la même clé (bureau)
  if (!mobile) for (const [tag, V] of [['v1', { v: 1, seed: 77, money: 4321, tools: { canne: 2, arrosoir: 1, filet: 0, pelle: 0, sac: 1 }, upg: { canne: 1 }, mastery: { qc_s1_ari_01: { ok: 3, tries: 4, miss: 0 } }, bag: ['perchaude', 'esturgeon'], decor: ['nichoir'], bridges: { erables: true }, pos: { x: 2, z: 6 }, clock: 0.4, exCount: 12, muted: true, met: { intro: 1, gaston: 2 }, journal: { fish: 5, bugs: 1, finds: 2, coins: 900, flowers: 3 } }],
    ['v2', { v: 2, seed: 88, money: 9876, tools: { canne: 3, arrosoir: 2, filet: 2, pelle: 1, sac: 2 }, upg: {}, mastery: { qc_s1_ari_01: { ok: 3, tries: 3, miss: 0 }, qc_s1_ari_03: { ok: 2, tries: 5, miss: 3 } }, bag: ['omble'], decor: ['nichoir', 'banc'], bridges: { erables: true }, pos: { x: 3, z: 7 }, clock: 0.6, exCount: 40, muted: false, met: { intro: 1 }, journal: { fish: 9, bugs: 2, finds: 3, coins: 1500, flowers: 4, rare: 2, sirop: 1 }, rares: { omble: 1, sirop: 1 } }]]) {
    const c2 = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const p2 = await c2.newPage();
    p2.on('pageerror', e => errs.push(`${tag} pageerror: ${e.message}`)); p2.on('console', m => { if (m.type() === 'error') errs.push(`${tag} console: ${m.text()}`); });
    await c2.addInitScript(v => { if (!sessionStorage.getItem('done')) { localStorage.setItem('vdm.save.v1', JSON.stringify(v)); sessionStorage.setItem('done', '1'); } }, V);
    await p2.goto(URL); await p2.waitForSelector('#play'); await p2.click('#play'); await p2.evaluate(() => __mv.waitT(0.5));
    const st = await p2.evaluate(() => __mv.state);
    const kept = st.money === V.money && JSON.stringify(st.tools) === JSON.stringify({ ...st.tools, ...V.tools }) && st.bag.join() === V.bag.join() && st.decor.join() === V.decor.join() && st.journal.fish === V.journal.fish && Object.entries(V.mastery).every(([k, m]) => st.mastery[k].ok === m.ok) && (!V.rares || JSON.stringify(st.rares) === JSON.stringify(V.rares));
    ok(`d sauvegarde ${tag} chargée sans perte (v5, île 1, phare à 0)`, st.v === 5 && kept && st.island === 1 && st.phare.step === 0 && !st.phare.done && st.appats === 0, JSON.stringify({ v: st.v, money: st.money, island: st.island }));
    await p2.evaluate(() => __mv.G.save()); ok(`d sauvegarde ${tag} réécrite en v5 sous la même clé`, await p2.evaluate(() => JSON.parse(localStorage.getItem('vdm.save.v1')).v === 5));
    await c2.close();
  }
  // Une partie sauvegardée sur l’île 2 y recommence
  await ev(() => { __mv.state.island = 2; __mv.G.save(); }); await p.goto(`${URL}?seed=4242`); await p.waitForSelector('#play'); await press('#play'); await waitT(1);
  ok(`${px} recharger une partie sur l’île 2 → on y revient`, await ev(() => __mv.island() === 2 && __mv.isle2().root.visible && __mv.state.phare.done && __mv.isle2().light !== null));

  ok(`${px} 0 erreur JS`, errs.length === 0, errs.slice(0, 5).join(' | '));
  await browser.close();
}
(async () => {
  for (const k of (process.env.ONLY ? [process.env.ONLY] : ['desktop', 'mobile'])) { try { await run(k); } catch (e) { fail++; console.log(`FAIL ${k} : exception ${e.message.split('\n')[0]}`); if (CUR) { console.log(e.stack.split('\n').find(l => l.includes('test-s2.cjs:')));
      console.log(await CUR.evaluate(() => JSON.stringify({ near: __mv.nearest(), html: document.querySelector('#panel')?.innerHTML.slice(0, 400), pos: __mv.player.pos, prompt: document.querySelector('#prompt')?.textContent })).catch(x => x.message)); await CUR.screenshot({ path: `/tmp/fail-s2-${k}.png` }).catch(() => {}); await CUR.context().browser().close(); } } }
  for (const m of ['d', 'm']) if (FPS[m + '1']) { const a = FPS[m + '1'], b = FPS[m + '2']; ok(`${m} FPS île 2 proche de l’île 1 (${a.toFixed(1)} → ${b.toFixed(1)})`, b >= a * 0.75); }
  console.log(`\n${pass} PASS, ${fail} FAIL`); process.exit(fail ? 1 : 0);
})();
