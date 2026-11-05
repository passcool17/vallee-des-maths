// Parcours d’interface : dialogues, établi, atelier, exercices (indices, réchauffement), magasin, défis, carnet,
// traversier, phare de Rosalie, kiosque de Bernard.
import { h, fmtMoney } from './ui.js';
import { makeExercise, canonical } from './math/gen.js';
import { checkAnswer } from './math/check.js';
import { SKILLS, SKILLS2, DOMAINES, skillById, shortId, prereqsOf, isS2 } from './math/skills.js';
import { MASTERY, TOOLS, toolById, nextUpgrade, difficultyFor, recordAnswer, isMastered, isUnlocked, defiChoices, masteryCount, stats, canFerry, ferryProgress, FERRY_LEVEL } from './progression.js';
import { phareSteps, phareSVG, phareData } from './phare.js';
import { CATALOG, SELL, quoteFor, forgetQuote, checkTotal } from './shop.js';
import { NOMS, EMOJI } from './villagers.js';
import { logAnswer, weakList, successRate } from './adapt.js';
import { leconOf } from './lecons.js';
import { FETCH_MAX, COLLIERS } from './animaux.js';
import { NIVEAUX, loot, timeFor, makeTimer, canKiosk, kioskExercise, kioskDone } from './actionq.js';

export const ITEMS = {
  perchaude: ['🐟', 'Perchaude'], achigan: ['🐟', 'Achigan'], dore: ['🐠', 'Doré jaune'], truite: ['🐠', 'Truite arc-en-ciel'],
  omble: ['🐠', 'Omble de fontaine'], maskinonge: ['🐟', 'Maskinongé'], esturgeon: ['🐋', 'Esturgeon jaune'],
  tire: ['🍭', 'Tire d’érable'], sirop: ['🍯', 'Cruchon de sirop ambré'], coulee: ['🍁', 'Sirop de première coulée'],
  barquette: ['🫐', 'Barquette de bleuets'], confiture: ['🫙', 'Confiture de bleuets'], confiture_mamie: ['💜', 'Confiture de grand-mère'],
  monarque: ['🦋', 'Monarque'], amiral: ['🦋', 'Amiral'], lune: ['🦋', 'Papillon lune'],
  gros_dore: ['🐟', 'Gros doré'], saumon: ['🐟', 'Saumon atlantique'], bar: ['🐟', 'Bar rayé'],
  capsule: ['🧢', 'Capsule de liqueur'], bouton: ['🔘', 'Bouton de manteau'], cle: ['🗝️', 'Vieille clé'], pepite: ['✨', 'Pépite d’or'], trilobite: ['🐚', 'Trilobite fossile'],
  cocotte: ['🌰', 'Cocotte de pin'], coquillage: ['🐚', 'Coquillage'],
};
const SHOP_SKILL = 'qc_s1_ari_08'; // magasin : rabais en pourcentage + taxes
const dots = (n, max = MASTERY) => h('span', { class: 'dots', 'aria-label': `${Math.min(n, max)} sur ${max}` }, Array.from({ length: max }, (_, i) => h('i', { class: i < n ? 'on' : '' })));
// 3 étoiles sur l’île 1 ; une 4e (secondaire 2) une fois le traversier ouvert
const stars = (n, max = 3) => '★'.repeat(Math.max(0, n)) + '☆'.repeat(Math.max(0, max - n));
const face = id => h('div', { class: `face ${id}` }, EMOJI[id]);
// Figure SVG (générée par le jeu) et table de valeurs
function figureEl(svg) { const d = h('div', { class: 'figure' }); d.innerHTML = svg; return d; }
const tableEl = rows => h('table', { class: 'vtable' }, h('tbody', {}, rows.map(r => h('tr', {}, r.map((c, i) => h(i ? 'td' : 'th', {}, String(c)))))));
// Quand la table est dessinée, on retire sa version texte de l’énoncé
const promptText = ex => (ex.table ? ex.prompt.replace(/\s*x : .*$/, '') : ex.prompt);
const exBody = ex => [h('p', { class: 'q' }, promptText(ex)), ex.figure ? figureEl(ex.figure) : null, ex.table ? tableEl(ex.table) : null];

