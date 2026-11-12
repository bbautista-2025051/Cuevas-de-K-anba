const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push({ file: path.relative('.', full), bytes: fs.statSync(full).size });
  }
  return out;
}

const items = walk(path.join('.', 'public', 'assets')).sort((a, b) => b.bytes - a.bytes);
for (const item of items.slice(0, 15)) {
  console.log((item.bytes / 1024 / 1024).toFixed(2) + ' MB  ' + item.file);
}
console.log('\nTotal assets:', (items.reduce((s, i) => s + i.bytes, 0) / 1024 / 1024).toFixed(2) + ' MB');
