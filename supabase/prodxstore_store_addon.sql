-- =====================================================================
-- ProdXStore storefront — ADD-ON for your existing Supabase project
-- Purely additive: creates 3 new "store_" tables, adds CreatorFlow AI to
-- your existing products table (skipped if the slug already exists) and
-- stores the offer banner in your existing settings table.
-- It does NOT change, drop or rewrite any existing table, policy or row.
-- Safe to run more than once.
-- (Replaces the earlier prodxstore_schema.sql — do not run that one.)
-- =====================================================================

-- Pricing details the products table has no columns for (plans, currency, billing period).
create table if not exists public.store_product_extras (
  product_id      uuid primary key references public.products (id) on delete cascade,
  currency        text not null default 'INR',
  billing_period  text not null default 'one-time',
  price_note      text not null default '',
  checkout_url    text not null default '',
  pricing_url     text not null default '',
  plans           jsonb not null default '[]'::jsonb,
  updated_at      timestamptz not null default now()
);

-- Contact form messages.
create table if not exists public.store_support_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 120),
  email       text not null,
  topic       text not null default 'General',
  message     text not null check (char_length(message) between 5 and 4000),
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists store_support_messages_created_idx on public.store_support_messages (created_at desc);

-- Newsletter signups.
create table if not exists public.store_newsletter_subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique check (email = lower(email)),
  created_at  timestamptz not null default now()
);

-- Locked down: only the store's server (database connection) can read/write these.
alter table public.store_product_extras        enable row level security;
alter table public.store_support_messages      enable row level security;
alter table public.store_newsletter_subscribers enable row level security;

-- CreatorFlow AI in the catalogue (USD subscription with plans).
insert into public.products
  (name, slug, category, tagline, description, price, original_price, badge, features, whats_included,
   image, screenshots, product_type, status, landing_page_url, cta_text, open_in_new_tab, featured,
   display_order, target_audience, card_short_description, price_label, product_type_id, product_status_id)
select
  'CreatorFlow AI', 'creatorflow-ai', 'AI Software',
  'Turn one idea into videos, ads & posts — in your language.',
  'CreatorFlow AI turns a single idea into a full creator project — scripts, scenes, AI images, captions, hashtags and voiceover. Review every scene before a single media credit is spent, then download or schedule straight to YouTube.',
  9, 0, 'Featured',
  '["Script → Video","Idea → Video","Business promo videos","Ad creatives","Carousels & thumbnails","Planner & YouTube publishing","Captions in 100+ languages"]'::jsonb,
  '[]'::jsonb,
  'https://creatorflowai.prodxstore.com/walkthroughs/video.jpg',
  '["https://creatorflowai.prodxstore.com/walkthroughs/video.jpg","https://creatorflowai.prodxstore.com/walkthroughs/research.jpg","https://creatorflowai.prodxstore.com/walkthroughs/thumbnails.jpg","https://creatorflowai.prodxstore.com/walkthroughs/images.jpg","https://creatorflowai.prodxstore.com/walkthroughs/carousels.jpg","https://creatorflowai.prodxstore.com/walkthroughs/captions.jpg","https://creatorflowai.prodxstore.com/walkthroughs/planner.jpg","https://creatorflowai.prodxstore.com/walkthroughs/analytics.jpg"]'::jsonb,
  'saas_application', 'published', 'https://creatorflowai.prodxstore.com/', 'View Product', true, true,
  0, 'YouTubers, Instagram & LinkedIn creators, coaches and small businesses',
  'Your AI content studio: one idea becomes videos, ads, carousels and posts.',
  'Free plan · paid plans from $9/month',
  (select id from public.product_types where slug = 'saas_application'),
  (select id from public.product_statuses where slug = 'published')
where not exists (select 1 from public.products where slug = 'creatorflow-ai');

insert into public.store_product_extras (product_id, currency, billing_period, price_note, checkout_url, pricing_url, plans)
select p.id, 'USD', 'per month', 'Free plan with 50 credits · paid plans from $9/month',
  'https://creatorflowai.prodxstore.com/pricing', 'https://creatorflowai.prodxstore.com/pricing',
  '[
    {"name":"Free","price_monthly":0,"price_yearly":0,"note":"50 signup credits","features":["50 signup credits","AI images, carousels, captions & LinkedIn posts","Community styles","Uses credit balance only"],"recommended":false,"cta_url":"https://creatorflowai.prodxstore.com/auth"},
    {"name":"Starter","price_monthly":9,"price_yearly":90,"note":"500 credits / month","features":["500 credits / month","All content types","Standard visual styles","Priority queue","All updates while subscribed"],"recommended":false,"cta_url":"https://creatorflowai.prodxstore.com/pricing"},
    {"name":"Creator","price_monthly":19,"price_yearly":190,"note":"1,200 credits / month","features":["1,200 credits / month","Premium styles","Voice selection","Priority support","All updates while subscribed"],"recommended":true,"cta_url":"https://creatorflowai.prodxstore.com/pricing"},
    {"name":"Pro","price_monthly":39,"price_yearly":390,"note":"3,000 credits / month","features":["3,000 credits / month","Advanced styles + presets","Brand kits","Priority rendering","All updates while subscribed"],"recommended":false,"cta_url":"https://creatorflowai.prodxstore.com/pricing"}
  ]'::jsonb
from public.products p
where p.slug = 'creatorflow-ai'
on conflict (product_id) do nothing;

-- Offer banner (editable from the store admin).
insert into public.settings (key, value)
values ('store_offer_banner', '{"enabled": true, "label": "Launch offer:", "text": "20% off every CreatorFlow AI plan & credit pack — applied at checkout", "link_url": "https://creatorflowai.prodxstore.com/pricing", "link_label": "See plans", "countdown_minutes": 60}')
on conflict (key) do nothing;

-- To undo the CreatorFlow AI catalogue entry later:
--   delete from public.products where slug = 'creatorflow-ai';
