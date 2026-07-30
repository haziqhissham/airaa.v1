"use client";

/**
 * Supabase browser client (client components). Uses the public anon key; all
 * access is guarded by Row Level Security. Wired into the app in Step 2/3.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
