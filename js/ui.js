// Interface DOM : HUD, invite d’action, notifications, panneau modal et pavé numérique.
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else if (k === 'class') el.className = v; else if (k === 'html') el.innerHTML = v; else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
export const fmtMoney = cents => `${(cents / 100).toFixed(2).replace('.', ',')} $`;

export function makeUI() {
  const $ = id => document.getElementById(id);
  const panel = $('panel'), prompt = $('prompt'), toasts = $('toasts'), act = $('act');
  let onClose = null;
  const UI = {
    get isOpen() { return !panel.classList.contains('hidden'); },
    hud(state, { phase, phaseNom, bagCap }) {
      $('money').textContent = `🪙 ${fmtMoney(state.money)}`;
      $('clock').textContent = `${{ matin: '🌅', midi: '☀️', doree: '🌇', nuit: '🌙' }[phase]} ${phaseNom}`;
      $('bag').textContent = `🎒 ${state.bag.length}/${bagCap}`;
      $('btn-son').textContent = state.muted ? '🔇' : '🔊';
    },
    prompt(text, key = 'E') {
      if (!text || UI.isOpen) { prompt.classList.add('hidden'); act.classList.remove('ready'); act.textContent = '✋'; return; }
      prompt.replaceChildren(h('kbd', { class: 'desk' }, key), ' ', text); prompt.classList.remove('hidden');
      act.classList.add('ready'); act.textContent = text.length > 14 ? '✋' : text;
    },
    toast(text, kind = '') {
      const t = h('div', { class: `toast ${kind}` }, text); toasts.append(t);
      while (toasts.children.length > 3) toasts.firstChild.remove();
      setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3100);
    },
    // Petite pastille « +x,xx $ » qui sort de la puce d’argent (au lieu d’une notification sur la scène)
    gain(cents) {
      const g = h('div', { class: 'gainpill' }, `+${fmtMoney(cents)}`); g.style.top = `${document.querySelector('#hud .chips').offsetHeight + 11}px`; $('hud').append(g); // sous les pastilles, même quand elles passent sur 2 lignes
      setTimeout(() => g.remove(), 1400);
    },
    open(content, { cls = '', close } = {}) {
      panel.className = `panel ${cls}`; panel.replaceChildren(h('div', { class: 'sheet' }, h('button', { class: 'x', 'aria-label': 'Fermer', onclick: () => UI.close() }, '✕'), content));
      onClose = close || null; document.body.classList.add('modal'); UI.prompt(null);
      const sheet = panel.firstChild; sheet.scrollTop = 0; return sheet;
    },
    swap(content) { const sheet = panel.firstChild; sheet.replaceChildren(sheet.firstChild, content); sheet.scrollTop = 0; return sheet; },
    close() { if (!UI.isOpen) return; panel.className = 'panel hidden'; panel.replaceChildren(); document.body.classList.remove('modal'); const f = onClose; onClose = null; f && f(); },
    // Pavé numérique : 0-9 , / − ⌫ effacer valider
    numpad(onKey, { pi = false } = {}) {
      // Avec π : la touche « Effacer » cède sa place (⌫ efface encore)
      const keys = ['7', '8', '9', '⌫', '4', '5', '6', '/', '1', '2', '3', ',', '−', '0', pi ? 'π' : 'C', '✓'];
      return h('div', { class: 'numpad' }, keys.map(k => h('button', { class: `k ${k === '✓' ? 'ok' : ''} ${/[0-9]/.test(k) ? 'd' : 'f'}`, 'data-k': k, 'aria-label': { '⌫': 'Effacer un caractère', C: 'Tout effacer', '✓': 'Valider', 'π': 'pi' }[k] || k,
        onpointerdown: e => { e.preventDefault(); onKey(k); }, ontouchend: e => e.preventDefault() /* pas de clic fantôme sur le bouton qui apparaît dessous */ }, k === 'C' ? 'Effacer' : k === '✓' ? 'Valider' : k)));
    },
  };
  return UI;
}
