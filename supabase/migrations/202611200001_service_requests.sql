begin;
set local search_path=directory,pg_catalog;

-- A visitor can describe a job without creating an account. The token is a
-- bearer secret for the private status page; only its SHA-256 hash is stored.
create table requests (
  id uuid primary key default gen_random_uuid(),
  token_hash bytea not null unique check(octet_length(token_hash)=32),
  ref text not null unique check(ref ~ '^[A-Z0-9]{10}$'),
  trade text not null references catalog,
  city text not null references catalog,
  name text not null check(length(trim(name)) between 2 and 80),
  phone text not null check(phone ~ '^\+212[567][0-9]{8}$'),
  description text not null check(length(trim(description)) between 10 and 1000),
  consent boolean not null check(consent),
  state text not null default 'open' check(state in ('open','closed','removed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '14 days',
  closed_at timestamptz
);
create index open_requests on requests(city,trade,created_at desc) where state='open';
create table request_photos (
  request uuid not null references requests on delete cascade,
  asset uuid primary key,
  position smallint not null check(position between 1 and 3),
  unique(request,position)
);
create index request_photos_request on request_photos(request,position);
create table request_responses (
  request uuid not null references requests on delete cascade,
  profile uuid not null references profiles on delete cascade,
  at timestamptz not null default now(),
  primary key(request,profile)
);
alter table requests enable row level security;
alter table request_photos enable row level security;
alter table request_responses enable row level security;

-- Called only by the server action after it has validated and sanitized the
-- images. The DB still rechecks the catalog, consent and all value bounds.
create function public.create_request(body jsonb,token_hash text,photos uuid[] default '{}')
returns jsonb language plpgsql security definer set search_path=directory,pg_catalog as $$
declare r requests; a uuid; i smallint:=0; n integer;
begin
  if $2 !~ '^[0-9a-f]{64}$' then raise exception 'token'; end if;
  if not exists(select from catalog where slug=body->>'trade' and kind='trade' and active)
    or not exists(select from catalog where slug=body->>'city' and kind='city' and active)
    then raise exception 'catalog'; end if;
  if (body->>'consent')::boolean is not true then raise exception 'consent'; end if;
  n:=coalesce(array_length(photos,1),0);
  if n>3 then raise exception 'photos'; end if;
  insert into requests(token_hash,ref,trade,city,name,phone,description,consent)
    values(decode($2,'hex'),body->>'ref',body->>'trade',body->>'city',
      trim(body->>'name'),body->>'phone',trim(body->>'description'),true)
    returning * into r;
  for a in select unnest(coalesce(photos,'{}'::uuid[])) loop
    i:=i+1;
    insert into request_photos(request,asset,position) values(r.id,a,i);
  end loop;
  return jsonb_build_object('id',r.id,'ref',r.ref);
end $$;

-- Bearer-token projection for the customer. It never exposes the phone or
-- which artisan responded.
create function public.request_status(token_hash text) returns jsonb
language sql stable security definer set search_path=directory,pg_catalog as $$
  select case when $1 !~ '^[0-9a-f]{64}$' then null else (
    select jsonb_build_object(
      'ref',r.ref,
      'state',case when r.state='open' and r.expires_at<=now() then 'expired' else r.state end,
      'trade',r.trade,'city',r.city,'name',r.name,'description',r.description,
      'created_at',r.created_at,'expires_at',r.expires_at,
      'photos',array(select asset from request_photos where request=r.id order by position),
      'responses',(select count(*) from request_responses where request=r.id)
    ) from requests r where r.token_hash=decode($1,'hex')
  ) end
$$;

create function public.close_request(token_hash text) returns void
language plpgsql security definer set search_path=directory,pg_catalog as $$
begin
  if $1 !~ '^[0-9a-f]{64}$' then raise exception 'token'; end if;
  update requests set state='closed',closed_at=now()
    where requests.token_hash=decode($1,'hex') and state='open';
  if not found then raise exception 'stale'; end if;
end $$;

-- A published artisan sees only open, unexpired requests in their own city
-- and one of their declared trades. Phone sharing is the explicit purpose.
create function public.my_requests() returns jsonb
language plpgsql stable security definer set search_path=directory,pg_catalog as $$
declare p profiles;
begin
  if auth.uid() is null then return '[]'; end if;
  select * into p from profiles where owner_id=auth.uid();
  if not found or p.live is null or p.state<>'published' then return '[]'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',r.id,'ref',r.ref,'trade',r.trade,'city',r.city,
      'name',r.name,'phone',r.phone,'description',r.description,
      'created_at',r.created_at,'expires_at',r.expires_at,
      'photos',array(select asset from request_photos where request=r.id order by position),
      'responses',(select count(*) from request_responses where request=r.id),
      'responded',exists(select from request_responses where request=r.id and profile=p.id)
    ) order by r.created_at desc)
    from (
      select * from requests
      where state='open' and expires_at>now()
        and city=(select city from revisions where id=p.live)
        and exists(select from revision_trades t where t.revision=p.live and t.trade=requests.trade)
      order by created_at desc limit 50
    ) r
  ),'[]');
