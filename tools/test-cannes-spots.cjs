// Test : 3 cannes + 3 spots (save.rods, shop Gaston, spots Lise/Lionel)
// Usage : node tools/serve.js 8653 & node tools/test-cannes-spots.cjs [port]
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

    const sv = await p.evaluate(async () => {
      const s = await import('./js/save.js');
      const neu = s.newState(7);
      const old = s.normalize({ v: 5, seed: 3, money: 100 }, 3);
      const kept = s.normalize({ v: 5, seed: 3, rods: { petite: true, moyenne: true, grosse: false } }, 3);
      const partial = s.normalize({ v: 5, seed: 3, rods: { moyenne: true } }, 3);
      return {
        neu: neu.rods,
        old: old.rods,
        kept: kept.rods,
        partial: partial.rods,
        v: neu.v,
      };
    });
    ok('a newState.rods : petite true, moyenne/grosse false',
      sv.neu && sv.neu.petite === true && sv.neu.moyenne === false && sv.neu.grosse === false, JSON.stringify(sv.neu));
    ok('a normalize sans rods → petite true',
      sv.old && sv.old.petite === true && sv.old.moyenne === false && sv.old.grosse === false, JSON.stringify(sv.old));
    ok('a normalize conserve moyenne owned',
      sv.kept && sv.kept.moyenne === true && sv.kept.grosse === false, JSON.stringify(sv.kept));
    ok('a normalize partial : petite true même si omise, moyenne true',
      sv.partial && sv.partial.petite === true && sv.partial.moyenne === true && sv.partial.grosse === false, JSON.stringify(sv.partial));

const pools = await p.evaluate(async () => {
  const shop = await import('./js/shop.js');
  const aq = await import('./js/actionq.js');
  const fl = await import('./js/flows.js');
  return {
    sell: {
      meunier: shop.SELL.meunier, crapet: shop.SELL.crapet, brochet: shop.SELL.brochet,
      ouananiche: shop.SELL.ouananiche, touladi: shop.SELL.touladi, anguille: shop.SELL.anguille,
      laquaiche: shop.SELL.laquaiche, coregone: shop.SELL.coregone, barbotte: shop.SELL.barbotte,
      marigane: shop.SELL.marigane, omble_ch: shop.SELL.omble_ch, esturgeon_n: shop.SELL.esturgeon_n,
      perchaude: shop.SELL.perchaude, gros_dore: shop.SELL.gros_dore,
    },
    loot: {
      p0: aq.loot('fish', 0, 1, 'petite'),
      m1: aq.loot('fish', 1, 1, 'moyenne'),
      g2: aq.loot('fish', 2, 1, 'grosse'),
      i2: aq.loot('fish', 0, 2, 'grosse'),
      berry: aq.loot('berry', 1),
    },
    common: aq.COMMON_FISH,
    items: {
      meunier: fl.ITEMS.meunier, ouananiche: fl.ITEMS.ouananiche,
      laquaiche: fl.ITEMS.laquaiche, marigane: fl.ITEMS.marigane,
    },
  };
});
ok('b SELL moyens/gros',
  pools.sell.meunier === 350 && pools.sell.crapet === 450 && pools.sell.brochet === 550
  && pools.sell.ouananiche === 850 && pools.sell.touladi === 1050 && pools.sell.anguille === 1250
  && pools.sell.laquaiche === 600 && pools.sell.coregone === 750 && pools.sell.barbotte === 900
  && pools.sell.marigane === 1300 && pools.sell.omble_ch === 1600 && pools.sell.esturgeon_n === 1900
  && pools.sell.perchaude === 150 && pools.sell.gros_dore === 900, JSON.stringify(pools.sell));
ok('b loot fish par rod + île 2 inchangé',
  pools.loot.p0 === 'omble' && pools.loot.m1 === 'touladi' && pools.loot.g2 === 'esturgeon_n'
  && pools.loot.i2 === 'gros_dore' && pools.loot.berry === 'confiture', JSON.stringify(pools.loot));
ok('b COMMON_FISH a petite/moyenne/grosse',
  !!(pools.common && pools.common.petite && pools.common.moyenne && pools.common.grosse
    && pools.common.moyenne.some(([k]) => k === 'meunier')
    && pools.common.grosse.some(([k]) => k === 'barbotte')), JSON.stringify(pools.common));
