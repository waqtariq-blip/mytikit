import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { booking_ref, txn_ref } = req.body;
  if (!booking_ref || !txn_ref) return res.status(400).json({ error: 'Missing fields' });

  const { data, error } = await supabase.rpc('submit_payment', {
    p_booking_ref: booking_ref,
    p_txn_ref:     txn_ref
  });

  if (error) return res.status(500).json({ error: error.message });
  if (!data.success) return res.status(404).json({ error: data.error });

  res.status(200).json({ success: true });
}
