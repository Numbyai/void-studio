// Admin API: verifies caller is admin via JWT, then performs Supabase admin actions.
// Uses service_role key (server-only). Never expose this key to the client.

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return res.status(500).json({ error: 'Server misconfigured: missing Supabase env vars' });
    }

    // 1. Verify caller is logged in and is admin via their JWT
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing auth token' });

    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${token}`, 'apikey': SERVICE_KEY },
    });
    if (!userRes.ok) return res.status(401).json({ error: 'Invalid session' });
    const caller = await userRes.json();
    if (caller?.user_metadata?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: not an admin' });
    }

    // 2. Parse body
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { action, userId } = body || {};

    const adminHeaders = {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    };
    const ADMIN_BASE = `${SUPABASE_URL}/auth/v1/admin/users`;

    // 3. Dispatch
    if (action === 'list') {
      const r = await fetch(`${ADMIN_BASE}?per_page=200`, { headers: adminHeaders });
      const data = await r.json();
      return res.status(200).json({ users: data.users || [] });
    }

    if (!userId) return res.status(400).json({ error: 'userId required' });

    if (action === 'reset') {
      // Get user email first
      const ur = await fetch(`${ADMIN_BASE}/${userId}`, { headers: adminHeaders });
      const user = await ur.json();
      if (!user.email) return res.status(400).json({ error: 'No email on user' });
      const r = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ email: user.email }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        return res.status(r.status).json({ error: err.msg || 'Reset failed' });
      }
      return res.status(200).json({ ok: true });
    }

    if (action === 'promote' || action === 'demote') {
      const role = action === 'promote' ? 'admin' : null;
      const r = await fetch(`${ADMIN_BASE}/${userId}`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ user_metadata: { role } }),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.msg || 'Update failed' });
      return res.status(200).json({ ok: true });
    }

    if (action === 'disable') {
      const r = await fetch(`${ADMIN_BASE}/${userId}`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ ban_duration: '876000h' }), // 100 years
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.msg || 'Disable failed' });
      return res.status(200).json({ ok: true });
    }

    if (action === 'enable') {
      const r = await fetch(`${ADMIN_BASE}/${userId}`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ ban_duration: 'none' }),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.msg || 'Enable failed' });
      return res.status(200).json({ ok: true });
    }

    if (action === 'delete') {
      // Don't let admin delete themselves
      if (userId === caller.id) return res.status(400).json({ error: 'Cannot delete yourself' });
      const r = await fetch(`${ADMIN_BASE}/${userId}`, {
        method: 'DELETE',
        headers: adminHeaders,
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        return res.status(r.status).json({ error: err.msg || 'Delete failed' });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};
