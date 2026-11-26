import { useEffect, useState } from "react";
import { BadgeCheck, Quote } from "lucide-react";
import { api } from "../../lib/api";
import { SectionHead, Reveal } from "./Reveal";
import { Stars } from "./Stars";

export const Testimonials = () => {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get("/testimonials").then((r) => setItems(r.data)).catch(() => setItems([]));
  }, []);
  return (
    <section id="testimonials" className="section-pad border-t border-border bg-card/40">
      <div className="mx-auto max-w-7xl">
        <SectionHead id="testimonials" eyebrow="Testimonials" title="What verified customers say.">
          We only show feedback from customers we have verified.
        </SectionHead>
        {items.length === 0 ? (
          <p data-testid="testimonials-empty" className="mt-10 rounded-2xl border border-dashed border-border p-8 text-muted-foreground">
            Verified reviews will appear here soon.
          </p>
        ) : (
          <ul className="mt-12 grid gap-5 md:grid-cols-3">
            {items.map((t, i) => (
              <Reveal as="li" key={t.id} delay={i * 90} data-testid={`testimonial-card-${t.id}`} className="flex flex-col rounded-2xl border border-border bg-card p-7">
                <div className="flex items-center justify-between"><Quote className="h-8 w-8 text-primary" />{t.rating ? <Stars value={t.rating} /> : null}</div>
                <blockquote className="mt-4 flex-1 leading-relaxed">“{t.quote}”</blockquote>
                <div className="mt-6 flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-accent font-display font-bold text-accent-foreground">
                    {t.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-sm text-muted-foreground">{[t.role, t.product].filter(Boolean).join(" · ")}</p>
                  </div>
                  {t.verified && (
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      <BadgeCheck className="h-3.5 w-3.5" /> Verified
                    </span>
                  )}
                </div>
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
