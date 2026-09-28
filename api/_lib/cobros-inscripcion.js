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

const {
    temporadaKey,
    importeFinal,
    MESES_DE_CUOTA,
    tramoDeFicha,
    varianteDeFicha,
} = require('./inscripcion');

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

    // EL CORTE A LAS NUEVE CUOTAS.
    //
    // Checkout no acepta "cancelá después de N cobros", así que se pone acá,
    // que es el primer momento en que la suscripción existe. Sin esto la
    // familia paga doce meses en vez de nueve y se entera en julio.
    //
    // EL ANCLA ES EL PRIMER COBRO, NO EL FIN DEL PERÍODO EN CURSO
    //
    // Y no son lo mismo, porque a quien se inscribe antes de octubre se le pone
    // un trial hasta el día 5: ahí `current_period_end` es la fecha del PRIMER
    // cobro, mientras que para quien se suma en enero —sin trial— es la del
    // SEGUNDO. Anclar en el sitio equivocado corría el corte un mes, y de un
    // lado sobraba una cuota y del otro faltaba la de junio.
    //
    // Con el primer cobro como ancla, sumarle MESES_DE_CUOTA da el final del
    // noveno período: nueve cobros, del 5 de octubre al 5 de junio.
    const primerCobro = suscripcion.trial_end || suscripcion.current_period_start;
    if (!suscripcion.cancel_at && primerCobro) {
        const fin = new Date(primerCobro * 1000);
        fin.setMonth(fin.getMonth() + MESES_DE_CUOTA);
        try {
            await stripe.subscriptions.update(suscripcion.id, {
                cancel_at: Math.floor(fin.getTime() / 1000),
                metadata: suscripcion.metadata,
            });
        } catch (e) {
            // Que falle el corte no puede tirar el webhook: el cobro ya está
            // hecho. Queda en el log para arreglarlo a mano.
            console.error(`No se pudo poner el corte a las ${MESES_DE_CUOTA} cuotas en ${suscripcion.id}:`, e.message);
        }
    }

    const customerId = typeof sesion.customer === 'string' ? sesion.customer : sesion.customer?.id;

    // A cada inscripción se le guarda SU línea de la suscripción, no sólo la
    // suscripción. Es lo único que permite después dar de baja a un hermano sin
    // cortarle el cobro al otro: sin esto, la única forma de dejar de cobrarle a
    // uno es cancelar la suscripción de toda la familia.
    //
    // Ojo: cuando dos hermanos tienen la MISMA tarifa, Stripe los junta en una
    // sola línea con cantidad 2. Por eso el item puede repetirse y por eso la
    // columna no es única.
    const lineaDe = await repartirLineas(supabase, suscripcion, ids);

    for (const id of ids) {
        const { error } = await supabase
            .from('inscripciones')
            .update({
                stripe_customer_id: customerId,
                stripe_subscription_id: suscripcion.id,
                stripe_subscription_item_id: lineaDe.get(id) || null,
                estado_cobro: 'al_dia',
            })
            .eq('inscripcion_id', id);
        if (error) throw new Error(`inscripciones: ${error.message}`);
    }

    const sinLinea = ids.filter((id) => !lineaDe.get(id)).length;
    console.log(
        `Cuotas domiciliadas: ${ids.length} inscripción(es), suscripción ${suscripcion.id}` +
            (sinLinea ? ` — OJO: ${sinLinea} sin línea identificada` : '')
    );
    return true;
}

/**
 * Qué línea de la suscripción paga a cada inscripción.
 *
 * Se cruza por precio: cada inscripción tiene su tramo y su variante, de ahí
 * sale el stripe_price_id del catálogo, y se busca la línea con ese precio.
 * Dos hermanos con la misma tarifa caen en la misma línea, que es exactamente
 * lo que hizo Stripe al juntarlos con cantidad 2.
 *
 * Si algo no cruza se deja en null y se avisa por log en vez de adivinar:
 * asignar la línea equivocada haría que dar de baja a uno le quite la cuota al
 * otro, que es peor que no poder darlo de baja automáticamente.
 */
async function repartirLineas(supabase, suscripcion, ids) {
    const mapa = new Map();
    const items = (suscripcion.items && suscripcion.items.data) || [];
    if (!items.length) return mapa;

    const { data: inscripciones } = await supabase
        .from('inscripciones')
        .select('inscripcion_id, temporada, tarifa_tramo, tarifa_variante')
        .in('inscripcion_id', ids);

    const { data: precios } = await supabase
        .from('precios')
        .select('concepto, variante, tramo, stripe_price_id')
        .eq('concepto', 'mensualidad');

    for (const i of inscripciones || []) {
        const precio = (precios || []).find(
            (p) => p.variante === i.tarifa_variante && p.tramo === i.tarifa_tramo
        );
        if (!precio || !precio.stripe_price_id) continue;
        const item = items.find((it) => it.price && it.price.id === precio.stripe_price_id);
        if (item) mapa.set(i.inscripcion_id, item.id);
    }
    return mapa;
}

// ---------------------------------------------------------------------------

