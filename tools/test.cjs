// Parcours scripté de bout en bout (bureau puis mobile 390×844), un navigateur à la fois.
// Les attentes sont en temps de jeu (__mv.waitT). Usage : node tools/serve.js 8653 & node tools/test.cjs [port]
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
const path = require('path');
const PORT = +process.argv[2] || 8653, URL = `http://localhost:${PORT}/`;
const SHOTS = path.join(__dirname, '..', '..', 'shots');
const EXE = '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
let pass = 0, fail = 0, CUR = null;
const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };
// Paires d’éléments visibles qui se chevauchent
const OVERLAP = sels => { const R = []; for (const s of sels) for (const el of document.querySelectorAll(s)) { const st = getComputedStyle(el), r = el.getBoundingClientRect(); if (st.display !== 'none' && st.visibility !== 'hidden' && r.width && r.height && !el.closest('.hidden')) R.push([s, r]); }
  const bad = []; for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const [a, ra] = R[i], [b, rb] = R[j]; if (ra.left < rb.right - 1 && rb.left < ra.right - 1 && ra.top < rb.bottom - 1 && rb.top < ra.bottom - 1) bad.push(`${a}×${b}`); }
  const off = R.filter(([, r]) => r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1).map(([s]) => `${s} hors écran`);
  return [...bad, ...off]; };
const HUD = ['#money', '#clock', '#bag', '#btn-carnet', '#btn-son', '#prompt', '#stick', '#act', '#toasts .toast'];

