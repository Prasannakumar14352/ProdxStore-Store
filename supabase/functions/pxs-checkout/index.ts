// ProdXStore checkout API (public). Creates Razorpay orders, verifies payments and
// delivers paid products (private R2 download link + order email).
//
// Secrets in Supabase (Edge Functions -> Secrets):
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET                      (payments)
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET   (product files)
//   RESEND_API_KEY                                            (order emails, optional)
// Without the R2 secrets, or for products without a file_key, buyers keep going to the
// product's thank_you_url exactly as before.
import { createClient } from "npm:@supabase/supabase-js@2";
import { AwsClient } from "npm:aws4fetch@1.0.20";

const KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const R2 = {
  account: Deno.env.get("R2_ACCOUNT_ID") ?? "",
  key: Deno.env.get("R2_ACCESS_KEY_ID") ?? "",
  secret: Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "",
  bucket: Deno.env.get("R2_BUCKET") ?? "",
};
const R2_READY = Boolean(R2.account && R2.key && R2.secret && R2.bucket);
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const PAY_ORIGIN = "https://pay.prodxstore.com";
const SUPPORT = "prodxstoresupport@gmail.com";
const MAIL_FROM = "ProdXStore <orders@prodxstore.com>";

const db = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_KEY, { auth: { persistSession: false } });

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const clean = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const UUID = /^[0-9a-f-]{36}$/i;
const TOKEN = /^[0-9a-f]{48}$/;
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const rupees = (p: number) => "₹" + (p / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });

async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function rzp(path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: "Basic " + btoa(`${KEY_ID}:${KEY_SECRET}`) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.description ?? "Razorpay error");
  return data;
}

async function startPayment(order: any, amount: number, kind: string, product: any) {
  const rOrder = await rzp("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount, currency: "INR", receipt: `${order.order_no}-${kind}`.slice(0, 40),
      notes: { source: "prodxstore", order_no: order.order_no, kind, product: order.product_name },
    }),
  });
  const { error } = await db.from("pxs_transactions").insert({
    order_id: order.id, product_id: order.product_id, product_name: order.product_name, kind,
    customer_name: order.customer_name, email: order.email, phone: order.phone,
    amount_paise: amount, razorpay_order_id: rOrder.id, status: "created",
  });
  if (error) throw error;
  return {
    key_id: KEY_ID, razorpay_order_id: rOrder.id, amount, currency: "INR",
    order_id: order.id, order_no: order.order_no, kind,
    product_name: order.product_name,
    prefill: { name: order.customer_name, email: order.email, contact: order.phone },
    thank_you_url: product?.thank_you_url ?? null,
  };
}

// ---------------------------------------------------------------- delivery

