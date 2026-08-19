import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function isAuthorized(req) {
  return (req.headers['authorization'] || '').replace('Bearer ', '').trim() === ADMIN_PASSWORD;
}

function slugify(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  // GET — list all events
  if (req.method === 'GET') {
    const { data, error } = await supabase.rpc('admin_get_all_events');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // POST — create event
  if (req.method === 'POST') {
    const { type } = req.body;

    if (type === 'ticketing') {
      const { name, category, city, venue, event_date, event_time,
              doors_time, description, image_class, tiers, slug: customSlug } = req.body;

      if (!name || !venue || !event_date || !tiers?.length)
        return res.status(400).json({ error: 'Missing required fields' });

      const slug = customSlug || slugify(name);

      const { data, error } = await supabase.rpc('admin_create_ticketing_event', {
        p_slug:        slug,
        p_name:        name,
        p_category:    category || 'Event',
        p_city:        city || 'Karachi',
        p_venue:       venue,
        p_event_date:  event_date,
        p_event_time:  event_time || '8:00 PM',
        p_doors_time:  doors_time || '7:00 PM',
        p_description: description || '',
        p_image_class: image_class || 'green',
        p_tiers:       tiers
      });

      if (error) return res.status(500).json({ error: error.message });
      if (!data.success) return res.status(400).json({ error: data.error });
      return res.status(201).json(data);
    }

    if (type === 'invitation') {
      const { name, city, venue, date, event_time, dress_code, description, slug: customSlug } = req.body;

      if (!name || !venue || !date)
        return res.status(400).json({ error: 'Missing required fields' });

      const slug = customSlug || slugify(name);

      const { data, error } = await supabase.rpc('admin_create_invitation_event', {
        p_slug:        slug,
        p_name:        name,
        p_city:        city || 'Karachi',
        p_venue:       venue,
        p_date:        date,
        p_event_time:  event_time || '7:00 PM',
        p_dress_code:  dress_code || 'Formal',
        p_description: description || ''
      });

      if (error) return res.status(500).json({ error: error.message });
      if (!data.success) return res.status(400).json({ error: data.error });
      return res.status(201).json(data);
    }

    return res.status(400).json({ error: 'Invalid event type' });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
