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

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // --- Helper: get customer email from Stripe customer ID ---
    async function getCustomerEmail(customerId) {
        if (!customerId) return null;
        const customer = await stripe.customers.retrieve(customerId);
        return customer.email;
    }

    // ============================================================
    // 1) First checkout completed — socio just paid for first time
    // ============================================================
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const customerEmail = session.customer_details?.email || session.customer_email;

        if (!customerEmail) {
            console.error('No customer email in checkout session:', session.id);
            return res.status(200).json({ received: true, warning: 'no email found' });
        }

        const fechaPago = new Date(event.created * 1000).toISOString();
        let fechaProximoPago = null;

        if (session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            if (subscription.current_period_end) {
                fechaProximoPago = new Date(subscription.current_period_end * 1000).toISOString();
            }
        }

        const updateData = {
            estado_pago: 'completado',
            fecha_pago: fechaPago
        };
        if (fechaProximoPago) {
            updateData.fecha_proximo_pago = fechaProximoPago;
        }

        const { data, error } = await supabase
            .from('socios')
            .update(updateData)
            .eq('email', customerEmail.toLowerCase())
            .eq('estado_pago', 'pendiente')
            .select('id, nombre, apellido, email');

        if (error) {
            console.error('Supabase update error:', error);
            return res.status(500).json({ error: 'Database update failed' });
        }

        console.log(`Checkout completed for ${customerEmail}. Updated ${data?.length || 0} socio(s)`);
        return res.status(200).json({ received: true, updated: data?.length || 0 });
    }

    // ============================================================
    // 2) Recurring invoice paid — subscription renewed successfully
    // ============================================================
    if (event.type === 'invoice.paid') {
        const invoice = event.data.object;
        const customerEmail = invoice.customer_email || await getCustomerEmail(invoice.customer);

        if (!customerEmail || !invoice.subscription) {
            return res.status(200).json({ received: true });
        }

        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const fechaPago = new Date(event.created * 1000).toISOString();
        const fechaProximoPago = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null;

        const updateData = {
            estado_pago: 'completado',
            fecha_pago: fechaPago
        };
        if (fechaProximoPago) {
            updateData.fecha_proximo_pago = fechaProximoPago;
        }

        const { data, error } = await supabase
            .from('socios')
            .update(updateData)
            .eq('email', customerEmail.toLowerCase())
            .select('id, nombre, apellido, email');

        if (error) {
            console.error('Supabase update error (invoice.paid):', error);
            return res.status(500).json({ error: 'Database update failed' });
        }

        console.log(`Invoice paid for ${customerEmail}. Updated ${data?.length || 0} socio(s)`);
        return res.status(200).json({ received: true, updated: data?.length || 0 });
    }

    // ============================================================
    // 3) Invoice payment failed — recurring charge failed
    // ============================================================
    if (event.type === 'invoice.payment_failed') {
        const invoice = event.data.object;
        const customerEmail = invoice.customer_email || await getCustomerEmail(invoice.customer);

        if (!customerEmail) {
            return res.status(200).json({ received: true });
        }

        const { data, error } = await supabase
            .from('socios')
            .update({ estado_pago: 'impago' })
            .eq('email', customerEmail.toLowerCase())
            .eq('estado_pago', 'completado')
            .select('id, nombre, apellido, email');

        if (error) {
            console.error('Supabase update error (payment_failed):', error);
            return res.status(500).json({ error: 'Database update failed' });
        }

        console.log(`Payment FAILED for ${customerEmail}. Marked ${data?.length || 0} socio(s) as impago`);
        return res.status(200).json({ received: true, updated: data?.length || 0 });
    }

    // ============================================================
    // 4) Subscription cancelled or expired
    // ============================================================
    if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object;
        const customerEmail = await getCustomerEmail(subscription.customer);

        if (!customerEmail) {
            return res.status(200).json({ received: true });
        }

        const { data, error } = await supabase
            .from('socios')
            .update({
                estado_pago: 'cancelado',
                fecha_proximo_pago: null
            })
            .eq('email', customerEmail.toLowerCase())
            .select('id, nombre, apellido, email');

        if (error) {
            console.error('Supabase update error (subscription.deleted):', error);
            return res.status(500).json({ error: 'Database update failed' });
        }

        console.log(`Subscription cancelled for ${customerEmail}. Updated ${data?.length || 0} socio(s)`);
        return res.status(200).json({ received: true, updated: data?.length || 0 });
    }

    // Event not handled
    return res.status(200).json({ received: true });
};
