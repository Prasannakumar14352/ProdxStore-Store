-- Phase 4: automatic delivery (private R2 files, expiring download links, order email)
-- and the ProdXStore-wide 7-day money-back guarantee.

-- 1) Where each product's file lives (R2 object key) and how long links last.
--    file_key stays NULL until the file is uploaded to R2; while NULL, buyers keep
--    going to the product's thank_you_url exactly as before.
alter table public.pxs_products
  add column if not exists file_key text,
  add column if not exists download_limit integer not null default 5,
  add column if not exists download_days integer not null default 7;

-- 2) Delivery email status per order (shown in HQ).
alter table public.pxs_orders
  add column if not exists email_status text,      -- sending | sent | failed | not_configured
  add column if not exists email_sent_at timestamptz,
  add column if not exists email_error text;

-- 3) One private download link per paid order.
create table if not exists public.pxs_downloads (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.pxs_orders(id) on delete cascade,
  product_id uuid references public.pxs_products(id),
  token text not null unique,
  max_downloads integer not null default 5,
  download_count integer not null default 0,
  expires_at timestamptz not null,
  last_downloaded_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.pxs_downloads enable row level security;
drop policy if exists "pxs downloads admin read" on public.pxs_downloads;
create policy "pxs downloads admin read" on public.pxs_downloads
  for select to authenticated using (public.is_admin(auth.uid()));

-- 4) Count one download atomically and return the file to serve.
--    Only the edge function (service role) may call this.
create or replace function public.pxs_claim_download(p_token text)
returns table (result text, file_key text, product_name text, order_no text)
language plpgsql security definer set search_path = public as $$
declare d record;
begin
  select dl.*, o.status as order_status, o.order_no as o_no, p.file_key as p_key, p.name as p_name
    into d
    from pxs_downloads dl
    join pxs_orders o on o.id = dl.order_id
    left join pxs_products p on p.id = dl.product_id
   where dl.token = p_token
   for update of dl;

  if not found then return query select 'not_found'::text, null::text, null::text, null::text; return; end if;
  if d.order_status <> 'paid'
     or exists (select 1 from pxs_transactions t where t.order_id = d.order_id and t.status = 'refunded') then
    return query select 'not_paid'::text, null::text, d.p_name, d.o_no; return;
  end if;
  if d.expires_at < now() then return query select 'expired'::text, null::text, d.p_name, d.o_no; return; end if;
  if d.download_count >= d.max_downloads then return query select 'limit'::text, null::text, d.p_name, d.o_no; return; end if;
  if d.p_key is null then return query select 'no_file'::text, null::text, d.p_name, d.o_no; return; end if;

  update pxs_downloads set download_count = download_count + 1, last_downloaded_at = now() where id = d.id;
  return query select 'ok'::text, d.p_key, d.p_name, d.o_no;
end $$;
revoke execute on function public.pxs_claim_download(text) from public, anon, authenticated;

-- 5) 7-day money-back guarantee everywhere (was "30-day" on the Mega Prompt Vault product card).
update public.pxs_products
   set features = (select jsonb_agg(case when value #>> '{}' ilike '%30-day money-back%'
                                         then to_jsonb('7-day money-back guarantee'::text) else value end)
                     from jsonb_array_elements(features))
 where features::text ilike '%30-day money-back%';
