begin;
create schema directory;
revoke all on schema directory from public, anon, authenticated;
set local search_path=directory,pg_catalog;

create table catalog (
  slug text primary key check(slug ~ '^[a-z][a-z0-9-]{0,59}$'),
  kind text not null check(kind in ('trade','city','area')),
  parent text references catalog(slug),
  ar text not null check(length(trim(ar)) between 1 and 80),
  fr text not null check(length(trim(fr)) between 1 and 80),
  aliases text[] not null default '{}',
  active boolean not null default true,
  check ((kind='area')=(parent is not null)),
  check(cardinality(aliases)<=40 and length(array_to_string(aliases,','))<=1600)
);
create index catalog_parent on catalog(parent,active);
create table admins (uid uuid primary key references auth.users on delete cascade);
create table profiles (
 id uuid primary key default gen_random_uuid(), owner_id uuid unique not null references auth.users on delete cascade,
 live uuid, working uuid, state text not null default 'draft' check(state in ('draft','pending','published','suspended')),
 feedback text not null default '', available_at timestamptz, verified_phone text, verified_at timestamptz,
 demo boolean not null default false
);
create table revisions (
 id uuid primary key default gen_random_uuid(), profile uuid not null references profiles on delete cascade,
 name text not null check(length(trim(name)) between 2 and 80),
 services text not null check(length(trim(services)) between 3 and 1200),
 city text not null references catalog, phone text not null check(phone ~ '^\+212[567][0-9]{8}$'),
 consent boolean not null, whatsapp boolean not null,
 fee integer check(fee between 0 and 100000),unique(profile,id)
);
alter table profiles add foreign key(id,live) references revisions(profile,id),add foreign key(id,working) references revisions(profile,id);
create table revision_trades(revision uuid references revisions on delete cascade,trade text references catalog,primary key(revision,trade));
create index trade_search on revision_trades(trade,revision);
create table revision_areas(revision uuid references revisions on delete cascade,area text references catalog,primary key(revision,area));
create index area_search on revision_areas(area,revision);
create index city_search on revisions(city,id);
create index public_profiles on profiles(live) where live is not null and state<>'suspended';
create table media(id uuid primary key,profile uuid not null references profiles on delete cascade);
create table gallery(revision uuid references revisions on delete cascade,asset uuid references media,position smallint not null check(position between 1 and 8),primary key(revision,asset),unique(revision,position));
create index gallery_asset on gallery(asset);
create table history(id bigint generated always as identity primary key, actor uuid references auth.users on delete set null,subject text not null,action text not null,note text not null,at timestamptz not null default now());
create table reports(id uuid primary key default gen_random_uuid(),profile uuid not null references profiles on delete cascade,reason text not null check(length(trim(reason)) between 3 and 500),closed boolean not null default false,at timestamptz not null default now());
create table limits(key text primary key,bucket timestamptz not null,hits int not null);
create table invitations(hash bytea primary key,profile uuid not null references profiles on delete cascade,evidence text not null check(length(trim(evidence)) between 8 and 500),issuer uuid not null references auth.users,expires timestamptz not null,used timestamptz);
create table reviews(id uuid primary key default gen_random_uuid(),invite bytea unique not null references invitations,profile uuid not null references profiles on delete cascade,rating smallint not null check(rating between 1 and 5),comment text not null check(length(trim(comment)) between 3 and 500),state text not null default 'pending' check(state in ('pending','approved','rejected')),at timestamptz not null default now());
create index approved_reviews on reviews(profile,at desc) where state='approved';

do $$ declare r record; begin for r in select tablename from pg_tables where schemaname='directory' loop execute format('alter table directory.%I enable row level security',r.tablename); end loop; end $$;

create function directory.staff() returns boolean language sql stable set search_path=directory,pg_catalog as $$
select exists(select from admins where uid=auth.uid())
$$;
create function public.is_staff() returns boolean language sql stable security definer set search_path=directory,pg_catalog as $$select staff()$$;
create function directory.log_action(s text,a text,n text) returns void language sql set search_path=directory,pg_catalog as $$insert into history(actor,subject,action,note) values(auth.uid(),s,a,left(n,500))$$;
create function public.catalog_items(include_inactive boolean default false) returns jsonb language sql stable security definer set search_path=directory,pg_catalog as $$
select coalesce(jsonb_agg(to_jsonb(c) order by slug),'[]') from catalog c where (active and (parent is null or exists(select from catalog p where p.slug=c.parent and p.active))) or (include_inactive and staff())
$$;
create function directory.payload(r uuid) returns jsonb language sql stable set search_path=directory,pg_catalog as $$
select (to_jsonb(v)-'profile') || jsonb_build_object(
'trades',array(select trade from revision_trades where revision=r order by trade),
'areas',array(select area from revision_areas where revision=r order by area),
'gallery',array(select asset from gallery where revision=r order by position))
from revisions v where v.id=r
$$;
create view directory.visible as
select p.*,r.city,r.phone from profiles p join revisions r on r.id=p.live
join catalog c on c.slug=r.city and c.active
where p.state<>'suspended' and r.consent
and exists(select from revision_trades t join catalog k on k.slug=t.trade and k.active where t.revision=p.live)
and (not exists(select from revision_areas a where a.revision=p.live) or exists(select from revision_areas a join catalog k on k.slug=a.area and k.active where a.revision=p.live));

