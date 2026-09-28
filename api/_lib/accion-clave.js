// ---------------------------------------------------------------------------
// Elegir tu propia contraseña.
//
// POR QUÉ HACÍA FALTA
//
// Hasta ahora la única forma de tener contraseña era "mandámela por correo",
// que genera ocho letras aleatorias y ANULA la anterior. Con 74 familias eso
// son 74 contraseñas que nadie va a recordar, que se piden de nuevo cada vez, y
// que dejan una cadena de correos donde sólo el último sirve.
//
// Pasó en la primera prueba de verdad: entre un "no me acuerdo" y el siguiente,
// la contraseña cambió tres veces en dos horas y ya nadie sabía cuál valía.
//
// Acá la persona elige la suya, con su sesión ya abierta: no es un camino de
// recuperación —para eso está accion-recordar— sino el de "quiero una que me
// acuerde".
//
// SE CAMBIA EN LOS DOS LADOS
//
// Si la persona es tutor Y socio, se le cambia en las dos fichas. Desde donde
// ella se para hay una sola cuenta, y tener dos contraseñas para el mismo
// nombre es exactamente el problema que estamos quitando de en medio.
// ---------------------------------------------------------------------------

const { createClient } = require('@supabase/supabase-js');
const { getAuthPayload, hashPassword } = require('./auth');

const MINIMO = 8;

module.exports = async function accionClave(req, res) {
    const payload = getAuthPayload(req);
    if (!payload || (!payload.tutor_id && !payload.socio_id)) {
        return res.status(401).json({ error: 'Entrá antes de cambiar tu contraseña.' });
    }

    const nueva = String((req.body || {}).password || '');
    if (nueva.length < MINIMO) {
        return res.status(400).json({
            error: `La contraseña tiene que tener al menos ${MINIMO} caracteres.`,
        });
    }
    // Un límite alto, no por seguridad sino porque scrypt con una entrada
    // enorme es una forma barata de tumbar la función.
    if (nueva.length > 200) {
        return res.status(400).json({ error: 'Esa contraseña es demasiado larga.' });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const hash = hashPassword(nueva);
    const ahora = new Date().toISOString();

    try {
        if (payload.tutor_id) {
            const { error } = await supabase
                .from('tutores')
                .update({ password_hash: hash, password_actualizada_at: ahora })
                .eq('tutor_id', payload.tutor_id);
            if (error) throw new Error(error.message);
        }
        if (payload.socio_id) {
            const { error } = await supabase
                .from('socios')
                .update({ password_hash: hash })
                .eq('id', payload.socio_id);
            if (error) throw new Error(error.message);
        }
        return res.status(200).json({ success: true });
    } catch (e) {
        console.error('accion-clave:', e && e.message);
        return res.status(500).json({ error: 'No pudimos cambiar tu contraseña. Probá de nuevo.' });
    }
};
