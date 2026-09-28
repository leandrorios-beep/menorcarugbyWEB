// ---------------------------------------------------------------------------
// "No me acuerdo la contraseña": genera una nueva y la manda por mail.
//
// No se puede recordar la vieja: se guarda con scrypt, que es de una sola vía.
// Lo único posible es reemplazarla, y por eso esto es un botón aparte y no
// pasa solo al escribir el mail (ver inscripcion-inicio.js).
//
// A diferencia de forgot-password.js, acá SÍ se informa si el correo no salió.
// Las credenciales de Gmail del club están caducadas desde hace un tiempo; decir
// "te la mandamos" cuando no salió deja a la familia esperando un mail que no va
// a llegar, y encima con la contraseña ya cambiada.
// ---------------------------------------------------------------------------

const { createClient } = require('@supabase/supabase-js');
const { generatePassword, hashPassword, findSociosByEmail } = require('./auth');
const { normalizarEmail, buscarTutorPorEmail, buscarJugadoresPorEmail, enviarMail, escapeHtml } = require('./inscripcion');

module.exports = async function accionRecordar(req, res) {

    const email = normalizarEmail((req.body || {}).email);
    if (!email) return res.status(400).json({ error: 'Escribí un correo válido' });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    let tutor, socios;
    try {
        tutor = await buscarTutorPorEmail(supabase, email, 'tutor_id, nombre, email');
        socios = await findSociosByEmail(supabase, email, 'id, nombre, email');
    } catch (e) {
        console.error('inscripcion-recordar:', e && e.message);
        return res.status(500).json({ error: 'Error de base de datos' });
    }

    const socio = (socios || [])[0] || null;

    // Si el correo no tiene cuenta pero SÍ está en la ficha de algún jugador, se
    // le crea la cuenta acá y se le vincula a los suyos. Es el momento correcto:
    // hay una persona esperando un correo, y sin cuenta no tiene forma de entrar
    // a ver ni a renovar lo que ya existe.
    //
    // No es un agujero: la contraseña se manda a ESE mismo correo, así que quien
    // no controle el buzón no gana nada. Es la misma propiedad que un reseteo.
    if (!tutor) {
        let jugadores = [];
        try {
            jugadores = (await buscarJugadoresPorEmail(supabase, email)).filter(
                (j) => j.estado_club !== 'baja'
            );
        } catch (e) {
            console.error('inscripcion-recordar (jugadores):', e && e.message);
        }
        if (jugadores.length) {
            try {
                tutor = await crearCuentaDesdeJugadores(supabase, email, jugadores);
            } catch (e) {
                console.error('inscripcion-recordar (crear cuenta):', e && e.message);
                return res.status(500).json({ error: 'No pudimos preparar tu cuenta. Escribinos.' });
            }
        }
    }

    if (!tutor && !socio) {
        // Acá no hay nada que proteger: inscripcion-inicio ya dice si el mail
        // existe, y decir dos cosas distintas sólo confunde.
        return res.status(404).json({ error: 'Ese correo no está en nuestra base de datos' });
    }

    const nueva = generatePassword();
    const hash = hashPassword(nueva);
    const ahora = new Date().toISOString();

    // Si la persona es tutor Y socio, se le cambia en los dos lados: es una sola
    // contraseña desde el punto de vista de quien la usa.
    if (tutor) {
        const { error } = await supabase
            .from('tutores')
            .update({ password_hash: hash, password_actualizada_at: ahora })
            .eq('tutor_id', tutor.tutor_id);
        if (error) {
            console.error('inscripcion-recordar (tutor):', error.message);
            return res.status(500).json({ error: 'No se pudo cambiar la contraseña' });
        }
    }
    if (socio) {
        const { error } = await supabase.from('socios').update({ password_hash: hash }).eq('id', socio.id);
        if (error) {
            console.error('inscripcion-recordar (socio):', error.message);
            return res.status(500).json({ error: 'No se pudo cambiar la contraseña' });
        }
    }

    const nombre = (tutor ? tutor.nombre : socio.nombre) || '';
    const envio = await enviarMail({
        to: email,
        subject: 'Tu contraseña - Menorca Rugby Club',
        html: plantilla(nombre, nueva),
    });

    if (!envio.ok) {
        // La contraseña YA cambió. Callarlo sería dejar a la familia afuera sin
        // que sepa por qué.
        return res.status(200).json({
            enviado: false,
            aviso:
                'Cambiamos tu contraseña pero no pudimos enviarte el correo. ' +
                'Escribinos a info@menorcarugbyclub.com y te la damos.',
        });
    }

    return res.status(200).json({ enviado: true });
};

