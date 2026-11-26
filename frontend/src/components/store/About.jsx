import { Download, Infinity as InfinityIcon, BadgeCheck } from "lucide-react";
import { Reveal, SectionHead } from "./Reveal";

const ABOUT_IMG =
  "https://images.unsplash.com/photo-1654674613475-eb7fb11c5995?crop=entropy&cs=srgb&fm=jpg&q=80&w=1200";

const PROMISES = [
  [InfinityIcon, "Lifetime access", "One-time products are pay once, own forever — with every update included."],
  [Download, "Instant delivery", "Download everything right after purchase. No waiting, no shipping."],
  [BadgeCheck, "Commercial license", "Use what you buy in client projects, internal tools or your own products."],
];

export const About = () => (
  <section id="about" className="section-pad border-t border-border">
    <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
      <Reveal className="order-2 lg:order-1">
        <img src={ABOUT_IMG} alt="Creator working on a laptop in warm light" className="aspect-[4/3] w-full rounded-[2rem] border border-border object-cover" />
      </Reveal>
      <div className="order-1 lg:order-2">
        <SectionHead id="about" eyebrow="About ProdXStore" title="A small, handpicked catalogue built around how creators work.">
          Every product here exists to take a boring part of content work off your plate. Some are software you log in
          to, like CreatorFlow AI. Others are ready-made libraries you download once and keep. Each card links straight
          to the product's own page and checkout.
        </SectionHead>
        <ul className="mt-10 space-y-6">
          {PROMISES.map(([Icon, title, text], i) => (
            <Reveal as="li" key={title} delay={i * 100} className="flex gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-muted-foreground">{text}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </div>
  </section>
);
