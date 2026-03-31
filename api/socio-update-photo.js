const { createClient } = require('@supabase/supabase-js');
const { getAuthPayload } = require('./_lib/auth');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const payload = getAuthPayload(req);
    if (!payload) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    const { foto_url } = req.body;
    if (!foto_url) {
        return res.status(400).json({ error: 'foto_url es obligatorio' });
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
        .from('socios')
        .update({ foto_url })
        .eq('id', payload.socio_id)
        .select('id, foto_url')
        .single();

    if (error) {
        console.error('Photo update error:', error);
        return res.status(500).json({ error: 'Error al actualizar foto' });
    }

    return res.status(200).json({ success: true, foto_url: data.foto_url });
};
