// ---------------------------------------------------------------------------
// Todo lo que la pantalla de inscripción necesita para dibujarse, de una vez:
// los datos del tutor, sus jugadores, qué inscripción tiene cada uno y cuánto
// sale cada opción de tarifa esta temporada.
//
// Va todo junto a propósito. La alternativa —una llamada por jugador— hace que
// el formulario se dibuje a pedazos en un móvil con mala cobertura, que es
// exactamente donde lo van a usar la mayoría de las familias.
// ---------------------------------------------------------------------------

const { createClient } = require('@supabase/supabase-js');
const { getAuthPayload } = require('./auth');
const {
    temporadaKey,
    temporadaYear,
    tramoDeCategoria,
    calcularCategorias,
    cargarPrecios,
    cargarDescuentos,
    importeFinal,
} = require('./inscripcion');

module.exports = async function accionEstado(req, res) {

    const payload = getAuthPayload(req);
    if (!payload) return res.status(401).json({ error: 'No autorizado' });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const year = temporadaYear();
    const temporada = temporadaKey(year);
    const anterior = temporadaKey(year - 1);

    try {
        const precios = await cargarPrecios(supabase, temporada);
        const descuentos = await cargarDescuentos(supabase, temporada);

        let tutor = null;
        let jugadores = [];

        if (payload.tutor_id) {
            const { data } = await supabase
                .from('tutores')
                .select(
                    'tutor_id, nombre, apellido, email, fecha_nacimiento, genero, nacionalidad, ' +
                        'tipo_documento, numero_documento, telefonos, direccion, codigo_postal, ciudad, provincia, pais'
                )
                .eq('tutor_id', payload.tutor_id)
                .maybeSingle();
            tutor = data || null;

            const { data: vinculos } = await supabase
                .from('tutor_jugador')
                .select('player_id, parentesco, es_pagador')
                .eq('tutor_id', payload.tutor_id);

            const ids = (vinculos || []).map((v) => v.player_id);
            if (ids.length) {
                const { data: players } = await supabase
                    .from('players')
                    .select(
                        'player_id, first_name, last_name, dob, gender, category_primary, categories_extra, ' +
                            'email, phone, photo, tax_type, tax_number, status'
                    )
                    .in('player_id', ids);

                const { data: datos } = await supabase
                    .from('player_datos_personales')
                    .select('*')
                    .in('player_id', ids);

                const { data: inscs } = await supabase
                    .from('inscripciones')
                    .select('*')
                    .in('player_id', ids)
                    .in('temporada', [temporada, anterior]);

                // Todas de una: es una llamada a la base por jugador, pero la
                // alternativa es mostrar un precio que después cambia.
                const categoriaDe = new Map();
                for (const p of players || []) {
                    try {
                        categoriaDe.set(
                            p.player_id,
                            await calcularCategorias(supabase, p.dob, p.gender === 'Femenino', year)
                        );
                    } catch (e) {
                        // Si falla, se sigue con la categoría que tiene: es mejor
                        // mostrar la vieja que no mostrar nada.
                        console.error(`No se pudo recalcular la categoría de ${p.player_id}:`, e && e.message);
                    }
                }

                const porId = (lista, campo) => {
                    const m = new Map();
                    (lista || []).forEach((x) => m.set(x[campo], x));
                    return m;
                };
                const mDatos = porId(datos, 'player_id');
                const mVinculo = porId(vinculos, 'player_id');

                jugadores = (players || []).map((p) => {
                    const deEsteAnio = (inscs || []).find(
                        (i) => i.player_id === p.player_id && i.temporada === temporada
                    );
                    const delAnterior = (inscs || []).find(
                        (i) => i.player_id === p.player_id && i.temporada === anterior
                    );
                    const base = deEsteAnio || delAnterior || null;

                    // La categoría se recalcula con el año de la temporada NUEVA,
                    // no se lee de players.
                    //
                    // El 1 de julio, players.category_primary todavía dice la
                    // categoría de la temporada que terminó. Como el guardado sí
                    // la recalcula, la familia veía en pantalla la cuota juvenil
                    // y se le guardaba la senior: el importe le cambiaba DESPUÉS
                    // de haber aceptado.
                    const catNueva = categoriaDe.get(p.player_id);
                    const categoria = catNueva ? catNueva.principal : p.category_primary;
                    const tramo = tramoDeCategoria(categoria, p.dob);

                    return {
                        player_id: p.player_id,
                        nombre: p.first_name,
                        apellido: p.last_name,
                        fecha_nacimiento: p.dob,
                        genero: p.gender,
                        categoria,
                        // La que tiene hoy en la ficha, por si difiere: sirve
                        // para poder decirle "este año le toca SUB16".
                        categoria_actual: p.category_primary,
                        categorias_extra: (catNueva ? catNueva.extra : p.categories_extra) || [],
                        email: p.email,
                        telefono: p.phone,
                        foto: p.photo,
                        tipo_documento: p.tax_type,
                        numero_documento: p.tax_number,
                        datos_personales: mDatos.get(p.player_id) || null,
                        es_pagador: (mVinculo.get(p.player_id) || {}).es_pagador === true,
                        parentesco: (mVinculo.get(p.player_id) || {}).parentesco || null,
                        // Lo que ya está enviado para ESTA temporada. Si existe,
                        // la pantalla muestra "ya renovaste" en vez del formulario.
                        inscripcion_actual: deEsteAnio || null,
                        // Lo del año pasado sirve para precargar: tallas, tarifa,
                        // alergias. Es la diferencia entre renovar en dos toques
                        // y volver a escribir todo.
                        inscripcion_anterior: delAnterior || null,
                        tramo,
                        opciones: opcionesDeTarifa(tramo, precios, descuentos),
                    };
                });
            }
        }

        return res.status(200).json({
            success: true,
            temporada,
            temporada_anterior: anterior,
            tutor,
            es_socio: Boolean(payload.socio_id),
            jugadores,
            descuentos: descuentos.map((d) => ({
                codigo: d.codigo,
                nombre: d.nombre,
                tipo: d.tipo,
                porcentaje: d.porcentaje,
                importe: d.importe,
            })),
        });
    } catch (e) {
        console.error('inscripcion-estado:', e && e.message);
        return res.status(500).json({ error: 'No se pudo cargar tu información' });
    }
};

/**
 * Qué puede elegir la familia para ese tramo, con el importe ya calculado.
 *
 * No se ofrecen todas las variantes: "con beca" y las de directivo no las elige
 * la familia, las pone el club. Si se ofrecieran, cualquiera se autoasigna la
 * cuota de 1 €.
 */
const VARIANTES_ELEGIBLES = ['base', 'con_hermano'];

function opcionesDeTarifa(tramo, precios, descuentos) {
    const out = [];
    for (const variante of VARIANTES_ELEGIBLES) {
        const mensual = precios.get(`mensualidad|${variante}|${tramo}`);
        if (!mensual || mensual.importe === null) continue;

        const ficha = precios.get(`ficha_anual|${variante}|${tramo}`);
        out.push({
            variante,
            mensualidad: Number(mensual.importe),
            // La cuota se cobra en 10 meses, no en 12. Decisión del club.
            meses: 10,
            ficha_anual: ficha && ficha.importe !== null ? Number(ficha.importe) : null,
            // Lo que saldría con el descuento de delegado, para que la pantalla
            // pueda mostrarlo cuando el club se lo haya concedido a esa familia.
            con_delegado: importeFinal(Number(mensual.importe), 'mensualidad', ['delegado'], descuentos),
        });
    }
    return out;
}
