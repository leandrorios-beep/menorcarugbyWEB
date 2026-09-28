/**
 * Leer una factura de Stripe sin importar la versión de API que la trajo.
 *
 * EL PROBLEMA, QUE COSTÓ SIETE SEMANAS DE COBROS SIN ANOTAR
 *
 * En la versión `basil` (2025-04-30 en adelante) Stripe QUITÓ el campo
 * `subscription` de la factura y lo movió a
 * `parent.subscription_details.subscription`.
 *
 * Los objetos que pedimos nosotros con la librería llegan en la versión que
 * ella fija —hoy 2025-02-24.acacia— y ahí `factura.subscription` sigue estando.
 * Pero los objetos que llegan por el WEBHOOK vienen en la versión del destino
 * configurado en el panel, que es basil. O sea que el mismo campo existe cuando
 * lo pedimos y no existe cuando nos lo mandan.
 *
 * Como el código miraba sólo el sitio viejo, TODA factura mensual se descartaba
 * con un `return` silencioso y un 200: ni las cuotas de jugador ni las de socio.
 * Se vio en los datos: el último pago anotado era del 8 de agosto mientras las
 * suscripciones seguían cobrando todos los meses.
 *
 * Por eso esto mira los dos sitios. No hace falta elegir versión ni adivinar
 * cuál es: si algún día desaparece el nuevo, se agrega el siguiente acá y
 * ningún otro archivo se entera.
 */

/** El id de la suscripción que generó esta factura, o null si no viene de una. */
function suscripcionDeLaFactura(factura) {
    if (!factura) return null;

    // Donde estaba hasta acacia.
    if (factura.subscription) {
        return typeof factura.subscription === 'string'
            ? factura.subscription
            : factura.subscription.id;
    }

    // Donde está desde basil.
    const padre = factura.parent;
    const detalle = padre && padre.subscription_details;
    const sub = detalle && detalle.subscription;
    if (sub) return typeof sub === 'string' ? sub : sub.id;

    return null;
}

module.exports = { suscripcionDeLaFactura };
