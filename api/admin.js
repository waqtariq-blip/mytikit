import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function isAuthorized(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  return token === ADMIN_PASSWORD;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // GET /api/admin — fetch all bookings + inventory
  if (req.method === 'GET') {
    const [bookingsResult, inventoryResult] = await Promise.all([
      supabase.rpc('admin_get_bookings'),
      supabase.rpc('admin_get_inventory')
    ]);

    if (bookingsResult.error) return res.status(500).json({ error: bookingsResult.error.message });
    if (inventoryResult.error) return res.status(500).json({ error: inventoryResult.error.message });

    return res.status(200).json({
      bookings:  bookingsResult.data  || [],
      inventory: inventoryResult.data || []
    });
  }

  // POST /api/admin — verify a booking
  if (req.method === 'POST') {
    const { action, booking_ref } = req.body;

    if (action === 'verify' && booking_ref) {
      const { data, error } = await supabase.rpc('admin_verify_booking', {
        p_booking_ref: booking_ref
      });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
