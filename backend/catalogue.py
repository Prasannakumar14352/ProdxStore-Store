"""Catalogue on the owner's existing Supabase `products` table (+ store_product_extras for plans/currency)."""
import json
import re
from typing import List, Optional

from pydantic import BaseModel

from db import as_json, execute, fetch, fetchrow

PUBLIC_STATUSES = ("published", "coming_soon")

BASE_SELECT = """
select p.*, e.currency as x_currency, e.billing_period as x_billing, e.price_note as x_note,
       e.checkout_url as x_checkout, e.pricing_url as x_pricing, e.plans as x_plans
from products p left join store_product_extras e on e.product_id = p.id
"""


class Plan(BaseModel):
    name: str
    price_monthly: Optional[float] = None
    price_yearly: Optional[float] = None
    price_once: Optional[float] = None
    note: str = ""
    features: List[str] = []
    recommended: bool = False
    cta_url: str = ""


class ProductIn(BaseModel):
    name: str
    tagline: str = ""
    description: str = ""
    category: str = "Creator Tools"
    image: str = ""
    gallery: List[str] = []
    price: float = 0
    compare_at: Optional[float] = None
    currency: str = "INR"
    billing_period: str = "one-time"
    price_note: str = ""
    landing_url: str
    checkout_url: str = ""
    pricing_url: str = ""
    features: List[str] = []
    plans: List[Plan] = []
    badge: str = ""
    featured: bool = False
    published: bool = True
    order: int = 0


class Product(ProductIn):
    id: str
    uuid: str
    status: str = "published"
    whats_included: List[str] = []
    cta_text: str = "View Product"
    created_at: str = ""


def _strings(value) -> list[str]:
    items = as_json(value, [])
    return [str(i if not isinstance(i, dict) else i.get("label") or i.get("title") or "") for i in items if i]


def to_product(r: dict) -> Product:
    price = float(r["price"] or 0)
    original = float(r["original_price"] or 0)
    return Product(
        id=r["slug"], uuid=str(r["id"]), name=r["name"], tagline=r["tagline"] or "",
        description=r["description"] or r.get("card_short_description") or "", category=r["category"] or "",
        image=r["image"] or "", gallery=list(dict.fromkeys([u for u in [r["image"], *_strings(r["screenshots"])] if u])), price=price,
        compare_at=original if original > price else None, currency=r["x_currency"] or "INR",
        billing_period=r["x_billing"] or "one-time", price_note=r["x_note"] or r.get("price_label") or "",
        landing_url=r["landing_page_url"] or "", checkout_url=r["x_checkout"] or r["landing_page_url"] or "",
        pricing_url=r["x_pricing"] or "", features=_strings(r["features"]), plans=as_json(r["x_plans"], []),
        badge=r["badge"] or "", featured=bool(r["featured"]), published=r["status"] in PUBLIC_STATUSES,
        order=r["display_order"] or 0, status=r["status"], whats_included=_strings(r["whats_included"]),
        cta_text=r["cta_text"] or "View Product", created_at=r["created_at"].isoformat() if r["created_at"] else "",
    )


ORDER = " order by p.featured desc, p.display_order asc, p.created_at asc"


async def list_public(q: str = "", category: str = "", badge: str = "") -> list[Product]:
    where, params = ["p.status in ('published','coming_soon')"], {}
    if category:
        where.append("p.category = :category"); params["category"] = category
    if badge:
        where.append("p.badge = :badge"); params["badge"] = badge
    if q:
        where.append("(p.name ilike :q or p.tagline ilike :q or p.description ilike :q or p.category ilike :q or p.features::text ilike :q)")
        params["q"] = f"%{q}%"
    rows = await fetch(BASE_SELECT + " where " + " and ".join(where) + ORDER, **params)
    return [to_product(r) for r in rows]


async def list_all() -> list[Product]:
    return [to_product(r) for r in await fetch(BASE_SELECT + ORDER)]


