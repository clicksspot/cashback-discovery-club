-- Roles
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select, insert, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users see own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Admins add roles" on public.user_roles for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins remove roles" on public.user_roles for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Read own profile or admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Update own profile or admin" on public.profiles for update to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  with check (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    new.is_blocked := old.is_blocked;
    new.email := old.email;
  end if;
  return new;
end; $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_fields();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
grant select on public.app_settings to anon, authenticated;
grant insert, update, delete on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "Anyone reads settings" on public.app_settings for select to anon, authenticated using (true);
create policy "Admins insert settings" on public.app_settings for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update settings" on public.app_settings for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete settings" on public.app_settings for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

insert into public.app_settings (key, value) values
  ('site_name', '"CashLeaf"'),
  ('tagline', '"Get paid every time you shop online"'),
  ('hero_title', '"Shop your favourite stores. Get real cash back."'),
  ('hero_subtitle', '"Hundreds of top brands pay us when you shop through our links — we share that money with you."'),
  ('default_cashback_percent', '50'),
  ('min_withdrawal', '10'),
  ('currency', '"USD"'),
  ('payout_paypal', 'true'),
  ('payout_bank', 'true'),
  ('payout_jazzcash', 'true'),
  ('payout_easypaisa', 'true'),
  ('auto_sync_enabled', 'true'),
  ('auto_publish_new_stores', 'true'),
  ('actions_lookback_days', '30'),
  ('support_email', '""'),
  ('announcement', '""');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "Public reads active categories" on public.categories for select to anon, authenticated
  using (is_active or public.has_role(auth.uid(), 'admin'));
create policy "Admins insert categories" on public.categories for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update categories" on public.categories for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete categories" on public.categories for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

insert into public.categories (name, slug, icon, sort_order) values
  ('Fashion', 'fashion', 'Shirt', 1),
  ('Electronics', 'electronics', 'Laptop', 2),
  ('Home & Garden', 'home-garden', 'Sofa', 3),
  ('Beauty & Health', 'beauty-health', 'Sparkles', 4),
  ('Travel', 'travel', 'Plane', 5),
  ('Sports & Outdoors', 'sports-outdoors', 'Dumbbell', 6),
  ('Software & Services', 'software-services', 'AppWindow', 7),
  ('Food & Drink', 'food-drink', 'UtensilsCrossed', 8);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  impact_campaign_id text unique,
  impact_advertiser_id text,
  name text not null,
  slug text not null unique,
  logo_url text,
  website_url text,
  tracking_link text,
  description text,
  terms text,
  category_id uuid references public.categories(id) on delete set null,
  commission_type text not null default 'percent' check (commission_type in ('percent','flat')),
  commission_rate numeric(10,2),
  cashback_share numeric(5,2),
  display_rate_override numeric(10,2),
  rate_prefix text not null default 'Up to',
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  source text not null default 'impact' check (source in ('impact','manual')),
  impact_status text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index stores_category_idx on public.stores(category_id);
grant select on public.stores to anon, authenticated;
grant insert, update, delete on public.stores to authenticated;
grant all on public.stores to service_role;
alter table public.stores enable row level security;
create policy "Public reads active stores" on public.stores for select to anon, authenticated
  using (is_active or public.has_role(auth.uid(), 'admin'));
create policy "Admins insert stores" on public.stores for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update stores" on public.stores for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete stores" on public.stores for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
create trigger stores_touch before update on public.stores for each row execute function public.touch_updated_at();

