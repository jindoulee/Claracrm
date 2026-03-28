import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

// Basic client for client-side usage (no auth context)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service role client — bypasses RLS, use only on the server
export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";
  return createClient(supabaseUrl, serviceKey);
}

// Server-side client with cookie-based auth session
export async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}

// Get the authenticated user's ID, or null if not signed in
export async function getAuthUserId(): Promise<string | null> {
  try {
    const client = await createAuthClient();
    const { data: { user } } = await client.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

// Fallback user ID for unauthenticated access during migration
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

// Get user ID: returns authenticated user if available, falls back to demo
export async function getUserId(): Promise<string> {
  const authId = await getAuthUserId();
  return authId || DEMO_USER_ID;
}
