begin;
create or replace function public.staff_queue() returns jsonb language plpgsql stable security definer set search_path=directory,pg_catalog as $$
begin
  if not staff() then raise exception 'staff';end if;
  return jsonb_build_object(
    'profiles',coalesce((select jsonb_agg(jsonb_build_object(
      'id',id,'state',state,'feedback',feedback,'live',live,'revision',payload(working),
      'previous',case when state='pending' and live is distinct from working then payload(live) end,
      'verified_at',verified_at) order by id) from profiles where working is not null),'[]'),
    'reports',coalesce((select jsonb_agg(to_jsonb(r) order by at) from reports r where not closed),'[]'),
    'reviews',coalesce((select jsonb_agg(to_jsonb(r)-'invite' order by at) from reviews r where state='pending'),'[]')
  );
end $$;

-- Read-only display context. Redemption remains atomic in consume_invite.
create function public.review_subject(token_hash text) returns text language sql stable security definer set search_path=directory,pg_catalog as $$
 select r.name from invitations i join visible v on v.id=i.profile join revisions r on r.id=v.live
 where i.hash=decode(token_hash,'hex') and i.used is null and i.expires>now()
$$;

-- Aggregate signals only: no raw search text, account, IP, visitor or review token.
create table directory.discovery_daily (
  day date not null, city text not null references directory.catalog, trade text not null,
  searches bigint not null default 0, empty_searches bigint not null default 0,
  calls bigint not null default 0, whatsapp bigint not null default 0, primary key(day,city,trade)
);
alter table directory.discovery_daily enable row level security;
create function public.count_discovery(event_type text,city_slug text,trade_slug text,today boolean default false,target uuid default null)
returns void language plpgsql security definer set search_path=directory,pg_catalog as $$
declare missing boolean:=false;
begin
 if event_type not in ('search','call','whatsapp') or not exists(select from catalog where slug=city_slug and kind='city' and active)
 or (trade_slug<>'' and not exists(select from catalog where slug=trade_slug and kind='trade' and active)) then return; end if;
 if event_type='search' then
   missing:=not exists(select from visible v where not v.demo and v.city=city_slug
     and (trade_slug='' or exists(select from revision_trades where revision=v.live and trade=trade_slug))
     and (not today or (v.available_at at time zone 'Africa/Casablanca')::date=(now() at time zone 'Africa/Casablanca')::date));
 elsif not exists(select from visible v join revisions r on r.id=v.live where v.id=target and not v.demo and v.city=city_slug
     and (event_type<>'whatsapp' or r.whatsapp)
     and exists(select from revision_trades where revision=v.live and trade=trade_slug)) then return;
 end if;
 insert into discovery_daily as d values((now() at time zone 'Africa/Casablanca')::date,city_slug,trade_slug,
   (event_type='search')::int,missing::int,(event_type='call')::int,(event_type='whatsapp')::int)
 on conflict(day,city,trade) do update set searches=d.searches+excluded.searches,
   empty_searches=d.empty_searches+excluded.empty_searches,calls=d.calls+excluded.calls,whatsapp=d.whatsapp+excluded.whatsapp;
end $$;

create function public.discovery_summary() returns jsonb language plpgsql stable security definer set search_path=directory,pg_catalog as $$
begin
 if not staff() then raise exception 'staff';end if;
 return (with recent as(select * from discovery_daily where day>=(now() at time zone 'Africa/Casablanca')::date-29)
 select jsonb_build_object('searches',coalesce(sum(searches),0),'empty',coalesce(sum(empty_searches),0),
 'calls',coalesce(sum(calls),0),'whatsapp',coalesce(sum(whatsapp),0),
 'gaps',coalesce((select jsonb_agg(to_jsonb(g) order by misses desc,city,trade) from
 (select city,trade,sum(empty_searches) misses from recent group by city,trade having sum(empty_searches)>0 order by misses desc,city,trade limit 5) g),'[]')) from recent);
end $$;
revoke all on function public.review_subject(text),public.count_discovery(text,text,text,boolean,uuid),public.discovery_summary() from public,anon,authenticated,service_role;
grant execute on function public.review_subject(text),public.count_discovery(text,text,text,boolean,uuid) to service_role;
grant execute on function public.discovery_summary() to authenticated;
notify pgrst,'reload schema';
commit;
