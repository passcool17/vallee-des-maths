const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push('PE ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push('CE ' + m.text()));
  await p.goto('http://localhost:8653/?fresh=1&time=' + (process.argv[2] || 'midi'));
  await p.waitForTimeout(1500);
  await p.click('#play'); await p.evaluate(() => __mv.waitT(1));
  await p.screenshot({ path: '/tmp/smoke.png' });
  console.log(errs.join('\n') || 'no errors', await p.evaluate(() => __mv.fps()));
  await b.close();
})();
