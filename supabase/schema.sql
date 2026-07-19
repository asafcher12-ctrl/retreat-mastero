-- ריטריט כנרת - סכימת בסיס נתונים
-- להרצה ב-Supabase SQL Editor (או supabase db push)

-- ========== טבלאות ==========

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  is_super_admin boolean not null default false,
  is_event_manager boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at date,
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.event_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  role text not null default 'pioneer' check (role in ('manager', 'pioneer', 'viewer')),
  arrival_at timestamptz,
  nights int check (nights in (1, 2)),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  category text,
  assigned_to uuid references public.profiles(id) on delete set null,
  is_checked boolean not null default false,
  position int not null default 0,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.equipment_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  category text,
  assigned_to uuid references public.profiles(id) on delete set null,
  is_checked boolean not null default false,
  position int not null default 0,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.program_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  time_slot text,
  title text not null,
  description text,
  assigned_to uuid references public.profiles(id) on delete set null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text,
  url text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ========== טריגרים ==========

-- יצירת פרופיל אוטומטית בהרשמה
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- יוצר האירוע נהיה מנהל האירוע אוטומטית
create or replace function public.handle_new_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.event_members (event_id, user_id, role)
  values (new.id, new.created_by, 'manager')
  on conflict (event_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_event_created on public.events;
create trigger on_event_created
  after insert on public.events
  for each row execute function public.handle_new_event();

-- ========== פונקציות עזר להרשאות ==========

-- security definer כדי לא ליפול לרקורסיה של RLS על event_members
create or replace function public.is_member(ev uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from event_members
    where event_id = ev and user_id = auth.uid()
  );
$$;

-- חבר פעיל = לא צופה
create or replace function public.is_active_member(ev uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from event_members
    where event_id = ev and user_id = auth.uid() and role <> 'viewer'
  );
$$;

-- מנהל האירוע או מנהל גדול
create or replace function public.is_event_admin(ev uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from event_members
    where event_id = ev and user_id = auth.uid() and role = 'manager'
  ) or exists (
    select 1 from profiles
    where id = auth.uid() and is_super_admin
  );
$$;

-- ========== RPC ==========

-- הצטרפות לאירוע דרך קוד הזמנה
create or replace function public.join_event(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ev_id uuid;
begin
  select id into ev_id from events where invite_code = code;
  if ev_id is null then
    raise exception 'קוד הזמנה לא נמצא';
  end if;
  insert into event_members (event_id, user_id)
  values (ev_id, auth.uid())
  on conflict (event_id, user_id) do nothing;
  return ev_id;
end;
$$;

-- יצירת אירוע (למנהלי אירועים / מנהל גדול).
-- דרך פונקציה ולא INSERT ישיר, כי החזרת השורה שנוצרה נופלת על מדיניות ה-SELECT
-- לפני שהטריגר מספיק לצרף את היוצר כחבר.
create or replace function public.create_event(event_name text, event_starts_at date default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ev_id uuid;
begin
  if not exists (
    select 1 from profiles
    where id = auth.uid() and (is_event_manager or is_super_admin)
  ) then
    raise exception 'אין הרשאה ליצור אירוע';
  end if;
  insert into events (name, starts_at, created_by)
  values (event_name, event_starts_at, auth.uid())
  returning id into ev_id;
  return ev_id;
end;
$$;

-- שינוי תפקיד של חבר אירוע (מנהל אירוע בלבד)
create or replace function public.set_member_role(member_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ev uuid;
begin
  select event_id into ev from event_members where id = member_id;
  if ev is null or not is_event_admin(ev) then
    raise exception 'אין הרשאה';
  end if;
  if new_role not in ('manager', 'pioneer', 'viewer') then
    raise exception 'תפקיד לא חוקי';
  end if;
  update event_members set role = new_role where id = member_id;
end;
$$;

-- ========== RLS ==========

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_members enable row level security;
alter table public.shopping_items enable row level security;
alter table public.equipment_items enable row level security;
alter table public.expenses enable row level security;
alter table public.program_items enable row level security;
alter table public.recommendations enable row level security;

-- profiles: כולם רואים (נדרש לתיוג אחראים), כל אחד מעדכן רק את עצמו.
-- דגלי הניהול מוגנים ברמת העמודות: לא ניתנים לעדכון דרך האפליקציה.
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

-- events: רואים רק אירועים שאני חבר בהם; יצירה רק למנהלי אירועים / מנהל גדול
create policy "events_select" on public.events
  for select to authenticated using (is_member(id));
create policy "events_insert" on public.events
  for insert to authenticated with check (
    created_by = auth.uid() and exists (
      select 1 from profiles
      where id = auth.uid() and (is_event_manager or is_super_admin)
    )
  );
create policy "events_update" on public.events
  for update to authenticated using (is_event_admin(id));
create policy "events_delete" on public.events
  for delete to authenticated using (is_event_admin(id));

-- event_members: חברי האירוע רואים זה את זה; כל אחד מעדכן את פרטי ההגעה של עצמו.
-- הצטרפות דרך join_event, שינוי תפקיד דרך set_member_role.
create policy "members_select" on public.event_members
  for select to authenticated using (is_member(event_id));
create policy "members_update_own" on public.event_members
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members_delete" on public.event_members
  for delete to authenticated using (user_id = auth.uid() or is_event_admin(event_id));

revoke update on public.event_members from authenticated;
grant update (arrival_at, nights) on public.event_members to authenticated;

-- shopping_items: כל חבר פעיל מוסיף/מסמן/עורך; מחיקה ליוצר או למנהל
create policy "shopping_select" on public.shopping_items
  for select to authenticated using (is_member(event_id));
create policy "shopping_insert" on public.shopping_items
  for insert to authenticated with check (is_active_member(event_id) and created_by = auth.uid());
create policy "shopping_update" on public.shopping_items
  for update to authenticated using (is_active_member(event_id));
create policy "shopping_delete" on public.shopping_items
  for delete to authenticated using (created_by = auth.uid() or is_event_admin(event_id));

-- equipment_items: כמו רשימת קניות
create policy "equipment_select" on public.equipment_items
  for select to authenticated using (is_member(event_id));
create policy "equipment_insert" on public.equipment_items
  for insert to authenticated with check (is_active_member(event_id) and created_by = auth.uid());
create policy "equipment_update" on public.equipment_items
  for update to authenticated using (is_active_member(event_id));
create policy "equipment_delete" on public.equipment_items
  for delete to authenticated using (created_by = auth.uid() or is_event_admin(event_id));

-- expenses: כל אחד מנהל רק את ההוצאות של עצמו, כולם רואים
create policy "expenses_select" on public.expenses
  for select to authenticated using (is_member(event_id));
create policy "expenses_insert" on public.expenses
  for insert to authenticated with check (is_active_member(event_id) and user_id = auth.uid());
create policy "expenses_update" on public.expenses
  for update to authenticated using (user_id = auth.uid());
create policy "expenses_delete" on public.expenses
  for delete to authenticated using (user_id = auth.uid());

-- program_items: כולם רואים, רק מנהל אירוע עורך
create policy "program_select" on public.program_items
  for select to authenticated using (is_member(event_id));
create policy "program_insert" on public.program_items
  for insert to authenticated with check (is_event_admin(event_id));
create policy "program_update" on public.program_items
  for update to authenticated using (is_event_admin(event_id));
create policy "program_delete" on public.program_items
  for delete to authenticated using (is_event_admin(event_id));

-- recommendations: כל חבר פעיל מוסיף; מחיקה/עריכה ליוצר או למנהל
create policy "recs_select" on public.recommendations
  for select to authenticated using (is_member(event_id));
create policy "recs_insert" on public.recommendations
  for insert to authenticated with check (is_active_member(event_id) and created_by = auth.uid());
create policy "recs_update" on public.recommendations
  for update to authenticated using (created_by = auth.uid() or is_event_admin(event_id));
create policy "recs_delete" on public.recommendations
  for delete to authenticated using (created_by = auth.uid() or is_event_admin(event_id));

-- ========== Realtime ==========

alter publication supabase_realtime add table
  public.event_members,
  public.shopping_items,
  public.equipment_items,
  public.expenses,
  public.program_items,
  public.recommendations;
