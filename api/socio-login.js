const { createClient } = require('@supabase/supabase-js');
const { verifyPassword, signJWT, findSociosByEmail, likePatternFromEmail } = require('./_lib/auth');

// ---------------------------------------------------------------------------
// UNA PERSONA, DOS CORREOS, LA MISMA CUENTA
//
// Esto buscaba solo en `socios`. Quien se habia dado de alta como socio con un
// correo y despues inscribio a sus hijos con OTRO —que es lo normal: uno es el
// de siempre y el otro el que tenia a mano ese dia— entraba a la inscripcion
// sin problema y en su carnet recibia «Email o contraseña incorrectos».
//
// Que es ademas la respuesta mas cara posible: no dice «probá con el otro
// correo», dice «la clave esta mal». La persona pide una nueva, que ANULA la
// anterior, entra igual de mal, y repite. Paso de verdad: tres contraseñas en
// dos horas y ninguna funcionaba, porque ninguna era el problema.
//
// El vinculo ya existe en la base (`tutores.socio_id`). Aca se sigue hacia
// atras: si el correo no es de ningun socio, se mira si es de un tutor, y se
// entra con SU contraseña a la ficha de socio que tenga enlazada.
//
// La contraseña que se comprueba es la de la ficha cuyo correo se escribio.
// Es lo unico que no sorprende a nadie: escribiste ese correo, va esa clave.
// ---------------------------------------------------------------------------
async function tutorPorEmail(supabase, email) {
    const objetivo = String(email || '').trim().toLowerCase();
    if (!objetivo) return null;
    // Igual que findSociosByEmail: % y _ son comodines de LIKE, y un email con
    // un "_" pasado crudo a .ilike matchearia a otras personas.
    const { data } = await supabase
        .from('tutores')
        .select('tutor_id, socio_id, email, password_hash')
        .ilike('email', likePatternFromEmail(objetivo));
    return (data || []).find((t) => String(t.email || '').trim().toLowerCase() === objetivo) || null;
}

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

    // Match exacto: .ilike con el email crudo trata % y _ como comodines.
    let socios;
    try {
        socios = await findSociosByEmail(
            supabase, email,
            'id, nombre, apellido, email, documento, tipo_socio, numero_socio, estado_pago, fecha_pago, fecha_proximo_pago, foto_url, stripe_link, familiar_de, password_hash, carnet_url'
        );
    } catch (error) {
        console.error('Login query error:', error);
        return res.status(500).json({ error: 'Error de base de datos' });
    }

    let socio = socios && socios[0];
    // Con que ficha se comprueba la contraseña: la del correo que se escribio.
    let hashAComprobar = socio ? socio.password_hash : null;
    let tutorId = null;

    // El correo no es de ningun socio: puede ser el de un tutor que ademas
    // tiene ficha de socio con otro correo.
    if (!socio) {
        let tutor;
        try {
            tutor = await tutorPorEmail(supabase, email);
        } catch (error) {
            console.error('Login tutor query error:', error);
            return res.status(500).json({ error: 'Error de base de datos' });
        }
        if (!tutor) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos' });
        }
        if (!tutor.socio_id) {
            // Es tutor pero no socio. Decirlo, y decir adonde ir: mandarlo a
            // cambiar la contraseña que SI le funciona es el camino mas largo
            // posible a ninguna parte.
            return res.status(403).json({
                error: 'Con este correo gestionás la inscripción de tus jugadores, pero todavía no tenés ficha de socio. Entrá en menorcarugbyclub.com/inscripcion, o hacete socio en la web.',
            });
        }
        const { data: suSocio } = await supabase
            .from('socios')
            .select('id, nombre, apellido, email, documento, tipo_socio, numero_socio, estado_pago, fecha_pago, fecha_proximo_pago, foto_url, stripe_link, familiar_de, password_hash, carnet_url')
            .eq('id', tutor.socio_id)
            .maybeSingle();
        if (!suSocio) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos' });
        }
        socio = suSocio;
        hashAComprobar = tutor.password_hash;
        tutorId = tutor.tutor_id;
    }

    if (!hashAComprobar) {
        return res.status(401).json({ error: 'Esta cuenta no tiene contraseña. Regístrate de nuevo o contacta al club.' });
    }

    try {
        if (!verifyPassword(password, hashAComprobar)) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos' });
        }
    } catch {
        return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    // Entro como socio: ver si esa misma persona es tambien tutor, para que el
    // carnet pueda enseñarle sus jugadores y sus recibos sin pedirle que vuelva
    // a entrar por la otra puerta.
    if (!tutorId) {
        const { data: suTutor } = await supabase
            .from('tutores')
            .select('tutor_id')
            .eq('socio_id', socio.id)
            .maybeSingle();
        if (suTutor) tutorId = suTutor.tutor_id;
    }

    // El token lleva las DOS identidades. Es lo que hace que «Mis jugadores» y
    // «Cambiar mi tarjeta» aparezcan en el carnet: las acciones de inscripcion
    // piden tutor_id, y el token de esta puerta no lo llevaba nunca.
    const token = signJWT(tutorId
        ? { socio_id: socio.id, tutor_id: tutorId, email: socio.email }
        : { socio_id: socio.id, email: socio.email });

    // Remove password_hash from response
    const { password_hash, ...socioData } = socio;

    return res.status(200).json({
        success: true,
        token,
        socio: socioData,
    });
};
