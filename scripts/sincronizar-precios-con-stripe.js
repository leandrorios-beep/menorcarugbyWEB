/**
 * Lleva el catálogo de precios de la base a Stripe.
 *
 * El catálogo manda: lo que esté en la tabla `precios` es lo que va a estar en
 * Stripe. Este script crea lo que falte, corrige lo que cambió y guarda los
 * identificadores en precios.stripe_product_id / precios.stripe_price_id.
 *
 * LOS PRECIOS DE STRIPE SON INMUTABLES
 *
 * Eso es lo que hace que esto no sea un simple "actualizar". Un Price de Stripe
 * no se puede editar: si la cuota juvenil pasa de 50 a 55, hay que crear un
 * Price nuevo y archivar el viejo. Archivar y no borrar, porque las
 * suscripciones que ya están cobrando con el precio viejo lo siguen usando y
 * borrarlo las rompería.
 *
 * O sea que subir la cuota NO le cambia el importe a quien ya está pagando: a
 * esos hay que migrarlos a mano o en la renovación siguiente. El script lo dice
 * cuando pasa, en vez de dejar creer que con esto alcanza.
 *
 *   node scripts/sincronizar-precios-con-stripe.js --dry-run
 *   node scripts/sincronizar-precios-con-stripe.js
 *
 * Necesita STRIPE_SECRET_KEY, SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el
 * entorno, o en un .env que se le pase con --env=<ruta>.
 */

const fs = require('fs');

// ── Entorno ────────────────────────────────────────────────────────────────
const argEnv = process.argv.find((a) => a.startsWith('--env='));
if (argEnv) {
    const ruta = argEnv.slice('--env='.length);
    for (const linea of fs.readFileSync(ruta, 'utf8').split(/\r?\n/)) {
        if (!linea.includes('=') || linea.startsWith('#')) continue;
        const i = linea.indexOf('=');
        const k = linea.slice(0, i).trim();
        const v = linea.slice(i + 1).trim();
        if (!process.env[k]) process.env[k] = v;
    }
    // La app llama SUPABASE_URL de otra manera.
    if (!process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    }
}

const DRY = process.argv.includes('--dry-run');
const BR = String.fromCharCode(10);
const MESES = 9; // meses_de_cuota() en la base: del 5 de octubre al 5 de junio

