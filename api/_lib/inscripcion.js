// ---------------------------------------------------------------------------
// Piezas compartidas del alta y la renovación.
//
// La inscripción dejó de hacerse en Clupik: ahora es sólo por acá. Eso significa
// que estos endpoints son los que crean jugadores en la base del club, así que
// tienen que respetar dos cosas que no son negociables:
//
//   1. La categoría la calcula la BASE, no este código. Ver calcularCategorias.
//   2. Los CONSTRAINT TRIGGER de tutores/tutor_jugador son DEFERRABLE, o sea que
//      se evalúan al cerrar CADA request de PostgREST, no al final del handler.
//      El orden de escritura está explicado en inscripcion-enviar.js.
// ---------------------------------------------------------------------------

const crypto = require('crypto');
const nodemailer = require('nodemailer');

// ── Temporada ──────────────────────────────────────────────────────────────
// Julio es el corte: de enero a junio seguimos en la temporada que arrancó el
// año pasado. Mismo criterio que temporada_year() en la base y que
// lib/season.ts en la app.
const MES_INICIO_TEMPORADA = 6; // 0-11, o sea julio

function temporadaYear(fecha = new Date()) {
    const y = fecha.getFullYear();
    return fecha.getMonth() < MES_INICIO_TEMPORADA ? y - 1 : y;
}

/** "2026/2027". OJO: el formato corto "2026/27" no matchea nada en la base. */
function temporadaKey(year = temporadaYear()) {
    return `${year}/${year + 1}`;
}

// ── Categorías ─────────────────────────────────────────────────────────────

/**
 * Categorías de un jugador. Se las pide a la BASE a propósito.
 *
 * La regla (edad de temporada, par inmediato superior, las impares suben una
 * más, y ningún menor de 18 en SENIOR salvo femenino) vive en
 * calcular_categorias() porque la necesitan esta web y la app interna. Copiarla
 * acá sería la segunda implementación, y dos implementaciones de la misma regla
 * se separan sin que nadie se entere. El precio de que se separen, acá, es un
 * chico entrenando con la categoría equivocada.
 */
async function calcularCategorias(supabase, dob, esFemenino, year = temporadaYear()) {
    const { data, error } = await supabase.rpc('calcular_categorias', {
        p_dob: dob,
        p_es_femenino: Boolean(esFemenino),
        p_temporada: year,
    });
    if (error) throw new Error(`No se pudo calcular la categoría: ${error.message}`);
    const fila = Array.isArray(data) ? data[0] : data;
    if (!fila) throw new Error('No se pudo calcular la categoría: fecha de nacimiento inválida');
    return { edad: fila.edad, principal: fila.principal, extra: fila.extra || [] };
}

/** El tramo de precio que le toca a una categoría. */
function tramoDeCategoria(categoria, dob) {
    if (categoria === 'FEMENINO') return 'femenino';
    if (categoria === 'SENIOR') {
        return Number(String(dob).slice(0, 4)) < 1990 ? 'veterano' : 'senior';
    }
    return 'juvenil';
}

// ── Precios ────────────────────────────────────────────────────────────────

/**
 * Catálogo de la temporada, indexado por "concepto|variante|tramo".
 * Una sola consulta: el formulario necesita todos los precios para mostrar las
 * opciones, no de a uno.
 */
async function cargarPrecios(supabase, temporada) {
    const { data, error } = await supabase
        .from('precios')
        // stripe_price_id va SIEMPRE: accion-pagar corta si falta, y sin esta
        // columna el boton de pagar devolvia 503 para todo el mundo y en toda
        // temporada. Un caracter de diferencia en un SELECT dejaba muerto el
        // cobro entero, y la unica prueba que lo tocaba corria sin clave de
        // Stripe, asi que nunca llegaba a esa linea.
        .select('concepto, variante, tramo, importe, periodicidad, stripe_price_id')
        .eq('temporada', temporada)
        .eq('activo', true);
    if (error) throw new Error(`No se pudo leer el catálogo de precios: ${error.message}`);

    const mapa = new Map();
    for (const p of data || []) {
        mapa.set(`${p.concepto}|${p.variante}|${p.tramo}`, p);
    }
    return mapa;
}

