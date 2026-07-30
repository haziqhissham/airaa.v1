"use client";

/**
 * Client-side Supabase auth: email/password, Google & Azure OAuth, magic link,
 * password reset. OAuth and magic link redirect through /auth/callback.
 */

import { createClient } from "@/lib/supabase/client";

function callbackUrl(next?: string): string {
  const base = `${window.location.origin}/auth/callback`;
  return next ? `${base}?next=${encodeURIComponent(next)}` : base;
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithPassword(
  email: string,
  password: string,
  name: string,
) {
  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: callbackUrl("/register") },
  });
  if (error) throw error;
}

export async function signInWithOAuth(
  provider: "google" | "azure",
  next?: string,
) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callbackUrl(next),
      scopes: provider === "azure" ? "email openid profile" : undefined,
    },
  });
  if (error) throw error;
}

export async function signInWithMagicLink(email: string, next?: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callbackUrl(next), shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function sendPasswordReset(email: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

/** Map Supabase auth errors to friendly messages. */
export function friendlyAuthError(err: unknown): string {
  const msg =
    typeof err === "object" && err && "message" in err
      ? String((err as { message: unknown }).message)
      : "";
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "Incorrect email or password.";
  if (m.includes("already registered")) return "An account with this email already exists.";
  if (m.includes("email not confirmed")) return "Please confirm your email first.";
  if (m.includes("rate limit")) return "Too many attempts. Please try again later.";
  if (m.includes("password")) return msg || "Password does not meet requirements.";
  return msg || "Something went wrong. Please try again.";
}
