-- Jalankan di Supabase > SQL Editor
create table kb(id int primary key, data jsonb not null, updated_at timestamptz default now());
create table riwayat(id bigserial primary key, nama text, tanaman text, hasil jsonb, created_at timestamptz default now());
alter table kb enable row level security;
alter table riwayat enable row level security;
create policy "semua baca kb" on kb for select using (true);
create policy "admin tulis kb" on kb for all to authenticated using (true) with check (true);
create policy "petani kirim riwayat" on riwayat for insert with check (true);
create policy "admin baca riwayat" on riwayat for select to authenticated using (true);
