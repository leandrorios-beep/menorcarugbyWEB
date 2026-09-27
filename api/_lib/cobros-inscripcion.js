// ---------------------------------------------------------------------------
// Lo que hace el webhook de Stripe con las cuotas de los jugadores.
//
// Vive aparte del webhook de socios porque son dos mundos distintos: los socios
// se identifican por el correo del cliente de Stripe, y las cuotas por la
// metadata de la suscripción. Mezclarlos en el mismo if terminaría imputando el
// pago de una familia a la ficha de socio de otra persona con el mismo correo.
//
// La regla para saber de quién es un evento: si la suscripción trae
// metadata.inscripciones, es una cuota. Si no, que siga el camino de socios.
//
// CADA COBRO SE ANOTA POR JUGADOR, NO POR FACTURA
//
// Una factura puede llevar a dos hermanos. Los informes del club se leen por
// jugador y por categoría, así que una línea por factura dejaría a la mitad de
// los chicos sin cobros a su nombre. Se crea una fila de `ingresos` por
// inscripción, con el importe que le toca según el catálogo, y si la suma no da
// lo que cobró Stripe se anota la diferencia en una fila aparte marcada para
// revisar: antes que cuadrar a la fuerza, que se vea.
// ---------------------------------------------------------------------------

const { temporadaKey, importeFinal } = require('./inscripcion');

/** Mensualidades por temporada. El club cobra 10, no 12. */
const MESES_DE_CUOTA = 10;

/**
 * ¿Este evento es de una cuota de jugador?
 * Devuelve los ids de inscripción si lo es, o null.
 */
function inscripcionesDe(objeto) {
    const meta = (objeto && objeto.metadata) || {};
    if (!meta.inscripciones) return null;
    const ids = String(meta.inscripciones)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    return ids.length ? ids : null;
}

/**
 * Trata el evento si es de inscripciones. Devuelve true si lo manejó.
 *
 * Quien llama tiene que responder 200 igual: si se devuelve un 500, Stripe
 * reintenta el mismo evento y hay que estar seguro de que el reintento no
 * duplica el cobro. Por eso todo lo que escribe es upsert contra una clave
 * estable.
 */
async function manejar(event, stripe, supabase) {
    switch (event.type) {
        case 'checkout.session.completed':
            return await sesionCompletada(event, stripe, supabase);
        case 'invoice.paid':
            return await facturaPagada(event, stripe, supabase);
        case 'invoice.payment_failed':
            return await facturaFallida(event, stripe, supabase);
        case 'customer.subscription.deleted':
            return await suscripcionCancelada(event, stripe, supabase);
        default:
            return false;
    }
}

// ---------------------------------------------------------------------------

async function sesionCompletada(event, stripe, supabase) {
    const sesion = event.data.object;
    const ids = inscripcionesDe(sesion);
    if (!ids || !sesion.subscription) return false;

    const suscripcion = await stripe.subscriptions.retrieve(sesion.subscription);

    // EL CORTE A LOS 10 MESES.
    //
    // Checkout no acepta "cancelá después de N cobros", así que se pone acá,
    // que es el primer momento en que la suscripción existe. El ancla es
    // current_period_end de la primera factura: sumarle 9 períodos más da
    // exactamente 10 cobros.
    //
    // Sin esto la familia paga 12 meses en vez de 10, y se entera en julio.
    if (!suscripcion.cancel_at && suscripcion.current_period_end) {
        const fin = new Date(suscripcion.current_period_end * 1000);
        fin.setMonth(fin.getMonth() + (MESES_DE_CUOTA - 1));
        try {
            await stripe.subscriptions.update(suscripcion.id, {
                cancel_at: Math.floor(fin.getTime() / 1000),
                metadata: suscripcion.metadata,
            });
        } catch (e) {
            // Que falle el corte no puede tirar el webhook: el cobro ya está
            // hecho. Queda en el log para arreglarlo a mano.
            console.error(`No se pudo poner el corte a los ${MESES_DE_CUOTA} meses en ${suscripcion.id}:`, e.message);
        }
    }

    const { error } = await supabase
        .from('inscripciones')
        .update({
            stripe_customer_id: typeof sesion.customer === 'string' ? sesion.customer : sesion.customer?.id,
            stripe_subscription_id: suscripcion.id,
            estado_cobro: 'al_dia',
        })
        .in('inscripcion_id', ids);
    if (error) throw new Error(`inscripciones: ${error.message}`);

    console.log(`Cuotas domiciliadas: ${ids.length} inscripción(es), suscripción ${suscripcion.id}`);
    return true;
}

// ---------------------------------------------------------------------------

