// ---------------------------------------------------------------------------
// Enviar la inscripción. Alta y renovación por la misma puerta.
//
// Con token: es una familia que ya está: renueva a sus jugadores o suma uno.
// Sin token: es una familia nueva; se le crea el tutor y se le manda contraseña.
//
// La inscripción queda en estado "enviada", no "aprobada": alguien del club la
// mira antes. Eso es lo que permite dejar que la familia elija la tarifa sin que
// nadie se autoasigne la cuota de 1 €.
//
// EL ORDEN DE ESCRITURA NO ES CAPRICHOSO
//
// Los CONSTRAINT TRIGGER de tutores y tutor_jugador son DEFERRABLE, así que se
// evalúan al cerrar CADA request de PostgREST, no al final del handler. Eso
// obliga a:
//
//   1. Crear el tutor con activo = false. Un tutor activo sin ningún jugador
//      hace saltar tutores_exigir_hijo_alta, y todavía no hay jugador.
//   2. Escribir los vínculos de un jugador TODOS en una misma llamada y con
//      exactamente un pagador. El trigger cuenta los pagadores del jugador
//      entero: ni cero ni dos. Por eso, cuando el chico ya tenía otro tutor, hay
//      que leer los vínculos que había y reescribir el conjunto completo.
//   3. Activar el tutor recién al final.
// ---------------------------------------------------------------------------

const { createClient } = require('@supabase/supabase-js');
const { getAuthPayload, generatePassword, hashPassword } = require('./auth');
const {
    temporadaKey,
    temporadaYear,
    calcularCategorias,
    tramoDeCategoria,
    cargarPrecios,
    subirFoto,
    enviarMail,
    escapeHtml,
    normalizarEmail,
    buscarTutorPorEmail,
    nuevoId,
    soloConValor,
} = require('./inscripcion');

