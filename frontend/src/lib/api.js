// Data layer for prodxstore.com. It used to call a separate Python server (/api/...).
// It now reads and writes the shared Supabase database directly, so the site needs no backend.
// `api.get/post` keep the same paths and response shapes the components already use.
import { sb, CHECKOUT_BASE } from "./supabase";

const SUPPORT_EMAIL = "prodxstoresupport@gmail.com";

// ---------- products ----------
const unique = (arr) => [...new Set(arr.filter(Boolean))];

export const toProduct = (r) => {
  const price = (r.price_paise || 0) / 100;
  const mrp = r.mrp_paise ? r.mrp_paise / 100 : null;
  const ownCheckout = !r.external_checkout_url && r.currency === "INR" && !r.coming_soon;
  return {
    id: r.slug,
    uuid: r.id,
    name: r.name,
    tagline: r.tagline || "",
    description: r.description || "",
    category: r.category || "",
    image: r.image || "",
    gallery: unique([r.image, ...(r.gallery || [])]),
    price,
    compare_at: mrp && mrp > price ? mrp : null,
    currency: r.currency || "INR",
    billing_period: r.billing_period || "one-time",
    price_note: r.price_note || r.gst_note || "",
    landing_url: r.landing_url || "",
    checkout_url: r.external_checkout_url || (ownCheckout ? `${CHECKOUT_BASE}/checkout/${r.slug}` : r.landing_url || ""),
    pricing_url: r.pricing_url || "",
    features: r.features || [],
    plans: r.plans || [],
    badge: r.badge || "",
    featured: !!r.featured,
    published: true,
    order: r.display_order || 0,
    status: r.coming_soon ? "coming_soon" : "published",
    whats_included: r.whats_included || [],
    cta_text: r.cta_text || "Buy now",
    offer_badge: r.offer_badge || "",
    offer_ends_at: r.offer_ends_at || null,
    deposit: r.deposit_paise ? r.deposit_paise / 100 : null,
    created_at: r.created_at || "",
  };
};

let productsCache = null;
const loadProducts = async () => {
  if (!productsCache) {
    productsCache = sb
      .from("pxs_products")
      .select("*")
      .eq("is_active", true)
      .eq("show_in_store", true)
      .order("featured", { ascending: false })
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) { productsCache = null; throw error; }
        return (data || []).map(toProduct);
      });
  }
  return productsCache;
};

const listProducts = async ({ q = "", category = "", badge = "" } = {}) => {
  const all = await loadProducts();
  const needle = q.trim().toLowerCase();
  return all.filter((p) =>
    (!category || p.category === category) &&
    (!badge || p.badge === badge) &&
    (!needle || [p.name, p.tagline, p.description, p.category, ...p.features].join(" ").toLowerCase().includes(needle))
  );
};

const getProduct = async (slug) => {
  const p = (await loadProducts()).find((x) => x.id === slug);
  if (!p) throw notFound("Product not found");
  return p;
};

// ---------- reviews ----------
const REVIEW_COLS = "id, product_id, customer_name, rating, body, is_featured, is_verified_buyer, created_at";

const toReview = (r, products) => {
  const p = products.find((x) => x.uuid === r.product_id);
  return {
    id: r.id, name: r.customer_name, quote: r.body, rating: r.rating,
    product: p?.name || "", product_id: p?.id || "", status: "approved", verified: true,
    featured: r.is_featured, verified_buyer: r.is_verified_buyer, email: "", created_at: r.created_at, role: "",
  };
};

