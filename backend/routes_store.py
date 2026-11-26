"""All /api routes for the ProdXStore storefront, backed by the owner's Supabase project."""
import csv
import io
import json
import os
import time
import uuid
from collections import defaultdict, deque
from datetime import datetime, timezone
from html import escape
from typing import List, Optional

import httpx
from fastapi import APIRouter, BackgroundTasks, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel, EmailStr, Field

import catalogue
from catalogue import Product, ProductIn
from db import execute, fetch, fetchrow
from email_alerts import contact_alert_html, review_alert_html, send_email
from supa_auth import User, bearer, current_user, require_admin

router = APIRouter(prefix="/api")

IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}
MAX_IMAGE_BYTES = 8 * 1024 * 1024
OFFER_KEY = "store_offer_banner"

# ---------- helpers ----------
_hits: dict[str, deque] = defaultdict(deque)


def rate_limited(key: str, limit: int = 5, window: int = 600) -> bool:
    hits, now = _hits[key], time.monotonic()
    while hits and now - hits[0] > window:
        hits.popleft()
    if len(hits) >= limit:
        return True
    hits.append(now)
    return False


def client_ip(request: Request) -> str:
    return request.headers.get("x-forwarded-for", request.client.host if request.client else "").split(",")[0].strip()


def iso(v) -> str:
    return v.isoformat() if hasattr(v, "isoformat") else str(v or "")


def ref(uid) -> str:
    return str(uid).replace("-", "")[:6].upper()


# ---------- config & auth ----------
@router.get("/")
async def root():
    return {"message": "ProdXStore API"}


@router.get("/config")
async def config():
    return {
        "support_email": os.environ.get("SUPPORT_EMAIL", ""),
        "supabase_url": os.environ["SUPABASE_URL"],
        "supabase_anon_key": os.environ["SUPABASE_ANON_KEY"],
    }


@router.get("/auth/me", response_model=User)
async def me(request: Request):
    return await current_user(request)


# ---------- catalogue ----------
@router.get("/products", response_model=List[Product])
async def list_products(q: str = "", category: str = "", badge: str = ""):
    return await catalogue.list_public(q, category, badge)


@router.get("/products/{slug}", response_model=Product)
async def get_product(slug: str):
    p = await catalogue.get_by_slug(slug)
    if not p:
        raise HTTPException(404, "Product not found")
    return p


@router.get("/admin/products", response_model=List[Product])
async def admin_products(request: Request):
    await require_admin(request)
    return [p for p in await catalogue.list_all() if p.status != "archived"]


@router.post("/admin/products", response_model=Product)
async def admin_create_product(body: ProductIn, request: Request):
    await require_admin(request)
    return await catalogue.create(body)


@router.put("/admin/products/{slug}", response_model=Product)
async def admin_update_product(slug: str, body: ProductIn, request: Request):
    await require_admin(request)
    p = await catalogue.update(slug, body)
    if not p:
        raise HTTPException(404, "Product not found")
    return p


@router.delete("/admin/products/{slug}")
async def admin_delete_product(slug: str, request: Request):
    await require_admin(request)
    await catalogue.archive(slug)
    return {"ok": True}


# ---------- reviews (existing `reviews` table) ----------
class Review(BaseModel):
    id: str
    name: str
    quote: str
    rating: Optional[int] = None
    product: str = ""
    product_id: str = ""
    status: str = "pending"
    verified: bool = False
    featured: bool = False
    verified_buyer: bool = False
    email: str = ""
    created_at: str = ""
    role: str = ""


REVIEW_SELECT = """select r.id, r.customer_name, r.customer_email, r.rating, r.body, r.status, r.is_featured,
  r.is_verified_buyer, r.created_at, p.name as product_name, p.slug as product_slug
  from reviews r join products p on p.id = r.product_id"""


def to_review(r: dict, with_email: bool = False) -> Review:
    return Review(
        id=str(r["id"]), name=r["customer_name"], quote=r["body"], rating=r["rating"], product=r["product_name"],
        product_id=r["product_slug"], status=r["status"], verified=r["status"] == "approved", featured=r["is_featured"],
        verified_buyer=r["is_verified_buyer"], email=r["customer_email"] if with_email else "", created_at=iso(r["created_at"]),
    )


