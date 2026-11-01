-- نبض معاً — الجداول وقواعد الحماية
-- الصق الملف كامل في Supabase ← SQL Editor ← New query، واضغط Run. تشغيله مرة ثانية ما يضر.

create extension if not exists pgcrypto;

-- ---------- الجداول ----------
create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  couple_id uuid references public.couples(id) on delete set null,
  name text not null default '',
  sex text not null default 'm',
  color text not null default 'blue',
  photo text,
  age int, height int, weight numeric, start_weight numeric, goal_weight numeric, weeks int,
  activity numeric not null default 1.375,
  target int not null default 2000,
  protein int not null default 120,
  step_goal int not null default 8000,
  hist jsonb not null default '{}',
  weights jsonb not null default '[]',
  health_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.days (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  log jsonb not null default '{}',
  done int[] not null default '{}',
  steps int, active int, rest_hr int, avg_hr int,
  health_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.penalties (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  who uuid not null references auth.users(id) on delete cascade,
  day date not null,
  kcal int not null,
  choice text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  couple_id uuid not null references public.couples(id) on delete cascade,
  code text not null,
  data jsonb not null,
  primary key (couple_id, code)
);

-- ---------- كل مستخدم جديد ياخذ ملف تلقائياً ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- دوال مساعدة ----------
create or replace function public.my_couple() returns uuid
language sql stable security definer set search_path = public as
$$ select couple_id from profiles where id = auth.uid() $$;

create or replace function public.create_couple() returns text
language plpgsql security definer set search_path = public as $$
declare c uuid; k text;
begin
  select couple_id into c from profiles where id = auth.uid();
  if c is not null then return (select code from couples where id = c); end if;
  loop
    k := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    exit when not exists (select 1 from couples where code = k);
  end loop;
  insert into couples (code, created_by) values (k, auth.uid()) returning id into c;
  update profiles set couple_id = c where id = auth.uid();
  return k;
end $$;

create or replace function public.join_couple(p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare c uuid;
begin
  select id into c from couples where code = upper(trim(p_code));
  if c is null then return false; end if;
  if (select count(*) from profiles where couple_id = c and id <> auth.uid()) >= 2 then return false; end if;
  update profiles set couple_id = c where id = auth.uid();
  return true;
end $$;

create or replace function public.my_health_token() returns uuid
language sql stable security definer set search_path = public as
$$ select health_token from profiles where id = auth.uid() $$;

-- اختصار Apple Health يرسل هنا بالرمز السري الخاص بكل شخص
create or replace function public.ingest_health(p_token text, p_steps numeric default null, p_active numeric default null,
                                                p_rest numeric default null, p_avg numeric default null) returns text
language plpgsql security definer set search_path = public as $$
declare u uuid; d date := (now() at time zone 'Asia/Riyadh')::date;
begin
  select id into u from profiles where health_token::text = trim(p_token);
  if u is null then return 'رمز غير صحيح'; end if;
  insert into days (user_id, day, steps, active, rest_hr, avg_hr, health_at)
  values (u, d, round(p_steps), round(p_active), round(p_rest), round(p_avg), now())
  on conflict (user_id, day) do update set
    steps = coalesce(excluded.steps, days.steps), active = coalesce(excluded.active, days.active),
    rest_hr = coalesce(excluded.rest_hr, days.rest_hr), avg_hr = coalesce(excluded.avg_hr, days.avg_hr),
    health_at = now(), updated_at = now();
  return 'تم';
end $$;

-- ---------- قواعد الحماية: كل واحد يشوف نفسه وشريكه بس ----------
alter table public.couples   enable row level security;
alter table public.profiles  enable row level security;
alter table public.days      enable row level security;
alter table public.events    enable row level security;
alter table public.penalties enable row level security;
alter table public.products  enable row level security;

drop policy if exists couples_read on public.couples;
create policy couples_read on public.couples for select to authenticated using (id = my_couple());

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or (couple_id is not null and couple_id = my_couple()));
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists days_read on public.days;
create policy days_read on public.days for select to authenticated
  using (user_id = auth.uid() or user_id in (select id from profiles where couple_id = my_couple()));
drop policy if exists days_insert on public.days;
create policy days_insert on public.days for insert to authenticated with check (user_id = auth.uid());
drop policy if exists days_update on public.days;
create policy days_update on public.days for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists events_read on public.events;
create policy events_read on public.events for select to authenticated using (couple_id = my_couple());
drop policy if exists events_insert on public.events;
create policy events_insert on public.events for insert to authenticated
  with check (user_id = auth.uid() and couple_id = my_couple());

drop policy if exists pen_read on public.penalties;
create policy pen_read on public.penalties for select to authenticated using (couple_id = my_couple());
drop policy if exists pen_insert on public.penalties;
create policy pen_insert on public.penalties for insert to authenticated
  with check (who = auth.uid() and couple_id = my_couple());
drop policy if exists pen_update on public.penalties;
create policy pen_update on public.penalties for update to authenticated
  using (couple_id = my_couple()) with check (couple_id = my_couple());
drop policy if exists pen_delete on public.penalties;
create policy pen_delete on public.penalties for delete to authenticated
  using (who = auth.uid() and choice is null);

drop policy if exists products_all on public.products;
create policy products_all on public.products for all to authenticated
  using (couple_id = my_couple()) with check (couple_id = my_couple());

-- ---------- الصلاحيات ----------
grant usage on schema public to anon, authenticated;
revoke all on public.couples, public.profiles, public.days, public.events, public.penalties, public.products from anon;
grant select on public.couples to authenticated;
-- الملف: الرمز السري وربط الشريك ما يتغيرون إلا من الدوال
revoke select, insert, update on public.profiles from authenticated;
grant select (id, couple_id, name, sex, color, photo, age, height, weight, start_weight, goal_weight, weeks, activity,
              target, protein, step_goal, hist, weights, created_at) on public.profiles to authenticated;
grant insert (id) on public.profiles to authenticated;
grant update (name, sex, color, photo, age, height, weight, start_weight, goal_weight, weeks, activity,
              target, protein, step_goal, hist, weights) on public.profiles to authenticated;
grant select, insert, update on public.days to authenticated;
grant select, insert on public.events to authenticated;
grant select, insert, update, delete on public.penalties to authenticated;
grant select, insert, update on public.products to authenticated;

revoke execute on function public.create_couple(), public.join_couple(text), public.my_health_token(),
  public.ingest_health(text, numeric, numeric, numeric, numeric), public.handle_new_user() from public;
grant execute on function public.my_couple(), public.create_couple(), public.join_couple(text), public.my_health_token() to authenticated;
grant execute on function public.ingest_health(text, numeric, numeric, numeric, numeric) to anon, authenticated;

-- ---------- التحديث المباشر بين الجوالين ----------
do $$
declare t text;
begin
  foreach t in array array['events','penalties','days'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
