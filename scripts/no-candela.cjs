const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
let total = 0;
const counts = {};

function applyAll(file, pairs) {
  const fp = path.join(root, file);
  if (!fs.existsSync(fp)) { console.warn('missing', fp); return; }
  let txt = fs.readFileSync(fp, 'utf8');
  let fileCount = 0;
  for (const [from, to] of pairs) {
    const before = txt.length;
    txt = txt.split(from).join(to);
    // count by occurrences:
    const occ = before - txt.length + to.length * 0; // placeholder, we count via splits below
    fileCount += 0;
  }
  fs.writeFileSync(fp, txt, 'utf8');
  counts[file] = fileCount;
}

const DB_PAIRS = [
  ['Ritual de las Candelas', 'Ritual de la Cueva'],
  ['agua, piedra y candela', 'agua, piedra y el río'],
  ['iluminado por candelas', 'iluminada con luz frontal'],
  ['la luz de la candela', 'la luz frontal'],
  ['La candela es la brújula', 'El silencio es el sendero'],
  ['Una vela por persona', 'Una linterna frontal por persona'],
  ['recorridos con candela y el tubing', 'recorridos de aventura y el tubing'],
  ['guía local certificado, candela, casco', 'guía local certificado, casco'],
  ['la candela, el agua, la cascada', 'el río, la selva y la cascada'],
  ['Candela y soporte', 'Casco y linterna frontal'],
  ['Candela, casco y chaleco', 'Linterna frontal, casco y chaleco'],
  ['Candela y casco', 'Linterna frontal y casco'],
  ['con candela en mano', 'con luz frontal al cuello'],
  ['con una candela', 'con la luz frontal'],
  ['con candela', 'con luz frontal'],
  ['Luz de candela sobre la roca caliza', 'Luz frontal sobre la roca caliza'],
  ['El guía abre camino con una candela', 'El guía abre camino con la luz frontal'],
  ['Entramos con candela cuando', 'Entramos cuando'],
  ['cuando las colonias de murciélagos despiertan. Leyendas q’eqchi’, candela y sonido de río.', 'cuando las colonias de murciélagos despiertan. Leyendas q’eqchi’ y murmullo del río.'],
  ['Ritual de las Candelas y el', 'Ritual de la Cueva y el']
];

applyAll('data/db.json', DB_PAIRS);
applyAll('server/store.js', DB_PAIRS);

const HTML_PAIRS = [
  [', candela y aventura', ' y aventura'],
  ['candela y río Cahabón', 'río Cahabón'],
  ['iluminado por candelas', 'iluminada con luz frontal'],
  ['la candela, el agua, la cascada', 'el río, la selva y la cascada'],
  ['candela en mano', 'luz frontal al cuello'],
  [', candela y respeto', ' y respeto'],
  [' , candela y respeto', ' y respeto'],
  ['candela, casco, chaleco', 'casco, chaleco'],
  ['candela, casco', 'casco'],
  ['Casco, chaleco y candela incluidos.', 'Casco y chaleco incluidos.'],
  ['guía local certificado, candela, casco', 'guía local certificado, casco'],
  ['>Candela<', '>Sendero<']
];

for (const file of fs.readdirSync(path.join(root, 'public')).filter(f => f.endsWith('.html'))) {
  applyAll('public/' + file, HTML_PAIRS);
}

/* Cafetería → El Sendero */
applyAll('public/cafeteria.html', [
  ['La Candela', 'El Sendero'],
  ['LA CANDELA', 'EL SENDERO']
]);

/* Comentarios y textos JS */
applyAll('public/js/site.js', [
  ['LA CANDELA', 'EL SENDERO']
]);
applyAll('public/js/receipt.js', [
  ['candela, casco, chaleco', 'casco, chaleco']
]);
applyAll('public/js/admin.js', [
  ['Ritual de las Candelas', 'Ritual de la Cueva']
]);
applyAll('public/css/styles.css', [
  ['Cafetería La Candela', 'Cafetería El Sendero'],
  ['pizarra a la luz de la candela', 'pizarra nocturna']
]);
applyAll('scripts/cafe.css', [
  ['Cafetería La Candela', 'Cafetería El Sendero']
]);
applyAll('scripts/flip-night.css', [
  ['pizarra a la luz de la candela', 'pizarra nocturna']
]);
applyAll('scripts/add-foot.cjs', [
  ['La Candela · K\'anba', 'El Sendero · K\'anba']
]);

console.log('done');
