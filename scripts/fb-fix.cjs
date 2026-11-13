const fs = require('fs');
fs.appendFileSync('public/css/styles.css', fs.readFileSync('scripts/flip-fix.css', 'utf8'));
console.log('fix aplicado');
