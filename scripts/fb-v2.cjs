const fs = require('fs');
fs.appendFileSync('public/css/styles.css', fs.readFileSync('scripts/flip-v2.css', 'utf8'));
console.log('v2 aplicado');
