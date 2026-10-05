/**
 * Prueba de punta a punta del alta y la renovación, sin desplegar.
 *
 * Invoca los handlers directamente con un req/res de mentira, contra la base
 * REAL, y al final borra todo lo que creó. Es la única forma de comprobar de
 * verdad los CONSTRAINT TRIGGER: son DEFERRABLE y sólo saltan al cerrar cada
 * request de PostgREST, así que un mock de Supabase no los ejercitaría.
 *
 *   node api/_lib/probar-inscripcion.js
 *
 * Todo lo que crea lleva el correo de prueba de abajo y se limpia al terminar,
 * incluso si algún paso falla.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// El .env.local vive en el proyecto de la app; esta web lee las variables desde
// Vercel. Para probar en local se toman de ahí.
const RUTA_ENV = 'C:/red.umbrella/rugby-manager/rugby-manager/.env.local';
const env = Object.fromEntries(
    fs
        .readFileSync(RUTA_ENV, 'utf8')
        .split(/\r?\n/)
        .filter((l) => l.includes('=') && !l.startsWith('#'))
        .map((l) => {
            const i = l.indexOf('=');
            return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
        })
);
process.env.SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
// A propósito SIN credenciales de Gmail: así se prueba también que el handler
// avise cuando el correo no sale, que es la situación real de hoy.
delete process.env.GMAIL_USER;
delete process.env.GMAIL_APP_PASSWORD;

const EMAIL = 'prueba.inscripcion.borrar@menorcarugbyclub.test';
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

// ── req/res de mentira ─────────────────────────────────────────────────────
function llamar(accion, { method = 'POST', body = null, token = null } = {}) {
    // Se llama al router de verdad, no a cada handler por separado: asi la
    // prueba tambien cubre el reparto por accion y el chequeo de metodo.
    const handler = require(path.join(__dirname, '..', 'inscripcion.js'));
    const req = {
        method,
        body: method === 'GET' ? null : Object.assign({ accion }, body || {}),
        query: method === 'GET' ? { accion } : {},
        headers: token ? { authorization: `Bearer ${token}` } : {},
    };
    return new Promise((resolve) => {
        const res = {
            _status: 200,
            setHeader() {},
            status(c) {
                this._status = c;
                return this;
            },
            json(d) {
                resolve({ status: this._status, body: d });
            },
            end() {
                resolve({ status: this._status, body: null });
            },
        };
        Promise.resolve(handler(req, res)).catch((e) => resolve({ status: 500, body: { error: e.message } }));
    });
}

let fallos = 0;
function comprobar(titulo, condicion, detalle) {
    const ok = Boolean(condicion);
    if (!ok) fallos++;
    console.log(`  ${ok ? 'OK  ' : 'MAL '} ${titulo}${detalle && !ok ? ` -> ${JSON.stringify(detalle)}` : ''}`);
}

/**
 * Los datos del responsable que el servidor exige.
 *
 * Direccion, poblacion, codigo postal, telefono y documento pasaron a ser
 * obligatorios: el formulario comprobaba la FORMA y nunca el contenido, asi
 * que entraban telefonos con espacios, DNIs con puntos y codigos postales
 * inventados. Se reparten sobre cada payload de prueba para no repetirlos
 * veintitres veces — y para que, cuando la regla cambie, cambie en un sitio.
 */
let nDni = 0;
/** Un DNI distinto en cada uso: `tutores_documento_unico` no admite repetidos. */
function dniDePrueba() {
    nDni += 1;
    return String(90000000 + nDni) + 'Z';
}

const DATOS_MINIMOS = {
    apellido: 'De Prueba',
    telefonos: ['612345678'],
    tipo_documento: 'DNI',
    // Getter y no valor: cada `...DATOS_MINIMOS` lo evalua otra vez, asi que
    // cada tutor de prueba entra con el suyo.
    get numero_documento() { return dniDePrueba(); },
    direccion: 'Carrer de Prova, 1',
    codigo_postal: '07701',
    ciudad: 'Ma\u00f3',
};

// ── Limpieza ───────────────────────────────────────────────────────────────
async function limpiar(silencioso) {
    const { data: tutor } = await db.from('tutores').select('tutor_id').eq('email', EMAIL).maybeSingle();
    if (!tutor) {
        if (!silencioso) console.log('  (no había nada que limpiar)');
        return;
    }
    const { data: vinculos } = await db.from('tutor_jugador').select('player_id').eq('tutor_id', tutor.tutor_id);
    const ids = (vinculos || []).map((v) => v.player_id);

    // Borrar el tutor cascadea los vínculos; las inscripciones y los datos
    // personales cuelgan del jugador, así que se van con él.
    await db.from('tutores').delete().eq('tutor_id', tutor.tutor_id);
    for (const id of ids) {
        await db.from('players').delete().eq('player_id', id);
        // Borrar la fila del jugador NO borra sus archivos: el Storage no tiene
        // foreign keys. Sin esto, cada corrida de la prueba deja una carpeta
        // huerfana con una foto adentro.
        const { data: archivos } = await db.storage.from('player-photos').list(id);
        const rutas = (archivos || []).map((a) => `${id}/${a.name}`);
        if (rutas.length) await db.storage.from('player-photos').remove(rutas);
    }
    if (!silencioso) console.log(`  limpiados: 1 tutor, ${ids.length} jugadores`);
}

