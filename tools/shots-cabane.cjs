// Captures cabane à sucre + bleuetière : node tools/shots-cabane.cjs <dossier> [port]
const fs = require('fs');
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
const OUT = process.argv[2] || '/workspace/games/math-valley/shots/cabane';
const PORT = process.argv[3] || 8653;
const BASE = `http://localhost:${PORT}/?fresh=1&seed=4242&adapt=0&time=midi`;
fs.mkdirSync(OUT, { recursive: true });
const errs = [];
(async () => {
  const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const views = [
    { pre: 'd', ctx: { viewport: { width: 1280, height: 800 } } },
    { pre: 'm', ctx: { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  ];
  async function settle(p, x, z, faceX, faceZ, pin) {
    await p.evaluate(([x, z, fx, fz, pin]) => {
      __mv.tp(x, z);
      if (typeof __mv.player.face === 'function') __mv.player.face(fx, fz);
      if (__mv.G.pets && typeof __mv.G.pets.regroup === 'function') __mv.G.pets.regroup(__mv.player);
      const c = __mv.cam && __mv.cam();
      if (c && typeof c.setZoom === 'function') c.setZoom(1.28);
      if (pin) {
        const v = (__mv.G.allVillagers || []).find(o => o.id === pin.id);
        if (v) { v.pos.x = pin.x; v.pos.z = pin.z; if (v.talkTo) v.talkTo(); }
      }
    }, [x, z, faceX, faceZ, pin || null]);
    await p.evaluate(() => __mv.waitT(2.4));
    await p.waitForTimeout(400);
  }
  for (const { pre, ctx } of views) {
    const c = await b.newContext(ctx);
    const p = await c.newPage();
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(BASE);
    await p.waitForFunction(() => window.__mv, null, { timeout: 30000 });
    if (ctx.isMobile) await p.tap('#play'); else await p.click('#play');
    await p.evaluate(() => __mv.waitT(0.6));
    await p.evaluate(() => {
      __mv.world.openBridge('erables');
      __mv.world.openBridge('bleuets');
    });
    await p.evaluate(() => __mv.waitT(0.4));

    await settle(p, 0.6, -42.2, -4, -47);
    await p.screenshot({ path: `${OUT}/${pre}-01-cabane.png` });

    await settle(p, 1.8, -41.2, -1.4, -43.6, { id: 'lionel', x: -1.4, z: -43.6 });
    await p.screenshot({ path: `${OUT}/${pre}-02-lionel.png` });

    await settle(p, 46, 8.2, 46, 4);
    await p.screenshot({ path: `${OUT}/${pre}-03-bleuetiere.png` });

    await settle(p, 43.2, 9.0, 43.2, 6.4, { id: 'lise', x: 43.2, z: 6.4 });
    await p.screenshot({ path: `${OUT}/${pre}-04-lise.png` });

    await settle(p, 0.6, -42.2, -6.5, -48.4);
    await p.evaluate(() => __mv.flows.actionQ({ kind: 'sap', skill: 'qc_s1_pro_01', d: 0, stretch: true }));
    await p.waitForSelector('#panel .action.sap', { timeout: 8000 });
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${pre}-05-question.png` });

    await c.close();
  }
  console.log('shots:', fs.readdirSync(OUT).filter(f => f.endsWith('.png')).sort().join(', '));
  console.log('erreurs:', errs.length, errs.slice(0, 3).join(' | '));
  await b.close();
  if (errs.length) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
