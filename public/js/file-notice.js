/* ==========================================================================
   Aviso para cuando el sitio se abre directamente como archivo (file://).
   Sin el servidor no hay API ni reservas; los estilos e imágenes sí cargan
   porque las rutas de los HTML son relativas.
   ========================================================================== */
(() => {
  'use strict';
  if (location.protocol !== 'file:') return;

  const wrap = document.createElement('div');
  wrap.dataset.kanbaFileNotice = '1';
  wrap.setAttribute('role', 'status');
  wrap.style.cssText = [
    'position:fixed', 'left:50%', 'bottom:18px', 'transform:translateX(-50%)',
    'z-index:9999', 'max-width:min(560px,92vw)', 'display:flex', 'gap:14px',
    'align-items:center', 'padding:14px 18px', 'border-radius:14px',
    'background:#0e2420', 'color:#f6f1e6', 'font:500 13px/1.5 system-ui,-apple-system,sans-serif',
    'box-shadow:0 18px 40px rgba(0,0,0,.35)', 'border:1px solid rgba(184,217,140,.35)'
  ].join(';');

  const text = document.createElement('span');
  text.innerHTML = '<strong style="color:#b8d98c">Estás abriendo el archivo directamente.</strong><br>'
    + 'Para ver el sitio completo y poder reservar, ejecuta <code style="font-family:ui-monospace,monospace">npm start</code> '
    + 'y entra a <a href="http://localhost:3000" style="color:#b8d98c;text-decoration:underline">localhost:3000</a>.';

  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '\u00d7';
  close.setAttribute('aria-label', 'Cerrar aviso');
  close.style.cssText = 'flex:none;background:transparent;border:0;color:#f6f1e6;font-size:22px;line-height:1;cursor:pointer;padding:0 2px';
  close.addEventListener('click', () => wrap.remove());

  wrap.append(text, close);
  document.body.appendChild(wrap);
})();
