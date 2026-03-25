const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { nombre, apellido, documento, email, tipo_socio, foto_url, stripe_link, familiar_de } = req.body;

    if (!nombre || !apellido || !documento || !email || !tipo_socio) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const docNormalized = documento.trim().replace(/\s+/g, '');

    // Check for existing socio by documento (case-insensitive)
    const { data: existing, error: selectError } = await supabase
        .from('socios')
        .select('id, numero_socio, estado_pago, tipo_socio')
        .ilike('documento', docNormalized)
        .order('numero_socio', { ascending: true, nullsFirst: false })
        .limit(1);

    if (selectError) {
        console.error('Select error:', selectError);
        return res.status(500).json({ error: 'Database error' });
    }

    let isExisting = false;
    let socioId = null;
    let estadoPago = 'pendiente';

    if (existing && existing.length > 0) {
        isExisting = true;
        socioId = existing[0].id;
        estadoPago = existing[0].estado_pago;

        // If socio already has numero_socio, they're confirmed — don't allow
        // public form to overwrite their data (only admin can edit confirmed socios)
        if (existing[0].numero_socio) {
            return res.status(200).json({
                success: true,
                existing: true,
                socio_id: socioId,
                estado_pago: estadoPago,
            });
        }

        // Socio exists but is still pending (no numero_socio) — update allowed
        const updateData = {
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            email: email.trim(),
            tipo_socio,
        };

        if (foto_url) updateData.foto_url = foto_url;
        if (stripe_link) updateData.stripe_link = stripe_link;
        if (familiar_de) updateData.familiar_de = familiar_de;

        // Familiar type: auto-assign number and mark as completed
        if (tipo_socio === 'familiar') {
            const { data: maxData } = await supabase
                .from('socios')
                .select('numero_socio')
                .not('numero_socio', 'is', null)
                .order('numero_socio', { ascending: false })
                .limit(1)
                .single();
            updateData.numero_socio = (maxData?.numero_socio || 0) + 1;
            updateData.estado_pago = 'completado';
            estadoPago = 'completado';
        }

        const { error: updateError } = await supabase
            .from('socios')
            .update(updateData)
            .eq('id', socioId);

        if (updateError) {
            console.error('Update error:', updateError);
            return res.status(500).json({ error: 'Database error' });
        }
    } else {
        // Auto-assign next numero_socio for familiar type (free, no payment needed)
        let nextNumero = null;
        if (tipo_socio === 'familiar') {
            const { data: maxData } = await supabase
                .from('socios')
                .select('numero_socio')
                .not('numero_socio', 'is', null)
                .order('numero_socio', { ascending: false })
                .limit(1)
                .single();
            nextNumero = (maxData?.numero_socio || 0) + 1;
        }

        // Insert new record
        const insertData = {
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            documento: documento.trim(),
            email: email.trim(),
            tipo_socio,
            foto_url: foto_url || null,
            stripe_link: stripe_link || null,
            familiar_de: familiar_de || null,
        };

        // Familiar type: free membership, auto-complete
        if (tipo_socio === 'familiar') {
            insertData.estado_pago = 'completado';
            insertData.numero_socio = nextNumero;
        }

        const { data: insertResult, error: insertError } = await supabase
            .from('socios')
            .insert(insertData)
            .select('id, numero_socio')
            .single();

        if (insertError) {
            console.error('Insert error:', insertError);
            return res.status(500).json({ error: 'Database error' });
        }

        socioId = insertResult.id;
        if (tipo_socio === 'familiar') {
            estadoPago = 'completado';
        }
    }

    return res.status(200).json({
        success: true,
        existing: isExisting,
        socio_id: socioId,
        estado_pago: estadoPago,
    });
};
