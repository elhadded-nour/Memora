-- =====================================================================
-- Memora — supabase-setup.sql
-- Tables products + user_roles, fonction is_admin(), droits et RLS.
-- A executer dans Supabase > SQL Editor, EN PREMIER (base neuve).
-- Sans danger si les tables existent deja (create ... if not exists).
-- =====================================================================

-- ---------- Catalogue ----------
create table if not exists public.products (
  id             text primary key check (id ~ '^[a-z0-9-]+$' and char_length(id) <= 60),
  name           text not null check (char_length(name) between 1 and 150),
  category       text not null check (char_length(category) between 1 and 80),
  description    text not null default '',
  price_millimes integer not null check (price_millimes >= 0),   -- 45000 = 45 DT
  image          text not null default '',
  features       text[] not null default '{}',
  available      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ---------- Roles (administrateurs) ----------
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role    text not null check (role in ('admin'))
);

-- ---------- Fonction : l'utilisateur connecte est-il admin ? ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- Droits + RLS : products ----------
alter table public.products enable row level security;
revoke all on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

drop policy if exists "products_select" on public.products;
create policy "products_select" on public.products
  for select to anon, authenticated
  using (available = true or public.is_admin());

drop policy if exists "products_insert_admin" on public.products;
create policy "products_insert_admin" on public.products
  for insert to authenticated with check (public.is_admin());

drop policy if exists "products_update_admin" on public.products;
create policy "products_update_admin" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products_delete_admin" on public.products;
create policy "products_delete_admin" on public.products
  for delete to authenticated using (public.is_admin());

-- ---------- Droits + RLS : user_roles ----------
-- Chacun peut lire SON role. Personne ne peut en ecrire depuis le navigateur.
alter table public.user_roles enable row level security;
revoke all on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;

drop policy if exists "roles_select_own" on public.user_roles;
create policy "roles_select_own" on public.user_roles
  for select to authenticated using (user_id = auth.uid());