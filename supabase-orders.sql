-- =====================================================================
-- Memora — supabase-orders.sql
-- Table orders + RLS + fonction create_demo_order.
-- A executer APRES supabase-setup.sql. Relancable sans supprimer
-- les commandes existantes.
-- Les montants sont calcules ICI, a partir du catalogue : le navigateur
-- n'est jamais cru sur un prix, un statut ou un proprietaire.
-- =====================================================================

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique,
  user_id           uuid not null references auth.users(id) on delete restrict,
  attempt_id        uuid not null,
  status            text not null default 'new'
                    check (status in ('new','preparing','done','cancelled')),
  items             jsonb not null,
  shipping          jsonb not null,
  subtotal_millimes integer not null check (subtotal_millimes >= 0),
  shipping_millimes integer not null check (shipping_millimes >= 0),
  total_millimes    integer not null check (total_millimes >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, attempt_id)          -- meme tentative = meme commande (pas de doublon)
);

create index if not exists orders_user_idx    on public.orders (user_id, created_at desc);
create index if not exists orders_created_idx on public.orders (created_at desc);

-- ---------- Trigger : updated_at + seul le statut est modifiable ----------
create or replace function public.orders_before_update()
returns trigger
language plpgsql
as $$
begin
  if new.id <> old.id or new.reference <> old.reference or new.user_id <> old.user_id
     or new.attempt_id <> old.attempt_id or new.items <> old.items
     or new.shipping <> old.shipping or new.subtotal_millimes <> old.subtotal_millimes
     or new.shipping_millimes <> old.shipping_millimes or new.total_millimes <> old.total_millimes
     or new.created_at <> old.created_at then
    raise exception 'Seul le statut d''une commande peut etre modifie';
  end if;
  new.updated_at := clock_timestamp();   -- sert a detecter les modifications concurrentes
  return new;
end;
$$;

drop trigger if exists orders_before_update on public.orders;
create trigger orders_before_update
  before update on public.orders
  for each row execute function public.orders_before_update();

-- ---------- Droits + RLS ----------
alter table public.orders enable row level security;
revoke all on public.orders from anon, authenticated;
grant select on public.orders to authenticated;
grant update (status) on public.orders to authenticated;   -- uniquement la colonne status

drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin" on public.orders
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin" on public.orders
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- Pas de policy INSERT / DELETE : on ne cree une commande que par create_demo_order().

-- ---------- Fonction : creer une commande de demonstration ----------
create or replace function public.create_demo_order(
  p_attempt_id     uuid,
  p_items          jsonb,
  p_shipping       jsonb,
  p_expected_total integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c_shipping constant integer := 8000;     -- 8 DT : doit rester egal a SHIP dans supabase-shop.js
  v_uid      uuid := auth.uid();
  v_item     jsonb;
  v_distinct integer;
  v_found    integer;
  v_lines    jsonb;
  v_sub      bigint;
  v_total    bigint;
  v_name     text := btrim(coalesce(p_shipping->>'name', ''));
  v_phone    text := btrim(coalesce(p_shipping->>'phone', ''));
  v_address  text := btrim(coalesce(p_shipping->>'address', ''));
  v_city     text := btrim(coalesce(p_shipping->>'city', ''));
  v_order    public.orders;
begin
  if v_uid is null then
    raise exception 'Connexion requise pour commander';
  end if;
  if p_attempt_id is null then
    raise exception 'Tentative invalide';
  end if;

  -- Meme tentative deja enregistree : on renvoie la commande existante (aucun doublon)
  select * into v_order from public.orders where user_id = v_uid and attempt_id = p_attempt_id;
  if found then
    return to_jsonb(v_order);
  end if;

  -- Validation du panier
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception 'Panier invalide';
  end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object'
       or coalesce(v_item->>'id', '') = ''
       or coalesce(v_item->>'qty', '') !~ '^[0-9]{1,2}$'
       or (v_item->>'qty')::int < 1 then
      raise exception 'Ligne de panier invalide';
    end if;
  end loop;

  -- Validation de l'adresse de livraison
  if char_length(v_name) not between 1 and 100
     or char_length(v_phone) not between 1 and 30
     or char_length(v_address) not between 1 and 250
     or char_length(v_city) not between 1 and 100 then
    raise exception 'Informations de livraison invalides';
  end if;

  -- Prix et noms lus dans le catalogue (produits disponibles uniquement)
  select count(distinct e->>'id') into v_distinct from jsonb_array_elements(p_items) e;

  select
    jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'qty', r.qty, 'unit_millimes', p.price_millimes) order by p.id),
    sum(p.price_millimes::bigint * r.qty),
    count(*)
  into v_lines, v_sub, v_found
  from (
    select e->>'id' as id, sum((e->>'qty')::int) as qty
    from jsonb_array_elements(p_items) e
    group by 1
  ) r
  join public.products p on p.id = r.id and p.available = true
  where r.qty <= 99;

  if v_found is distinct from v_distinct or v_lines is null then
    raise exception 'Un produit du panier est indisponible ou la quantite est invalide';
  end if;

  v_total := v_sub + c_shipping;
  if p_expected_total is distinct from v_total::integer then
    raise exception 'Les prix ont change, veuillez actualiser votre panier';
  end if;

  begin
    insert into public.orders
      (reference, user_id, attempt_id, status, items, shipping,
       subtotal_millimes, shipping_millimes, total_millimes)
    values (
      'MEM-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 6)),
      v_uid, p_attempt_id, 'new', v_lines,
      jsonb_build_object('name', v_name, 'phone', v_phone, 'address', v_address, 'city', v_city),
      v_sub::integer, c_shipping, v_total::integer
    )
    returning * into v_order;
  exception when unique_violation then
    -- deux envois simultanes de la meme tentative : on renvoie celle deja creee
    select * into v_order from public.orders where user_id = v_uid and attempt_id = p_attempt_id;
    if not found then raise; end if;
  end;

  return to_jsonb(v_order);
end;
$$;

revoke all on function public.create_demo_order(uuid, jsonb, jsonb, integer) from public, anon;
grant execute on function public.create_demo_order(uuid, jsonb, jsonb, integer) to authenticated;