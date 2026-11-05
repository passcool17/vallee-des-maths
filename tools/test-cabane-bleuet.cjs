// Test : items, pools de skills et textes ACTION (cabane à sucre + bleuetière)
// Usage : node tools/serve.js 8653 & node tools/test-cabane-bleuet.cjs [port]
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
const PORT = process.argv[2] || 8653, BASE = `http://localhost:${PORT}/?fresh=1&seed=4242&adapt=0&time=midi`;
let pass = 0, fail = 0, errs = [];
const ok = (name, c, extra = '') => { if (c) pass++; else fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${name}${c || !extra ? '' : ' — ' + extra}`); };
(async () => {
  const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  async function open(q = '') {
    const c = await b.newContext({ viewport: { width: 1024, height: 640 } }); const p = await c.newPage();
    p.on('pageerror', e => errs.push(q + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(q + ': ' + m.text()); });
    await p.goto(BASE + q); await p.waitForFunction(() => window.__mv, null, { timeout: 30000 }); await p.click('#play'); await p.evaluate(() => __mv.waitT(0.6));
    return { c, p };
  }
  const typeAnswer = async p => {
    await p.waitForFunction(() => __mv.flows.cur && !document.querySelector('#panel .feedback.ok'), null, { timeout: 5000 });
    const info = await p.evaluate(() => { const c = __mv.flows.cur; return { kind: c.ex ? c.ex.answer.kind : 'num', ans: c.answer() }; });
    if (info.kind === 'choice') {
      const btns = p.locator('#panel .btn.choice'); const n = await btns.count();
      for (let i = 0; i < n; i++) if ((await btns.nth(i).textContent()) === info.ans) { await btns.nth(i).click(); break; }
      await p.click('#panel .validate'); return info.ans;
    }
    const parts = info.ans.split(' ; ');
    for (let f = 0; f < parts.length; f++) {
      await p.click(`#panel .field[data-f="${f}"]`);
      for (const ch of parts[f]) await p.click(`#panel .numpad [data-k="${ch === '-' || ch === '−' ? '−' : ch === '.' ? ',' : ch}"]`);
    }
    await p.click('#panel .numpad [data-k="✓"]'); return info.ans;
  };
  try {
    const { c, p } = await open();
    ok('a flows.actionQ disponible', await p.evaluate(() => !!(window.__mv?.flows && typeof __mv.flows.actionQ === 'function')));

    const mods = await p.evaluate(async () => {
      const shop = await import('./js/shop.js');
      const aq = await import('./js/actionq.js');
      const fl = await import('./js/flows.js');
      const sv = await import('./js/save.js');
      const sk = await import('./js/math/skills.js');
      const { makeRng } = await import('./js/math/rng.js');
      const st = sv.newState(1);
      for (const s of sk.SKILLS) st.mastery[s.id] = { ok: 3, tries: 3, miss: 0 };
      const r = makeRng(7);
      const sapSeen = new Set(), berrySeen = new Set(); let sapBad = 0, berryBad = 0;
      for (let i = 0; i < 80; i++) {
        const q1 = aq.pickQuestion(st, 'sap', r); sapSeen.add(q1.skill); if (!aq.SAP_SKILLS.includes(q1.skill)) sapBad++;
        const q2 = aq.pickQuestion(st, 'berry', r); berrySeen.add(q2.skill); if (!aq.BERRY_SKILLS.includes(q2.skill)) berryBad++;
      }
      const old = sv.normalize({ v: 1, seed: 4, money: 10, journal: { fish: 2 } }, 4);
      return {
        prices: { barquette: shop.SELL.barquette, confiture: shop.SELL.confiture, confiture_mamie: shop.SELL.confiture_mamie, tire: shop.SELL.tire, sirop: shop.SELL.sirop, coulee: shop.SELL.coulee },
        sap: aq.SAP_SKILLS, berry: aq.BERRY_SKILLS,
        loot: { sap0: aq.loot('sap', 0), sap1: aq.loot('sap', 1), sap2: aq.loot('sap', 2), berry0: aq.loot('berry', 0), berry1: aq.loot('berry', 1), berry2: aq.loot('berry', 2), maple1: aq.loot('maple', 1), fish0: aq.loot('fish', 0) },
        items: { barquette: fl.ITEMS.barquette, confiture: fl.ITEMS.confiture, confiture_mamie: fl.ITEMS.confiture_mamie },
        bleuetsNew: sv.newState(9).journal.bleuets,
        bleuetsOld: old.journal.bleuets,
        names: Object.fromEntries(sk.SKILLS.map(s => [s.id, s.nom])),
        sapOk: Array.isArray(aq.SAP_SKILLS) && aq.SAP_SKILLS.every(id => sk.SKILLS.some(s => s.id === id)),
        berryOk: Array.isArray(aq.BERRY_SKILLS) && aq.BERRY_SKILLS.every(id => sk.SKILLS.some(s => s.id === id)),
        sapBad, berryBad, sapSeen: [...sapSeen], berrySeen: [...berrySeen],
      };
    });

    ok('b prix de vente : barquette 400, confiture 800, confiture_mamie 1400', mods.prices.barquette === 400 && mods.prices.confiture === 800 && mods.prices.confiture_mamie === 1400, JSON.stringify(mods.prices));
    ok('b sirop inchangé (tire 300, sirop 600, coulee 1200)', mods.prices.tire === 300 && mods.prices.sirop === 600 && mods.prices.coulee === 1200, JSON.stringify(mods.prices));
    ok('c SAP_SKILLS : ids réels, proportions + mesure (unités/aires, pas de compétence « volumes » dédiée)', mods.sapOk && mods.sap.includes('qc_s1_pro_01') && mods.sap.includes('qc_s1_pro_02') && (mods.sap.includes('qc_s1_geo_02') || mods.sap.includes('qc_s1_geo_03')), JSON.stringify({ sap: mods.sap, names: mods.sap && mods.sap.map(id => mods.names[id]) }));
    ok('c BERRY_SKILLS : dénombrement + moyenne', mods.berryOk && mods.berry.includes('qc_s1_prb_01') && mods.berry.includes('qc_s1_sta_01'), JSON.stringify(mods.berry));
    ok('c pickQuestion(sap) reste dans SAP_SKILLS', mods.sapBad === 0, JSON.stringify({ sapBad: mods.sapBad, sapSeen: mods.sapSeen }));
    ok('c pickQuestion(berry) reste dans BERRY_SKILLS', mods.berryBad === 0, JSON.stringify({ berryBad: mods.berryBad, berrySeen: mods.berrySeen }));
    ok('d loot sap → tire / sirop / coulee', mods.loot.sap0 === 'tire' && mods.loot.sap1 === 'sirop' && mods.loot.sap2 === 'coulee' && mods.loot.maple1 === 'sirop' && mods.loot.fish0 === 'omble', JSON.stringify(mods.loot));
    ok('d loot berry → barquette / confiture / confiture_mamie', mods.loot.berry0 === 'barquette' && mods.loot.berry1 === 'confiture' && mods.loot.berry2 === 'confiture_mamie', JSON.stringify(mods.loot));
    ok('e labels : Barquette de bleuets, Confiture de bleuets, Confiture de grand-mère',
      mods.items.barquette && mods.items.barquette[0] === '🫐' && mods.items.barquette[1] === 'Barquette de bleuets'
      && mods.items.confiture[0] === '🫙' && mods.items.confiture[1] === 'Confiture de bleuets'
      && mods.items.confiture_mamie[0] === '💜' && mods.items.confiture_mamie[1] === 'Confiture de grand-mère', JSON.stringify(mods.items));
    ok('e journal.bleuets = 0 par défaut (nouvelle partie et vieille sauvegarde)', mods.bleuetsNew === 0 && mods.bleuetsOld === 0, JSON.stringify({ n: mods.bleuetsNew, o: mods.bleuetsOld }));

    const act = await p.evaluate(() => {
      const A = __mv.flows.ACTION;
      return A && {
        sap: { icon: A.sap && A.sap.icon, titre: A.sap && A.sap.titre, line: A.sap && A.sap.line, win: typeof (A.sap && A.sap.win), lose: !!(A.sap && A.sap.lose && A.sap.lose.miss && A.sap.lose.timeout && A.sap.lose.skip) },
        berry: { icon: A.berry && A.berry.icon, titre: A.berry && A.berry.titre, line: A.berry && A.berry.line, win: typeof (A.berry && A.berry.win), lose: !!(A.berry && A.berry.lose && A.berry.lose.miss && A.berry.lose.timeout && A.berry.lose.skip) },
      };
    });
    ok('f ACTION.sap : icône, titre et ligne demandés', act && act.sap.icon === '🪣' && act.sap.titre === 'La sève coule!' && act.sap.line === 'Lionel te passe une chaudière pleine! Une petite question de proportions ou de volumes. Tu peux aussi laisser filer.' && act.sap.win === 'function' && act.sap.lose, JSON.stringify(act && act.sap));
    ok('f ACTION.berry : icône, titre et ligne demandés', act && act.berry.icon === '🫐' && act.berry.titre === 'Cueillette!' && act.berry.line === 'Lise te tend un panier! Une petite question de dénombrement ou de moyenne. Tu peux aussi laisser filer.' && act.berry.win === 'function' && act.berry.lose, JSON.stringify(act && act.berry));

    await p.evaluate(() => __mv.flows.actionQ({ kind: 'sap', skill: 'qc_s1_pro_01', d: 0, stretch: true }));
    await p.waitForSelector('#panel .action.sap');
    const sapUi = await p.evaluate(() => ({ titre: document.querySelector('#panel .who b')?.textContent, line: document.querySelector('#panel .who .line')?.textContent }));
    ok('f panneau sap : titre et ligne visibles', sapUi.titre === 'La sève coule!' && /Lionel te passe une chaudière pleine/.test(sapUi.line || ''), JSON.stringify(sapUi));
    await typeAnswer(p);
    await p.waitForSelector('#panel .actionwin');
    const sapWin = await p.evaluate(() => ({ bag: __mv.state.bag.slice(), rares: { ...__mv.state.rares }, j: { sirop: __mv.state.journal.sirop, bleuets: __mv.state.journal.bleuets || 0 } }));
    ok('g victoire sap : tire + journal.sirop (réutilisé)', sapWin.bag.includes('tire') && sapWin.rares.tire === 1 && sapWin.j.sirop === 1 && sapWin.j.bleuets === 0, JSON.stringify(sapWin));
    await p.click('#panel .action .btn.primary');
    await p.evaluate(() => __mv.waitT(0.2));

    await p.evaluate(() => __mv.flows.actionQ({ kind: 'berry', skill: 'qc_s1_prb_01', d: 1, stretch: true }));
    await p.waitForSelector('#panel .action.berry');
    const berryUi = await p.evaluate(() => ({ titre: document.querySelector('#panel .who b')?.textContent, line: document.querySelector('#panel .who .line')?.textContent }));
    ok('f panneau berry : titre et ligne visibles', berryUi.titre === 'Cueillette!' && /Lise te tend un panier/.test(berryUi.line || ''), JSON.stringify(berryUi));
    await typeAnswer(p);
    await p.waitForSelector('#panel .actionwin');
    const berryWin = await p.evaluate(() => ({ bag: __mv.state.bag.slice(), rares: { ...__mv.state.rares }, j: { sirop: __mv.state.journal.sirop, bleuets: __mv.state.journal.bleuets || 0 } }));
    ok('g victoire berry : confiture + journal.bleuets', berryWin.bag.includes('confiture') && berryWin.rares.confiture === 1 && berryWin.j.bleuets === 1 && berryWin.j.sirop === 1, JSON.stringify(berryWin));
    await p.click('#panel .action .btn.primary');
    await p.evaluate(() => __mv.waitT(0.2));

    await p.evaluate(() => __mv.flows.carnet());
    await p.waitForSelector('#panel .carnet .rares');
    const carnet = await p.evaluate(() => ({
      journal: document.querySelector('#panel .carnet > p.journal')?.textContent || document.querySelector('#panel p.journal')?.textContent,
      chips: [...document.querySelectorAll('#panel .chip.rare')].map(el => el.getAttribute('data-k')),
    }));
    ok('h carnet : sirop + bleuets au journal, puces tire et confiture', /🍯/.test(carnet.journal || '') && /🫐/.test(carnet.journal || '') && carnet.chips.includes('tire') && carnet.chips.includes('confiture'), JSON.stringify(carnet));
    await p.keyboard.press('Escape');

    await c.close();
  } catch (e) { ok('exception', false, e.stack); }
  ok('z 0 erreur console', errs.length === 0, errs.slice(0, 5).join(' | '));
  console.log(`\n${pass} PASS, ${fail} FAIL`); await b.close(); process.exit(fail ? 1 : 0);
})();
