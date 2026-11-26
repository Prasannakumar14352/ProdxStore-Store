import { useState } from "react";
import { Check, ArrowUpRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Switch } from "../ui/switch";
import { money } from "../../lib/api";
import { SectionHead } from "./Reveal";

const PlanCard = ({ plan, yearly, currency = "USD" }) => {
  const price = yearly ? plan.price_yearly : plan.price_monthly;
  const slug = plan.name.toLowerCase().replace(/\s+/g, "-");
  return (
    <li
      data-testid={`plan-card-${slug}`}
      className={`relative flex flex-col rounded-2xl border p-6 transition-transform hover:-translate-y-1 ${plan.recommended ? "border-primary bg-accent/60 shadow-[0_10px_40px_hsl(var(--primary)/0.15)]" : "border-border bg-card"}`}
    >
      {plan.recommended && <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Recommended</span>}
      <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
      <p className="mt-4 flex items-baseline gap-1">
        <span className="font-display text-4xl font-bold" data-testid={`plan-price-${slug}`}>{price != null ? money(price, currency) : "—"}</span>
        {price ? <span className="text-sm text-muted-foreground">{yearly ? "/year" : "/month"}</span> : null}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{plan.note}</p>
      <ul className="mt-6 space-y-2.5 text-sm">
        {plan.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{f}</li>)}
      </ul>
      <a href={plan.cta_url} target="_blank" rel="noreferrer" data-testid={`plan-cta-${slug}`} className={`mt-auto inline-flex items-center justify-center gap-1 rounded-full px-5 py-3 pt-3 text-sm font-semibold transition-colors ${plan.recommended ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border hover:border-primary hover:text-primary"}`} style={{ marginTop: "1.75rem" }}>
        {price === 0 ? "Start free" : `Choose ${plan.name}`} <ArrowUpRight className="h-4 w-4" />
      </a>
    </li>
  );
};

export const PlanProduct = ({ p }) => {
  const [yearly, setYearly] = useState(false);
  const hasYearly = p.plans.some((pl) => pl.price_yearly);
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-muted-foreground">{p.tagline}</p>
        {hasYearly && (
          <label className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 text-sm">
            <span className={yearly ? "text-muted-foreground" : "font-semibold"}>Monthly</span>
            <Switch checked={yearly} onCheckedChange={setYearly} data-testid={`pricing-yearly-toggle-${p.id}`} />
            <span className={yearly ? "font-semibold" : "text-muted-foreground"}>Yearly <span className="text-primary">· save ~17%</span></span>
          </label>
        )}
      </div>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {p.plans.map((pl) => <PlanCard key={pl.name} plan={pl} yearly={yearly} currency={p.currency} />)}
      </ul>
      {p.id === "creatorflow-ai" && (
        <p className="mt-6 text-sm text-muted-foreground">
          Need more? One-time credit packs from $7 (250 credits) to $79 (5,000 credits) — credits never expire.
        </p>
      )}
      {p.pricing_url && (
        <a href={p.pricing_url} target="_blank" rel="noreferrer" data-testid={`pricing-offers-link-${p.id}`} className="mt-4 inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          See current offers, lifetime plans & credit packs <ArrowUpRight className="h-4 w-4" />
        </a>
      )}
    </div>
  );
};

const OneTimeTable = ({ items }) => (
  <div className="overflow-x-auto rounded-2xl border border-border">
    <table className="w-full min-w-[640px] text-left text-sm" data-testid="pricing-one-time-table">
      <thead className="bg-card text-muted-foreground">
        <tr><th className="p-4 font-medium">Product</th><th className="p-4 font-medium">Price</th><th className="p-4 font-medium">Billing</th><th className="p-4 font-medium">What you get</th><th className="p-4" /></tr>
      </thead>
      <tbody>
        {items.map((p) => (
          <tr key={p.id} className="border-t border-border">
            <td className="p-4 font-display font-semibold">{p.name}</td>
            <td className="p-4"><span className="font-display text-lg font-bold">{money(p.price, p.currency)}</span>{p.compare_at ? <span className="ml-2 text-muted-foreground line-through">{money(p.compare_at, p.currency)}</span> : null}</td>
            <td className="p-4 text-muted-foreground">One-time · lifetime access</td>
            <td className="p-4 text-muted-foreground">{p.features.slice(0, 2).join(" · ")}</td>
            <td className="p-4"><a href={p.checkout_url || p.landing_url} target="_blank" rel="noreferrer" data-testid={`pricing-buy-${p.id}`} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90">Buy <ArrowUpRight className="h-4 w-4" /></a></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const Pricing = ({ products }) => {
  const planned = products.filter((p) => p.plans?.length);
  const oneTime = products.filter((p) => !p.plans?.length);
  const tabs = [...planned.map((p) => [p.id, p.name]), ...(oneTime.length ? [["one-time", "One-time products"]] : [])];
  if (!tabs.length) return null;
  return (
    <section id="pricing" className="section-pad border-t border-border bg-card/40">
      <div className="mx-auto max-w-7xl">
        <SectionHead id="pricing" eyebrow="Pricing" title="Clear prices, per product.">
          Subscriptions show monthly and yearly prices side by side. One-time products are paid once and yours to keep.
        </SectionHead>
        <Tabs defaultValue={tabs[0][0]} className="mt-10">
          <TabsList className="h-auto flex-wrap justify-start gap-1 rounded-full bg-secondary p-1">
            {tabs.map(([id, label]) => (
              <TabsTrigger key={id} value={id} data-testid={`pricing-tab-${id}`} className="rounded-full px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          {planned.map((p) => <TabsContent key={p.id} value={p.id} className="mt-8"><PlanProduct p={p} /></TabsContent>)}
          {oneTime.length > 0 && <TabsContent value="one-time" className="mt-8"><OneTimeTable items={oneTime} /></TabsContent>}
        </Tabs>
      </div>
    </section>
  );
};