ok('b ITEMS labels québécois',
  pools.items.meunier && pools.items.meunier[1] === 'Meunier noir'
  && pools.items.ouananiche[1] === 'Ouananiche'
  && pools.items.laquaiche[1] === 'Laquaiche aux yeux d’or'
  && pools.items.marigane[1] === 'Marigane noire', JSON.stringify(pools.items));


    const rodsUi = await p.evaluate(async () => {
      const fl = await import('./js/flows.js');
      __mv.state.money = 20000;
      __mv.state.rods = { petite: true, moyenne: false, grosse: false };
      __mv.flows.workbench(1);
      const rows = [...document.querySelectorAll('#panel .rods .rod')].map(el => ({
        id: el.dataset.rod,
        owned: el.classList.contains('owned'),
        btn: el.querySelector('button')?.textContent || null,
      }));
      return { RODS: fl.RODS, rows, money: __mv.state.money };
    });
    ok('c RODS : petite 0, moyenne 7500, grosse 15000',
      rodsUi.RODS && rodsUi.RODS[0].id === 'petite' && rodsUi.RODS[0].prixCents === 0
      && rodsUi.RODS[1].prixCents === 7500 && rodsUi.RODS[2].prixCents === 15000, JSON.stringify(rodsUi.RODS));
    ok('c UI Cannes : petite owned, moyenne achetable',
      rodsUi.rows.length === 3 && rodsUi.rows[0].owned && !rodsUi.rows[1].owned
      && /75/.test(rodsUi.rows[1].btn || ''), JSON.stringify(rodsUi.rows));

    const bought = await p.evaluate(() => {
      const btn = document.querySelector('#panel .rods .rod[data-rod="moyenne"] button');
      if (btn) btn.click();
      return { rods: { ...__mv.state.rods }, money: __mv.state.money };
    });
    ok('c buyRod moyenne : −75 $ et owned',
      bought.rods.moyenne === true && bought.money === 12500, JSON.stringify(bought));

    const spotsClosed = await p.evaluate(() => {
      const its = __mv.world.interactables.filter(i => i.kind === 'fish');
      return {
        ids: its.map(i => i.id),
        rods: Object.fromEntries(its.map(i => [i.id, i.rod])),
        zones: Object.fromEntries(its.map(i => [i.id, i.zone || null])),
        bridges: { ...__mv.state.bridges },
        // visible via parent décor (bleuetDecor / cabaneDecor) — obj.visible seul ne reflète pas le gate
        liseVis: (() => { const o = its.find(i => i.id === 'quai_lise')?.obj; return !!(o && o.visible && o.parent && o.parent.visible); })(),
        lionelVis: (() => { const o = its.find(i => i.id === 'quai_lionel')?.obj; return !!(o && o.visible && o.parent && o.parent.visible); })(),
        quaiSpot: its.find(i => i.id === 'quai')?.spot || null,
      };
    });
    ok('d quai + quai_lise + quai_lionel existent avec rods',
      spotsClosed.ids.includes('quai') && spotsClosed.ids.includes('quai_lise') && spotsClosed.ids.includes('quai_lionel')
      && spotsClosed.rods.quai === 'petite' && spotsClosed.rods.quai_lise === 'moyenne' && spotsClosed.rods.quai_lionel === 'grosse',
      JSON.stringify(spotsClosed));
    ok('d ponts fermés : quais Lise/Lionel non visibles (parent décor)',
      spotsClosed.liseVis === false && spotsClosed.lionelVis === false, JSON.stringify(spotsClosed));

    await p.evaluate(() => {
      __mv.world.openBridge('bleuets');
      __mv.world.openBridge('erables');
    });
    await p.evaluate(() => __mv.waitT(0.2));
    const spotsOpen = await p.evaluate(() => {
      const its = __mv.world.interactables.filter(i => i.kind === 'fish');
      return {
        liseVis: (() => { const o = its.find(i => i.id === 'quai_lise')?.obj; return !!(o && o.visible && o.parent && o.parent.visible); })(),
        lionelVis: (() => { const o = its.find(i => i.id === 'quai_lionel')?.obj; return !!(o && o.visible && o.parent && o.parent.visible); })(),
      };
    });
    ok('d ponts ouverts : quais Lise/Lionel visibles',
      spotsOpen.liseVis && spotsOpen.lionelVis, JSON.stringify(spotsOpen));

    await p.evaluate(() => { if (__mv.G.ui.isOpen) __mv.G.ui.close(); });

    async function fishOnce(page, dockId, { rare = false, rodState } = {}) {
      return page.evaluate(async ({ dockId, rare, rodState }) => {
        if (rodState) __mv.state.rods = rodState;
        __mv.state.bag = [];
        __mv.force.rare = rare;
        const it = __mv.world.interactables.find(i => i.id === dockId);
        __mv.tp(it.pos.x, it.pos.z + 0.2);
        await __mv.waitT(0.15); // annule une pêche déjà ouverte si on a changé de spot
        __mv.G.interact(it);
        for (let n = 0; n < 80 && __mv.world.bobber.visible; n++) {
          await __mv.waitT(0.2);
          const prompt = document.querySelector('#prompt')?.textContent || '';
          if (/Ça mord/i.test(prompt)) __mv.G.interact(it); // reel when bite
        }
        return { bag: __mv.state.bag.slice(), bobber: __mv.world.bobber.visible };
      }, { dockId, rare, rodState });
    }

    const noRod = await p.evaluate(() => {
      const msgs = [];
      const ui = __mv.G.ui;
      const old = ui.toast.bind(ui);
      ui.toast = (m, k) => { msgs.push(String(m)); old(m, k); };
      __mv.state.rods = { petite: true, moyenne: false, grosse: false };
      __mv.world.openBridge('bleuets');
      const it = __mv.world.interactables.find(i => i.id === 'quai_lise');
      __mv.tp(it.pos.x, it.pos.z + 0.2);
      __mv.G.interact(it);
      ui.toast = old;
      return { msgs, bobber: __mv.world.bobber.visible };
    });
    ok('e sans canne moyenne : toast Gaston, pas de pêche',
      noRod.msgs.some(m => /canne moyenne/i.test(m)) && noRod.bobber === false, JSON.stringify(noRod));

    const gotM = await fishOnce(p, 'quai_lise', { rodState: { petite: true, moyenne: true, grosse: false } });
    ok('e Lise + moyenne → meunier|crapet|brochet',
      gotM.bag.some(k => ['meunier', 'crapet', 'brochet'].includes(k)), JSON.stringify(gotM));

    const gotP = await fishOnce(p, 'quai', { rodState: { petite: true, moyenne: false, grosse: false } });
    ok('e quai + petite → perchaude|achigan|dore|truite',
      gotP.bag.some(k => ['perchaude', 'achigan', 'dore', 'truite'].includes(k)), JSON.stringify(gotP));

    await p.evaluate(() => __mv.world.openBridge('erables'));
    const gotG = await fishOnce(p, 'quai_lionel', { rodState: { petite: true, moyenne: true, grosse: true } });
    ok('e Lionel + grosse → laquaiche|coregone|barbotte',
      gotG.bag.some(k => ['laquaiche', 'coregone', 'barbotte'].includes(k)), JSON.stringify(gotG));

    // Task 6: rares moyenne/grosse + régression île 2
    await p.evaluate(() => __mv.waitT(0.2));
    await p.evaluate(() => {
      __mv.state.rods = { petite: true, moyenne: true, grosse: true };
      __mv.state.bag = []; __mv.state.rares = {};
      __mv.flows.actionQ({ kind: 'fish', rod: 'moyenne', skill: 'qc_s1_ari_01', d: 1, stretch: true });
    });
    await typeAnswer(p);
    await p.waitForSelector('#panel .actionwin');
    const afterM = await p.evaluate(() => ({ bag: __mv.state.bag.slice(), rares: { ...__mv.state.rares } }));
    ok('f rare moyenne → touladi', afterM.bag.includes('touladi') || afterM.rares.touladi >= 1, JSON.stringify(afterM));
    await p.click('#panel .action .btn.primary');
    await p.evaluate(() => __mv.waitT(0.2));

    await p.evaluate(() => {
      __mv.state.bag = []; __mv.state.rares = {};
      __mv.flows.actionQ({ kind: 'fish', rod: 'grosse', skill: 'qc_s1_ari_01', d: 2, stretch: true });
    });
    await typeAnswer(p);
    await p.waitForSelector('#panel .actionwin');
    const afterG = await p.evaluate(() => ({ bag: __mv.state.bag.slice(), rares: { ...__mv.state.rares } }));
    ok('f rare grosse → esturgeon_n', afterG.bag.includes('esturgeon_n') || afterG.rares.esturgeon_n >= 1, JSON.stringify(afterG));
    await p.click('#panel .action .btn.primary');
    await p.evaluate(() => __mv.waitT(0.2));

    const i2 = await p.evaluate(async () => {
      const aq = await import('./js/actionq.js');
      return { a: aq.loot('fish', 0, 2, 'petite'), b: aq.loot('fish', 1, 2, 'moyenne'), c: aq.loot('fish', 2, 2, 'grosse') };
    });
    ok('f île 2 RARE_FISH2 inchangé', i2.a === 'gros_dore' && i2.b === 'saumon' && i2.c === 'bar', JSON.stringify(i2));

    await c.close();
  } catch (e) { ok('exception', false, e.stack); }
  ok('z 0 erreur console', errs.length === 0, errs.slice(0, 5).join(' | '));
  console.log(`\n${pass} PASS, ${fail} FAIL`); await b.close(); process.exit(fail ? 1 : 0);
})();
