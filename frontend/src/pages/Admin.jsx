import { useEffect } from "react";
import { ADMIN_URL } from "../lib/supabase";

// Products, reviews, offers, messages and sales are all managed in one place now.
export default function Admin() {
  useEffect(() => { window.location.replace(ADMIN_URL); }, []);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-foreground">
      <p>Opening the ProdXStore admin… <a className="text-primary underline" href={ADMIN_URL}>Continue</a></p>
    </div>
  );
}
