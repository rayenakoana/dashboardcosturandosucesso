import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Cliente apontado para o schema "wpp" — mesmas credenciais, schema diferente.
// Usado para ler wpp.meta_ads_insights e wpp.campaign_sends no CS Dash.
export const supabaseWpp = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: "wpp" },
  auth: {
    storageKey: "sb-wpp-auth-token",
  },
});