async function cargarDescuentos(supabase, temporada) {
    const { data, error } = await supabase
        .from('descuentos')
        .select('codigo, nombre, tipo, porcentaje, importe, aplica_a')
        .eq('temporada', temporada)
        .eq('activo', true);
    if (error) throw new Error(`No se pudieron leer los descuentos: ${error.message}`);
    return data || [];
}

/**
 * Importe final de un concepto tras aplicar los descuentos que correspondan.
 * Los porcentajes se encadenan sobre lo que va quedando. Mismo cálculo que
 * aplicarDescuentos() en la app (lib/precios.ts).
 */
function importeFinal(base, concepto, codigos, descuentos) {
    if (base === null || base === undefined) return null;
    const aplicables = (descuentos || []).filter(
        (d) => (codigos || []).includes(d.codigo) && (d.aplica_a || []).includes(concepto)
    );
    const final = aplicables.reduce((acc, d) => {
        if (d.tipo === 'porcentaje' && d.porcentaje !== null) return acc * (1 - Number(d.porcentaje) / 100);
        if (d.tipo === 'importe' && d.importe !== null) return Math.max(0, acc - Number(d.importe));
        return acc;
    }, Number(base));
    return Math.round(final * 100) / 100;
}

// ── Fotos ──────────────────────────────────────────────────────────────────

const FOTO_MAX_BYTES = 3 * 1024 * 1024;
const TIPOS_FOTO = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/**
 * Sube la foto del jugador y devuelve el PATH, no la URL.
 *
 * La app guarda paths relativos en players.photo y arma la URL al leer con
 * getPhotoUrl(). Guardar acá la URL entera rompería esa convención: es
 * exactamente el bug que dejó 1200 errores 404 en la pantalla de jugadores.
 *
 * Sube el servidor, no el navegador. El resto de la web sube a fotos-socios con
 * la clave anon; acá se usa service role para que el día que se cierren los
 * buckets —que hoy están abiertos y hay que arreglarlo— este flujo siga andando
 * sin tocar nada.
 */
