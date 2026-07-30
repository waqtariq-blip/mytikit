import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: 'slug required' });

  const { data: event, error: evErr } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .single();

  if (evErr || !event) return res.status(404).json({ error: 'Event not found' });

  const { data: ticketTypes, error: ttErr } = await supabase
    .from('ticket_types')
    .select('id, name, price, description, total_capacity, sold_count')
    .eq('event_id', event.id)
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (ttErr) return res.status(500).json({ error: ttErr.message });

  // Add availability to each ticket type
  const types = ticketTypes.map(t => ({
    ...t,
    available: t.total_capacity - t.sold_count,
    sold_out: t.total_capacity - t.sold_count <= 0
  }));

  res.status(200).json({ ...event, ticket_types: types });
}
