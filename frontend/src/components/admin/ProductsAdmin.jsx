import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, money, imgSrc } from "../../lib/api";
import { ImageUpload, GalleryUpload } from "./ImageUpload";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { Switch } from "../ui/switch";

const EMPTY = {
  name: "", tagline: "", description: "", category: "Creator Tools", image: "", gallery: [], price: 0, compare_at: null,
  currency: "INR", billing_period: "one-time", price_note: "", landing_url: "", checkout_url: "", pricing_url: "",
  features: [], plans: [], badge: "", featured: false, published: true, order: 0,
};
const inp = "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary";

const Field = ({ label, children, wide }) => (
  <label className={`grid gap-1.5 text-sm font-medium ${wide ? "sm:col-span-2" : ""}`}>{label}{children}</label>
);

const ProductForm = ({ initial, onSaved, onClose }) => {
  const [f, setF] = useState({ ...EMPTY, ...initial, plansText: JSON.stringify(initial?.plans || [], null, 2), featuresText: (initial?.features || []).join("\n") });
  const set = (k, parse = (v) => v) => (e) => setF({ ...f, [k]: parse(e.target.value) });

  const save = async (e) => {
    e.preventDefault();
    let plans;
    try { plans = JSON.parse(f.plansText || "[]"); } catch { return toast.error("Plans must be valid JSON"); }
    const { plansText, featuresText, id, uuid, status, whats_included, cta_text, created_at, ...body } = f;
    body.plans = plans;
    body.features = featuresText.split("\n").map((s) => s.trim()).filter(Boolean);
    body.compare_at = body.compare_at === "" || body.compare_at == null ? null : Number(body.compare_at);
    try {
      if (initial?.id) await api.put(`/admin/products/${initial.id}`, body);
      else await api.post("/admin/products", body);
      toast.success("Product saved");
      onSaved();
    } catch {
      toast.error("Could not save — check the name and landing URL");
    }
  };

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2" data-testid="product-form">
      <Field label="Name"><input required className={inp} value={f.name} onChange={set("name")} data-testid="product-form-name" /></Field>
      <Field label="Category"><input className={inp} value={f.category} onChange={set("category")} data-testid="product-form-category" /></Field>
      <Field label="Tagline" wide><input className={inp} value={f.tagline} onChange={set("tagline")} data-testid="product-form-tagline" /></Field>
      <Field label="Description" wide><textarea rows={3} className={`${inp} h-auto py-2`} value={f.description} onChange={set("description")} data-testid="product-form-description" /></Field>
      <Field label="Currency"><input className={inp} maxLength={3} value={f.currency} onChange={set("currency", (v) => v.toUpperCase())} placeholder="INR or USD" data-testid="product-form-currency" /></Field>
      <Field label="Price"><input type="number" step="0.01" className={inp} value={f.price} onChange={set("price", Number)} data-testid="product-form-price" /></Field>
      <Field label="Was price (optional)"><input type="number" step="0.01" className={inp} value={f.compare_at ?? ""} onChange={set("compare_at")} data-testid="product-form-compare" /></Field>
      <Field label="Billing period"><input className={inp} value={f.billing_period} onChange={set("billing_period")} placeholder="one-time / per month" data-testid="product-form-billing" /></Field>
      <Field label="Price note"><input className={inp} value={f.price_note} onChange={set("price_note")} data-testid="product-form-price-note" /></Field>
      <Field label="Landing page URL"><input required type="url" className={inp} value={f.landing_url} onChange={set("landing_url")} data-testid="product-form-landing" /></Field>
      <Field label="Checkout URL"><input type="url" className={inp} value={f.checkout_url} onChange={set("checkout_url")} data-testid="product-form-checkout" /></Field>
      <Field label="Pricing page URL"><input type="url" className={inp} value={f.pricing_url} onChange={set("pricing_url")} data-testid="product-form-pricing" /></Field>
      <div className="sm:col-span-2"><ImageUpload value={f.image} onChange={(v) => setF({ ...f, image: v })} /></div>
      <div className="sm:col-span-2"><GalleryUpload value={f.gallery} onChange={(v) => setF({ ...f, gallery: v })} /></div>
      <Field label="Features (one per line)" wide><textarea rows={3} className={`${inp} h-auto py-2`} value={f.featuresText} onChange={set("featuresText")} data-testid="product-form-features" /></Field>
      <Field label="Plans (JSON — leave [] for one-time products)" wide><textarea rows={4} className={`${inp} h-auto py-2 font-mono text-xs`} value={f.plansText} onChange={set("plansText")} data-testid="product-form-plans" /></Field>
      <Field label="Badge"><input className={inp} value={f.badge} onChange={set("badge")} data-testid="product-form-badge" /></Field>
      <Field label="Sort order"><input type="number" className={inp} value={f.order} onChange={set("order", Number)} data-testid="product-form-order" /></Field>
      <label className="flex items-center gap-3 text-sm"><Switch checked={f.published} onCheckedChange={(v) => setF({ ...f, published: v })} data-testid="product-form-published" /> Published</label>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <button type="button" onClick={onClose} className="rounded-full border border-border px-5 py-2.5 text-sm" data-testid="product-form-cancel">Cancel</button>
        <button className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground" data-testid="product-form-save">Save product</button>
      </div>
    </form>
  );
};

export const ProductsAdmin = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const load = () => api.get("/admin/products").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  const remove = async (p) => {
    if (!window.confirm(`Remove “${p.name}” from the store? It is archived, so its orders and reviews are kept.`)) return;
    await api.delete(`/admin/products/${p.id}`);
    toast.success("Product archived");
    load();
  };
  return (
    <div>
      <button onClick={() => setEditing({})} data-testid="admin-add-product-button" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Add product</button>
      <ul className="mt-6 grid gap-3">
        {items.map((p) => (
          <li key={p.id} data-testid={`admin-product-row-${p.id}`} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-3">
            <img src={imgSrc(p.image)} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.name} {!p.published && <span className="text-xs text-muted-foreground">(hidden)</span>}</p>
              <p className="text-sm text-muted-foreground">{money(p.price, p.currency)} · {p.billing_period}{p.status !== "published" ? ` · ${p.status.replace("_", " ")}` : ""} · {p.category}</p>
            </div>
            <button onClick={() => setEditing(p)} aria-label="Edit" data-testid={`admin-edit-product-${p.id}`} className="grid h-10 w-10 place-items-center rounded-full border border-border hover:border-primary"><Pencil className="h-4 w-4" /></button>
            <button onClick={() => remove(p)} aria-label="Archive" data-testid={`admin-delete-product-${p.id}`} className="grid h-10 w-10 place-items-center rounded-full border border-border hover:border-destructive"><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-border bg-card">
          <DialogTitle className="font-display text-xl">{editing?.id ? "Edit product" : "New product"}</DialogTitle>
          {editing && <ProductForm initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};
