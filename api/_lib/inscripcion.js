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

/**
 * Cuántas mensualidades tiene una temporada.
 *
 * SON NUEVE, NO DIEZ. El calendario que fijó el club es: primer cobro el 5 de
 * octubre y último el 5 de junio. Octubre, noviembre, diciembre, enero,
 * febrero, marzo, abril, mayo y junio: nueve.
 *
 * Estuvo puesto en 10 hasta que Leandro lo contó. La diferencia no es
 * cosmética: son 50 € de más por cada juvenil normal en el total de la
 * temporada, y es el número que se le enseña a la familia antes de que acepte.
 */
const MESES_DE_CUOTA = 9;
const PRIMER_COBRO = '5 de octubre';
const ULTIMO_COBRO = '5 de junio';

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

/**
 * Tramo de la MENSUALIDAD: por la categoría en la que juega.
 *
 * FEMENINO ya no tiene tramo propio: este año no hay equipo femenino, así que
 * las jugadoras que sigan pagan por su edad como el resto. El catálogo conserva
 * las filas de femenino desactivadas, para reabrirlo cambiando un booleano.
 */
function tramoDeCategoria(categoria, dob) {
    if (categoria === 'SENIOR' || categoria === 'FEMENINO') {
        return Number(String(dob).slice(0, 4)) < 1990 ? 'veterano' : 'senior';
    }
    return 'juvenil';
}

/**
 * Tramo de la FICHA ANUAL: por la EDAD, no por la categoría.
 *
 * Directiva 2026/27 (tres franjas):
 *   17 o más   -> 300 €   (tramo 'senior')
 *   12 a 16    -> 185 €   (tramo 'juvenil')
 *   11 o menos -> 100 €   (tramo 'infantil')
 *
 * Va por EDAD y no por la categoría: si un chico juega en una más grande es una
 * decisión deportiva, no económica. El corte 100/185 está en 12 porque un chico
 * de 12 juega en SUB14, que la directiva puso en el grupo de 185.
 *
 * Espejo de tramo_de_ficha() en la base (migración cuotas_ficha_por_edad_tres_tramos_2026_27).
 */
function tramoDeFicha(dob, year = temporadaYear()) {
    // Directiva 2026/27: la ficha va por EDAD en tres franjas. El corte 100/185
    // va en 12 (un chico de 12 juega en SUB14, que es el grupo de 185).
    const edad = year - Number(String(dob).slice(0, 4));
    if (edad >= 17) return 'senior';    // 300 €
    if (edad >= 12) return 'juvenil';   // 185 €
    return 'infantil';                  // 100 €
}

/**
 * Con qué variante se busca la FICHA ANUAL.
 *
 * La ficha es de la federación, no del club: el club no puede hacerle descuento
 * por tener un hermano, ni por tener beca, ni por colaborar. En el cuadro de la
 * comisión se ve de un vistazo — normal, colaborador e hijo de colaborador
 * pagan los mismos 235/300 € — y la ÚNICA excepción son el directivo o
 * entrenador y sus hijos, que pagan 215 € mientras estén en la franja de abajo.
 *
 * POR QUÉ HACE FALTA ESTA FUNCIÓN Y NO ALCANZA CON BUSCAR POR LA VARIANTE
 *
 * La cuota va por la categoría y la ficha por el año de nacimiento. Un chico de
 * 17 con un hermano en el club tiene variante 'con_hermano' y tramo de ficha
 * 'senior'. Buscar `ficha_anual|con_hermano|senior` pedía una combinación que la
 * base PROHÍBE crear —el CHECK precios_sin_hermano_en_adultos— así que no se
 * encontraba nunca. Resultado: el pago de TODA la familia se cortaba con un 503
 * que nadie podía arreglar, porque la fila que faltaba no se puede dar de alta.
 *
 * Es el caso de Héctor Brotons, nacido en 2009, que tiene un hermano. Y el año
 * que viene son los otros 16 de su quinta.
 */
function varianteDeFicha() {
    // Directiva 2026/27: la ficha va por EDAD y SIEMPRE a tarifa base. No lleva
    // descuentos del club (ni directivo ni nadie).
    return 'base';
}

/**
 * Dos fichas, ¿son la misma persona?
 *
 * Hace falta porque un adulto que juega aparece DOS veces en la misma familia:
 * como titular de la cuenta y como jugador. Y de eso depende un precio.
 */
