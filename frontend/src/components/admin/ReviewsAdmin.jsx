import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { Switch } from "../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Stars, StarPicker } from "../store/Stars";

const inp = "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary";
const BLANK = { name: "", email: "", product_id: "", quote: "", rating: 5 };
const STATUSES = [["pending", "Waiting for check"], ["approved", "Verified & live"], ["rejected", "Rejected"], ["hidden", "Hidden"]];

const AddReview = ({ products, onAdded }) => {
  const [f, setF] = useState(BLANK);
  const add = async (e) => {
    e.preventDefault();
    if (!f.product_id) return toast.error("Pick which product this review is for");
    try {
      await api.post("/admin/testimonials", f);
      toast.success("Review added and published");
      setF(BLANK);
      onAdded();
    } catch (err) {
      toast.error(typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Add a name and at least 10 characters");
    }
  };
  return (
    <form onSubmit={add} className="grid content-start gap-3 rounded-2xl border border-border bg-card p-5" data-testid="testimonial-form">
      <h2 className="font-display text-lg font-semibold">Add verified feedback</h2>
      <input required placeholder="Customer name" className={inp} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="testimonial-form-name" />
      <input type="email" placeholder="Customer email (optional, private)" className={inp} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} data-testid="testimonial-form-email" />
      <Select value={f.product_id} onValueChange={(v) => setF({ ...f, product_id: v })}>
        <SelectTrigger className="h-11 rounded-xl bg-background" data-testid="testimonial-form-product"><SelectValue placeholder="Which product?" /></SelectTrigger>
        <SelectContent>
          {products.map((p) => <SelectItem key={p.id} value={p.id} data-testid={`testimonial-form-product-${p.id}`}>{p.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <StarPicker value={f.rating} onChange={(rating) => setF({ ...f, rating })} testid="testimonial-form-rating" />
      <textarea required minLength={10} rows={4} placeholder="Their words, exactly as given" className={`${inp} h-auto py-2`} value={f.quote} onChange={(e) => setF({ ...f, quote: e.target.value })} data-testid="testimonial-form-quote" />
      <button className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground" data-testid="testimonial-form-save"><Plus className="h-4 w-4" /> Add</button>
    </form>
  );
};

const ReviewRow = ({ t, onPatch }) => (
  <li className={`rounded-2xl border bg-card p-4 ${t.status === "pending" ? "border-primary/60" : "border-border"}`} data-testid={`admin-testimonial-row-${t.id}`}>
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span className="font-semibold">{t.name}</span>
      {t.rating ? <Stars value={t.rating} testid={`admin-testimonial-stars-${t.id}`} /> : null}
      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{t.product}</span>
      {t.email && <a href={`mailto:${t.email}`} className="text-xs text-primary hover:underline">{t.email}</a>}
      {t.verified_buyer && <span className="text-xs text-primary">Verified buyer</span>}
    </div>
    <p className="mt-3 text-sm leading-relaxed">“{t.quote}”</p>
    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
      <Select value={t.status} onValueChange={(status) => onPatch(t, { status })}>
        <SelectTrigger className="h-9 w-48 rounded-full bg-background text-xs" data-testid={`admin-testimonial-status-${t.id}`}><SelectValue /></SelectTrigger>
        <SelectContent>
          {STATUSES.map(([v, label]) => <SelectItem key={v} value={v} data-testid={`admin-testimonial-status-${t.id}-${v}`}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
      <label className="flex items-center gap-2 text-muted-foreground">
        <Switch checked={t.featured} onCheckedChange={(featured) => onPatch(t, { featured })} data-testid={`admin-testimonial-featured-${t.id}`} /> Show on home page
      </label>
    </div>
  </li>
);

export const ReviewsAdmin = () => {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const load = () => api.get("/admin/testimonials").then((r) => setItems(r.data));
  useEffect(() => {
    load();
    api.get("/admin/products").then((r) => setProducts(r.data));
  }, []);
  const patch = async (t, body) => {
    await api.patch(`/admin/testimonials/${t.id}`, body);
    load();
  };
  const pending = items.filter((t) => t.status === "pending").length;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
      <AddReview products={products} onAdded={load} />
      <div>
        <p className="text-sm text-muted-foreground" data-testid="admin-reviews-summary">
          {pending ? `${pending} review${pending > 1 ? "s" : ""} waiting for your check — set them to “Verified & live” to publish.` : "No reviews waiting."}
        </p>
        <ul className="mt-4 grid gap-3">
          {items.map((t) => <ReviewRow key={t.id} t={t} onPatch={patch} />)}
        </ul>
      </div>
    </div>
  );
};
