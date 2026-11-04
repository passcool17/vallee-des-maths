// Caméra proche : cadrage, zoom (molette, + −, bornes), rapprochement derrière un bâtiment, île 2, mobile, 0 erreur.
// Usage : node tools/test-camera.cjs [port]
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
const PORT = process.argv[2] || 8653, BASE = `http://localhost:${PORT}/?fresh=1&seed=4242&adapt=0&time=midi`;
let pass = 0, fail = 0; const errs = [];
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n}${c || !x ? '' : ' — ' + x}`); };
(async () => {
  const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const open = async mob => { const c = await b.newContext(mob ? { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 800 } }); const p = await c.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(BASE); await p.waitForFunction(() => window.__mv); mob ? await p.tap('#play') : await p.click('#play'); await p.evaluate(() => __mv.waitT(1.5)); return { c, p }; };
  const dist = p => p.evaluate(() => { const c = __mv.cam(), P = __mv.player.pos; return Math.hypot(c.pos[0] - P.x, c.pos[1], c.pos[2] - P.z); });
  try {
    let { c, p } = await open(false);
    const d = await dist(p), fov = await p.evaluate(() => __mv.cam().fov);
    ok('caméra proche (≈ 11-14 m de Camille, champ ≤ 36°)', d > 10 && d < 15 && fov <= 36, JSON.stringify({ d, fov }));
    const pitch = await p.evaluate(() => { const c = __mv.cam(), P = __mv.player.pos; return Math.atan2(c.pos[1] - 0.9, c.pos[2] - P.z + 0.6) * 180 / Math.PI; });
    ok('angle plus bas (28-36°)', pitch > 28 && pitch < 36, pitch.toFixed(1));
    await p.mouse.move(640, 400); for (let i = 0; i < 30; i++) await p.mouse.wheel(0, 200); await p.evaluate(() => __mv.waitT(1));
    const zMax = await p.evaluate(() => __mv.cam().zoom), dFar = await dist(p);
    ok('molette : recule jusqu’à la borne 1,6', Math.abs(zMax - 1.6) < 1e-6 && dFar > d * 1.4, JSON.stringify({ zMax, dFar }));
    for (let i = 0; i < 30; i++) await p.keyboard.press('Equal'); await p.evaluate(() => __mv.waitT(0.3));
    ok('touche + : rapproche jusqu’à la borne 0,7', Math.abs(await p.evaluate(() => __mv.cam().zoom) - 0.7) < 1e-6);
    await p.evaluate(() => __mv.cam().setZoom(1));
    const ob = await p.evaluate(() => __mv.world.obstacles.find(o => o.r >= 2));
    await p.evaluate(o => __mv.tp(o.x, o.z - o.r - 0.9), ob); await p.evaluate(() => __mv.waitT(1.2));
    const occ = await p.evaluate(() => __mv.cam().occ);
    ok('derrière un bâtiment, la caméra se rapproche (ne traverse pas le mur)', occ < 0.75, JSON.stringify({ occ, ob }));
    await p.evaluate(() => __mv.tp(2, 6)); await p.evaluate(() => __mv.waitT(2));
    { const o2 = await p.evaluate(() => __mv.cam().occ); ok('en terrain dégagé, elle revient à sa distance', o2 > 0.95, o2.toFixed(2)); }
    await p.evaluate(() => { __mv.unlockFerry(); return __mv.travel(2, { instant: true }); }); await p.evaluate(() => __mv.waitT(1));
    const d2 = await dist(p); ok('île 2 : même cadrage après le traversier', Math.abs(d2 - d) < 1.5, JSON.stringify({ d, d2 }));
    await c.close();
    ({ c, p } = await open(true));
    const dm = await dist(p); ok('mobile portrait : un peu plus de recul (≈ 13-19 m)', dm > 13 && dm < 19, dm.toFixed(1));
    const box = await p.evaluate(() => { const v = __mv.player.pos.clone(); v.y = 0.9; v.project(__mv.camera); return { x: v.x, y: v.y }; });
    ok('mobile : Camille reste au centre de l’écran', Math.abs(box.x) < 0.15 && Math.abs(box.y) < 0.35, JSON.stringify(box));
    await c.close();
  } catch (e) { ok('exception', false, e.stack); }
  ok('0 erreur console', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(`\n${pass} PASS, ${fail} FAIL`); await b.close(); process.exit(fail ? 1 : 0);
})();