async def get_by_slug(slug: str, public: bool = True) -> Product | None:
    extra = " and p.status in ('published','coming_soon')" if public else ""
    r = await fetchrow(BASE_SELECT + " where p.slug = :slug" + extra, slug=slug)
    return to_product(r) if r else None


async def _unique_slug(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:70] or "product"
    slug, n = base, 2
    while await fetchrow("select 1 from products where slug = :s", s=slug):
        slug, n = f"{base}-{n}", n + 1
    return slug


def _status_for(published: bool, current: str | None) -> str:
    if not published:
        return "draft"
    return current if current in PUBLIC_STATUSES else "published"


def _cols(b: ProductIn) -> dict:
    return {
        "name": b.name, "tagline": b.tagline, "description": b.description, "category": b.category,
        "image": b.image, "screenshots": json.dumps(b.gallery), "price": b.price,
        "original_price": b.compare_at or 0, "badge": b.badge or None, "features": json.dumps(b.features),
        "landing_page_url": b.landing_url, "featured": b.featured, "display_order": b.order,
    }


async def _save_extras(product_uuid: str, b: ProductIn) -> None:
    await execute(
        """insert into store_product_extras (product_id, currency, billing_period, price_note, checkout_url, pricing_url, plans, updated_at)
           values (cast(:pid as uuid), :currency, :billing, :note, :checkout, :pricing, cast(:plans as jsonb), now())
           on conflict (product_id) do update set currency = excluded.currency, billing_period = excluded.billing_period,
             price_note = excluded.price_note, checkout_url = excluded.checkout_url, pricing_url = excluded.pricing_url,
             plans = excluded.plans, updated_at = now()""",
        pid=product_uuid, currency=b.currency or "INR", billing=b.billing_period or "one-time", note=b.price_note,
        checkout=b.checkout_url, pricing=b.pricing_url, plans=json.dumps([p.model_dump() for p in b.plans]),
    )


async def create(b: ProductIn) -> Product:
    slug = await _unique_slug(b.name)
    status = _status_for(b.published, None)
    cols = _cols(b)
    rows = await execute(
        """insert into products (name, slug, tagline, description, category, image, screenshots, price, original_price,
             badge, features, landing_page_url, featured, display_order, status, product_type, product_type_id, product_status_id)
           values (:name, :slug, :tagline, :description, :category, :image, cast(:screenshots as jsonb), :price, :original_price,
             :badge, cast(:features as jsonb), :landing_page_url, :featured, :display_order, :status, 'digital_product',
             (select id from product_types where slug = 'digital_product'), (select id from product_statuses where slug = :status))
           returning id""",
        slug=slug, status=status, **cols,
    )
    await _save_extras(str(rows[0]["id"]), b)
    return await get_by_slug(slug, public=False)


async def update(slug: str, b: ProductIn) -> Product | None:
    current = await fetchrow("select id, status from products where slug = :slug", slug=slug)
    if not current:
        return None
    status = _status_for(b.published, current["status"])
    await execute(
        """update products set name = :name, tagline = :tagline, description = :description, category = :category,
             image = :image, screenshots = cast(:screenshots as jsonb), price = :price, original_price = :original_price,
             badge = :badge, features = cast(:features as jsonb), landing_page_url = :landing_page_url, featured = :featured,
             display_order = :display_order, status = :status,
             product_status_id = coalesce((select id from product_statuses where slug = :status), product_status_id)
           where id = :pid""",
        pid=current["id"], status=status, **_cols(b),
    )
    await _save_extras(str(current["id"]), b)
    return await get_by_slug(slug, public=False)


async def archive(slug: str) -> None:
    """Soft delete: archived products disappear from every storefront but keep their orders & reviews."""
    await execute(
        """update products set status = 'archived',
             product_status_id = coalesce((select id from product_statuses where slug = 'archived'), product_status_id)
           where slug = :slug""",
        slug=slug,
    )
