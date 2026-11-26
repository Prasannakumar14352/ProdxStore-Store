import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Mail, Trash2 } from "lucide-react";
import { api } from "../../lib/api";

export const MessagesAdmin = () => {
  const [items, setItems] = useState(null);
  const load = () => api.get("/admin/messages").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  const toggle = async (m) => { await api.patch(`/admin/messages/${m.id}`); load(); };
  const remove = async (m) => {
    if (!window.confirm("Delete this message?")) return;
    await api.delete(`/admin/messages/${m.id}`);
    load();
  };
  if (items === null) return <p className="text-muted-foreground">Loading…</p>;
  if (!items.length) return <p className="text-muted-foreground" data-testid="admin-messages-empty">No support messages yet.</p>;
  return (
    <ul className="grid gap-3">
      {items.map((m) => (
        <li key={m.id} data-testid={`admin-message-row-${m.id}`} className={`rounded-2xl border bg-card p-5 ${m.resolved ? "border-border opacity-70" : "border-primary/40"}`}>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold">{m.name}</span>
            <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1 text-primary hover:underline" data-testid={`admin-message-reply-${m.id}`}><Mail className="h-4 w-4" />{m.email}</a>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{m.topic}</span>
            <span className="text-xs font-semibold text-primary">PX-{m.id.slice(0, 6).toUpperCase()}</span>
            <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
            <div className="ml-auto flex gap-2">
              <button onClick={() => toggle(m)} data-testid={`admin-message-resolve-${m.id}`} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary">
                {m.resolved ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4" />} {m.resolved ? "Resolved" : "Mark resolved"}
              </button>
              <button onClick={() => remove(m)} aria-label="Delete" data-testid={`admin-message-delete-${m.id}`} className="grid h-8 w-8 place-items-center rounded-full border border-border hover:border-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{m.message}</p>
        </li>
      ))}
    </ul>
  );
};
