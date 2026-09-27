const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { findSociosByEmail } = require('./_lib/auth');

// Dos operaciones en un mismo endpoint porque el plan Hobby de Vercel solo
// admite 12 funciones serverless y api/ ya estaba al limite:
//   GET  -> importes y suscripciones por email, para las columnas del panel
//   POST -> sincroniza fechas de pago de Stripe hacia socios (comportamiento
//           original, sin cambios)

// ── Cache en memoria del contenedor (solo para el GET) ──
let cache = null; // { at: <ms>, payload: {...} }
const CACHE_MS = 5 * 60 * 1000;

// Paginacion generica de listas de Stripe (limit 100, tope de seguridad).
async function listAll(fn, params) {
    const out = [];
    let startingAfter = null;
    for (let page = 0; page < 100; page++) {
        const p = Object.assign({ limit: 100 }, params || {});
        if (startingAfter) p.starting_after = startingAfter;
        const batch = await fn(p);
        out.push(...batch.data);
        if (!batch.has_more || batch.data.length === 0) break;
        startingAfter = batch.data[batch.data.length - 1].id;
    }
    return out;
}

// Normaliza el nombre de un producto/precio de Stripe a una "clave de concepto"
// comparable con la ficha del socio. Devuelve null si no se reconoce.
function conceptoKey(nombre) {
    const n = (nombre || '').toLowerCase();
    if (/gym|gimnas|gimnàs|fitness/.test(n)) return 'gym';
    if (/protector/.test(n)) return 'protector';
    if (/familiar/.test(n)) return 'familiar';
    if (/socio|soci\b|cuota|abonad/.test(n)) return 'socio';
    return null;
}

const normEmail = e => (e || '').trim().toLowerCase();

// ── GET: agrega cobros y suscripciones de Stripe por email ──
async function getPagos(force) {
    if (!force && cache && Date.now() - cache.at < CACHE_MS) {
        return Object.assign({}, cache.payload, { cached: true });
    }

    const [customers, products, charges, subs] = await Promise.all([
        listAll(p => stripe.customers.list(p)),
        listAll(p => stripe.products.list(p)),
        listAll(p => stripe.charges.list(p)),
        listAll(p => stripe.subscriptions.list(p), { status: 'all' }),
    ]);

    const emailByCustomer = {};
    customers.forEach(c => { if (c.email) emailByCustomer[c.id] = normEmail(c.email); });

    const nameByProduct = {};
    products.forEach(p => { nameByProduct[p.id] = p.name; });

    const pagos = {};
    const bucket = email => {
        if (!pagos[email]) {
            pagos[email] = {
                total: 0, n: 0,
                ultima: null, ultima_fecha: null, ultima_desc: null,
                subs: [], keys: []
            };
        }
        return pagos[email];
    };

    // 1) Cobros: total cobrado + ultima cuota.
    // Importes en euros. El club opera solo en EUR; si algun dia hubiera
    // multi-divisa habria que agrupar por charge.currency.
    const ultimoTs = {};
    for (const ch of charges) {
        if (ch.status !== 'succeeded' || !ch.paid) continue;
        const neto = (ch.amount_captured != null ? ch.amount_captured : ch.amount) - (ch.amount_refunded || 0);
        if (neto <= 0) continue;

        const email = emailByCustomer[ch.customer]
            || normEmail(ch.billing_details && ch.billing_details.email)
            || normEmail(ch.receipt_email);
        if (!email) continue;

        const b = bucket(email);
        b.total += neto / 100;
        b.n += 1;
        if (ultimoTs[email] == null || ch.created > ultimoTs[email]) {
            ultimoTs[email] = ch.created;
            b.ultima = neto / 100;
            b.ultima_fecha = new Date(ch.created * 1000).toISOString();
            b.ultima_desc = ch.description || null;
        }
    }

    // 2) Suscripciones: que esta pagando cada uno.
    // Una suscripcion puede tener VARIOS items (ej. cuota socio + gym),
    // por eso se emite una linea por item y no por suscripcion.
    for (const sub of subs) {
        const email = emailByCustomer[sub.customer];
        if (!email) continue;
        const b = bucket(email);

        (sub.items && sub.items.data ? sub.items.data : []).forEach(it => {
            const price = it.price || {};
            const prodId = typeof price.product === 'string' ? price.product : (price.product && price.product.id);
            const nombre = nameByProduct[prodId] || price.nickname || prodId || 'Suscripcion';
            const cantidad = it.quantity || 1;
            b.subs.push({
                nombre,
                key: conceptoKey(nombre),
                importe: ((price.unit_amount || 0) * cantidad) / 100,
                // Stripe no tiene intervalo "trimestral": es interval=month
                // con interval_count=3. Sin el count el periodo es erroneo.
                intervalo: (price.recurring && price.recurring.interval) || null,
                intervalo_n: (price.recurring && price.recurring.interval_count) || 1,
                estado: sub.status,
                cantidad,
            });
        });
    }

    // Claves de concepto de las suscripciones vigentes (para detectar
    // desajustes contra la ficha del socio en el panel).
    const VIGENTE = ['active', 'trialing', 'past_due', 'unpaid'];
    Object.values(pagos).forEach(b => {
        const keys = new Set();
        b.subs.forEach(s => { if (s.key && VIGENTE.includes(s.estado)) keys.add(s.key); });
        b.keys = [...keys];
        b.total = Math.round(b.total * 100) / 100;
        if (b.ultima != null) b.ultima = Math.round(b.ultima * 100) / 100;
    });

    const payload = {
        ok: true,
        generated_at: new Date().toISOString(),
        clientes: customers.length,
        cobros: charges.length,
        suscripciones: subs.length,
        pagos,
    };
    cache = { at: Date.now(), payload };
    return payload;
}

