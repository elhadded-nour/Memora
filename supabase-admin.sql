-- ORDRE 3/3 -- a executer APRES avoir cree et confirme votre compte.
-- Remplacez VOTRE-UUID (Authentication > Users). Uniquement dans SQL Editor.
insert into public.user_roles (user_id, role)
values ('d074c918-c26c-402c-be6d-252f903518e2', 'admin')
on conflict (user_id) do update set role = 'admin';