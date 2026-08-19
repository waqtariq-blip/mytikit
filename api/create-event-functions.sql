-- ─── Event Creation Admin Functions ──────────────────────────────
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────

-- Create a ticketing event with ticket tiers in one call
create or replace function admin_create_ticketing_event(
  p_slug        text,
  p_name        text,
  p_category    text,
  p_city        text,
  p_venue       text,
  p_event_date  date,
  p_event_time  text,
  p_doors_time  text,
  p_description text,
  p_image_class text,
  p_tiers       jsonb  -- array of {name, price, description, total_capacity, sort_order}
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_event_id uuid;
  v_tier     jsonb;
begin
  -- Check slug is unique
  if exists (select 1 from events where slug = p_slug) then
    return jsonb_build_object('success', false, 'error', 'An event with this slug already exists');
  end if;

  -- Insert event
  insert into events (slug, name, category, city, venue, event_date, event_time, doors_time, description, image_class, active)
  values (p_slug, p_name, p_category, p_city, p_venue, p_event_date, p_event_time, p_doors_time, p_description, p_image_class, true)
  returning id into v_event_id;

  -- Insert ticket tiers
  for v_tier in select * from jsonb_array_elements(p_tiers)
  loop
    insert into ticket_types (event_id, name, price, description, total_capacity, sort_order, active)
    values (
      v_event_id,
      v_tier->>'name',
      (v_tier->>'price')::integer,
      v_tier->>'description',
      (v_tier->>'total_capacity')::integer,
      (v_tier->>'sort_order')::integer,
      true
    );
  end loop;

  return jsonb_build_object('success', true, 'event_id', v_event_id, 'slug', p_slug);
end;
$$;

-- Create an invitation event
create or replace function admin_create_invitation_event(
  p_slug        text,
  p_name        text,
  p_city        text,
  p_venue       text,
  p_date        date,
  p_event_time  text,
  p_dress_code  text,
  p_description text
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  if exists (select 1 from invitation_events where slug = p_slug) then
    return jsonb_build_object('success', false, 'error', 'An event with this slug already exists');
  end if;

  insert into invitation_events (slug, name, city, venue, date, event_time, dress_code, description, active)
  values (p_slug, p_name, p_city, p_venue, p_date, p_event_time, p_dress_code, p_description, true)
  returning id into v_id;

  return jsonb_build_object('success', true, 'event_id', v_id, 'slug', p_slug);
end;
$$;

-- Get all events (ticketing + invitation) for admin overview
create or replace function admin_get_all_events()
returns jsonb
language plpgsql
security definer
as $$
begin
  return jsonb_build_object(
    'ticketing', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', e.id, 'slug', e.slug, 'name', e.name,
          'category', e.category, 'city', e.city, 'venue', e.venue,
          'event_date', e.event_date, 'event_time', e.event_time,
          'active', e.active, 'image_class', e.image_class,
          'total_bookings', (select count(*) from bookings b where b.event_id = e.id),
          'total_revenue',  (select coalesce(sum(total_amount),0) from bookings b where b.event_id = e.id and b.status = 'verified'),
          'tiers', (
            select coalesce(jsonb_agg(jsonb_build_object(
              'name', tt.name, 'price', tt.price,
              'total_capacity', tt.total_capacity, 'sold_count', tt.sold_count
            ) order by tt.sort_order), '[]'::jsonb)
            from ticket_types tt where tt.event_id = e.id
          )
        ) order by e.event_date desc
      ), '[]'::jsonb)
      from events e
    ),
    'invitation', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', ie.id, 'slug', ie.slug, 'name', ie.name,
          'city', ie.city, 'venue', ie.venue, 'date', ie.date,
          'event_time', ie.event_time, 'dress_code', ie.dress_code,
          'active', ie.active,
          'total_guests',    (select count(*) from invitations i where i.event_id = ie.id),
          'total_sent',      (select count(*) from invitations i where i.event_id = ie.id and i.status != 'pending'),
          'total_checkedin', (select count(*) from invitations i where i.event_id = ie.id and i.status = 'checked_in')
        ) order by ie.date desc
      ), '[]'::jsonb)
      from invitation_events ie
    )
  );
end;
$$;
