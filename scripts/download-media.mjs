import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'public', 'assets', 'img');
await mkdir(out, { recursive: true });

const images = [
  ['kanba-cave-01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/34/Lanquin_Cave_1.jpg/1920px-Lanquin_Cave_1.jpg'],
  ['kanba-cave-02.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e3/Cuevas_de_Lanquin_-_Guatemala.jpg/1920px-Cuevas_de_Lanquin_-_Guatemala.jpg'],
  ['kanba-cave-03.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cb/Cuevas_de_Lanquin_-_Guatemala_2.jpg/1920px-Cuevas_de_Lanquin_-_Guatemala_2.jpg'],
  ['kanba-cave-04.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4c/Gruta_de_Lanq%C3%BAin.jpg/1920px-Gruta_de_Lanq%C3%BAin.jpg'],
  ['kanba-cave-05.jpg', 'https://upload.wikimedia.org/wikipedia/commons/1/16/Entrada_a_la_Gruta_de_Lanq%C3%BAin.jpg'],
  ['kanba-river-01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b9/Cahab%C3%B3n_River%2C_Semuc_Champey%2C_Guatemala.jpg/1920px-Cahab%C3%B3n_River%2C_Semuc_Champey%2C_Guatemala.jpg'],
  ['kanba-river-02.jpg', 'https://upload.wikimedia.org/wikipedia/commons/c/c0/R%C3%ADo_Cahab%C3%B3n_a_su_paso_por_Semuc_Champey.JPG'],
  ['kanba-jungle-01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/40/Semuc_Champey%2C_AV_Guatemala.jpg/1920px-Semuc_Champey%2C_AV_Guatemala.jpg'],
  ['kanba-jungle-02.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/84/Semuc_Champey%2C_AV_Guatemala_%282%29.jpg/1920px-Semuc_Champey%2C_AV_Guatemala_%282%29.jpg'],
  ['kanba-jungle-03.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e5/Semuc_Champey%2C_AV_Guatemala_%283%29.jpg/1920px-Semuc_Champey%2C_AV_Guatemala_%283%29.jpg'],
  ['kanba-pools-01.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Semuc_Champey_1.jpg/1920px-Semuc_Champey_1.jpg'],
  ['kanba-pools-02.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/47/Semuc_Champey_2.jpg/1920px-Semuc_Champey_2.jpg'],
  ['kanba-pools-03.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/35/Semuc_Champey_3.jpg/1920px-Semuc_Champey_3.jpg'],
  ['kanba-pools-04.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Semuc_Champey_4.jpg/1920px-Semuc_Champey_4.jpg'],
  ['kanba-pools-05.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6d/Semuc_Champey_8.jpg/1920px-Semuc_Champey_8.jpg'],
  ['kanba-pools-06.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ac/Semuc_Champey%2C_Guatemala.jpg/1920px-Semuc_Champey%2C_Guatemala.jpg'],
  ['kanba-lanquin-01.jpg', 'https://upload.wikimedia.org/wikipedia/commons/1/16/Lanquin.jpg'],
  ['kanba-lanquin-02.jpg', 'https://upload.wikimedia.org/wikipedia/commons/d/d2/R%C3%ADo_Lanq%C3%BAin.jpg'],
  ['kanba-cave-06.jpg', 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Semuc_Champey_-_Rio_Cahabon_-_Guatemala.jpg'],
  ['kanba-jungle-04.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/82/Semuc_Champey%2C_AV_Guatemala_%285%29.jpg/1920px-Semuc_Champey%2C_AV_Guatemala_%285%29.jpg']
];

for (const [name, url] of images) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'KanbaSiteBuilder/1.0 (educational demo)' } });
    if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(path.join(out, name), buf);
    console.log('ok', name, (buf.length / 1024).toFixed(0) + 'kb');
  } catch (err) {
    console.error('fail', name, err.message);
  }
}