function sinAcentos(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

function soloAlfanumerico(texto) {
    return String(texto || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * La identidad de un jugador tal como la guarda la tabla `players`, con los
 * mismos nombres de campo que usa el formulario. Sin esto cada handler
 * compararía con los nombres de SU tabla y un día compararian cosas distintas.
 */
function identidadDePlayer(fila) {
    if (!fila) return null;
    return {
        nombre: fila.first_name,
        apellido: fila.last_name,
        fecha_nacimiento: fila.dob,
        tipo_documento: fila.tax_type,
        numero_documento: fila.tax_number,
    };
}

function esLaMismaPersona(a, b) {
    if (!a || !b) return false;

    // El documento manda: si los dos lo tienen, decide él y no se mira nada más.
    // Dos personas pueden llamarse igual y haber nacido el mismo día —pasa con
    // padre e hijo que comparten nombre— pero no comparten el DNI.
    const docA = soloAlfanumerico(a.numero_documento);
    const docB = soloAlfanumerico(b.numero_documento);
    if (docA && docB) return docA === docB;

    const nombreA = sinAcentos(`${a.nombre || ''} ${a.apellido || ''}`);
    const nombreB = sinAcentos(`${b.nombre || ''} ${b.apellido || ''}`);
    if (!nombreA || nombreA !== nombreB) return false;

    // El nombre solo no alcanza: padre e hijo con el mismo nombre y apellido son
    // dos personas, y si el descuento dependiera del nombre el hijo dejaria de
    // contar como hermano de su propio hermano.
    const fechaA = String(a.fecha_nacimiento || '').slice(0, 10);
    const fechaB = String(b.fecha_nacimiento || '').slice(0, 10);
    if (fechaA && fechaB) return fechaA === fechaB;

    // Uno de los dos no tiene ni fecha ni documento con que distinguirse.
    //
    // Pasa de verdad: la ficha de jugador SIEMPRE lleva fecha de nacimiento (el
    // formulario la exige) pero la del responsable no, y los dos campos de
    // documento son opcionales. Con la regla estricta, un padre que juega y no
    // rellenó su propia fecha dejaba de ser reconocido como el titular y volvía
    // a contar como hermano de su hijo: el agujero de los 90 €, reabierto por
    // un campo vacío.
    //
    // Con el nombre completo igual y nada con que separarlos, se da por hecho
    // que es la misma persona. Se equivoca sólo con un padre y un hijo que se
    // llamen exactamente igual Y en cuya cuenta no haya ni una fecha ni un DNI,
    // y ese error cuesta un descuento que la familia puede reclamar — al revés
    // cuesta 90 € que nadie reclama nunca.
    return !(fechaA || docA) || !(fechaB || docB);
}

/**
 * Si este jugador cuenta como hermano de los demás de su familia.
 *
 * LA REGLA: EL PADRE QUE JUEGA NO ES UN HERMANO
 *
 * El descuento por hermano existe para las familias que traen varios HIJOS.
 * Un padre o una madre que además juega —que los hay, treinta y pico— no
 * convierte a su hijo único en hermano de nadie: sigue siendo un hijo solo.
 * Decisión del club, 28 de septiembre de 2026.
 *
 * Antes sí contaba, y el efecto era concreto: un padre que se apuntaba a jugar
 * le bajaba la cuota a su hijo de 50 a 40 €. 90 € por temporada y por familia.
 *
 * POR QUÉ SE MIRA LA IDENTIDAD Y NO EL PARENTESCO DEL VÍNCULO
 *
 * La primera versión de esto miraba `tutor_jugador.parentesco !== 'el_mismo'`.
 * Parecía lo mismo y no lo era, por tres motivos:
 *
 *   1. El parentesco lo rellena la FAMILIA en un desplegable, y con esa regla
 *      pasaba a decidir un precio. Bastaba con dejarlo en "Soy su tutor/a
 *      legal" —que además es el valor POR DEFECTO de una ficha nueva— para
 *      que el padre volviera a contar y el hijo único pagara 40 en vez de 50.
 *      Y al reves de lo que parece, eso no exigía mala fe: un padre que rellena
 *      su propia ficha sin tildar "Soy yo, el jugador" se lo llevaba puesto sin
 *      enterarse, y quedaba sellado en `tarifa_variante_origen`.
 *
 *   2. El parentesco es de la pareja (tutor, jugador), no del jugador. Con
 *      padres separados, el mismo chico valía 40 ó 50 € según cuál de las dos
 *      cuentas mirara.
 *
 *   3. `parentesco` responde a "¿de quién es esta ficha en pantalla?", que NO
 *      es la misma pregunta que "¿es este jugador un padre o un hijo?".
 *
 * La identidad no se puede elegir: o el jugador es la persona que abrió la
 * cuenta, o no lo es. Se sigue respetando un 'el_mismo' declarado — declararlo
 * en falso SUBE el precio, así que nadie lo va a hacer para ahorrar.
 *
 * QUÉ NO ES: NO es un criterio de edad. Un hijo de 19 que juega en senior SÍ
 * cuenta para el descuento de su hermano de 15, porque es un hijo de la familia
 * y no el titular de la cuenta. Con el criterio de la edad, ese hermano pequeño
 * perdería el descuento el año en que el mayor cumple 18 sin que en la familia
 * cambie nada.
 */
function cuentaComoHermano(jugador, titular, parentesco) {
    if (parentesco === 'el_mismo') return false;
    return !esLaMismaPersona(jugador, titular);
}


/**
 * Qué tarifa le toca, SIN preguntárselo a la familia.
 *
 * La familia no elige: todo sale a precio normal. Las tarifas de directivo,
 * entrenador y colaborador las aplica el club al revisar la inscripción — si la
 * familia pudiera elegirlas, cualquiera se asignaría la de 10 €.
 *
 * Lo único automático es el descuento por hermano, y la regla es la que puso el
 * club: si la familia trae más de un HIJO jugando, los JUVENILES pasan a tarifa
 * de hermano. Da igual el apellido — hay familias con apellidos distintos — y
 * da igual la edad del hermano; lo que no cuenta es el padre o la madre que
 * juega, que no es hermano de su propio hijo. Ver cuentaComoHermano().
 *
 * En adultos no existe el descuento, así que se quedan en base. Lo hace cumplir
 * además el CHECK inscripciones_sin_hermano_en_adultos.
 */
function varianteAutomatica(tramo, hijosDeLaFamilia) {
    if (tramo !== 'juvenil') return 'base';
    return hijosDeLaFamilia > 1 ? 'con_hermano' : 'base';
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
            // El remitente es noreply@, que nadie lee. Sin esto, la familia que
            // conteste el correo —y contestan— escribe a un buzón vacío y se
            // queda pensando que el club no le responde.
            replyTo: 'info@menorcarugbyclub.com',
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
    MESES_DE_CUOTA,
    PRIMER_COBRO,
    ULTIMO_COBRO,
    tramoDeFicha,
    varianteDeFicha,
    varianteAutomatica,
    cuentaComoHermano,
    esLaMismaPersona,
    identidadDePlayer,
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
