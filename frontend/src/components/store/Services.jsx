import { Clapperboard, Megaphone, Library, CalendarDays, GraduationCap, Images } from "lucide-react";
import { Reveal, SectionHead } from "./Reveal";

const WORKFLOWS = [
  [Clapperboard, "Idea to video", "Type one idea or paste a script. CreatorFlow AI writes, designs, voices and captions the video, and you approve every scene first.", "CreatorFlow AI"],
  [Images, "Carousels & thumbnails", "Brand-styled slides and high-CTR covers for Instagram, LinkedIn and YouTube.", "CreatorFlow AI"],
  [Megaphone, "Promote a business", "Turn real product photos into Facebook & Instagram ads and short promo videos.", "CreatorFlow AI"],
  [CalendarDays, "Plan & publish", "See every post on a calendar and publish to YouTube when it is ready.", "CreatorFlow AI"],
  [Library, "Prompt libraries", "Hundreds of thousands of organized prompts for ChatGPT, Claude, Gemini, Midjourney, Sora and more.", "Prompt packs"],
  [GraduationCap, "Learning printables", "Screen-free worksheets, puzzles and activities for kids aged 3–10 — great for education creators.", "Kids bundle"],
];

export const Services = () => (
  <section id="services" className="section-pad bg-card/40 border-y border-border">
    <div className="mx-auto max-w-7xl">
      <SectionHead id="services" eyebrow="Services" title="Creator workflows, start to finish.">
        Pick the workflow you are stuck on. Each one maps to a product in the catalogue, so you can jump straight to
        the tool that does it.
      </SectionHead>
      <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {WORKFLOWS.map(([Icon, title, text, tag], i) => (
          <Reveal
            as="li"
            key={title}
            delay={(i % 3) * 90}
            data-testid={`service-card-${i}`}
            className={`group rounded-2xl border border-border bg-card p-7 transition-[border-color,transform] hover:-translate-y-1 hover:border-primary/60 ${i === 0 ? "lg:row-span-2 lg:flex lg:flex-col lg:justify-between" : ""}`}
          >
            <div>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className={`font-display mt-6 font-semibold ${i === 0 ? "text-2xl sm:text-3xl" : "text-xl"}`}>{title}</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">{text}</p>
            </div>
            {i === 0 && <img src="https://creatorflowai.prodxstore.com/walkthroughs/captions.jpg" alt="CreatorFlow AI captions preview" className="mt-8 hidden aspect-video w-full rounded-xl border border-border object-cover lg:block" />}
            <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-primary">{tag}</p>
          </Reveal>
        ))}
      </ul>
    </div>
  </section>
);
