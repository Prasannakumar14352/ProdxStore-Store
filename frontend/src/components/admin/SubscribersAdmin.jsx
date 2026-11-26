import { useEffect, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { api } from "../../lib/api";

export const SubscribersAdmin = () => {
  const [items, setItems] = useState(null);
  const load = () => api.get("/admin/subscribers").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  const remove = async (s) => {
    if (!window.confirm(`Remove ${s.email} from the list?`)) return;
    await api.delete(`/admin/subscribers/${s.id}`);
    load();
  };
  const download = async () => {
    const { data } = await api.get("/admin/subscribers.csv", { responseType: "blob" });
    const url = URL.createObjectURL(data);
    const a = Object.assign(document.createElement("a"), { href: url, download: "prodxstore-subscribers.csv" });
    a.click();
    URL.revokeObjectURL(url);
  };
  if (items === null) return <p className="text-muted-foreground">Loading…</p>;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted-foreground" data-testid="admin-subscribers-count">{items.length} subscriber{items.length === 1 ? "" : "s"}</p>
        <button onClick={download} data-testid="admin-subscribers-download"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          <Download className="h-4 w-4" /> Download CSV
        </button>
      </div>
      {items.length === 0 ? (
        <p className="mt-6 text-muted-foreground" data-testid="admin-subscribers-empty">No signups yet — the form is in the store footer.</p>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
          {items.map((s) => (
            <li key={s.id} className="flex items-center gap-4 px-5 py-3" data-testid={`admin-subscriber-row-${s.id}`}>
              <span className="flex-1 truncate font-medium">{s.email}</span>
              <span className="hidden text-xs text-muted-foreground sm:inline">{new Date(s.created_at).toLocaleDateString()}</span>
              <button onClick={() => remove(s)} aria-label="Remove" data-testid={`admin-subscriber-remove-${s.id}`}
                className="grid h-9 w-9 place-items-center rounded-full border border-border hover:border-destructive"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
