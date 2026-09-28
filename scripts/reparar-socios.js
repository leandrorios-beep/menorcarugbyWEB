/**
 * Poner al día las fechas de pago de los socios, leyéndolas de Stripe.
 *
 * POR QUÉ HIZO FALTA
 *
 * El webhook llevaba semanas descartando en silencio todas las facturas
 * mensuales: buscaba la suscripción en `factura.subscription`, y en la versión
 * de API que entrega Stripe ese campo ya no existe —se movió a
 * `parent.subscription_details.subscription`—. Respondía 200 y no hacía nada.
 *
 * El webhook ya está arreglado, pero lo que se cobró mientras tanto está en
 * Stripe y no en la base: el club no sabe quién está al día. Esto lo repara
 * mirando las suscripciones vivas y copiando sus fechas.
 *
 * Stripe es la fuente de verdad: si dice que una suscripción está activa y con
 * qué período, eso es lo que pasó. Acá no se inventa nada.
 *
 *   node scripts/reparar-socios.js --env=<ruta>              (sólo mira)
 *   node scripts/reparar-socios.js --env=<ruta> --aplicar    (escribe)
 */

const fs = require('fs');

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

const APLICAR = process.argv.includes('--aplicar');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

const normalizar = (e) => (e || '').trim().toLowerCase();
const dia = (unix) => (unix ? new Date(unix * 1000).toISOString().slice(0, 10) : null);

async function todas(fn, params) {
    const out = [];
    let desde = null;
    for (let i = 0; i < 100; i += 1) {
        const p = Object.assign({ limit: 100 }, params || {});
        if (desde) p.starting_after = desde;
        const lote = await fn(p);
        out.push(...lote.data);
        if (!lote.has_more || !lote.data.length) break;
        desde = lote.data[lote.data.length - 1].id;
    }
    return out;
}

async function main() {
    console.log(APLICAR ? '=== APLICANDO ===\n' : '=== SÓLO MIRANDO (agregá --aplicar para escribir) ===\n');

    const [subs, clientes] = await Promise.all([
        todas((p) => stripe.subscriptions.list(p), { status: 'active' }),
        todas((p) => stripe.customers.list(p)),
    ]);
    const correoDe = new Map();
    for (const c of clientes) if (c.email) correoDe.set(c.id, normalizar(c.email));

    const { data: socios, error } = await db
        .from('socios')
        .select('id, nombre, apellido, email, estado_pago, fecha_pago, fecha_proximo_pago');
    if (error) throw new Error(error.message);

    // Un correo puede tener varias fichas de socio (familias). Se indexa por
    // correo en minúsculas porque en la base están escritos como cada uno los
    // tecleó, con mayúsculas de todo tipo.
    const porCorreo = new Map();
    for (const s of socios || []) {
        const k = normalizar(s.email);
        if (!k) continue;
        porCorreo.set(k, [...(porCorreo.get(k) || []), s]);
    }

    const cambios = [];
    const sinFicha = [];
    const conflictos = [];

    for (const sub of subs) {
        const correo = correoDe.get(typeof sub.customer === 'string' ? sub.customer : sub.customer?.id);
        if (!correo) continue;
        const fichas = porCorreo.get(correo);
        if (!fichas) {
            sinFicha.push(correo);
            continue;
        }

        // Las fechas del período en curso: cuándo se cobró y cuándo toca otra vez.
        const pago = dia(sub.current_period_start);
        const proximo = dia(sub.current_period_end);

        for (const s of fichas) {
            const distinto =
                s.estado_pago !== 'completado' ||
                (s.fecha_pago || '').slice(0, 10) !== pago ||
                (s.fecha_proximo_pago || '').slice(0, 10) !== proximo;
            if (!distinto) continue;

            // A quien figura CANCELADO en la base no se le tocan los datos.
            //
            // Que la base diga "cancelado" y Stripe siga cobrando no es un
            // desfase de fechas: o el socio se dio de baja y nadie canceló la
            // suscripción —y se le está sacando dinero sin derecho—, o la baja
            // en la base fue un error. Ponerle "completado" taparía el
            // problema, que es justo el que hay que mirar.
            if (s.estado_pago === 'cancelado') {
                conflictos.push({
                    quien: `${s.nombre} ${s.apellido || ''}`.trim(),
                    correo,
                    detalle: `figura CANCELADO en la base pero su suscripción ${sub.id} sigue activa en Stripe, con cobro hasta ${proximo}`,
                });
                continue;
            }
            cambios.push({
                id: s.id,
                quien: `${s.nombre} ${s.apellido || ''}`.trim(),
                correo,
                de: `${s.estado_pago} · pagó ${(s.fecha_pago || '—').slice(0, 10)} · próximo ${(s.fecha_proximo_pago || '—').slice(0, 10)}`,
                a: `completado · pagó ${pago} · próximo ${proximo}`,
                datos: { estado_pago: 'completado', fecha_pago: pago, fecha_proximo_pago: proximo },
            });
        }
    }

    console.log(`${subs.length} suscripciones activas en Stripe · ${socios.length} fichas de socio en la base\n`);

    if (!cambios.length) {
        console.log('Nada que poner al día: la base ya dice lo mismo que Stripe.');
    } else {
        console.log(`${cambios.length} ficha(s) desfasada(s):\n`);
        for (const c of cambios) {
            console.log(`  ${c.quien.padEnd(28)} ${c.correo}`);
            console.log(`      antes:  ${c.de}`);
            console.log(`      ahora:  ${c.a}`);
        }
        console.log();
    }

    if (conflictos.length) {
        console.log(`${conflictos.length} caso(s) que NO se tocan, porque no son un desfase:
`);
        for (const c of conflictos) {
            console.log(`  ${c.quien.padEnd(28)} ${c.correo}`);
            console.log(`      ${c.detalle}`);
        }
        console.log();
    }

    if (sinFicha.length) {
        console.log(`OJO: ${sinFicha.length} suscripción(es) de Stripe sin ficha de socio con ese correo:`);
        [...new Set(sinFicha)].forEach((e) => console.log(`   ${e}`));
        console.log('   Se les está cobrando y el club no tiene a quién imputarlo.\n');
    }

    if (!APLICAR) {
        console.log('No se escribió nada. Con --aplicar se guardan los cambios.');
        return;
    }

    let hechos = 0;
    for (const c of cambios) {
        const { error: err } = await db.from('socios').update(c.datos).eq('id', c.id);
        if (err) console.error(`  falló ${c.quien}: ${err.message}`);
        else hechos += 1;
    }
    console.log(`${hechos} de ${cambios.length} fichas puestas al día.`);
}

main().catch((e) => {
    console.error('ERROR:', e && e.message);
    process.exit(1);
});
