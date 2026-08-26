const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

// Varias operaciones en el mismo endpoint porque el plan Hobby de Vercel solo
// admite 12 funciones serverless y api/ ya estaba al limite:
//   GET                            -> remitente configurado (GMAIL_USER)
//   POST (sin action)              -> email de bienvenida individual (original)
//   POST action=comunicado_preview -> HTML del comunicado (vista previa)
//   POST action=comunicado         -> envia el comunicado a un lote de destinatarios

const REPLY_TO_DEFAULT = 'comision.directiva@menorcarugbyclub.com';
const MAX_LOTE = 25; // el cliente trocea; mantiene cada invocacion bajo maxDuration
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const remitente = () => process.env.GMAIL_USER || '';

module.exports = async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // Auth check - require bearer token
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    // El panel necesita mostrar desde que cuenta sale el correo
    if (req.method === 'GET') {
        return res.status(200).json({ from: remitente(), reply_to: REPLY_TO_DEFAULT });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const accion = (req.body && req.body.action) || 'bienvenida';
    if (accion === 'comunicado' || accion === 'comunicado_preview') {
        return handleComunicado(req, res, accion === 'comunicado_preview');
    }

    try {
        const { to, nombre, tipo_socio, numero_socio, mensaje_extra, login_email, login_password, adjunto_base64, adjunto_nombre } = req.body;

        if (!to || !nombre) {
            return res.status(400).json({ error: 'Faltan campos requeridos (to, nombre)' });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
            }
        });

        const htmlEmail = buildWelcomeEmail(nombre, tipo_socio, numero_socio, mensaje_extra, login_email, login_password);

        const mailOptions = {
            from: `"Menorca Rugby Club" <${process.env.GMAIL_USER}>`,
            to: to,
            subject: `Bienvenid@ al Menorca Rugby Club, ${nombre}!`,
            html: htmlEmail,
            attachments: []
        };

        // Adjuntar archivo si viene (carnet de socio, etc.)
        if (adjunto_base64 && adjunto_nombre) {
            mailOptions.attachments.push({
                filename: adjunto_nombre,
                content: adjunto_base64,
                encoding: 'base64'
            });
        }

        await transporter.sendMail(mailOptions);

        return res.status(200).json({ success: true, message: 'Email enviado correctamente' });

    } catch (error) {
        console.error('Error enviando email:', error);
        return res.status(500).json({ error: 'Error al enviar email: ' + error.message });
    }
};