const listReviews = async ({ product_id } = {}) => {
  const products = await loadProducts();
  let q = sb.from("pxs_reviews").select(REVIEW_COLS).eq("status", "approved");
  if (product_id) {
    const p = products.find((x) => x.id === product_id);
    if (!p) return [];
    q = q.eq("product_id", p.uuid).order("created_at", { ascending: false }).limit(60);
  } else {
    q = q.order("is_featured", { ascending: false }).order("created_at", { ascending: false }).limit(6);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map((r) => toReview(r, products));
};

const rating = async (slug) => {
  const p = await getProduct(slug);
  const { data } = await sb.from("pxs_product_ratings").select("average, count").eq("product_id", p.uuid).maybeSingle();
  return data?.count ? { average: Number(data.average), count: data.count } : { average: null, count: 0 };
};

const submitReview = async (slug, b) => {
  const p = await getProduct(slug);
  const quote = (b.quote || "").trim();
  if (!b.name?.trim() || !/^\S+@\S+\.\S+$/.test(b.email || "") || quote.length < 10 || !(b.rating >= 1 && b.rating <= 5))
    throw badRequest("Please fill in your name, a valid email, a star rating and at least a short review.");
  const { error } = await sb.from("pxs_reviews").insert({
    product_id: p.uuid, customer_name: b.name.trim().slice(0, 80), customer_email: b.email.trim().toLowerCase().slice(0, 200),
    rating: b.rating, body: quote.slice(0, 1500),
  });
  if (error) throw badRequest(error.message);
  return { ok: true };
};

// ---------- settings, contact, newsletter ----------
const DEFAULT_OFFER = { enabled: false, label: "", text: "", link_url: "", link_label: "", countdown_minutes: 0 };
const offer = async () => {
  const { data } = await sb.from("pxs_settings").select("value").eq("key", "offer_banner").maybeSingle();
  return { ...DEFAULT_OFFER, ...(data?.value || {}) };
};

const contact = async (b) => {
  if (!b.name?.trim() || !/^\S+@\S+\.\S+$/.test(b.email || "") || (b.message || "").trim().length < 5)
    throw badRequest("Please check your email address and write at least a short message.");
  const id = crypto.randomUUID();
  const row = {
    id, name: b.name.trim().slice(0, 120), email: b.email.trim().toLowerCase().slice(0, 200),
    topic: (b.topic || "General").slice(0, 80), message: b.message.trim().slice(0, 4000),
  };
  const { error } = await sb.from("pxs_messages").insert(row);
  if (error) throw badRequest(error.message);
  return { ...row, resolved: false, created_at: new Date().toISOString(), reference: `PX-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}` };
};

const subscribe = async ({ email }) => {
  const e = (email || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(e)) throw badRequest("Please enter a valid email address.");
  const { error } = await sb.from("pxs_subscribers").insert({ email: e });
  if (error && error.code !== "23505") throw badRequest(error.message); // 23505 = already subscribed
  return { ok: true };
};

// ---------- tiny router keeping the old axios-style API ----------
function httpError(status, detail) {
  const e = new Error(detail);
  e.response = { status, data: { detail } };
  return e;
}
const notFound = (m) => httpError(404, m);
const badRequest = (m) => httpError(400, m);
const ok = (data) => ({ data });

async function get(path, { params = {} } = {}) {
  let m;
  if (path === "/products") return ok(await listProducts(params));
  if ((m = path.match(/^\/products\/([^/]+)\/rating$/))) return ok(await rating(m[1]));
  if ((m = path.match(/^\/products\/([^/]+)$/))) return ok(await getProduct(m[1]));
  if (path === "/testimonials") return ok(await listReviews(params));
  if (path === "/settings/offer") return ok(await offer());
  if (path === "/config") return ok({ support_email: SUPPORT_EMAIL });
  throw notFound(`Unknown path ${path}`);
}

async function post(path, body = {}) {
  let m;
  if (path === "/contact") return ok(await contact(body));
  if (path === "/newsletter") return ok(await subscribe(body));
  if ((m = path.match(/^\/products\/([^/]+)\/reviews$/))) return ok(await submitReview(m[1], body));
  throw notFound(`Unknown path ${path}`);
}

export const api = { get, post };
export const API = "";

// ---------- helpers used across the store ----------
export const money = (value, currency = "USD") =>
  new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);

export const periodLabel = (period) =>
  period === "one-time" ? "one-time payment" : period;

export const scrollToId = (id) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

// Product images: full URLs pass through; a product without an image gets a branded placeholder.
const PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 400'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#2a2118'/><stop offset='1' stop-color='#16130f'/></linearGradient></defs><rect width='640' height='400' fill='url(#g)'/><rect x='270' y='150' width='100' height='100' rx='26' fill='#FF850A'/><text x='320' y='222' font-family='Arial,sans-serif' font-size='64' font-weight='800' text-anchor='middle' fill='#1a1510'>P</text></svg>"
  );
export const imgSrc = (u) => u || PLACEHOLDER;
