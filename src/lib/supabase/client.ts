import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

// Using untyped client — types will be generated from Supabase CLI later
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";
  return createClient(supabaseUrl, serviceKey);
}
