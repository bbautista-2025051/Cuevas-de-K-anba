const fs = require('fs');
const fp = 'public/css/styles.css';
const lines = fs.readFileSync(fp, 'utf8').split(/\r?\n/);
// Keep lines 1..1328 (1-based), i.e. everything before the mojibake marker at 1331.
const kept = lines.slice(0, 1328);
fs.writeFileSync(fp, kept.join('\n').trimEnd() + '\n', 'utf8');
console.log('Truncado. Líneas finales:', kept.length);
