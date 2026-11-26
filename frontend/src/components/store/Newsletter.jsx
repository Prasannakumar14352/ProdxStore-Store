import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";

export const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/newsletter", { email });
      setDone(true);
    } catch (err) {
      toast.error(err.response?.status === 429 ? err.response.data.detail : "Please enter a valid email address.");
    } finally {
      setBusy(false);
    }
  };
  if (done)
    return (
      <p data-testid="newsletter-success" className="mt-6 rounded-2xl border border-primary/50 bg-card p-4 text-sm">
        You're on the list. We'll email <span className="font-semibold">{email}</span> when new products and deals drop.
      </p>
    );
  return (
    <form onSubmit={submit} className="mt-6" data-testid="newsletter-form">
      <label htmlFor="nl-email" className="font-display font-semibold">New products & deals, in your inbox</label>
      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input id="nl-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
            data-testid="newsletter-email-input"
            className="h-12 w-full rounded-full border border-input bg-card pl-10 pr-4 text-sm outline-none focus:border-primary" />
        </div>
        <button disabled={busy} data-testid="newsletter-submit-button"
          className="inline-flex h-12 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">No spam. Ask us anytime to be removed.</p>
    </form>
  );
};
