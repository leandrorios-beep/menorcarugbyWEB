// ---------------------------------------------------------------------------
// Crear el link de pago de una familia.
//
// Una sola sesión de Stripe Checkout para todos los hijos: una suscripción
// mensual con una línea por jugador, más la matrícula de cada uno cargada en la
// primera factura. La familia paga una vez y queda todo andando.
//
// SÓLO SE COBRA LO QUE EL CLUB YA APROBÓ
//
// Los importes NO vienen del navegador: se leen de la inscripción, que la
// revisó alguien del club, y de la tabla `precios`. Si el importe lo mandara el
// cliente, cualquiera se cobraría la cuota que quisiera.
//
// Y sólo se cobran inscripciones en estado "aprobada". Una recién enviada
// todavía no la miró nadie: podría tener la tarifa equivocada.
//
// LOS 10 MESES
//
// El club cobra 9 mensualidades —del 5 de octubre al 5 de junio— pero Checkout no acepta un "cancelar
// después de N cobros". El corte se pone al recibir el webhook, cuando la
// suscripción ya existe. Ver stripe-webhook.js.
// ---------------------------------------------------------------------------

const { createClient } = require('@supabase/supabase-js');
const { getAuthPayload } = require('./auth');
const {
    temporadaKey,
    temporadaYear,
    cargarPrecios,
    importeFinal,
    cargarDescuentos,
    tramoDeFicha,
    varianteDeFicha,
    MESES_DE_CUOTA,
} = require('./inscripcion');

const URL_BASE = 'https://www.menorcarugbyclub.com';

/**
 * Cuándo sale la primera cuota: el 5 de octubre, como dice la web.
 *
 * Sin esto, quien se inscribe el 28 de septiembre paga la primera cuota ese
 * mismo día y las nueve se le corren un mes: la última caería el 28 de junio,
 * fuera de la temporada. Se le pone a la suscripción un "período de prueba"
 * que termina el 5 de octubre; la ficha federativa no espera, porque las
 * líneas de pago único se cobran al cerrar el checkout.
 *
 * Devuelve null si el 5 de octubre ya pasó —quien se suma en enero empieza a
 * pagar en el acto— o si faltan menos de dos días, que es el mínimo que acepta
 * Stripe para un trial.
 */
function primerCobroDeLaTemporada(year) {
    const cincoDeOctubre = Math.floor(Date.UTC(year, 9, 5, 9, 0, 0) / 1000);
    const ahora = Math.floor(Date.now() / 1000);
    return cincoDeOctubre - ahora > 48 * 3600 ? cincoDeOctubre : null;
}

/**
 * Stripe se instancia DENTRO del handler, no al cargar el modulo.
 *
 * require('stripe')(clave) revienta en el acto si la clave no esta. Como el
 * repartidor de /api/inscripcion carga los seis handlers al arrancar, esa
 * excepcion se llevaria puesta la inscripcion ENTERA: nadie podria ni escribir
 * su correo. Una pasarela sin configurar tiene que romper el pago, no el alta.
 */
function conectarStripe() {
    return require('stripe')(process.env.STRIPE_SECRET_KEY);
}