export function makeFlows(G) {
  const { ui, audio } = G;
  const S = () => G.state;
  const click = () => audio.sfx('click');
  let keyHandler = null; // clavier actif dans le panneau (exercice, total)
  const F = {
    cur: null, // exercice ou devis en cours (pour les tests)
    overlay: null, // fiche de théorie ouverte par-dessus une question (le chrono attend)
    piActive: () => !!(ui.isOpen && keyHandler && keyHandler.pi),
    handleKey(e) {
      if (!ui.isOpen) return false;
      if (ovl() && (e.code === 'Escape' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space')) { F.overlay.close(); return true; }
      if (ovl()) return true; // la question attend en dessous
      if (e.code === 'Escape') { ui.close(); return true; }
      if (keyHandler) return keyHandler(e);
      if (e.code === 'Enter' || e.code === 'Space') { const b = document.querySelector('#panel .primary'); if (b) { b.click(); return true; } }
      return false;
    },
  };
  // La fiche disparaît avec le panneau (fermeture ✕, fin du chrono…) : on ne garde jamais une référence orpheline
  const ovl = () => (F.overlay && !F.overlay.el.isConnected ? (F.overlay = null) : F.overlay);
  const dropOverlay = () => { if (F.overlay) { F.overlay.el.remove(); F.overlay = null; } };
  const open = (content, opts) => { dropOverlay(); keyHandler = null; F.cur = null; return ui.open(content, opts); };
  const swap = content => { dropOverlay(); keyHandler = null; F.cur = null; return ui.swap(content); };

  // ---------- Leçons d’Hortense : fiche de théorie (idée, règle, exemple résolu)
  const leconCard = id => {
    const sk = skillById(id), L = leconOf(id); if (!L) return h('p', {}, 'Pas encore de leçon pour celle-là.');
    return h('div', { class: 'lecon', 'data-skill': id },
      h('div', { class: 'who' }, face('hortense'), h('div', {}, h('b', {}, sk.nom), h('p', { class: 'pda' }, `MEQ · ${sk.pda.split(' — ')[0]}`))),
      h('section', { class: 'idee' }, h('h4', {}, '💡 L’idée'), L.idee.map(t => h('p', {}, t))),
      h('section', { class: 'regle' }, h('h4', {}, '📐 La règle'), h('p', {}, L.regle)),
      h('section', { class: 'exemple' }, h('h4', {}, '✏️ Un exemple, pas à pas'), h('p', { class: 'q' }, L.ex.q), h('ol', {}, L.ex.etapes.map(t => h('li', {}, t))), h('p', { class: 'rep' }, 'Réponse : ', h('b', {}, L.ex.rep))));
  };
  // Fiche seule (depuis la liste ou le carnet) ; back = où revenir
  F.lecon = (id, back) => {
    const row = h('div', { class: 'row' }, back ? h('button', { class: 'btn', onclick: () => { click(); back(); } }, '← Retour') : null,
      h('button', { class: 'btn primary', onclick: () => { click(); F.defi(id, isS2(id) ? 2 : 1); } }, '⭐ Pratiquer'));
    const fn = ui.isOpen ? swap : open; fn(h('div', { class: 'lecons' }, leconCard(id), row), { cls: 'lecons' }); F.cur = { kind: 'lecon', skill: id };
  };
  // Liste : à revoir d’abord (compétences faibles), puis toutes les compétences par domaine, onglets S1 / S2
  F.lecons = (sec = 1) => {
    const st = S(), body = h('div', { class: 'cbody' }), tabs = [1, 2].map(n => h('button', { class: 'btn tab', role: 'tab', 'data-tab': `s${n}`, onclick: () => { click(); show(n); } }, `Secondaire ${n}`));
    const item = id => h('button', { class: `btn lec${isMastered(st, id) ? ' m' : ''}`, 'data-lecon': id, onclick: () => { click(); F.lecon(id, () => F.lecons(F.leconsTab)); } }, `${isMastered(st, id) ? '✅ ' : ''}${skillById(id).nom}`);
    function show(n) {
      tabs.forEach(b => { const on = b.dataset.tab === `s${n}`; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
      const list = n === 2 ? SKILLS2 : SKILLS, weak = weakList(st, list.map(s => s.id), 3);
      body.replaceChildren(h('section', { class: 'pratiquer' }, h('h4', {}, '🎯 À revoir en premier'), weak.length ? h('div', { class: 'leclist' }, weak.map(item)) : h('p', { class: 'pre' }, 'Rien qui accroche pour l’instant. Choisis ce qui te pique la curiosité!')),
        ...DOMAINES.filter(dn => list.some(s => s.domaine === dn)).map(dn => h('section', {}, h('h4', {}, dn), h('div', { class: 'leclist' }, list.filter(s => s.domaine === dn).map(s => item(s.id))))));
      F.leconsTab = n;
    }
    open(h('div', { class: 'lecons' }, h('div', { class: 'who' }, face('hortense'), h('div', {}, h('b', {}, sec === 2 && st.island === 2 ? 'Les notes d’Hortense (apportées par Rosalie)' : 'La bibliothèque d’Hortense'), h('p', { class: 'line' }, 'Choisis une notion : une idée simple, la règle, pis un exemple fait au complet.'))),
      h('div', { class: 'tabs', role: 'tablist' }, tabs), body), { cls: 'lecons' });
    show(sec === 2 ? 2 : 1); F.cur = { kind: 'lecons' };
  };
  // Par-dessus une question : la question reste là, le chrono attend, « Retour à la question » referme
  F.theorie = id => {
    const sheet = document.querySelector('#panel .sheet'); if (!sheet || ovl()) return;
    const el = h('div', { class: 'lecon-over', role: 'dialog', 'aria-label': 'Théorie' }, h('button', { class: 'x', 'aria-label': 'Retour à la question', onclick: () => { click(); F.overlay?.close(); } }, '✕'), h('p', { class: 'paused' }, '⏸ La question t’attend : le temps est arrêté.'), leconCard(id), h('div', { class: 'row' }, h('button', { class: 'btn primary back-q', onclick: () => { click(); F.overlay?.close(); } }, '↩ Retour à la question')));
    const y = sheet.scrollTop; sheet.scrollTop = 0; sheet.append(el); sheet.classList.add('has-over');
    F.overlay = { el, skill: id, close() { el.remove(); sheet.classList.remove('has-over'); sheet.scrollTop = y; F.overlay = null; } };
  };
  const theoBtn = id => leconOf(id) ? h('button', { class: 'btn theo', title: 'La théorie d’Hortense', onclick: () => { click(); F.theorie(id); } }, '📖 Théorie') : null;

  // ---------- Dialogue avec un villageois
  F.talk = (v) => {
    const st = S(); st.met[v.id] = (st.met[v.id] || 0) + 1; v.talkTo(); if (G.sons && audio.sons) G.sons.talk(v); else audio.sfx('talk');
    const line = v.nextLine(st.met[v.id] - 1);
    const opts = [];
    if (v.id === 'gaston') opts.push(['🔨 Voir l’établi', () => F.workbench()]);
    if (v.id === 'ginette') { opts.push(['🛒 Acheter', () => F.shop()]); opts.push([st.animaux?.quete ? '🐾 Ma quête d’animaux' : '🐾 Quêtes des animaux', () => F.quetes()]); opts.push([`💰 Vendre le sac (${st.bag.length})`, () => F.sell()]); }
    if (v.id === 'flocon') { opts.push(['⭐ Un défi!', () => F.defi()]); opts.push(['📒 Mon carnet', () => F.carnet()]); }
    if (v.id === 'hortense') opts.push(['📖 Une leçon', () => F.lecons(1)]);
    if (v.id === 'rosalie') { opts.push(['🔧 Mon atelier (niveau 4)', () => F.workbench(2)]); opts.push([st.phare.done ? '🗼 Voir le phare' : '🗼 Réparer le phare', () => F.phare()]); opts.push(['⭐ Défi de secondaire 2', () => F.defi(undefined, 2)]); opts.push(['📖 Les notes d’Hortense', () => F.lecons(2)]); }
    if (v.id === 'bernard') { opts.push(['🎲 Piger au kiosque', () => F.kiosk()]); opts.push([`🪱 Mes appâts rares : ${st.appats}`, () => F.kiosk()]); }
    opts.push(['👋 À plus tard!', () => ui.close()]);
    open(h('div', { class: 'dialog' },
      h('div', { class: 'who' }, face(v.id), h('div', {}, h('b', {}, NOMS[v.id]), h('p', { class: 'line' }, line))),
      h('div', { class: 'choices' }, opts.map(([t, f], i) => h('button', { class: `btn ${i === 0 ? 'primary' : ''}`, onclick: () => { click(); f(); } }, t)))), { cls: 'talk' });
  };

  // ---------- Établi de Gaston
  // isle = 1 : établi de Gaston (niveaux 1 à 3) ; isle = 2 : atelier de Rosalie (niveau 4, secondaire 2)
  F.workbench = (isle = 1) => {
    const st = S(), max = canFerry(st) ? 4 : 3;
    const cards = TOOLS.map(t => {
      const lvl = st.tools[t.id] || 0, up = nextUpgrade(st, t.id);
      let body;
      if (!up) body = h('p', { class: 'max' }, 'Niveau maximum! Beau travail.');
      else if (isle === 1 && up.island2) body = [h('p', { class: 'next' }, 'Niveau 4 : ', h('b', {}, skillById(up.skill).nom)), h('p', { class: 'max isle2' }, canFerry(st) ? '⛴️ Ça se passe à l’atelier de Rosalie, sur l’île de secondaire 2!' : '⛴️ Niveau 4 sur l’île de secondaire 2 (traversier : tous les outils au niveau 2).')];
      else if (isle === 2 && !up.island2) body = h('p', { class: 'locked' }, `🔒 Monte d’abord ton outil au niveau 3 chez Gaston (niveau ${lvl} pour l’instant).`);
      else {
        const sk = skillById(up.skill);
        body = [h('p', { class: 'next' }, `Niveau ${up.level} : `, h('b', {}, sk.nom)), h('p', { class: 'benefit' }, `➜ ${up.benefit}`),
          up.unlocked ? h('div', { class: 'row' }, dots(up.progress), h('button', { class: 'btn primary', 'data-tool': t.id, onclick: () => { click(); F.exercise({ kind: 'upgrade', tool: t.id, skill: up.skill }); } }, 'Améliorer'))
            : h('div', { class: 'locked' }, '🔒 D’abord maîtriser : ', up.missing.map(id => skillById(id).nom).join(', '), h('button', { class: 'btn small', onclick: () => { click(); F.defi(up.missing[0], isS2(up.missing[0]) ? 2 : 1); } }, isS2(up.missing[0]) ? 'Défi de Rosalie' : 'Défi de Flocon'))];
      }
      return h('div', { class: `tool ${!up ? 'done' : up.unlocked ? '' : 'lock'}` }, h('div', { class: 'ticon' }, t.icone), h('div', { class: 'tbody' }, h('div', { class: 'thead' }, h('b', {}, t.nom), h('span', { class: 'stars' }, stars(lvl, max))), body));
    });
    const who = isle === 2 ? face('rosalie') : face('gaston');
    const title = isle === 2 ? 'L’atelier de Rosalie' : 'L’établi de Gaston';
    const line = isle === 2 ? 'Niveau 4 : 3 bonnes réponses dans une compétence de secondaire 2. Ici, on travaille fin!' : 'Chaque amélioration : 3 bonnes réponses dans une compétence. Pas de presse!';
    open(h('div', {}, h('div', { class: 'who' }, who, h('div', {}, h('b', {}, title), h('p', { class: 'line' }, line))), h('div', { class: 'tools' }, cards)), { cls: 'bench' });
  };

  // ---------- Champs de réponse + pavé
  function answerBox(ex, onSubmit) {
    const A = ex.answer;
    if (A.kind === 'choice') {
      let sel = -1; const btns = A.choices.map((c, i) => h('button', { class: 'btn choice', 'data-i': i, onclick: () => { click(); sel = i; btns.forEach((b, k) => b.classList.toggle('sel', k === i)); } }, c));
      const box = h('div', { class: 'answer' }, h('div', { class: 'choices grid' }, btns), h('button', { class: 'btn primary validate', onclick: () => onSubmit(sel) }, 'Valider'));
      keyHandler = e => { const n = parseInt(e.key, 10); if (n >= 1 && n <= btns.length) { btns[n - 1].click(); return true; } if (e.code === 'Enter' || e.code === 'NumpadEnter') { onSubmit(sel); return true; } return false; };
      return { el: box, clear() { sel = -1; btns.forEach(b => b.classList.remove('sel')); } };
    }
    const vals = A.fields.map(() => ''); let active = 0; const pi = A.fields.some(f => f.pi);
    const inputs = A.fields.map((f, i) => h('button', { class: 'field', 'data-f': i, onclick: () => { active = i; paint(); } }));
    function paint() { inputs.forEach((b, i) => { b.textContent = vals[i] || ' '; b.classList.toggle('active', i === active); }); }
    function key(k) {
      if (k === '✓') return onSubmit(vals.slice());
      if (k === '⌫') vals[active] = vals[active].slice(0, -1);
      else if (k === 'C') vals[active] = '';
      else if (k === '−') vals[active] = vals[active].startsWith('−') ? vals[active].slice(1) : '−' + vals[active];
      else if (vals[active].length < 12) vals[active] += k;
      paint();
    }
    keyHandler = e => {
      if (/^[0-9]$/.test(e.key)) key(e.key); else if (e.key === ',' || e.key === '.') key(','); else if (e.key === '/') key('/'); else if (e.key === '-') key('−');
      else if (pi && (e.key === 'π' || e.key === 'p' || e.key === 'P')) key('π');
      else if (e.code === 'Backspace') key('⌫'); else if (e.code === 'Delete') key('C'); else if (e.code === 'Enter' || e.code === 'NumpadEnter') key('✓');
      else if (e.code === 'Tab') { active = (active + (e.shiftKey ? inputs.length - 1 : 1)) % inputs.length; paint(); } else return false;
      return true;
    };
    keyHandler.pi = pi; // « p » tape π au lieu de mettre en pause
    paint();
    const box = h('div', { class: 'answer' }, h('div', { class: 'fields' }, A.fields.map((f, i) => h('label', { class: 'fl' }, f.label ? h('span', {}, f.label) : null, inputs[i], f.unit ? h('span', { class: 'unit' }, f.unit) : null))), ui.numpad(k => { click(); key(k); }, { pi }));
    return { el: box, pi, clear() { vals.fill(''); active = 0; paint(); }, get values() { return vals; } };
  }

  // ---------- Séance d’exercices
  // s = { kind:'upgrade'|'defi'|'warmup', skill, tool?, d?, goal?, done, back? }
  F.exercise = (s) => {
    s.done = s.done || 0; s.goal = s.goal || (s.kind === 'warmup' ? 1 : MASTERY);
    const st = S(); st.exCount = (st.exCount || 0) + 1;
    const d = s.d ?? difficultyFor(st, s.skill);
    // Exercice déjà construit (étapes du phare, pige du kiosque) ou fabriqué à partir de la compétence
    const ex = s.ex || makeExercise(s.skill, `${st.seed}:${st.exCount}`, d);
    const sk = skillById(s.skill); let misses = 0, hintN = 0, locked = false; const t0 = performance.now();
    const sec = () => (performance.now() - t0) / 1000;
    const hintsEl = h('div', { class: 'hints' }), fb = h('div', { class: 'feedback', role: 'status' });
    const hintBtn = h('button', { class: 'btn hint', onclick: () => { click(); showHint(); } }, '💡 Indice');
    const showBtn = h('button', { class: 'btn small hidden', onclick: () => { click(); reveal(); } }, 'Montre-moi la réponse');
    function showHint() { if (hintN >= ex.hints.length) return; hintsEl.append(h('p', { class: 'hintline' }, h('b', {}, `Indice ${hintN + 1} : `), ex.hints[hintN])); hintN++; hintBtn.textContent = hintN >= ex.hints.length ? '💡 Plus d’indices' : `💡 Indice ${hintN + 1}`; hintBtn.disabled = hintN >= ex.hints.length; }
    function progress() {
      if (s.kind === 'upgrade') return h('div', { class: 'prog' }, `${toolById(s.tool).icone} ${toolById(s.tool).nom} → niv. ${(st.tools[s.tool] || 0) + 1}`, dots(st.upg[s.tool] || 0));
      if (s.kind === 'defi') return h('div', { class: 'prog' }, s.sec === 2 ? '⭐ Défi de Rosalie · secondaire 2' : '⭐ Défi de Flocon', dots(s.done));
      if (s.kind === 'phare') return h('div', { class: 'prog phare' }, `🗼 Phare de Rosalie · étape ${ex.step + 1} sur 3`, dots(st.phare.step, 3));
      if (s.kind === 'kiosk') return h('div', { class: 'prog kiosk' }, '🎲 Kiosque de Bernard · une pige par jour');
      return h('div', { class: 'prog warm' }, '🔥 Réchauffement avec Flocon');
    }
    const next = h('button', { class: 'btn primary hidden', onclick: () => { click(); after(); } }, 'Continuer');
    let afterFn = null; const after = () => afterFn && afterFn();
    function done(fn, label = 'Continuer') { locked = true; afterFn = fn; next.textContent = label; next.classList.remove('hidden'); box.el.classList.add('hidden'); keyHandler = e => { if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') { after(); return true; } return false; }; }
    function reveal() {
      fb.className = 'feedback info'; fb.replaceChildren('La réponse était : ', h('b', {}, canonical(ex.answer)), '. On en essaie un autre, sans pénalité.'); showBtn.classList.add('hidden');
      if (s.kind === 'phare') { st.phare.redo = (st.phare.redo || 0) + 1; G.save(); return done(() => F.phareStep(), 'Nouveau plan'); }
      done(() => F.exercise({ ...s, ex: null }), 'Nouvel exercice');
    }
    function submit(v) {
      if (locked) return;
      const r = checkAnswer(v, ex.answer);
      if (r.empty || (ex.answer.kind === 'choice' && v < 0)) { fb.className = 'feedback info'; fb.textContent = ex.answer.kind === 'choice' ? 'Choisis une réponse.' : r.msg || 'Écris une réponse.'; return; }
      if (r.ok) {
        audio.sfx('ok'); const out = recordAnswer(st, s.skill, true, { tool: s.kind === 'upgrade' ? s.tool : null, sec: sec() }); s.done++; G.save();
        fb.className = 'feedback ok'; fb.replaceChildren(h('b', {}, ['Bravo!', 'Excellent!', 'Tiguidou!', 'Bien joué!'][st.exCount % 4]), ' ', canonical(ex.answer));
        if (s.kind === 'phare') return F.phareOk(ex, fb, done);
        if (s.kind === 'kiosk') { const n = kioskDone(st, true); G.save(); fb.append(h('p', { class: 'benefit' }, `🪱 Bernard te donne un appât rare! (${n} en réserve) Ta prochaine touche au quai de l’île 2 sera un poisson rare.`)); return done(() => ui.close(), 'Merci Bernard!'); }
        if (s.kind === 'defi') { st.money += 100; st.journal.coins += 100; fb.append(h('span', { class: 'gain' }, ' +1,00 $')); }
        if (out.mastered) ui.toast(`📒 Compétence maîtrisée : ${sk.nom}!`, 'gold');
        if (out.upgraded) return done(() => F.celebrate(out.upgraded), 'Voir mon outil!');
        if (s.kind === 'warmup') return done(() => s.back ? F.exercise(s.back) : ui.close(), s.back ? 'On y retourne!' : 'Terminer');
        if (s.kind === 'defi' && s.done >= s.goal) return done(() => F.defiEnd(s), 'Terminer');
        return done(() => F.exercise({ ...s, ex: null }), 'Suivant');
      }
      misses++;
      if (r.near) { audio.sfx('near'); recordAnswer(st, s.skill, false, { near: true }); fb.className = 'feedback near'; fb.textContent = r.msg; return; }
      audio.sfx('miss'); const out = recordAnswer(st, s.skill, false, { sec: sec() }); G.save();
      if (s.kind === 'kiosk') { kioskDone(st, false); G.save(); fb.className = 'feedback no'; fb.replaceChildren('Pas cette fois! La réponse était : ', h('b', {}, canonical(ex.answer)), '. Reviens demain pour une autre pige.'); return done(() => ui.close(), 'À demain!'); }
      fb.className = 'feedback no'; fb.textContent = r.msg || ['Pas tout à fait. Essaie encore!', 'Presque… un indice peut aider.', 'On respire, pis on recommence.'][Math.min(misses - 1, 2)];
      hintBtn.classList.add('pulse'); if (misses >= 2 && hintN === 0) showHint();
      if (misses === 2 && theo && !hintsEl.querySelector('.hortense')) { theo.classList.add('pulse'); hintsEl.append(h('p', { class: 'hintline hortense' }, '🐢 ', h('b', {}, 'Hortense : '), '« Ça accroche? Va voir la théorie, je t’ai préparé un exemple tout fait. » ', h('button', { class: 'btn small', onclick: () => { click(); F.theorie(s.skill); } }, '📖 Théorie'))); }
      if (misses >= 3) showBtn.classList.remove('hidden');
      if (out.warmup && s.kind !== 'warmup') offerWarmup(out.warmup);
      box.clear();
    }
    function offerWarmup(w) {
      const wsk = skillById(w.skill);
      const why = w.skill === s.skill ? 'une version plus simple' : w.why === 'préalable de secondaire 1' ? `« ${wsk.nom} » (secondaire 1)` : `« ${wsk.nom} »`;
      const who = isS2(s.skill) ? 'rosalie' : 'flocon', hi = who === 'rosalie' ? 'Pas de stress!' : 'Hou hou!';
      const card = h('div', { class: 'warmup' }, face(who), h('div', {}, h('p', {}, `${hi} Ça accroche un peu? Faisons un petit réchauffement sur ${why}, ça va aider.`),
        h('div', { class: 'row' }, h('button', { class: 'btn primary warm-yes', onclick: () => { click(); F.exercise({ kind: 'warmup', skill: w.skill, d: 0, back: { ...s, done: s.done } }); } }, 'Oui!'), h('button', { class: 'btn', onclick: () => { click(); card.remove(); } }, 'Non merci, je réessaie'))));
      fb.after(card);
    }
    const head = h('div', { class: 'exhead' }, progress(), h('h3', {}, sk.nom), h('span', { class: 'ref', title: 'Progression des apprentissages (MEQ)' }, `MEQ · ${sk.pda.split(' — ')[0]}`), h('span', { class: 'ref id' }, shortId(sk.id)));
    const theo = theoBtn(s.skill);
    const content = h('div', { class: `exercise ${s.kind}` }, head, ...exBody(ex), fb, hintsEl, h('div', { class: 'row tools' }, hintBtn, theo, s.kind === 'kiosk' ? null : showBtn), next);
    const sheetFn = ui.isOpen ? swap : open; sheetFn(content, { cls: 'ex' });
    const box = answerBox(ex, submit); next.before(box.el);
    F.cur = { kind: 'exercise', ex, answer: () => canonical(ex.answer), session: s };
  };

  F.celebrate = ({ tool, level }) => {
    const t = toolById(tool); audio.sfx('up'); G.onUpgrade && G.onUpgrade(tool, level);
    swap(h('div', { class: 'celebrate' }, h('div', { class: 'big' }, t.icone), h('h3', {}, `${t.nom} — niveau ${level}!`), h('p', {}, stars(level, Math.max(3, level))), h('p', { class: 'benefit' }, `➜ ${({ canne: 'Pêche', arrosoir: 'Arrosage', filet: 'Chasse aux papillons', pelle: 'Fouilles', sac: 'Sac' })[tool]} : ${describe(tool, level)}`),
      h('p', { class: 'line' }, level >= 4 ? '« Niveau 4! Même mon phare est jaloux. » — Rosalie' : '« Tiguidou! Ça, c’est de l’ouvrage bien faite. » — Gaston'), h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => { click(); F.workbench(level >= 4 ? 2 : 1); } }, level >= 4 ? 'Retour à l’atelier' : 'Retour à l’établi'), h('button', { class: 'btn', onclick: () => ui.close() }, 'Fermer'))));
  };
  // Une fonction par outil : seules les stats de l’outil demandé sont lues.
  const DESCRIBE = {
    canne: x => `touche en ${x.wait[0]}–${x.wait[1]} s, ${x.window.toFixed(1).replace('.', ',')} s pour ferrer, ${Math.round((0.25 + x.rare * 0.7) * 100)} % de touches rares`,
    arrosoir: x => `${x.beds} plate(s)-bande(s), ${fmtMoney(x.coins)} chacune`,
    filet: x => `portée ${String(x.reach).replace('.', ',')} m, ${Math.round(x.chance * 100)} % de réussite`,
    pelle: x => `chance ${x.luck}/4`,
    sac: x => `${x.cap} places`,
  };
  const describe = (tool, l) => DESCRIBE[tool](stats(tool, l));

  // ---------- Défis de Flocon
  F.defi = (focus, sec = 1) => {
    const st = S(); const list = defiChoices(st, sec); const pick = focus && isUnlocked(st, focus) ? [focus, ...list.filter(x => x !== focus)] : list;
    const rows = pick.slice(0, 5).map(id => { const sk = skillById(id); return h('button', { class: 'btn skill', 'data-skill': id, onclick: () => { click(); F.exercise({ kind: 'defi', skill: id, goal: 3, sec }); } }, h('span', {}, sk.nom), dots(st.mastery[id]?.ok || 0)); });
    const who = sec === 2 ? 'rosalie' : 'flocon';
    open(h('div', {}, h('div', { class: 'who' }, face(who), h('div', {}, h('b', {}, sec === 2 ? 'Défi de Rosalie · secondaire 2' : 'Défi de Flocon'), h('p', { class: 'line' }, '3 questions, 1,00 $ par bonne réponse. Choisis ta notion!'))), h('div', { class: 'skills' }, rows.length ? rows : h('p', { class: 'pre' }, 'Aucune notion débloquée pour l’instant.'))), { cls: 'defi' });
  };
  F.defiEnd = s => swap(h('div', { class: 'celebrate' }, h('div', { class: 'big' }, s.sec === 2 ? '🦦' : '🦉'), h('h3', {}, 'Défi réussi!'), h('p', {}, `${skillById(s.skill).nom} : `, dots(S().mastery[s.skill]?.ok || 0)), h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => F.defi(undefined, s.sec || 1) }, 'Un autre!'), h('button', { class: 'btn', onclick: () => ui.close() }, 'Fermer'))));

  // ---------- Magasin général
  F.shop = () => {
    const st = S();
    const owned = it => it.kind === 'bridge' ? st.bridges[it.zone] : st.decor.includes(it.id);
    const rows = CATALOG.map(it => h('div', { class: `item ${owned(it) ? 'owned' : ''}` }, h('div', {}, h('b', {}, it.nom), h('p', {}, it.desc)), h('span', { class: 'price' }, fmtMoney(it.prixCents)),
      owned(it) ? h('span', { class: 'ok' }, '✓') : h('button', { class: 'btn primary small', 'data-item': it.id, onclick: () => { click(); F.checkout(it); } }, 'Acheter')));
    open(h('div', {}, h('div', { class: 'who' }, face('ginette'), h('div', {}, h('b', {}, 'Magasin général'), h('p', { class: 'line' }, `Tu as ${fmtMoney(st.money)}. Les prix sont avant taxes, comme partout au Québec!`))), h('div', { class: 'items' }, rows),
      h('button', { class: 'btn', onclick: () => { click(); F.sell(); } }, `💰 Vendre le sac (${st.bag.length})`)), { cls: 'shop' });
  };
  F.checkout = (it) => {
    const st = S(); const q = quoteFor(st, it); G.save();
    let misses = 0, hintN = 0, locked = false;
    const fb = h('div', { class: 'feedback', role: 'status' }), hintsEl = h('div', { class: 'hints' });
    const hintBtn = h('button', { class: 'btn hint', onclick: () => { click(); if (hintN < 3) { hintsEl.append(h('p', { class: 'hintline' }, h('b', {}, `Indice ${hintN + 1} : `), q.hints[hintN])); hintN++; } hintBtn.disabled = hintN >= 3; } }, '💡 Indice');
    const ticket = h('div', { class: 'ticket' }, h('div', { class: 'tl' }, h('span', {}, it.nom), h('span', {}, fmtMoney(q.prixCents))),
      q.rabais ? h('div', { class: 'tl rabais' }, h('span', {}, `🏷️ Rabais de ${q.rabais} %`), h('span', {}, 'aujourd’hui!')) : h('div', { class: 'tl' }, h('span', {}, 'Rabais'), h('span', {}, 'aucun')),
      h('div', { class: 'tl' }, h('span', {}, 'TPS'), h('span', {}, '5 %')), h('div', { class: 'tl' }, h('span', {}, 'TVQ'), h('span', {}, '9,975 %')), h('div', { class: 'tl total' }, h('span', {}, 'Total à payer'), h('span', {}, '?')));
    const back = h('button', { class: 'btn small', onclick: () => { click(); F.shop(); } }, '← Catalogue');
    let box;
    const submit = v => {
      if (locked) return; const r = checkTotal(v[0], q);
      logAnswer(st, SHOP_SKILL, !!r.ok); // statistiques seulement : la maîtrise se gagne avec les outils et les défis
      if (r.ok) {
        locked = true; audio.sfx('ok'); ticket.lastChild.lastChild.textContent = fmtMoney(q.totalCents);
        if (st.money < q.totalCents) { fb.className = 'feedback info'; fb.textContent = `Bon calcul! Mais il te manque ${fmtMoney(q.totalCents - st.money)}. Reviens quand tu auras assez d’argent.`; }
        else { st.money -= q.totalCents; forgetQuote(st, it); if (it.kind === 'bridge') { st.bridges[it.zone] = true; G.world.openBridge(it.zone); } else { st.decor.push(it.id); G.world.placeDecor(it.id); } G.save(); audio.sfx('coin');
          fb.className = 'feedback ok'; fb.replaceChildren(h('b', {}, 'Exact! '), `${fmtMoney(q.totalCents)}. Merci beaucoup! `, it.kind === 'bridge' ? 'Le pont est installé!' : 'Je l’ai installé sur l’île.'); ui.toast(`🛍️ ${it.nom} acheté!`, 'gold'); }
        box.el.classList.add('hidden'); keyHandler = e => { if (e.code === 'Enter') { F.shop(); return true; } return false; };
        fb.after(h('button', { class: 'btn primary', onclick: () => { click(); F.shop(); } }, 'Retour au magasin')); return;
      }
      misses++; audio.sfx('miss'); fb.className = 'feedback no'; fb.textContent = r.msg; box.clear();
      if (misses >= 2 && hintN === 0) hintBtn.click();
      if (misses >= 3 && !fb.nextSibling?.classList?.contains('detail')) fb.after(h('div', { class: 'detail' }, `Détail : prix ${q.rabais ? 'après rabais ' : ''}${fmtMoney(q.baseCents)} + TPS ${fmtMoney(q.tpsCents)} + TVQ ${fmtMoney(q.tvqCents)}. À toi d’additionner!`));
    };
    const fakeEx = { answer: { kind: 'num', fields: [{ label: 'Total ($)' }] } };
    const content = h('div', { class: 'checkout' }, h('div', { class: 'who' }, face('ginette'), h('div', {}, h('b', {}, it.nom), h('p', { class: 'line' }, 'Calcule le total à payer, taxes incluses. Arrondis au cent près.'))), ticket, fb, hintsEl, h('div', { class: 'row tools' }, hintBtn, back));
    open(content, { cls: 'ex' }); box = answerBox(fakeEx, submit); content.append(box.el);
    F.cur = { kind: 'checkout', q, answer: () => (q.totalCents / 100).toFixed(2).replace('.', ',') };
  };
  F.sell = () => {
    const st = S(); if (!st.bag.length) { open(h('div', { class: 'dialog' }, h('div', { class: 'who' }, face('ginette'), h('div', {}, h('b', {}, 'Ginette'), h('p', { class: 'line' }, 'Ton sac est vide! Va pêcher, creuser ou attraper des papillons.'))), h('button', { class: 'btn primary', onclick: () => ui.close() }, 'D’accord'))); return; }
    const counts = {}; for (const k of st.bag) counts[k] = (counts[k] || 0) + 1;
    const total = st.bag.reduce((a, k) => a + (SELL[k] || 0), 0);
    open(h('div', {}, h('div', { class: 'who' }, face('ginette'), h('div', {}, h('b', {}, 'Je rachète tout ça'), h('p', { class: 'line' }, 'Les papillons, je les relâche dans mon jardin. Promis!'))),
      h('div', { class: 'items' }, Object.entries(counts).map(([k, n]) => h('div', { class: 'item' }, h('span', {}, `${ITEMS[k][0]} ${ITEMS[k][1]} × ${n}`), h('span', { class: 'price' }, fmtMoney(SELL[k] * n))))),
      h('button', { class: 'btn primary', onclick: () => { st.money += total; st.journal.coins += total; st.bag = []; G.save(); audio.sfx('coin'); ui.toast(`💰 +${fmtMoney(total)}`, 'gold'); ui.close(); } }, `Vendre pour ${fmtMoney(total)}`)), { cls: 'shop' });
  };

  // ---------- Question pendant une action (étape 2) : touche rare, coup de sirop
  // q = { kind:'fish'|'maple', skill, d, stretch, onEnd?(result) } ; result = 'win'|'miss'|'timeout'|'skip'
  const ACTION = {
    fish: { icon: '🎣', titre: 'Ça mord fort!', line: 'Un poisson rare tire sur ta ligne! Réponds avant qu’il se fatigue… ou laisse-le filer, pas de souci.',
      win: k => `Tu as sorti un ${ITEMS[k][1].toLowerCase()}! Il est noté dans ton carnet.`, lose: { miss: 'Il a donné un bon coup de queue pis il est reparti. Ce sera pour la prochaine!', timeout: 'Il s’est faufilé entre les quenouilles. Pas grave, le lac en est plein!', skip: 'Tu l’as laissé filer. Il te fait un clin d’œil en partant.' } },
    maple: { icon: '🍁', titre: 'Coup de sirop!', line: 'L’érable coule! Une petite question de fractions pour remplir ton seau. Tu peux aussi laisser filer.',
      win: k => `${ITEMS[k][1]} pour toi! C’est noté dans ton carnet.`, lose: { miss: 'La sève s’est arrêtée de couler. L’érable va se reprendre, promis!', timeout: 'Le seau a débordé dans la neige. Les écureuils sont ben contents!', skip: 'Tu laisses l’érable tranquille pour l’instant.' } },
    sap: { icon: '🪣', titre: 'La sève coule!', line: 'Lionel te passe une chaudière pleine! Une petite question de proportions ou de volumes. Tu peux aussi laisser filer.',
      win: k => `${ITEMS[k][1]} pour toi! C’est noté dans ton carnet.`, lose: { miss: 'La sève s’est arrêtée de couler. Lionel va reposer la chaudière, promis!', timeout: 'La chaudière a débordé un peu. Lionel sourit : « Une autre coulée va venir! »', skip: 'Tu laisses la chaudière tranquille pour l’instant.' } },
    berry: { icon: '🫐', titre: 'Cueillette!', line: 'Lise te tend un panier! Une petite question de dénombrement ou de moyenne. Tu peux aussi laisser filer.',
      win: k => `${ITEMS[k][1]} pour toi! C’est noté dans ton carnet.`, lose: { miss: 'Les bleuets restent sur le plant. Lise te dit : « Une autre fois, ma belle! »', timeout: 'Le panier s’est un peu renversé. Les merles sont ben contents!', skip: 'Tu laisses les plants tranquilles pour l’instant.' } },
  };
  ACTION.fish2 = { ...ACTION.fish, line: 'Un gros poisson de l’île 2 tire sur ta ligne! Une question de secondaire 2 pour le sortir… ou laisse-le filer.',
    lose: { ...ACTION.fish.lose, timeout: 'Il a remonté la rivière, par-dessus la petite chute. Pas grave!' } };
  ACTION.maple2 = { ...ACTION.maple, titre: 'L’érable rouge coule!', line: 'Une question de secondaire 2 pour remplir ton seau. Tu peux aussi laisser filer.' };
  F.ACTION = ACTION;
  F.actionQ = (q) => {
    const st = S(), isle = st.island === 2 ? 2 : 1, cfg = ACTION[q.kind + (isle === 2 ? '2' : '')] || ACTION[q.kind]; st.exCount = (st.exCount || 0) + 1;
    const ex = makeExercise(q.skill, `${st.seed}:${st.exCount}:${q.kind}`, q.d);
    const sk = skillById(q.skill), timer = makeTimer(timeFor(ex, q));
    let settled = false, hintN = 0;
    const hintsEl = h('div', { class: 'hints' }), fb = h('div', { class: 'feedback', role: 'status' });
    const hintBtn = h('button', { class: 'btn hint', onclick: () => { click(); if (hintN >= ex.hints.length) return; hintsEl.append(h('p', { class: 'hintline' }, h('b', {}, `Indice ${hintN + 1} : `), ex.hints[hintN])); hintN++; hintBtn.disabled = hintN >= ex.hints.length; } }, '💡 Indice');
    const skipBtn = h('button', { class: 'btn skip', onclick: () => { click(); end('skip'); } }, 'Laisser filer');
    const pauseBtn = h('button', { class: 'btn small pausebtn', 'aria-label': 'Pause', title: 'Pause (P)', onclick: () => { click(); G.pause(true); } }, '⏸');
    const bar = h('i'), secs = h('span', { class: 'secs' });
    const paint = () => { bar.style.width = `${(timer.left / timer.total) * 100}%`; bar.classList.toggle('low', timer.left < 6); secs.textContent = `${Math.ceil(timer.left)} s`; };
    function end(result, closed = false) {
      if (settled) return; settled = true; timer.stop(); keyHandler = null;
      if (result === 'timeout' && !q.stretch) logAnswer(st, q.skill, false);
      if (closed) { audio.sfx('click'); ui.toast(`${q.kind === 'fish' ? '💨' : '🍂'} ${cfg.lose.skip}`); F.cur = null; q.onEnd && q.onEnd('skip'); return; }
      let body;
      if (result === 'win') {
        const key = loot(q.kind, q.d, isle), got = G.grant(key);
        st.rares[key] = (st.rares[key] || 0) + 1; const jkey = q.kind === 'fish' ? 'rare' : q.kind === 'berry' ? 'bleuets' : 'sirop'; st.journal[jkey] = (st.journal[jkey] || 0) + 1; if (q.kind === 'fish') st.journal.fish++;
        audio.sfx('up');
        body = h('div', { class: 'celebrate actionwin' }, h('div', { class: 'big' }, ITEMS[key][0]), h('h3', {}, cfg.win(key)),
          h('p', { class: 'benefit' }, got.coins ? `Ton sac est plein : Ginette te l’achète tout de suite, ${fmtMoney(got.coins)}.` : `Dans ton sac · vaut ${fmtMoney(SELL[key])} chez Ginette`),
          h('p', { class: 'lvl' }, `Niveau ${NIVEAUX[q.d]}${q.stretch ? ' · ⭐ défi surprise réussi!' : ''}`));
      } else {
        audio.sfx(result === 'skip' ? 'click' : 'near');
        body = h('div', { class: 'celebrate actionlose' }, h('div', { class: 'big' }, q.kind === 'fish' ? '💨' : '🍂'), h('h3', {}, cfg.lose[result]),
          result !== 'skip' ? h('p', { class: 'feedback info' }, 'La réponse était : ', h('b', {}, canonical(ex.answer)), '.') : null,
          result !== 'skip' && /00$/.test(st.stats?.[q.skill]?.h || '') && leconOf(q.skill) ? h('p', { class: 'hintline hortense' }, '🐢 ', h('b', {}, 'Hortense : '), '« Deux fois de suite que ça accroche ici. Une petite leçon? » ', h('button', { class: 'btn small', onclick: () => { click(); F.lecon(q.skill); } }, '📖 Voir la leçon')) : null);
      }
      G.save();
      const ok = h('button', { class: 'btn primary', onclick: () => { click(); ui.close(); } }, 'Continuer');
      body.append(h('div', { class: 'row' }, ok));
      swap(h('div', { class: 'action' }, body));
      F.cur = { kind: 'actionEnd', result };
      q.onEnd && q.onEnd(result);
    }
    function submit(v) {
      if (settled) return;
      const r = checkAnswer(v, ex.answer);
      if (r.empty || (ex.answer.kind === 'choice' && v < 0)) { fb.className = 'feedback info'; fb.textContent = ex.answer.kind === 'choice' ? 'Choisis une réponse.' : r.msg || 'Écris une réponse.'; return; }
      if (r.near) { audio.sfx('near'); fb.className = 'feedback near'; fb.textContent = r.msg; return; } // presque : un indice, pas d’échec
      if (!q.stretch) { const out = recordAnswer(st, q.skill, !!r.ok, { sec: timer.total - timer.left }); if (out.mastered) ui.toast(`📒 Compétence maîtrisée : ${sk.nom}!`, 'gold'); }
      end(r.ok ? 'win' : 'miss');
    }
    const content = h('div', { class: `exercise action ${q.kind}` },
      h('div', { class: 'who' }, h('div', { class: 'face' }, cfg.icon), h('div', {}, h('b', {}, cfg.titre), h('p', { class: 'line' }, cfg.line))),
      h('div', { class: 'timer' }, h('div', { class: 'tbar', role: 'progressbar', 'aria-label': 'Temps restant' }, bar), secs, pauseBtn),
      h('div', { class: 'exhead' }, h('span', { class: `ref lvl d${q.d}` }, `Niveau ${NIVEAUX[q.d]}`), q.stretch ? h('span', { class: 'ref stretch' }, '⭐ Défi surprise') : null, h('span', { class: 'ref' }, sk.nom)),
      ...exBody(ex), fb, hintsEl);
    open(content, { cls: 'ex', close: () => end('skip', true) });
    const box = answerBox(ex, submit); content.append(box.el, h('div', { class: 'row tools' }, hintBtn, theoBtn(q.skill), skipBtn));
    paint();
    F.cur = { kind: 'action', q, ex, timer, answer: () => canonical(ex.answer), tick(dt) { if (!settled && timer.tick(dt)) end('timeout'); paint(); } };
  };
  // Appelé par la boucle de jeu seulement quand le jeu n’est pas en pause
  F.tick = dt => { if (F.cur?.kind === 'action' && !ovl()) F.cur.tick(dt); }; // fiche de théorie ouverte : le chrono attend

  // ---------- Carnet
  // ---------- Quêtes des animaux (chez Ginette) : 3 par jour, dans un ordre qui tourne
  F.quetes = () => {
    const st = S(), C = G.animaux, list = C.jour();
    const row = q => h('div', { class: 'qrow', 'data-q': q.id }, h('div', {}, h('b', {}, `${q.emoji} ${q.nom}`), h('p', {}, q.etat === 'active' ? q.indice : q.etat === 'faite' ? 'Faite aujourd’hui! Reviens demain.' : `${q.intro} Récompense : ${fmtMoney(q.cents)}${st.animaux.colliers.includes(q.collier) ? '' : ' + un collier pour Charlie'}.`)),
      q.etat === 'libre' && !st.animaux.quete ? h('button', { class: 'btn small primary', onclick: () => { click(); if (C.start(q.id)) ui.close(); } }, 'J’y vais!')
        : q.etat === 'active' ? h('button', { class: 'btn small', onclick: () => { click(); C.abandon(); F.quetes(); } }, 'Laisser tomber') : h('span', { class: 'lv m' }, q.etat === 'faite' ? '✅' : '⏳'));
    open(h('div', { class: 'animaux' }, h('div', { class: 'who' }, face('ginette'), h('div', {}, h('b', {}, 'Les animaux de l’île'), h('p', { class: 'line' }, st.animaux.quete ? 'Une quête à la fois! Suis les indices.' : 'Mes chattes pis ton chien me font des misères… Tu m’aides?'))),
      list.map(row), h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => { click(); ui.close(); } }, 'Fermer'))), { cls: 'talk' });
  };
  const animauxCarnet = st => { const a = st.animaux, C = G.animaux; if (!a || !C) return null; const list = C.jour();
    return h('section', { class: 'animaux' }, h('h4', {}, '🐾 Animaux'),
      h('p', { class: 'journal' }, `🐶 Charlie a rapporté ${Math.min(a.fetchN, FETCH_MAX)}/${FETCH_MAX} trouvailles aujourd’hui · 🏅 ${a.total} quête${a.total > 1 ? 's' : ''} réussie${a.total > 1 ? 's' : ''}`),
      list.map(q => h('div', { class: 'qrow', 'data-q': q.id }, h('div', {}, h('b', {}, `${q.emoji} ${q.nom}`), h('p', {}, q.etat === 'active' ? `En cours — ${q.indice}` : q.etat === 'faite' ? 'Réussie aujourd’hui' : 'Demande à Ginette')), h('span', { class: `lv ${q.etat === 'faite' ? 'm' : q.etat === 'active' ? 'a' : 'd'}` }, q.etat === 'faite' ? 'Faite' : q.etat === 'active' ? 'En cours' : 'Libre'))),
      h('div', { class: 'ctools' }, a.colliers.map(c => h('span', { class: `chip collier${a.collier === c ? ' on' : ''}`, 'data-c': c, title: 'Mettre ce collier à Charlie', onclick: () => { click(); C.wear(c); F.carnet(F.carnetTab); } }, h('i', { style: `display:inline-block;width:.8em;height:.8em;border-radius:50%;background:${COLLIERS[c][0]};margin-right:4px` }), COLLIERS[c][1])))); };
  F.carnet = (tab) => {
    const st = S(); const j = st.journal;
    const max = canFerry(st) ? 4 : 3;
    const tools = h('div', { class: 'ctools' }, TOOLS.map(t => h('span', { class: 'chip' }, `${t.icone} ${stars(st.tools[t.id] || 0, max)}`)));
    const journal = h('p', { class: 'journal' }, `🐟 ${j.fish} (✨ ${j.rare || 0} rare${(j.rare || 0) > 1 ? "s" : ""}) · 🍯 ${j.sirop || 0} · 🫐 ${j.bleuets || 0} · 🦋 ${j.bugs} · ⛏️ ${j.finds} · 🌸 ${j.flowers} · 🪙 ${fmtMoney(j.coins)} gagnés`);
    const RARE_KEYS = ['omble', 'maskinonge', 'esturgeon', 'tire', 'sirop', 'coulee', 'barquette', 'confiture', 'confiture_mamie', 'gros_dore', 'saumon', 'bar'];
    const rares = h('section', { class: 'rares' }, h('h4', {}, '✨ Prises rares et sirop'), RARE_KEYS.some(k => st.rares[k])
      ? h('div', { class: 'ctools' }, RARE_KEYS.filter(k => st.rares[k]).map(k => h('span', { class: 'chip rare', 'data-k': k }, `${ITEMS[k][0]} ${ITEMS[k][1]} × ${st.rares[k]}`)))
      : h('p', { class: 'pre' }, 'Rien encore. Quand ça mord fort ou qu’un érable coule, une petite question peut te rapporter une prise rare!'));
    // Progrès par compétence : essais, % de réussite, niveau (à découvrir / en apprentissage / maîtrisé)
    const pct = id => Math.round((successRate(st, id) ?? 0) * 100);
    const essais = id => { const s = st.stats?.[id]; return s?.n ? `${s.n}\u00a0essai${s.n > 1 ? 's' : ''} · ${pct(id)}\u00a0% réussi${s.sec ? ` · ~${Math.round(s.sec)}\u00a0s` : ''}` : 'Pas encore essayé'; };
    const niveau = id => isMastered(st, id) ? ['m', 'Maîtrisé'] : st.stats?.[id]?.n || st.mastery[id]?.tries ? ['a', 'En apprentissage'] : ['d', 'À découvrir'];
    const weakOf = list => weakList(st, list.map(s => s.id).filter(id => isUnlocked(st, id)), 3);
    const pratiquer = (list, sec) => { const w = weakOf(list);
      return h('section', { class: 'pratiquer' }, h('h4', {}, '🎯 À pratiquer'), w.length
        ? w.map(id => h('div', { class: 'prat' }, h('div', {}, h('b', {}, skillById(id).nom), h('p', { class: 'pre' }, essais(id))),
          h('div', { class: 'row pratbtns' }, h('button', { class: 'btn small lecbtn', 'data-lecon': id, title: 'La leçon d’Hortense', onclick: () => { click(); F.lecon(id, () => F.carnet(F.carnetTab)); } }, '📖'), h('button', { class: 'btn small primary', 'data-skill': id, onclick: () => { click(); F.defi(id, sec); } }, 'Pratiquer'))))
        : h('p', { class: 'pre' }, list.some(s => st.stats?.[s.id]?.n) ? 'Rien qui accroche en ce moment. Bravo!' : 'Réponds à quelques questions : je noterai ici ce qui mérite un peu de pratique.')); };
    const doms = list => { const weak = weakOf(list); return DOMAINES.filter(dn => list.some(s => s.domaine === dn)).map(dname => h('section', {}, h('h4', {}, dname), list.filter(s => s.domaine === dname).map(sk => {
      const ok = st.mastery[sk.id]?.ok || 0, m = isMastered(st, sk.id), u = isUnlocked(st, sk.id), [nc, nt] = niveau(sk.id), n = st.stats?.[sk.id]?.n || 0;
      const pre = prereqsOf(sk.id, 'hard').map(p => `${skillById(p).nom}${isS2(sk.id) && !isS2(p) ? ' (sec. 1)' : ''}`).join(', ');
      return h('div', { class: `sk ${m ? 'm' : u ? '' : 'lock'}${weak.includes(sk.id) ? ' faible' : ''}`, 'data-skill': sk.id },
        h('div', {}, h('b', {}, `${m ? '✅ ' : u ? '' : '🔒 '}${sk.nom}`), h('p', { class: 'pda' }, sk.pda), !u ? h('p', { class: 'pre' }, 'Préalable : ', pre) : isS2(sk.id) ? h('p', { class: 'pre s1' }, 'S’appuie sur : ', pre) : null,
          h('p', { class: 'essais' }, essais(sk.id)), n ? h('div', { class: 'rbar', role: 'progressbar', 'aria-label': 'Réussite', 'aria-valuenow': pct(sk.id) }, h('i', { style: `width:${pct(sk.id)}%` })) : null),
        h('div', { class: 'niv' }, h('span', { class: `lv ${nc}` }, weak.includes(sk.id) ? `🎯 ${nt}` : nt), dots(ok), h('button', { class: 'btn small lecbtn', 'data-lecon': sk.id, title: 'La leçon d’Hortense', 'aria-label': `Leçon : ${sk.nom}`, onclick: () => { click(); F.lecon(sk.id, () => F.carnet(F.carnetTab)); } }, '📖 Leçon')));
    }))); };
    const line = h('p', { class: 'line' });
    const s2extra = h('p', { class: 'journal s2' }, `⛴️ Traversier : ${canFerry(st) ? 'ouvert' : 'fermé'} · 🗼 Phare : ${st.phare.done ? 'réparé, il brille la nuit!' : `étape ${st.phare.step} sur 3`} · 🪱 Appâts rares : ${st.appats}`);
    const body = h('div', { class: 'cbody' });
    const tabs = [['s1', 'Secondaire 1'], ['s2', 'Secondaire 2']].map(([id, t]) => h('button', { class: 'btn tab', role: 'tab', 'data-tab': id, onclick: () => { click(); show(id); } }, t));
    function show(id) {
      tabs.forEach(b => { const on = b.dataset.tab === id; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
      const list = id === 's2' ? SKILLS2 : SKILLS;
      line.textContent = `${masteryCount(st, list)} / ${list.length} compétences maîtrisées — Secondaire ${id === 's2' ? 2 : 1} (PDA du MEQ)`;
      body.replaceChildren(...(id === 's2' ? [s2extra] : []), pratiquer(list, id === 's2' ? 2 : 1), ...doms(list));
      F.carnetTab = id;
    }
    open(h('div', { class: 'carnet' }, h('div', { class: 'who' }, face(st.island === 2 ? 'rosalie' : 'flocon'), h('div', {}, h('b', {}, 'Mon carnet'), line)), h('div', { class: 'tabs', role: 'tablist' }, tabs), tools, journal, animauxCarnet(st), rares, body), { cls: 'carnet' });
    show(tab || (st.island === 2 ? 's2' : 's1'));
  };

  // ---------- Traversier : verrouillé tant que les 5 outils ne sont pas au niveau 2
  F.ferry = () => {
    const st = S(), here = st.island === 2 ? 2 : 1, to = here === 2 ? 1 : 2;
    if (to === 2 && !canFerry(st)) {
      const prog = ferryProgress(st), n = prog.filter(t => t.ok).length;
      open(h('div', { class: 'dialog ferry locked' }, h('div', { class: 'who' }, h('div', { class: 'face' }, '⛴️'), h('div', {}, h('b', {}, 'Traversier — fermé pour l’instant'), h('p', { class: 'line' }, `Le capitaine attend que tes 5 outils soient au niveau ${FERRY_LEVEL}. Améliore-les à l’établi de Gaston! (${n} sur 5)`))),
        h('div', { class: 'ferryprog' }, prog.map(t => h('div', { class: `fp ${t.ok ? 'ok' : ''}`, 'data-tool': t.id }, h('span', {}, `${t.icone} ${t.nom}`), h('span', { class: 'stars' }, stars(t.level)), h('b', {}, t.ok ? '✓' : `niv. ${t.level} / ${FERRY_LEVEL}`)))),
        h('div', { class: 'choices' }, h('button', { class: 'btn primary', onclick: () => { click(); F.workbench(); } }, '🔨 Aller à l’établi'), h('button', { class: 'btn', onclick: () => { click(); ui.close(); } }, 'Plus tard'))), { cls: 'talk' });
      return;
    }
    const line = to === 2 ? 'Embarque! On traverse vers l’île de secondaire 2 : phare, rivière, érables rouges pis poissons rares.' : 'On retourne à la Vallée des Maths? Ta partie suit, rien ne se perd.';
    open(h('div', { class: 'dialog ferry' }, h('div', { class: 'who' }, h('div', { class: 'face' }, '⛴️'), h('div', {}, h('b', {}, to === 2 ? 'Traversier vers l’île 2' : 'Traversier vers l’île 1'), h('p', { class: 'line' }, line))),
      h('div', { class: 'choices' }, h('button', { class: 'btn primary board', onclick: () => { click(); ui.close(); G.travel(to); } }, '⛴️ Embarquer'), h('button', { class: 'btn', onclick: () => { click(); ui.close(); } }, 'Rester ici'))), { cls: 'talk' });
  };

  // ---------- Phare de Rosalie : 3 étapes (échelle, aire latérale, aire de la lentille)
  const phareSeed = () => `${S().seed}:${S().phare.redo || 0}`;
  F.phare = () => {
    const st = S();
    if (st.phare.done) {
      open(h('div', { class: 'dialog' }, h('div', { class: 'who' }, face('rosalie'), h('div', {}, h('b', {}, 'Le phare est réparé!'), h('p', { class: 'line' }, 'Grâce à toi, il brille toutes les nuits. Reviens le voir quand le soleil se couche!'))),
        h('div', { class: 'choices' }, h('button', { class: 'btn primary', onclick: () => { click(); ui.close(); } }, 'Super!'))), { cls: 'talk' });
      return;
    }
    const p = phareData(phareSeed());
    open(h('div', { class: 'dialog phare' }, h('div', { class: 'who' }, face('rosalie'), h('div', {}, h('b', {}, 'Réparer le phare'), h('p', { class: 'line' }, `Voici mon plan à l’échelle 1 : ${p.k}. Trois calculs, pis on rallume la lumière! (étape ${st.phare.step + 1} sur 3)`))),
      figureEl(phareSVG(p, st.phare.step)), h('div', { class: 'row' }, dots(st.phare.step, 3)),
      h('div', { class: 'choices' }, h('button', { class: 'btn primary', onclick: () => { click(); F.phareStep(); } }, `Étape ${st.phare.step + 1}`), h('button', { class: 'btn', onclick: () => { click(); ui.close(); } }, 'Plus tard'))), { cls: 'talk' });
  };
  F.phareStep = () => { const st = S(), ex = phareSteps(phareSeed())[Math.min(2, st.phare.step)]; F.exercise({ kind: 'phare', skill: ex.skill, ex }); };
  F.phareOk = (ex, fb, done) => {
    const st = S(); st.phare.step = Math.max(st.phare.step, ex.step + 1);
    if (st.phare.step >= 3) { st.phare.done = true; G.isle2 && G.isle2.setPhare(true); st.money += 500; st.journal.coins += 500; G.save(); ui.toast('🗼 Le phare est réparé! Il va briller cette nuit.', 'gold');
      fb.append(h('p', { class: 'benefit' }, '🗼 Dernière étape réussie! Rosalie te donne 5,00 $. Le phare brillera à la nuit tombée.')); return done(() => F.phare(), 'Voir le phare'); }
    G.save(); fb.append(h('p', { class: 'benefit' }, `Étape ${ex.step + 1} réussie!`)); return done(() => F.phareStep(), `Étape ${st.phare.step + 1}`);
  };

  // ---------- Kiosque de Bernard : une pige par jour (avec ou sans remise) → un appât rare
  F.kiosk = () => {
    const st = S();
    if (!canKiosk(st)) {
      open(h('div', { class: 'dialog kiosk' }, h('div', { class: 'who' }, face('bernard'), h('div', {}, h('b', {}, 'Kiosque de pêche'), h('p', { class: 'line' }, `T’as déjà pigé aujourd’hui! Reviens demain. Appâts rares en réserve : ${st.appats}.`))),
        h('div', { class: 'choices' }, h('button', { class: 'btn primary', onclick: () => { click(); ui.close(); } }, 'D’accord'))), { cls: 'talk' });
      return;
    }
    open(h('div', { class: 'dialog kiosk' }, h('div', { class: 'who' }, face('bernard'), h('div', {}, h('b', {}, 'La pige de Bernard'), h('p', { class: 'line' }, `Une question sur ma chaudière de billes : avec ou sans remise? Bonne réponse = un appât rare (poisson rare garanti au quai). Une seule chance par jour! Appâts : ${st.appats}.`))),
      h('div', { class: 'choices' }, h('button', { class: 'btn primary pige', onclick: () => { click(); const ex = kioskExercise(st, makeExercise, difficultyFor(st, 'qc_s2_prb_01')); F.exercise({ kind: 'kiosk', skill: ex.id, ex }); } }, '🎲 Piger!'), h('button', { class: 'btn', onclick: () => { click(); ui.close(); } }, 'Plus tard'))), { cls: 'talk' });
  };
  return F;
}
