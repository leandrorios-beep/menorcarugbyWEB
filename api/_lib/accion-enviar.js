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
    tramoDeFicha,
    varianteDeFicha,
    varianteAutomatica,
    MESES_DE_CUOTA,
} = require('./inscripcion');

const TIPOS_DOC = ['DNI', 'NIE', 'PASAPORTE', 'TARJETA_SANITARIA', 'LIBRO_FAMILIA', 'OTRO'];
const TALLAS = ['4', '6', '8', '10', '12', '14', '16', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
const GENEROS = ['Masculino', 'Femenino'];
// 'el_mismo' = la cuenta ES el jugador. Son los 32 adultos que juegan y se
// pagan lo suyo. Sin esto podian crear la cuenta pero el envio les respondia
// "parentesco no valido": la base ya lo aceptaba y el validador de la web no.
const PARENTESCOS = ['madre', 'padre', 'tutor_legal', 'abuelo', 'hermano', 'otro', 'el_mismo'];
const REGLAMENTO_VERSION = 'web-2026';

/**
 * Un rechazo con mensaje para la familia, que ademas deshace el alta a medias.
 *
 * El problema que arregla: el tutor se crea al principio con activo = false y
 * se activa recien al final, cuando ya se procesaron todos los hijos. Si el
 * segundo hijo fallaba —una tarifa que no existe, un hermano de baja— la
 * funcion salia con un 400 dejando al tutor creado, inactivo y con una
 * contrasena que nunca se envio.
 *
 * A partir de ahi la familia quedaba encerrada: al reintentar le decia "ese
 * correo ya esta registrado, entra con tu contrasena", y al intentar entrar,
 * "tu ficha esta archivada". Hacia falta que lo destrabara una persona a mano.
 */
class RechazoDelFormulario extends Error {
    constructor(status, mensaje, extra) {
        super(mensaje);
        this.status = status;
        this.extra = extra || {};
    }
}

module.exports = async function accionEnviar(req, res) {

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const payload = getAuthPayload(req);
    const body = req.body || {};

    const year = temporadaYear();
    const temporada = temporadaKey(year);

    // Fuera del try: el catch los necesita para poder deshacer.
    let tutorId = payload && payload.tutor_id ? payload.tutor_id : null;
    let tutorEsNuevo = false;

    try {
        const datos = validar(body, Boolean(payload && payload.tutor_id));
        if (datos.error) return res.status(400).json({ error: datos.error });

        const { tutor: datosTutor, jugadores, acepta_reglamento } = datos;
        const pagoAnual = body.pago_anual === true;

        // ── 1. El tutor ──────────────────────────────────────────────────
        let passwordNueva = null;

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

        // ── La tarifa la decide el club, no el formulario ─────────────────
        //
        // La familia no elige nada: manda a sus hijos y el servidor pone el
        // precio. Dos reglas, las que fijó la comisión el 28/09/2026:
        //
        //   · "con hermano" sale solo, cuando la familia trae más de un
        //     jugador. Lo cobran únicamente los juveniles y da igual el
        //     apellido: cuenta la familia, no el parentesco.
        //   · el resto de los descuentos —directivo, hijo de directivo, beca,
        //     colaborador— los pone el club al revisar la inscripción. Acá
        //     sólo se RESPETAN los que ya estaban: si el año pasado el club le
        //     puso la tarifa de hijo de entrenador, renovar no se la quita.
        const deEsteEnvio = jugadores.filter((j) => !j.no_renueva);
        // Los IDs son de TODO el envío, también los que este año no juegan: son
        // los que hay que descontar de la búsqueda de hermanos. Si sólo se
        // tomaran los que siguen, el que se da de baja en este mismo envío
        // todavía figura con inscripción viva en la base —la baja se escribe
        // después, dentro del bucle— y el hermano que sí renueva se quedaba con
        // el descuento de una familia que ya no existe.
        const idsDelEnvio = jugadores.map((j) => j.player_id).filter(Boolean);

        // Quien se inscribe en dos veces —hoy un hijo, la semana que viene el
        // otro— también es una familia de dos. Se suman los hermanos que ya
        // tienen inscripción viva de esta temporada y NO vienen en este envío,
        // para no contarlos dos veces.
        let hermanosYaInscritos = 0;
        const varianteEspecialPrevia = {};
        if (!tutorEsNuevo) {
            const { data: delTutor } = await supabase
                .from('tutor_jugador')
                .select('player_id')
                .eq('tutor_id', tutorId);
            const otros = (delTutor || [])
                .map((v) => v.player_id)
                .filter((id) => !idsDelEnvio.includes(id));
            if (otros.length) {
                const { data: vivas } = await supabase
                    .from('inscripciones')
                    .select('player_id')
                    .eq('temporada', temporada)
                    .in('player_id', otros)
                    .not('estado', 'in', '(baja,rechazada)');
                hermanosYaInscritos = new Set((vivas || []).map((i) => i.player_id)).size;
            }
            if (idsDelEnvio.length) {
                const { data: previas } = await supabase
                    .from('inscripciones')
                    .select('player_id, tarifa_variante, temporada')
                    .in('player_id', idsDelEnvio)
                    .order('temporada', { ascending: false });
                for (const previa of previas || []) {
                    // La más reciente manda; las anteriores ya no importan.
                    if (previa.player_id in varianteEspecialPrevia) continue;
                    const v = previa.tarifa_variante;
                    varianteEspecialPrevia[previa.player_id] =
                        v && v !== 'base' && v !== 'con_hermano' ? v : null;
                }
            }
        }
        const cuantosJugadores = deEsteEnvio.length + hermanosYaInscritos;

        const resultado = [];

        for (const j of jugadores) {
            // ── "Este año no juega" ──────────────────────────────────────
            if (j.no_renueva) {
                const yaTiene = await bajaDeLaTemporada(supabase, temporada, j, tutorId);
                resultado.push({
                    player_id: j.player_id,
                    nombre: `${j.nombre} ${j.apellido || ''}`.trim(),
                    no_renueva: true,
                    aviso: yaTiene,
                });
                continue;
            }

            const cat = await calcularCategorias(supabase, j.fecha_nacimiento, j.genero === 'Femenino', year);
            const tramo = tramoDeCategoria(cat.principal, j.fecha_nacimiento);

            // Acá se le pone el precio. Lo que haya llegado del navegador en
            // este campo se descarta: es un dato del club, no de la familia.
            // varianteAutomatica() nunca le da "con hermano" a un adulto, que
            // es lo que prohíbe el CHECK inscripciones_sin_hermano_en_adultos.
            j.tarifa_variante =
                varianteEspecialPrevia[j.player_id || ''] || varianteAutomatica(tramo, cuantosJugadores);
            // Que la fila EXISTA no alcanza: el estado normal del catálogo es
            // que la fila esté y el importe todavía no. Number(null) es 0, así
            // que sin esto la familia se inscribe sin error y recibe un correo
            // diciendo que su cuota es 0,00 €/mes. Un compromiso por escrito
            // con un número inventado.
            const precioMensual = precios.get(`mensualidad|${j.tarifa_variante}|${tramo}`);
            if (!precioMensual || precioMensual.importe === null) {
                throw new RechazoDelFormulario(
                    400,
                    `${j.nombre}: todavía no está publicada la cuota de ${tramo} para esta temporada. ` +
                        'Avisanos a info@menorcarugbyclub.com y la cargamos.'
                );
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
            let descuentosPrevios = [];
            if (playerId) {
                const { data: yaHay } = await supabase
                    .from('inscripciones')
                    .select('estado, tarifa_descuentos')
                    .eq('temporada', temporada)
                    .eq('player_id', playerId)
                    .maybeSingle();
                descuentosPrevios = (yaHay && yaHay.tarifa_descuentos) || [];

                if (yaHay && yaHay.estado === 'baja') {
                    throw new RechazoDelFormulario(
                        409,
                        `${j.nombre} figura de baja esta temporada. Escribinos a info@menorcarugbyclub.com y lo revisamos con vos.`
                    );
                }
                if (yaHay && yaHay.estado === 'aprobada') {
                    conservarEstado = true;
                    notas.push('La familia mando cambios sobre una inscripcion ya aprobada.');
                }
                // Rechazada -> la familia esta corrigiendo lo que le pidieron.
                //
                // La maquina de estados no permite rechazada -> enviada; si la
                // permitiera saltarse, el upsert moria con el error crudo de
                // Postgres en la cara de la familia, la correccion no se
                // guardaba, y no habia ningun boton —ni en la web ni en la app—
                // que la sacara de ahi. Rechazar a alguien lo dejaba encerrado.
                //
                // El camino legal existe: rechazada -> borrador -> enviada. Se
                // da el primer paso aca y el upsert de mas abajo da el segundo.
                if (yaHay && yaHay.estado === 'rechazada') {
                    const { error: errVolver } = await supabase
                        .from('inscripciones')
                        .update({ estado: 'borrador' })
                        .eq('temporada', temporada)
                        .eq('player_id', playerId);
                    if (errVolver) {
                        throw new Error(`No se pudo reabrir la inscripcion de ${j.nombre}: ${errVolver.message}`);
                    }
                    notas.push('La familia corrigio y volvio a enviar una inscripcion rechazada.');
                }
            }

            if (playerId) {
                const { data: previo } = await supabase
                    .from('players')
                    .select('player_id, first_name, last_name, dob')
                    .eq('player_id', playerId)
                    .maybeSingle();
                if (!previo) throw new RechazoDelFormulario(400, `No encontramos a ${j.nombre} en la base.`);

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
                // ¿Este chico YA está en el club?
                //
                // Última defensa contra el duplicado. Aunque el correo sea nuevo
                // —una madre que se inscribe con otra dirección, un padre que
                // antes figuraba con el correo del otro— el jugador puede estar
                // en la base desde hace años. Crear uno nuevo al lado parte su
                // historia en dos: los cobros viejos quedan en una ficha y los
                // nuevos en la otra.
                //
                // Se cruza por documento (exacto) o por nombre + fecha de
                // nacimiento. Si aparece, se REUSA la ficha y se anota, para que
                // quien revise vea que esto no es un alta.
                const yaEstaba = await buscarJugadorExistente(supabase, j);
                if (yaEstaba) {
                    playerId = yaEstaba.player_id;

                    // El mismo control que arriba, ahora que sabemos quien es.
                    //
                    // El control de "ya esta aprobada / de baja" corria con el
                    // player_id que mandaba el NAVEGADOR; este camino lo
                    // descubre despues, por documento o por nombre y fecha, y se
                    // lo saltaba entero. Resultado: una familia que entra por la
                    // puerta de "soy nuevo" y cuyo hijo ya tiene inscripcion
                    // chocaba contra la maquina de estados y veia un error de
                    // Postgres crudo, que es justo lo que el control existe para
                    // evitar.
                    const { data: suya } = await supabase
                        .from('inscripciones')
                        .select('estado, tarifa_descuentos')
                        .eq('temporada', temporada)
                        .eq('player_id', playerId)
                        .maybeSingle();
                    if (suya && suya.estado === 'baja') {
                        throw new RechazoDelFormulario(
                            409,
                            `${j.nombre} figura de baja esta temporada. Escribinos a info@menorcarugbyclub.com y lo revisamos con vos.`
                        );
                    }
                    if (suya && suya.estado === 'aprobada') conservarEstado = true;
                    // Y el mismo camino de vuelta para una rechazada: sin esto,
                    // corregir lo que el club pidio devolvia un error de base.
                    if (suya && suya.estado === 'rechazada') {
                        const { error: errVolver } = await supabase
                            .from('inscripciones')
                            .update({ estado: 'borrador' })
                            .eq('temporada', temporada)
                            .eq('player_id', playerId);
                        if (errVolver) {
                            throw new Error(`No se pudo reabrir la inscripcion de ${j.nombre}: ${errVolver.message}`);
                        }
                        notas.push('La familia corrigio y volvio a enviar una inscripcion rechazada.');
                    }
                    descuentosPrevios = (suya && suya.tarifa_descuentos) || [];

                    notas.push(
                        `Ya estaba en la base como "${yaEstaba.first_name} ${yaEstaba.last_name}" ` +
                            '(se reutilizó su ficha en vez de crear una nueva).'
                    );
                    const { error } = await supabase
                        .from('players')
                        .update({
                            first_name: j.nombre,
                            last_name: j.apellido,
                            gender: j.genero,
                            category_primary: cat.principal,
                            categories_extra: cat.extra,
                            ...soloConValor({
                                email: j.email,
                                phone: j.telefono,
                                tax_type: j.tipo_documento,
                                tax_number: j.numero_documento,
                            }),
                        })
                        .eq('player_id', playerId);
                    if (error) throw new Error(`No se pudo actualizar a ${j.nombre}: ${error.message}`);
                }
            }

            if (!playerId) {
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
                    // La que la familia tiene delante AHORA. El club puede
                    // cambiar tarifa_variante para abaratar, pero no para
                    // cobrar mas que esto: el tope se comprueba contra esta.
                    tarifa_variante_origen: j.tarifa_variante,
                    // Los descuentos NO los toca la familia: los concede el club
                    // y se conservan. Antes se pisaban con [] en cada envio, asi
                    // que una de las 8 familias con descuento de delegado lo
                    // perdia —el 50% de la cuota— con solo entrar a corregir un
                    // telefono. La familia elige la VARIANTE; el descuento es
                    // del club.
                    tarifa_descuentos: descuentosPrevios,
                    acepta_reglamento,
                    reglamento_version: REGLAMENTO_VERSION,
                    acepta_reglamento_at: ahora,
                    acepta_uso_imagen: j.acepta_uso_imagen,
                    acepta_uso_imagen_at: j.acepta_uso_imagen ? ahora : null,
                    foto_path: fotoPath,
                    observaciones: [j.observaciones, ...notas].filter(Boolean).join(' ') || null,
                    pago_anual: pagoAnual,
                    origen: 'web',
                    enviada_at: ahora,
                    recibida_at: ahora,
                },
                { onConflict: 'temporada,player_id' }
            );
            if (errInsc) throw new Error(`No se pudo guardar la inscripción de ${j.nombre}: ${errInsc.message}`);

            const mensual = Number(precioMensual.importe);
            // La ficha federativa NO va por el tramo de la cuota: va por el año
            // de nacimiento. El que este año cumple 17 o 18 paga la de senior
            // (300 €) aunque entrene con los juveniles y pague cuota juvenil.
            const ficha = precios.get(
                `ficha_anual|${varianteDeFicha(j.tarifa_variante)}|${tramoDeFicha(j.fecha_nacimiento, year)}`
            );

            resultado.push({
                player_id: playerId,
                nombre: `${j.nombre} ${j.apellido}`,
                categoria: cat.principal,
                categorias_extra: cat.extra,
                tramo,
                variante: j.tarifa_variante,
                mensualidad: mensual,
                meses: MESES_DE_CUOTA,
                total_temporada:
                    ficha && ficha.importe !== null
                        ? Math.round((mensual * MESES_DE_CUOTA + Number(ficha.importe)) * 100) / 100
                        : null,
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
            total_mensual: resultado.reduce((n, r) => n + (r.mensualidad || 0), 0),
            cuenta_creada: Boolean(passwordNueva),
            aviso,
        });
    } catch (e) {
        // Si el tutor se creo en ESTA llamada y quedo a medias, se borra. Asi la
        // familia puede corregir y volver a intentarlo en vez de quedar
        // encerrada con una cuenta inactiva y sin contrasena.
        //
        // Borrar el tutor cascadea sus vinculos; los jugadores que se hayan
        // llegado a crear quedan, y los recoge el dedupe en el reintento en vez
        // de duplicarse.
        if (tutorEsNuevo && tutorId) {
            const { error: errBorrar } = await supabase.from('tutores').delete().eq('tutor_id', tutorId);
            if (errBorrar) console.error('No se pudo deshacer el tutor a medias:', errBorrar.message);
        }

        if (e instanceof RechazoDelFormulario) {
            return res.status(e.status).json(Object.assign({ error: e.message }, e.extra));
        }
        console.error('inscripcion-enviar:', e && e.message);
        return res.status(500).json({ error: (e && e.message) || 'No se pudo guardar la inscripción' });
    }
};

// ---------------------------------------------------------------------------

/**
 * Deja constancia de que ese jugador NO se inscribe esta temporada.
 *
 * Se crea la inscripción en estado 'baja', no se omite la fila. La diferencia
 * importa: omitirla deja al club adivinando en septiembre si la familia se
 * olvidó o si el chico se fue. Una baja con fecha y motivo se ve en la bandeja
 * el mismo día.
 *
 * Nacer en 'baja' está permitido: la máquina de estados es un trigger de UPDATE,
 * no de INSERT. Y 'baja' está exenta del reglamento obligatorio, que es lo
 * correcto — no se le puede pedir que acepte el reglamento a quien se va.
 *
 * SI YA ESTABA COBRANDO, NO LO TOCA LA FAMILIA. Cortar una suscripción viva es
 * una decisión de dinero: puede haber meses pagados por delante y, si tiene
 * hermanos, la suscripción es de toda la familia. Eso lo resuelve el club desde
 * la bandeja, que sí sabe hacerlo.
 */
async function bajaDeLaTemporada(supabase, temporada, j, tutorId) {
    const { data: yaHay } = await supabase
        .from('inscripciones')
        .select('inscripcion_id, estado, stripe_subscription_id')
        .eq('temporada', temporada)
        .eq('player_id', j.player_id)
        .maybeSingle();

    if (yaHay && yaHay.estado === 'baja') return null; // ya estaba dicho

    if (yaHay && yaHay.stripe_subscription_id) {
        return (
            `${j.nombre} ya tiene la cuota domiciliada, así que la baja la tiene que hacer el club ` +
            'para no cobrarte de más ni cortarle el cobro a un hermano. Ya quedamos avisados.'
        );
    }

    const ahora = new Date().toISOString();
    if (yaHay) {
        const { error } = await supabase
            .from('inscripciones')
            .update({ estado: 'baja', motivo_baja: j.motivo_no_renueva })
            .eq('inscripcion_id', yaHay.inscripcion_id);
        if (error) throw new Error(`No se pudo registrar la baja de ${j.nombre}: ${error.message}`);
        return null;
    }

    const { error } = await supabase.from('inscripciones').insert({
        temporada,
        player_id: j.player_id,
        tutor_id: tutorId,
        estado: 'baja',
        motivo_baja: j.motivo_no_renueva,
        origen: 'web',
        recibida_at: ahora,
        baja_at: ahora,
    });
    if (error) throw new Error(`No se pudo registrar la baja de ${j.nombre}: ${error.message}`);
    return null;
}

/**
 * Busca si ese chico ya está en la base, aunque venga por un correo nuevo.
 *
 * Dos criterios, de más fuerte a más débil:
 *   1. el documento, exacto — es único de verdad
 *   2. nombre + apellido + fecha de nacimiento
 *
 * El segundo se compara sin tildes ni mayúsculas, porque en la base conviven
 * "Goñalons" y "Gonalons", "MARTÍNEZ" y "Martinez". Si hay más de un candidato
 * NO se elige ninguno: mejor crear un duplicado que fusionar a dos chicos
 * distintos, que es un error que después no se puede deshacer.
 */
async function buscarJugadorExistente(supabase, j) {
    const limpiar = (v) => String(v || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
    const norm = (v) =>
        String(v || '')
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9 ]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

    if (j.numero_documento) {
        const doc = limpiar(j.numero_documento);
        if (doc.length >= 7) {
            const { data } = await supabase
                .from('players')
                .select('player_id, first_name, last_name, tax_number')
                .not('tax_number', 'is', null);
            const hit = (data || []).find((p) => limpiar(p.tax_number) === doc);
            if (hit) return hit;
        }
    }

    const { data } = await supabase
        .from('players')
        .select('player_id, first_name, last_name, dob')
        .eq('dob', j.fecha_nacimiento);

    const buscado = norm(`${j.nombre} ${j.apellido}`);
    const candidatos = (data || []).filter(
        (p) => norm(`${p.first_name} ${p.last_name}`) === buscado
    );
    return candidatos.length === 1 ? candidatos[0] : null;
}

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
    // Los que no renuevan no cuentan como hermanos: si de dos hijos uno se va,
    // el que queda ya no tiene descuento por hermano.
    const siguen = lista.filter((j) => j.no_renueva !== true);

    for (const j of lista) {
        const nombre = limpiar(j.nombre, 80);

        // "Este año no juega": la familia lo dice explícitamente en vez de
        // simplemente no mandarlo. Es mejor para todos — el club se entera en
        // el momento en vez de descubrirlo en septiembre llamando por teléfono,
        // y queda con fecha y motivo.
        //
        // A este no se le pide tarifa, ni tallas, ni nada: no se va a inscribir.
        if (j.no_renueva === true) {
            if (!j.player_id) {
                return { error: `${nombre || 'Ese jugador'} no está en el club, así que no hay nada que dar de baja.` };
            }
            jugadores.push({
                player_id: limpiar(j.player_id, 60),
                nombre,
                apellido: limpiar(j.apellido, 120),
                no_renueva: true,
                motivo_no_renueva: limpiar(j.motivo_no_renueva, 500) || 'La familia avisó que este año no juega.',
            });
            continue;
        }
        const apellido = limpiar(j.apellido, 120);
        const dob = fechaValida(j.fecha_nacimiento);
        const genero = limpiar(j.genero);

        if (!nombre || !apellido) return { error: 'Falta el nombre o el apellido de un jugador.' };
        if (!dob) return { error: `${nombre}: la fecha de nacimiento no es válida.` };
        if (!GENEROS.includes(genero)) return { error: `${nombre}: falta el sexo.` };

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
            // La tarifa NO la elige la familia: la calcula el servidor más abajo,
            // con el año de nacimiento y cuántos jugadores trae la inscripción.
            // Si llegara desde el navegador, cualquiera se pondría la de 1 €.
            tarifa_variante: null,
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
