import "server-only";

/**
 * Supabase service-role client (SERVER ONLY). Bypasses RLS — use only for
 * privileged operations (role assignment, admin writes, seeding). Never import
 * from a Client Component.
 */

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
