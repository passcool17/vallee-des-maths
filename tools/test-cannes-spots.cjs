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

    await c.close();
  } catch (e) { ok('exception', false, e.stack); }
  ok('z 0 erreur console', errs.length === 0, errs.slice(0, 5).join(' | '));
  console.log(`\n${pass} PASS, ${fail} FAIL`); await b.close(); process.exit(fail ? 1 : 0);
})();