module.exports = async function accionPagar(req, res) {
    const payload = getAuthPayload(req);
    if (!payload || !payload.tutor_id) return res.status(401).json({ error: 'No autorizado' });

    if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(503).json({
            error: 'El cobro por tarjeta todavía no está activado. Escribinos a info@menorcarugbyclub.com.',
        });
    }

    const stripe = conectarStripe();
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const temporada = temporadaKey();

    try {
        // ── Qué inscripciones son suyas y están listas para cobrar ───────
        const { data: inscripciones, error } = await supabase
            .from('inscripciones')
            .select('inscripcion_id, player_id, temporada, estado, estado_cobro, tarifa_tramo, tarifa_variante, tarifa_descuentos, stripe_customer_id, stripe_subscription_id')
            .eq('tutor_id', payload.tutor_id);
        // Sin .eq('temporada'): el cliente de Stripe es de la FAMILIA y vive en
        // las filas de la temporada ANTERIOR. Filtrando por la temporada en
        // curso nunca se lo encontraba y se creaba un cliente nuevo en cada
        // intento, dejando la tarjeta guardada colgando de un cliente huerfano.
        // El filtro por temporada se aplica mas abajo, sobre lo que se cobra.
        if (error) throw new Error(error.message);

        const deEstaTemporada = (inscripciones || []).filter((i) => i.temporada === temporada);
        const listas = deEstaTemporada.filter((i) => i.estado === 'aprobada');
        if (!listas.length) {
            const enviadas = deEstaTemporada.filter((i) => i.estado === 'enviada').length;
            return res.status(409).json({
                error: enviadas
                    ? 'Todavía estamos revisando la inscripción. En cuanto la aprobemos te avisamos para pagar.'
                    : 'No hay ninguna inscripción aprobada a tu nombre para esta temporada.',
            });
        }

        const yaPagando = listas.filter((i) => i.stripe_subscription_id);
        if (yaPagando.length === listas.length) {
            return res.status(409).json({
                error: 'Ya tenés la cuota domiciliada. Si querés cambiar la tarjeta, escribinos.',
            });
        }
        // Sólo lo que todavía no tiene suscripción: cobrar dos veces al mismo
        // chico es peor que no cobrarle.
        const aCobrar = listas.filter((i) => !i.stripe_subscription_id);

        // La fecha de nacimiento también: la ficha federativa NO va por el
        // tramo de la cuota. Un chico que este año cumple 17 entrena con los
        // juveniles, paga cuota de juvenil y ficha de senior.
        const { data: jugadores } = await supabase
            .from('players')
            .select('player_id, first_name, last_name, dob')
            .in('player_id', aCobrar.map((i) => i.player_id));
        const nombreDe = new Map((jugadores || []).map((j) => [j.player_id, `${j.first_name} ${j.last_name}`]));
        const dobDe = new Map((jugadores || []).map((j) => [j.player_id, j.dob]));

        const precios = await cargarPrecios(supabase, temporada);
        const descuentos = await cargarDescuentos(supabase, temporada);

        // ── Armar las líneas ─────────────────────────────────────────────
        const lineas = [];
        const matriculas = [];
        const detalle = [];

        for (const i of aCobrar) {
            const nombre = nombreDe.get(i.player_id) || 'Jugador';

            const mensual = precios.get(`mensualidad|${i.tarifa_variante}|${i.tarifa_tramo}`);
            // importe === null es una fila del catálogo que existe pero que nadie
            // decidió todavía. Number(null) es 0, así que sin esta comprobación
            // se le cobraría 0 € y se le diría por correo que su cuota es 0,00.
            if (!mensual || mensual.importe === null || !mensual.stripe_price_id) {
                return res.status(503).json({
                    error: `Todavía no está publicado en la pasarela el precio de ${nombre}. Avisanos y lo resolvemos.`,
                });
            }

            // Un descuento APILADO no se puede aplicar sobre un Price de
            // Stripe: los Price son inmutables y un cupón de suscripción se
            // aplicaría a todas las líneas, o sea también al hermano que no
            // tiene derecho. Así que si una inscripción trae descuentos, este
            // cobro no puede ser fiel a lo que se le prometió a la familia.
            //
            // Antes seguía adelante: al formulario le enseñaba la mitad y a
            // Stripe le mandaba el precio entero. La familia veía 25 €/mes y
            // se le cobraban 50. Es preferible no cobrar y que alguien lo mire.
            //
            // Los descuentos del cuadro nuevo son VARIANTES —directivo,
            // familiar_directivo— y esas sí viajan en el precio, así que por el
            // camino normal esto no salta nunca.
            const conDescuento = importeFinal(
                Number(mensual.importe),
                'mensualidad',
                i.tarifa_descuentos || [],
                descuentos
            );
            if (conDescuento !== Number(mensual.importe)) {
                console.error(
                    `Inscripción ${i.inscripcion_id} con descuento apilado (${(i.tarifa_descuentos || []).join(',')}): ` +
                        `la pasarela cobraría ${mensual.importe} y se le prometió ${conDescuento}.`
                );
                return res.status(503).json({
                    error:
                        `La cuota de ${nombre} tiene un descuento que todavía no podemos cobrar por la web. ` +
                        'Escribinos a info@menorcarugbyclub.com y lo resolvemos sin que pagues de más.',
                });
            }

            lineas.push({ price: mensual.stripe_price_id, quantity: 1 });

            // La ficha va por el AÑO DE NACIMIENTO, no por el tramo de la
            // cuota. Buscándola por tarifa_tramo, a un chico de 17 —que entrena
            // de juvenil— se le cobraban 235 € en vez de 300.
            const tramoFicha = tramoDeFicha(dobDe.get(i.player_id), temporadaYear());
            const ficha = precios.get(
                `ficha_anual|${varianteDeFicha(i.tarifa_variante)}|${tramoFicha}`
            );
            // Y si no está publicada, se para. Antes se saltaba la línea sin
            // decir nada: la familia pagaba la cuota mensual, se iba contenta y
            // el club se quedaba sin cobrar la matrícula entera, que es la
            // mitad de lo que aporta un jugador en toda la temporada.
            if (!ficha || ficha.importe === null || !ficha.stripe_price_id) {
                return res.status(503).json({
                    error: `Todavía no está publicada en la pasarela la ficha de ${nombre}. Avisanos y lo resolvemos.`,
                });
            }
            matriculas.push({ price: ficha.stripe_price_id, quantity: 1 });

            detalle.push({
                jugador: nombre,
                inscripcion_id: i.inscripcion_id,
                mensualidad: conDescuento,
                ficha_anual: Number(ficha.importe),
            });
        }

        // ── Un cliente de Stripe por tutor, reutilizado ──────────────────
        const { data: tutor } = await supabase
            .from('tutores')
            .select('tutor_id, nombre, apellido, email, telefonos')
            .eq('tutor_id', payload.tutor_id)
            .single();

        // De cualquier temporada: es el cliente de la familia, no el del año.
        const conCliente = (inscripciones || []).find((i) => i.stripe_customer_id);
        let customerId = conCliente ? conCliente.stripe_customer_id : null;
        if (!customerId) {
            const cliente = await stripe.customers.create({
                email: tutor.email,
                name: `${tutor.nombre} ${tutor.apellido || ''}`.trim(),
                phone: (tutor.telefonos || [])[0] || undefined,
                metadata: { tutor_id: tutor.tutor_id },
            });
            customerId = cliente.id;
        }

        // ── La sesión ────────────────────────────────────────────────────
        // Las metadata van en la SUSCRIPCIÓN además de en la sesión: el webhook
        // de cada factura mensual recibe la suscripción, no la sesión, y sin
        // esto no habría forma de saber a qué inscripción imputar el cobro.
        const meta = {
            tutor_id: tutor.tutor_id,
            temporada,
            inscripciones: aCobrar.map((i) => i.inscripcion_id).join(','),
        };

        // ── Agrupar por precio ───────────────────────────────────────────
        //
        // Una suscripción de Stripe NO admite dos líneas con el mismo precio:
        // van agrupadas en una sola con cantidad 2. Y dos hermanos juveniles
        // caen siempre en el mismo precio, porque la regla de hermanos los
        // manda a los dos a 'con_hermano'. Sin agrupar, Stripe rechazaba la
        // sesión entera y 7 de las 8 familias con dos hijos no podían pagar.
        //
        // El webhook ya daba por hecho que venían agrupadas (repartirLineas en
        // cobros-inscripcion.js): era este lado el que no cumplía su parte.
        const primeraCuota = primerCobroDeLaTemporada(temporadaYear());

        const agrupar = (items) => {
            const cuenta = new Map();
            for (const x of items) cuenta.set(x.price, (cuenta.get(x.price) || 0) + x.quantity);
            return [...cuenta].map(([price, quantity]) => ({ price, quantity }));
        };

        const sesion = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            // Las matrículas van acá, no en subscription_data: `add_invoice_items`
            // es de la API de suscripciones y Checkout lo rechaza como parámetro
            // desconocido, tirando abajo la sesión entera. Checkout sí admite
            // precios de pago único entre las líneas de una suscripción, y los
            // cobra sólo en la primera factura, que es exactamente lo que hace
            // falta para la ficha federativa.
            line_items: [...agrupar(lineas), ...agrupar(matriculas)],
            subscription_data: {
                // La primera cuota sale el 5 de octubre, que es lo que dice la
                // web. Sin esto, quien se inscribe el 28 de septiembre paga la
                // primera el 28 y las nueve se le corren un mes.
                //
                // La ficha NO espera: las líneas de pago único se cobran al
                // cerrar el checkout. Matrícula hoy, primera cuota el 5.
                ...(primeraCuota ? { trial_end: primeraCuota } : {}),
                metadata: meta,
                description: `Cuotas ${temporada} — ${detalle.map((d) => d.jugador).join(', ')}`,
            },
            metadata: meta,
            locale: 'es',
            success_url: `${URL_BASE}/inscripcion?pago=ok`,
            cancel_url: `${URL_BASE}/inscripcion?pago=cancelado`,
        });

        // Guardar el cliente ya: si la familia abandona el pago, la próxima vez
        // se reutiliza en vez de crear un cliente duplicado en Stripe.
        await supabase
            .from('inscripciones')
            .update({ stripe_customer_id: customerId, estado_cobro: 'pendiente' })
            .in('inscripcion_id', aCobrar.map((i) => i.inscripcion_id));

        return res.status(200).json({
            success: true,
            url: sesion.url,
            detalle,
            meses: MESES_DE_CUOTA,
            total_mensual: detalle.reduce((n, d) => n + d.mensualidad, 0),
            total_primera_vez: detalle.reduce((n, d) => n + d.mensualidad + (d.ficha_anual || 0), 0),
        });
    } catch (e) {
        console.error('accion-pagar:', e && e.message);
        return res.status(500).json({ error: 'No pudimos preparar el pago. Probá en un rato o escribinos.' });
    }
};
