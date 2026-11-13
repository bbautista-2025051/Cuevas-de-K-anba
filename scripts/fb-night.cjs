const fs = require('fs');
fs.appendFileSync('public/css/styles.css', fs.readFileSync('scripts/flip-night.css', 'utf8'));
console.log('noche aplicada');
