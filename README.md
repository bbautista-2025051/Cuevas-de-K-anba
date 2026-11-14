# K’anba · Cuevas Vivas

Sitio web demostrativo y sistema de reservas para las Cuevas de K’anba, en Lanquín, Alta Verapaz, Guatemala. Incluye sitio público responsive, mapa interactivo, galería, videoteca, catálogo de tours, flujo completo de reserva y pago, correos automáticos y panel administrativo.

> **Aviso:** este proyecto es una demostración educativa. No es el sitio oficial de las Cuevas de K’anba. Las fotografías del entorno provienen de Wikimedia Commons y se usan con sus licencias Creative Commons (CC BY / CC BY-SA).

---

## Índice

- [Características](#características)
- [Requisitos y arranque](#requisitos-y-arranque)
- [Acceso al panel](#acceso-al-panel)
- [Flujo de reserva y pago](#flujo-de-reserva-y-pago)
- [Datos de demostración](#datos-de-demostración)
- [Variables de entorno](#variables-de-entorno)
- [Estructura del proyecto](#estructura-del-proyecto)
- [API](#api)
- [Correos](#correos)
- [Pagos](#pagos)
- [Pruebas y QA](#pruebas-y-qa)
- [Reiniciar los datos](#reiniciar-los-datos)
- [Despliegue en Render (gratis)](#despliegue-en-render-gratis)
- [Notas para producción](#notas-para-producción)

---

## Características

**Sitio público**

- Portada responsive para escritorio, tablet y teléfono.
- Historia, valores, línea de tiempo y presentación de la cueva.
- Catálogo de seis tours con descripción, duración, horarios, días de operación, dificultad, edad mínima, cupo y precio.
- Galería filtrable con lightbox, 18 fotografías locales y créditos.
- Videoteca con seis videos de YouTube (carga diferida y modo sin cookies).
- Mapa Leaflet con marcador, enlaces para abrir la ubicación en Google Maps y Waze.
- Requisitos de ingreso, recomendaciones y restricciones.
- Políticas de reserva, cancelación y reembolso, preguntas frecuentes y datos de contacto.
- Reserva en línea con selección de tour, fecha, horario y participantes; disponibilidad real y total automático.
- Bloqueo temporal de cupos durante el pago, con liberación automática al vencer el plazo.
- Páginas de pago, confirmación, comprobante imprimible, consulta de reserva y verificación pública de comprobantes.
- Consulta por código + correo o por enlace privado con token; cancelación desde la página de la reserva y aviso de reembolso según política.

**Panel administrativo**

- Inicio de sesión con contraseña y cookie de sesión `HttpOnly`, `SameSite=Strict`.
- Resumen con indicadores, gráfico de reservas y ocupación por tour.
- Búsqueda y filtro de reservas, detalle completo, confirmación manual de pago y reenvío de correos.
- Cancelación con registro de reembolso manual o automático según la política.
- Calendario de disponibilidad y cierres por fecha/tour.
- CRUD de tours (crear, editar, archivar) y editor de contenido por secciones.
- Gestión de galería: subida de imágenes, URL externa, edición, eliminación y guardado.
- Gestión de videos, bandeja de correos, procesamiento de reembolsos y configuración general.
- Cambio de contraseña desde el panel.
- Navegación lateral adaptable con menú fuera de pantalla en teléfonos.

---

## Requisitos y arranque

- **Node.js 20 o superior** (probado con Node 24).
- **Modo local sin dependencias**: con el archivo `data/db.json` no hace falta `npm install`. Para usar PostgreSQL (recomendado en la nube) ejecuta `npm install`; solo se instala `pg`.
- Mapas y medios se sirven localmente; solo los videos incrustados y las fuentes usan recursos externos.

```bash
npm start
# o bien
node server/index.js
```

Abrir:

- Sitio público: <http://localhost:3000>
- Panel: <http://localhost:3000/admin.html>
- Verificación de comprobantes: <http://localhost:3000/verificar.html>
- Consulta de reserva: <http://localhost:3000/mi-reserva.html>

Para desarrollo con recarga automática del servidor:

```bash
npm run dev
```

La primera ejecución crea `data/db.json` con contenido, tours, ajustes y cinco reservas de ejemplo.

---

## Acceso al panel

| Campo | Valor de demostración |
| --- | --- |
| URL | `/admin.html` |
| Contraseña | `kanba2026` |

La contraseña se guarda con hash `scrypt` en `data/db.json`. Puedes cambiarla desde **Configuración → Actualizar contraseña**.

---

## Flujo de reserva y pago

1. El visitante elige tour, fecha, horario y cantidad de participantes.
2. Al enviar el formulario se crea una reserva con código único `KAN-AAAA-#####` y token privado.
3. Los cupos quedan bloqueados durante `booking.holdMinutes` (20 minutos por defecto).
4. El visitante paga en `/pago.html` con la pasarela sandbox.
5. Si el pago se aprueba:
   - la reserva pasa a `confirmed`;
   - se genera el comprobante `REC-AAAA-#####`;
   - se registran los correos de confirmación y comprobante.
6. Si el pago falla, la reserva sigue pendiente y puede reintentarse mientras el bloqueo esté vigente.
7. Un worker cada 15 segundos marca como `expired` las reservas pendientes cuyo plazo venció, libera los cupos y envía el correo correspondiente.
8. La cancelación aplica la política configurada:
   - 100 % hasta 72 horas antes;
   - 50 % entre 72 y 24 horas antes;
   - 0 % con menos de 24 horas.
9. Cada cancelación y reembolso queda registrado con folio, importe, porcentaje, método, fecha y estado.

### Tarjetas de prueba

| Número | Resultado |
| --- | --- |
| `4242 4242 4242 4242` | Pago aprobado |
| Cualquier tarjeta con Luhn válido | Aprobada (sandbox) |
| Terminación `0002` | Rechazo: fondos insuficientes |
| Terminación `0003` | Rechazo: autenticación requerida |
| `4000 0000 0000 0069` | Rechazo: tarjeta vencida |

Usa cualquier nombre, una fecha futura `MM/AA` y un CVC de 3 o 4 dígitos. No se procesan cargos reales.

---

## Datos de demostración

El archivo `data/db.json` se crea al primer arranque e incluye:

- Contenido completo del sitio en español.
- Seis tours: `candela`, `esencial`, `semuc`, `nocturna`, `privado` y `suave`.
- 18 imágenes y 6 videos.
- Cinco reservas de ejemplo que cubren los estados `confirmed`, `pending_payment`, `cancelled` y `expired`, incluido un reembolso procesado.
- Cinco correos de ejemplo en la bandeja de salida.

Los correos se guardan como archivos `.eml` en `data/outbox/` y también se listan en **Panel → Correos**. En Render Free los `.eml` son efímeros; la copia que importa vive en la base de datos y se ve en el panel.

---

## Variables de entorno

| Variable | Predeterminado | Descripción |
| --- | --- | --- |
| `PORT` | `3000` | Puerto HTTP. Render lo asigna automáticamente. |
| `HOST` | `0.0.0.0` | Interfaz de escucha. |
| `ADMIN_PASSWORD` | `kanba2026` | Contraseña usada solo al crear la base por primera vez. |
| `FORCE_ADMIN_PASSWORD` | — | Con `1`, vuelve a aplicar `ADMIN_PASSWORD` al arrancar. |
| `PUBLIC_URL` | `http://localhost:3000` | URL base usada en enlaces de correos. También se puede configurar en el panel (`business.siteUrl`). |
| `RENDER_EXTERNAL_URL` | — | Render la define sola; se usa como `PUBLIC_URL` si esta no existe. |
| `DATABASE_URL` | — | Cadena de conexión PostgreSQL. En el Blueprint se inyecta sola desde `kanba-db` (Render Postgres). Si existe, la app guarda todo en Postgres; es lo que permite persistencia en Render Free. |
| `PGSSLMODE` | — | Con `disable` desactiva SSL (solo para PostgreSQL local sin TLS). |
| `DATA_DIR` | `./data` | Modo archivo: carpeta de `db.json` y `outbox/`. También sirve para montar un disco de pago. |
| `UPLOADS_DIR` | `./public/uploads` | Modo archivo: carpeta de imágenes subidas desde el panel. |

Ejemplo en PowerShell:

```powershell
$env:PORT = "8080"
$env:PUBLIC_URL = "https://reservas.ejemplo.gt"
node server/index.js
```

---

## Estructura del proyecto

```text
.
├── package.json
├── README.md
├── render.yaml               # Blueprint de Render (plan Free + PostgreSQL externo)
├── data/                     # modo archivo local (se ignora si hay DATABASE_URL)
│   ├── db.json               # contenido, tours, reservas, ajustes, sesiones
│   └── outbox/               # correos generados en formato .eml
├── public/
│   ├── index.html            # sitio público
│   ├── admin.html            # panel administrativo
│   ├── pago.html             # checkout
│   ├── confirmacion.html     # resultado del pago
│   ├── comprobante.html      # recibo imprimible
│   ├── mi-reserva.html       # consulta y gestión de reservas
│   ├── verificar.html        # verificación pública de comprobantes
│   ├── css/
│   │   ├── styles.css        # estilos del sitio público
│   │   ├── pages.css         # subpáginas, checkout y reglas de impresión
│   │   └── admin.css         # panel administrativo
│   ├── js/
│   │   ├── site.js           # UI pública, reserva, galería, videos y mapa
│   │   ├── checkout.js
│   │   ├── confirmation.js
│   │   ├── receipt.js
│   │   ├── reservation.js
│   │   ├── verify.js
│   │   └── admin.js
│   ├── assets/               # imágenes, favicon y créditos
│   ├── uploads/              # imágenes subidas desde el panel
│   └── vendor/leaflet/       # Leaflet local
├── scripts/
│   ├── e2e-admin.mjs         # prueba de contenido, ajustes y subida de imágenes
│   ├── e2e-expiry.mjs        # prueba de expiración y liberación de cupos
│   ├── responsive-check.mjs  # QA de desbordamiento y navegación responsive
│   ├── clean-test-data.mjs   # limpieza puntual de datos de prueba
│   ├── css-check.mjs
│   └── download-media.mjs
└── server/
    ├── index.js              # servidor HTTP, rutas, auth, pagos, worker
    ├── store.js              # semillas, persistencia y lógica de reservas
    ├── gateway.js            # adaptador de pasarela sandbox
    ├── mailer.js             # plantillas y registro de correos
    ├── smtp.js               # cliente SMTP nativo opcional
    └── security.js           # hash de contraseña, tokens y firmas
```

---

## API

### Públicas

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/health` | Estado del servicio. |
| `GET` | `/api/site` | Contenido público, tours, galería, videos y ajustes visibles. |
| `GET` | `/api/availability?tour=&from=&days=` | Disponibilidad por tour y fecha (máximo 45 días). |
| `POST` | `/api/reservations` | Crea una reserva y bloquea cupos. |
| `POST` | `/api/reservations/lookup` | Busca por código y correo del titular. |
| `GET` | `/api/reservations/:code?token=` | Detalle con enlace privado. |
| `POST` | `/api/reservations/:code/cancel` | Cancela y calcula el reembolso. |
| `POST` | `/api/payments/:intentId/pay` | Procesa el pago sandbox. |
| `GET` | `/api/receipt/:code?token=` | Comprobante digital. |
| `GET` | `/api/verify/:code` | Verificación pública de un comprobante. |
| `POST` | `/api/webhooks/payments` | Webhook firmado de la pasarela. |

### Administrativas

Requieren cookie de sesión. Prefijo `/api/admin/`:

- `POST /login`, `POST /logout`, `GET /me`
- `GET /overview`
- `GET /reservations`, `GET /reservations/:code`
- `POST /reservations/:code/confirm`
- `POST /reservations/:code/cancel`
- `POST /reservations/:code/resend`
- `GET /emails`
- `GET /refunds`, `POST /refunds/:id/process`
- `GET /tours`, `POST /tours`, `PUT /tours/:id`, `DELETE /tours/:id`
- `GET /closures`, `POST /closures`, `DELETE /closures/:id`
- `GET /availability`, `GET /report`
- `GET /content`, `PUT /content`
- `GET /settings`, `PUT /settings`
- `POST /password`
- `POST /media`

La autenticación usa la cookie `kanba_session` (`HttpOnly`, `SameSite=Strict`, 8 horas). El contenido se guarda bajo `{ "content": { ... } }` y los ajustes bajo `{ "settings": { ... } }`.

---

## Correos

Sin SMTP configurado, todos los correos se registran en:

- `data/outbox/*.eml` (archivo completo con encabezados y HTML).
- **Panel → Correos**, con vista previa y reenvío.

Para envío real, configura en **Panel → Configuración → SMTP**:

- host y puerto;
- TLS/SSL;
- usuario y contraseña;
- correo y nombre del remitente.

El cliente SMTP es nativo (`server/smtp.js`), compatible con servidores que aceptan `AUTH LOGIN` sobre TLS. Si el envío falla, el correo se conserva en la bandeja de salida y el error se registra en consola.

Plantillas incluidas: reserva pendiente, confirmación, comprobante, expiración, cancelación y reembolso.

---

## Pagos

La pasarela está aislada en `server/gateway.js` con este contrato:

```js
createIntent(reservation) -> { intentId, provider, status, amount, currency }
charge({ reservation, card, provider }) -> {
  approved, code, message, brand, last4, reference, amount, currency
}
```

Para integrar una pasarela real (Stripe, Recurrente, BAC Credomatic, etc.):

1. Sustituye `charge()` por la llamada del proveedor y conserva la forma del resultado.
2. Usa el webhook `/api/webhooks/payments` para confirmar pagos de forma asíncrona; ya valida la firma HMAC con `settings.payments.webhookSecret`.
3. Guarda las llaves reales en **Configuración → Pagos** o en variables de entorno del proceso.
4. Nunca almacenes números completos de tarjeta: el modelo solo conserva marca y últimos cuatro dígitos.
5. Sirve el sitio por HTTPS antes de aceptar pagos reales.

---

## Pruebas y QA

Con el servidor en ejecución:

```bash
# Contenido, ajustes y subida de imágenes (requiere el servidor)
node scripts/e2e-admin.mjs

# QA responsive con Chrome headless (escritorio, tablet y teléfono)
node scripts/responsive-check.mjs

# Expiración de cupos
node scripts/e2e-expiry.mjs create
# detener el servidor, poner holdExpiresAt en el pasado y reiniciar
node scripts/e2e-expiry.mjs check <codigo> <token>
```

También se verificó manualmente:

- reserva completa desde la interfaz;
- pago aprobado y rechazado;
- generación de comprobante y verificación pública;
- consulta por enlace privado y cancelación;
- creación, edición y borrado de tours;
- guardado de contenido y ajustes desde el panel;
- carga, publicación y eliminación de imágenes de galería;
- navegación responsive del sitio y del panel;
- liberación automática de cupos por vencimiento.

---

## Reiniciar los datos

Detén el servidor y elimina la base y la bandeja de salida:

```powershell
Remove-Item data\db.json
Remove-Item data\outbox\* -ErrorAction SilentlyContinue
node server/index.js
```

Se volverán a crear el contenido, los tours y las cinco reservas de ejemplo. Las imágenes subidas a `public/uploads/` no se eliminan automáticamente; puedes borrarlas si ya no están referenciadas.

---

## Despliegue en Render (gratis)

El `render.yaml` del repositorio crea **dos recursos en un solo Blueprint**: un **Web Service Free** (sitio público, panel y API) y una **Render Postgres Free** (`kanba-db`). Render conecta la base al servicio mediante `DATABASE_URL`; no hay que crear nada a mano ni usar otro proveedor.

Como el filesystem de un Web Service Free es efímero, el `db.json` y las imágenes no pueden vivir en disco: se guardan en Postgres.

### Arquitectura

```text
Blueprint de Render
├── Web Service Free (Node 22 · npm start · sin disco)
│   └── public/          → sitio, panel y assets (desde el repo)
└── Render Postgres Free (kanba-db)
    ├── kanba_store      → documento completo: contenido, tours, reservas, sesiones
    └── kanba_media      → imágenes subidas desde el panel
```

Sin `DATABASE_URL` la app sigue usando `data/db.json` (modo local); en Render eso perdería los datos en cada reinicio.

### 1. Desplegar el Blueprint

1. Sube los cambios a GitHub (rama `main`).
2. En Render: **New + → Blueprint**.
3. Elige el repositorio `bbautista-2025051/Cuevas-de-K-anba`.
4. Nombre: `cuevas-de-kanba` · Branch: `main` · Blueprint Path: `render.yaml`.
5. En la revisión verás **1 Web Service Free**, **1 Postgres Free** (`kanba-db`) y una sola variable pendiente:
   - **ADMIN_PASSWORD**: escribe la contraseña del panel en producción.
   No hay que pegar ninguna cadena de conexión: Render inyecta `DATABASE_URL` desde la base del Blueprint.
6. Pulsa **Deploy Blueprint**. Render crea primero la base y después el servicio.
7. El build ejecuta `npm install --omit=dev` (instala `pg`) y arranca con `npm start`. En el primer arranque se crean las tablas y se siembran el contenido y los tours.

### 2. Verificar

- Salud: `https://<servicio>.onrender.com/api/health`
- Sitio: `https://<servicio>.onrender.com`
- Panel: `https://<servicio>.onrender.com/admin.html`
- **Prueba de persistencia:** sube una imagen o edita un tour, luego **Manual Deploy → Restart service**; el cambio debe seguir ahí. Eso confirma que Postgres está conectado.

### 3. Límites y caducidad del plan Free

**Web Service Free**

- 750 horas de instancia al mes. El servicio **se duerme a los 15 minutos sin tráfico** y tarda ~30–60 s en despertar; es normal.
- Sin disco persistente: las imágenes subidas se guardan en la tabla `kanba_media`, no en el filesystem.
- Usa **una sola instancia**: las sesiones y el documento se manejan en memoria; varias instancias se pisarían.
- El dominio personalizado y el HTTPS también funcionan en el plan Free.

**Render Postgres Free (`kanba-db`)**

- **1 GB fijo** de almacenamiento y **solo una base Free por workspace**.
- **Expira 30 días después de crearla.** A partir de ahí queda inaccesible, pero tienes **14 días de gracia** para pasarla a un plan pago sin perder datos. Si no la actualizas, Render la **elimina con todo su contenido**.
- Sin respaldos automáticos ni recuperación a un punto en el tiempo.
- Render puede reiniciarla o hacer mantenimiento en cualquier momento (breve indisponibilidad).
- Render envía correos de aviso antes del vencimiento y antes de que termine la gracia.

> Para una demo o entrega dentro de ese mes no cuesta nada. Si necesitas que siga viva, actualiza la base a un plan pago antes de que termine la gracia: los datos se conservan. Si no quieres pagar, usa una base gratuita sin caducidad (Neon, Supabase) y define `DATABASE_URL` a mano, como se explica más abajo.

### 4. Actualizaciones y operación

- Cada `git push` a `main` redepliega automáticamente.
- **Ver la base:** en Render abre `kanba-db` → **Connect** y copia el comando `psql` o la *External Database URL*.
- **Reiniciar datos:** con `psql` sobre la base ejecuta `DELETE FROM kanba_store; DELETE FROM kanba_media;` y reinicia el servicio; se vuelve a sembrar la base.
- **Respaldo:** la base Free no tiene respaldos automáticos. Exporta con `pg_dump "<external database url>" > kanba.sql`.
- Para cambiar la contraseña sin borrar datos: **Panel → Configuración → Actualizar contraseña**, o define `FORCE_ADMIN_PASSWORD=1` + `ADMIN_PASSWORD`, reinicia una vez y luego quita `FORCE_ADMIN_PASSWORD`.

### Probar el modo PostgreSQL en local

```powershell
$env:DATABASE_URL = "postgresql://usuario:clave@host:5432/kanba"
$env:PGSSLMODE = "disable"   # solo si tu Postgres local no usa TLS
$env:ADMIN_PASSWORD = "una-clave-segura"
$env:PORT = "8080"
npm install
npm start
```

### Alternativas sin caducidad

- **Neon / Supabase / Aiven (gratis):** crea la base, copia su cadena de conexión y, en `render.yaml`, borra el bloque `databases:` y cambia `DATABASE_URL` por `sync: false`. Al desplegar, pega la cadena en el panel. Luego ajusta `region` si quieres acercarla a la base.
- **Disco persistente (plan pago):** plan Starter + disco de 1 GB montado en `/var/data`, con `DATA_DIR=/var/data` y `UPLOADS_DIR=/var/data/uploads`, y sin `DATABASE_URL`. Cuesta aparte del plan del servicio. El proyecto soporta ambos modos sin cambios de código.

---

## Notas para producción

Esta implementación es una demo funcional, no un sistema listo para producción sin ajustes:

- Cambia la contraseña de demostración y usa `ADMIN_PASSWORD` + `FORCE_ADMIN_PASSWORD=1` en el primer arranque.
- Sirve el sitio detrás de HTTPS y un proxy inverso (Caddy, Nginx, IIS).
- Sustituye la pasarela sandbox por una real y configura el webhook firmado.
- Configura SMTP real y verifica SPF, DKIM y DMARC del dominio remitente.
- Haz respaldos de la base PostgreSQL (`pg_dump` de `DATABASE_URL`) y de `data/` si usas el modo archivo local. La base Free de Render no tiene respaldos y caduca a los 30 días.
- Revisa las políticas, requisitos y precios con la operación real antes de publicar.
- Con `DATABASE_URL` la persistencia es PostgreSQL; sin ella es un archivo JSON con escritura atómica, suficiente para demo y bajo tráfico.
- Las imágenes subidas en modo PostgreSQL viven en la tabla `kanba_media`; para mucho volumen conviene almacenamiento de objetos (S3, Cloudflare R2, etc.).
- El limitador de intentos de login es en memoria; con varias instancias usa un almacén compartido.
- Revisa la licencia y los créditos de cada fotografía antes de un uso comercial.
