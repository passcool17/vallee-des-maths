// DOM minimal simulé pour les tests Node (pas un navigateur) : assez pour ui.js et flows.js.
// Limites : pas de mise en page, pas de CSS (la classe « hidden » est la seule visibilité modélisée), pas de comportement natif
// des contrôles hormis click() et la case à cocher (Espace natif simulé par pressSpaceOnFocused).
class ClassList { constructor(el) { this.el = el; } get set() { return new Set(this.el.className.split(/\s+/).filter(Boolean)); }
  add(...c) { const s = this.set; c.forEach(x => s.add(x)); this.el.className = [...s].join(' '); } remove(...c) { const s = this.set; c.forEach(x => s.delete(x)); this.el.className = [...s].join(' '); }
  contains(c) { return this.set.has(c); } toggle(c, f) { const on = f === undefined ? !this.contains(c) : !!f; on ? this.add(c) : this.remove(c); return on; } }
class Node0 { constructor() { this.parentNode = null; this.childNodes = []; }
  get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === doc.body || n === doc; }
  remove() { if (this.parentNode) { const a = this.parentNode.childNodes; a.splice(a.indexOf(this), 1); this.parentNode = null; } } }
class Text extends Node0 { constructor(t) { super(); this.data = String(t); } get textContent() { return this.data; } }
export class El extends Node0 {
  constructor(tag) { super(); this.tagName = tag.toUpperCase(); this.attrs = {}; this.className = ''; this.classList = new ClassList(this); this.style = {}; this.listeners = {}; this.checked = false; this.type = ''; this.value = ''; this.disabled = false; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); if (k === 'type') this.type = String(v); if (k === 'checked') this.checked = true; }
  get dataset() { const el = this; return new Proxy({}, { get: (t, k) => el.attrs['data-' + String(k).replace(/[A-Z]/g, c => '-' + c.toLowerCase())], set: (t, k, v) => { el.attrs['data-' + String(k)] = String(v); return true; } }); }
  getAttribute(k) { return k === 'class' ? this.className : this.attrs[k] ?? null; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  dispatch(t, ev = {}) { const e = { type: t, target: this, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {}, ...ev }; for (const f of this.listeners[t] || []) f.call(this, e); return e; }
  click() { if (this.disabled) return; if (this.tagName === 'INPUT' && this.type === 'checkbox') this.checked = !this.checked; this.dispatch('click'); if (this.tagName === 'INPUT') this.dispatch('change'); }
  focus() { doc.activeElement = this; } blur() { if (doc.activeElement === this) doc.activeElement = doc.body; }
  append(...k) { for (const c of k) { const n = c instanceof Node0 ? c : new Text(c); n.remove(); n.parentNode = this; this.childNodes.push(n); } }
  prepend(...k) { const old = this.childNodes.splice(0); this.append(...k); for (const n of old) { this.childNodes.push(n); } }
  before(...k) { const p = this.parentNode, i = p.childNodes.indexOf(this); for (const c of k) { const n = c instanceof Node0 ? c : new Text(c); n.remove(); n.parentNode = p; } p.childNodes.splice(i, 0, ...k.map(c => c instanceof Node0 ? c : new Text(c))); }
  replaceChildren(...k) { for (const n of this.childNodes) n.parentNode = null; this.childNodes = []; this.append(...k); }
  get children() { return this.childNodes.filter(n => n instanceof El); } get firstChild() { return this.childNodes[0] || null; } get childElementCount() { return this.children.length; }
  get textContent() { return this.childNodes.map(n => n.textContent).join(''); } set textContent(t) { this.replaceChildren(String(t)); }
  set innerHTML(t) { this.replaceChildren(String(t).replace(/<[^>]*>/g, '')); } get innerHTML() { return this.textContent; }
  get offsetHeight() { return 20; } getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; } scrollTop = 0;
  // toile 2D factice (textures de world.js chargées par villagers.js) : aucun dessin réel
  getContext() { return new Proxy({}, { get: (t, k) => k === 'measureText' ? () => ({ width: 100 }) : () => ({ addColorStop() {} }), set: () => true }); }
  matches(sel) { return simple(this, sel); }
  querySelectorAll(sel) { const parts = sel.trim().split(/\s+/), out = []; const walk = (n, anc) => { for (const c of n.children) { if (simple(c, parts.at(-1)) && chain(c, parts.slice(0, -1), this)) out.push(c); walk(c); } }; walk(this); return out; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}
function simple(el, s) {
  const nots = []; s = s.replace(/:not\(([^)]*)\)/g, (_, x) => { nots.push(x); return ''; });
  const m = s.match(/^([a-z]+)?((?:[#.][\w-]+|\[[^\]]+\])*)$/i); if (!m) throw new Error('sélecteur non géré : ' + s);
  if (m[1] && el.tagName !== m[1].toUpperCase()) return false;
  for (const t of m[2].match(/[#.][\w-]+|\[[^\]]+\]/g) || []) {
    if (t[0] === '#' && el.id !== t.slice(1)) return false; if (t[0] === '.' && !el.classList.contains(t.slice(1))) return false;
    if (t[0] === '[') { const [k, v] = t.slice(1, -1).split('='); const a = el.getAttribute(k); if (a == null || (v != null && a !== v.replace(/['"]/g, ''))) return false; }
  }
  return nots.every(n => !simple(el, n));
}
function chain(el, parts, root) { if (!parts.length) return true; let p = el.parentNode; while (p && p !== root.parentNode) { if (p instanceof El && simple(p, parts.at(-1)) && chain(p, parts.slice(0, -1), root)) return true; p = p.parentNode; } return false; }
const doc = { activeElement: null, createElement: t => new El(t), createTextNode: t => new Text(t), getElementById: id => doc.body.querySelector('#' + id) || (doc.documentElement.id === id ? doc.documentElement : null), querySelector: s => doc.body.querySelector(s), querySelectorAll: s => doc.body.querySelectorAll(s) };
doc.documentElement = new El('html'); doc.body = new El('body'); doc.body.parentNode = null; doc.activeElement = doc.body;
export function installDom(ids = ['hud', 'money', 'clock', 'bag', 'btn-son', 'panel', 'prompt', 'toasts', 'act']) {
  doc.body.replaceChildren(); for (const id of ids) { const e = new El(id === 'act' || id === 'btn-son' ? 'button' : 'div'); e.setAttribute('id', id); if (id === 'panel') e.className = 'panel hidden'; doc.body.append(e); }
  doc.body.querySelector('#hud').append(Object.assign(new El('div'), { className: 'chips' }));
  globalThis.document = doc; globalThis.Node = Node0; globalThis.performance ??= { now: () => Date.now() };
  return doc;
}
// Est visible si ni l’élément ni un parent n’a la classe « hidden »
export const visible = el => { if (!el) return false; for (let n = el; n instanceof El; n = n.parentNode) if (n.classList.contains('hidden')) return false; return el.isConnected; };
