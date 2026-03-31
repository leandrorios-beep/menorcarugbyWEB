const { createClient } = require('@supabase/supabase-js');
const { getAuthPayload, verifyPassword, hashPassword } = require('./_lib/auth');

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

    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
        return res.status(400).json({ error: 'Contraseña actual y nueva son obligatorias' });
    }
    if (new_password.length < 6) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: socio, error: selectError } = await supabase
        .from('socios')
        .select('id, password_hash')
        .eq('id', payload.socio_id)
        .single();

    if (selectError || !socio || !socio.password_hash) {
        return res.status(404).json({ error: 'Socio no encontrado' });
    }

    try {
        if (!verifyPassword(current_password, socio.password_hash)) {
            return res.status(401).json({ error: 'Contraseña actual incorrecta' });
        }
    } catch {
        return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    const { error: updateError } = await supabase
        .from('socios')
        .update({ password_hash: hashPassword(new_password) })
        .eq('id', payload.socio_id);

    if (updateError) {
        console.error('Password update error:', updateError);
        return res.status(500).json({ error: 'Error al actualizar contraseña' });
    }

    return res.status(200).json({ success: true });
};
