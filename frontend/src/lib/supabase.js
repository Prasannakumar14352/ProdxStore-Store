import { createClient } from "@supabase/supabase-js";

// One shared ProdXStore database: the same Supabase project powers prodxstore.com,
// pay.prodxstore.com (checkout) and admin.prodxstore.com (dashboard).
// The publishable key is safe in the browser; row-level security decides what visitors can read or write.
export const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "https://xjqbhktzhhivbpgnqwgm.supabase.co";
export const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY || "sb_publishable_rTmxuh-mF0wnGzqOV2VEQA_3zYCZMc_";

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const CHECKOUT_BASE = process.env.REACT_APP_CHECKOUT_URL || "https://pay.prodxstore.com";
export const ADMIN_URL = process.env.REACT_APP_ADMIN_URL || "https://admin.prodxstore.com";
