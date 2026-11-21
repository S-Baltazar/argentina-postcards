// Selecciona 100 sellos reales de scripts/raw.json, descarga sus imágenes y genera client/src/stamps.json
import fs from 'fs';
import path from 'path';

const raw = JSON.parse(fs.readFileSync('scripts/raw.json', 'utf8'));
const dir = 'client/src/assets/stamps';
fs.mkdirSync(dir, { recursive: true });

const decode = (s) => s.replace(/&#8211;|&ndash;/g, '–').replace(/&#8217;|&rsquo;/g, "'").replace(/&#038;|&amp;/g, '&').replace(/&#8220;|&#8221;/g, '"').replace(/&#\d+;/g, '');

const cands = raw
  .filter(s => s.classes.includes('tipo_pieza-sello') && s.img && /^\d{4}$/.test(String(s.years[0])))
  .map(s => ({ ...s, year: parseInt(s.years[0], 10) }))
  .sort((a, b) => a.year - b.year || a.id - b.id);

const seen = new Set();
const uniq = cands.filter(s => (seen.has(s.img) ? false : (seen.add(s.img), true)));
console.log('candidatos', uniq.length);

const picked = [];
for (let i = 0; i < 100; i++) picked.push(uniq[Math.floor((i * uniq.length) / 100)]);

const out = [];
for (const s of picked) {
  const src = s.sizes.medium || s.img;
  const ext = path.extname(new URL(src).pathname) || '.jpg';
  const file = `${s.slug.slice(0, 60)}${ext}`;
  const dest = path.join(dir, file);
  if (!fs.existsSync(dest)) {
    const r = await fetch(src);
    if (!r.ok) { console.log('skip', src, r.status); continue; }
    fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
  }
  const name = decode(s.title).replace(/\s*[–-]\s*A[ñn]o\s+\d{4}.*$/i, '').trim();
  out.push({ id: `fa_${s.id}`, name, year: s.year, file, link: s.link });
}
fs.writeFileSync('client/src/stamps.json', JSON.stringify(out, null, 1));
console.log('generadas', out.length);