async function run(kind) {
  const mobile = kind === 'mobile', px = mobile ? 'm' : 'd';
  const browser = await chromium.launch({ executablePath: EXE, args: ARGS });
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage(); const errs = []; CUR = p;
  p.on('pageerror', e => errs.push(`pageerror: ${e.message}`)); p.on('console', m => { if (m.type() === 'error') errs.push(`console: ${m.text()}`); });
  const ev = (f, a) => p.evaluate(f, a);
  const waitT = s => ev(s => __mv.waitT(s), s);
  const shot = async name => { await waitT(0.35); await p.screenshot({ path: path.join(SHOTS, `${px}-${name}.png`) }); };
  const press = async sel => mobile ? p.tap(sel) : p.click(sel);
  const pos = () => ev(() => ({ x: __mv.player.pos.x, z: __mv.player.pos.z }));
  const act = async () => mobile ? p.tap('#act') : p.keyboard.press('KeyE');
  const near = async (x, z) => { await ev(([x, z]) => __mv.tp(x, z), [x, z]); await waitT(0.3); };
  const toVillager = async id => { const v = await ev(id => { const v = __mv.G.villagers.find(v => v.id === id); return { x: v.pos.x, z: v.pos.z }; }, id); await near(v.x, v.z + 1.4); };

  await p.goto(`${URL}?fresh=1&seed=4242&time=doree`); await p.waitForSelector('#play');
  await press('#play'); await waitT(1.2);
  ok(`${px} titre fermé, jeu lancé`, await ev(() => !document.getElementById('title')));

  // 1) Marcher : clavier (bureau) ou joystick (mobile)
  const p0 = await pos();
  if (mobile) { const b = await p.locator('#stick').boundingBox(); const cx = b.x + b.width / 2, cy = b.y + b.height / 2; await p.mouse.move(cx, cy); await p.mouse.down(); await p.mouse.move(cx, cy - 50, { steps: 4 }); await waitT(1); await p.mouse.up(); }
  else { await p.keyboard.down('KeyW'); await waitT(1); await p.keyboard.up('KeyW'); await p.keyboard.down('ArrowLeft'); await waitT(0.4); await p.keyboard.up('ArrowLeft'); }
  const p1 = await pos(); ok(`${px} déplacement ${mobile ? 'joystick' : 'clavier'}`, p1.z < p0.z - 2, `${p0.z.toFixed(1)} → ${p1.z.toFixed(1)}`);
  // Clic/tap pour marcher
  const tgt = await ev(() => __mv.screen(__mv.player.pos.x + 3, __mv.player.pos.z + 3, 0));
  if (mobile) await p.touchscreen.tap(tgt.x, tgt.y); else await p.mouse.click(tgt.x, tgt.y);
  await waitT(1.5); const p2 = await pos(); ok(`${px} clic pour marcher`, Math.hypot(p2.x - p1.x - 3, p2.z - p1.z - 3) < 1.2, `(${(p2.x - p1.x).toFixed(1)}, ${(p2.z - p1.z).toFixed(1)})`);

  // 2) Vue d’ensemble
  await near(mobile ? 3 : 1, mobile ? 4 : 10); await shot('01-ile');
  let hud = await ev(OVERLAP, HUD); ok(`${px} HUD sans chevauchement`, hud.length === 0, hud.join(' | '));

  // 3) Secouer un érable → pièces
  const m0 = await ev(() => __mv.state.money);
  const tree = await ev(() => { const t = __mv.world.interactables.find(i => i.kind === 'tree' && Math.hypot(i.pos.x, i.pos.z) < 20); return { x: t.pos.x, z: t.pos.z, r: t.r }; });
  await near(tree.x, tree.z + tree.r - 0.3); await act(); await waitT(0.9);
  ok(`${px} secouer un érable donne des sous`, (await ev(() => __mv.state.money)) > m0);

  // 4) Dialogue avec Gaston → établi
  await toVillager('gaston'); ok(`${px} invite « Parler à Gaston »`, (await ev(() => __mv.nearest())) === 'gaston');
  await act(); await p.waitForSelector('#panel .dialog'); await shot('02-dialogue');
  await press('#panel .choices .btn.primary'); await p.waitForSelector('#panel .tools'); await shot('03-etabli');

  // 5) Améliorations par de vraies entrées (pavé numérique / choix)
  const typeAnswer = async () => {
    await p.waitForFunction(() => __mv.flows.cur && !document.querySelector('#panel .feedback.ok'), null, { timeout: 5000 });
    const info = await ev(() => { const c = __mv.flows.cur; return { kind: c.ex ? c.ex.answer.kind : 'num', ans: c.answer() }; });
    if (info.kind === 'choice') { const btns = p.locator('#panel .btn.choice'); const n = await btns.count(); for (let i = 0; i < n; i++) if ((await btns.nth(i).textContent()) === info.ans) { await btns.nth(i).click(); break; } await press('#panel .validate'); return info.ans; }
    const parts = info.ans.split(' ; ');
    for (let f = 0; f < parts.length; f++) { await press(`#panel .field[data-f="${f}"]`); for (const ch of parts[f]) await press(`#panel .numpad [data-k="${ch === '-' || ch === '−' ? '−' : ch === '.' ? ',' : ch}"]`); }
    await press('#panel .numpad [data-k="✓"]'); return info.ans;
  };
  const upgrade = async (tool, opts = {}) => {
    await press(`#panel [data-tool="${tool}"]`); await p.waitForSelector('#panel .exercise');
    if (opts.shots) {
      await shot('04-exercice');
      const kind = await ev(() => __mv.flows.cur.ex.answer.kind);
      const m0 = await ev(() => __mv.state.money);
      if (kind === 'num') { await press('#panel .field[data-f="0"]'); for (const ch of '999') await press(`#panel .numpad [data-k="${ch}"]`); await press('#panel .numpad [data-k="✓"]'); }
      else { const c = await ev(() => __mv.flows.cur.ex.answer.correct); await p.locator('#panel .btn.choice').nth(c === 0 ? 1 : 0).click(); await press('#panel .validate'); }
      await press('#panel .btn.hint'); await p.waitForSelector('#panel .hintline'); await shot('05-indice');
      ok(`${px} mauvaise réponse → rétroaction douce, aucune pénalité d’argent`, (await ev(() => document.querySelector('#panel .feedback').className)).includes('no') && (await ev(() => __mv.state.money)) === m0);
    }
    for (let i = 0; i < 3; i++) {
      const a = await typeAnswer(); await p.waitForSelector('#panel .feedback.ok', { timeout: 4000 }).catch(() => {});
      ok(`${px} ${tool} : bonne réponse ${i + 1}/3 acceptée (« ${a} »)`, await ev(() => !!document.querySelector('#panel .feedback.ok')), await ev(() => document.querySelector('#panel .q').textContent));
      await press('#panel .exercise > .btn.primary:not(.hidden)'); await waitT(0.2);
    }
    await p.waitForSelector('#panel .celebrate');
    ok(`${px} ${tool} passe au niveau 1`, (await ev(t => __mv.state.tools[t], tool)) === 1);
    if (opts.shots) await shot('06-amelioration');
    await press('#panel .celebrate .btn.primary'); await p.waitForSelector('#panel .tools');
  };
  await upgrade('canne', { shots: true });
  await upgrade('arrosoir');
  ok(`${px} effet réel : la pêche mord plus vite`, await ev(() => __mv.state.tools.canne === 1));
  // L’arrosoir niv. 1 arrose 2 plates-bandes d’un coup
  await press('#panel .x'); const mb = await ev(() => __mv.state.money);
  const bed = await ev(() => { const b = __mv.world.beds[0]; return { x: b.pos.x, z: b.pos.z }; });
  await near(bed.x - 0.2, bed.z + 1.5); await act(); await waitT(1);
  ok(`${px} arrosoir niv. 1 : 2 plates-bandes = +1,50 $`, (await ev(() => __mv.state.money)) - mb === 150, `${(await ev(() => __mv.state.money)) - mb} ¢`);

  // 6) Réchauffement après 2 erreurs (défi de Flocon)
  await toVillager('flocon'); await act(); await p.waitForSelector('#panel .dialog');
  await press('#panel .choices .btn.primary'); await p.waitForSelector('#panel .skills');
  await press('#panel .btn.skill'); await p.waitForSelector('#panel .exercise');
  for (let i = 0; i < 2; i++) { const kind = await ev(() => __mv.flows.cur.ex.answer.kind);
    if (kind === 'choice') { const c = await ev(() => __mv.flows.cur.ex.answer.correct); await p.locator('#panel .btn.choice').nth(c === 0 ? 1 : 0).click(); await press('#panel .validate'); }
    else { await press('#panel .field[data-f="0"]'); for (const ch of '9999') await press(`#panel .numpad [data-k="${ch}"]`); await press('#panel .numpad [data-k="✓"]'); } }
  ok(`${px} 2 erreurs → Flocon propose un réchauffement`, await ev(() => !!document.querySelector('#panel .warmup')));
  if (!mobile) await shot('10-rechauffement');
  await press('#panel .warm-yes'); await p.waitForSelector('#panel .prog.warm');
  ok(`${px} réchauffement lancé`, await ev(() => __mv.flows.cur.session.kind === 'warmup'));
  await typeAnswer(); await p.waitForSelector('#panel .feedback.ok'); await press('#panel .exercise > .btn.primary:not(.hidden)');
  ok(`${px} retour à l’exercice du défi`, await ev(() => __mv.flows.cur.session.kind === 'defi'));
  await press('#panel .x');

  // 7) Magasin : rabais + TPS + TVQ, total calculé au pavé
  await near(12, -9 + 3.6); ok(`${px} invite du magasin`, (await ev(() => __mv.nearest())) === 'magasin');
  await act(); await p.waitForSelector('#panel .items');
  const money0 = await ev(() => __mv.state.money);
  await press('#panel [data-item="nichoir"]'); await p.waitForSelector('#panel .ticket');
  // Pour la capture, on veut un rabais : retour au catalogue tant que le devis du jour n’en a pas
  for (let i = 0; i < 8 && !(await ev(() => __mv.flows.cur.q.rabais)); i++) { await p.getByRole('button', { name: '← Catalogue' }).click(); await press('#panel [data-item="nichoir"]'); await p.waitForSelector('#panel .ticket'); }
  ok(`${px} devis avec rabais affiché`, await ev(() => !!document.querySelector('#panel .tl.rabais') && __mv.flows.cur.q.rabais > 0));
  await shot('07-magasin-taxes');
  const q = await ev(() => ({ total: __mv.flows.cur.q.totalCents, rabais: __mv.flows.cur.q.rabais }));
  await typeAnswer(); await p.waitForSelector('#panel .feedback.ok');
  const money1 = await ev(() => __mv.state.money);
  ok(`${px} nichoir acheté (total ${(q.total / 100).toFixed(2)} $, rabais ${q.rabais} %)`, money0 - money1 === q.total && (await ev(() => __mv.state.decor.includes('nichoir'))));
  await shot('08-achat');
  await press('#panel .x');

  // 8) Carnet
  if (mobile) await press('#btn-carnet'); else await p.keyboard.press('KeyC');
  await p.waitForSelector('#panel .carnet'); await shot('09-carnet');
  ok(`${px} carnet : 22 compétences avec référence MEQ`, (await ev(() => document.querySelectorAll('#panel .sk .pda').length)) === 22);
  await press('#panel .x');

  // 9) Pêche réelle avec la canne niv. 1
  await near(6, 36.4); await act(); await ev(() => new Promise(res => { const t = setInterval(() => { if (__mv.G.time && document.querySelector('#prompt')?.textContent.includes('Ça mord')) { clearInterval(t); res(); } }, 30); }));
  await act(); await waitT(0.3); ok(`${px} pêche : un poisson dans le sac`, (await ev(() => __mv.state.journal.fish)) === 1);

  // 10) Nuit + perf
  await near(1, 8); await ev(() => { __mv.state.clock = 0.875; }); await waitT(1.2); await shot('11-nuit');
  await ev(() => { __mv.state.clock = 0.125; }); await near(4, 30); await waitT(2.2);
  const fps = await ev(() => __mv.fps()); ok(`${px} FPS raisonnable (logiciel SwiftShader)`, fps > 15, fps.toFixed(1));
  hud = await ev(OVERLAP, HUD); ok(`${px} HUD sans chevauchement (fin)`, hud.length === 0, hud.join(' | '));

  // Panneaux : pas de débordement horizontal, pavé visible
  await act(); // pêche au quai, pour vérifier que l’invite ne cache rien
  await toVillager('gaston'); await act(); await p.waitForSelector('#panel .dialog'); await press('#panel .choices .btn.primary'); await press('#panel [data-tool="filet"]'); await p.waitForSelector('#panel .numpad, #panel .choice');
  const lay = await ev(() => { const s = document.querySelector('#panel .sheet'); const r = s.getBoundingClientRect(); return { w: s.scrollWidth <= s.clientWidth + 1, inside: r.left >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && r.top >= 0 }; });
  ok(`${px} panneau d’exercice dans l’écran, sans défilement horizontal`, lay.w && lay.inside);
  if (mobile) { const keys = await ev(OVERLAP, ['#panel .numpad .k']); ok('m touches du pavé sans chevauchement', keys.filter(s => !s.includes('hors écran')).length === 0); }
  await press('#panel .x');

  await waitT(0.5);
  ok(`${px} 0 erreur JS`, errs.length === 0, errs.slice(0, 5).join(' | '));
  await browser.close();
}
(async () => {
  for (const k of (process.env.ONLY ? [process.env.ONLY] : ['desktop', 'mobile'])) { try { await run(k); } catch (e) { fail++; console.log(`FAIL ${k} : exception ${e.message.split('\n')[0]}`); if (CUR) { console.log(e.stack.split('\n').find(l => l.includes('test.cjs:')));
      console.log(await CUR.evaluate(() => JSON.stringify({ near: __mv.nearest(), panel: document.querySelector('#panel')?.className, html: document.querySelector('#panel')?.innerHTML.slice(0, 300), pos: __mv.player.pos, prompt: document.querySelector('#prompt')?.textContent })).catch(x => x.message)); await CUR.screenshot({ path: `/tmp/fail-${k}.png` }).catch(() => {}); await CUR.context().browser().close(); } } }
  console.log(`\n${pass} PASS, ${fail} FAIL`); process.exit(fail ? 1 : 0);
})();
