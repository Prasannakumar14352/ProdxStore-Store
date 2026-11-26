import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, LogOut, ShieldAlert } from "lucide-react";
import { api } from "../lib/api";
import { getSupabase, signInWithGoogle, signOut } from "../lib/supabase";
import { Logo } from "../components/store/Nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ProductsAdmin } from "../components/admin/ProductsAdmin";
import { ReviewsAdmin } from "../components/admin/ReviewsAdmin";
import { MessagesAdmin } from "../components/admin/MessagesAdmin";
import { OfferAdmin } from "../components/admin/OfferAdmin";
import { SubscribersAdmin } from "../components/admin/SubscribersAdmin";


const Shell = ({ children, user, onLogout }) => (
  <div className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3 sm:px-10">
        <Logo />
        <div className="flex items-center gap-2">
          <Link to="/" data-testid="admin-back-to-store" className="hidden items-center gap-1 rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground sm:inline-flex">
            <ArrowLeft className="h-4 w-4" /> Store
          </Link>
          {user && (
            <button onClick={onLogout} data-testid="logout-button" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:border-primary">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          )}
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-5 py-10 sm:px-10">{children}</main>
  </div>
);

const SignInCard = ({ denied, email }) => (
  <div className="mx-auto mt-10 max-w-md rounded-3xl border border-border bg-card p-8 text-center" data-testid="admin-signin-card">
    {denied ? <ShieldAlert className="mx-auto h-10 w-10 text-primary" /> : null}
    <h1 className="font-display mt-2 text-3xl font-bold">{denied ? "Not on the admin list" : "Admin sign-in"}</h1>
    <p className="mt-3 text-muted-foreground">
      {denied
        ? `${email} is signed in but isn't allowed to manage ProdXStore. Try a different Google account.`
        : "Manage products, verified testimonials and support messages. Only approved Google accounts can enter."}
    </p>
    <button onClick={signInWithGoogle} data-testid="admin-google-signin-button" className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-full bg-primary px-6 py-4 font-semibold text-primary-foreground hover:bg-primary/90">
      Continue with Google
    </button>
  </div>
);

export default function Admin() {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let sub;
    const check = async (session) => {
      if (!session) {
        setUser(null);
        setChecked(true);
        return;
      }
      const me = await api.get("/auth/me").then((r) => r.data).catch(() => null);
      setUser(me);
      setChecked(true);
    };
    getSupabase().then(async (sb) => {
      const { data } = await sb.auth.getSession();
      await check(data.session);
      sub = sb.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") check(session);
      }).data.subscription;
    });
    return () => sub?.unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    await signOut().catch(() => {});
    setUser(null);
  }, []);

  if (!checked) return <Shell><p className="text-muted-foreground" data-testid="admin-loading">Checking your session…</p></Shell>;
  if (!user || !user.is_admin) return <Shell user={user} onLogout={logout}><SignInCard denied={!!user} email={user?.email} /></Shell>;

  return (
    <Shell user={user} onLogout={logout}>
      <p className="eyebrow">Admin</p>
      <h1 className="font-display mt-2 text-3xl font-bold sm:text-4xl" data-testid="admin-welcome">Hi {user.name?.split(" ")[0] || "there"} — manage the catalogue</h1>
      <Tabs defaultValue="products" className="mt-8">
        <TabsList className="h-auto flex-wrap justify-start gap-1 rounded-full bg-secondary p-1">
          {[["products", "Products"], ["testimonials", "Reviews"], ["messages", "Messages"], ["subscribers", "Subscribers"], ["offer", "Offer banner"]].map(([t, label]) => (
            <TabsTrigger key={t} value={t} data-testid={`admin-tab-${t}`} className="rounded-full px-5 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{label}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="products" className="mt-6"><ProductsAdmin /></TabsContent>
        <TabsContent value="testimonials" className="mt-6"><ReviewsAdmin /></TabsContent>
        <TabsContent value="messages" className="mt-6"><MessagesAdmin /></TabsContent>
        <TabsContent value="subscribers" className="mt-6"><SubscribersAdmin /></TabsContent>
        <TabsContent value="offer" className="mt-6"><OfferAdmin /></TabsContent>
      </Tabs>
    </Shell>
  );
}
