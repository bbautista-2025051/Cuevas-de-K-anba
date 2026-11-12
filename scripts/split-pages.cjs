const fs = require('fs');
const path = require('path');

const PUB = path.join(__dirname, '..', 'public');
const src = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8');

const bodyStart = src.indexOf('<body>');
const headerEnd = src.indexOf('</header>') + '</header>'.length;
const header = src.substring(bodyStart, headerEnd);

const footerStart = src.indexOf('<footer');
const footerEnd = src.indexOf('</footer>') + '</footer>'.length;
const footer = src.substring(footerStart, footerEnd);

const tailStart = src.indexOf('<!-- Mobile booking bar -->');
const tail = src.substring(tailStart);

const sectionNames = ['HERO', 'MARQUEE', 'INTRO', 'VALUES', 'TOURS', 'BOOKING', 'GALLERY', 'VIDEOS', 'LOCATION', 'INFO', 'POLICIES', 'FAQ', 'CTA'];
const marks = sectionNames.map((n) => `<!-- ${n} -->`);
const mainOpen = src.indexOf('<main id="contenido">');
const mainClose = src.indexOf('</main>') + '</main>'.length;
const main = src.substring(mainOpen, mainClose);

const cuts = marks
  .map((m, i) => ({ name: sectionNames[i], at: main.indexOf(m) }))
  .filter((x) => x.at > -1)
  .sort((a, b) => a.at - b.at);
const ranges = {};
for (let i = 0; i < cuts.length; i++) {
  const from = cuts[i].at;
  const to = i + 1 < cuts.length ? cuts[i + 1].at : main.indexOf('</main>');
  ranges[cuts[i].name] = main.substring(from, to).trimEnd();
}

function page(file, title, description, names) {
  let out = src.substring(0, bodyStart);
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  out = out.replace(/<meta name="description" content="[\s\S]*?">/, `<meta name="description" content="${description}">`);
  out += '\n' + header + '\n\n  <main id="contenido">\n    ' +
    names.map((n) => ranges[n]).filter(Boolean).join('\n\n    ') +
    '\n  </main>\n\n  ' +
    footer + '\n\n  ' +
    tail;

  const rules = [
    [/href="#reservar"/g, 'href="/reservar.html"'],
    [/href="#tours"/g, 'href="/tours.html"'],
    [/href="#galeria"/g, 'href="/galeria.html"'],
    [/href="#videos"/g, 'href="/videos.html"'],
    [/href="#ubicacion"/g, 'href="/ubicacion.html"'],
    [/href="#informacion"/g, 'href="/informacion.html"'],
    [/href="#politicas"/g, 'href="/politicas.html"'],
    [/href="#faq"/g, 'href="/informacion.html#faq"'],
    [/href="#cueva"/g, 'href="/"'],
    [/href="#inicio"/g, 'href="/"'],
    [/href="#contacto"/g, 'href="/#contacto"']
  ];
  for (const [rx, rep] of rules) out = out.replace(rx, rep);
  fs.writeFileSync(path.join(PUB, file), out, 'utf8');
  console.log('written', file, '(' + names.join(', ') + ')');
}

page('index.html', 'Cuevas de K’anba · Lanquín, Alta Verapaz, Guatemala', "Cuevas de río subterráneo en Lanquín, Alta Verapaz. Aventura con guías q’eqchi’, candela y río Cahabón, cerca de Semuc Champey.", ['HERO', 'MARQUEE', 'INTRO', 'VALUES', 'CTA']);
page('tours.html', 'Tours y experiencias · K’anba Cuevas Vivas', 'Todos los tours de K’anba: descripción, duración, horarios, tarifas, cupos y reservas en línea. Guías q’eqchi’ certificados.', ['TOURS', 'CTA']);
page('reservar.html', 'Reserva tu descenso · K’anba Cuevas Vivas', 'Reserva en línea tu entrada a las Cuevas de K’anba: elige tour, fecha, horario y cupos con pago seguro en línea.', ['BOOKING']);
page('galeria.html', 'Galería de fotos · K’anba Cuevas Vivas', 'Fotografías de la cueva, el río Cahabón, la selva de Lanquín y Semuc Champey.', ['GALLERY']);
page('videos.html', 'Videos · K’anba Cuevas Vivas', 'Videos de la experiencia en K’anba: la candela, el agua, la cascada y el paisaje de Lanquín.', ['VIDEOS']);
page('ubicacion.html', 'Cómo llegar · Cuevas de K’anba, Lanquín', 'Ubicación de las Cuevas de K’anba en Lanquín, Alta Verapaz. Mapa interactivo, enlace a Google Maps y Waze.', ['LOCATION']);
page('informacion.html', 'Requisitos y recomendaciones · K’anba Cuevas Vivas', 'Requisitos de ingreso, recomendaciones y restricciones para visitar las Cuevas de K’anba.', ['INFO', 'FAQ']);
page('politicas.html', 'Políticas de reserva, cancelación y reembolso · K’anba Cuevas Vivas', 'Condiciones de reserva en línea, cancelación y reembolso aplicables a K’anba Cuevas Vivas.', ['POLICIES']);
