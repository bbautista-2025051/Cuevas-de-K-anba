const fs = require('fs');
const path = require('path');

const PUB = path.join(__dirname, '..', 'public');
const MAIN = ['index.html', 'tours.html', 'galeria.html', 'videos.html', 'ubicacion.html', 'informacion.html', 'politicas.html', 'reservar.html'];
const TXN = ['pago.html', 'comprobante.html', 'confirmacion.html', 'mi-reserva.html', 'verificar.html'];
const NAV_OLD = '<a href="/politicas.html">Políticas</a>';
const NAV_NEW = '<a href="/politicas.html">Políticas</a>\n        <a href="/cafeteria.html">Cafetería</a>';

let navCount = 0, footCount = 0, txnCount = 0;

for (const file of MAIN) {
  const fp = path.join(PUB, file);
  let txt = fs.readFileSync(fp, 'utf8');
  const navHits = txt.split(NAV_OLD).length - 1;
  if (navHits < 1) { console.warn('SIN NAV en', file); continue; }
  // Reemplazar SOLO el primero (el nav está antes que el footer)
  txt = txt.replace(NAV_OLD, () => { navCount++; return NAV_NEW; });
  // Footer: añadir Cafetería tras Videos
  const FOOT_OLD = '<a href="/videos.html">Videos</a>';
  const FOOT_NEW = '<a href="/videos.html">Videos</a>\n        <a href="/cafeteria.html">Cafetería</a>';
  const footHits = txt.split(FOOT_OLD).length - 1;
  if (footHits >= 1) {
    txt = txt.replace(FOOT_OLD, () => { footCount++; return FOOT_NEW; });
  }
  fs.writeFileSync(fp, txt, 'utf8');
  console.log('actualizado', file);
}

for (const file of TXN) {
  const fp = path.join(PUB, file);
  let txt = fs.readFileSync(fp, 'utf8');
  const hits = txt.split('/#politicas').length - 1;
  if (hits > 0) {
    txt = txt.split('/#politicas').join('/politicas.html');
    txnCount += hits;
    fs.writeFileSync(fp, txt, 'utf8');
    console.log('arreglada la ruta de Políticas en', file);
  }
}
console.log('Resumen: nav +' + navCount, 'foooter +' + footCount, 'rutas /#politicas corregidas:', txnCount);
