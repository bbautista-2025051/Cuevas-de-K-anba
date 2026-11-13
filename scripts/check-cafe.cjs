const http = require('http');
const paths = ['/', '/tours.html', '/videos.html', '/galeria.html', '/ubicacion.html', '/informacion.html', '/politicas.html', '/reservar.html', '/cafeteria.html', '/cafeteria', '/cafeteria.html', '/api/site'];

function check(p) {
  return new Promise((resolve) => {
    const req = http.get({ host: 'localhost', port: 3000, path: p, timeout: 6000 }, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => resolve({ p, status: res.statusCode, hasCafe: body.includes('Cafetería'), bytes: body.length }));
    });
    req.on('error', (err) => resolve({ p, status: 'ERROR', error: err.message }));
  });
}

(async () => {
  for (const p of new Set(paths)) {
    const r = await check(p);
    console.log(r.p.padEnd(22), String(r.status).padEnd(6), r.bytes ? (r.bytes + ' bytes') : '', r.hasCafe === true ? '[link Cafetería ✓]' : '');
  }
})();
