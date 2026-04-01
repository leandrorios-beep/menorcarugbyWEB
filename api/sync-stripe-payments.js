const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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

    const results = [];

    try {
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

            const { data, error } = await supabase
                .from('socios')
                .update(updateData)
                .ilike('email', email.trim())
                .select('id, nombre, apellido, email');

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

            const { data, error } = await supabase
                .from('socios')
                .update({ estado_pago: 'completado', fecha_pago: fechaPago })
                .ilike('email', email.trim())
                .select('id, nombre, apellido, email');

            results.push({
                email,
                session: session.id,
                fecha_pago: fechaPago,
                updated: data?.length || 0,
                error: error?.message || null
            });
        }

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
