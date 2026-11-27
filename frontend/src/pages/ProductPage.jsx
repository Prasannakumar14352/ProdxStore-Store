import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Check, Link2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { api, imgSrc } from "../lib/api";
import { usePageMeta } from "../lib/meta";
import { Nav } from "../components/store/Nav";
import { OfferBanner } from "../components/store/OfferBanner";
import { Footer } from "../components/store/Footer";
import { PriceTag } from "../components/store/Shop";
import { PlanProduct } from "../components/store/Pricing";
import { ProductReviews, RelatedProducts, RatingSummary } from "../components/store/ProductExtras";
import { Skeleton } from "../components/ui/skeleton";

const ShareButtons = ({ p }) => {
  const shareUrl = `${window.location.origin}/product/${p.id}`;
  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl).catch(() => {});
    toast.success("Link copied — paste it anywhere to share");
  };
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`https://wa.me/?text=${encodeURIComponent(`${p.name} — ${shareUrl}`)}`} target="_blank" rel="noreferrer" data-testid="product-share-whatsapp"
        className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary">
        <MessageCircle className="h-4 w-4" /> Share on WhatsApp
      </a>
      <button onClick={copy} data-testid="product-share-copy" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary">
        <Link2 className="h-4 w-4" /> Copy link
      </button>
    </div>
  );
};

const Gallery = ({ p }) => {
  const imgs = p.gallery?.length ? p.gallery : [p.image];
  const [img, setImg] = useState(imgs[0]);
  return (
    <div>
      <img src={imgSrc(img)} alt={p.name} className="aspect-[4/3] w-full rounded-3xl border border-border object-cover" data-testid="product-page-image" />
      {imgs.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {imgs.map((src, i) => (
            <button key={`${src}-${i}`} onClick={() => setImg(src)} data-testid={`product-page-thumb-${i}`}
              className={`overflow-hidden rounded-xl border-2 ${img === src ? "border-primary" : "border-transparent"}`}>
              <img src={imgSrc(src)} alt={`${p.name} preview ${i + 1}`} className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Details = ({ p, rating }) => (
  <div>
    <p className="eyebrow">{p.category}</p>
    <h1 className="font-display mt-3 text-4xl font-bold leading-tight tracking-tight sm:text-5xl" data-testid="product-page-title">{p.name}</h1>
    {rating?.count > 0 && <div className="mt-3"><RatingSummary rating={rating} compact /></div>}
    {p.tagline && <p className="mt-4 text-lg text-foreground">{p.tagline}</p>}
    <p className="mt-4 leading-relaxed text-muted-foreground">{p.description}</p>
    <div className="mt-6"><PriceTag p={p} size="lg" /></div>
    {p.price_note && <p className="mt-1 text-sm text-muted-foreground">{p.price_note}</p>}
    {p.features?.length > 0 && (
      <ul className="mt-6 space-y-2">
        {p.features.map((f) => <li key={f} className="flex gap-3"><Check className="mt-1 h-4 w-4 shrink-0 text-primary" /> {f}</li>)}
      </ul>
    )}
    {p.whats_included?.length > 0 && (
      <div className="mt-6 rounded-2xl border border-border bg-card p-5" data-testid="product-page-included">
        <h2 className="font-display font-semibold">What's included</h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {p.whats_included.map((w) => <li key={w} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {w}</li>)}
        </ul>
      </div>
    )}
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      <a href={p.checkout_url || p.landing_url} target="_blank" rel="noreferrer" data-testid="product-page-checkout-link"
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 font-semibold text-primary-foreground hover:bg-primary/90">
        {p.status === "coming_soon" ? "Coming soon — get notified" : p.plans?.length ? "See plans & checkout" : "Buy now"} <ArrowUpRight className="h-4 w-4" />
      </a>
      <a href={p.landing_url} target="_blank" rel="noreferrer" data-testid="product-page-landing-link"
        className="inline-flex flex-1 items-center justify-center rounded-full border border-border px-6 py-4 font-semibold hover:border-primary hover:text-primary">
        Visit product page
      </a>
    </div>
    <div className="mt-6"><ShareButtons p={p} /></div>
  </div>
);

export default function ProductPage() {
  const { id } = useParams();
  const [p, setP] = useState(undefined);
  const [rating, setRating] = useState(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    api.get(`/products/${id}`).then((r) => setP(r.data)).catch(() => setP(null));
    api.get(`/products/${id}/rating`).then((r) => setRating(r.data)).catch(() => setRating(null));
  }, [id]);
  usePageMeta({
    title: p ? `${p.name} | ProdXStore` : p === null ? "Product not found | ProdXStore" : "",
    description: p ? (p.tagline || p.description).slice(0, 160) : "This product isn't in the ProdXStore catalogue.",
    path: `/product/${id}`,
    image: p?.image,
    type: "product",
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <OfferBanner />
      <Nav />
      <main className="px-5 py-10 sm:px-10 sm:py-16 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <Link to="/#shop" data-testid="product-page-back" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> All products
          </Link>
          {p === undefined && <Skeleton className="mt-8 h-[480px] rounded-3xl" />}
          {p === null && (
            <div className="mt-10 rounded-3xl border border-border bg-card p-10" data-testid="product-page-missing">
              <h1 className="font-display text-3xl font-bold">We couldn't find that product.</h1>
              <Link to="/#shop" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">Browse the shop</Link>
            </div>
          )}
          {p && (
            <>
              <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
                <Gallery p={p} />
                <Details p={p} rating={rating} />
              </div>
              {p.plans?.length > 0 && (
                <section className="mt-20 border-t border-border pt-14" data-testid="product-page-plans">
                  <p className="eyebrow">Plans</p>
                  <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Compare {p.name} plans</h2>
                  <div className="mt-8"><PlanProduct p={p} /></div>
                </section>
              )}
              <ProductReviews p={p} rating={rating} />
              <RelatedProducts p={p} />
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

