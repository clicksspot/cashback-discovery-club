-- Boosted rates on stores
alter table public.stores add column previous_rate numeric(10,2);

-- Favorites
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  store_id uuid not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, store_id)
);
grant select, insert, delete on public.favorites to authenticated;
grant all on public.favorites to service_role;
alter table public.favorites enable row level security;
create policy "Own favorites read" on public.favorites for select to authenticated using (user_id = auth.uid());
create policy "Own favorites add" on public.favorites for insert to authenticated with check (user_id = auth.uid());
create policy "Own favorites remove" on public.favorites for delete to authenticated using (user_id = auth.uid());

-- Referrals
alter table public.profiles add column referral_code text unique;
alter table public.profiles add column referred_by uuid;
update public.profiles set referral_code = lower(substr(md5(id::text), 1, 8)) where referral_code is null;

alter table public.transactions drop constraint transactions_source_check;
alter table public.transactions add constraint transactions_source_check check (source in ('impact','manual','referral'));
alter table public.transactions add column referral_for uuid;
create unique index transactions_referral_once on public.transactions(referral_for) where source = 'referral';

insert into public.app_settings (key, value) values ('referral_bonus', '5'), ('referral_min_purchase_cashback', '0')
on conflict (key) do nothing;

create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    new.is_blocked := old.is_blocked;
    new.email := old.email;
    new.referral_code := old.referral_code;
    new.referred_by := old.referred_by;
  end if;
  return new;
end; $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare _ref uuid;
begin
  select id into _ref from public.profiles
    where referral_code = lower(nullif(new.raw_user_meta_data->>'ref', '')) limit 1;
  insert into public.profiles (id, email, full_name, referral_code, referred_by)
  values (new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    lower(substr(md5(new.id::text), 1, 8)), _ref);
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end; $$;

-- Pay referrer a bonus once the friend's first cashback is approved
create or replace function public.award_referral_bonus()
returns trigger language plpgsql security definer set search_path = public as $$
declare _referrer uuid; _bonus numeric;
begin
  if new.status <> 'approved' or new.source = 'referral' or new.user_id is null then return new; end if;
  select referred_by into _referrer from public.profiles where id = new.user_id;
  if _referrer is null then return new; end if;
  select coalesce((value)::text::numeric, 0) into _bonus from public.app_settings where key = 'referral_bonus';
  if coalesce(_bonus, 0) <= 0 then return new; end if;
  insert into public.transactions (user_id, store_name, cashback_amount, status, source, referral_for, note)
    values (_referrer, 'Referral bonus', _bonus, 'approved', 'referral', new.user_id, 'Friend made their first purchase')
    on conflict do nothing;
  return new;
end; $$;
create trigger transactions_referral after insert or update of status on public.transactions
  for each row execute function public.award_referral_bonus();

create or replace function public.get_my_referrals()
returns table (friend_name text, joined_at timestamptz, bonus_paid boolean)
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'A friend'), p.created_at,
    exists (select 1 from public.transactions t where t.source = 'referral' and t.referral_for = p.id)
  from public.profiles p where p.referred_by = auth.uid() order by p.created_at desc
$$;
revoke execute on function public.get_my_referrals() from public, anon;
grant execute on function public.get_my_referrals() to authenticated;

-- Missing cashback claims
create table public.claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  store_id uuid references public.stores(id) on delete set null,
  order_ref text not null,
  order_date date not null,
  order_amount numeric(12,2) not null check (order_amount > 0),
  details text,
  status text not null default 'open' check (status in ('open','resolved','rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index claims_user_idx on public.claims(user_id);
grant select, insert, update on public.claims to authenticated;
grant all on public.claims to service_role;
alter table public.claims enable row level security;
create policy "Read own claims or admin" on public.claims for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Create own claims" on public.claims for insert to authenticated
  with check (user_id = auth.uid() and status = 'open' and admin_note is null);
create policy "Admins update claims" on public.claims for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create trigger claims_touch before update on public.claims for each row execute function public.touch_updated_at();