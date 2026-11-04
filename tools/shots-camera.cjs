// Captures de cadrage caméra aux mêmes endroits : node tools/shots-camera.cjs <dossier> [port]
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
const OUT = process.argv[2], PORT = process.argv[3] || 8653, BASE = `http://localhost:${PORT}/?fresh=1&seed=4242&adapt=0`;
const errs = [];
(async () => {
  const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const spots = [['1-village-jour', 'midi', 0, 2, 6], ['2-camille-animaux', 'matin', 0, -4, 10], ['3-nuit', 'nuit', 0, 2, 6], ['4-ile2', 'midi', 2], ['5-mobile', 'midi', 0, 2, 6, 1], ['6-mobile-ile2', 'doree', 2, 0, 0, 1]];
  for (const [n, time, isle, x, z, mob] of spots) {
    const c = await b.newContext(mob ? { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 800 } });
    const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(BASE + '&time=' + time); await p.waitForFunction(() => window.__mv); mob ? await p.tap('#play') : await p.click('#play');
    await p.evaluate(() => __mv.waitT(0.5));
    if (isle === 2) await p.evaluate(() => { __mv.unlockFerry(); return __mv.travel(2, { instant: true }); });
    else await p.evaluate(([x, z]) => { __mv.tp(x, z); __mv.G.pets.regroup(__mv.player); }, [x, z]);
    await p.evaluate(() => __mv.waitT(2.5)); await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${n}.png` }); await c.close();
  }
  console.log('erreurs:', errs.length, errs.slice(0, 3).join(' | ')); await b.close();
})();
