const fs = require('fs');
fs.appendFileSync('public/css/styles.css', fs.readFileSync('scripts/fb-extra.css', 'utf8'));
console.log('añadidos ajustes flipbook');
