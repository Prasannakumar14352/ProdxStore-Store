import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { SectionHead, Reveal } from "./Reveal";
import { imgSrc } from "../../lib/api";

const CF = "https://creatorflowai.prodxstore.com/walkthroughs";
const CF_SHOTS = [
  ["video", "AI Video Studio", "Topic in → script, scenes, voiceover, captions and a finished reel out."],
  ["research", "Viral Research", "Score any topic, see top YouTube videos, then get titles, hooks and keywords."],
  ["thumbnails", "Thumbnail Studio", "High-CTR YouTube thumbnails at 1280×720 with an editable headline."],
  ["images", "AI Images (HD)", "Any style, any ratio — HD mode spells text correctly."],
  ["carousels", "Carousel Creator", "Instagram and LinkedIn carousels with matching design on every slide."],
  ["captions", "Captions in your language", "Captions and hashtags in Telugu, Hindi, Tamil and more."],
  ["planner", "Content Planner", "Plan the month and see every post on a calendar."],
  ["analytics", "Analytics", "Everything you've made, in one place."],
].map(([k, title, text]) => ({ src: `${CF}/${k}.jpg`, title, text, product: "CreatorFlow AI" }));

export const Gallery = ({ products }) => {
  const others = products
    .filter((p) => p.id !== "creatorflow-ai")
    .flatMap((p) => (p.gallery?.length ? p.gallery : [p.image]).map((src) => ({ src, title: p.name, text: p.tagline, product: p.name })));
  const shots = [...CF_SHOTS, ...others];
  const [idx, setIdx] = useState(null);
  const move = (d) => setIdx((i) => (i + d + shots.length) % shots.length);
  const cur = idx !== null ? shots[idx] : null;

  return (
    <section id="gallery" className="section-pad">
      <div className="mx-auto max-w-7xl">
        <SectionHead id="gallery" eyebrow="Gallery" title="Real previews from real products.">
          Screens recorded from CreatorFlow AI and covers from each catalogue product. Tap any preview to look closer.
        </SectionHead>
        <ul className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {shots.map((s, i) => (
            <Reveal as="li" key={`${s.src}-${i}`} delay={(i % 4) * 60} className={i === 0 ? "col-span-2 row-span-2" : ""}>
              <button onClick={() => setIdx(i)} data-testid={`gallery-item-${i}`} className="group relative block h-full w-full overflow-hidden rounded-2xl border border-border">
                <img src={imgSrc(s.src)} alt={s.title} loading="lazy" className="aspect-[4/3] h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <span className="absolute inset-x-0 bottom-0 bg-background/85 px-3 py-2 text-left text-xs font-medium backdrop-blur sm:text-sm">
                  {s.title}
                </span>
              </button>
            </Reveal>
          ))}
        </ul>
      </div>
      <Dialog open={idx !== null} onOpenChange={(o) => !o && setIdx(null)}>
        <DialogContent data-testid="gallery-lightbox" className="max-w-5xl border-border bg-card p-3 sm:rounded-3xl">
          {cur && (
            <>
              <img src={imgSrc(cur.src)} alt={cur.title} className="max-h-[70vh] w-full rounded-2xl object-contain" />
              <div className="flex items-center justify-between gap-4 px-2 pb-1 pt-2">
                <div>
                  <DialogTitle className="font-display text-lg">{cur.title}</DialogTitle>
                  <p className="text-sm text-muted-foreground">{cur.product} · {cur.text}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => move(-1)} aria-label="Previous" data-testid="gallery-prev" className="grid h-11 w-11 place-items-center rounded-full border border-border hover:border-primary"><ChevronLeft className="h-5 w-5" /></button>
                  <button onClick={() => move(1)} aria-label="Next" data-testid="gallery-next" className="grid h-11 w-11 place-items-center rounded-full border border-border hover:border-primary"><ChevronRight className="h-5 w-5" /></button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};
