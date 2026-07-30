/**
 * Supabase session middleware: refreshes the auth cookie on every request and
 * gates protected routes. Authoritative role checks happen in server components
 * via lib/auth/guards; RLS is the hard boundary.
 */

import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * All paths except static assets and image files — so the session cookie
     * refreshes everywhere but we skip the heavy stuff.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
