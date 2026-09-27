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

    console.log('\n2. Rechaza lo que tiene que rechazar');
    r = await llamar('enviar', { body: { tutor: { nombre: 'X', email: EMAIL }, jugadores: [] } });
    comprobar('sin reglamento -> 400', r.status === 400, r.body);

    r = await llamar('enviar', {
        body: { acepta_reglamento: true, tutor: { nombre: 'X', email: EMAIL }, jugadores: [] },
    });
    comprobar('sin jugadores -> 400', r.status === 400, r.body);

    r = await llamar('enviar', {
        body: {
            acepta_reglamento: true,
            tutor: { nombre: 'X', email: EMAIL },
            jugadores: [{ nombre: 'A', apellido: 'B', fecha_nacimiento: '2014-03-02', genero: 'Masculino', tarifa_variante: 'con_hermano' }],
        },
    });
    comprobar('"con hermano" con un solo hijo -> 400', r.status === 400, r.body);

    r = await llamar('enviar', {
        body: {
            acepta_reglamento: true,
            tutor: { nombre: 'X', email: EMAIL, tipo_documento: 'DNI' },
            jugadores: [{ nombre: 'A', apellido: 'B', fecha_nacimiento: '2014-03-02', genero: 'Masculino', tarifa_variante: 'base' }],
        },
    });
    comprobar('documento a medias -> 400', r.status === 400, r.body);

    r = await llamar('enviar', {
        body: {
            acepta_reglamento: true,
            tutor: { nombre: 'X', email: EMAIL },
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
            tutor: {
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
            tutor: { nombre: 'Prueba', email: EMAIL },
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
        comprobar('trae opciones de tarifa con importe', j.opciones && j.opciones.length > 0 && j.opciones[0].mensualidad > 0, j.opciones);
        comprobar('precarga tallas del año pasado o de este', Boolean(j.inscripcion_actual.talla_camiseta), j.inscripcion_actual);
        comprobar('guardó la foto como path, no como URL', !j.foto || j.foto.indexOf('http') !== 0, j.foto);
    }
    comprobar('sin token -> 401', (await llamar('estado', { method: 'GET' })).status === 401);

    console.log('\n8. Renovar: cambia una talla y la cuota');
    r = await llamar('enviar', {
        token,
        body: {
            acepta_reglamento: true,
            tutor: { nombre: 'Prueba', apellido: 'Borrar Esto', email: 'otro@intento.test', ciudad: 'Ciutadella' },
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
    const renovada = inscs.find((i) => i.tarifa_variante === 'base');
    comprobar('la renovación pisó la anterior (talla L, cuota base)', renovada && renovada.talla_camiseta === 'L', inscs);

    const { data: dp } = await db.from('player_datos_personales').select('player_id, direccion, autoriza_uso_imagen').in('player_id', ids);
    comprobar('guardó los datos personales', dp.length === 2, dp);
    comprobar('hereda la dirección del tutor', dp.every((d) => d.direccion), dp);
    comprobar('respeta el "no" al uso de imagen', dp.some((d) => d.autoriza_uso_imagen === false), dp);

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
