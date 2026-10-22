create or replace function public.claim_referral(_code text)
returns boolean language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid(); _ref uuid;
begin
  if _uid is null then return false; end if;
  select id into _ref from public.profiles where referral_code = lower(trim(_code));
  if _ref is null or _ref = _uid then return false; end if;
  update public.profiles set referred_by = _ref
    where id = _uid and referred_by is null and created_at > now() - interval '1 day';
  return found;
end; $$;
revoke execute on function public.claim_referral(text) from public, anon;
grant execute on function public.claim_referral(text) to authenticated;