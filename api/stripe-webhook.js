const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Disable body parsing — we need the raw body to verify the Stripe signature
module.exports.config = { api: { bodyParser: false } };

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Read raw body
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);

    // Verify Stripe signature
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(
            rawBody,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: 'Invalid signature' });
    }

    // Only handle completed checkout sessions
    if (event.type !== 'checkout.session.completed') {
        return res.status(200).json({ received: true });
    }

    const session = event.data.object;
    const customerEmail = session.customer_details?.email || session.customer_email;

    if (!customerEmail) {
        console.error('No customer email in checkout session:', session.id);
        return res.status(200).json({ received: true, warning: 'no email found' });
    }

    // Update estado_pago in Supabase
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
        .from('socios')
        .update({ estado_pago: 'completado' })
        .eq('email', customerEmail.toLowerCase())
        .eq('estado_pago', 'pendiente')
        .select('id, nombre, apellido, email');

    if (error) {
        console.error('Supabase update error:', error);
        return res.status(500).json({ error: 'Database update failed' });
    }

    console.log(`Payment completed for ${customerEmail}. Updated ${data?.length || 0} socio(s):`, data);

    return res.status(200).json({
        received: true,
        updated: data?.length || 0
    });
};
