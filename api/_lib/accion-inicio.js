// ---------------------------------------------------------------------------
// Puerta única del alta y la renovación: "poné tu mail".
//
// La idea es que la familia no tenga que saber si le toca "alta" o "renovación".
// Escribe el mail y el sistema le dice en cuál de los tres casos está.
//
// ESTE ENDPOINT NO CAMBIA NADA. Es a propósito.
//
// La tentación era mandarle la contraseña acá mismo, en el mismo paso. Pero eso
// convierte "escribí tu mail para ver si estás" en "escribí un mail cualquiera y
// le cambio la contraseña a esa persona". Es exactamente lo que pasó en
// forgot-password cuando aceptaba comodines de LIKE: una prueba le pisó la
// contraseña a un socio que no había pedido nada.
//
// Así que acá sólo se responde quién sos. Resetear la contraseña es el paso
// siguiente y tiene su propio botón: inscripcion-recordar.
//
// SÍ revela si un mail está registrado. Es una decisión del club: sin eso la
// pantalla no puede decir "ya estás en la base de datos" y la gente termina
// creando fichas duplicadas, que es el problema real que hay que resolver.
// ---------------------------------------------------------------------------

const { createClient } = require('@supabase/supabase-js');
const { normalizarEmail, buscarTutorPorEmail, buscarJugadoresPorEmail } = require('./inscripcion');
const { findSociosByEmail } = require('./auth');

module.exports = async function accionInicio(req, res) {

    const email = normalizarEmail((req.body || {}).email);
    if (!email) return res.status(400).json({ error: 'Escribí un correo válido' });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    let tutor, socios;
    try {
        tutor = await buscarTutorPorEmail(
            supabase,
            email,
            'tutor_id, nombre, apellido, email, activo, password_hash'
        );
        socios = await findSociosByEmail(supabase, email, 'id, nombre, apellido, email, password_hash');
    } catch (e) {
        console.error('inscripcion-inicio:', e && e.message);
        return res.status(500).json({ error: 'Error de base de datos' });
    }

    const socio = (socios || [])[0] || null;

    // La tercera puerta, que faltaba: el correo puede estar en la ficha del
    // JUGADOR y no en ninguna cuenta. Pasa con los 32 adultos que juegan y
    // pagan lo suyo —no tienen ficha de tutor— y con las familias cuyo correo
    // quedó en players.email. Son 49 correos que existen en la base.
    //
    // Sin esto el sistema le decía "no existe" a alguien que está en el club
    // desde hace años y lo dejaba cargar todo de cero, duplicando al jugador.
    let jugadores = [];
    if (!tutor) {
        try {
            jugadores = await buscarJugadoresPorEmail(supabase, email);
            jugadores = jugadores.filter((j) => j.estado_club !== 'baja');
        } catch (e) {
            console.error('inscripcion-inicio (jugadores):', e && e.message);
        }
    }

    if (!tutor && !socio && !jugadores.length) {
        return res.status(200).json({ existe: false });
    }

    // Reconocido por la ficha del jugador, pero todavía sin cuenta. No se crea
    // acá: este endpoint no cambia nada a propósito. La cuenta se crea cuando
    // pide la contraseña, que es cuando hay alguien esperando un correo.
    if (!tutor && jugadores.length) {
        return res.status(200).json({
            existe: true,
            tipo: 'jugador',
            nombre: jugadores[0].first_name,
            hijos: jugadores.length,
            // Los nombres, para que la pantalla pueda decir a quién encontró y
            // la persona confirme que es su familia antes de seguir.
            encontrados: jugadores.map((j) => `${j.first_name} ${j.last_name}`),
            tiene_password: false,
            activo: true,
            es_socio: Boolean(socio),
        });
    }

    // QUIÉNES tiene a su cargo, no sólo cuántos.
    //
    // Decir "tenés 2 jugadores" no le sirve a nadie para confirmar que la ficha
    // que encontramos es la suya. Decir "Unai y Martina" sí: si esos no son sus
    // hijos, sabe en el acto que se equivocó de correo, y si lo son, entra
    // tranquilo sabiendo que no va a cargar a nadie dos veces.
    let hijos = 0;
    let nombresDeLosHijos = [];
    if (tutor) {
        const { data: vinculos } = await supabase
            .from('tutor_jugador')
            .select('player_id')
            .eq('tutor_id', tutor.tutor_id);
        const ids = (vinculos || []).map((v) => v.player_id);
        hijos = ids.length;
        if (ids.length) {
            const { data: suyos } = await supabase
                .from('players')
                .select('first_name, last_name, estado_club')
                .in('player_id', ids);
            // A los que se fueron no se los nombra: sería recordarle una baja a
            // quien viene a inscribir a otro hijo.
            nombresDeLosHijos = (suyos || [])
                .filter((j) => j.estado_club !== 'baja')
                .map((j) => `${j.first_name} ${j.last_name}`);
        }
    }

    return res.status(200).json({
        existe: true,
        // "tutor" si ya tiene hijos en el club; "socio" si sólo es socio y viene
        // a anotar a un hijo por primera vez.
        tipo: tutor ? 'tutor' : 'socio',
        nombre: (tutor ? tutor.nombre : socio.nombre) || '',
        hijos,
        encontrados: nombresDeLosHijos,
        es_socio: Boolean(socio),
        // Si nunca se le generó contraseña, no tiene sentido pedírsela: la
        // pantalla manda directo a "te la mando por mail".
        tiene_password: Boolean(tutor ? tutor.password_hash : socio.password_hash),
        // Un tutor archivado (activo = false) es alguien cuyos hijos dejaron el
        // club. Puede volver, pero lo tiene que ver una persona.
        activo: tutor ? tutor.activo !== false : true,
    });
};
