begin;
create function public.release_asset(asset_id uuid) returns void
language plpgsql security definer set search_path=pg_catalog,directory,pg_temp as $$
declare p profiles;
begin
  select * into strict p from profiles where owner_id=auth.uid() for update;
  delete from media m where m.id=asset_id and m.profile=p.id
    and not exists(select from gallery where asset=m.id);
  if not found then raise exception 'photo still attached or unavailable';end if;
end $$;
revoke all on function public.release_asset(uuid) from public,anon,authenticated,service_role;
grant execute on function public.release_asset(uuid) to authenticated;
commit;
