-- Called only by the loopback-guarded seed command or a disposable test DB.
do $$
declare u uuid; admin_id uuid; r uuid; pid uuid; k int; h bytea:=sha256('synthetic-used-invite'::bytea);
begin
 select id into strict admin_id from auth.users where email='staff@m3lem.example';
 insert into directory.admins values(admin_id) on conflict do nothing;
 for k in 1..3 loop
 select id into strict u from auth.users where email='artisan'||k||'@m3lem.example';
 pid:=('10000000-0000-4000-8000-'||lpad(k::text,12,'0'))::uuid;
 insert into directory.profiles(id,owner_id,demo) values(pid,u,true);
 perform set_config('request.jwt.claim.sub',u::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u)::text,true);
 perform public.save_profile(jsonb_build_object(
 'name',(array['ورشة نيلة · Atelier Nila','ورشة نحاس · Atelier Nhas','ورشة طين · Atelier Tine'])[k],
 'services',(array['تصليح التسربات وتبديل الروبيني • Fuites et robinetterie','تركيب المصابيح والروبينيات • Luminaires et robinetterie','صباغة الحيطان والبيبان • Murs et boiseries'])[k],
 'city','casablanca','phone','+21260000000'||k,'consent',true,'whatsapp',k<>3,
 'fee',(array[0,80,null]::int[])[k],'trades',case k when 1 then '["plomberie"]'::jsonb when 2 then '["electricite","plomberie"]'::jsonb else '["peinture"]'::jsonb end),true);
 select working into r from directory.profiles where id=pid;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id)::text,true);
 perform public.moderate(pid,'approve',r,'');
 update directory.profiles set available_at=case k when 1 then now() when 2 then now()-interval '2 days' end where id=pid;
 if k=1 then
 insert into directory.invitations values(h,pid,'Synthetic fixture',admin_id,now(),now());
 insert into directory.reviews(invite,profile,rating,comment,state) values(h,pid,4,'خدمة نقية • Travail soigné (démo)','approved');
 end if;
 end loop;
end $$;
