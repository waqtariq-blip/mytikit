import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'invites@mytikit.pk';
const BASE_URL = process.env.BASE_URL || 'https://mytikitpk.vercel.app';

function isAuthorized(req) {
  return (req.headers['authorization'] || '').replace('Bearer ', '').trim() === ADMIN_PASSWORD;
}

// ============================================================================
// White-label invitation email. Branding comes from the event row:
//   brand_theme ('light'|'dark'), brand_accent (hex), brand_logo_url,
//   brand_tagline, presenter. Defaults reproduce the original mytikit look,
//   so every non-branded event is unchanged.
// ============================================================================
function buildLightEmail(invite, event, b) {
  const accent = b.accent;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${invite.invite_code}&size=200x200&color=${accent.replace('#','')}&bgcolor=ffffff&margin=10`;
  const invitePageUrl = `${BASE_URL}/invite.html?code=${invite.invite_code}`;
  const dateStr = new Date(event.date).toLocaleDateString('en-PK', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const logo = b.logo ? `<img src="${b.logo}" alt="" width="150" style="display:block;margin:0 auto 14px;max-height:48px;width:auto;">` : '';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:${accent};padding:40px;text-align:center;">
    ${logo}
    <div style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.72);margin-bottom:16px;">${b.presenter}</div>
    <div style="font-size:26px;font-weight:800;color:#fff;line-height:1.2;">${event.name}</div>
  </div>
  <div style="background:#fdf8f0;border-bottom:1px solid #ede5d0;padding:14px 40px;text-align:center;">
    <span style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${accent};">You are cordially invited</span>
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
        ${invite.table_number ? `<tr><td style="padding:8px 0;border-top:1px solid #eee;font-size:11px;font-weight:700;text-transform:uppercase;color:#aaa;">Seating</td><td style="padding:8px 0;border-top:1px solid #eee;font-size:14px;font-weight:700;color:${accent};">${invite.table_number}</td></tr>` : ''}
      </table>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#888;margin-bottom:12px;">Your entrance QR code</div>
      <div style="display:inline-block;border:1.5px solid #e8e8e8;border-radius:12px;padding:14px;">
        <img src="${qrUrl}" alt="QR" width="160" height="160" style="display:block;">
      </div>
      <div style="margin-top:10px;font-size:13px;font-weight:800;color:${accent};letter-spacing:2px;">${invite.invite_code}</div>
      <div style="margin-top:4px;font-size:12px;color:#888;">Show this at the entrance</div>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${invitePageUrl}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:8px;">View full invitation</a>
    </div>
    ${b.tagline ? `<p style="text-align:center;font-style:italic;font-size:15px;color:#777;margin-bottom:18px;">${b.tagline}</p>` : ''}
    <p style="font-size:12px;color:#aaa;line-height:1.6;border-top:1px solid #eee;padding-top:16px;">This invitation is personal and non-transferable. Please bring a valid ID. Do not share this QR code.</p>
  </div>
  <div style="background:#f5f5f0;padding:18px 40px;text-align:center;">
    <div style="font-size:13px;font-weight:700;color:${accent};">${event.name}</div>
    <div style="font-size:11px;color:#aaa;margin-top:2px;">Invitation only · Powered by mytikit</div>
  </div>
</div>
</body></html>`;
}

