-- ============================================================
-- DropRun — Supabase SQL Schema  (v3 — Auth & public access)
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- ── TABLES ──────────────────────────────────────────────────

create table if not exists users (
  id               uuid primary key default gen_random_uuid(),
  phone            text unique not null,
  password_hash    text not null,
  display_name     text not null,
  created_at       bigint not null
);

create table if not exists rooms (
  room_code        text primary key,
  captain_uid      text not null,
  captain_name     text not null,
  captain_upi      text not null,
  building         text not null,
  platform         text not null,
  status           text not null default 'open',
  expiry_time      bigint not null,
  threshold        int  not null default 200,
  delivery_fee     int  not null default 30,
  total_cart_value int  not null default 0,
  member_count     int  not null default 1,
  created_at       bigint not null
);

create table if not exists items (
  id             uuid primary key default gen_random_uuid(),
  room_code      text not null references rooms(room_code) on delete cascade,
  member_uid     text not null,
  member_name    text not null,
  item_link      text not null,
  item_name      text not null,
  price          int  not null,
  quantity       int  not null,
  subtotal       int  not null,
  oos_preference text not null default 'substitute',
  status         text not null default 'pending',
  submitted_at   bigint not null
);

create table if not exists payments (
  id             uuid primary key default gen_random_uuid(),
  room_code      text not null references rooms(room_code) on delete cascade,
  member_uid     text not null,
  member_name    text not null,
  payment_status text not null default 'pending',
  unique (room_code, member_uid)
);

-- ── REALTIME ────────────────────────────────────────────────
alter publication supabase_realtime add table users;
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table items;
alter publication supabase_realtime add table payments;

-- ── ATOMIC RPC FUNCTIONS ────────────────────────────────────

create or replace function increment_member_count(p_room_code text)
returns void language plpgsql security definer as $$
begin
  update rooms set member_count = member_count + 1
  where room_code = p_room_code;
end;
$$;

create or replace function add_to_cart_value(p_room_code text, p_amount int)
returns void language plpgsql security definer as $$
begin
  update rooms set total_cart_value = total_cart_value + p_amount
  where room_code = p_room_code;
end;
$$;

-- ── ROW LEVEL SECURITY — public access ──────────────────────

alter table users    enable row level security;
alter table rooms    enable row level security;
alter table items    enable row level security;
alter table payments enable row level security;

-- Users
create policy "Anon read users"   on users for select using (true);
create policy "Anon insert users" on users for insert with check (true);

-- Rooms
create policy "Anon read rooms"   on rooms for select using (true);
create policy "Anon insert rooms" on rooms for insert with check (true);
create policy "Anon update rooms" on rooms for update using (true);

-- Items
create policy "Anon read items"   on items for select using (true);
create policy "Anon insert items" on items for insert with check (true);
create policy "Anon update items" on items for update using (true);

-- Payments
create policy "Anon read payments"   on payments for select using (true);
create policy "Anon insert payments" on payments for insert with check (true);
create policy "Anon update payments" on payments for update using (true);