/**
 * Crea la cuenta de quien ya está en el club pero nunca tuvo uno.
 *
 * El orden es obligado por los CONSTRAINT TRIGGER, que son DEFERRABLE y se
 * evalúan al cerrar cada request de PostgREST:
 *   1. el tutor entra con activo = false (uno activo sin jugadores no se puede)
 *   2. los vínculos de cada jugador, TODOS en una llamada y con un solo pagador
 *   3. recién ahí se activa
 *
 * El nombre sale del propio jugador adulto si lo hay. Si son todos menores no
 * sabemos cómo se llama la madre o el padre, así que queda el correo y lo
 * corrigen ellos en el formulario: inventarle un nombre a alguien es peor.
 */
async function crearCuentaDesdeJugadores(supabase, email, jugadores) {
    const adulto = jugadores.find((j) => ['SENIOR', 'FEMENINO'].includes(j.category_primary));

    const { data: creado, error } = await supabase
        .from('tutores')
        .insert({
            nombre: adulto ? adulto.first_name : email.split('@')[0],
            apellido: adulto ? adulto.last_name : null,
            email,
            activo: false,
            notas:
                'Cuenta creada sola al pedir la contraseña: el correo ya estaba en la ficha de ' +
                jugadores.map((j) => `${j.first_name} ${j.last_name}`).join(', ') + '.',
        })
        .select('tutor_id, nombre, email')
        .single();
    if (error) throw new Error(error.message);

    for (const j of jugadores) {
        // 'el_mismo' cuando la cuenta ES el jugador: un adulto que juega y se
        // paga su cuota no es "tutor" de nadie.
        const esElMismo = adulto && j.player_id === adulto.player_id;
        const { error: errV } = await supabase.from('tutor_jugador').insert({
            tutor_id: creado.tutor_id,
            player_id: j.player_id,
            parentesco: esElMismo ? 'el_mismo' : 'tutor_legal',
            // es_pagador: true en TODOS, y no sólo en el primero.
            //
            // El trigger cuenta los pagadores de CADA JUGADOR, no de la familia:
            // pide exactamente uno por chico, porque por cada chico se cobra una
            // cuota. Marcando sólo al primero, el segundo hijo se quedaba con
            // cero pagadores y la cuenta entera no se podía crear.
            //
            // Acá esta cuenta es la única que tiene a cada uno de ellos a cargo,
            // así que es la pagadora de todos.
            es_pagador: true,
            notificar: true,
        });
        if (errV) throw new Error(errV.message);
    }

    const { error: errA } = await supabase
        .from('tutores')
        .update({ activo: true })
        .eq('tutor_id', creado.tutor_id);
    if (errA) throw new Error(errA.message);

    console.log(`Cuenta creada para ${email} con ${jugadores.length} jugador(es) que ya estaban`);
    return creado;
}

function plantilla(nombre, password) {
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f0f2f5;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <tr><td style="background-color:#182B49;padding:25px 40px;text-align:center;">
    <table cellpadding="0" cellspacing="0" role="presentation" align="center" style="margin:0 auto 10px;"><tr><td style="background-color:#ffffff;border-radius:10px;padding:10px 16px;"><img src="https://www.menorcarugbyclub.com/assets/images/static/logo.png" alt="Menorca Rugby Club" width="150" height="84" style="display:block;border:0;"></td></tr></table>
    <h1 style="color:#FFC72C;font-size:20px;margin:10px 0 0;">MENORCA RUGBY CLUB</h1>
  </td></tr>
  <tr><td style="padding:30px 40px;">
    <h2 style="color:#182B49;font-size:20px;margin:0 0 15px;">Hola ${escapeHtml(nombre)},</h2>
    <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 20px;">
      Ya estás en nuestra base de datos. Con esta contraseña podés entrar, ver a tus jugadores y renovar la inscripción.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#182B49;border-radius:12px;">
      <tr><td style="padding:25px 30px;">
        <p style="color:#AAB4C2;font-size:11px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;">Tu contraseña</p>
        <p style="color:#FFC72C;font-size:28px;font-weight:700;margin:0;font-family:'Courier New',monospace;letter-spacing:3px;">${escapeHtml(password)}</p>
      </td></tr>
    </table>
    <div style="text-align:center;margin:25px 0 10px;">
      <a href="https://www.menorcarugbyclub.com/inscripcion" style="display:inline-block;background-color:#FFC72C;color:#182B49;padding:12px 30px;border-radius:8px;font-weight:700;text-decoration:none;font-size:15px;">Entrar a la inscripción</a>
    </div>
  </td></tr>
  <tr><td style="background-color:#182B49;padding:20px 40px;text-align:center;">
    <p style="color:#C3CBD6;font-size:12px;margin:0;">Si no pediste esto, escribinos a info@menorcarugbyclub.com</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}
