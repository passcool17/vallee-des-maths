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
  await ev(() => { __mv.force.maple = false; }); // le coup de sirop est testé plus loin
  await near(tree.x, tree.z + tree.r - 0.3); await act(); await waitT(0.5);
  ok(`${px} secouer un érable donne des sous`, (await ev(() => __mv.state.money)) > m0);
  ok(`${px} gain affiché en pastille sous l’argent, pas sur la scène`, await ev(() => !!document.querySelector('#hud .gainpill') && !document.querySelector('#toasts .toast')));
  hud = await ev(OVERLAP, [...HUD.filter(x => x !== '#money'), '.gainpill']); ok(`${px} pastille de gain sans chevauchement`, hud.length === 0, hud.join(' | '));

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
  // Le devis ne change plus en rouvrant l’article (correctif étape 2)
  const qa = await ev(() => JSON.stringify(__mv.flows.cur.q));
  await p.getByRole('button', { name: '← Catalogue' }).click(); await press('#panel [data-item="nichoir"]'); await p.waitForSelector('#panel .ticket');
  ok(`${px} même devis en rouvrant l’article`, (await ev(() => JSON.stringify(__mv.flows.cur.q))) === qa);
  // Pour la capture, on veut un rabais : on passe au lendemain (nouveau devis) tant qu’il n’y en a pas
  for (let i = 0; i < 12 && !(await ev(() => __mv.flows.cur.q.rabais)); i++) { await p.getByRole('button', { name: '← Catalogue' }).click(); await ev(() => { __mv.state.day++; }); await press('#panel [data-item="nichoir"]'); await p.waitForSelector('#panel .ticket'); }
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
  await ev(() => { __mv.force.rare = false; });
  await near(6, 36.4); await act(); await ev(() => new Promise(res => { const t = setInterval(() => { if (__mv.G.time && document.querySelector('#prompt')?.textContent.includes('Ça mord')) { clearInterval(t); res(); } }, 30); }));
  await act(); await waitT(0.3); ok(`${px} pêche : un poisson dans le sac`, (await ev(() => __mv.state.journal.fish)) === 1);

  // ---------- ÉTAPE 2 : questions pendant les actions
  const waitPrompt = txt => ev(txt => new Promise(res => { const t = setInterval(() => { if (document.querySelector('#prompt')?.textContent.includes(txt)) { clearInterval(t); res(); } }, 30); }), txt);
  const rareBite = async (q) => { await ev(q => { __mv.force.rare = true; if (q) __mv.force.q = q; else delete __mv.force.q; }, q); await near(6, 36.4); await act(); await waitPrompt('Ça mord fort'); await act(); await p.waitForSelector('#panel .action .tbar'); };
  const wrongAnswer = async () => { const kind = await ev(() => __mv.flows.cur.ex.answer.kind);
    if (kind === 'choice') { const c = await ev(() => __mv.flows.cur.ex.answer.correct); await p.locator('#panel .btn.choice').nth(c === 0 ? 1 : 0).click(); await press('#panel .validate'); }
    else { await press('#panel .field[data-f="0"]'); for (const ch of '99999') await press(`#panel .numpad [data-k="${ch}"]`); await press('#panel .numpad [data-k="✓"]'); } };
  const actionLayout = async tag => {
    const lay = await ev(() => { const s = document.querySelector('#panel .sheet'); const r = s.getBoundingClientRect(); return { w: s.scrollWidth <= s.clientWidth + 1, inside: r.left >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && r.top >= 0 }; });
    const ov = await ev(OVERLAP, ['#panel .tbar', '#panel .secs', '#panel .pausebtn', '#panel .btn.hint', '#panel .btn.skip', '#panel .q', '#panel .numpad', '#panel .choices', '#panel .validate', '#panel .exhead']);
    ok(`${px} ${tag} : panneau dans l’écran, sans chevauchement`, lay.w && lay.inside && ov.filter(x => !x.includes('hors écran')).length === 0, ov.join(' | '));
  };
  // A) Touche rare + bonne réponse → poisson rare dans le sac et le carnet
  const before = await ev(() => ({ bag: __mv.state.bag.length, fish: __mv.state.journal.fish, money: __mv.state.money }));
  await rareBite(null);
  ok(`${px} touche rare → question chronométrée`, await ev(() => __mv.flows.cur.kind === 'action' && __mv.flows.cur.timer.total >= 20 && __mv.flows.cur.timer.total <= 35), await ev(() => String(__mv.flows.cur.timer.total)));
  ok(`${px} « Laisser filer » toujours offert`, await ev(() => !!document.querySelector('#panel .btn.skip')));
  await actionLayout('question de pêche'); await shot('12-peche-question');
  const fq = await ev(() => __mv.flows.cur.q);
  await typeAnswer(); await p.waitForSelector('#panel .actionwin');
  const rareKey = ['omble', 'maskinonge', 'esturgeon'][fq.d];
  const aft = await ev(() => ({ bag: __mv.state.bag.slice(), rares: __mv.state.rares, j: __mv.state.journal }));
  ok(`${px} bonne réponse → ${rareKey} (niveau ${fq.d}, ${fq.skill.replace('qc_s1_', '')})`, aft.rares[rareKey] === 1 && aft.j.rare === 1 && aft.j.fish === before.fish + 1 && aft.bag.includes(rareKey));
  await shot('13-prise-rare');
  await press('#panel .action .btn.primary');
  // B) Touche rare + mauvaise réponse → il se sauve, message gentil, rien d’autre
  const b0 = await ev(() => ({ bag: __mv.state.bag.length, money: __mv.state.money, rare: __mv.state.journal.rare }));
  await rareBite({ skill: 'qc_s1_ari_01', d: 0 }); await wrongAnswer(); await p.waitForSelector('#panel .actionlose');
  const b1 = await ev(() => ({ bag: __mv.state.bag.length, money: __mv.state.money, rare: __mv.state.journal.rare, txt: document.querySelector('#panel .actionlose h3').textContent, res: __mv.flows.cur.result }));
  ok(`${px} mauvaise réponse → le poisson se sauve, sans pénalité`, b1.res === 'miss' && b1.bag === b0.bag && b1.money === b0.money && b1.rare === b0.rare && /reparti|prochaine/.test(b1.txt), b1.txt);
  ok(`${px} la bonne réponse est montrée`, await ev(() => !!document.querySelector('#panel .actionlose .feedback.info b')));
  await press('#panel .action .btn.primary');
  // C) Laisser filer
  await rareBite({ skill: 'qc_s1_ari_01', d: 0 }); const tries0 = await ev(() => __mv.state.mastery.qc_s1_ari_01?.tries || 0);
  await press('#panel .btn.skip'); await p.waitForSelector('#panel .actionlose');
  ok(`${px} « Laisser filer » → aucune conséquence`, (await ev(() => __mv.flows.cur.result)) === 'skip' && (await ev(() => __mv.state.mastery.qc_s1_ari_01?.tries || 0)) === tries0 && (await ev(() => __mv.state.journal.rare)) === 1);
  await press('#panel .action .btn.primary');
  ok(`${px} on peut repêcher tout de suite après`, await ev(() => !document.querySelector('#panel:not(.hidden)')));
  // D) Pause (touche P / bouton ⏸) et onglet caché : le chrono s’arrête ; puis le temps écoulé
  await rareBite({ skill: 'qc_s1_ari_01', d: 0 }); await waitT(1);
  const left0 = await ev(() => __mv.flows.cur.timer.left);
  if (mobile) await press('#panel .pausebtn'); else await p.keyboard.press('KeyP');
  ok(`${px} pause affichée`, await ev(() => __mv.G.paused && !document.getElementById('pause').classList.contains('hidden')));
  const lp = await ev(() => __mv.flows.cur.timer.left);
  await p.waitForTimeout(1500);
  ok(`${px} chrono figé en pause`, (await ev(() => __mv.flows.cur.timer.left)) === lp && lp <= left0, `${left0} → ${lp}`);
  await press('#resume'); await waitT(1);
  const left1 = await ev(() => __mv.flows.cur.timer.left); ok(`${px} chrono repart après « Reprendre »`, left1 < left0 - 0.5, `${left0.toFixed(2)} → ${left1.toFixed(2)}`);
  await ev(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const lh0 = await ev(() => __mv.flows.cur.timer.left); await p.waitForTimeout(1500); const lh1 = await ev(() => __mv.flows.cur.timer.left);
  ok(`${px} onglet caché → pause auto, chrono figé`, (await ev(() => __mv.G.paused)) && lh0 === lh1, `${lh0} → ${lh1}`);
  await ev(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  ok(`${px} au retour, la pause attend « Reprendre »`, await ev(() => __mv.G.paused));
  await press('#resume');
  const rest = await ev(() => __mv.flows.cur.timer.left); await waitT(rest + 0.4); await p.waitForSelector('#panel .actionlose');
  ok(`${px} temps écoulé → il se sauve gentiment`, (await ev(() => __mv.flows.cur.result)) === 'timeout' && (await ev(() => __mv.state.journal.rare)) === 1);
  await press('#panel .action .btn.primary');
  // E) Érable : question de fractions → sirop
  const tr = await ev(() => { const t = __mv.world.interactables.find(i => i.kind === 'tree' && __mv.G.time >= i.ready); return { x: t.pos.x, z: t.pos.z, r: t.r }; });
  await ev(() => { __mv.force.maple = true; __mv.force.q = { skill: 'qc_s1_ari_03', d: 1 }; });
  const s0 = await ev(() => ({ money: __mv.state.money, sirop: __mv.state.journal.sirop }));
  await near(tr.x, tr.z + tr.r - 0.3); await act(); await p.waitForSelector('#panel .action.maple .tbar');
  ok(`${px} érable : sous de base donnés quand même`, (await ev(() => __mv.state.money)) > s0.money);
  ok(`${px} érable : question de fractions`, await ev(() => ['qc_s1_ari_03', 'qc_s1_ari_04', 'qc_s1_ari_05', 'qc_s1_ari_06'].includes(__mv.flows.cur.q.skill)));
  await actionLayout('question de l’érable'); await shot('14-erable-question');
  await typeAnswer(); await p.waitForSelector('#panel .actionwin');
  ok(`${px} bonne réponse → cruchon de sirop`, await ev((a) => __mv.state.rares.sirop === 1 && __mv.state.journal.sirop === a + 1 && __mv.state.bag.includes('sirop'), s0.sirop));
  await shot('14b-sirop'); await press('#panel .action .btn.primary');
  await ev(() => { delete __mv.force.q; });
  // F) Carnet : section des prises rares
  if (mobile) await press('#btn-carnet'); else await p.keyboard.press('KeyC');
  await p.waitForSelector('#panel .carnet .rares');
  ok(`${px} carnet : prise rare et sirop notés`, await ev(k => !!document.querySelector(`#panel .chip.rare[data-k="${k}"]`) && !!document.querySelector('#panel .chip.rare[data-k="sirop"]'), rareKey));
  await p.evaluate(() => document.querySelector('#panel .rares').scrollIntoView({ block: 'center' })); await shot('15-carnet-rare');
  await press('#panel .x');

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
  // Une sauvegarde de l’étape 1 (vdm.save.v1, v:1) se charge et est complétée
  if (!mobile) {
    const c2 = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const p2 = await c2.newPage();
    p2.on('pageerror', e => errs.push(`v1 pageerror: ${e.message}`)); p2.on('console', m => { if (m.type() === 'error') errs.push(`v1 console: ${m.text()}`); });
    const V1 = { v: 1, seed: 77, money: 4321, tools: { canne: 2, arrosoir: 1, filet: 0, pelle: 0, sac: 1 }, upg: { canne: 1 }, mastery: { qc_s1_ari_01: { ok: 3, tries: 4, miss: 0 } }, bag: ['perchaude', 'esturgeon'], decor: ['nichoir'], bridges: { erables: true },
      pos: { x: 2, z: 6 }, clock: 0.4, exCount: 12, muted: true, met: { intro: 1, gaston: 2 }, journal: { fish: 5, bugs: 1, finds: 2, coins: 900, flowers: 3 } };
    await c2.addInitScript(v => { if (!sessionStorage.getItem('v1done')) { localStorage.setItem('vdm.save.v1', JSON.stringify(v)); sessionStorage.setItem('v1done', '1'); } }, V1);
    await p2.goto(URL); await p2.waitForSelector('#play');
    ok('d sauvegarde v1 : bouton « Continuer »', (await p2.textContent('#play')) === 'Continuer');
    await p2.click('#play'); await p2.evaluate(() => __mv.waitT(0.5));
    const st = await p2.evaluate(() => ({ v: __mv.state.v, money: __mv.state.money, canne: __mv.state.tools.canne, bag: __mv.state.bag.length, rare: __mv.state.journal.rare, rares: __mv.state.rares, nichoir: __mv.state.decor.includes('nichoir') }));
    ok('d sauvegarde v1 chargée et normalisée', st.v === 3 && st.money === 4321 && st.canne === 2 && st.bag === 2 && st.rare === 0 && JSON.stringify(st.rares) === '{}' && st.nichoir, JSON.stringify(st));
    await p2.keyboard.press('KeyC'); await p2.waitForSelector('#panel .carnet .rares');
    ok('d sauvegarde v1 : carnet ouvert sans erreur', await p2.evaluate(() => document.querySelector('#panel .rares').textContent.includes('Rien encore')));
    await p2.evaluate(() => __mv.G.save()); ok('d sauvegarde réécrite en v3 sous la même clé', await p2.evaluate(() => JSON.parse(localStorage.getItem('vdm.save.v1')).v === 3));
    await c2.close();
  }
  ok(`${px} 0 erreur JS`, errs.length === 0, errs.slice(0, 5).join(' | '));
  await browser.close();
}
(async () => {
  for (const k of (process.env.ONLY ? [process.env.ONLY] : ['desktop', 'mobile'])) { try { await run(k); } catch (e) { fail++; console.log(`FAIL ${k} : exception ${e.message.split('\n')[0]}`); if (CUR) { console.log(e.stack.split('\n').find(l => l.includes('test.cjs:')));
      console.log(await CUR.evaluate(() => JSON.stringify({ near: __mv.nearest(), panel: document.querySelector('#panel')?.className, html: document.querySelector('#panel')?.innerHTML.slice(0, 300), pos: __mv.player.pos, prompt: document.querySelector('#prompt')?.textContent })).catch(x => x.message)); await CUR.screenshot({ path: `/tmp/fail-${k}.png` }).catch(() => {}); await CUR.context().browser().close(); } } }
  console.log(`\n${pass} PASS, ${fail} FAIL`); process.exit(fail ? 1 : 0);
})();
