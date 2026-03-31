const { createClient } = require('@supabase/supabase-js');
const { getAuthPayload } = require('./_lib/auth');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const payload = getAuthPayload(req);
    if (!payload) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: socio, error } = await supabase
        .from('socios')
        .select('id, nombre, apellido, email, documento, tipo_socio, numero_socio, estado_pago, fecha_pago, fecha_proximo_pago, foto_url, stripe_link, familiar_de, carnet_url, created_at')
        .eq('id', payload.socio_id)
        .single();

    if (error || !socio) {
        return res.status(404).json({ error: 'Socio no encontrado' });
    }

    return res.status(200).json({ success: true, socio });
};