function buildWelcomeEmail(nombre, tipo_socio, numero_socio, mensaje_extra, login_email, login_password) {
    const tipoDisplay = tipo_socio ? tipo_socio.charAt(0).toUpperCase() + tipo_socio.slice(1) : 'Socio';

    // Credentials block (only if login_email and login_password provided)
    const credentialsBlock = (login_email && login_password) ? `
                    <tr>
                        <td style="padding:0 40px 25px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background:#182B49;border-radius:12px;overflow:hidden;">
                                <tr>
                                    <td style="padding:25px 30px;">
                                        <p style="color:#FFC72C;font-size:16px;font-weight:700;margin:0 0 18px;text-transform:uppercase;letter-spacing:1px;">Tu acceso a la Zona de Socios</p>
                                        <table cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="padding:10px 15px;background-color:#22395C;border-radius:8px;margin-bottom:8px;">
                                                    <table cellpadding="0" cellspacing="0" width="100%">
                                                        <tr>
                                                            <td style="color:#AAB4C2;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding-bottom:4px;">Email</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="color:#ffffff;font-size:18px;font-weight:700;font-family:'Courier New',monospace;">${escapeHtml(login_email)}</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr><td style="height:10px;"></td></tr>
                                            <tr>
                                                <td style="padding:10px 15px;background-color:#22395C;border-radius:8px;">
                                                    <table cellpadding="0" cellspacing="0" width="100%">
                                                        <tr>
                                                            <td style="color:#AAB4C2;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding-bottom:4px;">Contraseña</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="color:#FFC72C;font-size:24px;font-weight:700;font-family:'Courier New',monospace;letter-spacing:3px;">${escapeHtml(login_password)}</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                        <div style="text-align:center;margin-top:20px;">
                                            <a href="https://www.menorcarugbyclub.com/mi-carnet" style="display:inline-block;background:#FFC72C;color:#182B49;padding:12px 30px;border-radius:8px;font-weight:700;text-decoration:none;font-size:15px;">Acceder a Mi Carnet</a>
                                        </div>
                                        <p style="color:#9BA6B5;font-size:12px;margin:15px 0 0;text-align:center;">Puedes cambiar tu contraseña desde la seccion Seguridad.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>` : '';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <style>
        :root { color-scheme: light only; }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f0f2f5;padding:20px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

                    <!-- Header -->
                    <tr>
                        <td style="background-color:#182B49;padding:30px 40px;text-align:center;">
                            <table cellpadding="0" cellspacing="0" role="presentation" align="center" style="margin:0 auto 14px;"><tr><td style="background-color:#ffffff;border-radius:10px;padding:10px 16px;"><img src="https://www.menorcarugbyclub.com/assets/images/static/logo.png" alt="Menorca Rugby Club" width="180" height="101" style="display:block;border:0;outline:none;text-decoration:none;"></td></tr></table>
                            <h1 style="color:#FFC72C;font-size:22px;margin:0;font-weight:700;">MENORCA RUGBY CLUB</h1>
                        </td>
                    </tr>

                    <!-- Bienvenida -->
                    <tr>
                        <td style="padding:35px 40px 20px;background-color:#ffffff;">
                            <h2 style="color:#182B49;font-size:24px;margin:0 0 8px;">Bienvenid@ ${escapeHtml(nombre)}!</h2>
                            <p style="color:#FFC72C;font-size:16px;font-weight:600;margin:0;">Socio ${escapeHtml(tipoDisplay)}${numero_socio ? ' #' + escapeHtml(numero_socio) : ''}</p>
                        </td>
                    </tr>

                    <!-- Mensaje principal -->
                    <tr>
                        <td style="padding:10px 40px 25px;background-color:#ffffff;">
                            <p style="color:#333333;font-size:15px;line-height:1.6;margin:0 0 15px;">
                                Desde el Menorca Rugby Club queremos darte las gracias por unirte a nuestra familia rugbistica.
                                Tu apoyo es fundamental para seguir creciendo y promoviendo los valores del rugby en nuestra isla.
                            </p>
                            <p style="color:#333333;font-size:15px;line-height:1.6;margin:0 0 15px;">
                                Como socio del club, disfrutaras de beneficios exclusivos, acceso a eventos y la satisfaccion
                                de formar parte de una comunidad unida por la pasion al rugby.
                            </p>
                            ${mensaje_extra ? `<p style="color:#333333;font-size:15px;line-height:1.6;margin:0 0 15px;padding:15px;background-color:#f8f9fa;border-left:3px solid #FFC72C;border-radius:4px;">${escapeHtml(mensaje_extra)}</p>` : ''}
                        </td>
                    </tr>

                    <!-- Credentials block (if provided) -->
                    ${credentialsBlock}

                    <!-- Info util -->
                    <tr>
                        <td style="padding:0 40px 25px;background-color:#ffffff;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;border-radius:8px;overflow:hidden;">
                                <tr>
                                    <td style="padding:20px 25px;">
                                        <p style="color:#182B49;font-size:14px;font-weight:700;margin:0 0 10px;">INFORMACION UTIL</p>
                                        <table cellpadding="0" cellspacing="0">
                                            <tr><td style="padding:4px 0;color:#555555;font-size:14px;"><strong style="color:#182B49;">Web:</strong> <a href="https://www.menorcarugbyclub.com" style="color:#1565c0;text-decoration:none;">menorcarugbyclub.com</a></td></tr>
                                            <tr><td style="padding:4px 0;color:#555555;font-size:14px;"><strong style="color:#182B49;">Calendario:</strong> <a href="https://www.menorcarugbyclub.com/calendar.html" style="color:#1565c0;text-decoration:none;">Ver partidos y eventos</a></td></tr>
                                            <tr><td style="padding:4px 0;color:#555555;font-size:14px;"><strong style="color:#182B49;">Instagram:</strong> <a href="https://www.instagram.com/menorcarugby/" style="color:#1565c0;text-decoration:none;">@menorcarugby</a></td></tr>
                                            <tr><td style="padding:4px 0;color:#555555;font-size:14px;"><strong style="color:#182B49;">Email:</strong> <a href="mailto:info@menorcarugbyclub.com" style="color:#1565c0;text-decoration:none;">info@menorcarugbyclub.com</a></td></tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#182B49;padding:25px 40px;text-align:center;">
                            <p style="color:#FFC72C;font-size:14px;font-weight:600;margin:0 0 8px;">Nos vemos en el campo!</p>
                            <p style="color:#C3CBD6;font-size:12px;margin:0;">
                                Menorca Rugby Club &bull; Sa Terranova 8, Mao, Illes Balears
                            </p>
                            <p style="color:#AAB4C2;font-size:12px;margin:15px 0 8px;text-transform:uppercase;letter-spacing:1px;">Siguenos en redes</p>
                            <div>
                                <a href="https://www.instagram.com/menorcarugby/" style="color:#FFC72C;text-decoration:none;margin:0 8px;font-size:13px;">Instagram</a>
                                <a href="https://www.facebook.com/menorcarugby" style="color:#FFC72C;text-decoration:none;margin:0 8px;font-size:13px;">Facebook</a>
                                <a href="https://www.tiktok.com/@menorcarugby" style="color:#FFC72C;text-decoration:none;margin:0 8px;font-size:13px;">TikTok</a>
                            </div>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ═══════════════════════ COMUNICADOS (envio masivo) ═══════════════════════

// El bearer que manda el panel es el access_token de Supabase (login Google).
// Para un envio masivo no basta con "trae un token": se comprueba que el
// usuario exista y este en admin_users, igual que en admin-generate-passwords.
async function verificarAdmin(req) {
    try {
        const token = (req.headers.authorization || '').slice(7);
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return null;
        const { data: admin } = await supabase
            .from('admin_users')
            .select('id')
            .eq('email', user.email)
            .single();
        return admin ? user : null;
    } catch (e) {
        return null;
    }
}

async function handleComunicado(req, res, soloPreview) {
    const admin = await verificarAdmin(req);
    if (!admin) return res.status(403).json({ error: 'Solo un administrador puede enviar comunicados' });

    const b = req.body || {};
    const asunto = (b.asunto || '').trim();
    const titulo = (b.titulo || '').trim();
    const mensaje = (b.mensaje || '').trim();
    const firma = (b.firma || '').trim();
    const cta = { texto: (b.cta_texto || '').trim(), url: (b.cta_url || '').trim() };
    const saludo = b.saludo !== false;
    const replyTo = (b.reply_to || '').trim() || REPLY_TO_DEFAULT;

    // Vista previa: mismo generador que el envio real, para que lo que se ve
    // sea exactamente lo que sale (por eso el HTML no se construye en el panel)
    if (soloPreview) {
        const nombre = (b.nombre_ejemplo || '').trim() || 'Nombre del socio';
        return res.status(200).json({
            from: remitente(),
            reply_to: replyTo,
            asunto: personalizar(asunto, nombre),
            html: buildComunicado({ titulo, mensaje, cta, firma, nombre: saludo ? nombre : '' })
        });
    }

    if (!asunto) return res.status(400).json({ error: 'Falta el asunto' });
    if (!mensaje) return res.status(400).json({ error: 'Falta el mensaje' });

    const destinatarios = Array.isArray(b.destinatarios) ? b.destinatarios : [];
    if (!destinatarios.length) return res.status(400).json({ error: 'No hay destinatarios' });
    if (destinatarios.length > MAX_LOTE) {
        return res.status(400).json({ error: 'Maximo ' + MAX_LOTE + ' destinatarios por peticion' });
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        pool: true,
        maxConnections: 3,
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
        }
    });

    const attachments = [];
    if (b.adjunto_base64 && b.adjunto_nombre) {
        attachments.push({ filename: b.adjunto_nombre, content: b.adjunto_base64, encoding: 'base64' });
    }

    const enviados = [];
    const fallidos = [];

    // Un envio por destinatario (no BCC): cada uno ve solo su direccion y
    // recibe el saludo con su nombre.
    for (const d of destinatarios) {
        const email = ((d && d.email) || '').trim();
        const nombre = ((d && d.nombre) || '').trim();
        if (!EMAIL_RE.test(email)) {
            fallidos.push({ email: email || '(vacio)', error: 'Email no valido' });
            continue;
        }
        try {
            await transporter.sendMail({
                from: '"Menorca Rugby Club" <' + process.env.GMAIL_USER + '>',
                to: email,
                replyTo: replyTo,
                subject: personalizar(asunto, nombre),
                html: buildComunicado({ titulo, mensaje, cta, firma, nombre: saludo ? nombre : '' }),
                text: comunicadoTextoPlano({ titulo, mensaje, cta, firma, nombre: saludo ? nombre : '' }),
                attachments
            });
            enviados.push(email);
        } catch (error) {
            fallidos.push({ email, error: error.message });
        }
    }

    try { transporter.close(); } catch (e) {}

    return res.status(200).json({ success: true, enviados, fallidos });
}

