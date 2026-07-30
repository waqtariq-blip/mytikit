import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

function generateRef(phone, eventSlug) {
  const seed = eventSlug + phone + Date.now();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'MYT-';
  let n = Math.abs(hash);
  for (let i = 0; i < 6; i++) {
    ref += chars[n % chars.length];
    n = Math.floor(n / chars.length);
  }
  return ref;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET /api/bookings?ref=MYT-XXXXXX — fetch booking for confirmation page
  if (req.method === 'GET') {
    const { ref } = req.query;
    if (!ref) return res.status(400).json({ error: 'ref required' });

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        event:events(slug, name, category, city, venue, event_date, event_time, image_class),
        items:booking_items(quantity, unit_price, subtotal, ticket_type:ticket_types(name))
      `)
      .eq('booking_ref', ref)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Booking not found' });
    return res.status(200).json(data);
  }

  // POST /api/bookings — create new booking
  if (req.method === 'POST') {
    const { event_slug, fname, lname, phone, email, cnic, items } = req.body;

    if (!event_slug || !fname || !lname || !phone || !email || !cnic || !items?.length) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get event ID
    const { data: event, error: evErr } = await supabase
      .from('events')
      .select('id, slug')
      .eq('slug', event_slug)
      .single();

    if (evErr || !event) return res.status(404).json({ error: 'Event not found' });

    // Calculate totals
    const subtotal = items.reduce((sum, i) => sum + (i.unit_price * i.quantity), 0);
    const fee = Math.round(subtotal * 0.025);
    const total = subtotal + fee;
    const booking_ref = generateRef(phone, event_slug);

    // Call atomic booking function
    const { data: result, error: fnErr } = await supabase.rpc('create_booking', {
      p_booking_ref:  booking_ref,
      p_event_id:     event.id,
      p_fname:        fname,
      p_lname:        lname,
      p_phone:        phone,
      p_email:        email,
      p_cnic:         cnic,
      p_total_amount: total,
      p_fee_amount:   fee,
      p_items:        items
    });

    if (fnErr) return res.status(500).json({ error: fnErr.message });
    if (!result.success) return res.status(409).json({ error: result.error });

    return res.status(201).json({
      booking_ref,
      total,
      fee,
      event_slug
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
