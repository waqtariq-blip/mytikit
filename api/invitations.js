import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'invites@mytikit.pk';
const BASE_URL = process.env.BASE_URL || 'https://mytikitpk.vercel.app';

function isAuthorized(req) {
  return (req.headers['authorization'] || '').replace('Bearer ', '').trim() === ADMIN_PASSWORD;
}

async function sendInviteEmail(invite, event) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${invite.invite_code}&size=200x200&color=06291a&bgcolor=ffffff&margin=10`;
  const invitePageUrl = `${BASE_URL}/invite.html?code=${invite.invite_code}`;
  const dateStr = new Date(event.date).toLocaleDateString('en-PK', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#06291A;padding:40px;text-align:center;">
    <div style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b9e80;margin-bottom:16px;">mytikit.pk presents</div>
    <div style="font-size:26px;font-weight:800;color:#fff;line-height:1.2;">${event.name}</div>
  </div>
  <div style="background:#fdf8f0;border-bottom:1px solid #ede5d0;padding:14px 40px;text-align:center;">
    <span style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#c4731a;">You are cordially invited</span>
  </div>
  <div style="padding:32px 40px;">
    <p style="font-size:16px;color:#555;margin-bottom:24px;line-height:1.6;">
      Dear <strong style="color:#111;">${invite.guest_name}</strong>,<br><br>
      You have been personally invited to attend an exclusive evening.${invite.plus_one ? ' Your invitation includes a guest (+1).' : ''}
    </p>
    <div style="background:#f9f9f7;border:1px solid #e8e8e8;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:11px;font-weight:700;text-transform:uppercase;color:#aaa;width:90px;">Date</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;font-weight:600;color:#111;">${dateStr}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:11px;font-weight:700;text-transform:uppercase;color:#aaa;">Time</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;font-weight:600;color:#111;">${event.event_time}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:11px;font-weight:700;text-transform:uppercase;color:#aaa;">Venue</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;font-weight:600;color:#111;">${event.venue}, ${event.city}</td></tr>
        <tr><td style="padding:8px 0;font-size:11px;font-weight:700;text-transform:uppercase;color:#aaa;">Dress</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#111;">${event.dress_code || 'Formal'}</td></tr>
        ${invite.table_number ? `<tr><td style="padding:8px 0;border-top:1px solid #eee;font-size:11px;font-weight:700;text-transform:uppercase;color:#aaa;">Table</td><td style="padding:8px 0;border-top:1px solid #eee;font-size:14px;font-weight:700;color:#06291A;">${invite.table_number}</td></tr>` : ''}
      </table>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#888;margin-bottom:12px;">Your entrance QR code</div>
      <div style="display:inline-block;border:1.5px solid #e8e8e8;border-radius:12px;padding:14px;">
        <img src="${qrUrl}" alt="QR" width="160" height="160" style="display:block;">
      </div>
      <div style="margin-top:10px;font-size:13px;font-weight:800;color:#06291A;letter-spacing:2px;">${invite.invite_code}</div>
      <div style="margin-top:4px;font-size:12px;color:#888;">Show this at the entrance</div>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${invitePageUrl}" style="display:inline-block;background:#06291A;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:8px;">View full invitation</a>
    </div>
    <p style="font-size:12px;color:#aaa;line-height:1.6;border-top:1px solid #eee;padding-top:16px;">This invitation is personal and non-transferable. Please bring a valid ID. Do not share this QR code.</p>
  </div>
  <div style="background:#f5f5f0;padding:18px 40px;text-align:center;">
    <div style="font-size:13px;font-weight:700;color:#06291A;">mytikit.pk</div>
    <div style="font-size:11px;color:#aaa;margin-top:2px;">Pakistan's ticketing platform</div>
  </div>
</div>
</body></html>`;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `mytikit Invitations <${FROM_EMAIL}>`, to: invite.guest_email, subject: `Your invitation to ${event.name}`, html })
  });
  return r.ok;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { action } = req.query;

  if (req.method === 'GET' && action === 'events') {
    const { data, error } = await supabase.from('invitation_events').select('*').eq('active', true);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'GET' && action === 'list') {
    const { data, error } = await supabase.rpc('admin_get_invitations', { p_event_id: req.query.event_id });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST' && action === 'create') {
    const { event_id, guest_name, guest_email, guest_phone, plus_one, table_number } = req.body;
    const { data, error } = await supabase.rpc('admin_create_invitation', {
      p_event_id: event_id, p_guest_name: guest_name, p_guest_email: guest_email,
      p_guest_phone: guest_phone || null, p_plus_one: plus_one || false, p_table_number: table_number || null
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  if (req.method === 'POST' && action === 'send') {
    const { invite_code, event_id } = req.body;
    const [{ data: inv }, { data: ev }] = await Promise.all([
      supabase.from('invitations').select('*').eq('invite_code', invite_code).single(),
      supabase.from('invitation_events').select('*').eq('id', event_id).single()
    ]);
    if (!inv || !ev) return res.status(404).json({ error: 'Not found' });
    const sent = await sendInviteEmail(inv, ev);
    if (!sent) return res.status(500).json({ error: 'Email failed' });
    await supabase.rpc('admin_mark_sent', { p_invite_code: invite_code });
    return res.status(200).json({ success: true });
  }

  if (req.method === 'POST' && action === 'send_all') {
    const { event_id } = req.body;
    const [{ data: invites }, { data: event }] = await Promise.all([
      supabase.from('invitations').select('*').eq('event_id', event_id).eq('status', 'pending'),
      supabase.from('invitation_events').select('*').eq('id', event_id).single()
    ]);
    if (!invites?.length) return res.status(200).json({ success: true, sent: 0 });
    let sent = 0;
    for (const inv of invites) {
      const ok = await sendInviteEmail(inv, event);
      if (ok) { await supabase.rpc('admin_mark_sent', { p_invite_code: inv.invite_code }); sent++; }
      await new Promise(r => setTimeout(r, 150));
    }
    return res.status(200).json({ success: true, sent });
  }

  if (req.method === 'DELETE' && action === 'delete') {
    await supabase.rpc('admin_delete_invitation', { p_id: req.body.id });
    return res.status(200).json({ success: true });
  }

  res.status(400).json({ error: 'Unknown action' });
}