// ── POST: sincroniza fechas de pago de Stripe hacia socios ──
async function syncPagos(supabase) {
    const results = [];

    // 1) Sync all active subscriptions
    let hasMore = true;
    let startingAfter = null;
    const subscriptions = [];

    while (hasMore) {
        const params = { status: 'active', limit: 100, expand: ['data.customer'] };
        if (startingAfter) params.starting_after = startingAfter;
        const batch = await stripe.subscriptions.list(params);
        subscriptions.push(...batch.data);
        hasMore = batch.has_more;
        if (batch.data.length > 0) {
            startingAfter = batch.data[batch.data.length - 1].id;
        }
    }

    for (const sub of subscriptions) {
        const email = sub.customer?.email;
        if (!email) continue;

        const fechaPago = sub.current_period_start
            ? new Date(sub.current_period_start * 1000).toISOString()
            : null;
        const fechaProximoPago = sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null;

        const updateData = { estado_pago: 'completado' };
        if (fechaPago) updateData.fecha_pago = fechaPago;
        if (fechaProximoPago) updateData.fecha_proximo_pago = fechaProximoPago;

        // Resolver los ids con match exacto y recien despues actualizar.
        // Un email de Stripe que contenga % en .ilike barreria fichas ajenas.
        let data = null, error = null;
        try {
            const matches = await findSociosByEmail(supabase, email);
            if (matches.length) {
                ({ data, error } = await supabase
                    .from('socios')
                    .update(updateData)
                    .in('id', matches.map(m => m.id))
                    .select('id, nombre, apellido, email'));
            } else {
                data = [];
            }
        } catch (e) { error = e; }

        results.push({
            email,
            subscription: sub.id,
            fecha_pago: fechaPago,
            fecha_proximo_pago: fechaProximoPago,
            updated: data?.length || 0,
            error: error?.message || null
        });
    }

    // 2) Also check recent completed checkout sessions (last 30 days)
    //    for one-time payments without subscriptions
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 3600;
    const sessions = await stripe.checkout.sessions.list({
        limit: 100,
        created: { gte: thirtyDaysAgo },
    });

    for (const session of sessions.data) {
        if (session.payment_status !== 'paid') continue;
        if (session.subscription) continue; // already handled above

        const email = session.customer_details?.email || session.customer_email;
        if (!email) continue;

        const fechaPago = new Date(session.created * 1000).toISOString();

        // Mismo criterio que arriba: match exacto antes del UPDATE.
        let data = null, error = null;
        try {
            const matches = await findSociosByEmail(supabase, email);
            if (matches.length) {
                ({ data, error } = await supabase
                    .from('socios')
                    .update({ estado_pago: 'completado', fecha_pago: fechaPago })
                    .in('id', matches.map(m => m.id))
                    .select('id, nombre, apellido, email'));
            } else {
                data = [];
            }
        } catch (e) { error = e; }

        results.push({
            email,
            session: session.id,
            fecha_pago: fechaPago,
            updated: data?.length || 0,
            error: error?.message || null
        });
    }

    return results;
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Require admin auth
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verify admin
    const token = auth.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        return res.status(401).json({ error: 'Token invalido' });
    }
    const { data: adminCheck } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', user.email)
        .single();
    if (!adminCheck) {
        return res.status(403).json({ error: 'No eres admin' });
    }

    // ── GET: solo lectura, importes y suscripciones por email ──
    if (req.method === 'GET') {
        try {
            const force = req.query && (req.query.refresh === '1' || req.query.refresh === 'true');
            return res.status(200).json(await getPagos(force));
        } catch (err) {
            console.error('socios payments error:', err);
            return res.status(500).json({ error: 'Stripe API error: ' + err.message });
        }
    }

    // ── POST: sincroniza hacia la DB ──
    let results;
    try {
        results = await syncPagos(supabase);
    } catch (stripeErr) {
        console.error('Stripe sync error:', stripeErr);
        return res.status(500).json({ error: 'Stripe API error: ' + stripeErr.message });
    }

    const totalUpdated = results.filter(r => r.updated > 0).length;
    return res.status(200).json({
        success: true,
        total_stripe_records: results.length,
        socios_updated: totalUpdated,
        details: results
    });
};
