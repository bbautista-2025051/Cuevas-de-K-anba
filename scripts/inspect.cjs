const fs = require('fs');
const lines = fs.readFileSync('public/css/styles.css', 'utf8').split(/\r?\n/);
lines.forEach((line, i) => {
  if (i + 1 >= 1328 && i + 1 <= 1336) {
    console.log(i + 1, JSON.stringify(line));
  }
});
