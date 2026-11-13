const fs = require('fs');
const fp = 'public/css/styles.css';
const lines = fs.readFileSync(fp, 'utf8').split(/\r?\n/);
// Keep everything before the "Cafetería · libro del menú" marker block (line 1331 in 1-based).
// Scan for the marker comment start.
const markerIdx = lines.findIndex((l) => l.includes('Cafetería · libro del menú')) - 1;
if (markerIdx < 0) {
  console.error('Marker not found');
  process.exit(1);
}
const kept = lines.slice(0, markerIdx).join('\n');
fs.writeFileSync(fp, kept.trimEnd() + '\n', 'utf8');
console.log('Truncated at line', markerIdx + 1, '→ nueva longitud:', kept.split('\n').length, 'líneas');