end $$;

create function public.respond_request(target uuid) returns void
language plpgsql security definer set search_path=directory,pg_catalog as $$
declare p profiles;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  select * into p from profiles where owner_id=auth.uid();
  if not found or p.live is null or p.state<>'published' then raise exception 'profile'; end if;
  if not exists(
    select from requests r
    where r.id=target and r.state='open' and r.expires_at>now()
      and r.city=(select city from revisions where id=p.live)
      and exists(select from revision_trades t where t.revision=p.live and t.trade=r.trade)
  ) then raise exception 'request'; end if;
  insert into request_responses(request,profile) values(target,p.id)
    on conflict do nothing;
end $$;

create function public.request_queue() returns jsonb
language plpgsql stable security definer set search_path=directory,pg_catalog as $$
begin
  if not staff() then raise exception 'staff'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',r.id,'ref',r.ref,'trade',r.trade,'city',r.city,
      'name',r.name,'phone',r.phone,'description',r.description,
      'created_at',r.created_at,'expires_at',r.expires_at,
      'expired',r.expires_at<=now(),
      'photos',array(select asset from request_photos where request=r.id order by position),
      'responses',(select count(*) from request_responses where request=r.id),
      'responders',coalesce((
        select jsonb_agg(jsonb_build_object('name',v.name,'at',rr.at) order by rr.at)
        from request_responses rr
        join profiles p on p.id=rr.profile
        join revisions v on v.id=p.live
        where rr.request=r.id
      ),'[]')
    ) order by r.created_at desc)
    from (select * from requests where state='open' order by created_at desc limit 100) r
  ),'[]');
end $$;

create function public.request_summary() returns jsonb
language plpgsql stable security definer set search_path=directory,pg_catalog as $$
begin
  if not staff() then raise exception 'staff'; end if;
  return jsonb_build_object(
    'open',(select count(*) from requests where state='open' and expires_at>now()),
    'last30',(select count(*) from requests where created_at>=now()-interval '30 days'),
    'responded',(select count(distinct rr.request) from request_responses rr
      join requests r on r.id=rr.request where r.created_at>=now()-interval '30 days'),
    'responses',(select count(*) from request_responses rr
      join requests r on r.id=rr.request where r.created_at>=now()-interval '30 days'),
    'avg_minutes',(select round(avg(extract(epoch from (first_at-created_at))/60))::int from (
      select r.created_at,min(rr.at) first_at from requests r
      join request_responses rr on rr.request=r.id
      where r.created_at>=now()-interval '30 days'
      group by r.id,r.created_at
    ) x)
  );
end $$;

-- Photos are private: staff, a matching published artisan, or the customer
-- holding the unguessable status token may read them.
create function public.can_read_request_photo(asset uuid,token_hash text default '')
returns boolean language sql stable security definer set search_path=directory,pg_catalog as $$
  select exists(
    select from request_photos rp join requests r on r.id=rp.request
    where rp.asset=asset and (r.state<>'removed' or staff()) and (
      staff() or
      (auth.uid() is not null and exists(
        select from profiles p join revisions v on v.id=p.live
        where p.owner_id=auth.uid() and p.state='published'
          and v.city=r.city
          and exists(select from revision_trades t where t.revision=p.live and t.trade=r.trade)
      )) or
      ($2 ~ '^[0-9a-f]{64}$' and r.token_hash=decode($2,'hex'))
    )
  )
$$;

create function public.triage_request(target uuid,decision text) returns uuid[]
language plpgsql security definer set search_path=directory,pg_catalog as $$
declare assets uuid[];
begin
  if not staff() then raise exception 'staff'; end if;
  if decision not in ('close','remove') then raise exception 'decision'; end if;
  select coalesce(array_agg(asset),'{}') into assets from request_photos where request=target;
  update requests set state=case decision when 'close' then 'closed' else 'removed' end,
    closed_at=now() where id=target and state='open';
  if not found then raise exception 'stale'; end if;
  perform log_action(target::text,decision,'');
  return assets;
end $$;

revoke all on function public.create_request(jsonb,text,uuid[]),public.request_status(text),
  public.close_request(text),public.my_requests(),public.respond_request(uuid),
  public.request_queue(),public.request_summary(),public.can_read_request_photo(uuid,text),
  public.triage_request(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.create_request(jsonb,text,uuid[]) to service_role;
grant execute on function public.close_request(text) to service_role;
grant execute on function public.request_status(text),public.can_read_request_photo(uuid,text) to anon,authenticated;
grant execute on function public.my_requests(),public.respond_request(uuid),
  public.request_queue(),public.request_summary(),public.triage_request(uuid,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  select 'request-media','request-media',false,5242880,array['image/webp']
  where not exists(select from storage.buckets where id='request-media');
notify pgrst,'reload schema';
commit;