async function facturaPagada(event, stripe, supabase) {
    const factura = event.data.object;
    if (!factura.subscription) return false;

    const suscripcion = await stripe.subscriptions.retrieve(factura.subscription);
    const ids = inscripcionesDe(suscripcion);
    if (!ids) return false;

    await anotar(supabase, { factura, suscripcion, ids, pagada: true, event });

    // .neq('estado','baja'): sin esto, la factura del mes siguiente le devolvía
    // el estado de cobro a alguien que ya se había dado de baja, y la baja no
    // aguantaba ni un ciclo.
    const { error } = await supabase
        .from('inscripciones')
        .update({ estado_cobro: 'al_dia' })
        .in('inscripcion_id', ids)
        .neq('estado', 'baja');
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

    // .neq('estado','baja'): sin esto, la factura del mes siguiente le devolvía
    // el estado de cobro a alguien que ya se había dado de baja, y la baja no
    // aguantaba ni un ciclo.
    const { error } = await supabase
        .from('inscripciones')
        .update({ estado_cobro: 'impago' })
        .in('inscripcion_id', ids)
        .neq('estado', 'baja');
    if (error) throw new Error(`inscripciones: ${error.message}`);

    console.warn(`Cuota IMPAGA: factura ${factura.id}, ${ids.length} inscripción(es)`);
    return true;
}

async function suscripcionCancelada(event, stripe, supabase) {
    const suscripcion = event.data.object;
    const ids = inscripcionesDe(suscripcion);
    if (!ids) return false;

    // Se BORRAN los identificadores de la suscripción, no sólo se marca el
    // estado. accion-pagar decide quién puede pagar mirando
    // `stripe_subscription_id`: con la columna puesta y la suscripción muerta,
    // la familia recibía "Ya tenés la cuota domiciliada" y no podía volver a
    // pagar nunca, cuando en realidad no se le estaba cobrando nada. Para
    // salir de ahí había que tocarle la fila a mano en la base.
    //
    // Pasa más de lo que parece: alcanza con que alguien cancele desde el panel
    // de Stripe, o con que la primera factura no se cobre —Stripe expira la
    // suscripción a las 23 horas y manda este mismo evento.
    //
    // El `stripe_customer_id` SÍ se conserva: es de la familia, no de la
    // suscripción, y reutilizarlo evita clientes duplicados en Stripe.
    //
    // A quien está de baja en el club no se le toca: ahí la cancelación es el
    // final correcto y no queremos ofrecerle pagar otra vez.
    const { error } = await supabase
        .from('inscripciones')
        .update({
            estado_cobro: 'cancelada',
            stripe_subscription_id: null,
            stripe_subscription_item_id: null,
        })
        .in('inscripcion_id', ids)
        .neq('estado', 'baja');
    if (error) throw new Error(`inscripciones: ${error.message}`);

    console.log(`Suscripción ${suscripcion.id} dada de baja: ${ids.length} inscripción(es)`);
    return true;
}

// ---------------------------------------------------------------------------
// Escribir en el libro de ingresos
// ---------------------------------------------------------------------------

async function anotar(supabase, { factura, suscripcion, ids, pagada, event }) {
    const temporada = temporadaKey();

    const { data: todas, error: errInsc } = await supabase
        .from('inscripciones')
        .select('inscripcion_id, player_id, temporada, estado, tarifa_tramo, tarifa_variante, tarifa_descuentos')
        .in('inscripcion_id', ids);
    if (errInsc) throw new Error(`inscripciones: ${errInsc.message}`);
    if (!todas || !todas.length) {
        console.warn(`Factura ${factura.id} apunta a inscripciones que ya no existen: ${ids.join(',')}`);
        return;
    }

    // A los dados de baja NO se les imputa la cuota, aunque Stripe la haya
    // cobrado. Los ids vienen de la metadata de la SUSCRIPCIÓN, que no se entera
    // de las bajas; sin este filtro, al chico que se fue se le anotaba una cuota
    // nueva cada mes, a su nombre y a su categoría, ensuciando los informes.
    //
    // Lo que se cobró de más aparece solo en la fila de DESCUADRE de abajo, que
    // es justamente donde tiene que verse: que Stripe siga cobrando a alguien de
    // baja es un problema, no algo que haya que cuadrar en silencio.
    const inscripciones = todas.filter((i) => i.estado !== 'baja');
    const deBaja = todas.length - inscripciones.length;
    if (deBaja) {
        console.warn(
            `Factura ${factura.id}: ${deBaja} inscripción(es) de baja siguen en la suscripción ${suscripcion.id}. ` +
                'Hay que quitarles la línea en Stripe.'
        );
    }
    if (!inscripciones.length) return;

    const { data: jugadores } = await supabase
        .from('players')
        // La fecha de nacimiento hace falta para la matrícula: la ficha
        // federativa va por el año de nacimiento, no por la categoría.
        .select('player_id, first_name, last_name, category_primary, dob')
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
            // Los dos ejes otra vez: la cuota va por la categoría y la ficha
            // por el año de nacimiento, y la ficha de la federación no lleva
            // los descuentos del club. Buscándola por `tarifa_tramo` y por la
            // variante de la cuota, a un chico de 17 se le anotaban 235 €
            // donde Stripe le había cobrado 300, y el libro de ingresos
            // arrancaba la temporada descuadrado en 65 € por cabeza.
            const matricula = precio(
                'ficha_anual',
                varianteDeFicha(i.tarifa_variante),
                tramoDeFicha(j.dob, Number(String(i.temporada || temporada).slice(0, 4)))
            );
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