create function directory.card(p directory.visible) returns jsonb language sql stable set search_path=directory,pg_catalog as $$
select (payload(p.live)-'id'-'phone'-'consent') || jsonb_build_object('id',p.id,'demo',p.demo,'phone',case when not p.demo then p.phone end,
'verified',coalesce(p.verified_phone=p.phone,false),'available_at',case when (p.available_at at time zone 'Africa/Casablanca')::date=(now() at time zone 'Africa/Casablanca')::date then p.available_at end,
'expires_at',((p.available_at at time zone 'Africa/Casablanca')::date+1)::timestamp at time zone 'Africa/Casablanca',
'trades',array(select trade from revision_trades join catalog on slug=trade and active where revision=p.live order by trade),
'areas',array(select area from revision_areas join catalog on slug=area and active where revision=p.live order by area),
'count',count(*),'average',round(avg(rating),1))
from reviews where profile=p.id and state='approved'
$$;
create function public.find_artisans(city_slug text,trade_slug text default '',area_slug text default '',today boolean default false,page_no integer default 1,show_demo boolean default false)
returns jsonb language sql stable security definer set search_path=directory,pg_catalog as $$
select coalesce(jsonb_agg(card(v) order by exact_match desc,available desc,(v).id),'[]') from (
select v,exists(select from revision_areas where revision=v.live and area=area_slug) exact_match,
coalesce((v.available_at at time zone 'Africa/Casablanca')::date=(now() at time zone 'Africa/Casablanca')::date,false) available
from visible v where v.city=city_slug and (not v.demo or show_demo)
and (trade_slug='' or exists(select from revision_trades join catalog on slug=trade and active where revision=v.live and trade=trade_slug))
and (area_slug='' or (exists(select from catalog where slug=area_slug and parent=city_slug and active) and
(not exists(select from revision_areas where revision=v.live) or exists(select from revision_areas where revision=v.live and area=area_slug))))
and (not today or (v.available_at at time zone 'Africa/Casablanca')::date=(now() at time zone 'Africa/Casablanca')::date)
order by exact_match desc,available desc,v.id limit 13 offset (least(greatest(page_no,1),100000)-1)*12
) s
$$;
create function public.artisan_detail(target uuid,show_demo boolean default false) returns jsonb language sql stable security definer set search_path=directory,pg_catalog as $$
select card(v) || jsonb_build_object('reviews',coalesce((select jsonb_agg(jsonb_build_object('rating',rating,'comment',comment) order by at desc,id) from reviews where profile=v.id and state='approved'),'[]')) from visible v where v.id=target and (not demo or show_demo)
$$;
create function public.index_entries() returns jsonb language sql stable security definer set search_path=directory,pg_catalog as $$
select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'city',v.city,'trade',trade)),'[]') from visible v join revision_trades on revision=v.live join catalog on slug=trade and active where not demo
$$;
create function public.my_workspace() returns jsonb language sql stable security definer set search_path=directory,pg_catalog as $$
select jsonb_build_object('id',p.id,'state',p.state,'feedback',p.feedback,'published',p.live is not null and state<>'suspended','available_at',available_at,'revision',payload(p.working),'assets',array(select id from media where profile=p.id order by id)) from profiles p where owner_id=auth.uid()
$$;
create function public.save_profile(body jsonb,submit boolean) returns uuid language plpgsql security definer set search_path=directory,pg_catalog as $$
declare p profiles; r uuid; t text; a uuid; i integer:=0; old_work uuid;
begin
 if auth.uid() is null then raise exception 'login'; end if;
 insert into profiles(owner_id) values(auth.uid()) on conflict(owner_id) do nothing;
 select * into strict p from profiles where owner_id=auth.uid() for update;
 if p.state='suspended' then raise exception 'suspended'; end if;
 if nullif(body->>'base','')::uuid is distinct from p.working then raise exception 'stale'; end if;
 if not exists(select from catalog where slug=body->>'city' and kind='city' and active) then raise exception 'city'; end if;
 if submit and (body->>'consent')::boolean is not true then raise exception 'consent'; end if;
 insert into revisions(profile,name,services,city,phone,consent,whatsapp,fee) values(p.id,trim(body->>'name'),trim(body->>'services'),body->>'city',body->>'phone',(body->>'consent')::boolean,(body->>'whatsapp')::boolean,(body->>'fee')::int) returning id into r;
 if coalesce(jsonb_array_length(body->'trades'),0) not between 1 and 20 then raise exception 'trades'; end if;
 for t in select jsonb_array_elements_text(body->'trades') loop
 if not exists(select from catalog where slug=t and kind='trade' and active) then raise exception 'trade'; end if;
 insert into revision_trades values(r,t); end loop;
 for t in select jsonb_array_elements_text(body->'areas') loop
 if not exists(select from catalog where slug=t and parent=body->>'city' and active) then raise exception 'area'; end if;
 insert into revision_areas values(r,t); end loop;
 for a in select jsonb_array_elements_text(body->'gallery')::uuid loop
 if not exists(select from media where id=a and profile=p.id) then raise exception 'media'; end if;
 i:=i+1;insert into gallery values(r,a,i); end loop;
 -- Withdrawing consent immediately removes the previously published contact.
 update profiles set working=r,live=case when (body->>'consent')::boolean then live end,state=case when submit then 'pending' else 'draft' end,feedback='' where id=p.id;
 old_work:=p.working;
 delete from revisions where profile=p.id and id<>r and id is distinct from (select live from profiles where id=p.id);
 return p.id;
