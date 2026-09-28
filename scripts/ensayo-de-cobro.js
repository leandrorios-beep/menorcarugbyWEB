/**
 * Ensayo del cobro, contra el SANDBOX de Stripe. No mueve dinero de verdad.
 *
 * QUÉ ENSAYA
 *
 * El flujo nuevo: la familia deja la tarjeta al inscribirse y el club, al
 * aprobar, crea la suscripción. Acá se hace esa segunda parte con una tarjeta
 * de prueba y se mira lo único que importa: qué factura sale, de cuánto, con
 * qué líneas y en qué fecha.
 *
 * POR QUÉ HACE FALTA ENSAYARLO
 *
 * Todo esto ya fue mal una vez de cada forma posible: la matrícula mandada con
 * un parámetro que Checkout no acepta, dos hermanos con el mismo precio en dos
 * líneas que Stripe rechaza, la primera cuota saliendo el día del pago en vez
 * del 5 de octubre. Son cosas que sólo se ven cuando Stripe contesta de verdad.
 *
 * Y hay una que todavía no sabemos: con un período de espera hasta el 5 de
 * octubre, ¿la ficha federativa se cobra HOY o espera al día 5? De eso depende
 * lo que le prometemos a la familia por escrito, así que se mide en vez de
 * suponerlo.
 *
 *   node scripts/ensayo-de-cobro.js --env=<ruta al entorno del sandbox>
 *
 * Limpia todo lo que crea al terminar.
 */

const fs = require('fs');

// ── Entorno ────────────────────────────────────────────────────────────────
const argEnv = process.argv.find((a) => a.startsWith('--env='));
if (argEnv) {
    for (const linea of fs.readFileSync(argEnv.slice('--env='.length), 'utf8').split(/\r?\n/)) {
        if (!linea.includes('=') || linea.startsWith('#')) continue;
        const i = linea.indexOf('=');
        const k = linea.slice(0, i).trim();
        if (!process.env[k]) process.env[k] = linea.slice(i + 1).trim();
    }
    if (!process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    }
}

const CLAVE = process.env.STRIPE_SECRET_KEY || '';
if (!CLAVE.startsWith('sk_test')) {
    console.error('ALTO. Este ensayo SÓLO corre contra el sandbox.');
    console.error('La clave que hay en el entorno no empieza por sk_test.');
    console.error('Con la clave de producción esto crearía clientes y cobros de verdad.');
    process.exit(1);
}

const stripe = require('stripe')(CLAVE);
const { createClient } = require('@supabase/supabase-js');
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

const TEMPORADA = '2026/2027';
const MESES = 9;

function euros(centimos) {
    return (centimos / 100).toFixed(2) + ' €';
}
function fecha(unix) {
    if (!unix) return '—';
    return new Date(unix * 1000).toISOString().slice(0, 16).replace('T', ' ');
}

/** El 5 de octubre de la temporada, si falta más de dos días. */
function primerCobro(year) {
    const cinco = Math.floor(Date.UTC(year, 9, 5, 9, 0, 0) / 1000);
    const ahora = Math.floor(Date.now() / 1000);
    return cinco - ahora > 48 * 3600 ? cinco : null;
}

async function precio(concepto, variante, tramo) {
    const { data, error } = await db
        .from('precios')
        .select('importe, stripe_price_id_test')
        .eq('temporada', TEMPORADA)
        .eq('concepto', concepto)
        .eq('variante', variante)
        .eq('tramo', tramo)
        .eq('activo', true)
        .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data || !data.stripe_price_id_test) {
        throw new Error(`Falta en el sandbox: ${concepto}|${variante}|${tramo}`);
    }
    return { importe: Number(data.importe), price: data.stripe_price_id_test };
}

/** Agrupa por precio, como tiene que ir a Stripe. */
function agrupar(items) {
    const cuenta = new Map();
    for (const x of items) cuenta.set(x.price, (cuenta.get(x.price) || 0) + 1);
    return [...cuenta].map(([price, quantity]) => ({ price, quantity }));
}