@router.get("/testimonials", response_model=List[Review])
async def list_testimonials(product_id: str = ""):
    if product_id:
        rows = await fetch(REVIEW_SELECT + " where r.status = 'approved' and p.slug = :slug order by r.created_at desc limit 60", slug=product_id)
    else:
        rows = await fetch(REVIEW_SELECT + " where r.status = 'approved' order by r.is_featured desc, r.created_at desc limit 6")
    return [to_review(r) for r in rows]


@router.get("/products/{slug}/rating")
async def product_rating(slug: str):
    r = await fetchrow(
        """select round(avg(r.rating)::numeric, 1) as avg, count(*) as n from reviews r join products p on p.id = r.product_id
           where p.slug = :slug and r.status = 'approved'""", slug=slug)
    if not r or not r["n"]:
        return {"average": None, "count": 0}
    return {"average": float(r["avg"]), "count": int(r["n"])}


class ReviewIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    rating: int = Field(ge=1, le=5)
    quote: str = Field(min_length=10, max_length=1500)


@router.post("/products/{slug}/reviews")
async def submit_review(slug: str, body: ReviewIn, request: Request, background: BackgroundTasks):
    if rate_limited(f"rv:{client_ip(request)}", limit=3):
        raise HTTPException(429, "Too many reviews — please try again later")
    p = await fetchrow("select id, name from products where slug = :slug and status in ('published','coming_soon')", slug=slug)
    if not p:
        raise HTTPException(404, "Product not found")
    await execute(
        """insert into reviews (product_id, customer_name, customer_email, rating, body, status)
           values (:pid, :name, :email, :rating, :body, 'pending')""",
        pid=p["id"], name=body.name, email=body.email.lower(), rating=body.rating, body=body.quote,
    )
    support = os.environ.get("SUPPORT_EMAIL", "")
    if support:
        background.add_task(send_email, to=support, subject=f"New {body.rating}-star review waiting for your check: {p['name']}",
                            html=review_alert_html({"product": p["name"], "rating": body.rating, "name": body.name,
                                                    "role": "", "email": body.email.lower(), "quote": body.quote}))
    return {"ok": True}


@router.get("/admin/testimonials", response_model=List[Review])
async def admin_reviews(request: Request):
    await require_admin(request)
    rows = await fetch(REVIEW_SELECT + " order by (r.status = 'pending') desc, r.created_at desc limit 500")
    return [to_review(r, with_email=True) for r in rows]


class AdminReviewIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    quote: str = Field(min_length=10, max_length=1500)
    product_id: str
    rating: int = Field(ge=1, le=5)
    email: str = ""


@router.post("/admin/testimonials")
async def admin_add_review(body: AdminReviewIn, request: Request):
    await require_admin(request)
    p = await fetchrow("select id from products where slug = :slug", slug=body.product_id)
    if not p:
        raise HTTPException(400, "Pick a product for this review")
    await execute(
        """insert into reviews (product_id, customer_name, customer_email, rating, body, status)
           values (:pid, :name, :email, :rating, :body, 'approved')""",
        pid=p["id"], name=body.name, email=body.email.lower(), rating=body.rating, body=body.quote,
    )
    return {"ok": True}


class ReviewPatch(BaseModel):
    status: Optional[str] = Field(default=None, pattern="^(pending|approved|rejected|hidden)$")
    featured: Optional[bool] = None
    product_id: Optional[str] = None


@router.patch("/admin/testimonials/{rid}")
async def admin_patch_review(rid: str, body: ReviewPatch, request: Request):
    await require_admin(request)
    sets, params = [], {"rid": rid}
    if body.status is not None:
        sets.append("status = :status"); params["status"] = body.status
    if body.featured is not None:
        sets.append("is_featured = :featured"); params["featured"] = body.featured
    if body.product_id:
        sets.append("product_id = (select id from products where slug = :slug)"); params["slug"] = body.product_id
    if sets:
        await execute(f"update reviews set {', '.join(sets)} where id = cast(:rid as uuid)", **params)
    return {"ok": True}


