// Export PNG (scale 1) + node spec JSON for the NEW frames on the "Web App - clippers" page.
// Usage: node extract-clippers.js <out dir>
const { execFileSync } = require('child_process');
const fs = require('fs'); const path = require('path');
const BIN = 'C:/Users/Steve/tools/figma-cli/node_modules/figma-use/bin/figma-use.js';
const OUT = process.argv[2];
const NEW = [
  ['380:844',  'dashboard-data-desktop-380-844',            'Dashboard - data - desktop'],
  ['397:2720', 'dashboard-data-mobile-397-2720',            'Dashboard - data - mobile'],
  ['366:376',  'dashboard-mobile-366-376',                  'Dashboard (empty) - mobile'],
  ['397:3135', 'clipping-details-desktop-397-3135',         'Clipping details - desktop'],
  ['398:4552', 'clipping-details-mobile-398-4552',          'Clipping details - mobile'],
  ['398:6785', 'clipping-leaderboard-desktop-398-6785',     'Clipping details - leaderboard - desktop'],
  ['398:6940', 'clipping-leaderboard-mobile-398-6940',      'Clipping details - leaderboard - mobile'],
  ['398:5569', 'submit-post-1-desktop-398-5569',            'Submit post (1) - desktop'],
  ['402:7789', 'submit-screenshot-desktop-402-7789',        'Submit screenshot - desktop'],
  ['402:8770', 'submit-post-3-desktop-402-8770',            'Submit post (3) - desktop'],
  ['402:8276', 'submit-post-4-desktop-402-8276',            'Submit post (4) - desktop'],
  ['398:6048', 'submit-success-desktop-398-6048',           'Success - desktop'],
  ['398:5724', 'submit-post-1-mobile-398-5724',             'Submit post (1) - mobile'],
  ['402:7975', 'submit-post-2-mobile-402-7975',             'Submit post (2) - mobile'],
  ['402:8964', 'submit-post-3-mobile-402-8964',             'Submit post (3) - mobile'],
  ['402:8462', 'submit-post-4-mobile-402-8462',             'Submit post (4) - mobile'],
  ['398:6238', 'submit-success-mobile-398-6238',            'Success - mobile'],
  ['397:1535', 'add-social-desktop-397-1535',               'Add social - desktop'],
  ['378:640',  'add-social-mobile-378-640',                 'Add social - mobile'],
  ['366:324',  'create-account-mobile-366-324',             'Create account - mobile'],
];
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
    o.txt = n.characters.length > 80 ? n.characters.slice(0, 80) + '...' : n.characters;
    const fn = n.fontName; if (fn !== figma.mixed) o.font = fn.family + ' ' + fn.style;
    if (n.fontSize !== figma.mixed) o.fs = Math.round(n.fontSize * 10) / 10;
    if (n.lineHeight !== figma.mixed && n.lineHeight && n.lineHeight.unit !== 'AUTO') o.lh = Math.round(n.lineHeight.value * 10) / 10 + (n.lineHeight.unit === 'PERCENT' ? '%' : '');
    if (n.fills !== figma.mixed) { const tf = paint(n.fills); if (tf.length) o.fill = tf; }
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
// 1) PNG exports
for (const [id, file] of NEW) {
  const png = path.join(OUT, file + '.png');
  if (fs.existsSync(png) && fs.statSync(png).size > 3000) { console.log('png skip ' + file); continue; }
  try {
    execFileSync(process.execPath, [BIN, 'export', 'node', id, '--format', 'PNG', '--scale', '1', '--output', png, '--timeout', '180'], { encoding: 'utf8', timeout: 240000, maxBuffer: 2e8, stdio: ['ignore', 'pipe', 'pipe'] });
    console.log('png ' + file + ' ' + (fs.existsSync(png) ? fs.statSync(png).size : 'MISSING') + ' bytes');
  } catch (e) { console.log('PNG FAIL ' + file + ' ' + String(e.message).slice(0, 160)); }
}
// 2) node specs
for (const [id, file] of NEW) {
  const jf = path.join(OUT, file + '.json');
  if (fs.existsSync(jf) && fs.statSync(jf).size > 2000) { console.log('spec skip ' + file); continue; }
  try {
    const head = evalJson(`const r = await figma.getNodeByIdAsync('${id}'); return { rx: r.absoluteBoundingBox.x, ry: r.absoluteBoundingBox.y };`);
    const spec = extract(id, head.rx, head.ry, 0);
    fs.writeFileSync(jf, JSON.stringify(spec));
    console.log('spec ' + file + ' ' + fs.statSync(jf).size + ' bytes');
  } catch (e) { console.log('SPEC FAIL ' + file + ' ' + String(e.message).slice(0, 160)); }
}
// 3) merge into _index.json
const idxFile = path.join(OUT, '_index.json');
const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
for (const [id, file, name] of NEW) if (!idx.some((e) => e.id === id)) idx.push({ id, name, file });
fs.writeFileSync(idxFile, JSON.stringify(idx, null, 1) + '\n');
console.log('DONE');
