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
} = require('./inscripcion');

const URL_BASE = 'https://www.menorcarugbyclub.com';

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

            // El descuento del delegado no puede aplicarse sobre un Price de
            // Stripe ya creado: se manda como cupón de la suscripción.
            const conDescuento = importeFinal(
                Number(mensual.importe),
                'mensualidad',
                i.tarifa_descuentos || [],
                descuentos
            );

            lineas.push({ price: mensual.stripe_price_id, quantity: 1 });

            // La ficha va por el AÑO DE NACIMIENTO, no por el tramo de la
            // cuota. Buscándola por tarifa_tramo, a un chico de 17 —que entrena
            // de juvenil— se le cobraban 235 € en vez de 300.
            const tramoFicha = tramoDeFicha(dobDe.get(i.player_id), temporadaYear());
            const ficha = precios.get(`ficha_anual|${i.tarifa_variante}|${tramoFicha}`);
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

        const sesion = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items: lineas,
            subscription_data: {
                // Las matriculas son pago unico: se cargan en la PRIMERA
                // factura de la suscripcion en vez de crear un cobro aparte,
                // asi la familia paga una sola vez.
                ...(matriculas.length ? { add_invoice_items: matriculas } : {}),
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