// {{nombre}} en asunto y cuerpo; sin nombre se usa un tratamiento neutro
function personalizar(texto, nombre) {
    return String(texto || '').replace(/\{\{\s*nombre\s*\}\}/gi, nombre || 'socio/a');
}

function primerNombre(nombre) {
    return String(nombre || '').trim().split(/\s+/)[0] || '';
}

// Texto libre -> parrafos. Soporta **negrita** y autoenlaza URLs.
function comunicadoCuerpoHtml(texto, nombre) {
    return personalizar(escapeHtml(texto), nombre)
        .split(/\n\s*\n/)
        .map(function (bloque) {
            const t = bloque.trim();
            if (!t) return '';
            const html = t
                .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#182B49;">$1</strong>')
                .replace(/(https?:\/\/[^\s<]+[^\s<.,;:)])/g, '<a href="$1" style="color:#1565c0;text-decoration:underline;">$1</a>')
                .replace(/\n/g, '<br>');
            return '<p style="color:#333333;font-size:15px;line-height:1.65;margin:0 0 16px;">' + html + '</p>';
        })
        .join('');
}

function comunicadoTextoPlano(opts) {
    const partes = [];
    if (opts.nombre) partes.push('Hola ' + primerNombre(opts.nombre) + ',');
    if (opts.titulo) partes.push(personalizar(opts.titulo, opts.nombre));
    partes.push(personalizar(opts.mensaje, opts.nombre).replace(/\*\*/g, ''));
    if (opts.cta && opts.cta.texto && opts.cta.url) partes.push(opts.cta.texto + ': ' + opts.cta.url);
    partes.push(personalizar(opts.firma || 'Menorca Rugby Club', opts.nombre));
    partes.push('Menorca Rugby Club - Sa Terranova 8, Mao, Illes Balears\nwww.menorcarugbyclub.com');
    return partes.join('\n\n');
}

