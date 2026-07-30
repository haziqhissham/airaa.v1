"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validation/auth";
import {
  sendPasswordReset,
  friendlyAuthError,
} from "@/lib/supabase/auth-client";

export function ForgotForm() {
  const [sent, setSent] = React.useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      await sendPasswordReset(data.email);
      setSent(true);
    } catch (err) {
      // Do not reveal whether the email exists — always show success unless
      // it's a clearly malformed request.
      const msg = friendlyAuthError(err);
      if (msg.includes("invalid")) toast.error(msg);
      else setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="animate-fade-in text-center">
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
          <MailCheck className="size-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Check your inbox</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          If an account exists for{" "}
          <span className="font-medium text-foreground">
            {getValues("email")}
          </span>
          , we&apos;ve sent a link to reset your password.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/login">
            <ArrowLeft className="size-4" /> Back to sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
