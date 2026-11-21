// Descarga el listado de sellos de filateliaargentina.com.ar (API pública WP) en scripts/raw.json
import fs from 'fs';

const base = 'https://www.filateliaargentina.com.ar/wp-json/wp/v2';
const all = [];
for (let page = 1; page <= 7; page++) {
  const url = `${base}/sello?per_page=100&page=${page}&_embed=wp:featuredmedia,wp:term&_fields=id,slug,title,link,class_list,_links,_embedded`;
  const r = await fetch(url);
  if (!r.ok) { console.log('fail page', page, r.status); break; }
  const j = await r.json();
  for (const s of j) {
    const media = s._embedded?.['wp:featuredmedia']?.[0];
    const terms = (s._embedded?.['wp:term'] || []).flat();
    all.push({
      id: s.id,
      slug: s.slug,
      title: s.title.rendered,
      link: s.link,
      classes: s.class_list.filter(c => /^(tipo_pieza|tematica|pais)-/.test(c)),
      years: terms.filter(t => t.taxonomy === 'anio').map(t => t.name),
      img: media?.source_url,
      sizes: media?.media_details?.sizes ? Object.fromEntries(Object.entries(media.media_details.sizes).map(([k, v]) => [k, v.source_url])) : {}
    });
  }
  console.log('page', page, all.length);
}
fs.writeFileSync('scripts/raw.json', JSON.stringify(all, null, 1));
