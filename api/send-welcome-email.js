const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // Auth check - require bearer token
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        const { to, nombre, tipo_socio, numero_socio, mensaje_extra, adjunto_base64, adjunto_nombre } = req.body;

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

        const htmlEmail = buildWelcomeEmail(nombre, tipo_socio, numero_socio, mensaje_extra);

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

function buildWelcomeEmail(nombre, tipo_socio, numero_socio, mensaje_extra) {
    const tipoDisplay = tipo_socio ? tipo_socio.charAt(0).toUpperCase() + tipo_socio.slice(1) : 'Socio';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:20px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

                    <!-- Header -->
                    <tr>
                        <td style="background:#182B49;padding:30px 40px;text-align:center;">
                            <img src="https://www.menorcarugbyclub.com/assets/images/static/logo.png" alt="Menorca Rugby Club" width="80" style="margin-bottom:12px;background:#ffffff;border-radius:50%;padding:8px;">
                            <h1 style="color:#FFC72C;font-size:22px;margin:0;font-weight:700;">MENORCA RUGBY CLUB</h1>
                        </td>
                    </tr>

                    <!-- Bienvenida -->
                    <tr>
                        <td style="padding:35px 40px 20px;">
                            <h2 style="color:#182B49;font-size:24px;margin:0 0 8px;">Bienvenid@ ${escapeHtml(nombre)}!</h2>
                            <p style="color:#FFC72C;font-size:16px;font-weight:600;margin:0;">Socio ${escapeHtml(tipoDisplay)}${numero_socio ? ' #' + escapeHtml(numero_socio) : ''}</p>
                        </td>
                    </tr>

                    <!-- Mensaje principal -->
                    <tr>
                        <td style="padding:10px 40px 25px;">
                            <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 15px;">
                                Desde el Menorca Rugby Club queremos darte las gracias por unirte a nuestra familia rugbistica.
                                Tu apoyo es fundamental para seguir creciendo y promoviendo los valores del rugby en nuestra isla.
                            </p>
                            <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 15px;">
                                Como socio del club, disfrutaras de beneficios exclusivos, acceso a eventos y la satisfaccion
                                de formar parte de una comunidad unida por la pasion al rugby.
                            </p>
                            <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 15px;">
                                Recuerda que puedes consultar todos los partidos y eventos en nuestro
                                <a href="https://www.menorcarugbyclub.com/calendar.html" style="color:#1565c0;font-weight:600;text-decoration:none;">calendario</a>.
                                No te pierdas ningun partido!
                            </p>
                            ${mensaje_extra ? `<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 15px;padding:15px;background:#f8f9fa;border-left:3px solid #FFC72C;border-radius:4px;">${escapeHtml(mensaje_extra)}</p>` : ''}
                        </td>
                    </tr>

                    <!-- Info util -->
                    <tr>
                        <td style="padding:0 40px 25px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;overflow:hidden;">
                                <tr>
                                    <td style="padding:20px 25px;">
                                        <p style="color:#182B49;font-size:14px;font-weight:700;margin:0 0 10px;">INFORMACI&Oacute;N &Uacute;TIL</p>
                                        <table cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding:4px 0;color:#555;font-size:14px;">
                                                    <strong style="color:#182B49;">Web:</strong>
                                                    <a href="https://www.menorcarugbyclub.com" style="color:#1565c0;text-decoration:none;">menorcarugbyclub.com</a>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:4px 0;color:#555;font-size:14px;">
                                                    <strong style="color:#182B49;">Instagram:</strong>
                                                    <a href="https://www.instagram.com/menorcarugby/" style="color:#1565c0;text-decoration:none;">@menorcarugby</a>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:4px 0;color:#555;font-size:14px;">
                                                    <strong style="color:#182B49;">Email:</strong>
                                                    <a href="mailto:info@menorcarugbyclub.com" style="color:#1565c0;text-decoration:none;">info@menorcarugbyclub.com</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    ${numero_socio || tipo_socio ? `
                    <!-- Carnet info -->
                    <tr>
                        <td style="padding:0 40px 25px;">
                            <p style="color:#555;font-size:13px;line-height:1.5;margin:0;">
                                ${adjuntoMention()}
                            </p>
                        </td>
                    </tr>
                    ` : ''}

                    <!-- Footer -->
                    <tr>
                        <td style="background:#182B49;padding:25px 40px;text-align:center;">
                            <p style="color:#FFC72C;font-size:14px;font-weight:600;margin:0 0 8px;">Nos vemos en el campo!</p>
                            <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0;">
                                Menorca Rugby Club &bull; Sa Terranova 8, Mao, Illes Balears
                            </p>
                            <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:15px 0 8px;text-transform:uppercase;letter-spacing:1px;">Siguenos en redes</p>
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

function adjuntoMention() {
    return 'Si hemos adjuntado tu carnet de socio a este email, guardalo bien. Tambien puedes acceder a tu carnet digital desde nuestra web.';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
