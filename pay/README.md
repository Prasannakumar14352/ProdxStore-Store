# pay.prodxstore.com — ProdXStore checkout

Static page (no build step) served by the Vercel project **prodxstore-pay**.

- `/checkout/<slug>` — product checkout (Razorpay)
- `/order/<order-id>` — pay the balance of a part-payment order
- `/d/<token>` — private download page for a paid order (link is emailed to the buyer)

Backend: Supabase edge functions in `../supabase/functions/` (`pxs-checkout`, `pxs-razorpay-webhook`).

## Delivery (Phase 4)
A product is delivered from Cloudflare R2 when its `pxs_products.file_key` is set
(e.g. `kids-stories/50_Kids_Stories_Mega_Bundle.zip`) and the R2 secrets exist in Supabase.
Otherwise buyers are sent to the product's `thank_you_url` as before.
Links last `download_days` (default 7) and allow `download_limit` downloads (default 5).
