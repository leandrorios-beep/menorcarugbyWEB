const { createClient } = require('@supabase/supabase-js');
const { generatePassword, hashPassword } = require('./_lib/auth');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // Require admin auth (Bearer token = Supabase access_token from Google login)
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
        return res.status(401).json({ error: 'Token inválido' });
    }
    const { data: adminCheck } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', user.email)
        .single();
    if (!adminCheck) {
        return res.status(403).json({ error: 'No eres admin' });
    }

    // Options: generate for all socios without password, or for a specific socio_id
    const { socio_id } = req.body || {};

    let query = supabase
        .from('socios')
        .select('id, nombre, apellido, email, numero_socio, tipo_socio')
        .is('password_hash', null);

    if (socio_id) {
        query = query.eq('id', socio_id);
    }

    const { data: socios, error: selectError } = await query;

    if (selectError) {
        console.error('Select error:', selectError);
        return res.status(500).json({ error: 'Database error' });
    }

    if (!socios || socios.length === 0) {
        return res.status(200).json({ success: true, generated: 0, message: 'Todos los socios ya tienen contraseña' });
    }

    // Generate passwords for each socio
    const results = [];
    for (const socio of socios) {
        const plain = generatePassword();
        const hash = hashPassword(plain);

        const { error: updateError } = await supabase
            .from('socios')
            .update({ password_hash: hash })
            .eq('id', socio.id);

        if (updateError) {
            console.error(`Error updating socio ${socio.id}:`, updateError);
            results.push({ id: socio.id, nombre: socio.nombre, apellido: socio.apellido, error: true });
        } else {
            results.push({
                id: socio.id,
                nombre: socio.nombre,
                apellido: socio.apellido,
                email: socio.email,
                numero_socio: socio.numero_socio,
                tipo_socio: socio.tipo_socio,
                password: plain,
            });
        }
    }

    return res.status(200).json({
        success: true,
        generated: results.filter(r => !r.error).length,
        socios: results,
    });
};