async function facturaPagada(event, stripe, supabase) {
    const factura = event.data.object;
    if (!factura.subscription) return false;

    const suscripcion = await stripe.subscriptions.retrieve(factura.subscription);
    const ids = inscripcionesDe(suscripcion);
    if (!ids) return false;

    await anotar(supabase, { factura, suscripcion, ids, pagada: true, event });

    const { error } = await supabase
        .from('inscripciones')
        .update({ estado_cobro: 'al_dia' })
        .in('inscripcion_id', ids);
    if (error) throw new Error(`inscripciones: ${error.message}`);

    return true;
}

async function facturaFallida(event, stripe, supabase) {
    const factura = event.data.object;
    if (!factura.subscription) return false;

    const suscripcion = await stripe.subscriptions.retrieve(factura.subscription);
    const ids = inscripcionesDe(suscripcion);
    if (!ids) return false;

    await anotar(supabase, { factura, suscripcion, ids, pagada: false, event });

    const { error } = await supabase
        .from('inscripciones')
        .update({ estado_cobro: 'impago' })
        .in('inscripcion_id', ids);
    if (error) throw new Error(`inscripciones: ${error.message}`);

    console.warn(`Cuota IMPAGA: factura ${factura.id}, ${ids.length} inscripción(es)`);
    return true;
}

async function suscripcionCancelada(event, stripe, supabase) {
    const suscripcion = event.data.object;
    const ids = inscripcionesDe(suscripcion);
    if (!ids) return false;

    const { error } = await supabase
        .from('inscripciones')
        .update({ estado_cobro: 'cancelada' })
        .in('inscripcion_id', ids);
    if (error) throw new Error(`inscripciones: ${error.message}`);

    console.log(`Suscripción ${suscripcion.id} dada de baja: ${ids.length} inscripción(es)`);
    return true;
}

// ---------------------------------------------------------------------------
// Escribir en el libro de ingresos
// ---------------------------------------------------------------------------

