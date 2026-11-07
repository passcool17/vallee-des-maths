// Test : 3 cannes + 3 spots (save.rods, shop Gaston, spots Lise/Lionel)
// Usage : node tools/serve.js 8653 & node tools/test-cannes-spots.cjs [port]
const fs = require('fs');
let chromium;
try {
  ({ chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright'));
} catch {
  ({ chromium } = require('playwright'));
}
const CI_EXE = '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const EXE = fs.existsSync(CI_EXE) ? CI_EXE : chromium.executablePath();
const PORT = process.argv[2] || 8653, BASE = `http://localhost:${PORT}/?fresh=1&seed=4242&adapt=0&time=midi`;
let pass = 0, fail = 0, errs = [];
const ok = (name, c, extra = '') => { if (c) pass++; else fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${name}${c || !extra ? '' : ' — ' + extra}`); };
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  async function open(q = '') {
    const c = await b.newContext({ viewport: { width: 1024, height: 640 } }); const p = await c.newPage();
    p.on('pageerror', e => errs.push(q + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(q + ': ' + m.text()); });
    p.on('requestfailed', req => errs.push(q + ': net ' + req.url() + ' ' + ((req.failure() && req.failure().errorText) || '')));
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

    // Régression : les quais de Lise (est) et Lionel (nord) joignent la rive marchable
    // et avancent sur l’eau. Oracle indépendant du placement : le sable rencontre l’eau
    // vers (r + 2,01) × k (k ≤ 1,035), donc au plus r + 2,5. « Sur l’eau » = planches
    // au-delà de r + 4,2. La rive marchable est hypot < r − 0,3 : des planches doivent
    // encore être sous r − 1,2 pour qu’on puisse y monter depuis l’îlot.
    const geom = await p.evaluate(async () => {
      const { ISLANDS, DOCK } = await import('./js/world.js');
      const by = Object.fromEntries(ISLANDS.map(i => [i.id, i]));
      const spec = { quai_lise: 'bleuets', quai_lionel: 'erables' };
      const dist = (isl, x, z) => Math.hypot(x - isl.x, z - isl.z);
      const analyze = id => {
        const it = __mv.world.interactables.find(i => i.id === id);
        const isl = by[spec[id]];
        const planks = [];
        it.obj.updateWorldMatrix(true, true);
        it.obj.traverse(o => {
          const gp = o.geometry && o.geometry.parameters;
          if (!gp || o.geometry.type !== 'BoxGeometry') return;
          if (!(gp.width > 1.4 && gp.height < 0.35 && gp.depth < 1.3)) return;
          const v = o.position.clone(); o.getWorldPosition(v);
          planks.push({ x: v.x, y: v.y, z: v.z });
        });
        if (!planks.length) return { id, n: 0, rIsland: isl.r };
        let minP = planks[0], maxP = planks[0];
        for (const q of planks) {
          if (dist(isl, q.x, q.z) < dist(isl, minP.x, minP.z)) minP = q;
          if (dist(isl, q.x, q.z) > dist(isl, maxP.x, maxP.z)) maxP = q;
        }
        const ax = maxP.x - minP.x, az = maxP.z - minP.z, al = Math.hypot(ax, az) || 1;
        const rx = maxP.x - isl.x, rz = maxP.z - isl.z, rl = Math.hypot(rx, rz) || 1;
        const spot = it.spot;
        const fx = spot.fx - spot.x, fz = spot.fz - spot.z, fl = Math.hypot(fx, fz) || 1;
        const srx = spot.x - isl.x, srz = spot.z - isl.z, srl = Math.hypot(srx, srz) || 1;
        const open = { bridges: { bleuets: true, erables: true } };
        const ang = Math.atan2(spot.z - isl.z, spot.x - isl.x);
        const blocked = [];
        let pathOk = true;
        for (let d = isl.r - 2.2; d <= dist(isl, spot.x, spot.z) + 0.05; d += 0.4) {
          const x = isl.x + Math.cos(ang) * d, z = isl.z + Math.sin(ang) * d;
          if (!__mv.world.walkable(x, z, open)) { pathOk = false; blocked.push({ d: +d.toFixed(2), x: +x.toFixed(2), z: +z.toFixed(2) }); }
        }
        return {
          id, n: planks.length, rIsland: isl.r,
          minD: +dist(isl, minP.x, minP.z).toFixed(2), maxD: +dist(isl, maxP.x, maxP.z).toFixed(2),
          minY: +Math.min(...planks.map(q => q.y)).toFixed(3), maxY: +Math.max(...planks.map(q => q.y)).toFixed(3),
          outward: +((ax * rx + az * rz) / (al * rl)).toFixed(3),
          face: +((fx * srx + fz * srz) / (fl * srl)).toFixed(3),
          sd: +dist(isl, spot.x, spot.z).toFixed(2), bd: +dist(isl, spot.fx, spot.fz).toFixed(2),
          spotWalk: __mv.world.walkable(spot.x, spot.z, open),
          spotClosed: __mv.world.walkable(spot.x, spot.z, { bridges: {} }),
          pathOk, blocked: blocked.slice(0, 3),
          east: maxP.x > isl.x + isl.r && Math.abs(maxP.z - isl.z) < 3,
          north: maxP.z < isl.z - isl.r && Math.abs(maxP.x - isl.x) < 3,
          near: +Math.hypot(it.pos.x - spot.x, it.pos.z - spot.z).toFixed(3),
          r: it.r, spot,
        };
      };
      const quai = __mv.world.interactables.find(i => i.id === 'quai');
      const shop = await import('./js/shop.js');
      const fl = await import('./js/flows.js');
      return {
        lise: analyze('quai_lise'), lionel: analyze('quai_lionel'),
        quai: quai.spot, quaiR: quai.r, quaiZone: quai.zone || null, quaiRod: quai.rod,
        dock: { ...DOCK },
        fishIds: __mv.world.interactables.filter(i => i.kind === 'fish').map(i => i.id).sort(),
        quaiWalk: __mv.world.walkable(quai.spot.x, quai.spot.z, { bridges: {} }),
        ponts: {
          bleuets: shop.CATALOG.find(a => a.id === 'pont_bleuets').prixCents,
          erables: shop.CATALOG.find(a => a.id === 'pont_erables').prixCents,
        },
        rods: fl.RODS.map(r => [r.id, r.prixCents]),
      };
    });
    const dockOk = (name, g, side) => {
      ok(`g ${name} : planches de la rive marchable jusqu’au-dessus de l’eau`,
        g.n >= 4 && g.minD < g.rIsland - 1.2 && g.maxD > g.rIsland + 4.2 && g.minY > -0.05 && g.maxY < 0.4,
        JSON.stringify(g));
      ok(`g ${name} : le quai pointe vers le large (${side})`,
        g.outward > 0.92 && (side === 'est' ? g.east : g.north),
        JSON.stringify(g));
      ok(`g ${name} : on marche de l’îlot au bout, et seulement si le pont est ouvert`,
        g.pathOk && g.spotWalk === true && g.spotClosed === false && g.sd > g.rIsland + 2.5,
        JSON.stringify(g));
      ok(`g ${name} : la ligne part vers l’eau, interaction au bout du quai`,
        g.face > 0.92 && g.bd > g.sd + 1.5 && g.bd > g.rIsland + 5 && g.near < 0.35 && g.r === 1.8,
        JSON.stringify(g));
    };
    dockOk('Lise', geom.lise, 'est');
    dockOk('Lionel', geom.lionel, 'nord');
    ok('g trois spots de pêche, quai de l’île 1 inchangé',
      geom.fishIds.join() === 'quai,quai_lionel,quai_lise'
      && geom.quai.x === 6 && geom.quai.z === geom.dock.z1 - 0.8 && geom.quai.fx === 6 && geom.quai.fz === geom.dock.z1 + 3
      && geom.dock.z0 === 27 && geom.dock.z1 === 38 && geom.dock.x0 === 4.8 && geom.dock.x1 === 7.2
      && geom.quaiRod === 'petite' && geom.quaiZone == null && geom.quaiR === 1.8 && geom.quaiWalk === true
      && geom.ponts.bleuets === 6000 && geom.ponts.erables === 9000
      && geom.rods[0][0] === 'petite' && geom.rods[0][1] === 0
      && geom.rods[1][0] === 'moyenne' && geom.rods[1][1] === 7500
      && geom.rods[2][0] === 'grosse' && geom.rods[2][1] === 15000,
      JSON.stringify({ fishIds: geom.fishIds, quai: geom.quai, dock: geom.dock, ponts: geom.ponts, rods: geom.rods, quaiWalk: geom.quaiWalk }));

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

    // Contrôles réels : marcher du gazon jusqu’au bout du quai, puis E pour pêcher vers l’eau.
    fs.mkdirSync('/opt/cursor/artifacts', { recursive: true });
    async function hold(code, seconds) {
      await p.keyboard.down('ShiftLeft');
      await p.keyboard.down(code);
      await p.evaluate(s => __mv.waitT(s), seconds);
      await p.keyboard.up(code);
      await p.keyboard.up('ShiftLeft');
      await p.evaluate(() => __mv.waitT(0.2));
    }
    async function walkFish(name, { x, z, key, reached, castOut, shot }) {
      await p.evaluate(() => { if (__mv.G.ui.isOpen) __mv.G.ui.close(); __mv.tp(2, 6); });
      await p.evaluate(() => __mv.waitT(0.35));
      await p.evaluate(({ x, z }) => {
        __mv.state.rods = { petite: true, moyenne: true, grosse: true };
        __mv.world.openBridge('bleuets'); __mv.world.openBridge('erables');
        __mv.tp(x, z);
      }, { x, z });
      await p.evaluate(() => __mv.waitT(0.25));
      const start = await p.evaluate(() => ({ x: +__mv.player.pos.x.toFixed(2), z: +__mv.player.pos.z.toFixed(2) }));
      await hold(key, 4);
      const mid = await p.evaluate(() => {
        const el = document.querySelector('#prompt');
        return {
          x: +__mv.player.pos.x.toFixed(2), z: +__mv.player.pos.z.toFixed(2),
          nearest: __mv.nearest(),
          prompt: el && !el.classList.contains('hidden') ? el.textContent : '',
        };
      });
      ok(`h ${name} : le clavier mène de la rive au bout du quai`, reached(start, mid) && /Pêcher/.test(mid.prompt), JSON.stringify({ start, mid }));
      await p.keyboard.press('KeyE');
      await p.evaluate(() => __mv.waitT(0.5));
      const fish = await p.evaluate(() => {
        const el = document.querySelector('#prompt');
        return {
          bobber: __mv.world.bobber.visible,
          bx: +__mv.world.bobber.position.x.toFixed(2), bz: +__mv.world.bobber.position.z.toFixed(2),
          px: +__mv.player.pos.x.toFixed(2), pz: +__mv.player.pos.z.toFixed(2),
          prompt: el && !el.classList.contains('hidden') ? el.textContent : '',
        };
      });
      ok(`h ${name} : E pêche vers l’eau`, fish.bobber && /Remonter|mord/i.test(fish.prompt) && castOut(fish), JSON.stringify(fish));
      if (shot && fish.bobber) {
        await p.evaluate(() => { __mv.camK(1.9); __mv.cam().setZoom(1.6); });
        await p.evaluate(() => __mv.waitT(0.9));
        await p.waitForTimeout(250);
        await p.screenshot({ path: shot });
        await p.evaluate(() => { __mv.camK(1); __mv.cam().setZoom(1); });
      }
    }
    await walkFish('Lise', {
      x: 53.5, z: 4, key: 'KeyD', shot: '/opt/cursor/artifacts/quai_lise_rive_eau.png',
      reached: (s, m) => s.x < 55 && m.x > 60 && Math.abs(m.z - 4) < 1.5,
      castOut: f => f.px > 60 && f.bx > f.px + 1.5 && Math.abs(f.bz - f.pz) < 1.2,
    });
    await walkFish('Lionel', {
      x: -4, z: -55.2, key: 'KeyW', shot: '/opt/cursor/artifacts/quai_lionel_rive_eau.png',
      reached: (s, m) => s.z > -56 && m.z < -62 && Math.abs(m.x + 4) < 1.5,
      castOut: f => f.pz < -62 && f.bz < f.pz - 1.5 && Math.abs(f.bx - f.px) < 1.2,
    });
    await walkFish('quai île 1', {
      x: 6, z: 30, key: 'KeyS', shot: '/opt/cursor/artifacts/quai_ile1_inchange.png',
      reached: (s, m) => s.z < 32 && m.z > 36.4 && m.z < 38 && Math.abs(m.x - 6) < 1.2,
      castOut: f => f.pz > 36.4 && f.bz > f.pz + 1.5 && Math.abs(f.bx - 6) < 1.2 && Math.abs(f.px - 6) < 0.4,
    });

    await c.close();
  } catch (e) { ok('exception', false, e.stack); }
  ok('z 0 erreur console', errs.length === 0, errs.slice(0, 5).join(' | '));
  console.log(`\n${pass} PASS, ${fail} FAIL`); await b.close(); process.exit(fail ? 1 : 0);
})();