end $$;
create function public.set_available(yes boolean) returns void language plpgsql security definer set search_path=directory,pg_catalog as $$
begin update profiles set available_at=case when yes then now() end where owner_id=auth.uid() and live is not null and state<>'suspended';if not found then raise exception 'not published';end if; end $$;

-- Only the image-processing server can register sanitized bytes. The path is derived from this ID.
create function public.register_asset(account uuid,asset uuid) returns void language plpgsql security definer set search_path=directory,pg_catalog as $$
declare p profiles; begin select * into strict p from profiles where owner_id=account for update;
if p.state='suspended' or (select count(*) from media where profile=p.id)>=24 then raise exception 'asset limit'; end if;
insert into media values(asset,p.id);end $$;
create function public.can_read_asset(asset uuid,show_demo boolean default false) returns boolean language sql stable security definer set search_path=directory,pg_catalog as $$
select exists(select from media m join profiles p on p.id=m.profile where m.id=asset and (p.owner_id=auth.uid() or staff() or exists(select from visible v join gallery g on g.revision=v.live where v.id=p.id and g.asset=m.id and (not v.demo or show_demo))))
$$;
create function public.moderate(target uuid,decision text,expected uuid,note text default '') returns void language plpgsql security definer set search_path=directory,pg_catalog as $$
declare p profiles; num text; begin
if not staff() then raise exception 'staff'; end if;
select * into strict p from profiles where id=target for update;
if p.owner_id=auth.uid() then raise exception 'independent reviewer required';end if;
if p.working is distinct from expected then raise exception 'stale';end if;
if decision='approve' and p.state='pending' then
 select phone into strict num from revisions where id=p.working and consent;
 update profiles set live=working,state='published',feedback='',verified_phone=case when verified_phone=num then num end,verified_at=case when verified_phone=num then verified_at end where id=target;
 delete from revisions where profile=target and id<>expected;
elsif decision='changes' and p.state in ('pending','suspended') and length(trim(note)) between 3 and 500 then
 update profiles set state='draft',feedback=note where id=target;
elsif decision='suspend' and length(trim(note)) between 3 and 500 then
 update profiles set state='suspended',live=null,feedback=note,available_at=null,verified_phone=null,verified_at=null where id=target;
elsif decision='confirm' and p.live is not null and p.live=expected and length(trim(note)) between 3 and 500 then
 update profiles set verified_phone=(select phone from revisions where id=p.live),verified_at=now() where id=target;
