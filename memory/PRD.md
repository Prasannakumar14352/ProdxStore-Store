# ProdXStore — PRD
## Original problem
English online store for ProdXStore (digital product catalogue for creators, featuring CreatorFlow AI). Warm/friendly, charcoal bg, orange accents, mobile-first. Hero with creator outcome + Shop products; About, Services, searchable Shop w/ details, Pricing per product w/ plan comparison + offer links, Featured CreatorFlow AI (https://creatorflowai.prodxstore.com/, /pricing), Gallery of real previews, verified Testimonials, FAQ (access/billing), Contact. Admin Google sign-in + public catalogue.
## Decisions (from user)
- Products: start with CreatorFlow AI + other ProdXStore products; admin adds more later
- Differentiator: "It saves creators hours every week on content work; Everything a creator needs is in one place"
- Contact: short form + email (email not yet given → SUPPORT_EMAIL env, hidden when empty)
- Admin: only listed Google emails (ADMIN_EMAILS env; not yet given)
## Architecture
FastAPI + MongoDB (products, testimonials, messages, users, user_sessions). Seed in backend/seed.py from live public pages. React single page (components/store/*) + /admin (components/admin/*). Emergent Google Auth.
## Implemented (2026-11-26)
- Public: /api/products (q, category search), /api/products/{id}, /api/testimonials (verified+published only), /api/contact, /api/config
- Admin: products CRUD, testimonials CRUD + verified/published toggles, messages list/resolve/delete
- Store page all sections; shop search/filter + detail dialog; pricing tabs w/ monthly/yearly; gallery lightbox
## Implemented (2026-11-26, iteration 2)
- ADMIN_EMAILS=prasannaskvd@gmail.com; SUPPORT_EMAIL=prodxstoresupport@gmail.com shown in Contact
- Contact alerts via Emergent managed Resend (backend/email_alerts.py) to SUPPORT_EMAIL, background task, 5 msgs/10min per IP
- OfferBanner: 20% CreatorFlow AI launch offer, 60-min countdown resetting each visit (user choice), dismissible
## Implemented (2026-11-26, iteration 3)
- Admin image upload (cover + gallery) via Emergent object storage: POST /api/admin/uploads (admin, jpg/png/webp/gif, 8MB), public GET /api/files/{path}; files collection with is_deleted; frontend imgSrc() prefixes /api paths
- Contact: on-page confirmation panel with reference PX-XXXXXX (also in alert email + admin list). Customer auto-reply email NOT built (email guardrail: no sending to visitor-typed addresses)
- SEO: title/description, OG/Twitter (image = CreatorFlow video.jpg 960x540), OnlineStore JSON-LD (no prices/ratings), noscript fallback, favicon, robots.txt (AI bots group, Disallow /api/ /admin), llms.txt. No canonical/og:url/sitemap until production domain is confirmed.
## Implemented (2026-11-26, iteration 4)
- Domain chosen: https://prodxstore.com (SITE_URL env; canonical/og:url/sitemap.xml/robots Sitemap use it). User connects it via Deploy > Manage Publishes > Domain.
- Product pages /product/:id with per-route meta (lib/meta.js usePageMeta), share buttons; /api/share/{id} returns static OG HTML then redirects (WhatsApp cards per product). robots allows /api/share/
- Newsletter: footer form, POST /api/newsletter (dedupe, rate-limited), admin Subscribers tab + CSV export + remove. Welcome email NOT built (email guardrail: no sends to visitor-typed addresses)
- Offer banner editable in admin (settings collection key=offer: enabled, label, text, link_url, link_label, countdown_minutes; countdown resets each visit)
## Implemented (2026-11-26, iteration 5)
- Dynamic sitemap GET /api/sitemap.xml from published products (lastmod = updated_at/created_at); robots.txt Sitemap -> /api/sitemap.xml (allowed); static sitemap.xml removed
- Testimonials have product_id (admin Select per testimonial); GET /api/testimonials?product_id=; product page shows verified reviews section (hidden if none)
- Product page "You might also like": up to 3 products, same category first
## Implemented (2026-11-26, iteration 6)
- Customer reviews: "Leave a review" dialog on product pages -> POST /api/products/{id}/reviews (name, email, role, quote; 3/10min per IP); saved verified=false, source=customer; email admin-only (excluded from public API). Admin Testimonials tab shows pending first with email; toggle Verified to publish.
- Shop badge filter ("Picks": Featured / Best Seller / Trending, from product badges) via GET /api/products?badge=
## Implemented (2026-11-26, iteration 7)
- Review alert email to SUPPORT_EMAIL on each customer review (email_alerts.review_alert_html, background task)
- Star ratings: required 1–5 on customer reviews (StarPicker), stars on review cards + admin rows; GET /api/products/{id}/rating = verified avg + count; shown under product title and in reviews header
- Supabase schema export: /app/supabase/prodxstore_schema.sql (tables, RLS with admin_emails + is_admin(), public views, seed data, storage bucket). App itself still runs on MongoDB + Emergent Google auth.
## Implemented (2026-11-26, iteration 8) — MOVED TO SUPABASE
- Data now in owner's EXISTING Supabase project (same DB as live prodxstore.com). MongoDB no longer used by the app.
- Reuses existing tables: products (slug = public id; INR prices; status published/coming_soon public; delete = archive), reviews (status pending/approved/rejected/hidden, is_featured → home), settings (key store_offer_banner, JSON text), profiles (role admin/super_admin = store admin), storage bucket product-images (uploads via admin's own JWT).
- Added via /app/supabase/prodxstore_store_addon.sql (already applied): store_product_extras (currency, billing_period, plans, pricing/checkout urls), store_support_messages, store_newsletter_subscribers (RLS on, no policies; backend uses pooler connection). Inserted CreatorFlow AI product (USD, plans).
- Backend: db.py (SQLAlchemy async + asyncpg, statement_cache_size=0; sb_url.py url-encodes password), catalogue.py, routes_store.py, supa_auth.py. Alembic intentionally NOT used: autogenerate against the shared live DB would try to drop the live site's tables.
- Frontend: lib/supabase.js (client from /api/config, PKCE, Google OAuth redirect to /admin, axios interceptor adds bearer); admin Reviews tab (status select + home toggle); CSV download via blob.
- Owner must add Redirect URLs in Supabase Auth URL config: https://prodxstore.com/admin and preview /admin.
## Backlog
- P1: FAQPage JSON-LD once owner confirms FAQ billing/refund wording
- P2: newsletter signup
