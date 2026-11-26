import { useEffect, useState } from "react";
import { BadgeCheck, Quote } from "lucide-react";
import { api } from "../../lib/api";
import { ProductCard } from "./Shop";
import { ReviewForm } from "./ReviewForm";
import { Stars } from "./Stars";

export const RatingSummary = ({ rating, compact }) => {
  if (!rating?.count) return null;
  return (
    <a href="#reviews" className="inline-flex items-center gap-2 text-sm" data-testid="product-rating-summary">
      <Stars value={rating.average} size={compact ? "h-4 w-4" : "h-5 w-5"} />
      <span className="font-display font-bold" data-testid="product-rating-average">{rating.average.toFixed(1)}</span>
      <span className="text-muted-foreground hover:text-primary">({rating.count} verified review{rating.count === 1 ? "" : "s"})</span>
    </a>
  );
};

export const ProductReviews = ({ p, rating }) => {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get("/testimonials", { params: { product_id: p.id } }).then((r) => setItems(r.data)).catch(() => setItems([]));
  }, [p.id]);
  return (
    <section id="reviews" className="mt-20 scroll-mt-24 border-t border-border pt-14" data-testid="product-page-reviews">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Verified reviews</p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">What customers say about {p.name}</h2>
          <div className="mt-3"><RatingSummary rating={rating} /></div>
        </div>
        <ReviewForm p={p} />
      </div>
      {!items.length && (
        <p className="mt-8 rounded-2xl border border-dashed border-border p-8 text-muted-foreground" data-testid="product-reviews-empty">
          No verified reviews yet. Bought {p.name}? Be the first to share how it went.
        </p>
      )}
      {items.length > 0 && <ul className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <li key={t.id} data-testid={`product-review-${t.id}`} className="flex flex-col rounded-2xl border border-border bg-card p-7">
            <div className="flex items-center justify-between">
              <Quote className="h-7 w-7 text-primary" />
              {t.rating ? <Stars value={t.rating} testid={`product-review-stars-${t.id}`} /> : null}
            </div>
            <blockquote className="mt-4 flex-1 leading-relaxed">“{t.quote}”</blockquote>
            <div className="mt-6 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-accent font-display text-sm font-bold text-accent-foreground">
                {t.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </span>
              <div className="min-w-0">
                <p className="font-semibold">{t.name}</p>
                {t.role && <p className="text-sm text-muted-foreground">{t.role}</p>}
              </div>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                <BadgeCheck className="h-3.5 w-3.5" /> Verified
              </span>
            </div>
          </li>
        ))}
      </ul>}
    </section>
  );
};

export const RelatedProducts = ({ p }) => {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get("/products").then((r) => {
      const others = r.data.filter((x) => x.id !== p.id);
      // Same category first, then the rest of the catalogue in shop order.
      const ranked = [...others.filter((x) => x.category === p.category), ...others.filter((x) => x.category !== p.category)];
      setItems(ranked.slice(0, 3));
    }).catch(() => setItems([]));
  }, [p.id, p.category]);
  if (!items.length) return null;
  return (
    <section className="mt-20 border-t border-border pt-14" data-testid="product-page-related">
      <p className="eyebrow">You might also like</p>
      <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">More from the catalogue</h2>
      <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((x, i) => <ProductCard key={x.id} p={x} i={i} />)}
      </ul>
    </section>
  );
};