function buildDarkEmail(invite, event, b) {
  const accent = b.accent;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${invite.invite_code}&size=200x200&color=000000&bgcolor=ffffff&margin=10`;
  const invitePageUrl = `${BASE_URL}/invite.html?code=${invite.invite_code}`;
  const dateStr = new Date(event.date).toLocaleDateString('en-PK', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const logo = b.logo
    ? `<img src="${b.logo}" width="196" alt="${event.name}" style="width:196px;max-width:60%;display:block;margin:0 auto;border:0;">`
    : `<div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:34px;color:#fff;font-weight:600;">${event.name}</div>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');</style>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#000;font-size:1px;">You are personally invited to ${event.name}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000" style="background:#000000;">
  <tr><td align="center" style="padding:0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td align="center" style="padding:12px 16px;border-bottom:1px solid #1c1c1c;">
        <span style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#d2d3d5;font-weight:600;">${event.name}&nbsp;&nbsp;<span style="color:${accent};">&bull;</span>&nbsp;&nbsp;Invitation Only&nbsp;&nbsp;<span style="color:${accent};">&bull;</span>&nbsp;&nbsp;${event.name}</span>
      </td></tr>
    </table>
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#000000;">
      <tr><td align="center" style="padding:42px 40px 22px;">${logo}</td></tr>
      <tr><td align="center" style="padding:0 40px 6px;">
        <span style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:${accent};font-weight:600;">${b.presenter}</span>
      </td></tr>
      <tr><td align="center" style="padding:12px 40px 0;">
        <span style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#d2d3d5;font-weight:500;">${dateStr}</span>
      </td></tr>
      <tr><td style="padding:28px 40px 0;"><div style="height:1px;font-size:0;line-height:1px;background:#1c1c1c;">&nbsp;</div></td></tr>
      <tr><td style="padding:26px 40px 0;">
        <p style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:24px;line-height:30px;color:#ffffff;font-weight:500;">Dear ${invite.guest_name},</p>
        <p style="margin:0;font-size:15px;line-height:26px;color:#c9c9cc;">You have been personally invited to attend an exclusive evening at ${event.name}.${invite.plus_one ? ' Your invitation includes a guest (+1).' : ''} Your admission is personal to you and non-transferable.</p>
      </td></tr>
      <tr><td style="padding:24px 40px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #1f1f1f;border-radius:4px;">
          <tr><td style="padding:8px 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="padding:12px 0;border-bottom:1px solid #1a1a1a;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#7E797E;width:96px;">Date</td><td style="padding:12px 0;border-bottom:1px solid #1a1a1a;font-size:14px;font-weight:600;color:#ffffff;">${dateStr}</td></tr>
              <tr><td style="padding:12px 0;border-bottom:1px solid #1a1a1a;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#7E797E;">Time</td><td style="padding:12px 0;border-bottom:1px solid #1a1a1a;font-size:14px;font-weight:600;color:#ffffff;">${event.event_time}</td></tr>
              <tr><td style="padding:12px 0;border-bottom:1px solid #1a1a1a;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#7E797E;">Venue</td><td style="padding:12px 0;border-bottom:1px solid #1a1a1a;font-size:14px;font-weight:600;color:#ffffff;">${event.venue}, ${event.city}</td></tr>
              <tr><td style="padding:12px 0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#7E797E;${invite.table_number ? 'border-bottom:1px solid #1a1a1a;' : ''}">Dress</td><td style="padding:12px 0;font-size:14px;font-weight:600;color:#ffffff;${invite.table_number ? 'border-bottom:1px solid #1a1a1a;' : ''}">${event.dress_code || 'Formal'}</td></tr>
              ${invite.table_number ? `<tr><td style="padding:12px 0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#7E797E;">Seating</td><td style="padding:12px 0;font-size:14px;font-weight:700;color:${accent};">${invite.table_number}</td></tr>` : ''}
            </table>
          </td></tr>
        </table>
      </td></tr>
      <tr><td align="center" style="padding:30px 40px 0;">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:3px;color:#7E797E;margin-bottom:14px;">Your entrance pass</div>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td align="center" bgcolor="#ffffff" style="background:#ffffff;padding:12px;border-radius:6px;">
          <img src="${qrUrl}" alt="Entrance QR" width="160" height="160" style="display:block;width:160px;height:160px;border:0;">
        </td></tr></table>
        <div style="margin-top:14px;font-size:14px;font-weight:700;color:#ffffff;letter-spacing:3px;">${invite.invite_code}</div>
        <div style="margin-top:6px;font-size:12px;color:#7E797E;">Present this QR at the entrance</div>
      </td></tr>
      <tr><td align="center" style="padding:28px 40px 6px;">
        <a href="${invitePageUrl}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:16px 38px;border-radius:3px;">View full invitation</a>
      </td></tr>
      <tr><td style="padding:30px 40px 0;"><div style="height:1px;font-size:0;line-height:1px;background:#1c1c1c;">&nbsp;</div></td></tr>
      ${b.tagline ? `<tr><td align="center" style="padding:24px 40px 8px;"><span style="font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:18px;color:#d2d3d5;">${b.tagline}</span></td></tr>` : ''}
      <tr><td align="center" style="padding:${b.tagline ? '2px' : '20px'} 40px 30px;">
        <p style="margin:0;font-size:11px;line-height:18px;color:#7E797E;">This invitation is personal and non-transferable. Please bring valid photo ID. Do not share this QR code.</p>
      </td></tr>
    </table>
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#0a0a0a;border-top:1px solid #1c1c1c;">
      <tr><td align="center" style="padding:24px 40px 6px;">
        <span style="font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#ffffff;">${event.name}</span>
      </td></tr>
      <tr><td align="center" style="padding:0 40px 26px;">
        <span style="font-size:10px;letter-spacing:1px;color:#4a4a4a;">A private, invitation-only event · Powered by mytikit</span>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

async function sendInviteEmail(invite, event) {
  const brand = {
    theme:     event.brand_theme || 'light',
    accent:    event.brand_accent || '#06291A',
    logo:      event.brand_logo_url || '',
    tagline:   event.brand_tagline || '',
    presenter: event.presenter || 'mytikit.pk presents'
  };
  const html = brand.theme === 'dark'
    ? buildDarkEmail(invite, event, brand)
    : buildLightEmail(invite, event, brand);

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `${event.name} <${FROM_EMAIL}>`, to: invite.guest_email, subject: `Your invitation to ${event.name}`, html })
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
