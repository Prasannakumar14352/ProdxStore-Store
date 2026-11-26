import { ArrowUpRight } from "lucide-react";
import { Reveal } from "./Reveal";

const CF = "https://creatorflowai.prodxstore.com";
const STEPS = [
  ["Tell us", "Paste a script, type one idea, or upload your product photos."],
  ["Review", "Check the script and every scene. Media credits are only spent after you approve."],
  ["Generate", "Images, voice in your language, captions and music — failures are refunded."],
  ["Publish", "Download, or schedule straight to YouTube from the Planner."],
];
const STYLES = [
  [`${CF}/assets/style-pixar-fGmOYpDz.jpg`, "3D animation"],
  [`${CF}/assets/style-cinematic-B331LCHb.jpg`, "Cinematic"],
  [`${CF}/assets/style-futuristic-D95_YPvQ.jpg`, "Futuristic"],
];

export const Featured = () => (
  <section id="creatorflow" className="section-pad">
    <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-border bg-card">
      <div className="grid lg:grid-cols-2">
        <div className="p-7 sm:p-12">
          <p className="eyebrow">Featured product</p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">CreatorFlow AI</h2>
          <p className="mt-4 text-lg text-foreground">Turn one idea into videos, ads & posts — in your language.</p>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Your AI content studio: scripts, scenes, AI images, captions, hashtags and voiceover from a single idea.
            Captions in Telugu, Hindi, Tamil, English and 100+ more languages.
          </p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2">
            {STEPS.map(([t, d], i) => (
              <Reveal as="li" key={t} delay={i * 80} className="rounded-2xl border border-border bg-background/60 p-5">
                <span className="font-display text-3xl font-bold text-primary">{i + 1}</span>
                <h3 className="font-display mt-2 font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </Reveal>
            ))}
          </ol>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={`${CF}/`} target="_blank" rel="noreferrer" data-testid="featured-landing-link" className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-semibold text-primary-foreground transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-primary/90">
              Visit CreatorFlow AI <ArrowUpRight className="h-4 w-4" />
            </a>
            <a href={`${CF}/pricing`} target="_blank" rel="noreferrer" data-testid="featured-pricing-link" className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3.5 font-semibold transition-colors hover:border-primary hover:text-primary">
              See current offers
            </a>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Start free with 50 credits · no card needed</p>
        </div>
        <div className="grid grid-cols-2 content-center gap-3 bg-background/40 p-3 sm:p-5">
          <img src={`${CF}/walkthroughs/video.jpg`} alt="CreatorFlow AI Video Studio" className="col-span-2 aspect-video w-full rounded-2xl object-cover" />
          {STYLES.slice(0, 2).map(([src, label]) => (
            <figure key={label} className="relative overflow-hidden rounded-2xl">
              <img src={src} alt={`${label} visual style`} className="aspect-square w-full object-cover" />
              <figcaption className="absolute bottom-2 left-2 rounded-full bg-background/80 px-3 py-1 text-xs backdrop-blur">{label}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  </section>
);
