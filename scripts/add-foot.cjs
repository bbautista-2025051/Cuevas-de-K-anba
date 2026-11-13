const fs = require('fs');
const fp = 'public/cafeteria.html';
let html = fs.readFileSync(fp, 'utf8');
const marker = '</article>';
const insert = '                <div class="page-foot" aria-hidden="true"><span>La Candela · K’anba</span></div>\n              ';
const count = html.split(marker).length - 1;
html = html.split(marker).join(insert + marker);
fs.writeFileSync(fp, html, 'utf8');
console.log('page-foot insertados en', count, 'páginas');
