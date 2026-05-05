// Claude API proxy — gated by Supabase JWT so randoms can't burn credits.

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY || !ANTHROPIC_KEY) {
      return res.status(500).json({ error: 'Server misconfigured: missing env vars' });
    }

    // Verify caller is logged-in Supabase user with confirmed email
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing auth token' });

    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${token}`, 'apikey': SERVICE_KEY },
    });
    if (!userRes.ok) return res.status(401).json({ error: 'Invalid session' });
    const caller = await userRes.json();
    if (!caller?.email_confirmed_at) {
      return res.status(403).json({ error: 'Email not confirmed' });
    }

    // Forward to Anthropic
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to call Anthropic API', details: error.message });
  }
}
