const { createClient } = require('@supabase/supabase-js');
const { verifyPassword, signJWT } = require('./_lib/auth');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: socios, error } = await supabase
        .from('socios')
        .select('id, nombre, apellido, email, documento, tipo_socio, numero_socio, estado_pago, fecha_pago, fecha_proximo_pago, foto_url, stripe_link, familiar_de, password_hash, carnet_url')
        .ilike('email', email.trim())
        .limit(1);

    if (error) {
        console.error('Login query error:', error);
        return res.status(500).json({ error: 'Error de base de datos' });
    }

    if (!socios || socios.length === 0) {
        return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    const socio = socios[0];

    if (!socio.password_hash) {
        return res.status(401).json({ error: 'Esta cuenta no tiene contraseña. Regístrate de nuevo o contacta al club.' });
    }

    try {
        if (!verifyPassword(password, socio.password_hash)) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos' });
        }
    } catch {
        return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    // Generate JWT
    const token = signJWT({ socio_id: socio.id, email: socio.email });

    // Remove password_hash from response
    const { password_hash, ...socioData } = socio;

    return res.status(200).json({
        success: true,
        token,
        socio: socioData,
    });
};
