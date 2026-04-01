const { createClient } = require('@supabase/supabase-js');
const { generatePassword, hashPassword } = require('./_lib/auth');
const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email requerido' });

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Find socio by email (case-insensitive)
    const { data: socios, error: selectError } = await supabase
        .from('socios')
        .select('id, nombre, apellido, email, numero_socio')
        .ilike('email', email.trim())
        .limit(1);

    if (selectError) {
        console.error('Forgot-password select error:', selectError);
        return res.status(500).json({ error: 'Error de base de datos' });
    }

    // Always return success to avoid email enumeration
    if (!socios || socios.length === 0) {
        return res.status(200).json({ success: true });
    }

    const socio = socios[0];
    const newPassword = generatePassword();
    const hash = hashPassword(newPassword);

    // Update password in DB
    const { error: updateError } = await supabase
        .from('socios')
        .update({ password_hash: hash })
        .eq('id', socio.id);

    if (updateError) {
        console.error('Forgot-password update error:', updateError);
        return res.status(500).json({ error: 'Error al actualizar contraseña' });
    }

    // Send email with new password
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
            }
        });

        await transporter.sendMail({
            from: `"Menorca Rugby Club" <${process.env.GMAIL_USER}>`,
            to: socio.email,
            subject: 'Tu nueva contraseña - Menorca Rugby Club',
            html: buildResetEmail(socio.nombre, newPassword)
        });
    } catch (emailErr) {
        console.error('Forgot-password email error:', emailErr);
        // Password was already changed — don't leak that the email failed
    }

    return res.status(200).json({ success: true });
};

function buildResetEmail(nombre, password) {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

    <!-- Header -->
    <tr><td style="background:#182B49;padding:25px 40px;text-align:center;">
        <img src="https://www.menorcarugbyclub.com/assets/images/static/logo.png" alt="MRC" width="60" style="background:#fff;border-radius:50%;padding:6px;">
        <h1 style="color:#FFC72C;font-size:20px;margin:10px 0 0;">MENORCA RUGBY CLUB</h1>
    </td></tr>

    <!-- Body -->
    <tr><td style="padding:30px 40px;">
        <h2 style="color:#182B49;font-size:20px;margin:0 0 15px;">Hola ${escapeHtml(nombre)},</h2>
        <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 20px;">
            Hemos generado una nueva contraseña para tu cuenta en la Zona de Socios.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;border:2px solid #FFC72C;">
            <tr><td style="padding:20px;text-align:center;">
                <p style="color:#666;font-size:13px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Tu nueva contraseña</p>
                <p style="color:#182B49;font-size:28px;font-weight:700;margin:0;font-family:'Courier New',monospace;letter-spacing:2px;">${escapeHtml(password)}</p>
            </td></tr>
        </table>
        <p style="color:#333;font-size:15px;line-height:1.6;margin:20px 0 0;">
            Accede a tu zona de socio y cambia la contraseña desde <strong>Seguridad</strong>.
        </p>
        <div style="text-align:center;margin:25px 0 10px;">
            <a href="https://www.menorcarugbyclub.com/mi-carnet" style="display:inline-block;background:#FFC72C;color:#182B49;padding:12px 30px;border-radius:8px;font-weight:700;text-decoration:none;font-size:15px;">Ir a Mi Carnet</a>
        </div>
    </td></tr>

    <!-- Footer -->
    <tr><td style="background:#182B49;padding:20px 40px;text-align:center;">
        <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0;">
            Si no solicitaste este cambio, contacta con nosotros en info@menorcarugbyclub.com
        </p>
    </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