# ---------- contact messages ----------
class MessageIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    topic: str = Field(default="General", max_length=80)
    message: str = Field(min_length=5, max_length=4000)


class Message(MessageIn):
    id: str
    created_at: str
    resolved: bool = False
    reference: str = ""


def to_message(r: dict) -> Message:
    return Message(id=str(r["id"]), name=r["name"], email=r["email"], topic=r["topic"], message=r["message"],
                   created_at=iso(r["created_at"]), resolved=r["resolved"], reference=f"PX-{ref(r['id'])}")


@router.post("/contact", response_model=Message)
async def contact(body: MessageIn, request: Request, background: BackgroundTasks):
    if rate_limited(client_ip(request)):
        raise HTTPException(429, "Too many messages — please try again in a few minutes")
    rows = await execute(
        """insert into store_support_messages (name, email, topic, message) values (:name, :email, :topic, :message)
           returning *""", **body.model_dump())
    msg = to_message(rows[0])
    support = os.environ.get("SUPPORT_EMAIL", "")
    if support:
        background.add_task(send_email, to=support, subject=f"New ProdXStore support message: {msg.topic}",
                            html=contact_alert_html({**msg.model_dump(), "id": ref(msg.id)}))
    return msg


@router.get("/admin/messages", response_model=List[Message])
async def admin_messages(request: Request, limit: int = Query(200, ge=1, le=500)):
    await require_admin(request)
    rows = await fetch("select * from store_support_messages order by created_at desc limit :limit", limit=limit)
    return [to_message(r) for r in rows]


@router.patch("/admin/messages/{mid}")
async def admin_toggle_message(mid: str, request: Request):
    await require_admin(request)
    rows = await execute("update store_support_messages set resolved = not resolved where id = cast(:id as uuid) returning resolved", id=mid)
    if not rows:
        raise HTTPException(404, "Message not found")
    return {"ok": True, "resolved": rows[0]["resolved"]}


@router.delete("/admin/messages/{mid}")
async def admin_delete_message(mid: str, request: Request):
    await require_admin(request)
    await execute("delete from store_support_messages where id = cast(:id as uuid)", id=mid)
    return {"ok": True}


# ---------- newsletter ----------
class SubscribeIn(BaseModel):
    email: EmailStr


@router.post("/newsletter")
async def subscribe(body: SubscribeIn, request: Request):
    if rate_limited(f"nl:{client_ip(request)}"):
        raise HTTPException(429, "Too many signups — please try again in a few minutes")
    await execute("insert into store_newsletter_subscribers (email) values (:e) on conflict (email) do nothing", e=body.email.lower())
    return {"ok": True}


@router.get("/admin/subscribers")
async def list_subscribers(request: Request):
    await require_admin(request)
    rows = await fetch("select id, email, created_at from store_newsletter_subscribers order by created_at desc limit 5000")
    return [{"id": str(r["id"]), "email": r["email"], "created_at": iso(r["created_at"])} for r in rows]


