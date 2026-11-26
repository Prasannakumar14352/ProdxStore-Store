import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { api, scrollToId } from "../lib/api";
import { usePageMeta } from "../lib/meta";
import { Nav } from "../components/store/Nav";
import { OfferBanner } from "../components/store/OfferBanner";
import { Hero } from "../components/store/Hero";
import { About } from "../components/store/About";
import { Services } from "../components/store/Services";
import { Featured } from "../components/store/Featured";
import { Shop } from "../components/store/Shop";
import { Pricing } from "../components/store/Pricing";
import { Gallery } from "../components/store/Gallery";
import { Testimonials } from "../components/store/Testimonials";
import { FAQ } from "../components/store/FAQ";
import { Contact } from "../components/store/Contact";
import { Footer } from "../components/store/Footer";

export default function Home() {
  const [products, setProducts] = useState([]);
  const { hash } = useLocation();
  usePageMeta({
    title: "AI Tools & Digital Products for Creators | ProdXStore",
    description: "Shop CreatorFlow AI and handpicked digital products for creators: AI video, posts, carousels and prompt libraries that save hours every week on content work.",
  });
  useEffect(() => {
    if (!hash) return;
    // Re-run after the catalogue loads, since Shop/Pricing/Gallery grow the page above later sections.
    const t = setTimeout(() => scrollToId(hash.slice(1)), 300);
    return () => clearTimeout(t);
  }, [hash, products]);
  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data)).catch(() => setProducts([]));
  }, []);
  const categories = useMemo(() => [...new Set(products.map((p) => p.category))], [products]);
  const badges = useMemo(() => [...new Set(products.map((p) => p.badge).filter(Boolean))], [products]);
  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="store-home">
      <OfferBanner />
      <Nav />
      <main>
        <Hero />
        <About />
        <Services />
        <Featured />
        <Shop categories={categories} badges={badges} />
        <Pricing products={products} />
        <Gallery products={products} />
        <Testimonials />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
