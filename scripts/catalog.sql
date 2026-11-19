insert into directory.catalog(slug,kind,parent,ar,fr,aliases) values
('casablanca','city',null,'الدار البيضاء','Casablanca','{}'),
('maarif','area','casablanca','المعاريف','Maârif','{}'),
('bourgogne','area','casablanca','بوركون','Bourgogne','{}'),
('sidi-maarouf','area','casablanca','سيدي معروف','Sidi Maârouf','{}'),
('plomberie','trade',null,'البلومبية','Plomberie',array['بلومبي','الماء كيسرب','plombier','plombi','blombi','fuite','fuite d’eau','fuite d''eau']),
('electricite','trade',null,'الضو','Électricité',array['تريسيان','trisian','trissian','électricien','الكهرباء','الضو تقطع']),
('peinture','trade',null,'الصباغة','Peinture',array['صباغ','sebbagh','sbagh','peintre'])
on conflict(slug) do nothing;