@router.get("/admin/subscribers.csv")
async def export_subscribers(request: Request):
    await require_admin(request)
    rows = await fetch("select email, created_at from store_newsletter_subscribers order by created_at")
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["email", "subscribed_at"])
    for r in rows:
        w.writerow([r["email"], iso(r["created_at"])])
    return Response(buf.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": 'attachment; filename="prodxstore-subscribers.csv"'})


@router.delete("/admin/subscribers/{sid}")
async def remove_subscriber(sid: str, request: Request):
    await require_admin(request)
    await execute("delete from store_newsletter_subscribers where id = cast(:id as uuid)", id=sid)
    return {"ok": True}


# ---------- offer banner (existing `settings` table) ----------
class OfferIn(BaseModel):
    enabled: bool = True
    label: str = Field(default="Launch offer:", max_length=40)
    text: str = Field(min_length=1, max_length=160)
    link_url: str = Field(default="", max_length=500)
    link_label: str = Field(default="See plans", max_length=40)
    countdown_minutes: int = Field(default=60, ge=0, le=1440)


@router.get("/settings/offer", response_model=OfferIn)
async def get_offer():
    r = await fetchrow("select value from settings where key = :k", k=OFFER_KEY)
    if not r:
        return OfferIn(enabled=False, text="-")
    return OfferIn(**json.loads(r["value"]))


@router.put("/admin/settings/offer", response_model=OfferIn)
async def put_offer(body: OfferIn, request: Request):
    await require_admin(request)
    if body.link_url and not body.link_url.startswith("https://"):
        raise HTTPException(400, "The offer link must start with https://")
    await execute(
        """insert into settings (key, value) values (:k, :v)
           on conflict (key) do update set value = excluded.value, updated_at = now()""",
        k=OFFER_KEY, v=body.model_dump_json())
    return body


# ---------- image uploads → Supabase Storage bucket `product-images` (admin's own session) ----------
@router.post("/admin/uploads")
async def admin_upload(request: Request, file: UploadFile = File(...)):
    await require_admin(request)
    ext = IMAGE_TYPES.get(file.content_type or "")
    if not ext:
        raise HTTPException(400, "Please upload a JPG, PNG, WEBP or GIF image")
    data = await file.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "Image is larger than 8 MB")
    base = os.environ["SUPABASE_URL"].rstrip("/")
    path = f"store/{uuid.uuid4().hex}.{ext}"
    async with httpx.AsyncClient(timeout=60) as http:
        r = await http.post(
            f"{base}/storage/v1/object/product-images/{path}", content=data,
            headers={"Authorization": f"Bearer {bearer(request)}", "apikey": os.environ["SUPABASE_ANON_KEY"],
                     "Content-Type": file.content_type, "cache-control": "31536000", "x-upsert": "false"},
        )
    if r.status_code not in (200, 201):
        raise HTTPException(502, "Image storage refused the upload — please try again")
    return {"url": f"{base}/storage/v1/object/public/product-images/{path}"}


# ---------- sitemap & share pages ----------
@router.get("/sitemap.xml")
async def sitemap():
    site = os.environ["SITE_URL"].rstrip("/")
    items = await catalogue.list_public()
    today = datetime.now(timezone.utc).date().isoformat()
    urls = [f"<url><loc>{escape(site)}/</loc><lastmod>{today}</lastmod></url>"]
    urls += [f"<url><loc>{escape(site)}/product/{escape(p.id)}</loc><lastmod>{(p.created_at or today)[:10]}</lastmod></url>" for p in items]
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  ' + "\n  ".join(urls) + "\n</urlset>\n"
    return Response(xml, media_type="application/xml")


@router.get("/share/{slug}", response_class=HTMLResponse)
async def share(slug: str):
    p = await catalogue.get_by_slug(slug)
    if not p:
        raise HTTPException(404, "Product not found")
    site = os.environ["SITE_URL"].rstrip("/")
    page = f"{site}/product/{p.id}"
    title = escape(f"{p.name} | ProdXStore")
    desc = escape((p.tagline or p.description)[:200])
    img = (f'<meta property="og:image" content="{escape(p.image)}"><meta name="twitter:image" content="{escape(p.image)}">'
           if p.image.startswith("https://") else "")
    target = f"/product/{p.id}"
    html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>{title}</title><meta name="description" content="{desc}">
<link rel="canonical" href="{escape(page)}">
<meta property="og:type" content="product"><meta property="og:site_name" content="ProdXStore">
<meta property="og:title" content="{title}"><meta property="og:description" content="{desc}">
<meta property="og:url" content="{escape(page)}">{img}
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta http-equiv="refresh" content="0;url={escape(target)}">
</head><body><p><a href="{escape(target)}">{escape(p.name)}</a></p>
<script>location.replace({json.dumps(target)});</script></body></html>"""
    return HTMLResponse(html)
