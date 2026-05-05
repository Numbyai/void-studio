module.exports = async function handler(req, res) {
  const cronAuth = req.headers.authorization || '';
  if (process.env.CRON_SECRET && cronAuth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return res.status(500).json({ error: 'Missing env vars' });
    }

    const r = await fetch(`${SUPABASE_URL}/rest/v1/projects?select=id&limit=1`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    });

    return res.status(200).json({
      ok: true,
      pinged_at: new Date().toISOString(),
      status: r.status,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Ping failed', details: err.message });
  }
};