function newToken() {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** Short-lived (5 min) signed R2 URL that downloads the file as an attachment. */
async function signedFileUrl(key: string) {
  const client = new AwsClient({ accessKeyId: R2.key, secretAccessKey: R2.secret, service: "s3", region: "auto" });
  const path = key.split("/").map(encodeURIComponent).join("/");
  const url = new URL(`https://${R2.account}.r2.cloudflarestorage.com/${R2.bucket}/${path}`);
  url.searchParams.set("X-Amz-Expires", "300");
  const name = key.split("/").pop()!.replace(/"/g, "");
  url.searchParams.set("response-content-disposition", `attachment; filename="${name}"`);
  const signed = await client.sign(new Request(url, { method: "GET" }), { aws: { signQuery: true } });
  return signed.url;
}

function deliveryEmail(o: any, link: string, expires: Date, maxDownloads: number, invoice: string | null) {
  const until = expires.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
  const html = `<!doctype html><html><body style="margin:0;background:#161413;font-family:Arial,Helvetica,sans-serif;color:#f7f5f3">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#161413;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#1f1c1a;border:1px solid #34302d;border-radius:14px">
<tr><td style="padding:28px 28px 8px"><div style="font-size:18px;font-weight:700">Prod<span style="color:#ff7c0a">X</span>Store</div></td></tr>
<tr><td style="padding:8px 28px 0"><h1 style="font-size:22px;margin:12px 0 6px;color:#ffffff">Your download is ready</h1>
<p style="margin:0 0 4px;color:#c9c3be;font-size:15px">Hi ${esc(o.customer_name)}, thank you for buying <b style="color:#fff">${esc(o.product_name)}</b>.</p></td></tr>
<tr><td style="padding:22px 28px"><a href="${esc(link)}" style="display:inline-block;background:#ff7c0a;color:#1a0f05;font-weight:700;font-size:16px;text-decoration:none;padding:14px 26px;border-radius:12px">Download your files</a>
<p style="margin:14px 0 0;color:#a8a09a;font-size:13px">This private link works until ${until} and for up to ${maxDownloads} downloads. Please don't share it.</p></td></tr>
<tr><td style="padding:0 28px 22px"><table role="presentation" cellpadding="0" cellspacing="0" style="font-size:13px;color:#c9c3be">
<tr><td style="padding:2px 14px 2px 0;color:#a8a09a">Order</td><td>${esc(o.order_no)}</td></tr>
${invoice ? `<tr><td style="padding:2px 14px 2px 0;color:#a8a09a">Invoice</td><td>${esc(invoice)}</td></tr>` : ""}
<tr><td style="padding:2px 14px 2px 0;color:#a8a09a">Amount paid</td><td>${rupees(o.paid_paise)}</td></tr></table></td></tr>
<tr><td style="padding:0 28px 26px;border-top:1px solid #34302d"><p style="margin:16px 0 0;color:#a8a09a;font-size:13px;line-height:1.5">
Covered by our 7-day money-back guarantee. Need help? Reply to this email or write to <a href="mailto:${SUPPORT}" style="color:#ff9a3d">${SUPPORT}</a> with your order number.</p></td></tr>
</table></td></tr></table></body></html>`;
  const text = `Your download is ready\n\nHi ${o.customer_name}, thank you for buying ${o.product_name}.\n\nDownload: ${link}\n(Works until ${until}, up to ${maxDownloads} downloads. Please don't share it.)\n\nOrder: ${o.order_no}${invoice ? `\nInvoice: ${invoice}` : ""}\nAmount paid: ${rupees(o.paid_paise)}\n\n7-day money-back guarantee. Help: ${SUPPORT}`;
  return { subject: `Your download: ${o.product_name} (Order ${o.order_no})`, html, text };
}

/**
 * Create (or reuse) the order's private download link and email it once.
 * Returns null when the product isn't delivered through R2 (caller falls back to thank_you_url).
 * force=true (admin "resend"): resets the link's expiry and download count and always emails.
 */
async function deliver(orderId: string, force = false) {
  const { data: o } = await db.from("pxs_orders").select("*").eq("id", orderId).maybeSingle();
  if (!o || o.status !== "paid") return null;
  const { data: p } = await db.from("pxs_products").select("id, file_key, download_limit, download_days").eq("id", o.product_id).maybeSingle();
  if (!p?.file_key || !R2_READY) return null;

  const expires = new Date(Date.now() + (p.download_days || 7) * 86400_000);
  await db.from("pxs_downloads").upsert({
    order_id: o.id, product_id: p.id, token: newToken(),
    max_downloads: p.download_limit || 5, expires_at: expires.toISOString(),
  }, { onConflict: "order_id", ignoreDuplicates: true });
  if (force) {
    await db.from("pxs_downloads").update({ download_count: 0, expires_at: expires.toISOString(), max_downloads: p.download_limit || 5 })
      .eq("order_id", o.id);
  }
  const { data: d } = await db.from("pxs_downloads").select("*").eq("order_id", o.id).single();
  const link = `${PAY_ORIGIN}/d/${d.token}`;

  // Send the email once (or again when forced). The conditional update stops the browser
  // verify call and the Razorpay webhook from both sending it.
  let emailed = o.email_status === "sent";
  if (!RESEND_KEY) {
    if (!o.email_status) await db.from("pxs_orders").update({ email_status: "not_configured" }).eq("id", o.id);
  } else if (force || !emailed) {
    const { data: claimed } = await db.from("pxs_orders").update({ email_status: "sending", email_error: null })
      .eq("id", o.id).or(force ? "id.not.is.null" : "email_status.is.null,email_status.in.(failed,not_configured)")
      .select("id").maybeSingle();
    if (claimed) {
      const { data: tx } = await db.from("pxs_transactions").select("invoice_no").eq("order_id", o.id)
        .eq("status", "success").order("paid_at", { ascending: false }).limit(1).maybeSingle();
      const mail = deliveryEmail(o, link, new Date(d.expires_at), d.max_downloads, tx?.invoice_no ?? null);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json",
          ...(force ? {} : { "Idempotency-Key": `pxs-order-${o.id}` }),
        },
        body: JSON.stringify({ from: MAIL_FROM, to: [o.email], reply_to: SUPPORT, ...mail }),
      });
      if (res.ok) {
        emailed = true;
        await db.from("pxs_orders").update({ email_status: "sent", email_sent_at: new Date().toISOString() }).eq("id", o.id);
      } else {
        const err = (await res.text()).slice(0, 300);
        console.error("resend", err);
        await db.from("pxs_orders").update({ email_status: "failed", email_error: err }).eq("id", o.id);
      }
    }
  }
  return { download_url: link, emailed, email: o.email, expires_at: d.expires_at, max_downloads: d.max_downloads };
}

