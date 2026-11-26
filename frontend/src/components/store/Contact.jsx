import { useEffect, useState } from "react";
import { Mail, Send, Loader2, LifeBuoy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { SectionHead } from "./Reveal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const TOPICS = ["Access to a product", "Billing & payments", "CreatorFlow AI", "Refund request", "General question"];
const field = "h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

export const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", topic: TOPICS[0], message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);
  const [email, setEmail] = useState("");
  useEffect(() => {
    api.get("/config").then((r) => setEmail(r.data.support_email)).catch(() => {});
  }, []);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const { data } = await api.post("/contact", form);
      setSent(data);
      toast.success("Thanks! Your message is with our support team.");
      setForm({ name: "", email: "", topic: TOPICS[0], message: "" });
    } catch (e) {
      toast.error(e.response?.status === 429 ? e.response.data.detail : "Please check your email address and write at least a short message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="contact" className="section-pad border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <SectionHead id="contact" eyebrow="Contact" title="Need a hand? Talk to support.">
            Questions about access, billing or a product — send a short note and we will reply by email.
          </SectionHead>
          <div className="mt-8 space-y-4">
            {email && (
              <a href={`mailto:${email}`} data-testid="contact-email-link" className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary">
                <Mail className="h-6 w-6 text-primary" />
                <span><span className="block text-sm text-muted-foreground">Email us</span><span className="font-semibold">{email}</span></span>
              </a>
            )}
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
              <LifeBuoy className="h-6 w-6 text-primary" />
              <span className="text-sm text-muted-foreground">Include your order email so we can find your purchase quickly.</span>
            </div>
          </div>
        </div>
        {sent ? (
          <div data-testid="contact-success" className="flex flex-col items-start justify-center rounded-3xl border border-primary/50 bg-card p-6 sm:p-10">
            <CheckCircle2 className="h-12 w-12 text-primary" />
            <h3 className="font-display mt-5 text-2xl font-bold sm:text-3xl">Got it, {sent.name.split(" ")[0]} — your message arrived.</h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Our support team has your note about <span className="text-foreground">{sent.topic.toLowerCase()}</span> and will reply to{" "}
              <span className="text-foreground">{sent.email}</span>.
            </p>
            <p className="mt-5 rounded-xl bg-secondary px-4 py-3 text-sm">
              Your reference: <strong className="font-display tracking-wider text-primary" data-testid="contact-success-reference">PX-{sent.id.slice(0, 6).toUpperCase()}</strong>
            </p>
            <button onClick={() => setSent(null)} data-testid="contact-send-another" className="mt-6 rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:border-primary hover:text-primary">
              Send another message
            </button>
          </div>
        ) : (
        <form onSubmit={submit} data-testid="contact-form" className="grid gap-4 rounded-3xl border border-border bg-card p-6 sm:grid-cols-2 sm:p-8">
          <label className="grid gap-2 text-sm font-medium">Name
            <input required value={form.name} onChange={set("name")} className={field} placeholder="Your name" data-testid="contact-name-input" />
          </label>
          <label className="grid gap-2 text-sm font-medium">Email
            <input required type="email" value={form.email} onChange={set("email")} className={field} placeholder="you@example.com" data-testid="contact-email-input" />
          </label>
          <div className="grid gap-2 text-sm font-medium sm:col-span-2">Topic
            <Select value={form.topic} onValueChange={(v) => setForm({ ...form, topic: v })}>
              <SelectTrigger className="h-12 rounded-xl bg-background text-base" data-testid="contact-topic-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TOPICS.map((t) => <SelectItem key={t} value={t} data-testid={`contact-topic-${t.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <label className="grid gap-2 text-sm font-medium sm:col-span-2">Message
            <textarea required minLength={5} rows={5} value={form.message} onChange={set("message")} className={`${field} h-auto py-3`} placeholder="How can we help?" data-testid="contact-message-input" />
          </label>
          <button disabled={sending} data-testid="contact-submit-button" className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 font-semibold text-primary-foreground transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-primary/90 disabled:opacity-60 sm:col-span-2">
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} Send message
          </button>
        </form>
        )}
      </div>
    </section>
  );
};
