// ---------------------------------------------------------------------------
// Entrar. Una sola puerta para tutores y para socios.
//
// Tutor y socio son roles distintos y una misma persona puede ser los dos, uno
// o ninguno: se puede ser socio sin tener hijos jugando, y se puede tener un
// hijo jugando sin ser socio. Pero desde donde se para la persona hay una sola
// cuenta, así que el token lleva los dos identificadores cuando corresponde y
// cada pantalla usa el que necesita.
// ---------------------------------------------------------------------------

const { createClient } = require('@supabase/supabase-js');
const { verifyPassword, signJWT, findSociosByEmail } = require('./_lib/auth');
const { cors, normalizarEmail, buscarTutorPorEmail } = require('./_lib/inscripcion');

module.exports = async function handler(req, res) {
    if (cors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { email: emailCrudo, password } = req.body || {};
    const email = normalizarEmail(emailCrudo);
    if (!email || !password) {
        return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    let tutor, socios;
    try {
        tutor = await buscarTutorPorEmail(
            supabase,
            email,
            'tutor_id, nombre, apellido, email, activo, password_hash'
        );
        socios = await findSociosByEmail(
            supabase,
            email,
            'id, nombre, apellido, email, numero_socio, tipo_socio, estado_pago, password_hash'
        );
    } catch (e) {
        console.error('inscripcion-acceso:', e && e.message);
        return res.status(500).json({ error: 'Error de base de datos' });
    }

    const socio = (socios || [])[0] || null;
    if (!tutor && !socio) {
        return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    // Alcanza con que la contraseña sea válida en cualquiera de los dos lados:
    // inscripcion-recordar las deja iguales, pero una cuenta vieja de socio
    // puede tener una distinta de la del tutor y no hay por qué rechazarla.
    const candidatos = [tutor, socio].filter((c) => c && c.password_hash);
    if (!candidatos.length) {
        return res.status(401).json({
            error: 'Esta cuenta todavía no tiene contraseña. Pedí que te la enviemos por correo.',
        });
    }

    const valida = candidatos.some((c) => {
        try {
            return verifyPassword(password, c.password_hash);
        } catch {
            return false;
        }
    });
    if (!valida) {
        return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    if (tutor && tutor.activo === false) {
        return res.status(403).json({
            error:
                'Tu ficha de tutor está archivada porque ningún jugador figura a tu cargo. ' +
                'Escribinos a info@menorcarugbyclub.com y la reactivamos.',
        });
    }

    const token = signJWT({
        email,
        tutor_id: tutor ? tutor.tutor_id : null,
        socio_id: socio ? socio.id : null,
    });

    return res.status(200).json({
        success: true,
        token,
        nombre: (tutor ? tutor.nombre : socio.nombre) || '',
        es_tutor: Boolean(tutor),
        es_socio: Boolean(socio),
    });
};
