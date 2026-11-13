const fs = require('fs');
const fp = 'public/cafeteria.html';
let html = fs.readFileSync(fp, 'utf8');

const start = html.indexOf('<article class="flip-page" id="page-bebidas"');
if (start < 0) throw new Error('inicio no encontrado');
const end = html.indexOf('</article>', start) + '</article>'.length;

const replacement = `<article class="flip-page" id="page-cafe" data-page="4" aria-label="Café y calientes" hidden>
                <header class="page-head"><span class="page-kicker">tostado en Cobán</span><h3>Café &amp; calientes</h3></header>
                <div class="menu-group">
                  <h4>Café <span>especialidad</span></h4>
                  <ul>
                    <li><span class="item-name">Café en olla<small>piloncillo, canela y naranja</small></span><span class="leader"></span><span class="item-price">Q18</span></li>
                    <li><span class="item-name">Espresso de la casa<small>notas de cacao y nuez</small></span><span class="leader"></span><span class="item-price">Q22</span></li>
                    <li><span class="item-name">Americano</span><span class="leader"></span><span class="item-price">Q24</span></li>
                    <li><span class="item-name">Capuccino <small>o Latte</small></span><span class="leader"></span><span class="item-price">Q28</span></li>
                    <li><span class="item-name">Café vienés<small>crema batida y cacao</small></span><span class="leader"></span><span class="item-price">Q30</span></li>
                    <li><span class="item-name">Chocolate a la taza<small>con churrito de naranja</small><em class="tag tag-veg">VEG</em></span><span class="leader"></span><span class="item-price">Q24</span></li>
                  </ul>
                </div>
                <div class="page-foot" aria-hidden="true"><span>La Candela · K’anba</span></div>
              </article>

              <article class="flip-page" id="page-frias" data-page="5" aria-label="Frías y cosas de la casa" hidden>
                <header class="page-head"><span class="page-kicker">del territorio</span><h3>Frías &amp; cosas de la casa</h3></header>
                <div class="menu-group">
                  <h4>Gaseosas de la casa</h4>
                  <ul>
                    <li><span class="item-name">Agua de jamaica de la casa<em class="tag tag-veg">VEG</em></span><span class="leader"></span><span class="item-price">Q16</span></li>
                    <li><span class="item-name">Limonada de yema<small>con sal o sin ella</small><em class="tag tag-veg">VEG</em></span><span class="leader"></span><span class="item-price">Q14</span></li>
                    <li><span class="item-name">Té frío de hierbabuena y limón<em class="tag tag-veg">VEG</em></span><span class="leader"></span><span class="item-price">Q16</span></li>
                    <li><span class="item-name">Soda de jamaica artesanal<small>de fermentación natural</small><em class="tag tag-veg">VEG</em></span><span class="leader"></span><span class="item-price">Q18</span></li>
                    <li><span class="item-name">Licuado de banano con mantequilla de maní<em class="tag tag-veg">VEG</em></span><span class="leader"></span><span class="item-price">Q30</span></li>
                    <li><span class="item-name">Fresco de sandía con hierbabuena<em class="tag tag-veg">VEG</em></span><span class="leader"></span><span class="item-price">Q16</span></li>
                  </ul>
                </div>
                <div class="page-foot" aria-hidden="true"><span>La Candela · K’anba</span></div>
              </article>

              <article class="flip-page" id="page-alco" data-page="6" aria-label="Alcohólicas" hidden>
                <header class="page-head"><span class="page-kicker">mayores de 18</span><h3>Alcohólicas</h3></header>
                <div class="menu-group">
                  <h4>De la barra <span>solo mayores de 18</span></h4>
                  <ul>
                    <li><span class="item-name">Cerveza artesanal Cahabón<small>lota de trigo con notas cítricas</small></span><span class="leader"></span><span class="item-price">Q42</span></li>
                    <li><span class="item-name">Vino de la casa<small>tinto o blanco · copa</small></span><span class="leader"></span><span class="item-price">Q28</span></li>
                    <li><span class="item-name">Ron Zacapa 4 años</span><span class="leader"></span><span class="item-price">Q35</span></li>
                    <li><span class="item-name">Michelada de jamaica</span><span class="leader"></span><span class="item-price">Q30</span></li>
                    <li><span class="item-name">Margarita del Sendero<small>con sal y un toque de limón verde</small></span><span class="leader"></span><span class="item-price">Q48</span></li>
                  </ul>
                </div>
                <div class="page-foot" aria-hidden="true"><span>La Candela · K’anba</span></div>
              </article>`;

html = html.slice(0, start) + replacement + html.slice(end);
fs.writeFileSync(fp, html, 'utf8');
console.log('bebidas dividida en 3 páginas');
