const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const q = (req.query.q || '').trim();
    if (q.length < 2) {
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

    if (words.length === 0) {
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
            name: `${p.first_name} ${p.last_name}`,
            category: p.category_primary || '',
            status: p.status
        }))
    });
};