async function isAdmin(req: Request) {
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return false;
  const { data } = await db.auth.getUser(jwt);
  if (!data?.user) return false;
  const { data: ok } = await db.rpc("is_admin", { _user_id: data.user.id });
  return ok === true;
}

// ---------------------------------------------------------------- handler

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  try {
    // ---- Download page (/d/<token>) — does not need Razorpay keys
    if (body.action === "download_info" || body.action === "download") {
      const token = clean(body.token, 64);
      if (!TOKEN.test(token)) return json({ error: "This download link is not valid." }, 404);
      if (body.action === "download_info") {
        const { data: d } = await db.from("pxs_downloads")
          .select("expires_at, max_downloads, download_count, pxs_orders(order_no, product_name, status)")
          .eq("token", token).maybeSingle();
        if (!d) return json({ error: "This download link is not valid." }, 404);
        const o: any = (d as any).pxs_orders;
        return json({
          product_name: o?.product_name, order_no: o?.order_no, expires_at: d.expires_at,
          downloads_left: Math.max(d.max_downloads - d.download_count, 0),
          expired: new Date(d.expires_at) < new Date(), paid: o?.status === "paid",
        });
      }
      if (!R2_READY) return json({ error: "Downloads are temporarily unavailable. Please email " + SUPPORT }, 503);
      const { data: rows, error } = await db.rpc("pxs_claim_download", { p_token: token });
      if (error) throw error;
      const r = rows?.[0];
      const msg: Record<string, string> = {
        not_found: "This download link is not valid.",
        not_paid: "This order is not paid or was refunded.",
        expired: "This download link has expired.",
        limit: "This link has reached its download limit.",
        no_file: "This product's file isn't available yet.",
      };
      if (r?.result !== "ok") {
        return json({ error: `${msg[r?.result] ?? "Download failed."} Email ${SUPPORT}${r?.order_no ? ` with order ${r.order_no}` : ""} and we'll send a fresh link.` }, 410);
      }
      return json({ url: await signedFileUrl(r.file_key) });
    }

    // ---- Internal: Razorpay webhook asks us to deliver a paid order
    if (body.action === "deliver_internal") {
      const auth = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
      if (!safeEqual(auth, SERVICE_KEY)) return json({ error: "Forbidden" }, 403);
      if (!UUID.test(body.order_id ?? "")) return json({ error: "Invalid order" }, 400);
      return json({ ok: true, delivery: await deliver(body.order_id) });
    }

    // ---- HQ: resend an order's download email (admins only)
    if (body.action === "admin_resend") {
      if (!(await isAdmin(req))) return json({ error: "Forbidden" }, 403);
      if (!UUID.test(body.order_id ?? "")) return json({ error: "Invalid order" }, 400);
      const delivery = await deliver(body.order_id, true);
      if (!delivery) return json({ error: "This order is not paid, or its product has no file in storage yet" }, 400);
      return json({ ok: true, delivery });
    }

    if (!KEY_ID || !KEY_SECRET) return json({ error: "Payments are not configured yet" }, 503);

    // 1) New purchase: full price or deposit
    if (body.action === "create") {
      const slug = clean(body.slug, 80);
      const plan = body.plan === "deposit" ? "deposit" : "full";
      const name = clean(body.name, 80), email = clean(body.email, 120).toLowerCase(), phone = clean(body.phone, 20);
      if (!name || !/^\S+@\S+\.\S+$/.test(email) || !/^\+?[0-9 ]{10,15}$/.test(phone))
        return json({ error: "Please enter a valid name, email and phone number" }, 400);

      const { data: product } = await db.from("pxs_products").select("*")
        .eq("slug", slug).eq("is_active", true).maybeSingle();
      if (!product) return json({ error: "Product not found" }, 404);
      if (product.coming_soon) return json({ error: "This product is coming soon" }, 400);
      if (product.external_checkout_url || product.currency !== "INR")
        return json({ error: "This product is not sold through this checkout" }, 400);
      if (plan === "deposit" && !product.deposit_paise) return json({ error: "Part payment is not available for this product" }, 400);

      const { data: order, error } = await db.from("pxs_orders").insert({
        product_id: product.id, product_name: product.name, customer_name: name, email, phone,
        payment_plan: plan, total_paise: product.price_paise,
      }).select().single();
      if (error) throw error;
      const amount = plan === "deposit" ? product.deposit_paise : product.price_paise;
      return json(await startPayment(order, amount, plan, product));
    }

    // 2) Look up an order (for the "pay balance" page)
    if (body.action === "order") {
      if (!UUID.test(body.order_id ?? "")) return json({ error: "Invalid order" }, 400);
      const { data: o } = await db.from("pxs_orders")
        .select("order_no, product_name, customer_name, total_paise, paid_paise, status, payment_plan")
        .eq("id", body.order_id).maybeSingle();
      if (!o) return json({ error: "Order not found" }, 404);
      return json({ ...o, balance_paise: Math.max(o.total_paise - o.paid_paise, 0) });
    }

    // 3) Pay the remaining balance of a deposit order
    if (body.action === "balance") {
      if (!UUID.test(body.order_id ?? "")) return json({ error: "Invalid order" }, 400);
      const { data: order } = await db.from("pxs_orders").select("*").eq("id", body.order_id).maybeSingle();
      if (!order) return json({ error: "Order not found" }, 404);
      const balance = order.total_paise - order.paid_paise;
      if (order.status !== "partially_paid" || balance <= 0) return json({ error: "Nothing left to pay on this order" }, 400);
      const { data: product } = await db.from("pxs_products").select("thank_you_url").eq("id", order.product_id).maybeSingle();
      return json(await startPayment(order, balance, "balance", product));
    }

    // 4) Verify the payment signature returned by Razorpay Checkout, then deliver
    if (body.action === "verify") {
      const oid = clean(body.razorpay_order_id, 40), pid = clean(body.razorpay_payment_id, 40), sig = clean(body.razorpay_signature, 128);
      const expected = await hmacHex(KEY_SECRET, `${oid}|${pid}`);
      if (!oid || !pid || !safeEqual(expected, sig)) return json({ error: "Payment could not be verified" }, 400);

      let pay: any = null;
      try { pay = await rzp(`/payments/${pid}`); } catch { /* details are optional */ }
      const { data: tx, error } = await db.from("pxs_transactions").update({
        status: "success", razorpay_payment_id: pid, method: pay?.method ?? null,
        fee_paise: pay?.fee ?? null, tax_paise: pay?.tax ?? null,
        paid_at: pay?.created_at ? new Date(pay.created_at * 1000).toISOString() : new Date().toISOString(),
        raw: pay,
      }).eq("razorpay_order_id", oid).neq("status", "success").select().maybeSingle();
      if (error) throw error;

      const { data: final } = await db.from("pxs_transactions")
        .select("invoice_no, order_id, product_id, amount_paise, kind").eq("razorpay_order_id", oid).maybeSingle();
      const { data: order } = await db.from("pxs_orders").select("status, total_paise, paid_paise, order_no").eq("id", final?.order_id).maybeSingle();
      const { data: product } = await db.from("pxs_products").select("thank_you_url").eq("id", final?.product_id).maybeSingle();

      let delivery = null;
      if (order?.status === "paid") {
        try { delivery = await deliver(final!.order_id); } catch (e) { console.error("deliver", e); }
      }
      return json({
        ok: true, invoice_no: final?.invoice_no, order_no: order?.order_no, order_id: final?.order_id,
        order_status: order?.status, balance_paise: order ? Math.max(order.total_paise - order.paid_paise, 0) : 0,
        thank_you_url: order?.status === "paid" && !delivery ? product?.thank_you_url ?? null : null,
        delivery, already_recorded: !tx,
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
