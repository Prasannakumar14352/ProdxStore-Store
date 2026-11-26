import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { API, api } from "./api";

let clientPromise = null;

// The Supabase project URL + public anon key come from the backend, so they're configured in one place.
export const getSupabase = () => {
  if (!clientPromise) {
    clientPromise = axios.get(`${API}/config`).then(({ data }) =>
      createClient(data.supabase_url, data.supabase_anon_key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
      })
    );
  }
  return clientPromise;
};

// Attach the admin's Supabase session to API calls once sign-in has been initialised.
api.interceptors.request.use(async (config) => {
  if (!clientPromise) return config;
  const sb = await clientPromise;
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const signInWithGoogle = async () => {
  const sb = await getSupabase();
  // Must be listed under Supabase → Authentication → URL Configuration → Redirect URLs.
  await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/admin` } });
};

export const signOut = async () => {
  const sb = await getSupabase();
  await sb.auth.signOut();
};
