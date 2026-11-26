import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { Switch } from "../ui/switch";

const inp = "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary";
const Field = ({ label, hint, children }) => (
  <label className="grid gap-1.5 text-sm font-medium">{label}{children}{hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}</label>
);

export const OfferAdmin = () => {
  const [f, setF] = useState(null);
  useEffect(() => { api.get("/settings/offer").then((r) => setF(r.data)); }, []);
  if (!f) return <p className="text-muted-foreground">Loading…</p>;
  const set = (k, parse = (v) => v) => (e) => setF({ ...f, [k]: parse(e.target.value) });

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.put("/admin/settings/offer", f);
      toast.success("Offer banner updated");
    } catch (err) {
      toast.error(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || "Could not save");
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <form onSubmit={save} className="grid gap-4 rounded-2xl border border-border bg-card p-6" data-testid="offer-form">
        <label className="flex items-center gap-3 text-sm font-medium">
          <Switch checked={f.enabled} onCheckedChange={(v) => setF({ ...f, enabled: v })} data-testid="offer-form-enabled" /> Show banner on the store
        </label>
        <Field label="Bold label"><input className={inp} maxLength={40} value={f.label} onChange={set("label")} data-testid="offer-form-label" /></Field>
        <Field label="Offer text"><input required className={inp} maxLength={160} value={f.text} onChange={set("text")} data-testid="offer-form-text" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Link (https://…)"><input type="url" className={inp} value={f.link_url} onChange={set("link_url")} data-testid="offer-form-link" /></Field>
          <Field label="Link label"><input className={inp} maxLength={40} value={f.link_label} onChange={set("link_label")} data-testid="offer-form-link-label" /></Field>
        </div>
        <Field label="Countdown (minutes)" hint="Starts fresh on every visit. Set 0 to hide the countdown.">
          <input type="number" min={0} max={1440} className={inp} value={f.countdown_minutes} onChange={set("countdown_minutes", Number)} data-testid="offer-form-minutes" />
        </Field>
        <button className="justify-self-start rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground" data-testid="offer-form-save">Save banner</button>
      </form>
      <div>
        <p className="text-sm text-muted-foreground">Preview</p>
        <div className="mt-2 rounded-xl bg-primary px-4 py-3 text-center text-sm text-primary-foreground" data-testid="offer-form-preview">
          {f.label && <strong>{f.label} </strong>}{f.text}
          {f.countdown_minutes > 0 && <span className="ml-2 rounded-full bg-background/15 px-2 py-0.5 font-bold">{String(f.countdown_minutes).padStart(2, "0")}:00 left</span>}
          {f.link_url && f.link_label && <span className="ml-2 font-semibold">{f.link_label} →</span>}
        </div>
        {!f.enabled && <p className="mt-2 text-xs text-muted-foreground">Hidden on the store until you switch it on.</p>}
      </div>
    </div>
  );
};
