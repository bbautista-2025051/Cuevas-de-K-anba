import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { hashPassword, randomToken } from './security.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
// En producción (por ejemplo Render) DATA_DIR apunta al disco persistente.
export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const DB_FILE = path.join(DATA_DIR, 'db.json');
const OUTBOX_DIR = path.join(DATA_DIR, 'outbox');

export const TZ = 'America/Guatemala';

/* ------------------------------------------------------------------ */
/* Date helpers (Guatemala = UTC-6 all year, no DST)                   */
/* ------------------------------------------------------------------ */

export function todayISO(offsetDays = 0) {
  const now = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);
}

export function isoAddDays(days) {
  return todayISO(days);
}

export function dateToEpoch(date, time = '00:00') {
  return Date.parse(`${date}T${time}:00-06:00`);
}

export function nowMs() {
  return Date.now();
}

export function dayOfWeek(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function formatDateLong(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('es-GT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

export function formatDateShort(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('es-GT', {
    day: '2-digit', month: 'short', timeZone: 'UTC'
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/* ------------------------------------------------------------------ */
/* Seed                                                               */
/* ------------------------------------------------------------------ */

const GALLERY = [
  ['kanba-cave-01.jpg', 'Luz frontal sobre la roca caliza', 'cueva', 'Wikimedia Commons · CC BY-SA 3.0'],
  ['kanba-cave-02.jpg', 'Galería húmeda del karst de Lanquín', 'cueva', 'Wikimedia Commons · CC BY 2.0'],
  ['kanba-cave-03.jpg', 'Formaciones y sombras del río subterráneo', 'cueva', 'Wikimedia Commons · CC BY 2.0'],
  ['kanba-cave-04.jpg', 'El techo de piedra y sus pliegues', 'cueva', 'Wikimedia Commons · CC BY-SA 4.0'],
  ['kanba-cave-05.jpg', 'La boca de la cueva, umbral entre dos mundos', 'cueva', 'Wikimedia Commons · CC BY-SA 4.0'],
  ['kanba-cave-06.jpg', 'El Cahabón reaparece entre las rocas', 'cueva', 'Wikimedia Commons · CC BY 2.0'],
  ['kanba-river-01.jpg', 'Aguas turquesa del Cahabón', 'rio', 'Wikimedia Commons · CC BY-SA 3.0'],
  ['kanba-river-02.jpg', 'El río Cahabón a su paso por Semuc Champey', 'rio', 'Wikimedia Commons · CC BY 3.0'],
  ['kanba-jungle-01.jpg', 'Selva húmeda de Alta Verapaz', 'selva', 'Wikimedia Commons · CC BY 2.0'],
  ['kanba-jungle-02.jpg', 'El verde profundo de la montaña', 'selva', 'Wikimedia Commons · CC BY 2.0'],
  ['kanba-jungle-03.jpg', 'Sendero entre helechos y roca', 'selva', 'Wikimedia Commons · CC BY 2.0'],
  ['kanba-jungle-04.jpg', 'El bosque que guarda el río', 'selva', 'Wikimedia Commons · CC BY 2.0'],
  ['kanba-pools-01.jpg', 'Pozas escalonadas de Semuc Champey', 'semuc', 'Wikimedia Commons · CC BY-SA 4.0'],
  ['kanba-pools-02.jpg', 'El puente natural de piedra caliza', 'semuc', 'Wikimedia Commons · CC BY-SA 4.0'],
  ['kanba-pools-03.jpg', 'Agua clara sobre el puente de roca', 'semuc', 'Wikimedia Commons · CC BY-SA 4.0'],
  ['kanba-pools-04.jpg', 'Piscinas naturales en la selva', 'semuc', 'Wikimedia Commons · CC BY-SA 4.0'],
  ['kanba-pools-05.jpg', 'El mirador sobre las pozas', 'semuc', 'Wikimedia Commons · CC BY-SA 4.0'],
  ['kanba-pools-06.jpg', 'Un santuario de agua turquesa', 'semuc', 'Wikimedia Commons · CC BY-SA 3.0']
].map(([src, caption, category, credit], i) => ({
  id: `img_${String(i + 1).padStart(2, '0')}`,
  src: `/assets/img/${src}`,
  caption,
  category,
  credit
}));

const VIDEOS = [
  {
    id: 'vid_01',
    youtubeId: 'kZusYOYxpA8',
    title: 'K’anba: cuevas y río Cahabón',
    description: 'Un recorrido audiovisual por los pasadizos, el río subterráneo y el entorno de Semuc Champey.',
    category: 'Cueva'
  },
  {
    id: 'vid_02',
    youtubeId: 'vjk9xwiBmMs',
    title: 'La cueva de los Goonies',
    description: 'Así se siente avanzar a oscuras, con luz frontal al cuello, entre roca y agua.',
    category: 'Aventura'
  },
  {
    id: 'vid_03',
    youtubeId: 'Ia55CKzelwk',
    title: 'Semuc Champey desde el mirador',
    description: 'La vista que explica por qué este rincón de Alta Verapaz es irrepetible.',
    category: 'Entorno'
  },
  {
    id: 'vid_04',
    youtubeId: 'dG2SJhAwo1s',
    title: 'Saltos, cuevas y tubing',
    description: 'La combinación clásica: cueva, cascada, columpio y flotada por el Cahabón.',
    category: 'Aventura'
  },
  {
    id: 'vid_05',
    youtubeId: '-hWjchb0uFI',
    title: 'Cobán y Lanquín en ruta',
    description: 'El camino hacia las cuevas: montaña, neblina y comunidades q’eqchi’.',
    category: 'Ruta'
  },
  {
    id: 'vid_06',
    youtubeId: 'CCIO_iSdJVI',
    title: 'Guía de viaje: Semuc Champey',
    description: 'Consejos prácticos para combinar las pozas, el mirador y la cueva en un solo día.',
    category: 'Guía'
  }
];

function defaultContent() {
  return {
    brand: {
      name: 'K’anba',
      sub: 'Cuevas Vivas',
      tagline: 'Donde el río se esconde',
      claim: 'Una aventura de agua, piedra y el río en el corazón de Alta Verapaz.'
    },
    hero: {
      kicker: 'Lanquín · Alta Verapaz · Guatemala',
      title: 'K’anba',
      subtitle: 'Donde el río se esconde.',
      text: 'Entra a una cueva viva de río subterráneo. Con una vela en la mano, el sonido del agua y un guía q’eqchi’, cruzarás pasadizos, cascadas y pozas de luz imposible. A minutos de Semuc Champey.',
      image: '/assets/img/kanba-cave-02.jpg',
      imageAlt: 'Interior de una cueva de Lanquín iluminada con luz frontal',
      badge: 'Cupos limitados · 12 personas por grupo',
      openText: 'Abierto todos los días · 08:00 a 17:00',
      rating: '4.9',
      reviews: '312'
    },
    intro: {
      kicker: 'La cueva',
      title: 'Un río que corre bajo la montaña',
      lead: 'K’anba es una cueva de río, no un salón iluminado. Aquí el agua marca el camino: a veces a los tobillos, a veces al pecho. La piedra caliza se abre en galerías de cinco a diez metros de ancho y el Cahabón sigue su viaje secreto bajo la selva.',
      paragraphs: [
        'El sistema explorado supera los 3.3 kilómetros, aunque la visita guiada recorre los primeros 400 metros: un tramo seguro, profundo y lleno de formas que la luz frontal convierte en otra cosa. Al salir, el río te devuelve a la superficie y puedes flotar en cámara lenta por el Cahabón.',
        'Para el pueblo q’eqchi’, la cueva no es solo un atractivo: es un umbral. El agua, la oscuridad y las formaciones de piedra han sido parte de su cosmovisión durante generaciones. Nuestros guías son locales y comparten esa lectura del territorio en cada grupo.',
        'En 2004, espeleólogos guatemaltecos con apoyo de colegas estadounidenses exploraron y levantaron el sistema; el trabajo de topografía concluyó en marzo de 2005. Hoy la visita se hace en grupos pequeños, con equipo de seguridad y reglas claras para proteger el ecosistema.'
      ],
      stats: [
        { value: '3.3', suffix: ' km', label: 'de galerías exploradas' },
        { value: '400', suffix: ' m', label: 'de recorrido guiado' },
        { value: '90', suffix: '%', label: 'del trayecto es agua' },
        { value: '12', suffix: '', label: 'personas máximo por grupo' }
      ],
      image: '/assets/img/kanba-cave-04.jpg',
      image2: '/assets/img/kanba-river-01.jpg'
    },
    values: [
      {
        icon: 'flame',
        title: 'El silencio es el sendero',
        text: 'Sin luz eléctrica dentro de la cueva. Una linterna frontal por persona, un guía al frente y una cuerda que une al grupo. La oscuridad no se atraviesa: se escucha.'
      },
      {
        icon: 'water',
        title: 'El río dicta el paso',
        text: 'Caminas, te sostienes de la roca y nadas tramos cortos. Hay una cascada que se sube con cuerda y saltos opcionales a pozas profundas. Se siente más de lo que se ve.'
      },
      {
        icon: 'leaf',
        title: 'Custodia q’eqchi’',
        text: 'Guías de comunidades de Lanquín lideran cada expedición. Parte del ingreso se destina a conservación, mantenimiento de senderos y educación ambiental local.'
      }
    ],
    timeline: [
      { year: '2004', title: 'Primera gran exploración', text: 'Espeleólogos guatemaltecos, con apoyo internacional, documentan las galerías y el río interior.' },
      { year: '2005', title: 'Levantamiento topográfico', text: 'En marzo concluye la topografía del sistema, que supera los 3.3 km de desarrollo conocido.' },
      { year: '2010', title: 'Turismo de aventura', text: 'La cueva se integra a las rutas de Semuc Champey. Nacen los recorridos de aventura y el tubing.' },
      { year: 'Hoy', title: 'Turismo comunitario', text: 'Grupos pequeños, guías locales y reglas de conservación para que la cueva siga viva.' }
    ],
    toursIntro: {
      kicker: 'Experiencias',
      title: 'Elige cómo entrar a la cueva',
      text: 'Cinco formas de vivir K’anba. Todas incluyen guía local certificado, casco, chaleco salvavidas y entrada. Los cupos se confirman al pagar.'
    },
    bookingIntro: {
      kicker: 'Reserva en línea',
      title: 'Tu lugar bajo tierra',
      text: 'Selecciona experiencia, fecha, horario y participantes. Bloqueamos tus cupos por 20 minutos mientras completas el pago.'
    },
    galleryIntro: {
      kicker: 'Archivo visual',
      title: 'La cueva, el río y la selva',
      text: 'Una colección de imágenes del karst de Lanquín, el Cahabón y Semuc Champey. Fotografías de referencia del entorno y del sistema subterráneo.'
    },
    videosIntro: {
      kicker: 'En movimiento',
      title: 'Antes de entrar, mírala',
      text: 'Seis ventanas a la experiencia: el río, la selva y la cascada y el paisaje que rodea la cueva.'
    },
    mapIntro: {
      kicker: 'Cómo llegar',
      title: 'Un desvío antes del puente',
      text: 'K’anba está sobre la ruta a Semuc Champey, en Lanquín. Si vienes desde Cobán, el último tramo es de terracería: recomendamos doble tracción o transporte local.',
      address: 'Cuevas de K’anba, Lanquín, Alta Verapaz, Guatemala',
      lat: 15.537628,
      lng: -89.955361,
      plusCode: 'G2QV+3V2 Chicanutz, Guatemala',
      directions: [
        { label: 'Desde Lanquín', value: '11 km · 25–35 min en pickup o 4x4' },
        { label: 'Desde Semuc Champey', value: '10 min caminando · 400 m antes del puente' },
        { label: 'Desde Cobán', value: '80 km · 2 h aprox. (último tramo de terracería)' },
        { label: 'Desde Ciudad de Guatemala', value: '294 km · 5–6 h por CA-14' }
      ],
      note: 'No cruces el puente principal hacia Semuc Champey: el acceso a K’anba está antes, a la derecha. Hay parqueo comunitario y recepción.'
    },
    infoIntro: {
      kicker: 'Antes de bajar',
      title: 'Prepárate bien. La cueva no perdona la prisa.',
      text: 'K’anba es una aventura acuática real. Lee los requisitos, las recomendaciones y las restricciones antes de reservar. Si tienes dudas de salud, consulta a tu médico.'
    },
    requirements: [
      'Edad mínima: 8 años acompañados por un adulto; 12 años para el recorrido completo sin acompañamiento permanente.',
      'Saber nadar o usar chaleco salvavidas (obligatorio en todos los tramos profundos).',
      'Condición física moderada: caminar sobre roca húmeda, agacharse, trepar y nadar distancias cortas.',
      'Firmar la carta de responsabilidad y aceptar las instrucciones del guía antes de entrar.',
      'Presentar documento de identidad o pasaporte en recepción (puede ser digital).',
      'Llegar 20 minutos antes del horario reservado para equipo y briefing.',
      'Calzado cerrado con agarre que se pueda mojar. No se permite entrar descalzo ni con chanclas sueltas.',
      'Para menores de edad: autorización firmada por madre, padre o tutor legal.'
    ],
    recommendations: [
      'Viaja en temporada seca (noviembre a abril) para agua más clara y senderos más firmes.',
      'Elige el primer horario del día: menos calor, menos gente y mejor luz para fotos al salir.',
      'Lleva ropa de cambio completa, toalla y una bolsa impermeable para el teléfono.',
      'Usa protector solar y repelente biodegradables; se aplican antes de entrar, no dentro de la cueva.',
      'Lleva efectivo en billetes pequeños para transporte, propinas y compras locales. No hay cajero en el parque.',
      'Come algo ligero antes del tour. Evita comidas pesadas y alcohol.',
      'Si usas lentes de contacto, considera gafas de agua o una correa de sujeción.',
      'Respeta los lugares sagrados q’eqchi’ y pide permiso antes de fotografiar a personas de la comunidad.'
    ],
    restrictions: [
      'No se permite el ingreso a personas embarazadas, con problemas cardíacos, epilepsia no controlada, claustrofobia severa o lesiones recientes.',
      'Prohibido el alcohol y las drogas antes o durante la actividad. El guía puede negar el ingreso sin reembolso.',
      'No se permite fumar, encender fuego ni usar velas fuera de los soportes entregados.',
      'No se permite tocar, romper ni llevarse estalactitas, estalagmitas, rocas o material biológico.',
      'No se permite alimentar animales, molestar murciélagos ni usar flash directo sobre las colonias.',
      'No se permite el ingreso con mascotas, vidrio, alimentos, bocinas o drones sin permiso.',
      'No se permite la desnudez, los gritos, empujar o separarse del grupo dentro de la cueva.',
      'El uso de casco y chaleco salvavidas es obligatorio y no es negociable. Menores siempre de la mano de un adulto.',
      'La cueva puede cerrarse por lluvia fuerte, crecida del río o mantenimiento. En ese caso se reprograma o reembolsa.'
    ],
    policiesIntro: {
      kicker: 'Transparencia',
      title: 'Políticas de reserva, cancelación y reembolso',
      text: 'Reservar en línea implica aceptar estas condiciones. Están diseñadas para proteger al visitante, al equipo local y al ecosistema. Última actualización: enero de 2026.'
    },
    policies: [
      {
        id: 'reserva',
        title: 'Reservas y bloqueo de cupos',
        summary: 'Los cupos se separan durante 20 minutos mientras completas el pago.',
        items: [
          'Toda reserva se crea con un número único (formato KAN-AAAA-#####) y un enlace privado de pago.',
          'Al iniciar el proceso, los cupos quedan bloqueados temporalmente por 20 minutos.',
          'Si el pago no se completa en ese plazo, la reserva expira automáticamente y los cupos vuelven a estar disponibles.',
          'La reserva queda confirmada únicamente cuando la pasarela de pago aprueba el importe total.',
          'Recibirás un correo de confirmación y un comprobante digital inmediatamente después del pago aprobado.'
        ]
      },
      {
        id: 'pago',
        title: 'Pagos y comprobantes',
        summary: 'Pago en línea con tarjeta a través de pasarela segura; el cargo se procesa en quetzales.',
        items: [
          'Los precios se publican en quetzales guatemaltecos (GTQ) e incluyen impuestos aplicables.',
          'El cargo se realiza en el momento de la compra mediante la pasarela de pagos habilitada.',
          'No almacenamos números completos de tarjeta ni códigos CVV. Solo conservamos los últimos cuatro dígitos y la marca.',
          'El comprobante digital se envía al correo registrado y puede imprimirse o guardarse como PDF.',
          'Si el pago es rechazado, los cupos se mantienen bloqueados hasta que venza el plazo o completes otro intento.'
        ]
      },
      {
        id: 'cancelacion',
        title: 'Cancelación por el visitante',
        summary: 'Reembolso del 100% hasta 72 h antes; 50% entre 72 y 24 h; sin reembolso con menos de 24 h.',
        items: [
          'Con 72 horas o más de anticipación: reembolso del 100% del importe pagado.',
          'Entre 72 y 24 horas antes: reembolso del 50%.',
          'Con menos de 24 horas o no presentación (no-show): no aplica reembolso.',
          'Las solicitudes se registran desde “Mi reserva” o escribiendo a reservas@kanba.gt con el número de reserva.',
          'Los reembolsos se procesan al medio de pago original y pueden tardar de 5 a 10 días hábiles en reflejarse.',
          'Se permite un cambio de fecha sin cargo hasta 48 horas antes, sujeto a disponibilidad y una sola vez por reserva.'
        ]
      },
      {
        id: 'clima',
        title: 'Clima, seguridad y cierres',
        summary: 'La cueva es un entorno natural: si no es seguro entrar, se reprograma o se reembolsa.',
        items: [
          'La operación puede suspenderse por lluvia intensa, crecida del río, rayos o mantenimiento.',
          'Si la empresa cancela la actividad, el visitante elige reprogramación sin costo o reembolso del 100%.',
          'Si el visitante decide no continuar por miedo, fatiga o condiciones personales, no aplica reembolso una vez iniciado el briefing.',
          'El guía tiene la última palabra sobre la seguridad del grupo y puede excluir a una persona del recorrido.',
          'Los itinerarios pueden ajustarse por condiciones del camino, tráfico o causas de fuerza mayor.'
        ]
      },
      {
        id: 'reembolsos',
        title: 'Reembolsos y registro',
        summary: 'Cada cancelación y reembolso queda registrado con folio, importe, método y fecha.',
        items: [
          'Toda cancelación genera un registro interno con folio, fecha, motivo e importe calculado.',
          'Los reembolsos aprobados se registran en el libro de reembolsos con estado “pendiente” o “procesado”.',
          'El reembolso se emite al medio de pago original cuando la pasarela lo permite.',
          'Si la pasarela no permite reversa automática, se coordina transferencia bancaria con el titular.',
          'Recibirás un correo cuando el reembolso sea procesado, con el número de referencia.',
          'Los cargos por conversión de moneda o comisiones bancarias del emisor no son reembolsables por K’anba.'
        ]
      },
      {
        id: 'privacidad',
        title: 'Datos personales y privacidad',
        summary: 'Usamos tus datos solo para operar la reserva y cumplir obligaciones legales.',
        items: [
          'Recopilamos nombre, correo, teléfono, país y documento de identidad cuando se solicita.',
          'Los datos se usan para confirmar la reserva, emitir comprobantes, gestionar cancelaciones y seguridad del grupo.',
          'No vendemos ni compartimos datos con terceros ajenos a la operación del tour o la pasarela de pago.',
          'Puedes solicitar acceso, corrección o eliminación escribiendo a reservas@kanba.gt.',
          'Las tarjetas se procesan en la pasarela; K’anba no recibe ni almacena el número completo.',
          'Los correos transaccionales son necesarios para la reserva y no requieren consentimiento publicitario.'
        ]
      }
    ],
    faq: [
      {
        q: '¿Necesito saber nadar para entrar a K’anba?',
        a: 'No es indispensable si usas chaleco salvavidas, que es obligatorio. Aun así, debes sentirte cómodo con agua al pecho y con la oscuridad. Si no sabes nadar y sientes ansiedad, elige el tour “K’anba Suave” por senderos y pozas.'
      },
      {
        q: '¿Qué tan oscura y estrecha es la cueva?',
        a: 'La ruta es oscura y húmeda, con pasadizos de 5 a 10 metros de ancho y algunos tramos bajos. No es una cueva de gatear durante horas, pero sí exige confianza. Personas con claustrofobia severa no deberían entrar.'
      },
      {
        q: '¿Puedo llevar mi teléfono o cámara?',
        a: 'Sí, con funda impermeable y correa. La condensación y los salpicones son constantes. No se permite flash sobre los murciélagos ni drones. El guía puede pedirte guardar el equipo en tramos de nado.'
      },
      {
        q: '¿Cómo llego sin auto?',
        a: 'Desde Lanquín salen pickups y tuk-tuks hacia Semuc Champey; pide bajarte en el desvío de K’anba, antes del puente. También ofrecemos transporte de ida y vuelta en el tour K’anba + Semuc Champey.'
      },
      {
        q: '¿Qué pasa si llueve?',
        a: 'La cueva puede cerrarse por seguridad si el río crece. Te avisaremos por correo o teléfono. Puedes reprogramar sin costo o solicitar reembolso del 100% si la cancelación es nuestra.'
      },
      {
        q: '¿Hay estacionamiento y vestidores?',
        a: 'Sí: parqueo comunitario, recepción, baños y un área rústica para cambiarte. No hay casilleros de alta seguridad; viaja con lo indispensable y deja objetos de valor en tu hospedaje.'
      },
      {
        q: '¿Es accesible para silla de ruedas?',
        a: 'La cueva no es accesible. El sendero de K’anba Suave tiene tramos irregulares y escaleras; podemos adaptar el ritmo, pero no garantizamos acceso universal. Escríbenos para evaluar tu caso.'
      },
      {
        q: '¿Los guías hablan inglés?',
        a: 'Sí, todos los tours regulares tienen guía bilingüe español/inglés. Otros idiomas se coordinan con anticipación según disponibilidad.'
      }
    ],
    contact: {
      phone: '+502 4000 2026',
      whatsapp: '+50240002026',
      email: 'reservas@kanba.gt',
      address: 'Cuevas de K’anba, Lanquín, Alta Verapaz, Guatemala',
      hours: 'Todos los días · 08:00 a 17:00',
      instagram: '@kanba.cuevas',
      facebook: 'K’anba Cuevas Vivas',
      emergency: '+502 4000 2027'
    },
    footerNote: 'Sitio demostrativo creado con fines educativos. No es el sitio oficial de las Cuevas de K’anba. Las fotografías del entorno provienen de Wikimedia Commons y se usan con sus licencias Creative Commons.',
    gallery: GALLERY,
    videos: VIDEOS
  };
}

function defaultTours() {
  return [
    {
      id: 'candela',
      name: 'Ritual de la Cueva',
      badge: 'El clásico',
      description: 'La experiencia original: entras con una vela, caminas por el río subterráneo, subes la cascada con cuerda y sales flotando por el Cahabón. Adrenalina pura en grupos pequeños.',
      longDescription: 'Un recorrido de dos horas por los primeros 400 metros de la cueva. El guía abre camino con la luz frontal; el grupo avanza por agua a la cintura, pasa junto a formaciones de calcita y sube una cascada con cuerda anudada. Incluye un salto opcional a una poza profunda y flotada corta en el río al salir.',
      duration: '2 horas',
      durationMinutes: 120,
      price: 120,
      times: ['08:30', '10:30', '13:00'],
      days: [0, 1, 2, 3, 4, 5, 6],
      capacity: 12,
      minParticipants: 1,
      maxParticipants: 12,
      difficulty: 'Aventura moderada',
      minAge: 8,
      meetingPoint: 'Recepción K’anba · desvío antes del puente',
      includes: ['Guía local bilingüe', 'Casco y linterna frontal', 'Casco y chaleco salvavidas', 'Entrada a la cueva', 'Té caliente al salir'],
      notIncludes: ['Transporte desde Lanquín', 'Fotos profesionales', 'Propinas'],
      image: '/assets/img/kanba-cave-01.jpg',
      active: true,
      featured: true
    },
    {
      id: 'esencial',
      name: 'K’anba Esencial + Tubing',
      badge: 'Más vendido',
      description: 'Cueva + cascada + columpio + flotada de 30 minutos por el Cahabón. La combinación perfecta para un día completo de aventura.',
      longDescription: 'Recorrido guiado por la cueva con luz frontal y saltos opcionales. Después, caminata breve hasta la cascada, salto desde el columpio gigante y flotada en inner tube por el río Cahabón. Ideal para quienes quieren la experiencia completa sin el traslado largo.',
      duration: '3 horas',
      durationMinutes: 180,
      price: 185,
      times: ['09:00', '13:30'],
      days: [0, 1, 2, 3, 4, 5, 6],
      capacity: 14,
      minParticipants: 1,
      maxParticipants: 14,
      difficulty: 'Aventura moderada',
      minAge: 10,
      meetingPoint: 'Recepción K’anba · desvío antes del puente',
      includes: ['Guía local bilingüe', 'Linterna frontal, casco y chaleco', 'Entrada a la cueva', 'Tubing y columpio', 'Duchas rústicas y vestidores'],
      notIncludes: ['Transporte', 'Almuerzo', 'Fotos', 'Propinas'],
      image: '/assets/img/kanba-river-01.jpg',
      active: true,
      featured: true
    },
    {
      id: 'semuc',
      name: 'K’anba + Semuc Champey',
      badge: 'Día completo',
      description: 'Cueva, cascada, tubing y las pozas turquesa de Semuc Champey con mirador. Transporte desde Lanquín y almuerzo incluidos.',
      longDescription: 'Salida desde Lanquín en pickup 4x4. Primero K’anba: cueva con luz frontal, cascada y tubing. Luego Semuc Champey: caminata al mirador, tiempo libre en las pozas y almuerzo típico. Regreso al atardecer. Un solo día para los dos imperdibles de Alta Verapaz.',
      duration: '7 horas',
      durationMinutes: 420,
      price: 350,
      times: ['07:30'],
      days: [0, 1, 2, 3, 4, 5, 6],
      capacity: 16,
      minParticipants: 2,
      maxParticipants: 16,
      difficulty: 'Día completo · exigencia moderada',
      minAge: 10,
      meetingPoint: 'Parque central de Lanquín',
      includes: ['Transporte 4x4 ida y vuelta desde Lanquín', 'Guía bilingüe', 'Entrada a K’anba y Semuc Champey', 'Equipo de cueva y tubing', 'Almuerzo típico', 'Caminata al mirador'],
      notIncludes: ['Bebidas adicionales', 'Cena', 'Propinas', 'Traslado desde otros municipios'],
      image: '/assets/img/kanba-pools-01.jpg',
      active: true,
      featured: true
    },
    {
      id: 'nocturna',
      name: 'K’anba Nocturna · Murciélagos',
      badge: 'Solo viernes y sábado',
      description: 'La cueva al caer la noche, cuando las colonias de murciélagos despiertan. Leyendas q’eqchi’ y murmullo del río.',
      longDescription: 'Un recorrido especial de fin de semana al atardecer. Entramos con luz frontal cuando la luz exterior desaparece y escuchamos el despertar de los murciélagos. El guía comparte relatos q’eqchi’ sobre el inframundo y el río. No incluye nado profundo; sí vadeo y pasadizos.',
      duration: '2.5 horas',
      durationMinutes: 150,
      price: 160,
      times: ['17:15'],
      days: [5, 6],
      capacity: 10,
      minParticipants: 2,
      maxParticipants: 10,
      difficulty: 'Aventura suave',
      minAge: 10,
      meetingPoint: 'Recepción K’anba · desvío antes del puente',
      includes: ['Guía local q’eqchi’', 'Linterna frontal y casco', 'Entrada nocturna', 'Chocolate caliente', 'Préstamo de linterna frontal'],
      notIncludes: ['Transporte', 'Cena', 'Fotografía con flash', 'Propinas'],
      image: '/assets/img/kanba-cave-03.jpg',
      active: true,
      featured: false
    },
    {
      id: 'privado',
      name: 'Expedición Privada Q’eqchi’',
      badge: 'Solo tu grupo',
      description: 'La cueva a tu ritmo, con guía exclusivo y fotógrafo opcional. Ideal para familias, equipos y viajeros que buscan otra profundidad.',
      longDescription: 'Reserva privada de la cueva para tu grupo (2 a 6 personas). El guía adapta el ritmo y la ruta a tu nivel. Incluye briefing extendido, equipo completo y una parada interpretativa sobre geología y cosmovisión q’eqchi’. Opción de fotógrafo local con anticipación.',
      duration: '2.5 horas',
      durationMinutes: 150,
      price: 420,
      times: ['08:00', '11:00', '14:00'],
      days: [0, 1, 2, 3, 4, 5, 6],
      capacity: 6,
      minParticipants: 2,
      maxParticipants: 6,
      difficulty: 'A tu ritmo',
      minAge: 8,
      meetingPoint: 'Recepción K’anba · desvío antes del puente',
      includes: ['Guía exclusivo bilingüe', 'Equipo completo', 'Entrada', 'Charla de geología y cosmovisión', 'Té y fruta de temporada'],
      notIncludes: ['Fotógrafo (opcional, Q250)', 'Transporte', 'Almuerzo'],
      image: '/assets/img/kanba-cave-04.jpg',
      active: true,
      featured: false
    },
    {
      id: 'suave',
      name: 'K’anba Suave · Senderos y Pozas',
      badge: 'Sin cueva profunda',
      description: 'Para quien prefiere no nadar en oscuridad: sendero interpretativo, mirador de la boca de la cueva, pozas y cascada. Una versión serena del entorno.',
      longDescription: 'Caminata guiada por el sendero del río Cahabón hasta el mirador de la boca de la cueva. Interpretación de flora, geología y cultura q’eqchi’. Luego, tiempo en las pozas poco profundas y la cascada. No se entra a los pasadizos profundos ni se requiere nadar.',
      duration: '2.5 horas',
      durationMinutes: 150,
      price: 110,
      times: ['09:30', '12:00', '15:00'],
      days: [0, 1, 2, 3, 4, 5, 6],
      capacity: 15,
      minParticipants: 1,
      maxParticipants: 15,
      difficulty: 'Fácil · apto para familias',
      minAge: 5,
      meetingPoint: 'Recepción K’anba · desvío antes del puente',
      includes: ['Guía local', 'Entrada al sendero y mirador', 'Chaleco para pozas', 'Agua purificada', 'Bastón de caminata'],
      notIncludes: ['Cueva profunda', 'Tubing', 'Transporte', 'Almuerzo'],
      image: '/assets/img/kanba-jungle-01.jpg',
      active: true,
      featured: false
    }
  ];
}

function defaultSettings() {
  return {
    business: {
      legalName: 'K’anba Cuevas Vivas · Operadora local',
      nit: '1234567-8',
      address: 'Lanquín, Alta Verapaz, Guatemala',
      phone: '+502 4000 2026',
      email: 'reservas@kanba.gt'
    },
    booking: {
      holdMinutes: 20,
      advanceDays: 120,
      cutoffHours: 2,
      currency: 'GTQ',
      exchangeRate: 7.8,
      maxSeatsPerOrder: 12
    },
    payments: {
      provider: 'KanbaPay Sandbox',
      mode: 'sandbox',
      merchantId: 'KANBA-GT-001',
      publicKey: 'pk_sandbox_kanba_2026',
      secretKey: 'sk_sandbox_kanba_2026',
      webhookSecret: 'whsec_kanba_demo_2026',
      statement: 'KANBA CUEVAS'
    },
    smtp: {
      host: '',
      port: 465,
      secure: true,
      user: '',
      pass: '',
      fromEmail: 'reservas@kanba.gt',
      fromName: 'K’anba Reservas'
    }
  };
}

function seedDatabase() {
  const now = new Date().toISOString();
  const content = defaultContent();
  const tours = defaultTours();
  const settings = defaultSettings();
  const admin = hashPassword('kanba2026');

  const makeCode = (n) => `KAN-${new Date().getFullYear()}-${String(n).padStart(5, '0')}`;
  const r1 = {
    id: 'res_seed_01',
    code: makeCode(1031),
    token: randomToken(),
    tourId: 'candela',
    tourName: 'Ritual de la Cueva',
    date: isoAddDays(2),
    time: '10:30',
    participants: 2,
    unitPrice: 120,
    total: 240,
    currency: 'GTQ',
    customer: { name: 'Ana Lucía Pérez', email: 'ana.perez@example.com', phone: '+502 5555 1122', country: 'Guatemala', document: 'DPI 2456 78901 0101', notes: 'Primera vez en cueva, prefieren grupo tranquilo.' },
    status: 'confirmed',
    createdAt: new Date(Date.now() - 36 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 35 * 3600000).toISOString(),
    holdExpiresAt: new Date(Date.now() - 35 * 3600000).toISOString(),
    paidAt: new Date(Date.now() - 35 * 3600000).toISOString(),
    payment: { intentId: 'pi_seed_01', provider: 'KanbaPay Sandbox', status: 'paid', amount: 240, currency: 'GTQ', last4: '4242', brand: 'Visa', reference: 'PAY-8F2K19', paidAt: new Date(Date.now() - 35 * 3600000).toISOString() },
    receipt: { number: 'REC-2026-00481', issuedAt: new Date(Date.now() - 35 * 3600000).toISOString() },
    history: [
      { at: new Date(Date.now() - 36 * 3600000).toISOString(), type: 'created', label: 'Reserva creada y cupos bloqueados' },
      { at: new Date(Date.now() - 35 * 3600000).toISOString(), type: 'paid', label: 'Pago aprobado · confirmación automática' }
    ]
  };
  const r2 = {
    id: 'res_seed_02',
    code: makeCode(1032),
    token: randomToken(),
    tourId: 'semuc',
    tourName: 'K’anba + Semuc Champey',
    date: isoAddDays(5),
    time: '07:30',
    participants: 4,
    unitPrice: 350,
    total: 1400,
    currency: 'GTQ',
    customer: { name: 'Marco Villagrán', email: 'marco.v@example.com', phone: '+502 4444 8899', country: 'Guatemala', document: '', notes: 'Dos adultos y dos adolescentes de 13 y 15 años.' },
    status: 'confirmed',
    createdAt: new Date(Date.now() - 20 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 19 * 3600000).toISOString(),
    holdExpiresAt: new Date(Date.now() - 19 * 3600000).toISOString(),
    paidAt: new Date(Date.now() - 19 * 3600000).toISOString(),
    payment: { intentId: 'pi_seed_02', provider: 'KanbaPay Sandbox', status: 'paid', amount: 1400, currency: 'GTQ', last4: '1881', brand: 'Mastercard', reference: 'PAY-1K7M42', paidAt: new Date(Date.now() - 19 * 3600000).toISOString() },
    receipt: { number: 'REC-2026-00482', issuedAt: new Date(Date.now() - 19 * 3600000).toISOString() },
    history: [
      { at: new Date(Date.now() - 20 * 3600000).toISOString(), type: 'created', label: 'Reserva creada y cupos bloqueados' },
      { at: new Date(Date.now() - 19 * 3600000).toISOString(), type: 'paid', label: 'Pago aprobado · confirmación automática' }
    ]
  };
  const r3 = {
    id: 'res_seed_03',
    code: makeCode(1033),
    token: randomToken(),
    tourId: 'esencial',
    tourName: 'K’anba Esencial + Tubing',
    date: isoAddDays(1),
    time: '13:30',
    participants: 2,
    unitPrice: 185,
    total: 370,
    currency: 'GTQ',
    customer: { name: 'Sofía Ramírez', email: 'sofia.ramirez@example.com', phone: '+502 3333 7788', country: 'Guatemala', document: '', notes: '' },
    status: 'pending_payment',
    createdAt: new Date(Date.now() - 3 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60000).toISOString(),
    holdExpiresAt: new Date(Date.now() + 17 * 60000).toISOString(),
    paidAt: null,
    payment: { intentId: 'pi_seed_03', provider: 'KanbaPay Sandbox', status: 'requires_payment', amount: 370, currency: 'GTQ', last4: null, brand: null, reference: null, paidAt: null },
    receipt: null,
    history: [{ at: new Date(Date.now() - 3 * 60000).toISOString(), type: 'created', label: 'Reserva creada y cupos bloqueados por 20 minutos' }]
  };
  const r4 = {
    id: 'res_seed_04',
    code: makeCode(1034),
    token: randomToken(),
    tourId: 'candela',
    tourName: 'Ritual de la Cueva',
    date: isoAddDays(-2),
    time: '08:30',
    participants: 2,
    unitPrice: 120,
    total: 240,
    currency: 'GTQ',
    customer: { name: 'Diego Morales', email: 'diego.morales@example.com', phone: '+502 2222 4455', country: 'Guatemala', document: '', notes: '' },
    status: 'cancelled',
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    holdExpiresAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    paidAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    cancelledAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    cancellation: { reason: 'Cambio de itinerario de viaje', policy: '72 horas o más · 100%', percent: 100, refundAmount: 240, requestedAt: new Date(Date.now() - 4 * 86400000).toISOString(), by: 'customer' },
    payment: { intentId: 'pi_seed_04', provider: 'KanbaPay Sandbox', status: 'refunded', amount: 240, currency: 'GTQ', last4: '4242', brand: 'Visa', reference: 'PAY-3J9P55', paidAt: new Date(Date.now() - 8 * 86400000).toISOString() },
    receipt: { number: 'REC-2026-00455', issuedAt: new Date(Date.now() - 8 * 86400000).toISOString() },
    history: [
      { at: new Date(Date.now() - 8 * 86400000).toISOString(), type: 'created', label: 'Reserva creada' },
      { at: new Date(Date.now() - 8 * 86400000).toISOString(), type: 'paid', label: 'Pago aprobado' },
      { at: new Date(Date.now() - 4 * 86400000).toISOString(), type: 'cancelled', label: 'Cancelación registrada · reembolso 100%' }
    ]
  };
  const r5 = {
    id: 'res_seed_05',
    code: makeCode(1035),
    token: randomToken(),
    tourId: 'nocturna',
    tourName: 'K’anba Nocturna · Murciélagos',
    date: isoAddDays(-1),
    time: '17:15',
    participants: 1,
    unitPrice: 160,
    total: 160,
    currency: 'GTQ',
    customer: { name: 'Elena Cruz', email: 'elena.cruz@example.com', phone: '+502 6666 3311', country: 'México', document: '', notes: '' },
    status: 'expired',
    createdAt: new Date(Date.now() - 26 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 25 * 3600000).toISOString(),
    holdExpiresAt: new Date(Date.now() - 25 * 3600000).toISOString(),
    paidAt: null,
    payment: { intentId: 'pi_seed_05', provider: 'KanbaPay Sandbox', status: 'expired', amount: 160, currency: 'GTQ', last4: null, brand: null, reference: null, paidAt: null },
    receipt: null,
    history: [
      { at: new Date(Date.now() - 26 * 3600000).toISOString(), type: 'created', label: 'Reserva creada y cupos bloqueados' },
      { at: new Date(Date.now() - 25 * 3600000).toISOString(), type: 'expired', label: 'Plazo de pago vencido · cupos liberados automáticamente' }
    ]
  };

  const emails = [
    {
      id: 'mail_seed_01', to: 'ana.perez@example.com', subject: 'Reserva confirmada · KAN-2026-01031',
      template: 'confirmation', reservationCode: r1.code, status: 'sent', provider: 'outbox',
      createdAt: r1.paidAt, html: '<p>Hola Ana Lucía, tu reserva en K’anba está confirmada. Código <strong>KAN-2026-01031</strong>.</p>',
      text: 'Hola Ana Lucía, tu reserva en K’anba está confirmada. Código KAN-2026-01031.'
    },
    {
      id: 'mail_seed_02', to: 'ana.perez@example.com', subject: 'Comprobante REC-2026-00481 · K’anba',
      template: 'receipt', reservationCode: r1.code, status: 'sent', provider: 'outbox',
      createdAt: r1.paidAt, html: '<p>Adjuntamos tu comprobante digital REC-2026-00481 por Q240.00.</p>',
      text: 'Comprobante REC-2026-00481 por Q240.00.'
    },
    {
      id: 'mail_seed_03', to: 'marco.v@example.com', subject: 'Reserva confirmada · KAN-2026-01032',
      template: 'confirmation', reservationCode: r2.code, status: 'sent', provider: 'outbox',
      createdAt: r2.paidAt, html: '<p>Tu reserva KAN-2026-01032 está confirmada.</p>',
      text: 'Tu reserva KAN-2026-01032 está confirmada.'
    },
    {
      id: 'mail_seed_04', to: 'sofia.ramirez@example.com', subject: 'Completa tu pago · KAN-2026-01033',
      template: 'pending', reservationCode: r3.code, status: 'sent', provider: 'outbox',
      createdAt: r3.createdAt, html: '<p>Bloqueamos tus cupos por 20 minutos. Completa el pago para confirmar.</p>',
      text: 'Bloqueamos tus cupos por 20 minutos. Completa el pago para confirmar.'
    },
    {
      id: 'mail_seed_05', to: 'elena.cruz@example.com', subject: 'Tu reserva expiró · KAN-2026-01035',
      template: 'expired', reservationCode: r5.code, status: 'sent', provider: 'outbox',
      createdAt: r5.updatedAt, html: '<p>El plazo de pago venció y los cupos fueron liberados automáticamente.</p>',
      text: 'El plazo de pago venció y los cupos fueron liberados automáticamente.'
    }
  ];

  return {
    meta: { version: 1, createdAt: now, updatedAt: now },
    admin: { password: admin, updatedAt: now },
    counters: { reservation: 1036, receipt: 483 },
    content,
    tours,
    settings,
    reservations: [r1, r2, r3, r4, r5],
    closures: [
      {
        id: 'clo_seed_01',
        date: isoAddDays(9),
        tourId: 'candela',
        reason: 'Mantenimiento de cuerdas y pasarelas en la cascada',
        createdAt: now
      }
    ],
    refunds: [
      {
        id: 'ref_seed_01',
        reservationCode: r4.code,
        customerName: r4.customer.name,
        customerEmail: r4.customer.email,
        amount: 240,
        currency: 'GTQ',
        percent: 100,
        method: 'Tarjeta original · Visa ****4242',
        status: 'processed',
        reason: 'Cambio de itinerario de viaje',
        requestedAt: r4.cancelledAt,
        processedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        reference: 'RF-2026-00091'
      }
    ],
    emails,
    sessions: {}
  };
}

/* ------------------------------------------------------------------ */
/* Store                                                              */
/* ------------------------------------------------------------------ */

let db = null;

export function loadDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(OUTBOX_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      db.sessions = db.sessions || {};
      return db;
    } catch (err) {
      console.error('[store] db.json corrupto, creando respaldo y reiniciando.', err.message);
      fs.copyFileSync(DB_FILE, path.join(DATA_DIR, `db.corrupt-${Date.now()}.json`));
    }
  }
  db = seedDatabase();
  saveDb();
  return db;
}

export function getDb() {
  if (!db) loadDb();
  return db;
}

export function saveDb() {
  if (!db) return;
  db.meta.updatedAt = new Date().toISOString();
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

export function ensureOutbox() {
  fs.mkdirSync(OUTBOX_DIR, { recursive: true });
  return OUTBOX_DIR;
}

/* ------------------------------------------------------------------ */
/* Public projections                                                */
/* ------------------------------------------------------------------ */

export function publicSite() {
  const d = getDb();
  const c = d.content;
  return {
    brand: c.brand,
    hero: c.hero,
    intro: c.intro,
    values: c.values,
    timeline: c.timeline,
    toursIntro: c.toursIntro,
    bookingIntro: c.bookingIntro,
    galleryIntro: c.galleryIntro,
    videosIntro: c.videosIntro,
    mapIntro: c.mapIntro,
    infoIntro: c.infoIntro,
    requirements: c.requirements,
    recommendations: c.recommendations,
    restrictions: c.restrictions,
    policiesIntro: c.policiesIntro,
    policies: c.policies,
    faq: c.faq,
    contact: c.contact,
    footerNote: c.footerNote,
    gallery: c.gallery,
    videos: c.videos,
    tours: d.tours.filter((t) => t.active !== false).map(publicTour),
    settings: {
      booking: d.settings.booking,
      payments: { provider: d.settings.payments.provider, mode: d.settings.payments.mode, publicKey: d.settings.payments.publicKey }
    },
    serverNow: new Date().toISOString(),
    today: todayISO()
  };
}

export function publicTour(t) {
  const { secret, ...rest } = t;
  return rest;
}

/* ------------------------------------------------------------------ */
/* Availability                                                      */
/* ------------------------------------------------------------------ */

function isClosed(date, tourId) {
  const d = getDb();
  return (d.closures || []).some((c) => c.date === date && (c.tourId === 'all' || c.tourId === tourId));
}

function activeHolds() {
  const d = getDb();
  const now = Date.now();
  return d.reservations.filter((r) =>
    (r.status === 'confirmed') ||
    (r.status === 'pending_payment' && dateToEpoch(r.date, r.time) > now && new Date(r.holdExpiresAt).getTime() > now)
  );
}

export function seatsTaken(tourId, date, time) {
  return activeHolds()
    .filter((r) => r.tourId === tourId && r.date === date && r.time === time)
    .reduce((sum, r) => sum + Number(r.participants || 0), 0);
}

export function departureStatus(tour, date, time, taken) {
  const left = Math.max(0, tour.capacity - taken);
  if (isClosed(date, tour.id)) return { left: 0, status: 'closed' };
  if (dateToEpoch(date, time) <= Date.now()) return { left: 0, status: 'past' };
  if (left <= 0) return { left: 0, status: 'soldout' };
  if (left <= Math.max(1, Math.round(tour.capacity * 0.2))) return { left, status: 'last' };
  return { left, status: 'open' };
}

export function buildAvailability({ tourId = null, from = todayISO(), days = 21 } = {}) {
  const d = getDb();
  const tours = d.tours.filter((t) => t.active !== false && (!tourId || t.id === tourId));
  const out = [];
  for (let i = 0; i < days; i++) {
    const date = isoAddDaysFrom(from, i);
    const dow = dayOfWeek(date);
    const tourDays = [];
    for (const tour of tours) {
      if (!tour.days.includes(dow)) continue;
      const departures = tour.times.map((time) => {
        const taken = seatsTaken(tour.id, date, time);
        const info = departureStatus(tour, date, time, taken);
        return { time, capacity: tour.capacity, taken, ...info };
      });
      if (!departures.length) continue;
      tourDays.push({
        tourId: tour.id,
        tourName: tour.name,
        price: tour.price,
        capacity: tour.capacity,
        closed: isClosed(date, tour.id),
        departures
      });
    }
    out.push({ date, dow, tours: tourDays });
  }
  return out;
}

export function isoAddDaysFrom(from, days) {
  const [y, m, d] = from.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/* Validation + booking                                              */
/* ------------------------------------------------------------------ */

export class AppError extends Error {
  constructor(message, status = 400, code = 'bad_request') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function nextReservationCode() {
  const d = getDb();
  d.counters.reservation += 1;
  return `KAN-${new Date().getFullYear()}-${String(d.counters.reservation).padStart(5, '0')}`;
}

export function nextReceiptNumber() {
  const d = getDb();
  d.counters.receipt += 1;
  return `REC-${new Date().getFullYear()}-${String(d.counters.receipt).padStart(5, '0')}`;
}

export function validateCustomer(input = {}) {
  const customer = {
    name: String(input.name || '').trim(),
    email: String(input.email || '').trim().toLowerCase(),
    phone: String(input.phone || '').trim(),
    country: String(input.country || '').trim(),
    document: String(input.document || '').trim(),
    notes: String(input.notes || '').trim().slice(0, 600)
  };
  const errors = {};
  if (customer.name.length < 3) errors.name = 'Escribe tu nombre completo.';
  if (!EMAIL_RE.test(customer.email)) errors.email = 'Correo electrónico inválido.';
  if (customer.phone.replace(/\D/g, '').length < 7) errors.phone = 'Teléfono inválido.';
  if (customer.country.length < 2) errors.country = 'Indica tu país.';
  if (input.acceptPolicies !== true) errors.acceptPolicies = 'Debes aceptar las políticas de reserva.';
  if (input.acceptTerms !== true) errors.acceptTerms = 'Debes aceptar los términos y la carta de responsabilidad.';
  if (Object.keys(errors).length) {
    throw new AppError('Revisa los datos del viajero.', 422, 'validation');
  }
  return customer;
}

export function findTour(id) {
  const t = getDb().tours.find((x) => x.id === id);
  if (!t || t.active === false) throw new AppError('Tour no disponible.', 404, 'tour_not_found');
  return t;
}

export function getReservation(code, token = null) {
  const d = getDb();
  const r = d.reservations.find((x) => x.code === code);
  if (!r) throw new AppError('Reserva no encontrada.', 404, 'not_found');
  if (!token) throw new AppError('Enlace privado de reserva requerido.', 401, 'unauthorized');
  if (r.token !== token) throw new AppError('Enlace de reserva inválido.', 403, 'forbidden');
  return r;
}

export function createReservation(input) {
  const d = getDb();
  const tour = findTour(input.tourId);
  const date = String(input.date || '');
  const time = String(input.time || '');
  const participants = Number(input.participants);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AppError('Fecha inválida.', 422, 'validation');
  if (!tour.times.includes(time)) throw new AppError('Horario no válido para este tour.', 422, 'validation');
  if (!Number.isInteger(participants) || participants < tour.minParticipants || participants > tour.maxParticipants) {
    throw new AppError(`Este tour admite entre ${tour.minParticipants} y ${tour.maxParticipants} participantes.`, 422, 'validation');
  }
  if (!tour.days.includes(dayOfWeek(date))) throw new AppError('El tour no opera en esa fecha.', 422, 'unavailable');
  if (isClosed(date, tour.id)) throw new AppError('La cueva está cerrada en esa fecha por mantenimiento o clima.', 409, 'closed');
  if (dateToEpoch(date, time) <= Date.now()) throw new AppError('Ese horario ya pasó. Elige otro.', 409, 'past');

  const maxAdvance = Number(d.settings.booking.advanceDays || 120);
  if (dateToEpoch(date, '23:59') > Date.now() + (maxAdvance + 1) * 86400000) {
    throw new AppError(`Solo se puede reservar con ${maxAdvance} días de anticipación.`, 409, 'too_far');
  }

  const taken = seatsTaken(tour.id, date, time);
  const left = tour.capacity - taken;
  if (left < participants) {
    throw new AppError(left <= 0 ? 'Ese horario se agotó. Elige otro.' : `Solo quedan ${left} cupos en ese horario.`, 409, 'sold_out');
  }

  const customer = validateCustomer(input.customer || {});
  const holdMinutes = Number(d.settings.booking.holdMinutes || 20);
  const total = Math.round(tour.price * participants * 100) / 100;
  const now = Date.now();
  const code = nextReservationCode();
  const token = randomToken();
  const intentId = `pi_${randomToken(8)}`;

  const reservation = {
    id: `res_${randomToken(6)}`,
    code,
    token,
    tourId: tour.id,
    tourName: tour.name,
    date,
    time,
    participants,
    unitPrice: tour.price,
    total,
    currency: d.settings.booking.currency || 'GTQ',
    customer,
    status: 'pending_payment',
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    holdExpiresAt: new Date(now + holdMinutes * 60000).toISOString(),
    paidAt: null,
    payment: {
      intentId,
      provider: d.settings.payments.provider,
      status: 'requires_payment',
      amount: total,
      currency: d.settings.booking.currency || 'GTQ',
      last4: null,
      brand: null,
      reference: null,
      paidAt: null
    },
    receipt: null,
    history: [{ at: new Date(now).toISOString(), type: 'created', label: `Reserva creada · cupos bloqueados por ${holdMinutes} minutos` }]
  };

  d.reservations.unshift(reservation);
  saveDb();
  return reservation;
}

/* ------------------------------------------------------------------ */
/* Availability guards for admin                                     */
/* ------------------------------------------------------------------ */

export function occupancyFor(date, tourId = null) {
  const d = getDb();
  const tours = d.tours.filter((t) => t.active !== false && (!tourId || t.id === tourId));
  return tours.map((t) => ({
    tourId: t.id,
    tourName: t.name,
    capacity: t.capacity,
    times: t.times.map((time) => {
      const taken = seatsTaken(t.id, date, time);
      return { time, taken, left: Math.max(0, t.capacity - taken), capacity: t.capacity };
    })
  }));
}

export function closeExpiredHolds() {
  const d = getDb();
  const now = Date.now();
  const expired = [];
  for (const r of d.reservations) {
    if (r.status === 'pending_payment' && new Date(r.holdExpiresAt).getTime() <= now) {
      r.status = 'expired';
      r.updatedAt = new Date(now).toISOString();
      r.payment = { ...r.payment, status: 'expired' };
      r.history.push({ at: new Date(now).toISOString(), type: 'expired', label: 'Plazo de pago vencido · cupos liberados automáticamente' });
      expired.push(r);
    }
  }
  if (expired.length) saveDb();
  return expired;
}

export { defaultContent, defaultTours, defaultSettings, GALLERY, VIDEOS };
