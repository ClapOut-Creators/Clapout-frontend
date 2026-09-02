const { execFileSync } = require('child_process');
const fs = require('fs'); const path = require('path');
const BIN = 'C:/Users/Steve/tools/figma-cli/node_modules/figma-use/bin/figma-use.js';
const SCR = process.argv[2]; const OUT = path.join(SCR, 'figma');
const index = JSON.parse(fs.readFileSync(path.join(OUT, '_index.json'), 'utf8'));
const evalJson = (code) => { const out = execFileSync(process.execPath, [BIN, 'eval', code, '--json'], { encoding: 'utf8', timeout: 180000, maxBuffer: 2e8, stdio: ['ignore', 'pipe', 'ignore'] }); if (!out.trim() || out.trim() === 'undefined') throw new Error('empty'); return JSON.parse(out); };
const WALK = (rx, ry, cap) => `
const hex = (c) => '#' + [c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
const paint = (fills) => (Array.isArray(fills) ? fills : []).filter(f => f.visible !== false).map(f => f.type === 'SOLID' ? hex(f.color) + (f.opacity != null && f.opacity < 1 ? '@' + Math.round(f.opacity * 100) : '') : f.type).slice(0, 2);
let count = 0;
const walk = (n, depth) => {
  if (n.visible === false || count > ${cap}) return null; count++;
  const b = n.absoluteBoundingBox || { x: ${rx}, y: ${ry}, width: 0, height: 0 };
  const o = { t: n.type, n: n.name.slice(0, 40), x: Math.round(b.x - ${rx}), y: Math.round(b.y - ${ry}), w: Math.round(b.width), h: Math.round(b.height) };
  const f = paint(n.fills); if (f.length) o.fill = f;
  const s = paint(n.strokes); if (s.length) { o.stroke = s; if (n.strokeWeight) o.sw = n.strokeWeight; }
  if (typeof n.cornerRadius === 'number' && n.cornerRadius) o.r = Math.round(n.cornerRadius * 10) / 10;
  if (n.opacity != null && n.opacity < 1) o.op = Math.round(n.opacity * 100);
  if (n.layoutMode && n.layoutMode !== 'NONE') o.lay = { d: n.layoutMode, gap: n.itemSpacing, pad: [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft] };
  if (n.type === 'TEXT') {
    o.txt = n.characters.length > 80 ? n.characters.slice(0, 80) + '…' : n.characters;
    const fn = n.fontName; if (fn !== figma.mixed) o.font = fn.family + ' ' + fn.style;
    if (n.fontSize !== figma.mixed) o.fs = Math.round(n.fontSize * 10) / 10;
    if (n.lineHeight !== figma.mixed && n.lineHeight && n.lineHeight.unit !== 'AUTO') o.lh = Math.round(n.lineHeight.value * 10) / 10 + (n.lineHeight.unit === 'PERCENT' ? '%' : '');
  }
  const skip = n.type === 'VECTOR' || n.type === 'BOOLEAN_OPERATION';
  if (!skip && 'children' in n && depth < 9) { const ch = n.children.map(c => walk(c, depth + 1)).filter(Boolean); if (ch.length) o.c = ch; }
  return o;
};`;
function extract(id, rx, ry, depth) {
  try { return evalJson(`${WALK(rx, ry, 1500)} const n = await figma.getNodeByIdAsync('${id}'); return walk(n, ${depth});`); }
  catch (e) {
    const meta = evalJson(`const n = await figma.getNodeByIdAsync('${id}'); const b = n.absoluteBoundingBox; return { t: n.type, n: n.name.slice(0,40), x: Math.round(b.x - ${rx}), y: Math.round(b.y - ${ry}), w: Math.round(b.width), h: Math.round(b.height), fill: (n.fills||[]).filter(f=>f.visible!==false&&f.type==='SOLID').map(f=>'#'+[f.color.r,f.color.g,f.color.b].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('').toUpperCase()), r: typeof n.cornerRadius==='number'?n.cornerRadius:undefined, lay: n.layoutMode&&n.layoutMode!=='NONE'?{d:n.layoutMode,gap:n.itemSpacing,pad:[n.paddingTop,n.paddingRight,n.paddingBottom,n.paddingLeft]}:undefined, kids: ('children' in n ? n.children.filter(c=>c.visible!==false).map(c => c.id) : []) };`);
    const node = { t: meta.t, n: meta.n, x: meta.x, y: meta.y, w: meta.w, h: meta.h };
    if (meta.fill && meta.fill.length) node.fill = meta.fill; if (meta.r) node.r = meta.r; if (meta.lay) node.lay = meta.lay;
    if (!meta.kids.length || depth > 14) return node;
    node.c = meta.kids.map((cid) => extract(cid, rx, ry, depth + 1)).filter(Boolean);
    return node;
  }
}
for (const s of index) {
  const file = path.join(OUT, s.file + '.json');
  if (fs.existsSync(file) && fs.statSync(file).size > 12000) continue;
  try {
    const head = evalJson(`const r = await figma.getNodeByIdAsync('${s.id}'); return { rx: r.absoluteBoundingBox.x, ry: r.absoluteBoundingBox.y };`);
    const spec = extract(s.id, head.rx, head.ry, 0);
    fs.writeFileSync(file, JSON.stringify(spec));
    console.log('spec3 ' + s.file + ' ' + fs.statSync(file).size + ' bytes');
  } catch (e) { console.log('SPEC3 FAIL ' + s.file + ' ' + String(e.message).slice(0, 100)); }
}
console.log('DONE3');
