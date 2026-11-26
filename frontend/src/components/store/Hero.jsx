import { ArrowRight, Clock, LayoutGrid, Sparkles } from "lucide-react";

const HERO_IMG =
  "https://images.unsplash.com/photo-1517256673644-36ad11246d21?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400";
const PREVIEW = "https://creatorflowai.prodxstore.com/walkthroughs/video.jpg";

export const Hero = () => (
  <section id="top" className="grain relative overflow-hidden px-5 sm:px-10 lg:px-16">
    <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-primary/15 blur-[120px]" />
    <div className="relative z-10 mx-auto grid max-w-7xl gap-12 pb-20 pt-12 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:pb-28">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-accent px-4 py-1.5 text-sm text-accent-foreground">
          <Sparkles className="h-4 w-4" /> Now featuring CreatorFlow AI
        </span>
        <h1 data-testid="hero-headline" className="font-display mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          Get hours back every week.
          <span className="block text-primary">Keep every creator tool in one place.</span>
        </h1>
        <p data-testid="hero-subcopy" className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          ProdXStore is a friendly catalogue of digital products for creators. It saves creators hours every week on
          content work, and everything a creator needs is in one place — from AI video and posts to ready-made prompt
          libraries.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href="#shop"
            data-testid="hero-shop-button"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 text-base font-semibold text-primary-foreground shadow-[0_8px_30px_hsl(var(--primary)/0.3)] transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-primary/90"
          >
            Shop products <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#creatorflow"
            data-testid="hero-creatorflow-button"
            className="inline-flex items-center justify-center rounded-full border border-border px-7 py-4 text-base font-semibold transition-colors hover:border-primary hover:text-primary"
          >
            Meet CreatorFlow AI
          </a>
        </div>
        <ul className="mt-10 grid max-w-md grid-cols-2 gap-4 text-sm">
          <li className="flex items-center gap-3"><Clock className="h-5 w-5 text-primary" /> Less time on content work</li>
          <li className="flex items-center gap-3"><LayoutGrid className="h-5 w-5 text-primary" /> One catalogue, many tools</li>
        </ul>
      </div>
      <div className="relative animate-in fade-in zoom-in-95 duration-700">
        <div className="overflow-hidden rounded-[2rem] border border-border">
          <img src={HERO_IMG} alt="A creator smiling at her desk" className="aspect-[4/5] w-full object-cover sm:aspect-[5/5]" />
        </div>
        <div className="absolute -bottom-8 left-4 right-4 rounded-2xl border border-border bg-card/90 p-3 backdrop-blur-xl sm:-left-10 sm:right-auto sm:w-[340px]">
          <img src={PREVIEW} alt="CreatorFlow AI video studio preview" className="aspect-video w-full rounded-xl object-cover" />
          <div className="flex items-center justify-between px-1 pt-3">
            <div>
              <p className="font-display text-sm font-semibold">CreatorFlow AI</p>
              <p className="text-xs text-muted-foreground">Free plan · from $9/month</p>
            </div>
            <a
              href="https://creatorflowai.prodxstore.com/"
              target="_blank"
              rel="noreferrer"
              data-testid="hero-preview-link"
              className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Open
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
);