else raise exception 'transition';end if;
perform log_action(target::text,decision,note);
end $$;
create function public.manage_catalog(body jsonb) returns void language plpgsql security definer set search_path=directory,pg_catalog as $$
begin if not staff() then raise exception 'staff'; end if;
if body->>'kind'='area' and not exists(select from catalog where slug=body->>'parent' and kind='city') then raise exception 'parent';end if;
insert into catalog(slug,kind,parent,ar,fr,aliases,active) values(body->>'slug',body->>'kind',nullif(body->>'parent',''),body->>'ar',body->>'fr',array(select jsonb_array_elements_text(body->'aliases')),(body->>'active')::boolean)
on conflict(slug) do update set ar=excluded.ar,fr=excluded.fr,aliases=excluded.aliases,active=excluded.active where catalog.kind=excluded.kind and catalog.parent is not distinct from excluded.parent;
if not found then raise exception 'immutable hierarchy';end if;perform log_action(body->>'slug','catalog','');end $$;
create function public.staff_queue() returns jsonb language plpgsql stable security definer set search_path=directory,pg_catalog as $$
begin if not staff() then raise exception 'staff';end if;
return jsonb_build_object('profiles',coalesce((select jsonb_agg(jsonb_build_object('id',id,'state',state,'feedback',feedback,'live',live,'revision',payload(working),'verified_at',verified_at) order by id) from profiles where working is not null),'[]'),
'reports',coalesce((select jsonb_agg(to_jsonb(r) order by at) from reports r where not closed),'[]'),
'reviews',coalesce((select jsonb_agg(to_jsonb(r)-'invite' order by at) from reviews r where state='pending'),'[]'));end $$;
create function public.take_quota(client_key text,max_hits int) returns boolean language plpgsql security definer set search_path=directory,pg_catalog as $$
declare n int;begin insert into limits values(client_key,date_trunc('hour',now()),1) on conflict(key) do update set hits=case when limits.bucket=excluded.bucket then limits.hits+1 else 1 end,bucket=excluded.bucket returning hits into n;return n<=max_hits;end $$;
create function public.report_profile(target uuid,reason text) returns void language plpgsql security definer set search_path=directory,pg_catalog as $$
begin if not exists(select from visible where id=target) then raise exception 'listing';end if;insert into reports(profile,reason) values(target,reason);end $$;
create function public.issue_invite(target uuid,evidence text,token_hash text) returns void language plpgsql security definer set search_path=directory,pg_catalog as $$
begin if not staff() or not exists(select from visible where id=target) or length(token_hash)<>64 then raise exception 'invite';end if;
insert into invitations values(decode(token_hash,'hex'),target,evidence,auth.uid(),now()+interval '7 days',null);perform log_action(target::text,'invite','');end $$;
create function public.consume_invite(token_hash text,stars int,words text) returns void language plpgsql security definer set search_path=directory,pg_catalog as $$
declare t uuid;begin update invitations set used=now() where hash=decode(token_hash,'hex') and expires>now() and used is null and exists(select from visible where id=invitations.profile) returning profile into strict t;
insert into reviews(invite,profile,rating,comment) values(decode(token_hash,'hex'),t,stars,words);end $$;
create function public.triage(target uuid,decision text) returns void language plpgsql security definer set search_path=directory,pg_catalog as $$
begin if not staff() then raise exception 'staff';end if;
if decision='close' then update reports set closed=true where id=target and not closed;
elsif decision in ('approved','rejected') then update reviews set state=decision where id=target and state='pending';
else raise exception 'decision';end if;
if not found then raise exception 'stale';end if;perform log_action(target::text,decision,'');end $$;

-- Supabase grants defaults in public; explicitly reset every application RPC.
do $$ declare f regprocedure;begin for f in select oid::regprocedure from pg_proc where pronamespace='public'::regnamespace and proname=any(array['is_staff','catalog_items','find_artisans','artisan_detail','index_entries','my_workspace','save_profile','set_available','register_asset','can_read_asset','moderate','manage_catalog','staff_queue','take_quota','report_profile','issue_invite','consume_invite','triage']) loop execute format('revoke all on function %s from public,anon,authenticated,service_role',f);end loop;end $$;
grant execute on function public.catalog_items(boolean),public.find_artisans(text,text,text,boolean,int,boolean),public.artisan_detail(uuid,boolean),public.index_entries(),public.can_read_asset(uuid,boolean) to anon,authenticated;
grant execute on function public.is_staff(),public.my_workspace(),public.save_profile(jsonb,boolean),public.set_available(boolean),public.moderate(uuid,text,uuid,text),public.manage_catalog(jsonb),public.staff_queue(),public.issue_invite(uuid,text,text),public.triage(uuid,text) to authenticated;
grant execute on function public.take_quota(text,int),public.register_asset(uuid,uuid),public.report_profile(uuid,text),public.consume_invite(text,int,text) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('portfolio','portfolio',false,5242880,array['image/webp']);
commit;