async function subirFoto(supabase, dataUrl, playerId) {
    if (!dataUrl) return null;

    const m = /^data:([^;]+);base64,(.+)$/.exec(String(dataUrl));
    if (!m) throw new Error('La foto no tiene un formato que se pueda leer');

    const ext = TIPOS_FOTO[m[1]];
    if (!ext) throw new Error('La foto tiene que ser JPG, PNG o WEBP');

    const buffer = Buffer.from(m[2], 'base64');
    if (buffer.length > FOTO_MAX_BYTES) throw new Error('La foto pesa más de 3 MB');

    const nombre = `${playerId}/foto-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
        .from('player-photos')
        .upload(nombre, buffer, { contentType: m[1], upsert: true });
    if (error) throw new Error(`No se pudo guardar la foto: ${error.message}`);

    return nombre;
}

// ── Correo ─────────────────────────────────────────────────────────────────

/**
 * Manda un mail y DEVUELVE si salió o no, en vez de tragarse el error.
 *
 * Hoy las credenciales de Gmail están caducadas (535 BadCredentials), así que
 * esto falla siempre. El flujo de alta depende de que la persona reciba su
 * contraseña, y decirle "te la mandamos" cuando no salió la deja esperando un
 * mail que no va a llegar. Quien llama tiene que mirar el resultado y avisar.
 */
async function enviarMail({ to, subject, html }) {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        return { ok: false, motivo: 'El club no tiene el correo configurado' };
    }
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
        });
        await transporter.sendMail({
            from: `"Menorca Rugby Club" <${process.env.GMAIL_USER}>`,
            to,
            subject,
            html,
        });
        return { ok: true };
    } catch (e) {
        console.error('Fallo al enviar mail:', e && e.message);
        return { ok: false, motivo: 'No se pudo enviar el correo' };
    }
}

// ── Varios ─────────────────────────────────────────────────────────────────

/**
 * Saca las claves sin valor.
 *
 * Al renovar, el formulario puede no traer todos los campos: el navegador manda
 * "" en lo que la familia dejo en blanco. Escribir eso tal cual BORRA lo que ya
 * habia. Un campo vacio en un formulario de renovacion significa "no lo toques",
 * no "borralo".
 *
 * Los booleanos se conservan aunque sean false: ahi false SI es un dato (por
 * ejemplo, decir que NO al uso de imagen).
 */
function soloConValor(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj || {})) {
        if (typeof v === 'boolean') { out[k] = v; continue; }
        if (v === null || v === undefined || v === '') continue;
        if (Array.isArray(v) && v.length === 0) continue;
        out[k] = v;
    }
    return out;
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function normalizarEmail(v) {
    const e = String(v || '').trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

/**
 * Busca un tutor por e-mail con match exacto.
 *
 * El mismo cuidado que findSociosByEmail: % y _ son comodines de LIKE, y un
 * {"email":"%"} sin escapar matcheaba a todos los socios. Se escapan a "_",
 * que pide un superconjunto del mismo largo, y se filtra exacto en JS.
 */
async function buscarTutorPorEmail(supabase, email, columnas = '*') {
    const target = normalizarEmail(email);
    if (!target) return null;

    const patron = target.replace(/[%_*\\]/g, '_');
    // El email SIEMPRE va en el select aunque quien llame no lo haya pedido: el
    // filtro exacto de abajo lo necesita. Sin esto, pedir solo 'tutor_id'
    // devolvia filas sin email, el filtro no matcheaba ninguna y la funcion
    // decia "no existe" para un tutor que si estaba -- con el resultado de que
    // el alta lo intentaba crear de nuevo y reventaba contra tutores_email_unico.
    const select = /(^|,)\s*(\*|email)\s*(,|$)/.test(columnas) ? columnas : columnas + ', email';

    const { data, error } = await supabase.from('tutores').select(select).ilike('email', patron);
    if (error) throw new Error(`Error de base de datos: ${error.message}`);

    return (data || []).find((r) => String(r.email || '').trim().toLowerCase() === target) || null;
}

/**
 * Jugadores que tienen ESE correo en su propia ficha.
 *
 * Es la puerta que faltaba. El club tiene 113 jugadores y sólo 73 tutores: los
 * 32 adultos que juegan y pagan lo suyo no tienen ficha de tutor, y hay
 * familias cuyo correo quedó en players.email y no en tutores. En total, 49
 * correos que existen en la base y que el alta no reconocía.
 *
 * El resultado era el peor posible: una familia que YA está en el club escribía
 * su correo, el sistema le decía que no existía y la dejaba cargar todo de cero
 * — creando un jugador duplicado al lado del que ya estaba.
 *
 * Mismo cuidado con los comodines de LIKE que en las otras búsquedas por correo.
 */
async function buscarJugadoresPorEmail(supabase, email) {
    const target = normalizarEmail(email);
    if (!target) return [];

    const patron = target.replace(/[%_*\\]/g, '_');
    const { data, error } = await supabase
        .from('players')
        .select('player_id, first_name, last_name, dob, email, category_primary, estado_club')
        .ilike('email', patron);
    if (error) throw new Error(`Error de base de datos: ${error.message}`);

    return (data || []).filter((r) => String(r.email || '').trim().toLowerCase() === target);
}

/** Cabeceras CORS + preflight. Devuelve true si ya respondió (OPTIONS). */
function cors(req, res, metodos = 'POST, OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', metodos);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return true;
    }
    return false;
}

function nuevoId() {
    return crypto.randomUUID();
}

module.exports = {
    soloConValor,
    buscarJugadoresPorEmail,
    temporadaYear,
    temporadaKey,
    calcularCategorias,
    tramoDeCategoria,
    cargarPrecios,
    cargarDescuentos,
    importeFinal,
    subirFoto,
    enviarMail,
    escapeHtml,
    normalizarEmail,
    buscarTutorPorEmail,
    cors,
    nuevoId,
};
