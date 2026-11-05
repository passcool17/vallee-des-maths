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
    ok('f ACTION.sap : icône, titre et ligne demandés', act && act.sap.icon === '🪣' && act.sap.titre === 'La sève coule!' && act.sap.line === 'Lionel te passe une chaudière pleine! Une petite question de proportions, d’unités ou d’aires. Tu peux aussi laisser filer.' && act.sap.win === 'function' && act.sap.lose, JSON.stringify(act && act.sap));
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

    const vil = await p.evaluate(async () => {
      const v = await import('./js/villagers.js');
      const s = await import('./js/sons.js');
      const all = __mv.G.allVillagers || [];
      return {
        nomsMv: __mv.NOMS && { lionel: __mv.NOMS.lionel, lise: __mv.NOMS.lise },
        noms: { lionel: v.NOMS.lionel, lise: v.NOMS.lise },
        emoji: { lionel: v.EMOJI.lionel, lise: v.EMOJI.lise },
        isle: { lionel: v.ISLE_OF.lionel, lise: v.ISLE_OF.lise },
        lines: { lionel: v.LINES.lionel && v.LINES.lionel.length, lise: v.LINES.lise && v.LINES.lise.length },
        voix: s.VOIX && { lionel: s.VOIX.lionel, lise: s.VOIX.lise, therese: s.VOIX.therese, gaston: s.VOIX.gaston, flocon: s.VOIX.flocon },
        spawned: all.map(x => x.id),
      };
    });
    ok('i NOMS exposés sur __mv : Lionel l’orignal, Lise la renarde', !!(vil.nomsMv && vil.nomsMv.lionel === 'Lionel l’orignal' && vil.nomsMv.lise === 'Lise la renarde'), JSON.stringify(vil.nomsMv));
    ok('i NOMS / EMOJI / ISLE_OF', !!(vil.noms.lionel === 'Lionel l’orignal' && vil.noms.lise === 'Lise la renarde' && vil.emoji.lionel === '🫎' && vil.emoji.lise === '🦊' && vil.isle.lionel === 1 && vil.isle.lise === 1), JSON.stringify({ noms: vil.noms, emoji: vil.emoji, isle: vil.isle }));
    ok('i LINES lionel et lise : 4 à 6 répliques', !!(vil.lines.lionel >= 4 && vil.lines.lionel <= 6 && vil.lines.lise >= 4 && vil.lines.lise <= 6), JSON.stringify(vil.lines));
    ok('i VOIX : Lionel grave et lent, Lise medium-high', !!(vil.voix && vil.voix.lionel && vil.voix.lise && vil.voix.lionel.f < vil.voix.therese.f && vil.voix.lionel.gap > vil.voix.therese.gap && vil.voix.lise.f > vil.voix.gaston.f && vil.voix.lise.f < vil.voix.flocon.f), JSON.stringify(vil.voix));
    ok('i makeVillagers produit lionel et lise', !!(vil.spawned.includes('lionel') && vil.spawned.includes('lise')), JSON.stringify(vil.spawned));

    const gated = await p.evaluate(() => {
      const kinds = __mv.world.interactables.map(i => i.kind);
      const folk = (__mv.G.allVillagers || []).filter(v => v.id === 'lionel' || v.id === 'lise').map(v => ({ id: v.id, vis: v.obj.visible }));
      return {
        kinds,
        hasSap: kinds.includes('sap'),
        hasBerry: kinds.includes('berry'),
        folk,
        bridges: { ...__mv.state.bridges },
      };
    });
    ok('j ponts fermés au départ (fresh)', !gated.bridges.erables && !gated.bridges.bleuets, JSON.stringify(gated.bridges));
    ok('j Lionel / Lise invisibles tant que les ponts sont fermés', gated.folk.length === 2 && gated.folk.every(v => v.vis === false), JSON.stringify(gated.folk));

    await p.evaluate(() => {
      const st = window.__mv.state;
      st.bridges.erables = true; st.bridges.bleuets = true;
      window.__mv.world.openBridge('erables');
      window.__mv.world.openBridge('bleuets');
    });
    await p.evaluate(() => __mv.waitT(0.2));
    const kinds = await p.evaluate(() => window.__mv.world.interactables.map(i => i.kind));
    ok('j interactables sap et berry après ouverture des ponts', kinds.includes('sap') && kinds.includes('berry'), JSON.stringify(kinds.filter(k => k === 'sap' || k === 'berry' || k === 'tree')));

    const zone = await p.evaluate(() => {
      const its = __mv.world.interactables;
      const sap = its.filter(i => i.kind === 'sap');
      const berry = its.filter(i => i.kind === 'berry');
      const folk = (__mv.G.allVillagers || []).filter(v => v.id === 'lionel' || v.id === 'lise').map(v => ({ id: v.id, vis: v.obj.visible, x: v.pos.x, z: v.pos.z }));
      const smoke = (__mv.world.smoke || []).length;
      const smokeVis = (__mv.world.smoke || []).filter(s => s.visible).length;
      return {
        sapN: sap.length, berryN: berry.length,
        sap: sap.map(i => ({ zone: i.zone, label: i.label, ready: i.ready, cooldown: i.cooldown, x: i.pos.x, z: i.pos.z, vis: i.obj && i.obj.visible })),
        berry: berry.map(i => ({ zone: i.zone, label: i.label, ready: i.ready, cooldown: i.cooldown, x: i.pos.x, z: i.pos.z, vis: i.obj && i.obj.visible })),
        folk, smoke, smokeVis,
      };
    });
    ok('j 4 à 6 chaudières sap', zone.sapN >= 4 && zone.sapN <= 6, JSON.stringify({ n: zone.sapN }));
    ok('j sap : zone erables, libellé, ready 0, cooldown 45 s', zone.sap.length && zone.sap.every(i => i.zone === 'erables' && i.label === 'Récolter la sève' && i.ready === 0 && i.cooldown === 45 && i.vis !== false), JSON.stringify(zone.sap));
    ok('j sap près de la cabane (−4, −47)', zone.sap.length && zone.sap.every(i => Math.hypot(i.x - (-4), i.z - (-47)) < 8), JSON.stringify(zone.sap.map(i => [i.x, i.z])));
    ok('j 4 à 6 plants berry', zone.berryN >= 4 && zone.berryN <= 6, JSON.stringify({ n: zone.berryN }));
    ok('j berry : zone bleuets, libellé, ready 0, cooldown 40 s', zone.berry.length && zone.berry.every(i => i.zone === 'bleuets' && i.label === 'Cueillir les bleuets' && i.ready === 0 && i.cooldown === 40 && i.vis !== false), JSON.stringify(zone.berry));
    ok('j berry près de la pointe (46, 4)', zone.berry.length && zone.berry.every(i => Math.hypot(i.x - 46, i.z - 4) < 10), JSON.stringify(zone.berry.map(i => [i.x, i.z])));
    ok('j Lionel et Lise visibles une fois les ponts ouverts', zone.folk.length === 2 && zone.folk.every(v => v.vis === true), JSON.stringify(zone.folk));
    ok('j fumée de l’évaporateur présente (densité fxQ)', zone.smoke >= 1 && zone.smokeVis <= zone.smoke, JSON.stringify({ smoke: zone.smoke, smokeVis: zone.smokeVis }));

    const chances = await p.evaluate(async () => {
      const aq = await import('./js/actionq.js');
      return { maple: aq.MAPLE_CHANCE, berry: aq.BERRY_CHANCE };
    });
    ok('k MAPLE_CHANCE et BERRY_CHANCE ≈ 1/3', chances.maple === 0.33 && chances.berry === 0.33, JSON.stringify(chances));

    const sapQ = await p.evaluate(() => {
      const it = __mv.world.interactables.find(i => i.kind === 'sap');
      const money = __mv.state.money;
      __mv.tp(it.pos.x, it.pos.z + 0.4);
      __mv.force.sap = true;
      __mv.force.q = { skill: 'qc_s1_pro_01', d: 0 };
      __mv.G.interact(it);
      return { money, ready: it.ready, t: __mv.G.time, cd: it.cooldown };
    });
    await p.waitForFunction(m => __mv.state.money > m, sapQ.money, { timeout: 2500 }).catch(() => {});
    await p.evaluate(() => __mv.waitT(1.0));
    await p.waitForSelector('#panel .action.sap', { timeout: 5000 });
    const sapPanel = await p.evaluate(() => ({
      titre: document.querySelector('#panel .who b')?.textContent,
      cls: document.querySelector('#panel .action.sap') && true,
      money: __mv.state.money,
      skill: __mv.flows.cur && __mv.flows.cur.q && __mv.flows.cur.q.skill,
    }));
    ok('k force.sap : sous de base donnés', sapPanel.money > sapQ.money, JSON.stringify({ before: sapQ.money, after: sapPanel.money }));
    ok('k force.sap : question « La sève coule! »', sapPanel.titre === 'La sève coule!' && sapPanel.cls && sapPanel.skill === 'qc_s1_pro_01', JSON.stringify(sapPanel));
    ok('k sap : recharge ~45 s', sapQ.ready >= sapQ.t + 44 && sapQ.cd === 45, JSON.stringify(sapQ));
    await p.click('#panel .btn.skip');
    await p.waitForSelector('#panel .actionlose');
    await p.click('#panel .action .btn.primary');
    await p.evaluate(() => __mv.waitT(0.2));

    const sapCd = await p.evaluate(() => {
      const it = __mv.world.interactables.find(i => i.kind === 'sap' && __mv.G.time < i.ready);
      const money = __mv.state.money;
      __mv.force.sap = true;
      __mv.G.interact(it);
      const toast = document.querySelector('#toasts .toast')?.textContent || '';
      return { toast, moneyNow: __mv.state.money, money, panel: !!document.querySelector('#panel .action.sap') };
    });
    ok('k sap en recharge : toast chaudière, pas de question', /chaudière se remplit/.test(sapCd.toast) && sapCd.moneyNow === sapCd.money && !sapCd.panel, JSON.stringify(sapCd));

    const sapNoQ = await p.evaluate(() => {
      const it = __mv.world.interactables.find(i => i.kind === 'sap' && __mv.G.time >= i.ready);
      const money = __mv.state.money;
      __mv.tp(it.pos.x, it.pos.z + 0.4);
      __mv.force.sap = false;
      delete __mv.force.q;
      __mv.G.interact(it);
      return { money };
    });
    await p.waitForFunction(m => __mv.state.money > m, sapNoQ.money, { timeout: 2500 }).catch(() => {});
    await p.evaluate(() => __mv.waitT(1.0));
    const sapNoQAfter = await p.evaluate(() => ({ money: __mv.state.money, panel: !!document.querySelector('#panel .action') }));
    ok('k force.sap = false : sous sans question', sapNoQAfter.money > sapNoQ.money && !sapNoQAfter.panel, JSON.stringify({ before: sapNoQ.money, after: sapNoQAfter }));

    const isleGuard = await p.evaluate(() => {
      const it = __mv.world.interactables.find(i => i.kind === 'sap' && __mv.G.time >= i.ready);
      const money = __mv.state.money;
      const ready = it.ready;
      __mv.state.island = 2;
      __mv.force.sap = true;
      __mv.G.interact(it);
      __mv.state.island = 1;
      return { moneySame: __mv.state.money === money, readySame: it.ready === ready, panel: !!document.querySelector('#panel .action') };
    });
    ok('k sap ignoré sur l’île 2', isleGuard.moneySame && isleGuard.readySame && !isleGuard.panel, JSON.stringify(isleGuard));

    const berryQ = await p.evaluate(() => {
      const it = __mv.world.interactables.find(i => i.kind === 'berry');
      const money = __mv.state.money;
      __mv.tp(it.pos.x, it.pos.z + 0.4);
      __mv.force.berry = true;
      __mv.force.q = { skill: 'qc_s1_prb_01', d: 1 };
      __mv.G.interact(it);
      return { money, ready: it.ready, t: __mv.G.time, cd: it.cooldown };
    });
    await p.waitForFunction(m => __mv.state.money > m, berryQ.money, { timeout: 2500 }).catch(() => {});
    await p.evaluate(() => __mv.waitT(1.0));
    await p.waitForSelector('#panel .action.berry', { timeout: 5000 });
    const berryPanel = await p.evaluate(() => ({
      titre: document.querySelector('#panel .who b')?.textContent,
      money: __mv.state.money,
      skill: __mv.flows.cur && __mv.flows.cur.q && __mv.flows.cur.q.skill,
    }));
    ok('k force.berry : sous de base donnés', berryPanel.money > berryQ.money, JSON.stringify({ before: berryQ.money, after: berryPanel.money }));
    ok('k force.berry : question « Cueillette! »', berryPanel.titre === 'Cueillette!' && berryPanel.skill === 'qc_s1_prb_01', JSON.stringify(berryPanel));
    ok('k berry : recharge ~40 s', berryQ.ready >= berryQ.t + 39 && berryQ.cd === 40, JSON.stringify(berryQ));
    await p.click('#panel .btn.skip');
    await p.waitForSelector('#panel .actionlose');
    await p.click('#panel .action .btn.primary');
    await p.evaluate(() => __mv.waitT(0.2));

    const berryCd = await p.evaluate(() => {
      const it = __mv.world.interactables.find(i => i.kind === 'berry' && __mv.G.time < i.ready);
      __mv.force.berry = true;
      __mv.G.interact(it);
      const toast = document.querySelector('#toasts .toast')?.textContent || '';
      return { toast, panel: !!document.querySelector('#panel .action.berry') };
    });
    ok('k berry en recharge : toast plants, pas de question', /bleuets poussent encore|plants se remplissent/.test(berryCd.toast) && !berryCd.panel, JSON.stringify(berryCd));

    const sell = await p.evaluate(() => {
      const prev = __mv.state.bag.slice();
      __mv.state.bag = ['barquette', 'confiture', 'confiture_mamie'];
      __mv.flows.sell();
      const btn = document.querySelector('#panel .btn.primary')?.textContent || '';
      const rows = [...document.querySelectorAll('#panel .item')].map(el => el.textContent);
      return { btn, rows, prev };
    });
    ok('k Thérèse rachète barquette, confiture et confiture de grand-mère (4 $ + 8 $ + 14 $)',
      sell.btn.includes('26,00') && sell.rows.some(r => /Barquette de bleuets/.test(r) && /4,00/.test(r))
      && sell.rows.some(r => /Confiture de bleuets/.test(r) && /8,00/.test(r))
      && sell.rows.some(r => /Confiture de grand-mère/.test(r) && /14,00/.test(r)), JSON.stringify(sell));
    await p.keyboard.press('Escape');
    await p.evaluate(prev => { __mv.state.bag = prev; }, sell.prev);

    await c.close();
  } catch (e) { ok('exception', false, e.stack); }
  ok('z 0 erreur console', errs.length === 0, errs.slice(0, 5).join(' | '));
  console.log(`\n${pass} PASS, ${fail} FAIL`); await b.close(); process.exit(fail ? 1 : 0);
})();