function buildComunicado(opts) {
    const titulo = opts.titulo;
    const mensaje = opts.mensaje;
    const cta = opts.cta;
    const firma = opts.firma;
    const nombre = opts.nombre;

    const saludoHtml = nombre
        ? '<p style="color:#182B49;font-size:16px;font-weight:700;margin:0 0 16px;">Hola ' + escapeHtml(primerNombre(nombre)) + ',</p>'
        : '';

    const tituloHtml = titulo
        ? '<h2 style="color:#182B49;font-size:22px;line-height:1.3;margin:0 0 6px;">' + escapeHtml(personalizar(titulo, nombre)) + '</h2>'
          + '<div style="width:52px;height:4px;background-color:#FFC72C;border-radius:2px;margin:0 0 20px;"></div>'
        : '';

    const ctaHtml = (cta && cta.texto && cta.url)
        ? '<tr><td style="padding:5px 40px 30px;background-color:#ffffff;text-align:center;">'
          + '<a href="' + escapeHtml(cta.url) + '" style="display:inline-block;background-color:#FFC72C;color:#182B49;padding:14px 34px;border-radius:8px;font-weight:700;text-decoration:none;font-size:15px;">'
          + escapeHtml(cta.texto) + '</a></td></tr>'
        : '';

    const firmaTexto = firma || 'Un saludo,\nMenorca Rugby Club';
    const firmaHtml = personalizar(escapeHtml(firmaTexto), nombre)
        .split('\n')
        .filter(function (l) { return l.trim() !== ''; })
        .map(function (linea, i) {
            return i === 0
                ? '<div style="color:#182B49;font-size:15px;font-weight:700;margin-bottom:4px;">' + linea + '</div>'
                : '<div style="color:#666666;font-size:13px;line-height:1.6;">' + linea + '</div>';
        })
        .join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <style>
        :root { color-scheme: light only; }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f0f2f5;padding:20px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

                    <!-- Header -->
                    <tr>
                        <td style="background-color:#182B49;padding:30px 40px;text-align:center;">
                            <table cellpadding="0" cellspacing="0" role="presentation" align="center" style="margin:0 auto 14px;"><tr><td style="background-color:#ffffff;border-radius:10px;padding:10px 16px;"><img src="https://www.menorcarugbyclub.com/assets/images/static/logo.png" alt="Menorca Rugby Club" width="180" height="101" style="display:block;border:0;outline:none;text-decoration:none;"></td></tr></table>
                            <h1 style="color:#FFC72C;font-size:22px;margin:0;font-weight:700;letter-spacing:1px;">MENORCA RUGBY CLUB</h1>
                        </td>
                    </tr>

                    <!-- Cuerpo -->
                    <tr>
                        <td style="padding:35px 40px 10px;background-color:#ffffff;">
                            ${tituloHtml}
                            ${saludoHtml}
                            ${comunicadoCuerpoHtml(mensaje, nombre)}
                        </td>
                    </tr>

                    ${ctaHtml}

                    <!-- Firma -->
                    <tr>
                        <td style="padding:0 40px 30px;background-color:#ffffff;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="border-top:2px solid #FFC72C;padding-top:18px;">
                                        ${firmaHtml}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#182B49;padding:25px 40px;text-align:center;">
                            <p style="color:#FFC72C;font-size:14px;font-weight:600;margin:0 0 8px;">Nos vemos en el campo!</p>
                            <p style="color:#C3CBD6;font-size:12px;margin:0;">
                                Menorca Rugby Club &bull; Sa Terranova 8, Mao, Illes Balears<br>
                                <a href="https://www.menorcarugbyclub.com" style="color:#C3CBD6;text-decoration:none;">www.menorcarugbyclub.com</a> &bull;
                                <a href="mailto:info@menorcarugbyclub.com" style="color:#C3CBD6;text-decoration:none;">info@menorcarugbyclub.com</a>
                            </p>
                            <p style="color:#AAB4C2;font-size:12px;margin:15px 0 8px;text-transform:uppercase;letter-spacing:1px;">Siguenos en redes</p>
                            <div>
                                <a href="https://www.instagram.com/menorcarugby/" style="color:#FFC72C;text-decoration:none;margin:0 8px;font-size:13px;">Instagram</a>
                                <a href="https://www.facebook.com/menorcarugby" style="color:#FFC72C;text-decoration:none;margin:0 8px;font-size:13px;">Facebook</a>
                                <a href="https://www.tiktok.com/@menorcarugby" style="color:#FFC72C;text-decoration:none;margin:0 8px;font-size:13px;">TikTok</a>
                            </div>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}
