const http = require('http');
const pages = ['/', '/tours.html', '/reservar.html', '/galeria.html', '/videos.html', '/ubicacion.html', '/informacion.html', '/politicas.html', '/tours', '/reservar', '/galeria', '/videos', '/ubicacion', '/informacion', '/politicas', '/api/site', '/js/site.js'];

function check(p) {
  return new Promise((resolve) => {
    const req = http.get({ host: 'localhost', port: 3000, path: p, timeout: 5000 }, (res) => {
      let size = 0;
      res.on('data', (d) => { size += d.length; });
      res.on('end', () => resolve({ p, status: res.statusCode, size }));
    });
    req.on('error', (err) => resolve({ p, status: 'ERROR', error: err.message }));
  });
}

(async () => {
  for (const p of pages) {
    const r = await check(p);
    console.log(`${r.p} -> ${r.status}${r.size ? ' (' + r.size + ' bytes)' : ''}`);
  }
})();