// ── La prueba ──────────────────────────────────────────────────────────────
async function main() {
    console.log('Limpieza previa');
    await limpiar();

    const hoy = new Date();
    const yearTemporada = hoy.getMonth() < 6 ? hoy.getFullYear() - 1 : hoy.getFullYear();
    const temporada = `${yearTemporada}/${yearTemporada + 1}`;

    console.log('\n1. El correo todavía no existe');
    let r = await llamar('inicio', { body: { email: EMAIL } });
    comprobar('responde 200', r.status === 200, r);
    comprobar('dice que no existe', r.body && r.body.existe === false, r.body);

    console.log('\n1b. El repartidor de acciones');
    r = await llamar('noexiste', { body: {} });
    comprobar('accion desconocida -> 404', r.status === 404, r.body);
    r = await llamar('inicio', { method: 'GET' });
    comprobar('accion de POST pedida por GET -> 405', r.status === 405, r.body);
    r = await llamar('estado', { body: {} });
    comprobar('accion de GET pedida por POST -> 405', r.status === 405, r.body);

    // La forma de la factura cambia con la version de API. La que entrega el
    // webhook es basil, donde `subscription` ya no esta arriba. Leerlo del sitio
    // viejo hizo que durante siete semanas no se anotara ni una renovacion.
    console.log('\n1c. La suscripcion de una factura, venga como venga');
    {
        const { suscripcionDeLaFactura } = require('./stripe-factura');
        comprobar('la forma vieja (acacia)',
            suscripcionDeLaFactura({ subscription: 'sub_viejo' }) === 'sub_viejo');
        comprobar('la forma nueva (basil)',
            suscripcionDeLaFactura({ parent: { subscription_details: { subscription: 'sub_nuevo' } } }) === 'sub_nuevo');
        comprobar('cuando viene el objeto entero y no el id',
            suscripcionDeLaFactura({ parent: { subscription_details: { subscription: { id: 'sub_obj' } } } }) === 'sub_obj');
        comprobar('una factura que no es de suscripcion da null',
            suscripcionDeLaFactura({ parent: { quote_details: null, type: 'quote_details' } }) === null);
        comprobar('y una factura vacia no revienta', suscripcionDeLaFactura(null) === null);
    }

    console.log('\n2. Rechaza lo que tiene que rechazar');
    r = await llamar('enviar', { body: { tutor: { ...DATOS_MINIMOS, nombre: 'X', email: EMAIL }, jugadores: [] } });
    comprobar('sin reglamento -> 400', r.status === 400, r.body);

    r = await llamar('enviar', {
        body: { acepta_reglamento: true, tutor: { ...DATOS_MINIMOS, nombre: 'X', email: EMAIL }, jugadores: [] },
    });
    comprobar('sin jugadores -> 400', r.status === 400, r.body);

    // La familia ya no elige tarifa: si manda una, se ignora. Un solo hijo tiene
    // que quedar en 'base' aunque pida "con hermano".
    r = await llamar('enviar', {
        body: {
            acepta_reglamento: true,
            tutor: { ...DATOS_MINIMOS, nombre: 'Uno', apellido: 'Solo Prueba', email: 'prueba.un.solo.hijo@menorcarugbyclub.test' },
            jugadores: [{ nombre: 'Unico', apellido: 'Hijo Prueba', fecha_nacimiento: '2014-03-02', genero: 'Masculino',
                          tarifa_variante: 'con_hermano', parentesco: 'padre' }],
        },
    });
    comprobar('la tarifa que manda el navegador se ignora', r.status === 200, r.body);
    comprobar('un solo hijo queda en cuota normal', r.body && r.body.jugadores && r.body.jugadores[0].variante === 'base', r.body && r.body.jugadores);
    comprobar('y con la ficha de 185 por ser de 2014 (12 años)', r.body && r.body.jugadores && r.body.jugadores[0].ficha_anual === 185, r.body && r.body.jugadores);
    {
        const { data: t } = await db.from('tutores').select('tutor_id').eq('email', 'prueba.un.solo.hijo@menorcarugbyclub.test').maybeSingle();
        if (t) {
            const { data: v } = await db.from('tutor_jugador').select('player_id').eq('tutor_id', t.tutor_id);
            await db.from('tutores').delete().eq('tutor_id', t.tutor_id);
            for (const x of v || []) await db.from('players').delete().eq('player_id', x.player_id);
        }
    }

    // El caso que habría roto el primer cobro de verdad: un chico de 17 CON
    // HERMANO. La cuota le va por la categoría (juvenil, con descuento de
    // hermano) y la ficha por el año de nacimiento (senior). Buscar la ficha
    // por la variante de la cuota pedía `ficha_anual|con_hermano|senior`, una
    // fila que la base PROHÍBE crear, así que el pago de la familia entera se
    // cortaba con un 503 que nadie podía arreglar.
    const MAIL_HERMANOS = 'prueba.hermano.de.17@menorcarugbyclub.test';
    r = await llamar('enviar', {
        body: {
            acepta_reglamento: true,
            tutor: { ...DATOS_MINIMOS, nombre: 'Dos', apellido: 'Hermanos Prueba', email: MAIL_HERMANOS },
            jugadores: [
                { nombre: 'Grande', apellido: 'Hermanos Prueba17', fecha_nacimiento: '2009-05-10',
                  genero: 'Masculino', parentesco: 'padre' },
                { nombre: 'Chico', apellido: 'Hermanos Prueba17', fecha_nacimiento: '2014-05-10',
                  genero: 'Masculino', parentesco: 'padre' },
            ],
        },
    });
    {
        comprobar('la familia de dos entra', r.status === 200, r.body);
        const js = (r.body && r.body.jugadores) || [];
        const grande = js.find((x) => /Grande/.test(x.nombre));
        const chico = js.find((x) => /Chico/.test(x.nombre));
        comprobar('los dos llevan descuento de hermano',
            grande && chico && grande.variante === 'con_hermano' && chico.variante === 'con_hermano',
            js);
        comprobar('el de 17 paga cuota de juvenil con hermano', grande && grande.mensualidad === 40, grande);
        comprobar('pero su ficha es la de senior, sin descuento', grande && grande.ficha_anual === 300, grande);
        comprobar('el chico de 12 paga la ficha de juvenil (185)', chico && chico.ficha_anual === 185, chico);
        comprobar('y ninguno se queda sin total de temporada',
            grande && chico && grande.total_temporada === 660 && chico.total_temporada === 545,
            js);
        const { data: t } = await db.from('tutores').select('tutor_id').eq('email', MAIL_HERMANOS).maybeSingle();
        if (t) {
            const { data: v } = await db.from('tutor_jugador').select('player_id').eq('tutor_id', t.tutor_id);
            await db.from('tutores').delete().eq('tutor_id', t.tutor_id);
            for (const x of v || []) await db.from('players').delete().eq('player_id', x.player_id);
        }
    }

    // La ficha federativa va por el AÑO DE NACIMIENTO, no por la categoría en
    // la que entrena. El que este año cumple 17 juega de juvenil —cuota de
    // juvenil— pero su ficha ya es la de 300 €.
    const MAIL_17 = 'prueba.ficha.de.17@menorcarugbyclub.test';
    r = await llamar('enviar', {
        body: {
            acepta_reglamento: true,
            tutor: { ...DATOS_MINIMOS, nombre: 'Uno', apellido: 'De 17 Prueba', email: MAIL_17 },
            jugadores: [{ nombre: 'Casi', apellido: 'Mayor Prueba17', fecha_nacimiento: '2009-05-10',
                          genero: 'Masculino', parentesco: 'padre' }],
        },
    });
    {
        const j = r.body && r.body.jugadores && r.body.jugadores[0];
        comprobar('el de 17 entrena de juvenil', j && j.tramo === 'juvenil', j);
        comprobar('paga cuota de juvenil', j && j.mensualidad === 50, j);
        comprobar('pero la ficha de 300', j && j.ficha_anual === 300, j);
        comprobar('y el total de la temporada sale bien', j && j.total_temporada === 750, j);
        const { data: t } = await db.from('tutores').select('tutor_id').eq('email', MAIL_17).maybeSingle();
        if (t) {
            const { data: v } = await db.from('tutor_jugador').select('player_id').eq('tutor_id', t.tutor_id);
            await db.from('tutores').delete().eq('tutor_id', t.tutor_id);
            for (const x of v || []) await db.from('players').delete().eq('player_id', x.player_id);
        }
    }

    r = await llamar('enviar', {
        body: {
            acepta_reglamento: true,
            // Tipo SIN numero: los datos comunes traen uno, asi que hay que
            // quitarlo a proposito para probar lo que esta prueba prueba.
            tutor: { ...DATOS_MINIMOS, nombre: 'X', email: EMAIL, tipo_documento: 'DNI', numero_documento: '' },
            jugadores: [{ nombre: 'A', apellido: 'B', fecha_nacimiento: '2014-03-02', genero: 'Masculino', tarifa_variante: 'base' }],
        },
    });
    comprobar('documento a medias -> 400', r.status === 400, r.body);

    r = await llamar('enviar', {
        body: {
            acepta_reglamento: true,
            tutor: { ...DATOS_MINIMOS, nombre: 'X', email: EMAIL },
            jugadores: [{ nombre: 'A', apellido: 'B', fecha_nacimiento: '2014-03-02', genero: 'Masculino', tarifa_variante: 'base', altura_cm: 400 }],
        },
    });
    comprobar('altura imposible -> 400', r.status === 400, r.body);

    console.log('\n3. Alta de una familia nueva con dos hermanos');
    const fotoMinima =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    r = await llamar('enviar', {
        body: {
            acepta_reglamento: true,
            tutor: { ...DATOS_MINIMOS,
                nombre: 'Prueba',
                apellido: 'Borrar Esto',
                email: EMAIL,
                fecha_nacimiento: '1980-05-05',
                tipo_documento: 'DNI',
                numero_documento: '00000000T',
                telefonos: ['600000000'],
                direccion: 'Calle de Prueba 1',
                codigo_postal: '07700',
                ciudad: 'Maó',
            },
            jugadores: [
                {
                    nombre: 'Hermano', apellido: 'Mayor Prueba', fecha_nacimiento: '2011-03-02',
                    genero: 'Masculino', tarifa_variante: 'con_hermano', parentesco: 'padre',
                    altura_cm: 165, peso_kg: 55, talla_camiseta: 'M', talla_pantalon: 'M', talla_chandal: 'M',
                    alergias: 'ninguna', acepta_uso_imagen: true, foto: fotoMinima,
                },
                {
                    nombre: 'Hermana', apellido: 'Menor Prueba', fecha_nacimiento: '2016-09-20',
                    genero: 'Femenino', tarifa_variante: 'con_hermano', parentesco: 'padre',
                    talla_camiseta: '10', acepta_uso_imagen: false,
                },
            ],
        },
    });
    comprobar('responde 200', r.status === 200, r.body);
    comprobar('crea la cuenta', r.body && r.body.cuenta_creada === true, r.body);
    comprobar('avisa que el correo no salió', Boolean(r.body && r.body.aviso), r.body);
    comprobar('devuelve dos jugadores', r.body && r.body.jugadores && r.body.jugadores.length === 2, r.body);

    if (r.body && r.body.jugadores) {
        const mayor = r.body.jugadores[0];
        const menor = r.body.jugadores[1];
        // Nacido en 2011: en la temporada 2026 tiene 15 -> SUB16, y por ser impar
        // sube también a SUB18.
        const edadMayor = yearTemporada - 2011;
        comprobar(
            `categoría del mayor coherente con ${edadMayor} años (${mayor.categoria})`,
            mayor.categoria.startsWith('SUB') || mayor.categoria === 'SENIOR',
            mayor
        );
        comprobar('la menor va a una SUB', menor.categoria.startsWith('SUB'), menor);
        comprobar('tarifa juvenil con hermano', mayor.tramo === 'juvenil' && mayor.variante === 'con_hermano', mayor);
    }

    console.log('\n4. Ahora el correo SÍ existe');
    r = await llamar('inicio', { body: { email: EMAIL } });
    comprobar('dice que existe', r.body && r.body.existe === true, r.body);
    comprobar('es tutor', r.body && r.body.tipo === 'tutor', r.body);
    comprobar('cuenta los dos hijos', r.body && r.body.hijos === 2, r.body);
    comprobar('tiene contraseña', r.body && r.body.tiene_password === true, r.body);

    console.log('\n5. No deja crear la familia dos veces');
    r = await llamar('enviar', {
        body: {
            acepta_reglamento: true,
            tutor: { ...DATOS_MINIMOS, nombre: 'Prueba', email: EMAIL },
            jugadores: [{ nombre: 'Otro', apellido: 'Mas', fecha_nacimiento: '2015-01-01', genero: 'Masculino', tarifa_variante: 'base' }],
        },
    });
    comprobar('sin token y con correo ya usado -> 409', r.status === 409, r.body);

    console.log('\n6. Contraseña nueva y entrar');
    r = await llamar('recordar', { body: { email: EMAIL } });
    comprobar('responde 200', r.status === 200, r.body);
    comprobar('avisa que el correo no salió', r.body && r.body.enviado === false && r.body.aviso, r.body);

    // Como el mail no sale, para seguir probando se pone una contraseña conocida.
    const { hashPassword } = require('../_lib/auth');
    await db.from('tutores').update({ password_hash: hashPassword('prueba1234') }).eq('email', EMAIL);

    r = await llamar('acceso', { body: { email: EMAIL, password: 'malísima' } });
    comprobar('contraseña incorrecta -> 401', r.status === 401, r.body);

    r = await llamar('acceso', { body: { email: EMAIL, password: 'prueba1234' } });
    comprobar('contraseña correcta -> 200', r.status === 200, r.body);
    const token = r.body && r.body.token;
    comprobar('devuelve token', Boolean(token), r.body);

    console.log('\n7. Lo que ve la familia al entrar');
    r = await llamar('estado', { method: 'GET', token });
    comprobar('responde 200', r.status === 200, r.body);
    comprobar('temporada correcta', r.body && r.body.temporada === temporada, r.body && r.body.temporada);
    comprobar('trae los dos jugadores', r.body && r.body.jugadores && r.body.jugadores.length === 2, r.body);
    if (r.body && r.body.jugadores) {
        const j = r.body.jugadores[0];
        comprobar('trae la inscripción de esta temporada', Boolean(j.inscripcion_actual), j);
        // Ya no son "opciones": la familia no elige tarifa. Se comprueba que
        // venga LA que le toca, con el importe y con las fechas de cobro.
        comprobar('trae la tarifa que le toca', Boolean(j.tarifa) && j.tarifa.mensualidad > 0, j.tarifa);
        comprobar('con las 9 cuotas y las fechas', j.tarifa && j.tarifa.meses === 9 && /octubre/.test(j.tarifa.primer_cobro || ''), j.tarifa);
        comprobar('y con el total de la temporada', j.tarifa && j.tarifa.total_temporada > j.tarifa.mensualidad, j.tarifa);
        comprobar('precarga tallas del año pasado o de este', Boolean(j.inscripcion_actual.talla_camiseta), j.inscripcion_actual);
        comprobar('guardó la foto como path, no como URL', !j.foto || j.foto.indexOf('http') !== 0, j.foto);
    }
    comprobar('sin token -> 401', (await llamar('estado', { method: 'GET' })).status === 401);

    console.log('\n8. Renovar: cambia una talla y la cuota');
    r = await llamar('enviar', {
        token,
        body: {
            acepta_reglamento: true,
            tutor: { ...DATOS_MINIMOS, nombre: 'Prueba', apellido: 'Borrar Esto', email: 'otro@intento.test', ciudad: 'Ciutadella' },
            jugadores: [
                {
                    // Por nombre, NO por el primero de la lista: el orden en que
                    // vuelven los vinculos no esta garantizado, y si salia la
                    // hermana la renovacion le cambiaba a ella el permiso de
                    // imagen y la comprobacion de mas abajo fallaba sin que
                    // hubiera nada roto.
                    player_id: (await db.from('players').select('player_id').eq('last_name', 'Mayor Prueba').single()).data.player_id,
                    nombre: 'Hermano', apellido: 'Mayor Prueba', fecha_nacimiento: '2011-03-02',
                    genero: 'Masculino', tarifa_variante: 'base', parentesco: 'padre',
                    talla_camiseta: 'L', acepta_uso_imagen: true,
                },
            ],
        },
    });
    comprobar('responde 200', r.status === 200, r.body);
    comprobar('NO crea otra cuenta', r.body && r.body.cuenta_creada === false, r.body);

    const { data: tutorFinal } = await db.from('tutores').select('email, ciudad').eq('email', EMAIL).maybeSingle();
    comprobar('el correo NO se puede cambiar por el cuerpo', Boolean(tutorFinal), tutorFinal);
    comprobar('sí actualiza el resto de los datos', tutorFinal && tutorFinal.ciudad === 'Ciutadella', tutorFinal);

    console.log('\n8b. El pago, sin pasarela configurada');
    // Sin STRIPE_SECRET_KEY el pago tiene que devolver un 503 con un mensaje
    // en castellano, NO tumbar la funcion entera. Antes el require de stripe
    // estaba en la cabecera del modulo y reventaba al cargar el repartidor:
    // sin clave no se podia ni escribir el correo.
    r = await llamar('pagar', { token, body: {} });
    comprobar('sin clave de Stripe -> 503, no 500', r.status === 503, r.body);
    comprobar('lo explica en castellano', r.body && /activado|escribinos/i.test(r.body.error || ''), r.body);
    r = await llamar('pagar', { body: {} });
    comprobar('pagar sin token -> 401', r.status === 401, r.body);

    console.log('\n9. Los invariantes de la base siguen en pie');
    const { data: tutorRow } = await db.from('tutores').select('tutor_id, activo').eq('email', EMAIL).single();
    comprobar('el tutor quedó activo', tutorRow.activo === true, tutorRow);

    const { data: vinculos } = await db.from('tutor_jugador').select('player_id, es_pagador').eq('tutor_id', tutorRow.tutor_id);
    comprobar('dos vínculos', vinculos.length === 2, vinculos);
    comprobar('un pagador por jugador', vinculos.every((v) => v.es_pagador === true), vinculos);

    const ids = vinculos.map((v) => v.player_id);
    const { data: inscs } = await db.from('inscripciones').select('player_id, estado, temporada, talla_camiseta, tarifa_variante').in('player_id', ids);
    comprobar('dos inscripciones', inscs.length === 2, inscs);
    comprobar('todas enviadas', inscs.every((i) => i.estado === 'enviada'), inscs);
    comprobar('todas de esta temporada', inscs.every((i) => i.temporada === temporada), inscs);
    const renovada = inscs.find((i) => i.talla_camiseta === 'L');
    comprobar('la renovación pisó la anterior (talla L)', Boolean(renovada), inscs);
    // La renovación mandó tarifa_variante: 'base' a propósito. Son dos
    // hermanos, así que el servidor la ignora y los dos siguen con el
    // descuento. Si esto se pone en 'base', alguien volvió a dejar que el
    // navegador elija el precio.
    comprobar('y NO pudo bajarse el precio sola', inscs.every((i) => i.tarifa_variante === 'con_hermano'), inscs);

    const { data: dp } = await db.from('player_datos_personales').select('player_id, direccion, autoriza_uso_imagen').in('player_id', ids);
    comprobar('guardó los datos personales', dp.length === 2, dp);
    comprobar('hereda la dirección del tutor', dp.every((d) => d.direccion), dp);
    comprobar('respeta el "no" al uso de imagen', dp.some((d) => d.autoriza_uso_imagen === false), dp);

    console.log('\n10. Renovar a uno y dar de baja a otro, en el mismo envio');
    // El caso literal del presidente: dos hijos, uno sigue y el otro no.
    {
        const { data: t } = await db.from('tutores').select('tutor_id').eq('email', EMAIL).single();
        const { data: v } = await db.from('tutor_jugador').select('player_id').eq('tutor_id', t.tutor_id);
        const { data: ps } = await db.from('players').select('player_id, first_name, last_name, dob, gender').in('player_id', v.map((x) => x.player_id));
        const sigue = ps.find((x) => x.last_name === 'Mayor Prueba');
        const seVa = ps.find((x) => x.last_name === 'Menor Prueba');

        r = await llamar('enviar', {
            token,
            body: {
                acepta_reglamento: true,
                tutor: { ...DATOS_MINIMOS, nombre: 'Prueba', email: EMAIL },
                jugadores: [
                    { player_id: sigue.player_id, nombre: sigue.first_name, apellido: sigue.last_name,
                      fecha_nacimiento: sigue.dob, genero: sigue.gender, tarifa_variante: 'base', parentesco: 'padre' },
                    { player_id: seVa.player_id, nombre: seVa.first_name, apellido: seVa.last_name,
                      no_renueva: true, motivo_no_renueva: 'este anio no juega' },
                ],
            },
        });
        comprobar('lo acepta', r.status === 200, r.body);
        comprobar('devuelve uno que sigue y uno que no', r.body && r.body.jugadores.filter((x) => x.no_renueva).length === 1, r.body && r.body.jugadores);
        comprobar('el total no cuenta al que se va', r.body && r.body.total_mensual > 0, r.body && r.body.total_mensual);

        const { data: iSigue } = await db.from('inscripciones').select('estado').eq('player_id', sigue.player_id).eq('temporada', temporada).single();
        const { data: iVa } = await db.from('inscripciones').select('estado, motivo_baja, baja_at').eq('player_id', seVa.player_id).eq('temporada', temporada).single();
        comprobar('el que sigue queda enviada', iSigue.estado === 'enviada', iSigue);
        comprobar('el que se va queda de baja', iVa.estado === 'baja', iVa);
        comprobar('con el motivo que puso la familia', /no juega/.test(iVa.motivo_baja || ''), iVa);
        comprobar('y con fecha de baja', Boolean(iVa.baja_at), iVa);

        const { data: pSigue } = await db.from('players').select('estado_club').eq('player_id', sigue.player_id).single();
        const { data: pVa } = await db.from('players').select('estado_club').eq('player_id', seVa.player_id).single();
        comprobar('el entrenador sigue viendo al que juega', pSigue.estado_club !== 'baja', pSigue);
        comprobar('y deja de ver al que se fue', pVa.estado_club === 'baja', pVa);

        // El que queda solo deja de ser hermano. La baja se escribe dentro del
        // mismo bucle que calcula la tarifa, así que es fácil contar todavía al
        // que se va y cobrarle al otro 40 € cuando le tocan 50.
        const { data: tarifaSigue } = await db.from('inscripciones')
            .select('tarifa_variante').eq('player_id', sigue.player_id).eq('temporada', temporada).single();
        comprobar('el que se queda solo pierde el descuento de hermano', tarifaSigue.tarifa_variante === 'base', tarifaSigue);

        // Y lo que ve en pantalla tiene que decir lo mismo que se guardó.
        r = await llamar('estado', { method: 'GET', token });
        const enPantalla = (r.body.jugadores || []).find((x) => x.player_id === sigue.player_id);
        comprobar('y el formulario le muestra esa misma tarifa', enPantalla && enPantalla.tarifa && enPantalla.tarifa.variante === 'base', enPantalla && enPantalla.tarifa);
        comprobar('con la cuota entera de juvenil', enPantalla && enPantalla.tarifa && enPantalla.tarifa.mensualidad === 50, enPantalla && enPantalla.tarifa);
    }

    console.log('\n11. Reenviar sobre una inscripcion ya resuelta');
    // La maquina de estados prohibe aprobada->enviada y no deja salir de baja.
    // Antes el upsert chocaba con eso y le mostraba a la familia el error crudo
    // de Postgres.
    const idMayor = (await db.from('players').select('player_id').eq('last_name', 'Mayor Prueba').single()).data.player_id;
    await db.from('inscripciones').update({ estado: 'aprobada' }).eq('player_id', idMayor).eq('temporada', temporada);

    const reenvio = {
        acepta_reglamento: true,
        tutor: { ...DATOS_MINIMOS, nombre: 'Prueba', email: EMAIL },
        jugadores: [{
            player_id: idMayor, nombre: 'Hermano', apellido: 'Mayor Prueba',
            fecha_nacimiento: '2011-03-02', genero: 'Masculino',
            tarifa_variante: 'base', parentesco: 'padre', talla_camiseta: 'XL',
        }],
    };
    r = await llamar('enviar', { token, body: reenvio });
    comprobar('sobre una aprobada -> 200, no error de base', r.status === 200, r.body);
    {
        const { data } = await db.from('inscripciones').select('estado, talla_camiseta, observaciones')
            .eq('player_id', idMayor).eq('temporada', temporada).single();
        comprobar('sigue aprobada, no vuelve a la cola', data.estado === 'aprobada', data);
        comprobar('igual guarda el cambio de talla', data.talla_camiseta === 'XL', data);
        comprobar('lo anota para quien revise', /ya aprobada/i.test(data.observaciones || ''), data);
    }

    await db.from('inscripciones').update({ estado: 'baja', motivo_baja: 'prueba' })
        .eq('player_id', idMayor).eq('temporada', temporada);
    r = await llamar('enviar', { token, body: reenvio });
    comprobar('sobre una baja -> 409 con mensaje para la familia', r.status === 409, r.body);
    comprobar('el mensaje no es jerga de Postgres', r.body && /de baja/i.test(r.body.error || ''), r.body);

    {
        const { data } = await db.from('players').select('estado_club').eq('player_id', idMayor).single();
        comprobar('la baja marca al jugador, el entrenador deja de verlo', data.estado_club === 'baja', data);
    }

    console.log('\n11. Alguien que YA esta en el club pero nunca tuvo cuenta');
    // Es el caso de los 32 adultos que juegan y se pagan lo suyo, y de las
    // familias cuyo correo quedo en la ficha del chico. Antes el sistema les
    // decia 'no existis' y los dejaba cargar todo de cero, duplicando al
    // jugador que ya estaba.
    const MAIL_HUERFANO = 'prueba.jugador.sin.cuenta@menorcarugbyclub.test';
    const idHuerfano = 'PRUEBA-SIN-CUENTA';
    await db.from('players').insert({
        player_id: idHuerfano, first_name: 'Adulto', last_name: 'Sin Cuenta Prueba',
        dob: '1995-04-04', category_primary: 'SENIOR', categories_extra: [],
        status: 'available', gender: 'Masculino', email: MAIL_HUERFANO,
    });

    r = await llamar('inicio', { body: { email: MAIL_HUERFANO } });
    comprobar('lo reconoce por el mail del jugador', r.body && r.body.existe === true, r.body);
    comprobar('dice que es por la ficha del jugador', r.body && r.body.tipo === 'jugador', r.body);
    comprobar('dice a quien encontro', r.body && (r.body.encontrados || []).some(function (n) { return /Sin Cuenta Prueba/.test(n); }), r.body);
    comprobar('avisa que no tiene contrasena', r.body && r.body.tiene_password === false, r.body);

    r = await llamar('recordar', { body: { email: MAIL_HUERFANO } });
    comprobar('pedir la contrasena le crea la cuenta', r.status === 200, r.body);
    {
        const { data: cuenta } = await db.from('tutores').select('tutor_id, nombre, activo').eq('email', MAIL_HUERFANO).maybeSingle();
        comprobar('la cuenta existe y quedo activa', cuenta && cuenta.activo === true, cuenta);
        comprobar('toma el nombre del propio jugador', cuenta && cuenta.nombre === 'Adulto', cuenta);
        if (cuenta) {
            const { data: vinc } = await db.from('tutor_jugador').select('parentesco, es_pagador').eq('tutor_id', cuenta.tutor_id);
            comprobar('se vincula al jugador', vinc && vinc.length === 1, vinc);
            comprobar('un adulto es el_mismo, no su propio tutor', vinc && vinc[0].parentesco === 'el_mismo', vinc);
            comprobar('y es el pagador', vinc && vinc[0].es_pagador === true, vinc);
            await db.from('tutores').delete().eq('tutor_id', cuenta.tutor_id);
        }
    }
    await db.from('players').delete().eq('player_id', idHuerfano);

    console.log('\n12. No duplicar a un jugador que ya esta');
    // Aunque venga por un correo distinto del que tenia.
    const idViejo = 'PRUEBA-YA-ESTABA';
    await db.from('players').insert({
        player_id: idViejo, first_name: 'Repetido', last_name: 'De Prueba',
        dob: '2013-02-02', category_primary: 'SUB14', categories_extra: [],
        status: 'available', gender: 'Masculino',
    });
    r = await llamar('enviar', {
        body: {
            acepta_reglamento: true,
            tutor: { ...DATOS_MINIMOS, nombre: 'Otro', apellido: 'Correo', email: 'otro.correo.prueba@menorcarugbyclub.test' },
            jugadores: [{
                nombre: 'Repetido', apellido: 'De Prueba', fecha_nacimiento: '2013-02-02',
                genero: 'Masculino', tarifa_variante: 'base', parentesco: 'madre',
            }],
        },
    });
    comprobar('acepta el alta', r.status === 200, r.body);
    {
        const { data: repes } = await db.from('players').select('player_id').eq('last_name', 'De Prueba');
        comprobar('NO creo un segundo jugador', repes && repes.length === 1, repes);
        const { data: ins } = await db.from('inscripciones').select('observaciones').eq('player_id', idViejo).maybeSingle();
        comprobar('anota que reuso la ficha', ins && /ya estaba/i.test(ins.observaciones || ''), ins);
    }
    {
        const { data: otro } = await db.from('tutores').select('tutor_id').eq('email', 'otro.correo.prueba@menorcarugbyclub.test').maybeSingle();
        if (otro) await db.from('tutores').delete().eq('tutor_id', otro.tutor_id);
    }
    await db.from('players').delete().eq('player_id', idViejo);

    console.log('\n13. Un alta que falla a mitad NO deja a la familia encerrada');
    // El tutor se crea al principio con activo=false y se activa al final. Si
    // el segundo hijo fallaba, quedaba una cuenta inactiva con una contrasena
    // que nadie recibio: al reintentar decia 'ese correo ya esta registrado' y
    // al entrar, 'tu ficha esta archivada'. Encerrada hasta que lo destrabara
    // una persona.
    const MAIL_ROTO = 'prueba.alta.que.falla@menorcarugbyclub.test';
    // Para que falle a mitad hace falta algo que reviente DENTRO del bucle,
    // con el primer hijo ya escrito. Desde que la tarifa la calcula el
    // servidor, una tarifa mal puesta ya no sirve de disparador: el camino
    // vivo que queda es reclamar a alguien que el club dio de baja.
    await db.from('inscripciones').update({ estado: 'baja', motivo_baja: 'prueba' })
        .eq('player_id', idMayor).eq('temporada', temporada);
    r = await llamar('enviar', {
        body: {
            acepta_reglamento: true,
            tutor: { ...DATOS_MINIMOS, nombre: 'Falla', apellido: 'A Medias', email: MAIL_ROTO },
            jugadores: [
                { nombre: 'Primero', apellido: 'Falla Prueba', fecha_nacimiento: '2012-01-01', genero: 'Masculino', parentesco: 'padre' },
                // Este revienta: figura de baja esta temporada.
                { player_id: idMayor, nombre: 'Segundo', apellido: 'Mayor Prueba', fecha_nacimiento: '2011-03-02', genero: 'Masculino', parentesco: 'padre' },
            ],
        },
    });
    comprobar('rechaza con un mensaje, no con un 500', r.status === 409, r.body);
    comprobar('el mensaje nombra al jugador', r.body && /Segundo/.test(r.body.error || ''), r.body);
    {
        const { data: huerfano } = await db.from('tutores').select('tutor_id, activo').eq('email', MAIL_ROTO).maybeSingle();
        comprobar('NO deja la cuenta a medias', !huerfano, huerfano);
    }
    // Y que el reintento corregido funcione.
    r = await llamar('enviar', {
        body: {
            acepta_reglamento: true,
            tutor: { ...DATOS_MINIMOS, nombre: 'Falla', apellido: 'A Medias', email: MAIL_ROTO },
            jugadores: [
                { nombre: 'Primero', apellido: 'Falla Prueba', fecha_nacimiento: '2012-01-01', genero: 'Masculino', parentesco: 'padre' },
            ],
        },
    });
    comprobar('el reintento corregido entra', r.status === 200, r.body);
    {
        const { data: repes } = await db.from('players').select('player_id').eq('last_name', 'Falla Prueba');
        comprobar('y no duplico al primer hijo', repes && repes.length === 1, repes);
        const { data: t } = await db.from('tutores').select('tutor_id').eq('email', MAIL_ROTO).maybeSingle();
        if (t) {
            const { data: v } = await db.from('tutor_jugador').select('player_id').eq('tutor_id', t.tutor_id);
            await db.from('tutores').delete().eq('tutor_id', t.tutor_id);
            for (const x of v || []) await db.from('players').delete().eq('player_id', x.player_id);
        }
        for (const x of repes || []) await db.from('players').delete().eq('player_id', x.player_id);
    }

    // ── 14 ──────────────────────────────────────────────────────────────
    //
    // La misma persona, dos correos, una sola cuenta.
    //
    // Quien es socio con un correo y tutor con otro —lo normal: uno es el de
    // siempre y el otro el que tenia a mano el dia que inscribio a los hijos—
    // entraba a la inscripcion y NO a su carnet. Y al reves: entrando por el
    // carnet, «Mis jugadores» salia vacia y «Cambiar mi tarjeta» daba 401,
    // porque el token de esa puerta nunca llevo tutor_id.
    //
    // Se prueba con los handlers de verdad porque el fallo no estaba en la
    // logica de negocio sino en la forma del token, que es justo lo que un mock
    // se inventa.
    console.log('\n14. La misma persona, dos correos, un solo carnet');
    {
        const login = require(path.join(__dirname, '..', 'socio-login.js'));
        const CLAVE_SOCIO = 'clave-de-prueba-socio';
        const CLAVE_TUTOR = 'clave-de-prueba-tutor';
        const MAIL_SOCIO = 'prueba.doble.socio.borrar@menorcarugbyclub.test';
        const MAIL_TUTOR = 'prueba.doble.tutor.borrar@menorcarugbyclub.test';
        const MAIL_HUERFANO = 'prueba.solo.tutor.borrar@menorcarugbyclub.test';
        const { hashPassword } = require('./auth');

        function entrar(email, password) {
            const req = { method: 'POST', body: { email, password }, headers: {} };
            return new Promise((resolve) => {
                const res = {
                    _status: 200,
                    setHeader() {},
                    end() { resolve({ status: this._status, body: null }); },
                    status(c) { this._status = c; return this; },
                    json(b) { resolve({ status: this._status, body: b }); },
                };
                Promise.resolve(login(req, res)).catch((e) => resolve({ status: 500, body: { error: e.message } }));
            });
        }

        const limpiarDoble = async () => {
            for (const m of [MAIL_TUTOR, MAIL_HUERFANO]) {
                await db.from('tutores').delete().eq('email', m);
            }
            await db.from('socios').delete().eq('email', MAIL_SOCIO);
        };
        await limpiarDoble();

        const { data: socio } = await db
            .from('socios')
            .insert({
                nombre: 'Prueba', apellido: 'Doble Cuenta', documento: 'X0000000P',
                email: MAIL_SOCIO, tipo_socio: 'gym', estado_pago: 'completado',
                password_hash: hashPassword(CLAVE_SOCIO),
            })
            .select('id')
            .single();

        // El tutor se crea inactivo y sin hijos: uno activo sin hijos hace
        // saltar `tutores_exigir_hijo_alta` al cerrar el request.
        const { data: tutor } = await db
            .from('tutores')
            .insert({
                nombre: 'Prueba', apellido: 'Doble Cuenta', email: MAIL_TUTOR,
                activo: false, socio_id: socio.id,
                password_hash: hashPassword(CLAVE_TUTOR),
            })
            .select('tutor_id')
            .single();

        // (a) Entrando por el correo de SOCIO, el token tiene que llevar
        //     tambien el tutor_id, que es lo que enciende «Mis jugadores».
        let e = await entrar(MAIL_SOCIO, CLAVE_SOCIO);
        comprobar('entra con el correo de socio', e.status === 200, e.body);
        const { verifyJWT } = require('./auth');
        const pay = e.body && e.body.token ? verifyJWT(e.body.token) : null;
        comprobar('el token lleva socio_id', Boolean(pay && pay.socio_id), pay);
        comprobar('y AHORA tambien tutor_id', Boolean(pay && pay.tutor_id), pay);

        // (b) Entrando por el correo de TUTOR, con la clave del tutor, llega al
        //     mismo carnet. Antes esto era «Email o contraseña incorrectos».
        e = await entrar(MAIL_TUTOR, CLAVE_TUTOR);
        comprobar('entra al carnet con el correo de la inscripcion', e.status === 200, e.body);
        comprobar('y es la ficha de socio correcta',
            e.body && e.body.socio && e.body.socio.id === socio.id, e.body && e.body.socio);

        // (c) La clave equivocada sigue sin entrar por ninguna de las dos.
        e = await entrar(MAIL_TUTOR, 'no-es-esta-clave');
        comprobar('la clave mala no entra por el correo de tutor', e.status === 401, e.body);
        e = await entrar(MAIL_SOCIO, CLAVE_TUTOR);
        comprobar('cada correo lleva SU clave', e.status === 401, e.body);

        // (d) Un tutor que NO es socio recibe un mensaje que dice adonde ir, no
        //     «contraseña incorrecta» — que es la respuesta que hace pedir una
        //     nueva, ANULA la que servia, y repite el ciclo.
        await db.from('tutores').insert({
            nombre: 'Solo', apellido: 'Tutor Prueba', email: MAIL_HUERFANO,
            activo: false, password_hash: hashPassword(CLAVE_TUTOR),
        });
        e = await entrar(MAIL_HUERFANO, CLAVE_TUTOR);
        comprobar('al tutor sin ficha de socio no se le miente', e.status === 403, e.body);
        comprobar('y se le dice adonde ir',
            e.body && /inscripcion/i.test(e.body.error || ''), e.body);

        // (e) `identidad` resuelve en los dos sentidos.
        const { identidad } = require('./auth');
        let id1 = await identidad(db, { socio_id: socio.id });
        comprobar('de socio a tutor', id1.tutorId === tutor.tutor_id, id1);
        let id2 = await identidad(db, { tutor_id: tutor.tutor_id });
        comprobar('de tutor a socio', id2.socioId === socio.id, id2);
        let id3 = await identidad(db, null);
        comprobar('sin token no inventa a nadie', !id3.tutorId && !id3.socioId, id3);

        // (f) Y lo que lo motivo: `accion=estado` con el token del carnet ya no
        //     devuelve 200 con la lista vacia.
        const tokenCarnet = (await entrar(MAIL_SOCIO, CLAVE_SOCIO)).body.token;
        const est = await llamar('estado', { method: 'GET', token: tokenCarnet });
        comprobar('estado responde 200 con el token del carnet', est.status === 200, est.body);
        comprobar('y encuentra al tutor', est.body && est.body.tutor
            && est.body.tutor.tutor_id === tutor.tutor_id, est.body && est.body.tutor);
        comprobar('y sabe que ademas es socio', est.body && est.body.es_socio === true, est.body);

        await limpiarDoble();
    }

    // ── 15 ──────────────────────────────────────────────────────────────
    //
    // El padre que juega NO es hermano de su hijo.
    //
    // Antes si contaba, y el efecto era: un padre se apuntaba a jugar y la
    // cuota de su hijo unico bajaba de 50 a 40 euros. 90 euros por temporada y
    // por familia, y desbloqueable a voluntad por quien lo notara.
    //
    // Se comprueban las TRES puertas por las que se puede llegar al descuento,
    // porque el numero lo calculan tres trozos de codigo distintos y basta con
    // que uno no se entere:
    //   (a) todo en un envio
    //   (b) en dos envios (primero el padre, despues el hijo)
    //   (c) la vista previa del navegador, que tiene que decir lo mismo que se
    //       guarda o la familia ve 40 y se le cobran 50
    console.log('\n15. El padre que juega no es hermano de su hijo');
    {
        const MAIL_PJ = 'prueba.padre.jugador.borrar@menorcarugbyclub.test';
        const limpiarPJ = async () => {
            const { data: t } = await db.from('tutores').select('tutor_id').eq('email', MAIL_PJ).maybeSingle();
            if (!t) return;
            const { data: v } = await db.from('tutor_jugador').select('player_id').eq('tutor_id', t.tutor_id);
            await db.from('tutores').delete().eq('tutor_id', t.tutor_id);
            for (const x of v || []) await db.from('players').delete().eq('player_id', x.player_id);
        };
        await limpiarPJ();

        const PADRE = { nombre: 'Padre', apellido: 'Jugador Prueba', fecha_nacimiento: '1985-04-04', genero: 'Masculino', parentesco: 'el_mismo' };
        const HIJO  = { nombre: 'Hijo',  apellido: 'Jugador Prueba', fecha_nacimiento: '2012-05-05', genero: 'Masculino', parentesco: 'padre' };

        // (a) Los dos en el mismo envio.
        let r = await llamar('enviar', {
            body: {
                acepta_reglamento: true,
                tutor: { ...DATOS_MINIMOS, nombre: 'Padre', apellido: 'Jugador Prueba', email: MAIL_PJ },
                jugadores: [PADRE, HIJO],
            },
        });
        comprobar('acepta al padre jugador y a su hijo', r.status === 200, r.body);
        {
            const hijo  = (r.body.jugadores || []).find((j) => j.nombre.startsWith('Hijo'));
            const padre = (r.body.jugadores || []).find((j) => j.nombre.startsWith('Padre'));
            comprobar('el hijo unico NO lleva descuento de hermano',
                hijo && hijo.variante === 'base', hijo);
            comprobar('y el padre tampoco (en adultos no existe)',
                padre && padre.variante === 'base', padre);
        }

        // (b) En dos veces: el padre ya estaba, ahora entra el hijo. Es el
        //     camino por el que el numero lo calcula la OTRA consulta, la de
        //     hermanos ya inscritos, y donde la regla se podia quedar a medias.
        await limpiarPJ();
        r = await llamar('enviar', {
            body: {
                acepta_reglamento: true,
                tutor: { ...DATOS_MINIMOS, nombre: 'Padre', apellido: 'Jugador Prueba', email: MAIL_PJ },
                jugadores: [PADRE],
            },
        });
        comprobar('el padre solo entra', r.status === 200, r.body);
        // La contrasena se genera y se manda por correo, que aca a proposito no
        // sale. Se pisa con una conocida para poder seguir, igual que hace la
        // seccion de renovacion.
        await db.from('tutores').update({ password_hash: hashPassword('prueba1234') }).eq('email', MAIL_PJ);
        r = await llamar('acceso', { body: { email: MAIL_PJ, password: 'prueba1234' } });
        const tokenPJ = r.body && r.body.token;
        comprobar('y puede entrar a renovar', Boolean(tokenPJ), r.body);

        r = await llamar('enviar', {
            token: tokenPJ,
            body: { acepta_reglamento: true, tutor: { ...DATOS_MINIMOS, nombre: 'Padre', apellido: 'Jugador Prueba', email: MAIL_PJ }, jugadores: [HIJO] },
        });
        comprobar('el hijo entra despues', r.status === 200, r.body);
        {
            const hijo = (r.body.jugadores || []).find((j) => j.nombre.startsWith('Hijo'));
            comprobar('y TAMPOCO lleva descuento inscribiendose aparte',
                hijo && hijo.variante === 'base', hijo);
        }

        // Lo que quedo guardado de verdad, que es lo unico que se cobra.
        {
            const { data: t } = await db.from('tutores').select('tutor_id').eq('email', MAIL_PJ).single();
            const { data: v } = await db.from('tutor_jugador').select('player_id, parentesco').eq('tutor_id', t.tutor_id);
            const idHijo = (v || []).find((x) => x.parentesco !== 'el_mismo');
            const { data: insc } = await db.from('inscripciones')
                .select('tarifa_variante').eq('player_id', idHijo.player_id).eq('temporada', temporada).single();
            comprobar('en la base figura base, no con_hermano',
                insc && insc.tarifa_variante === 'base', insc);
        }

        // (c) La vista previa tiene que decir lo mismo que se guardo.
        {
            const est = await llamar('estado', { method: 'GET', token: tokenPJ });
            comprobar('la vista previa responde', est.status === 200, est.body);
            const hijo = (est.body.jugadores || []).find((j) => j.parentesco !== 'el_mismo');
            const padre = (est.body.jugadores || []).find((j) => j.parentesco === 'el_mismo');
            comprobar('y le ensena al hijo la MISMA tarifa que se guardo',
                hijo && hijo.tarifa && hijo.tarifa.variante === 'base', hijo && hijo.tarifa);
            comprobar('y al padre, base', padre && padre.tarifa && padre.tarifa.variante === 'base',
                padre && padre.tarifa);
        }

        // (d) Y que el descuento SIGUE existiendo para dos hijos de verdad: lo
        //     facil al arreglar esto es apagarlo para todo el mundo.
        {
            const HIJO2 = { nombre: 'Hija', apellido: 'Jugador Prueba', fecha_nacimiento: '2014-06-06', genero: 'Femenino', parentesco: 'padre' };
            r = await llamar('enviar', {
                token: tokenPJ,
                body: { acepta_reglamento: true, tutor: { ...DATOS_MINIMOS, nombre: 'Padre', apellido: 'Jugador Prueba', email: MAIL_PJ }, jugadores: [HIJO2] },
            });
            comprobar('entra la segunda hija', r.status === 200, r.body);
            const hija = (r.body.jugadores || []).find((j) => j.nombre.startsWith('Hija'));
            comprobar('AHORA si hay descuento: dos hijos son dos hermanos',
                hija && hija.variante === 'con_hermano', hija);
            // Y el primero tambien, la proxima vez que se lo mire.
            const est = await llamar('estado', { method: 'GET', token: tokenPJ });
            const hijo = (est.body.jugadores || []).find((j) => j.nombre === 'Hijo');
            comprobar('y al hermano mayor se le muestra tambien',
                hijo && hijo.tarifa && hijo.tarifa.variante === 'con_hermano', hijo && hijo.tarifa);
        }


        // (e) EL AGUJERO QUE ENCONTRO LA AUDITORIA.
        //
        // El parentesco lo elige la familia en un desplegable, y desde que
        // decide el precio bastaba con dejarlo en "Soy su tutor/a legal" para
        // que el padre volviera a contar como hermano. Peor: ese es el valor
        // POR DEFECTO de una ficha nueva, asi que un padre honesto que rellena
        // la suya sin tildar "Soy yo, el jugador" se llevaba el descuento sin
        // enterarse, y quedaba sellado en tarifa_variante_origen.
        //
        // Ahora el servidor lo DEDUCE comparando identidades. Estas cuatro
        // comprobaciones son el caso adversario, no el honesto.
        await limpiarPJ();
        {
            const PADRE_MINTIENDO = Object.assign({}, PADRE, { parentesco: 'tutor_legal' });
            r = await llamar('enviar', {
                body: {
                    acepta_reglamento: true,
                    tutor: { ...DATOS_MINIMOS, nombre: 'Padre', apellido: 'Jugador Prueba', email: MAIL_PJ, fecha_nacimiento: '1985-04-04' },
                    jugadores: [PADRE_MINTIENDO, HIJO],
                },
            });
            comprobar('acepta el envio con el parentesco por defecto', r.status === 200, r.body);
            const hijo = (r.body.jugadores || []).find((j) => j.nombre.startsWith('Hijo'));
            comprobar('el desplegable NO desbloquea el descuento',
                hijo && hijo.variante === 'base', hijo);

            const { data: t } = await db.from('tutores').select('tutor_id').eq('email', MAIL_PJ).single();
            const { data: v } = await db.from('tutor_jugador').select('player_id, parentesco').eq('tutor_id', t.tutor_id);
            const { data: fichas } = await db.from('players').select('player_id, first_name').in('player_id', (v || []).map((x) => x.player_id));
            const nombreDe = new Map((fichas || []).map((f) => [f.player_id, f.first_name]));
            const delPadre = (v || []).find((x) => nombreDe.get(x.player_id) === 'Padre');
            comprobar('y el vinculo queda corregido a el_mismo',
                delPadre && delPadre.parentesco === 'el_mismo', delPadre);

            // Y la vista previa tiene que decir lo mismo: es el invariante que
            // impide que la familia acepte 40 y se le cobren 50.
            await db.from('tutores').update({ password_hash: hashPassword('prueba1234') }).eq('email', MAIL_PJ);
            const acc = await llamar('acceso', { body: { email: MAIL_PJ, password: 'prueba1234' } });
            const est = await llamar('estado', { method: 'GET', token: acc.body.token });
            const hijoEst = (est.body.jugadores || []).find((j) => j.nombre === 'Hijo');
            comprobar('la vista previa dice lo mismo que se guardo',
                hijoEst && hijoEst.tarifa && hijoEst.tarifa.variante === 'base', hijoEst && hijoEst.tarifa);
        }

        // (f) Y que un DOCUMENTO igual tambien lo delate, aunque el nombre no
        //     coincida: es el caso de quien se apunta como "Pepe" y su ficha de
        //     tutor dice "Jose".
        await limpiarPJ();
        {
            r = await llamar('enviar', {
                body: {
                    acepta_reglamento: true,
                    tutor: { ...DATOS_MINIMOS,
                        nombre: 'Jose', apellido: 'Distinto Prueba', email: MAIL_PJ,
                        tipo_documento: 'DNI', numero_documento: '00000001-R',
                    },
                    jugadores: [
                        { nombre: 'Pepe', apellido: 'Distinto Prueba', fecha_nacimiento: '1985-04-04',
                          genero: 'Masculino', parentesco: 'tutor_legal',
                          tipo_documento: 'DNI', numero_documento: '00000001R' },
                        HIJO,
                    ],
                },
            });
            comprobar('acepta al padre con otro nombre pero su mismo DNI', r.status === 200, r.body);
            const hijo = (r.body.jugadores || []).find((j) => j.nombre.startsWith('Hijo'));
            comprobar('el mismo DNI lo delata: el hijo sigue en base',
                hijo && hijo.variante === 'base', hijo);
        }

        // (g) Y AL REVES: dos hermanos que se llaman parecido al padre pero son
        //     dos hijos, siguen teniendo su descuento. Lo facil al arreglar esto
        //     es apagarselo a gente que si le toca.
        await limpiarPJ();
        {
            r = await llamar('enviar', {
                body: {
                    acepta_reglamento: true,
                    tutor: { ...DATOS_MINIMOS, nombre: 'Padre', apellido: 'Jugador Prueba', email: MAIL_PJ, fecha_nacimiento: '1985-04-04' },
                    jugadores: [
                        // El hijo mayor se llama IGUAL que el padre, pero nacio
                        // en otra fecha: son dos personas.
                        { nombre: 'Padre', apellido: 'Jugador Prueba', fecha_nacimiento: '2007-04-04',
                          genero: 'Masculino', parentesco: 'padre' },
                        HIJO,
                    ],
                },
            });
            comprobar('acepta al hijo homonimo del padre', r.status === 200, r.body);
            const hijo = (r.body.jugadores || []).find((j) => j.nombre === 'Hijo Jugador Prueba');
            comprobar('el hijo con nombre repetido SI cuenta como hermano',
                hijo && hijo.variante === 'con_hermano', hijo);
        }

        // (h) Y que el hijo de 19 que juega senior siga contando para su hermano
        //     de 15: la regla es el parentesco, no la edad. Es la promesa que
        //     hace el comentario de cuentaComoHermano y hay que sostenerla.
        await limpiarPJ();
        {
            r = await llamar('enviar', {
                body: {
                    acepta_reglamento: true,
                    tutor: { ...DATOS_MINIMOS, nombre: 'Madre', apellido: 'Jugador Prueba', email: MAIL_PJ, fecha_nacimiento: '1970-01-01' },
                    jugadores: [
                        { nombre: 'Mayor', apellido: 'Jugador Prueba', fecha_nacimiento: '2007-02-02',
                          genero: 'Masculino', parentesco: 'madre' },
                        HIJO,
                    ],
                },
            });
            comprobar('acepta al hijo mayor de edad y a su hermano', r.status === 200, r.body);
            const chico = (r.body.jugadores || []).find((j) => j.nombre.startsWith('Hijo'));
            const mayor = (r.body.jugadores || []).find((j) => j.nombre.startsWith('Mayor'));
            comprobar('el hermano de 15 mantiene su descuento',
                chico && chico.variante === 'con_hermano', chico);
            comprobar('y el mayor queda en base por ser adulto, no por no contar',
                mayor && mayor.variante === 'base', mayor);
        }

        await limpiarPJ();
    }

    // ── 16 ──────────────────────────────────────────────────────────────
    //
    // Lo que la familia VE es lo que se le guarda, y nunca se le cobra mas.
    //
    // Es el cruce que ninguna prueba miraba: la seccion 15 comprueba `estado` y
    // `enviar` por separado, y los 90 euros se escapaban justo en el medio. El
    // precio llegaba del servidor al abrir la pantalla y se quedaba congelado;
    // marcar "este ano no va a jugar" a un hermano no lo recalculaba. La familia
    // seguia leyendo 40 EUR/mes, apretaba enviar, y se guardaban 50.
    //
    // Aca se simula el navegador de verdad: se pide estado, se aplica el MISMO
    // espejo de la regla que corre en el browser (js/hermanos.js), y se exige
    // que lo que quede escrito sea lo que ese navegador habria mostrado.
    console.log('\n16. Lo que se ve es lo que se guarda');
    {
        const espejo = require(path.join(__dirname, '..', '..', 'js', 'hermanos.js'));
        const MAIL_VE = 'prueba.ve.guarda.borrar@menorcarugbyclub.test';
        const limpiarVE = async () => {
            const { data: t } = await db.from('tutores').select('tutor_id').eq('email', MAIL_VE).maybeSingle();
            if (!t) return;
            const { data: v } = await db.from('tutor_jugador').select('player_id').eq('tutor_id', t.tutor_id);
            await db.from('tutores').delete().eq('tutor_id', t.tutor_id);
            for (const x of v || []) await db.from('players').delete().eq('player_id', x.player_id);
        };
        await limpiarVE();

        // Se congela el documento en una constante: TUTOR se reutiliza en
        // cinco envios de esta seccion y con el getter de DATOS_MINIMOS cada
        // uso traeria uno distinto, o sea otra persona.
        const TUTOR = { ...DATOS_MINIMOS, nombre: 'Madre', apellido: 'Ve Guarda', email: MAIL_VE, fecha_nacimiento: '1980-03-03' };
        const UNO = { nombre: 'Uno', apellido: 'Ve Guarda', fecha_nacimiento: '2011-01-01', genero: 'Masculino', parentesco: 'madre' };
        const DOS = { nombre: 'Dos', apellido: 'Ve Guarda', fecha_nacimiento: '2013-01-01', genero: 'Femenino', parentesco: 'madre' };

        let r = await llamar('enviar', {
            body: { acepta_reglamento: true, tutor: TUTOR, jugadores: [UNO, DOS] },
        });
        comprobar('entran los dos hermanos', r.status === 200, r.body);
        comprobar('y los dos con descuento de hermano',
            (r.body.jugadores || []).every((j) => j.variante === 'con_hermano'), r.body.jugadores);

        await db.from('tutores').update({ password_hash: hashPassword('prueba1234') }).eq('email', MAIL_VE);
        const acc = await llamar('acceso', { body: { email: MAIL_VE, password: 'prueba1234' } });
        const tokenVE = acc.body.token;

        // ── Lo que el navegador tiene al abrir ──────────────────────────
        const est = await llamar('estado', { method: 'GET', token: tokenVE });
        comprobar('la vista previa responde', est.status === 200, est.body);
        const enPantalla = (est.body.jugadores || []).map((j) => ({
            nombre: j.nombre,
            apellido: j.apellido,
            fecha_nacimiento: j.fecha_nacimiento,
            genero: j.genero,
            player_id: j.player_id,
            parentesco: j.parentesco,
            tarifa_servidor: j.tarifa,
            tarifa: j.tarifa,
            no_renueva: false,
        }));
        comprobar('el servidor manda tambien la tarifa alternativa',
            enPantalla.every((j) => j.tarifa_servidor && j.tarifa_servidor.alternativa),
            enPantalla.map((j) => (j.tarifa_servidor || {}).alternativa));

        // ── La familia marca que la segunda este ano no juega ───────────
        //
        // Por NOMBRE, no por posicion: accion-estado trae a los jugadores de un
        // .in() y el orden no esta garantizado. Buscando por indice, la prueba
        // marcaba de baja a cualquiera de los dos segun el dia, y pasaba o
        // fallaba sin que cambiara ni una linea de codigo.
        const laQueSeVa = enPantalla.find((j) => j.nombre === 'Dos');
        const elQueSeQueda = enPantalla.find((j) => j.nombre === 'Uno');
        comprobar('la vista previa trae a los dos', Boolean(laQueSeVa && elQueSeQueda),
            enPantalla.map((j) => j.nombre));
        laQueSeVa.no_renueva = true;

        // Y el navegador recalcula, con el espejo de la regla.
        const titular = { nombre: TUTOR.nombre, apellido: TUTOR.apellido, fecha_nacimiento: TUTOR.fecha_nacimiento };
        const hijos = espejo.contarHijos(enPantalla, titular);
        comprobar('el navegador cuenta UN hijo', hijos === 1, hijos);
        for (const j of enPantalla) {
            const del = j.tarifa_servidor;
            if (!del || del.la_puso_el_club) continue;
            const quiere = espejo.varianteAutomatica(del.tramo_cuota, hijos);
            j.tarifa = del.variante === quiere ? del
                : (del.alternativa && del.alternativa.variante === quiere ? del.alternativa : null);
        }
        const queSeVe = elQueSeQueda.tarifa;
        comprobar('y le ensena al que se queda la cuota SIN hermano',
            queSeVe && queSeVe.variante === 'base', queSeVe);

        // ── Y se envia exactamente eso ──────────────────────────────────
        r = await llamar('enviar', {
            token: tokenVE,
            body: {
                acepta_reglamento: true,
                tutor: TUTOR,
                jugadores: enPantalla.map((j) => (j.no_renueva
                    ? { player_id: j.player_id, nombre: j.nombre, apellido: j.apellido, no_renueva: true }
                    : {
                        player_id: j.player_id, nombre: j.nombre, apellido: j.apellido,
                        fecha_nacimiento: j.fecha_nacimiento, genero: j.genero,
                        parentesco: j.parentesco,
                        tarifa_variante_vista: (j.tarifa || {}).variante || null,
                    })),
            },
        });
        comprobar('el envio con un hermano de baja entra', r.status === 200, r.body);

        {
            const { data: t } = await db.from('tutores').select('tutor_id').eq('email', MAIL_VE).single();
            const { data: v } = await db.from('tutor_jugador').select('player_id').eq('tutor_id', t.tutor_id);
            const { data: fichas } = await db.from('players').select('player_id, first_name').in('player_id', (v || []).map((x) => x.player_id));
            const idUno = (fichas || []).find((f) => f.first_name === 'Uno').player_id;
            const { data: insc } = await db.from('inscripciones')
                .select('tarifa_variante, tarifa_variante_origen')
                .eq('player_id', idUno).eq('temporada', temporada).single();

            // LA INVARIANTE: lo guardado es lo que la pantalla decia.
            comprobar('se guarda lo mismo que la pantalla mostraba',
                insc && insc.tarifa_variante === queSeVe.variante, insc);
            comprobar('y el tope es la tarifa completa (base)',
                insc && insc.tarifa_variante_origen === 'base', insc);
        }

        // ── El tope es SIEMPRE 'base', pase lo que pase por pantalla ────
        //
        // Aunque el navegador mande una variante barata en tarifa_variante_vista
        // —una pantalla vieja, o manipulada— el tope guardado es 'base' (la
        // tarifa completa). El tope es el MAXIMO que se puede cobrar; ponerlo en
        // la tarifa mas cara hace que cualquier ajuste del club sea a la baja y
        // nunca dispare la re-autorizacion. Un vista barato ya no baja el techo.
        r = await llamar('enviar', {
            token: tokenVE,
            body: {
                acepta_reglamento: true,
                tutor: TUTOR,
                jugadores: [{
                    player_id: elQueSeQueda.player_id,
                    nombre: 'Uno', apellido: 'Ve Guarda',
                    fecha_nacimiento: '2011-01-01', genero: 'Masculino', parentesco: 'madre',
                    // La pantalla se quedo vieja y todavia decia 40 EUR.
                    tarifa_variante_vista: 'con_hermano',
                }],
            },
        });
        comprobar('acepta el envio de una pantalla vieja', r.status === 200, r.body);
        {
            const { data: t } = await db.from('tutores').select('tutor_id').eq('email', MAIL_VE).single();
            const { data: v } = await db.from('tutor_jugador').select('player_id').eq('tutor_id', t.tutor_id);
            const { data: fichas } = await db.from('players').select('player_id, first_name').in('player_id', (v || []).map((x) => x.player_id));
            const idUno = (fichas || []).find((f) => f.first_name === 'Uno').player_id;
            const { data: insc } = await db.from('inscripciones')
                .select('tarifa_variante, tarifa_variante_origen')
                .eq('player_id', idUno).eq('temporada', temporada).single();
            comprobar('el precio real sigue siendo el que calcula el servidor',
                insc && insc.tarifa_variante === 'base', insc);
            comprobar('y el TOPE es base, no la variante barata que mando la pantalla',
                insc && insc.tarifa_variante_origen === 'base', insc);
        }

        // ── Y una palabra inventada no deja a nadie bloqueado ───────────
        r = await llamar('enviar', {
            token: tokenVE,
            body: {
                acepta_reglamento: true,
                tutor: TUTOR,
                jugadores: [{
                    player_id: elQueSeQueda.player_id,
                    nombre: 'Uno', apellido: 'Ve Guarda',
                    fecha_nacimiento: '2011-01-01', genero: 'Masculino', parentesco: 'madre',
                    tarifa_variante_vista: 'gratis_total',
                }],
            },
        });
        comprobar('acepta un envio con una tarifa inventada', r.status === 200, r.body);
        {
            const { data: t } = await db.from('tutores').select('tutor_id').eq('email', MAIL_VE).single();
            const { data: v } = await db.from('tutor_jugador').select('player_id').eq('tutor_id', t.tutor_id);
            const { data: fichas } = await db.from('players').select('player_id, first_name').in('player_id', (v || []).map((x) => x.player_id));
            const idUno = (fichas || []).find((f) => f.first_name === 'Uno').player_id;
            const { data: insc } = await db.from('inscripciones')
                .select('tarifa_variante_origen').eq('player_id', idUno).eq('temporada', temporada).single();
            comprobar('y la descarta en vez de dejar la ficha bloqueada',
                insc && insc.tarifa_variante_origen === 'base', insc);
        }

        // ── A quien ya se le cobra, no se le toca la tarifa ─────────────
        //
        // Reenviar el formulario es como se corrigen los datos. Recalculaba la
        // tarifa igual, y pisaba el tope: una familia que entraba a cambiar un
        // telefono se llevaba el precio de hoy encima del que tiene contratado.
        {
            const { data: t } = await db.from('tutores').select('tutor_id').eq('email', MAIL_VE).single();
            const { data: v } = await db.from('tutor_jugador').select('player_id').eq('tutor_id', t.tutor_id);
            const { data: fichas } = await db.from('players').select('player_id, first_name').in('player_id', (v || []).map((x) => x.player_id));
            const idUno = (fichas || []).find((f) => f.first_name === 'Uno').player_id;

            await db.from('inscripciones').update({
                estado: 'aprobada',
                tarifa_variante: 'con_beca',
                tarifa_variante_origen: 'con_beca',
                stripe_subscription_id: 'sub_de_prueba_no_existe',
            }).eq('player_id', idUno).eq('temporada', temporada);

            r = await llamar('enviar', {
                token: tokenVE,
                body: {
                    acepta_reglamento: true,
                    tutor: TUTOR,
                    jugadores: [{
                        player_id: idUno, nombre: 'Uno', apellido: 'Ve Guarda',
                        fecha_nacimiento: '2011-01-01', genero: 'Masculino', parentesco: 'madre',
                        telefono: '600111222',
                    }],
                },
            });
            comprobar('la familia puede corregir sus datos igual', r.status === 200, r.body);
            const { data: insc } = await db.from('inscripciones')
                .select('tarifa_variante, tarifa_variante_origen')
                .eq('player_id', idUno).eq('temporada', temporada).single();
            comprobar('y NO se le toca la tarifa que ya se le cobra',
                insc && insc.tarifa_variante === 'con_beca', insc);
            comprobar('ni el tope',
                insc && insc.tarifa_variante_origen === 'con_beca', insc);
        }

        await limpiarVE();
    }

    console.log('\nLimpieza');
    await limpiar();

    console.log(`\n${fallos === 0 ? 'Todo en orden.' : fallos + ' comprobaciones fallaron.'}`);
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch(async (e) => {
    console.error('\nLA PRUEBA REVENTÓ:', e && e.message);
    console.error(e && e.stack);
    console.log('\nLimpiando igual...');
    await limpiar().catch(() => {});
    process.exit(1);
});
