import { readFileSync } from 'node:fs';
import path from 'node:path';
const css = readFileSync(path.resolve(import.meta.dirname, '..', 'public', 'css', 'styles.css'), 'utf8');
console.log('lines', css.split('\n').length, 'chars', css.length);
