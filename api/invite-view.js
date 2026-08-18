import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'code required' });

  const { data, error } = await supabase
    .from('invitations')
    .select(`
      invite_code, guest_name, guest_email, plus_one, table_number, status,
      event:invitation_events(name, date, event_time, venue, city, dress_code)
    `)
    .eq('invite_code', code.toUpperCase())
    .single();

  if (error || !data) return res.status(404).json({ error: 'Not found' });

  const ev = data.event || {};
  res.status(200).json({
    invite_code:  data.invite_code,
    guest_name:   data.guest_name,
    plus_one:     data.plus_one,
    table_number: data.table_number,
    status:       data.status,
    event_name:   ev.name,
    event_date:   ev.date,
    event_time:   ev.event_time,
    event_venue:  ev.venue,
    event_city:   ev.city,
    dress_code:   ev.dress_code
  });
}