const TIPOS_DOC = ['DNI', 'NIE', 'PASAPORTE', 'TARJETA_SANITARIA', 'LIBRO_FAMILIA', 'OTRO'];
const TALLAS = ['4', '6', '8', '10', '12', '14', '16', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
const GENEROS = ['Masculino', 'Femenino'];
const PARENTESCOS = ['madre', 'padre', 'tutor_legal', 'abuelo', 'hermano', 'otro'];
// Las otras variantes (con_beca, directivo, familiar_directivo) las pone el
// club, no la familia. Ofrecerlas sería regalar la cuota de 1 €.
const VARIANTES = ['base', 'con_hermano'];
const REGLAMENTO_VERSION = 'web-2026';

module.exports = async function accionEnviar(req, res) {

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const payload = getAuthPayload(req);
    const body = req.body || {};

    const year = temporadaYear();
    const temporada = temporadaKey(year);

    try {
        const datos = validar(body, Boolean(payload && payload.tutor_id));
        if (datos.error) return res.status(400).json({ error: datos.error });

        const { tutor: datosTutor, jugadores, acepta_reglamento } = datos;

        // ── 1. El tutor ──────────────────────────────────────────────────
        let tutorId = payload && payload.tutor_id ? payload.tutor_id : null;
        let passwordNueva = null;
        let tutorEsNuevo = false;

        if (tutorId) {
            // Renovación: se actualizan sus datos, pero NO el correo. El correo
            // es con lo que entra; cambiarlo acá lo dejaría afuera de su cuenta.
            // soloConValor: un campo que la familia dejo en blanco significa "no
            // lo toques", no "borralo". Sin esto, renovar desde un formulario
            // que no repite todo le vacia el telefono y la direccion a quien ya
            // los tenia cargados.
            const { email: _noSeCambia, ...cambios } = datosTutor;
            const { error } = await supabase
                .from('tutores')
                .update(soloConValor(cambios))
                .eq('tutor_id', tutorId);
            if (error) throw new Error(`No se pudieron guardar tus datos: ${error.message}`);
        } else {
            const yaExiste = await buscarTutorPorEmail(supabase, datosTutor.email, 'tutor_id');
            if (yaExiste) {
                return res.status(409).json({
                    error: 'Ese correo ya está registrado. Entrá con tu contraseña para renovar.',
                    ya_registrado: true,
                });
            }
            passwordNueva = generatePassword();
            const { data, error } = await supabase
                .from('tutores')
                .insert({
                    ...datosTutor,
                    password_hash: hashPassword(passwordNueva),
                    password_actualizada_at: new Date().toISOString(),
                    // Paso 1 del orden de arriba: sin hijos todavía.
                    activo: false,
                })
                .select('tutor_id')
                .single();
            if (error) throw new Error(`No se pudo crear tu ficha: ${error.message}`);
            tutorId = data.tutor_id;
            tutorEsNuevo = true;
        }

        // ── 2. Los jugadores ─────────────────────────────────────────────
        const precios = await cargarPrecios(supabase, temporada);
        const resultado = [];

        for (const j of jugadores) {
            const cat = await calcularCategorias(supabase, j.fecha_nacimiento, j.genero === 'Femenino', year);
            const tramo = tramoDeCategoria(cat.principal, j.fecha_nacimiento);

            // El CHECK inscripciones_sin_hermano_en_adultos lo rechazaría igual,
            // pero un mensaje claro es mejor que un error de base de datos.
            if (j.tarifa_variante === 'con_hermano' && (tramo === 'senior' || tramo === 'veterano')) {
                return res.status(400).json({
                    error: `${j.nombre}: en adultos no existe el descuento por hermano.`,
                });
            }
            if (!precios.get(`mensualidad|${j.tarifa_variante}|${tramo}`)) {
                return res.status(400).json({
                    error: `${j.nombre}: esa tarifa no existe para ${tramo} esta temporada.`,
                });
            }

            let playerId = j.player_id || null;
            const notas = [];

            // Una inscripcion ya aprobada, o dada de baja, NO se puede volver a
            // poner en 'enviada': la maquina de estados de la base lo prohibe y
            // el upsert de mas abajo se comia esa excepcion en forma de error de
            // Postgres crudo en la cara de la familia.
            //
            // Aprobada -> es una modificacion de datos, no un reenvio: se deja
            // la inscripcion como esta y se anota lo que cambio para que lo mire
            // quien revisa.
            // De baja -> es terminal. Volver al club es una inscripcion nueva de
            // la temporada siguiente, y eso lo decide el club.
            let conservarEstado = false;
            if (playerId) {
                const { data: yaHay } = await supabase
                    .from('inscripciones')
                    .select('estado')
                    .eq('temporada', temporada)
                    .eq('player_id', playerId)
                    .maybeSingle();

                if (yaHay && yaHay.estado === 'baja') {
                    return res.status(409).json({
                        error:
                            `${j.nombre} figura de baja esta temporada. Escribinos a ` +
                            'info@menorcarugbyclub.com y lo revisamos con vos.',
                    });
                }
                if (yaHay && yaHay.estado === 'aprobada') {
                    conservarEstado = true;
                    notas.push('La familia mando cambios sobre una inscripcion ya aprobada.');
                }
            }

            if (playerId) {
                const { data: previo } = await supabase
                    .from('players')
                    .select('player_id, first_name, last_name, dob')
                    .eq('player_id', playerId)
                    .maybeSingle();
                if (!previo) return res.status(400).json({ error: `No encontramos a ${j.nombre} en la base.` });

                // Que la familia pueda corregir un nombre mal escrito está bien;
                // que cambie la fecha de nacimiento sin que nadie lo vea, no: la
                // fecha decide la categoría. Se acepta y se deja anotado para
                // quien revise.
                if (previo.dob !== j.fecha_nacimiento) {
                    notas.push(`Cambió la fecha de nacimiento: ${previo.dob} -> ${j.fecha_nacimiento}.`);
                }
                if (
                    previo.first_name !== j.nombre ||
                    previo.last_name !== j.apellido
                ) {
                    notas.push(`Cambió el nombre: "${previo.first_name} ${previo.last_name}" -> "${j.nombre} ${j.apellido}".`);
                }

                const { error } = await supabase
                    .from('players')
                    .update({
                        // Estos siempre vienen: el formulario los exige y la
                        // categoria la acaba de calcular la base.
                        first_name: j.nombre,
                        last_name: j.apellido,
                        dob: j.fecha_nacimiento,
                        gender: j.genero,
                        category_primary: cat.principal,
                        categories_extra: cat.extra,
                        // Estos son opcionales, asi que vacio = no tocar.
                        ...soloConValor({
                            email: j.email,
                            phone: j.telefono,
                            tax_type: j.tipo_documento,
                            tax_number: j.numero_documento,
                        }),
                    })
                    .eq('player_id', playerId);
                if (error) throw new Error(`No se pudo actualizar a ${j.nombre}: ${error.message}`);
            } else {
                // players.player_id es VARCHAR y NO tiene DEFAULT: hay que darle
                // uno. El número de licencia todavía no existe, lo asigna la
                // federación después.
                playerId = nuevoId();
                const { error } = await supabase.from('players').insert({
                    player_id: playerId,
                    first_name: j.nombre,
                    last_name: j.apellido,
                    dob: j.fecha_nacimiento,
                    gender: j.genero,
                    category_primary: cat.principal,
                    categories_extra: cat.extra,
                    status: 'available',
                    email: j.email,
                    phone: j.telefono,
                    tax_type: j.tipo_documento,
                    tax_number: j.numero_documento,
                });
                if (error) throw new Error(`No se pudo dar de alta a ${j.nombre}: ${error.message}`);
                notas.push('Alta nueva desde la web.');
            }

            // La foto va después del alta porque el path la lleva dentro.
            let fotoPath = null;
            if (j.foto) {
                fotoPath = await subirFoto(supabase, j.foto, playerId);
                await supabase.from('players').update({ photo: fotoPath }).eq('player_id', playerId);
            }

            // Un upsert pisa TODAS las columnas, incluidas las que vienen en
            // null. Por eso se lee lo que habia y se mezcla: renovar no puede
            // borrarle la direccion ni las alergias a nadie.
            const { data: dpPrevio } = await supabase
                .from('player_datos_personales')
                .select('*')
                .eq('player_id', playerId)
                .maybeSingle();

            const { error: errDatos } = await supabase.from('player_datos_personales').upsert(
                {
                    ...(dpPrevio || {}),
                    player_id: playerId,
                    ...soloConValor({
                        nacionalidad: j.nacionalidad,
                        direccion: j.direccion,
                        codigo_postal: j.codigo_postal,
                        ciudad: j.ciudad,
                        provincia: j.provincia,
                        pais: j.pais,
                        alergias: j.alergias,
                    }),
                    // Este si es una decision explicita de la familia en cada
                    // envio: un "no" tiene que poder revocar un "si" anterior.
                    autoriza_uso_imagen: j.acepta_uso_imagen,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'player_id' }
            );
            if (errDatos) throw new Error(`No se pudieron guardar los datos de ${j.nombre}: ${errDatos.message}`);

            // ── Vínculos: el conjunto completo, un solo pagador ──────────
            const { data: existentes } = await supabase
                .from('tutor_jugador')
                .select('tutor_id, parentesco, es_pagador, notificar')
                .eq('player_id', playerId);

            const otros = (existentes || []).filter((v) => v.tutor_id !== tutorId);
            const yoPago = otros.every((v) => !v.es_pagador) || j.es_pagador === true;
            const filas = [
                {
                    tutor_id: tutorId,
                    player_id: playerId,
                    parentesco: j.parentesco,
                    es_pagador: yoPago,
                    notificar: true,
                },
                ...otros.map((v) => ({
                    tutor_id: v.tutor_id,
                    player_id: playerId,
                    parentesco: v.parentesco,
                    // Si este tutor pasa a pagar, el otro deja de hacerlo: el
                    // trigger exige exactamente uno.
                    es_pagador: yoPago ? false : v.es_pagador,
                    notificar: v.notificar,
                })),
            ];
            const { error: errVinc } = await supabase
                .from('tutor_jugador')
                .upsert(filas, { onConflict: 'tutor_id,player_id' });
            if (errVinc) throw new Error(`No se pudo vincular a ${j.nombre}: ${errVinc.message}`);

            // ── La inscripción ──────────────────────────────────────────
            const ahora = new Date().toISOString();
            const { error: errInsc } = await supabase.from('inscripciones').upsert(
                {
                    temporada,
                    player_id: playerId,
                    tutor_id: tutorId,
                    // Ver el control de mas arriba: si ya estaba aprobada, esto
                    // es una correccion de datos y no vuelve a la cola.
                    estado: conservarEstado ? 'aprobada' : 'enviada',
                    altura_cm: j.altura_cm,
                    peso_kg: j.peso_kg,
                    talla_camiseta: j.talla_camiseta,
                    talla_pantalon: j.talla_pantalon,
                    talla_chandal: j.talla_chandal,
                    tarifa_tramo: tramo,
                    tarifa_variante: j.tarifa_variante,
                    tarifa_descuentos: [],
                    acepta_reglamento,
                    reglamento_version: REGLAMENTO_VERSION,
                    acepta_reglamento_at: ahora,
                    acepta_uso_imagen: j.acepta_uso_imagen,
                    acepta_uso_imagen_at: j.acepta_uso_imagen ? ahora : null,
                    foto_path: fotoPath,
                    observaciones: [j.observaciones, ...notas].filter(Boolean).join(' ') || null,
                    origen: 'web',
                    enviada_at: ahora,
                    recibida_at: ahora,
                },
                { onConflict: 'temporada,player_id' }
            );
            if (errInsc) throw new Error(`No se pudo guardar la inscripción de ${j.nombre}: ${errInsc.message}`);

            const mensual = Number(precios.get(`mensualidad|${j.tarifa_variante}|${tramo}`).importe);
            const ficha = precios.get(`ficha_anual|${j.tarifa_variante}|${tramo}`);

            resultado.push({
                player_id: playerId,
                nombre: `${j.nombre} ${j.apellido}`,
                categoria: cat.principal,
                categorias_extra: cat.extra,
                tramo,
                variante: j.tarifa_variante,
                mensualidad: mensual,
                meses: 10,
                ficha_anual: ficha && ficha.importe !== null ? Number(ficha.importe) : null,
            });
        }

        // ── 3. Activar el tutor, ya con jugadores vinculados ─────────────
        if (tutorEsNuevo) {
            const { error } = await supabase.from('tutores').update({ activo: true }).eq('tutor_id', tutorId);
            if (error) throw new Error(`No se pudo activar tu ficha: ${error.message}`);
        }

        // ── 4. Avisar ────────────────────────────────────────────────────
        let aviso = null;
        if (passwordNueva) {
            const envio = await enviarMail({
                to: datosTutor.email,
                subject: 'Inscripción recibida - Menorca Rugby Club',
                html: plantillaBienvenida(datosTutor.nombre, passwordNueva, resultado),
            });
            if (!envio.ok) {
                // La inscripción quedó guardada. Lo que no salió es el mail con
                // la contraseña, y sin eso la familia no puede volver a entrar.
                aviso =
                    'Tu inscripción quedó registrada, pero no pudimos enviarte el correo con tu contraseña. ' +
                    'Escribinos a info@menorcarugbyclub.com y te la damos.';
            }
        }

        return res.status(200).json({
            success: true,
            temporada,
            jugadores: resultado,
            total_mensual: resultado.reduce((n, r) => n + r.mensualidad, 0),
            cuenta_creada: Boolean(passwordNueva),
            aviso,
        });
    } catch (e) {
        console.error('inscripcion-enviar:', e && e.message);
        return res.status(500).json({ error: (e && e.message) || 'No se pudo guardar la inscripción' });
    }
};

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------

function limpiar(v, max = 200) {
    const s = String(v === null || v === undefined ? '' : v).trim();
    return s ? s.slice(0, max) : null;
}

function fechaValida(v) {
    const s = String(v || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const d = new Date(`${s}T12:00:00Z`);
    if (isNaN(d.getTime())) return null;
    const anio = Number(s.slice(0, 4));
    if (anio < 1930 || anio > new Date().getFullYear()) return null;
    return s;
}

function validar(body, tieneToken) {
    const t = body.tutor || {};
    const lista = Array.isArray(body.jugadores) ? body.jugadores : [];

    if (!body.acepta_reglamento) {
        return { error: 'Hay que aceptar el reglamento del club para inscribirse.' };
    }
    if (!lista.length) return { error: 'No agregaste ningún jugador.' };
    if (lista.length > 6) return { error: 'Son demasiados jugadores para un solo envío. Escribinos.' };

    const email = normalizarEmail(t.email);
    if (!tieneToken && !email) return { error: 'El correo del tutor no es válido.' };
    if (!limpiar(t.nombre)) return { error: 'Falta el nombre del tutor.' };

    const tipoDocTutor = limpiar(t.tipo_documento);
    const numDocTutor = limpiar(t.numero_documento, 40);
    if (tipoDocTutor && !TIPOS_DOC.includes(tipoDocTutor)) {
        return { error: 'El tipo de documento del tutor no es válido.' };
    }
    // El CHECK tutores_documento_completo los quiere de a pares.
    if (Boolean(tipoDocTutor) !== Boolean(numDocTutor)) {
        return { error: 'Poné el tipo y el número de documento del tutor, o ninguno de los dos.' };
    }

    const generoTutor = limpiar(t.genero);
    if (generoTutor && !GENEROS.includes(generoTutor) && generoTutor !== 'Otro') {
        return { error: 'El género del tutor no es válido.' };
    }

    const tutor = {
        nombre: limpiar(t.nombre, 80),
        apellido: limpiar(t.apellido, 120),
        email,
        fecha_nacimiento: fechaValida(t.fecha_nacimiento),
        genero: generoTutor,
        nacionalidad: limpiar(t.nacionalidad, 60),
        tipo_documento: tipoDocTutor,
        numero_documento: numDocTutor,
        telefonos: (Array.isArray(t.telefonos) ? t.telefonos : [t.telefono])
            .map((x) => String(x || '').replace(/[^\d+]/g, ''))
            .filter((x) => x.length >= 6)
            .slice(0, 3),
        direccion: limpiar(t.direccion, 200),
        codigo_postal: limpiar(t.codigo_postal, 12),
        ciudad: limpiar(t.ciudad, 80),
        provincia: limpiar(t.provincia, 80),
        pais: limpiar(t.pais, 60) || 'España',
    };

    const jugadores = [];
    const conHermano = lista.filter((j) => j.tarifa_variante === 'con_hermano').length;
    // La familia elige la tarifa, pero "con hermano" con un solo hijo en el
    // envío casi siempre es un error de lectura, no una picardía. Se avisa antes
    // en vez de dejar que lo descubra el club al revisar.
    if (conHermano > 0 && lista.length < 2) {
        return {
            error:
                'Elegiste la cuota "con hermano" pero sólo estás inscribiendo a un jugador. ' +
                'Agregá al hermano o elegí la cuota normal.',
        };
    }

    for (const j of lista) {
        const nombre = limpiar(j.nombre, 80);
        const apellido = limpiar(j.apellido, 120);
        const dob = fechaValida(j.fecha_nacimiento);
        const genero = limpiar(j.genero);

        if (!nombre || !apellido) return { error: 'Falta el nombre o el apellido de un jugador.' };
        if (!dob) return { error: `${nombre}: la fecha de nacimiento no es válida.` };
        if (!GENEROS.includes(genero)) return { error: `${nombre}: falta el sexo.` };

        const variante = limpiar(j.tarifa_variante);
        if (!VARIANTES.includes(variante)) return { error: `${nombre}: elegí una cuota.` };

        const tipoDoc = limpiar(j.tipo_documento);
        const numDoc = limpiar(j.numero_documento, 40);
        if (tipoDoc && !TIPOS_DOC.includes(tipoDoc)) return { error: `${nombre}: tipo de documento no válido.` };

        const parentesco = limpiar(j.parentesco) || 'tutor_legal';
        if (!PARENTESCOS.includes(parentesco)) return { error: `${nombre}: parentesco no válido.` };

        const altura = j.altura_cm === null || j.altura_cm === undefined || j.altura_cm === '' ? null : Number(j.altura_cm);
        const peso = j.peso_kg === null || j.peso_kg === undefined || j.peso_kg === '' ? null : Number(j.peso_kg);
        if (altura !== null && (isNaN(altura) || altura < 50 || altura > 250)) {
            return { error: `${nombre}: la altura tiene que estar entre 50 y 250 cm.` };
        }
        if (peso !== null && (isNaN(peso) || peso < 10 || peso > 250)) {
            return { error: `${nombre}: el peso tiene que estar entre 10 y 250 kg.` };
        }

        for (const [campo, valor] of [
            ['camiseta', j.talla_camiseta],
            ['pantalón', j.talla_pantalon],
            ['chándal', j.talla_chandal],
        ]) {
            const v = limpiar(valor, 4);
            if (v && !TALLAS.includes(v)) return { error: `${nombre}: la talla de ${campo} no es válida.` };
        }

        jugadores.push({
            player_id: limpiar(j.player_id, 60),
            nombre,
            apellido,
            fecha_nacimiento: dob,
            genero,
            nacionalidad: limpiar(j.nacionalidad, 60),
            tipo_documento: tipoDoc,
            numero_documento: numDoc,
            email: normalizarEmail(j.email),
            telefono: limpiar(j.telefono, 30),
            direccion: limpiar(j.direccion, 200) || tutor.direccion,
            codigo_postal: limpiar(j.codigo_postal, 12) || tutor.codigo_postal,
            ciudad: limpiar(j.ciudad, 80) || tutor.ciudad,
            provincia: limpiar(j.provincia, 80) || tutor.provincia,
            pais: limpiar(j.pais, 60) || tutor.pais,
            alergias: limpiar(j.alergias, 500),
            altura_cm: altura === null ? null : Math.round(altura),
            peso_kg: peso,
            talla_camiseta: limpiar(j.talla_camiseta, 4),
            talla_pantalon: limpiar(j.talla_pantalon, 4),
            talla_chandal: limpiar(j.talla_chandal, 4),
            tarifa_variante: variante,
            parentesco,
            es_pagador: j.es_pagador === true,
            foto: typeof j.foto === 'string' && j.foto.startsWith('data:') ? j.foto : null,
            observaciones: limpiar(j.observaciones, 1000),
            acepta_uso_imagen: j.acepta_uso_imagen === true,
        });
    }

    return { tutor, jugadores, acepta_reglamento: true };
}

// ---------------------------------------------------------------------------

function plantillaBienvenida(nombre, password, jugadores) {
    const filas = jugadores
        .map(
            (j) => `<tr>
        <td style="padding:8px 0;color:#333;font-size:14px;border-bottom:1px solid #eee;">${escapeHtml(j.nombre)}<br>
          <span style="color:#777;font-size:12px;">${escapeHtml(j.categoria)}</span></td>
        <td style="padding:8px 0;color:#182B49;font-size:14px;font-weight:700;text-align:right;border-bottom:1px solid #eee;">
          ${j.mensualidad.toFixed(2).replace('.', ',')} €/mes</td>
      </tr>`
        )
        .join('');

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f0f2f5;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <tr><td style="background-color:#182B49;padding:25px 40px;text-align:center;">
    <table cellpadding="0" cellspacing="0" role="presentation" align="center" style="margin:0 auto 10px;"><tr><td style="background-color:#ffffff;border-radius:10px;padding:10px 16px;"><img src="https://www.menorcarugbyclub.com/assets/images/static/logo.png" alt="Menorca Rugby Club" width="150" height="84" style="display:block;border:0;"></td></tr></table>
    <h1 style="color:#FFC72C;font-size:20px;margin:10px 0 0;">MENORCA RUGBY CLUB</h1>
  </td></tr>
  <tr><td style="padding:30px 40px;">
    <h2 style="color:#182B49;font-size:20px;margin:0 0 15px;">Gracias, ${escapeHtml(nombre)}</h2>
    <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 20px;">
      Recibimos la inscripción. La revisamos y te avisamos cuando esté confirmada.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">${filas}</table>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#182B49;border-radius:12px;">
      <tr><td style="padding:25px 30px;">
        <p style="color:#AAB4C2;font-size:11px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;">Tu contraseña</p>
        <p style="color:#FFC72C;font-size:28px;font-weight:700;margin:0;font-family:'Courier New',monospace;letter-spacing:3px;">${escapeHtml(password)}</p>
        <p style="color:#C3CBD6;font-size:12px;margin:10px 0 0;">Con esto entrás a ver y renovar sin volver a cargar todo.</p>
      </td></tr>
    </table>
    <div style="text-align:center;margin:25px 0 10px;">
      <a href="https://www.menorcarugbyclub.com/inscripcion" style="display:inline-block;background-color:#FFC72C;color:#182B49;padding:12px 30px;border-radius:8px;font-weight:700;text-decoration:none;font-size:15px;">Ver mi inscripción</a>
    </div>
  </td></tr>
  <tr><td style="background-color:#182B49;padding:20px 40px;text-align:center;">
    <p style="color:#C3CBD6;font-size:12px;margin:0;">¿Dudas? info@menorcarugbyclub.com</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}