async function main() {
    const cuenta = await stripe.accounts.retrieve();
    console.log(`Sandbox de ${cuenta.id}. Nada de esto es dinero de verdad.\n`);

    // ── La familia del ensayo ────────────────────────────────────────────
    // Dos hermanos juveniles, que es el caso que más veces se rompió: los dos
    // con 'con_hermano', o sea el MISMO precio, que Stripe no admite repetido.
    const cuotaJuvenilHermano = await precio('mensualidad', 'con_hermano', 'juvenil');
    const fichaJuvenil = await precio('ficha_anual', 'base', 'juvenil');
    const fichaSenior = await precio('ficha_anual', 'base', 'senior');

    console.log('La familia: dos hermanos juveniles con descuento de hermano.');
    console.log(`  cuota de cada uno   ${euros(cuotaJuvenilHermano.importe * 100)}`);
    console.log(`  ficha del pequeño   ${euros(fichaJuvenil.importe * 100)}  (16 o menos)`);
    console.log(`  ficha del de 17     ${euros(fichaSenior.importe * 100)}  (la federación no hace descuento por hermano)`);
    const esperadoMes = cuotaJuvenilHermano.importe * 2;
    const esperadoFichas = fichaJuvenil.importe + fichaSenior.importe;
    console.log(`  => al mes ${euros(esperadoMes * 100)} · fichas ${euros(esperadoFichas * 100)} · temporada ${euros((esperadoMes * MESES + esperadoFichas) * 100)}\n`);

    // ── La tarjeta ───────────────────────────────────────────────────────
    const cliente = await stripe.customers.create({
        email: 'ensayo@menorcarugbyclub.test',
        name: 'Familia Del Ensayo',
        metadata: { ensayo: 'si' },
    });
    const metodo = await stripe.paymentMethods.attach('pm_card_visa', { customer: cliente.id });
    await stripe.customers.update(cliente.id, {
        invoice_settings: { default_payment_method: metodo.id },
    });
    console.log(`Tarjeta de prueba guardada en el cliente ${cliente.id}.\n`);

    let suscripcion;
    try {
        // ── Lo que hará el botón "Aprobar" ───────────────────────────────
        const lineas = agrupar([
            { price: cuotaJuvenilHermano.price },
            { price: cuotaJuvenilHermano.price },
        ]);
        const fichas = agrupar([{ price: fichaJuvenil.price }, { price: fichaSenior.price }]);
        const espera = primerCobro(2026);

        console.log('Creando la suscripción:');
        console.log(`  líneas de cuota: ${lineas.length} (una por precio distinto)`);
        lineas.forEach((l) => console.log(`     ${l.price}  x${l.quantity}`));
        console.log(`  matrículas: ${fichas.length}`);
        console.log(`  primera cuota el ${fecha(espera)}\n`);

        suscripcion = await stripe.subscriptions.create({
            customer: cliente.id,
            items: lineas,
            // En la API de suscripciones add_invoice_items SÍ existe. Es en
            // Checkout donde no, que fue el error que tiró la sesión entera.
            add_invoice_items: fichas,
            ...(espera ? { trial_end: espera } : {}),
            default_payment_method: metodo.id,
            metadata: { ensayo: 'si', temporada: TEMPORADA },
            expand: ['latest_invoice'],
        });

        console.log(`Suscripción ${suscripcion.id} — estado: ${suscripcion.status}`);
        console.log(`  trial_end            ${fecha(suscripcion.trial_end)}`);
        console.log(`  current_period_start ${fecha(suscripcion.current_period_start)}`);
        console.log(`  current_period_end   ${fecha(suscripcion.current_period_end)}\n`);

        // ── LA PREGUNTA: ¿qué se cobra HOY? ──────────────────────────────
        const primera = suscripcion.latest_invoice;
        if (!primera) {
            console.log('NO hay factura todavía. Con período de espera, Stripe no emite nada hasta el día 5.');
        } else {
            console.log(`Primera factura ${primera.id}`);
            console.log(`  estado        ${primera.status}`);
            console.log(`  total         ${euros(primera.total)}`);
            console.log(`  se cobra el   ${fecha(primera.next_payment_attempt || primera.created)}`);
            console.log('  líneas:');
            for (const l of primera.lines.data) {
                console.log(`     ${String(l.description || '').slice(0, 52).padEnd(54)} ${euros(l.amount)}`);
            }
            console.log();
        }

        // ── Lo que viene después ─────────────────────────────────────────
        const siguiente = await stripe.invoices
            .createPreview({ subscription: suscripcion.id })
            .catch(() => null);
        if (siguiente) {
            console.log(`La siguiente factura sería de ${euros(siguiente.total)} el ${fecha(siguiente.period_end)}`);
            for (const l of siguiente.lines.data) {
                console.log(`     ${String(l.description || '').slice(0, 52).padEnd(54)} ${euros(l.amount)}`);
            }
            console.log();
        }

        // ── El corte a las nueve cuotas ──────────────────────────────────
        const ancla = suscripcion.trial_end || suscripcion.current_period_start;
        const fin = new Date(ancla * 1000);
        fin.setMonth(fin.getMonth() + MESES);
        const actualizada = await stripe.subscriptions.update(suscripcion.id, {
            cancel_at: Math.floor(fin.getTime() / 1000),
        });
        console.log(`Corte puesto: la suscripción termina el ${fecha(actualizada.cancel_at)}`);
        const cobros = [];
        const d = new Date(ancla * 1000);
        for (let i = 0; i < MESES; i += 1) {
            cobros.push(d.toISOString().slice(0, 10));
            d.setMonth(d.getMonth() + 1);
        }
        console.log(`Serían ${cobros.length} cobros: ${cobros[0]} … ${cobros[cobros.length - 1]}`);
    } finally {
        // ── Limpieza ─────────────────────────────────────────────────────
        console.log('\nLimpiando el ensayo…');
        if (suscripcion) await stripe.subscriptions.cancel(suscripcion.id).catch(() => {});
        await stripe.customers.del(cliente.id).catch(() => {});
        console.log('listo: cliente y suscripción de ensayo borrados.');
    }
}

main().catch((e) => {
    console.error('\nEL ENSAYO FALLÓ:', e && e.message);
    process.exit(1);
});
