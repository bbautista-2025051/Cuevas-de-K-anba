const fs = require('fs');
const add = fs.readFileSync('scripts/flipbook.css', 'utf8');
fs.appendFileSync('public/css/styles.css', add, 'utf8');
console.log('CSS añadido. Líneas:', fs.readFileSync('public/css/styles.css', 'utf8').split('\n').length);