async function anotar(supabase, { factura, suscripcion, ids, pagada, event }) {
    const temporada = temporadaKey();

    const { data: inscripciones, error: errInsc } = await supabase
        .from('inscripciones')
        .select('inscripcion_id, player_id, temporada, tarifa_tramo, tarifa_variante, tarifa_descuentos')
        .in('inscripcion_id', ids);
    if (errInsc) throw new Error(`inscripciones: ${errInsc.message}`);
    if (!inscripciones || !inscripciones.length) {
        console.warn(`Factura ${factura.id} apunta a inscripciones que ya no existen: ${ids.join(',')}`);
        return;
    }

    const { data: jugadores } = await supabase
        .from('players')
        .select('player_id, first_name, last_name, category_primary')
        .in('player_id', inscripciones.map((i) => i.player_id));
    const jugadorDe = new Map((jugadores || []).map((j) => [j.player_id, j]));

    const { data: preciosRows } = await supabase
        .from('precios')
        .select('concepto, variante, tramo, importe')
        .eq('temporada', inscripciones[0].temporada || temporada)
        .eq('activo', true);
    const precio = (concepto, variante, tramo) => {
        const p = (preciosRows || []).find(
            (x) => x.concepto === concepto && x.variante === variante && x.tramo === tramo
        );
        return p && p.importe !== null ? Number(p.importe) : null;
    };

    const { data: descuentos } = await supabase
        .from('descuentos')
        .select('codigo, nombre, tipo, porcentaje, importe, aplica_a')
        .eq('temporada', inscripciones[0].temporada || temporada)
        .eq('activo', true);

    // ¿Esta factura es la primera? La matrícula sólo va en la primera.
    const esPrimera = factura.billing_reason === 'subscription_create';
    const fecha = new Date((factura.status_transitions?.paid_at || event.created) * 1000);
    const fechaISO = fecha.toISOString().slice(0, 10);
    const mes = fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    const filas = [];
    let suma = 0;

    for (const i of inscripciones) {
        const j = jugadorDe.get(i.player_id) || {};
        const nombre = `${j.first_name || ''} ${j.last_name || ''}`.trim() || i.player_id;

        const base = precio('mensualidad', i.tarifa_variante, i.tarifa_tramo);
        if (base === null) {
            console.warn(`Sin precio de mensualidad para ${nombre} (${i.tarifa_variante}/${i.tarifa_tramo})`);
            continue;
        }
        const conDescuento = importeFinal(base, 'mensualidad', i.tarifa_descuentos || [], descuentos || []);
        suma += conDescuento;

        filas.push(fila({
            factura, suscripcion, inscripcion: i, jugador: j, nombre, pagada,
            tipo: 'Mensualidad',
            concepto: `Cuota ${mes}`,
            importe: conDescuento,
            fecha: fechaISO,
            mes,
            temporada: i.temporada || temporada,
            sufijo: 'mensualidad',
        }));

        if (esPrimera) {
            const matricula = precio('ficha_anual', i.tarifa_variante, i.tarifa_tramo);
            if (matricula !== null) {
                suma += matricula;
                filas.push(fila({
                    factura, suscripcion, inscripcion: i, jugador: j, nombre, pagada,
                    tipo: 'Matrícula',
                    concepto: `Ficha anual ${i.temporada || temporada}`,
                    importe: matricula,
                    fecha: fechaISO,
                    mes,
                    temporada: i.temporada || temporada,
                    sufijo: 'ficha',
                }));
            }
        }
    }

    // Lo que Stripe cobró de verdad, contra lo que dice el catálogo. Si no
    // coinciden, se anota la diferencia en vez de esconderla: un descuadre de
    // 3 € repetido diez meses son 30 € que nadie encuentra en marzo.
    const cobrado = Math.round((factura.amount_paid || factura.amount_due || 0)) / 100;
    const diferencia = Math.round((cobrado - suma) * 100) / 100;
    if (Math.abs(diferencia) >= 0.01) {
        filas.push({
            fecha_cobro: fechaISO,
            mes,
            importe: diferencia,
            cliente: factura.customer_name || factura.customer_email || 'Stripe',
            pagador: factura.customer_email || null,
            concepto: `DESCUADRE de la factura ${factura.id}: Stripe cobró ${cobrado} € y el catálogo dice ${suma} €`,
            estado: pagada ? 'Pagado' : 'Error en el pago',
            temporada,
            tipo_movimiento: 'Mensualidad',
            bucket_concepto: 'REVISAR',
            categoria_reporte: 'REVISAR',
            matched: false,
            origen: 'stripe',
            linea_clave: `${factura.id}:descuadre:ajuste`,
            stripe_customer_id: typeof factura.customer === 'string' ? factura.customer : null,
            stripe_subscription_id: suscripcion.id,
            stripe_invoice_id: factura.id,
            stripe_payment_intent_id: null,
            fecha_vencimiento: factura.due_date ? new Date(factura.due_date * 1000).toISOString().slice(0, 10) : null,
        });
        console.warn(`Descuadre en la factura ${factura.id}: Stripe ${cobrado} € vs catálogo ${suma} €`);
    }

    if (!filas.length) return;

    // Upsert contra linea_clave: si Stripe reintenta el evento —y reintenta el
    // MISMO evento si no le respondes 200 a tiempo— se reescribe la misma fila
    // en vez de meter el cobro dos veces. Ya hay 898 € de duplicados en el
    // historico por algo asi.
    const { error } = await supabase
        .from('ingresos')
        .upsert(filas, { onConflict: 'linea_clave' });
    if (error) throw new Error(`ingresos: ${error.message}`);

    console.log(`Factura ${factura.id}: ${filas.length} línea(s) en ingresos, ${pagada ? 'cobradas' : 'FALLIDAS'}`);
}

function fila({ factura, suscripcion, inscripcion, jugador, nombre, pagada, tipo, concepto, importe, fecha, mes, temporada, sufijo }) {
    return {
        // La identidad de la linea. Es lo unico que impide que un reintento del
        // webhook cobre dos veces. Ver la migracion 20260927180000.
        linea_clave: `${factura.id}:${inscripcion.inscripcion_id}:${sufijo}`,
        fecha_cobro: pagada ? fecha : null,
        mes,
        importe,
        cliente: nombre,
        pagador: factura.customer_email || null,
        concepto,
        estado: pagada ? 'Pagado' : 'Error en el pago',
        temporada,
        tipo_movimiento: tipo,
        bucket_concepto: tipo === 'Matrícula' ? 'MATRICULA' : 'CUOTA',
        categoria_reporte: jugador.category_primary || null,
        categoria_jugador: jugador.category_primary || null,
        matched: true,
        player_id: inscripcion.player_id,
        inscripcion_id: inscripcion.inscripcion_id,
        origen: 'stripe',
        stripe_customer_id: typeof factura.customer === 'string' ? factura.customer : null,
        stripe_subscription_id: suscripcion.id,
        stripe_invoice_id: factura.id,
        stripe_payment_intent_id:
            typeof factura.payment_intent === 'string' ? factura.payment_intent : null,
        fecha_vencimiento: factura.due_date
            ? new Date(factura.due_date * 1000).toISOString().slice(0, 10)
            : null,
    };
}

module.exports = { manejar, MESES_DE_CUOTA };
