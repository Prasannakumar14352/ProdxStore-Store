import { useEffect, useState } from "react";
import { ArrowRight, Timer, X } from "lucide-react";
import { api } from "../../lib/api";

const pad = (n) => String(n).padStart(2, "0");

export const OfferBanner = () => {
  const [offer, setOffer] = useState(null);
  const [left, setLeft] = useState(null);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    api.get("/settings/offer").then((r) => setOffer(r.data)).catch(() => {});
  }, []);
  useEffect(() => {
    const mins = offer?.countdown_minutes;
    if (!mins) return;
    // Countdown restarts on every visit (owner's choice); 0 minutes = no countdown.
    const end = Date.now() + mins * 60 * 1000;
    setLeft(mins * 60);
    const t = setInterval(() => setLeft(Math.max(0, Math.round((end - Date.now()) / 1000))), 1000);
    return () => clearInterval(t);
  }, [offer]);
  if (!offer?.enabled || !open || left === 0) return null;
  const Wrap = offer.link_url ? "a" : "div";
  const linkProps = offer.link_url ? { href: offer.link_url, target: "_blank", rel: "noreferrer" } : {};
  const m = Math.floor((left || 0) / 60), s = (left || 0) % 60;
  return (
    <div data-testid="offer-banner" className="relative bg-primary px-10 py-2 text-primary-foreground">
      <Wrap
        {...linkProps}
        data-testid="offer-banner-link"
        className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs font-medium sm:text-sm"
      >
        <span>{offer.label && <strong className="font-bold">{offer.label} </strong>}{offer.text}</span>
        {left !== null && <span className="inline-flex items-center gap-1 rounded-full bg-background/15 px-2.5 py-0.5 font-display font-bold tabular-nums" data-testid="offer-banner-countdown">
          <Timer className="h-3.5 w-3.5" /> {pad(m)}:{pad(s)} left
        </span>}
        {offer.link_url && offer.link_label && <span className="hidden items-center gap-1 font-semibold underline-offset-2 hover:underline sm:inline-flex">{offer.link_label} <ArrowRight className="h-3.5 w-3.5" /></span>}
      </Wrap>
      <button onClick={() => setOpen(false)} aria-label="Dismiss offer" data-testid="offer-banner-dismiss" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full hover:bg-background/15">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
