// ---------------------------------------------------------------------------
// Guardar la tarjeta de la familia. NO cobra nada.
//
// POR QUÉ ESTO Y NO UN PAGO
//
// El club revisa cada inscripción antes de darla por buena, y al revisarla
// puede aplicarle la tarifa de colaborador, de hijo de directivo o de beca.
// Cobrar en el momento de inscribirse significaría cobrarle a gente que a lo
// mejor se rechaza, y cobrarle el precio de tabla a quien tiene descuento para
// después devolverle la diferencia de a uno.
//
// Pero obligar a la familia a volver otro día a pagar tampoco sirve: no
// vuelven. Así que la tarjeta se deja al inscribirse, en el mismo rato, y el
// cobro lo dispara el club al aprobar, con la tarifa que corresponda.
//
// Stripe lo llama "modo setup": valida la tarjeta, guarda la autorización del
// titular para cobros futuros, e importe cero. No se mueve un euro hasta que
// alguien del club aprueba.
//
// LA REGLA QUE ESTO OBLIGA A RESPETAR
//
// La familia está autorizando un cobro cuyo importe final decide el club
// después. Eso sólo es honesto en una dirección: el club puede BAJAR el precio
// —aplicando un descuento— y nunca subirlo por encima de lo que la familia vio
// al dejar la tarjeta. El tope está puesto en el lado que cobra.
// ---------------------------------------------------------------------------

const { createClient } = require('@supabase/supabase-js');
const { getAuthPayload, identidad } = require('./auth');
const { temporadaKey } = require('./inscripcion');

const URL_BASE = 'https://www.menorcarugbyclub.com';

/**
 * Stripe se instancia DENTRO del handler, no al cargar el módulo.
 *
 * require('stripe')(clave) revienta en el acto si la clave no está, y el
 * repartidor de /api/inscripcion carga todos los handlers al arrancar: esa
 * excepción se llevaría puesta la inscripción ENTERA, y nadie podría ni
 * escribir su correo. Una pasarela sin configurar tiene que romper el pago, no
 * el alta.
 */
function conectarStripe() {
    return require('stripe')(process.env.STRIPE_SECRET_KEY);
}

module.exports = async function accionTarjeta(req, res) {
    const payload = getAuthPayload(req);
    if (!payload) {
        return res.status(401).json({ error: 'Entrá con tu correo y tu contraseña.' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(503).json({
            error: 'La pasarela de pago todavía no está activada. Escribinos a info@menorcarugbyclub.com.',
        });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const temporada = temporadaKey();

    // Quien es, mire por donde entro: el token de mi-carnet trae socio_id y no
    // tutor_id, y esto respondia 401 a la misma persona con la misma clave.
    const { tutorId } = await identidad(supabase, payload);
    if (!tutorId) {
        return res.status(409).json({
            error: 'No encontramos ninguna inscripción tuya de esta temporada.',
        });
    }

    try {
        const stripe = conectarStripe();

        const { data: inscripciones, error } = await supabase
            .from('inscripciones')
            .select('inscripcion_id, temporada, estado, stripe_customer_id')
            .eq('tutor_id', tutorId);
        if (error) throw new Error(error.message);

        const deEstaTemporada = (inscripciones || []).filter((i) => i.temporada === temporada);
        const vivas = deEstaTemporada.filter((i) => i.estado !== 'baja' && i.estado !== 'rechazada');
        if (!vivas.length) {
            return res.status(409).json({
                error: 'No encontramos ninguna inscripción tuya de esta temporada.',
            });
        }

        // ── El cliente de Stripe es de la FAMILIA, no del año ────────────
        //
        // Sin el filtro por temporada a propósito: el identificador puede estar
        // en una fila de la temporada anterior. Buscándolo sólo en la actual se
        // creaba un cliente nuevo en cada intento y la tarjeta guardada quedaba
        // colgando de un cliente huérfano.
        const { data: tutor } = await supabase
            .from('tutores')
            .select('tutor_id, nombre, apellido, email, telefonos')
            .eq('tutor_id', tutorId)
            .single();

        const conCliente = (inscripciones || []).find((i) => i.stripe_customer_id);
        let customerId = conCliente ? conCliente.stripe_customer_id : null;

        if (customerId) {
            // Que exista de verdad: si alguien lo borró del panel, seguir con
            // él da un error críptico en mitad del pago.
            const existe = await stripe.customers.retrieve(customerId).catch(() => null);
            if (!existe || existe.deleted) customerId = null;
        }

        if (!customerId) {
            const cliente = await stripe.customers.create({
                email: tutor.email,
                name: `${tutor.nombre} ${tutor.apellido || ''}`.trim(),
                phone: (tutor.telefonos || [])[0] || undefined,
                metadata: { tutor_id: tutor.tutor_id },
            });
            customerId = cliente.id;
        }

        const sesion = await stripe.checkout.sessions.create({
            mode: 'setup',
            customer: customerId,
            currency: 'eur',
            locale: 'es',
            // El webhook necesita saber de quién es esta tarjeta para poder
            // dejarla como forma de pago por defecto del cliente.
            metadata: {
                tutor_id: tutor.tutor_id,
                temporada,
                para: 'cuotas',
            },
            setup_intent_data: {
                metadata: { tutor_id: tutor.tutor_id, temporada },
            },
            success_url: `${URL_BASE}/inscripcion?tarjeta=ok`,
            cancel_url: `${URL_BASE}/inscripcion?tarjeta=cancelada`,
        });

        // Se guarda YA, antes de que la familia termine: si abandona a mitad,
        // el próximo intento reutiliza el mismo cliente en vez de crear otro.
        await supabase
            .from('inscripciones')
            .update({ stripe_customer_id: customerId })
            .in('inscripcion_id', vivas.map((i) => i.inscripcion_id));

        return res.status(200).json({ success: true, url: sesion.url });
    } catch (e) {
        console.error('accion-tarjeta:', e && e.message);
        return res.status(500).json({
            error: 'No pudimos abrir la pantalla de la tarjeta. Probá en un rato o escribinos.',
        });
    }
};
