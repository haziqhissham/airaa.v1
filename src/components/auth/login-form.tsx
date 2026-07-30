"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LogIn, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import {
  signInWithPassword,
  signInWithOAuth,
  signInWithMagicLink,
  friendlyAuthError,
} from "@/lib/supabase/auth-client";
import { afterLogin } from "@/lib/actions/auth";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextParam = params.get("next");
  const [oauthLoading, setOauthLoading] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      await signInWithPassword(data.email, data.password);
      const { redirect } = await afterLogin();
      toast.success("Welcome back!");
      router.replace(nextParam || redirect);
      router.refresh();
    } catch (err) {
      toast.error(friendlyAuthError(err));
    }
  };

  const oauth = async (provider: "google" | "azure") => {
    setOauthLoading(provider);
    try {
      await signInWithOAuth(provider, nextParam ?? undefined);
      // redirect happens via Supabase
    } catch (err) {
      toast.error(friendlyAuthError(err));
      setOauthLoading(null);
    }
  };

  const magicLink = async () => {
    const email = getValues("email");
    if (!email) {
      toast.error("Enter your email first, then request a magic link.");
      return;
    }
    try {
      await signInWithMagicLink(email, nextParam ?? undefined);
      toast.success("Magic link sent — check your inbox.");
    } catch (err) {
      toast.error(friendlyAuthError(err));
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Access your AI readiness assessment.
        </p>
      </div>

      {/* OAuth */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => oauth("google")} disabled={!!oauthLoading}>
          {oauthLoading === "google" ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
          Google
        </Button>
        <Button variant="outline" onClick={() => oauth("azure")} disabled={!!oauthLoading}>
          {oauthLoading === "azure" ? <Loader2 className="size-4 animate-spin" /> : <MicrosoftIcon />}
          Microsoft
        </Button>
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or continue with email{" "}
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" aria-invalid={!!errors.email} {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" aria-invalid={!!errors.password} {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
          Sign in
        </Button>
      </form>

      <button
        type="button"
        onClick={magicLink}
        className="mt-3 flex w-full items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Sparkles className="size-3.5" /> Email me a magic link instead
      </button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to the platform?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Mail className="size-3" /> Passwordless and SSO options supported
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.42 14.97.44 12 .44A11 11 0 0 0 2.18 6.06l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75Z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#F25022" d="M11.4 11.4H2V2h9.4v9.4Z" />
      <path fill="#7FBA00" d="M22 11.4h-9.4V2H22v9.4Z" />
      <path fill="#00A4EF" d="M11.4 22H2v-9.4h9.4V22Z" />
      <path fill="#FFB900" d="M22 22h-9.4v-9.4H22V22Z" />
    </svg>
  );
}
