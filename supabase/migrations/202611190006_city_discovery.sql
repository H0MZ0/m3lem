begin;
-- Existing custom cities outside the HCP snapshot can be assigned by staff.
alter table directory.catalog add constraint city_needs_region
  check(kind <> 'city' or parent is not null) not valid;
-- Preserve historical revisions and their FKs; the retired taxonomy is read-only.
update directory.catalog set active=false where kind='area';

create or replace function public.catalog_items(include_inactive boolean default false)
returns jsonb language sql stable security definer set search_path=directory,pg_catalog as $$
  select coalesce(jsonb_agg(to_jsonb(c) order by slug),'[]') from catalog c
  where kind<>'area' and (active or (include_inactive and staff()))
$$;

create or replace function public.manage_catalog(body jsonb) returns void
language plpgsql security definer set search_path=directory,pg_catalog as $$
declare k text:=body->>'kind'; region text:=nullif(body->>'parent','');
begin
  if not staff() then raise exception 'staff'; end if;
  if k not in ('city','trade') or (k='trade' and region is not null)
    or (k='city' and not exists(select from catalog where kind='region' and slug=region and active))
    then raise exception 'invalid catalog hierarchy'; end if;
  insert into catalog(slug,kind,parent,ar,fr,aliases,active)
    values(body->>'slug',k,region,body->>'ar',body->>'fr',
           array(select jsonb_array_elements_text(body->'aliases')),(body->>'active')::boolean)
    on conflict(slug) do update set parent=excluded.parent,ar=excluded.ar,fr=excluded.fr,
      aliases=excluded.aliases,active=excluded.active where catalog.kind=excluded.kind;
  if not found then raise exception 'immutable kind';end if;
  perform log_action(body->>'slug','catalog','');
end $$;

create or replace view directory.visible as
select p.*,r.city,r.phone from directory.profiles p join directory.revisions r on r.id=p.live
join directory.catalog c on c.slug=r.city and c.active
where p.state<>'suspended' and r.consent and exists(
  select from directory.revision_trades t join directory.catalog k on k.slug=t.trade and k.active
  where t.revision=p.live
);

create or replace function directory.payload(r uuid) returns jsonb
language sql stable set search_path=directory,pg_catalog as $$
  select (to_jsonb(v)-'profile') || jsonb_build_object(
    'trades',array(select trade from revision_trades where revision=r order by trade),
    'gallery',array(select asset from gallery where revision=r order by position)
  ) from revisions v where v.id=r
$$;

create or replace function directory.card(p directory.visible) returns jsonb
language sql stable set search_path=directory,pg_catalog as $$
  select (payload(p.live)-'id'-'phone'-'consent') || jsonb_build_object(
    'id',p.id,'demo',p.demo,'phone',case when not p.demo then p.phone end,
    'verified',coalesce(p.verified_phone=p.phone,false),
    'available_at',case when (p.available_at at time zone 'Africa/Casablanca')::date
      =(now() at time zone 'Africa/Casablanca')::date then p.available_at end,
    'expires_at',((p.available_at at time zone 'Africa/Casablanca')::date+1)::timestamp at time zone 'Africa/Casablanca',
    'trades',array(select trade from revision_trades join catalog on slug=trade and active where revision=p.live order by trade),
    'count',count(*),'average',round(avg(rating),1)
  ) from reviews where profile=p.id and state='approved'
$$;

drop function public.find_artisans(text,text,text,boolean,int,boolean);
create function public.find_artisans(city_slug text,trade_slug text default '',today boolean default false,
  page_no integer default 1,show_demo boolean default false)
returns jsonb language sql stable security definer set search_path=directory,pg_catalog as $$
  select coalesce(jsonb_agg(card(v) order by available desc,(v).id),'[]') from (
    select v, coalesce((v.available_at at time zone 'Africa/Casablanca')::date
      =(now() at time zone 'Africa/Casablanca')::date,false) available
    from visible v where v.city=city_slug and (not v.demo or show_demo)
      and (trade_slug='' or exists(select from revision_trades join catalog on slug=trade and active
                                  where revision=v.live and trade=trade_slug))
      and (not today or (v.available_at at time zone 'Africa/Casablanca')::date=(now() at time zone 'Africa/Casablanca')::date)
    order by available desc,v.id limit 13 offset (least(greatest(page_no,1),100000)-1)*12
  ) matches
$$;
revoke all on function public.find_artisans(text,text,boolean,int,boolean) from public,anon,authenticated,service_role;
grant execute on function public.find_artisans(text,text,boolean,int,boolean) to anon,authenticated;
notify pgrst,'reload schema';
commit;