create table public.clicks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  store_id uuid references public.stores(id) on delete set null,
  created_at timestamptz not null default now()
);
create index clicks_user_idx on public.clicks(user_id);
grant select, insert on public.clicks to authenticated;
grant all on public.clicks to service_role;
alter table public.clicks enable row level security;
create policy "Users read own clicks" on public.clicks for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Users create own clicks" on public.clicks for insert to authenticated
  with check (user_id = auth.uid());

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  store_id uuid references public.stores(id) on delete set null,
  click_id uuid,
  impact_action_id text unique,
  impact_campaign_id text,
  store_name text,
  order_amount numeric(12,2) not null default 0,
  commission_amount numeric(12,2) not null default 0,
  cashback_amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  event_date timestamptz not null default now(),
  locked_by_admin boolean not null default false,
  note text,
  source text not null default 'impact' check (source in ('impact','manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index transactions_user_idx on public.transactions(user_id);
grant select, insert, update, delete on public.transactions to authenticated;
grant all on public.transactions to service_role;
alter table public.transactions enable row level security;
create policy "Users read own transactions" on public.transactions for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Admins insert transactions" on public.transactions for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update transactions" on public.transactions for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete transactions" on public.transactions for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
create trigger transactions_touch before update on public.transactions for each row execute function public.touch_updated_at();

create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount numeric(12,2) not null check (amount > 0),
  method text not null check (method in ('paypal','bank','jazzcash','easypaisa')),
  details jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','paid','rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index withdrawals_user_idx on public.withdrawals(user_id);
grant select, update on public.withdrawals to authenticated;
grant all on public.withdrawals to service_role;
alter table public.withdrawals enable row level security;
create policy "Users read own withdrawals" on public.withdrawals for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Admins update withdrawals" on public.withdrawals for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  trigger text not null default 'manual',
  status text not null default 'running',
  message text,
  stats jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
grant select on public.sync_logs to authenticated;
grant all on public.sync_logs to service_role;
alter table public.sync_logs enable row level security;
create policy "Admins read sync logs" on public.sync_logs for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.user_balance(_user_id uuid)
returns table (pending numeric, approved numeric, withdrawn numeric, available numeric)
language sql stable security definer set search_path = public as $$
  with t as (
    select
      coalesce(sum(cashback_amount) filter (where status = 'pending'), 0) as pending,
      coalesce(sum(cashback_amount) filter (where status = 'approved'), 0) as approved
    from public.transactions where user_id = _user_id
  ), w as (
    select coalesce(sum(amount), 0) as withdrawn
    from public.withdrawals where user_id = _user_id and status <> 'rejected'
  )
  select t.pending, t.approved, w.withdrawn, t.approved - w.withdrawn from t, w
$$;
revoke execute on function public.user_balance(uuid) from public, anon;

create or replace function public.get_my_balance()
returns table (pending numeric, approved numeric, withdrawn numeric, available numeric)
language sql stable security definer set search_path = public as $$
  select * from public.user_balance(auth.uid())
$$;
revoke execute on function public.get_my_balance() from public, anon;
grant execute on function public.get_my_balance() to authenticated;

create or replace function public.admin_user_list()
returns table (id uuid, email text, full_name text, is_blocked boolean, created_at timestamptz,
  is_admin boolean, pending numeric, approved numeric, withdrawn numeric, available numeric, clicks bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Not allowed'; end if;
  return query
    select p.id, p.email, p.full_name, p.is_blocked, p.created_at,
      public.has_role(p.id, 'admin'),
      b.pending, b.approved, b.withdrawn, b.available,
      (select count(*) from public.clicks c where c.user_id = p.id)
    from public.profiles p
    cross join lateral public.user_balance(p.id) b
    order by p.created_at desc;
end; $$;
revoke execute on function public.admin_user_list() from public, anon;
grant execute on function public.admin_user_list() to authenticated;

create or replace function public.request_withdrawal(_amount numeric, _method text, _details jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _min numeric;
  _enabled boolean;
  _available numeric;
  _id uuid;
begin
  if _uid is null then raise exception 'Please sign in first'; end if;
  if exists (select 1 from public.profiles where id = _uid and is_blocked) then
    raise exception 'Your account is blocked. Contact support.';
  end if;
  if _method not in ('paypal','bank','jazzcash','easypaisa') then raise exception 'Unknown payout method'; end if;
  select coalesce((value)::text::boolean, false) into _enabled from public.app_settings where key = 'payout_' || _method;
  if not coalesce(_enabled, false) then raise exception 'This payout method is currently disabled'; end if;
  select coalesce((value)::text::numeric, 0) into _min from public.app_settings where key = 'min_withdrawal';
  if _amount is null or _amount <= 0 then raise exception 'Enter a valid amount'; end if;
  if _amount < coalesce(_min, 0) then raise exception 'Minimum withdrawal is %', _min; end if;
  perform pg_advisory_xact_lock(hashtext(_uid::text));
  select available into _available from public.user_balance(_uid);
  if _amount > _available then raise exception 'Amount is more than your available balance'; end if;
  insert into public.withdrawals (user_id, amount, method, details)
    values (_uid, round(_amount, 2), _method, coalesce(_details, '{}'::jsonb))
    returning id into _id;
  return _id;
end; $$;
revoke execute on function public.request_withdrawal(numeric, text, jsonb) from public, anon;
grant execute on function public.request_withdrawal(numeric, text, jsonb) to authenticated;

CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  impact_ad_id text UNIQUE,
  impact_campaign_id text,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  code text,
  kind text NOT NULL DEFAULT 'deal',
  discount_type text,
  discount_percent numeric,
  discount_amount numeric,
  discount_currency text,
  deal_type text,
  tracking_link text,
  landing_page_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  is_exclusive boolean NOT NULL DEFAULT false,
  locked_by_admin boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'impact',
  impact_status text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX offers_store_id_idx ON public.offers(store_id);
CREATE INDEX offers_active_idx ON public.offers(is_active, ends_at);
GRANT SELECT ON public.offers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active offers" ON public.offers FOR SELECT TO anon, authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins insert offers" ON public.offers FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins update offers" ON public.offers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins delete offers" ON public.offers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER offers_touch_updated_at BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER TABLE public.clicks ADD COLUMN offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL;