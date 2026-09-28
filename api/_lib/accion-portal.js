// ---------------------------------------------------------------------------
// El portal de cliente de Stripe: cambiar la tarjeta y ver los recibos.
//
// POR QUÉ NO LO CONSTRUIMOS NOSOTROS
//
// Es una pantalla alojada por Stripe. La familia entra por un enlace que
// generamos acá —ya autenticado, sin contraseña nueva que recordar— y puede
// cambiar la tarjeta, ver el historial de cobros y descargarse las facturas.
//
// Construir eso a mano sería mantener una pantalla de datos de tarjeta, que es
// justo lo que no queremos tocar: mientras el número de tarjeta no pase por
// nuestro servidor, el club no tiene ninguna obligación de custodiarlo.
//
// Además resuelve el caso más común de todos: la tarjeta que caduca o que el
// banco rechaza. Con el portal, la familia lo arregla sola desde el correo que
// le manda Stripe.
//
// HACE FALTA ACTIVARLO UNA VEZ EN EL PANEL
//
// Stripe → Configuración → Facturación → Portal de cliente → guardar la
// configuración. Si no está activado, la API responde que falta configurarlo y
// acá se traduce a algo que la familia entienda.
// ---------------------------------------------------------------------------

const { createClient } = require('@supabase/supabase-js');
const { getAuthPayload, identidad } = require('./auth');

const URL_BASE = 'https://www.menorcarugbyclub.com';

module.exports = async function accionPortal(req, res) {
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

    // Quien es, mire por donde entro: el token de mi-carnet trae socio_id y no
    // tutor_id, y esto respondia 401 a la misma persona con la misma clave.
    const { tutorId } = await identidad(supabase, payload);
    if (!tutorId) {
        return res.status(409).json({
            error: 'Tu cuenta todavía no tiene ninguna inscripción asociada, así que no hay recibos que ver.',
        });
    }

    try {
        // El cliente de Stripe es de la FAMILIA y puede estar en una fila de
        // cualquier temporada: sin filtrar por la actual, que es donde ya nos
        // hemos equivocado antes creando clientes duplicados.
        const { data: inscripciones, error } = await supabase
            .from('inscripciones')
            .select('stripe_customer_id')
            .eq('tutor_id', tutorId)
            .not('stripe_customer_id', 'is', null)
            .limit(1);
        if (error) throw new Error(error.message);

        const customerId = (inscripciones || [])[0] && inscripciones[0].stripe_customer_id;
        if (!customerId) {
            return res.status(409).json({
                error: 'Todavía no dejaste ninguna tarjeta, así que no hay nada que ver acá.',
            });
        }

        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const sesion = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${URL_BASE}/inscripcion`,
            locale: 'es',
        });

        return res.status(200).json({ success: true, url: sesion.url });
    } catch (e) {
        const mensaje = (e && e.message) || '';
        console.error('accion-portal:', mensaje);

        // El error más probable la primera vez, y tiene arreglo en un minuto.
        if (/configuration/i.test(mensaje) || /portal/i.test(mensaje)) {
            return res.status(503).json({
                error:
                    'La zona de gestión de pagos todavía no está activada. Avisanos a ' +
                    'info@menorcarugbyclub.com y lo resolvemos.',
            });
        }
        return res.status(500).json({
            error: 'No pudimos abrir tu zona de pagos. Probá en un rato o escribinos.',
        });
    }
};
