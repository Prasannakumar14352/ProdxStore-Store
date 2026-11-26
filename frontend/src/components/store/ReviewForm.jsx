import { useState } from "react";
import { Loader2, PenLine, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { StarPicker } from "./Stars";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/dialog";

const field = "h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none placeholder:text-muted-foreground focus:border-primary";
const EMPTY = { name: "", email: "", quote: "", rating: 0 };

export const ReviewForm = ({ p }) => {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!f.rating) return toast.error("Please pick a star rating.");
    setBusy(true);
    try {
      await api.post(`/products/${p.id}/reviews`, f);
      setDone(true);
      setF(EMPTY);
    } catch (err) {
      const d = err.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Please add your name, a valid email and a review of at least 10 characters.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setDone(false); }}>
      <button onClick={() => setOpen(true)} data-testid="review-open-button"
        className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-border px-5 py-3 text-sm font-semibold hover:border-primary hover:text-primary sm:self-auto">
        <PenLine className="h-4 w-4" /> Leave a review
      </button>
      <DialogContent className="max-w-lg border-border bg-card sm:rounded-3xl" data-testid="review-dialog">
        {done ? (
          <div className="py-4" data-testid="review-success">
            <CheckCircle2 className="h-10 w-10 text-primary" />
            <DialogTitle className="font-display mt-4 text-2xl">Thanks for your review!</DialogTitle>
            <DialogDescription className="mt-2 text-muted-foreground">
              We check every review before it goes live, so it will appear on this page once it's verified.
            </DialogDescription>
            <button onClick={() => setOpen(false)} data-testid="review-close-button" className="mt-6 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-4" data-testid="review-form">
            <div>
              <DialogTitle className="font-display text-2xl">Review {p.name}</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">Your email is only used to confirm you're a customer — it's never shown.</DialogDescription>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">Your name
                <input required maxLength={80} value={f.name} onChange={set("name")} className={field} data-testid="review-name-input" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">Email used to buy
                <input required type="email" value={f.email} onChange={set("email")} className={field} data-testid="review-email-input" />
              </label>
            </div>
            <div className="grid gap-1.5 text-sm font-medium">Your rating
              <StarPicker value={f.rating} onChange={(rating) => setF({ ...f, rating })} testid="review-rating" />
            </div>
            <label className="grid gap-1.5 text-sm font-medium">Your review
              <textarea required minLength={10} maxLength={1500} rows={5} value={f.quote} onChange={set("quote")} placeholder="How has it helped your content work?"
                className={`${field} h-auto py-3`} data-testid="review-quote-input" />
            </label>
            <button disabled={busy} data-testid="review-submit-button"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send review
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
