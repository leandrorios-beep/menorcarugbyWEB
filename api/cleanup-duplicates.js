const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Duplicate records without numero_socio (identified 2026-03-25)
    const duplicateIds = [
        '20ae95c0-bcb4-45e2-b016-04bc01cbe309', // Ana Maria Fuxa Barro (dup of #8)
        '3453ffd6-f82a-49aa-8662-9a2644d4a4ab', // Lucia Hernandez (dup of #15)
        '3ae44f79-5f43-4f05-b54b-9ac715125744', // Miriam Lotito (dup of #17)
        '3e1aca17-1b75-4082-a6ad-0a3e3b160835', // David Mercadal Gomila (dup of #18)
        '42c39b70-e88f-4c35-b357-30378f684e54', // Llui Arguimbau Enrich (dup of #14)
        '47f62fad-4732-4322-8621-1b9491a509f8', // Michael Morris (dup of #7)
        '525e70f5-d2d6-4501-9435-3ba177ce6038', // Michael Morris (dup of #7)
        '7b29c532-27a4-4287-9265-ff836aa55fa5', // Lucia Hernandez (dup of #15)
        '9d1a7379-897b-4a91-8db0-eafe46db1601', // Michael Morris (dup of #7)
        'be4a6c07-e59f-4102-be8e-d605b778bd59', // Lucia Hernandez (dup of #15)
    ];

    const { data, error } = await supabase
        .from('socios')
        .delete()
        .in('id', duplicateIds)
        .select('id');

    if (error) {
        console.error('Delete error:', error);
        return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
        deleted: data ? data.length : 0,
        ids: duplicateIds
    });
};
