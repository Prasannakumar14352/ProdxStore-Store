import { useEffect, useMemo, useState } from "react";
import { Search, ArrowUpRight, X, Sparkles } from "lucide-react";
import { api, money, periodLabel, imgSrc } from "../../lib/api";
import { SectionHead, Reveal } from "./Reveal";
import { Link } from "react-router-dom";
import { Skeleton } from "../ui/skeleton";

export const PriceTag = ({ p, size = "md" }) => (
  <div className="flex flex-wrap items-baseline gap-x-2" data-testid={`product-price-${p.id}`}>
    {p.plans?.length ? <span className="text-sm text-muted-foreground">from</span> : null}
    <span className={`font-display font-bold ${size === "lg" ? "text-4xl" : "text-2xl"}`}>{money(p.price, p.currency)}</span>
    <span className="text-sm text-muted-foreground">{periodLabel(p.billing_period)}</span>
    {p.compare_at ? <span className="text-sm text-muted-foreground line-through">{money(p.compare_at, p.currency)}</span> : null}
  </div>
);

export const ProductCard = ({ p, i }) => (
  <Reveal as="li" delay={(i % 3) * 90} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-[border-color,transform] hover:-translate-y-1 hover:border-primary/60" data-testid={`product-card-${p.id}`}>
    <Link to={`/product/${p.id}`} className="relative block overflow-hidden text-left" data-testid={`product-card-image-${p.id}`}>
      <img src={imgSrc(p.image)} alt={p.name} loading="lazy" className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      {p.badge && <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">{p.badge}</span>}
    </Link>
    <div className="flex flex-1 flex-col p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">{p.category}</p>
      <h3 className="font-display mt-2 text-xl font-semibold leading-snug"><Link to={`/product/${p.id}`} className="hover:text-primary" data-testid={`product-card-title-${p.id}`}>{p.name}</Link></h3>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
      <div className="mt-5"><PriceTag p={p} /></div>
      {p.price_note && <p className="mt-1 text-xs text-muted-foreground">{p.price_note}</p>}
      <div className="mt-auto flex gap-2 pt-6">
        <Link to={`/product/${p.id}`} data-testid={`product-details-button-${p.id}`} className="flex-1 rounded-full border border-border px-4 py-3 text-center text-sm font-semibold transition-colors hover:border-primary hover:text-primary">
          View details
        </Link>
        <a href={p.checkout_url || p.landing_url} target="_blank" rel="noreferrer" data-testid={`product-buy-link-${p.id}`} className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
          {p.status === "coming_soon" ? "Coming soon" : p.plans?.length ? "See plans" : "Buy now"} <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  </Reveal>
);

export const Shop = ({ categories, badges = [] }) => {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [badge, setBadge] = useState("");
  const [items, setItems] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      api.get("/products", { params: { q, category: cat, badge } }).then((r) => setItems(r.data)).catch(() => setItems([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, cat, badge]);

  const cats = useMemo(() => ["", ...categories], [categories]);

  return (
    <section id="shop" className="section-pad">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionHead id="shop" eyebrow="Shop" title="Find the tool that gives you your week back." />
          <label className="relative block w-full lg:max-w-sm">
            <span className="sr-only">Search products</span>
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search prompts, video, kids..."
              data-testid="shop-search-input"
              className="h-14 w-full rounded-full border border-input bg-card pl-12 pr-12 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            />
            {q && (
              <button onClick={() => setQ("")} aria-label="Clear search" data-testid="shop-search-clear" className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            )}
          </label>
        </div>
        <div className="mt-8 flex gap-2 overflow-x-auto pb-2" role="tablist">
          {cats.map((c) => (
            <button
              key={c || "all"}
              onClick={() => setCat(c)}
              data-testid={`shop-filter-${(c || "all").toLowerCase().replace(/\s+/g, "-")}`}
              className={`shrink-0 rounded-full border px-5 py-2.5 text-sm font-medium transition-colors ${cat === c ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/60"}`}
            >
              {c || "All products"}
            </button>
          ))}
        </div>
        {badges.length > 0 && (
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-2" aria-label="Filter by badge">
            <span className="inline-flex shrink-0 items-center gap-1.5 pr-1 text-sm text-muted-foreground"><Sparkles className="h-4 w-4 text-primary" /> Picks:</span>
            {badges.map((b) => (
              <button
                key={b}
                onClick={() => setBadge(badge === b ? "" : b)}
                aria-pressed={badge === b}
                data-testid={`shop-badge-${b.toLowerCase().replace(/\s+/g, "-")}`}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${badge === b ? "border-primary bg-accent text-accent-foreground" : "border-dashed border-border text-muted-foreground hover:border-primary/60 hover:text-foreground"}`}
              >
                {b}{badge === b && <X className="ml-1.5 inline h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        )}
        {items === null ? (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[420px] rounded-2xl" />)}
          </div>
        ) : items.length === 0 ? (
          <p data-testid="shop-empty" className="mt-12 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            {q ? `No products match “${q}”.` : "No products match these filters."} Try another word or clear a filter.
          </p>
        ) : (
          <ul data-testid="shop-grid" className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((p, i) => <ProductCard key={p.id} p={p} i={i} />)}
          </ul>
        )}
      </div>
    </section>
  );
};