const faltan = ['STRIPE_SECRET_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter(
    (k) => !process.env[k]
);
if (faltan.length) {
    console.error(`Faltan variables de entorno: ${faltan.join(', ')}`);
    console.error('Pasá un archivo con --env=<ruta> o exportalas antes de correr.');
    process.exit(1);
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

// ── Temporada ──────────────────────────────────────────────────────────────
function temporadaKey(fecha = new Date()) {
    const y = fecha.getMonth() < 6 ? fecha.getFullYear() - 1 : fecha.getFullYear();
    return `${y}/${y + 1}`;
}
const TEMPORADA = process.argv.find((a) => a.startsWith('--temporada='))
    ? process.argv.find((a) => a.startsWith('--temporada=')).split('=')[1]
    : temporadaKey();

// ── Cómo se cobra cada concepto ────────────────────────────────────────────
//
// La mensualidad es una suscripción; la matrícula y las cuotas de socio son un
// pago único al año. El gimnasio es mensual y el socio protector, trimestral.
// Esto es lo que decide si el Price de Stripe es recurrente o no, y Stripe no
// deja cambiarlo después: un Price nace de un tipo o del otro.
const RECURRENCIA = {
    mensualidad: { interval: 'month', interval_count: 1 },
    ficha_anual: null, // pago único
    socio: null,
    socio_familiar: null,
    socio_jugador: null,
    socio_protector: { interval: 'month', interval_count: 3 },
    gimnasio: { interval: 'month', interval_count: 1 },
};

const NOMBRES = {
    mensualidad: 'Cuota mensual',
    ficha_anual: 'Ficha anual',
    socio: 'Socio',
    socio_familiar: 'Socio familiar',
    socio_protector: 'Socio protector',
    socio_jugador: 'Socio jugador',
    gimnasio: 'Gimnasio',
};
const TRAMOS = {
    juvenil: 'Juvenil',
    senior: 'Senior',
    veterano: 'Veteranos',
    femenino: 'Femenino',
    unico: '',
};
const VARIANTES = {
    base: '',
    con_hermano: 'con hermano',
    con_beca: 'con beca',
    familiar_directivo: 'hijo/a de directivo',
    directivo: 'directivo',
    colaborador: 'colaborador',
    familiar_colaborador: 'hijo/a de colaborador',
};

/**
 * Que no falte ningún nombre.
 *
 * El nombre es lo ÚNICO que se ve en el panel de Stripe. Una variante sin
 * traducir no rompe nada —los ids se guardan igual— pero deja cuatro productos
 * llamados "Ficha anual · Juvenil" a 235 € que nadie puede distinguir nunca más,
 * en la cuenta de verdad y sin forma cómoda de borrarlos.
 *
 * Pasó: cuando la comisión agregó "colaborador" y "familiar_colaborador" al
 * catálogo, este mapa se quedó viejo y el ensayo los mostró en blanco.
 */
function comprobarNombres(precios) {
    const faltan = new Set();
    for (const p of precios) {
        if (!(p.variante in VARIANTES)) faltan.add(`variante "${p.variante}"`);
        if (!(p.tramo in TRAMOS)) faltan.add(`tramo "${p.tramo}"`);
        if (!(p.concepto in NOMBRES)) faltan.add(`concepto "${p.concepto}"`);
    }
    return [...faltan];
}

function nombreVisible(p) {
    const partes = [NOMBRES[p.concepto] || p.concepto, TRAMOS[p.tramo], VARIANTES[p.variante]];
    return partes.filter(Boolean).join(' · ');
}

/** Céntimos. SIEMPRE con Math.round: numeric vuelve como number de JS. */
function centimos(importe) {
    return Math.round(Number(importe) * 100);
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
    console.log(DRY ? '=== SIMULACIÓN (--dry-run): no se toca Stripe ===\n' : '=== SINCRONIZANDO ===\n');

    const cuenta = await stripe.accounts.retrieve().catch(() => null);
    console.log(`Cuenta de Stripe: ${cuenta ? `${cuenta.id} (${cuenta.business_profile?.name || cuenta.email || 'sin nombre'})` : 'no se pudo leer'}`);
    console.log(`Modo: ${String(process.env.STRIPE_SECRET_KEY).startsWith('sk_live') ? 'PRODUCCIÓN — se cobra de verdad' : 'prueba'}`);
    console.log(`Temporada: ${TEMPORADA}\n`);

    // ── Sólo las cuotas de jugador ───────────────────────────────────────
    //
    // Los SOCIOS no se cobran por acá: se cobran con un Payment Link que se hizo
    // a mano en el panel de Stripe, y el formulario de socios lo recibe en
    // `stripe_link`. Publicar además estos precios dejaría en la cuenta REAL
    // cinco productos duplicados —Socio, Socio familiar, Socio jugador, Socio
    // protector, Gimnasio— que nadie usa y que el día de mañana hacen dudar a
    // quien mire las cuentas sobre cuál es el bueno.
    //
    // Con --todo se publican igual, para el día en que los socios también pasen
    // por el catálogo.
    const soloJugador = !process.argv.includes('--todo');

    let consulta = db
        .from('precios')
        .select('*')
        .eq('temporada', TEMPORADA)
        .eq('activo', true);
    if (soloJugador) consulta = consulta.eq('ambito', 'jugador');

    const { data: precios, error } = await consulta
        .order('concepto')
        .order('tramo')
        .order('variante');
    if (error) throw new Error(`No se pudo leer el catálogo: ${error.message}`);
    if (soloJugador) console.log('Sólo cuotas de jugador. Con --todo se incluyen socios y gimnasio.' + BR);

    const sinNombre = comprobarNombres(precios);
    if (sinNombre.length) {
        console.error('El catálogo tiene cosas que este script no sabe nombrar:');
        sinNombre.forEach((x) => console.error(`   ${x}`));
        console.error(BR + 'Sin nombre quedarían productos indistinguibles en Stripe. Agregalos a');
        console.error('NOMBRES / TRAMOS / VARIANTES y volvé a correr.');
        process.exit(1);
    }

    const conImporte = precios.filter((p) => p.importe !== null);
    const sinImporte = precios.filter((p) => p.importe === null);

    console.log(`${precios.length} precios activos: ${conImporte.length} con importe, ${sinImporte.length} sin definir.`);
    if (sinImporte.length) {
        console.log('\nSIN IMPORTE — no se crean en Stripe hasta que alguien los decida:');
        sinImporte.forEach((p) => console.log(`   ${nombreVisible(p)}`));
    }
    console.log();

    // ── Modo lista: el cuadro, para validarlo con la comisión ───────────
    //
    // Antes de crear nada en la cuenta REAL conviene que alguien que no sea
    // quien escribió esto mire la lista y diga "sí, eso es lo que acordamos".
    // Imprime lo mismo que se va a publicar, con el nombre exacto que va a
    // quedar en Stripe y cómo se cobra cada cosa.
    if (process.argv.includes('--lista')) {
        const ancho = Math.max(...conImporte.map((x) => nombreVisible(x).length));
        console.log('NOMBRE EN STRIPE'.padEnd(ancho + 24) + 'IMPORTE'.padStart(10) + '   CÓMO SE COBRA');
        console.log('-'.repeat(ancho + 24 + 10 + 25));
        let anterior = null;
        for (const p of conImporte) {
            if (anterior && p.concepto !== anterior) console.log();
            anterior = p.concepto;
            const r = RECURRENCIA[p.concepto];
            const como = r
                ? r.interval_count === 1
                    ? `cada mes, ${MESES} veces (5 oct a 5 jun)`
                    : `cada ${r.interval_count} ${r.interval}es`
                : 'una sola vez, en el primer recibo';
            console.log(
                `Menorca Rugby Club — ${nombreVisible(p)}`.padEnd(ancho + 24) +
                    `${Number(p.importe).toFixed(2)} €`.padStart(10) +
                    '   ' + como
            );
        }
        console.log();
        const mens = conImporte.filter((x) => x.concepto === 'mensualidad');
        const fich = conImporte.filter((x) => x.concepto === 'ficha_anual');
        console.log(`${conImporte.length} en total: ${mens.length} cuotas mensuales y ${fich.length} fichas anuales.`);
        console.log('Con --dry-run se ve qué haría en Stripe; sin nada, lo hace.');
        return;
    }

    const resumen = { creados: 0, actualizados: 0, sinCambios: 0, errores: 0 };
    const migrar = [];

    for (const p of conImporte) {
        const etiqueta = nombreVisible(p).padEnd(42);
        const importe = `${Number(p.importe).toFixed(2)} €`.padStart(9);
        const recurrencia = RECURRENCIA[p.concepto];
        if (recurrencia === undefined) {
            console.log(`${etiqueta} ${importe}  SIN REGLA de recurrencia para "${p.concepto}". Se salta.`);
            resumen.errores++;
            continue;
        }

        try {
            // ── El producto ──────────────────────────────────────────────
            let productId = p.stripe_product_id || null;
            if (productId) {
                const existe = await stripe.products.retrieve(productId).catch(() => null);
                // `active` además de `deleted`: un producto archivado se
                // recupera sin error y sin la marca de borrado, pero un precio
                // colgado de él no sirve en Checkout.
                if (!existe || existe.deleted || existe.active === false) productId = null;
            }
            if (!productId) {
                if (DRY) {
                    console.log(`${etiqueta} ${importe}  crearía producto + precio`);
                    resumen.creados++;
                    continue;
                }
                const prod = await stripe.products.create({
                    name: `Menorca Rugby Club — ${nombreVisible(p)}`,
                    description: `Temporada ${p.temporada}`,
                    metadata: {
                        precio_id: p.precio_id,
                        temporada: p.temporada,
                        concepto: p.concepto,
                        variante: p.variante,
                        tramo: p.tramo,
                    },
                });
                productId = prod.id;
            }

            // ── El precio ────────────────────────────────────────────────
            let priceId = p.stripe_price_id || null;
            let precioActual = null;
            if (priceId) {
                precioActual = await stripe.prices.retrieve(priceId).catch(() => null);
                // Si está archivado se tira el dato ENTERO, no sólo el id.
                //
                // Antes se ponía `priceId = null` pero `precioActual` seguía
                // apuntando al precio archivado, y la comparación de más abajo
                // mira importe, moneda y recurrencia — no si está activo. Con
                // el importe igual, el script imprimía «ya estaba bien», no
                // creaba nada, y dejaba en la tabla un precio que Stripe
                // rechaza en el checkout. El cobro roto y el script en verde.
                if (!precioActual || !precioActual.active) {
                    priceId = null;
                    precioActual = null;
                }
            }

            const quiere = centimos(p.importe);
            const coincide =
                precioActual &&
                precioActual.unit_amount === quiere &&
                precioActual.currency === 'eur' &&
                Boolean(precioActual.recurring) === Boolean(recurrencia) &&
                (!recurrencia ||
                    (precioActual.recurring.interval === recurrencia.interval &&
                        precioActual.recurring.interval_count === recurrencia.interval_count));

            if (coincide) {
                console.log(`${etiqueta} ${importe}  ya estaba bien`);
                resumen.sinCambios++;
                continue;
            }

            if (DRY) {
                console.log(
                    `${etiqueta} ${importe}  ${precioActual ? `cambiaría de ${(precioActual.unit_amount / 100).toFixed(2)} €` : 'crearía el precio'}`
                );
                precioActual ? resumen.actualizados++ : resumen.creados++;
                continue;
            }

            const nuevo = await stripe.prices.create({
                product: productId,
                currency: 'eur',
                unit_amount: quiere,
                ...(recurrencia ? { recurring: recurrencia } : {}),
                metadata: { precio_id: p.precio_id, temporada: p.temporada },
            });

            // Archivar el viejo DESPUÉS de crear el nuevo: si falla la creación,
            // el club se queda con el precio anterior y no sin ninguno.
            if (precioActual && precioActual.id !== nuevo.id) {
                await stripe.prices.update(precioActual.id, { active: false });

                // Y avisar de lo que este script NO puede hacer.
                const suscripciones = await stripe.subscriptions
                    .list({ price: precioActual.id, status: 'active', limit: 100 })
                    .catch(() => ({ data: [] }));
                if (suscripciones.data.length) {
                    migrar.push({
                        que: nombreVisible(p),
                        de: (precioActual.unit_amount / 100).toFixed(2),
                        a: Number(p.importe).toFixed(2),
                        cuantas: suscripciones.data.length,
                    });
                }
            }

            const { error: errGuardar } = await db
                .from('precios')
                .update({ stripe_product_id: productId, stripe_price_id: nuevo.id })
                .eq('precio_id', p.precio_id);
            if (errGuardar) throw new Error(`no se pudo guardar el id: ${errGuardar.message}`);

            console.log(`${etiqueta} ${importe}  ${precioActual ? 'actualizado' : 'creado'}  ${nuevo.id}`);
            precioActual ? resumen.actualizados++ : resumen.creados++;
        } catch (e) {
            console.log(`${etiqueta} ${importe}  ERROR: ${e.message}`);
            resumen.errores++;
        }
    }

    console.log(
        `\n${resumen.creados} creados · ${resumen.actualizados} actualizados · ${resumen.sinCambios} sin cambios` +
            (resumen.errores ? ` · ${resumen.errores} con error` : '')
    );

    if (migrar.length) {
        console.log('\nOJO — hay suscripciones vivas con el precio viejo.');
        console.log('Stripe no las cambia solas: las siguientes siguen cobrando lo de antes');
        console.log('hasta que alguien las migre o hasta la renovación.');
        migrar.forEach((m) =>
            console.log(`   ${m.cuantas} suscripción(es) de "${m.que}": siguen en ${m.de} €, el catálogo dice ${m.a} €`)
        );
    }

    if (DRY) console.log('\n=== SIMULACIÓN: no se tocó nada. Quitá --dry-run para aplicar. ===');
}

main().catch((e) => {
    console.error('ERROR:', e && e.message);
    process.exit(1);
});
