const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Este endpoint es PUBLICO por necesidad: lo usa el alta de socio familiar
    // para vincular al hijo, antes de que exista ninguna cuenta. Pero devuelve
    // nombres de menores, asi que se acota todo lo posible:
    //   - minimo 4 caracteres (antes 2: con "ma" listaba medio club)
    //   - hace falta nombre Y apellido, no una sola palabra suelta
    //   - como mucho 5 resultados
    //   - NO se devuelve la categoria ni el estado: con el nombre alcanza para
    //     elegir de una lista, y la categoria es un dato del menor que no hace
    //     falta para vincular.
    const q = (req.query.q || '').trim();
    if (q.length < 4) {
        return res.status(200).json({ players: [] });
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Sanitize and split into words (keep accented chars, hyphens)
    const words = q
        .split(/\s+/)
        .map(w => w.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑàèìòùÀÈÌÒÙüÜçÇ0-9-]/g, ''))
        .filter(w => w.length >= 2);

    // Exigir al menos dos palabras evita el listado por prefijo.
    if (words.length < 2) {
        return res.status(200).json({ players: [] });
    }

    // Build OR filter: each word matches first_name or last_name (case-insensitive)
    const conditions = words.map(w => {
        const escaped = w.replace(/[%_]/g, '\\$&');
        return `first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%`;
    }).join(',');

    const { data, error } = await supabase
        .from('players')
        .select('player_id, first_name, last_name, category_primary, status')
        .or(conditions)
        .limit(10);

    if (error) {
        console.error('Search error:', error);
        return res.status(500).json({ error: 'Database error' });
    }

    return res.status(200).json({
        players: (data || []).map(p => ({
            id: p.player_id,
            name: `${p.first_name} ${p.last_name}`
        }))
    });
};
