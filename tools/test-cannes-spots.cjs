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

    await c.close();
  } catch (e) { ok('exception', false, e.stack); }
  ok('z 0 erreur console', errs.length === 0, errs.slice(0, 5).join(' | '));
  console.log(`\n${pass} PASS, ${fail} FAIL`); await b.close(); process.exit(fail ? 1 : 0);
})();
