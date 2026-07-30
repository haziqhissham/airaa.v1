"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import { registrationSchema, type RegistrationInput } from "@/lib/validation/auth";
import { AgeGroup } from "@/domain/enums";
import {
  signUpWithPassword,
  friendlyAuthError,
} from "@/lib/supabase/auth-client";
import { createClient } from "@/lib/supabase/client";
import { completeRegistration } from "@/lib/actions/auth";

interface RegisterFormProps {
  departments: { id: string; name: string }[];
}

const STEP1_FIELDS = ["email", "password", "confirmPassword"] as const;

export function RegisterForm({ departments }: RegisterFormProps) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);

  const form = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    mode: "onTouched",
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
      employeeId: "",
      departmentId: "",
      division: "",
      jobPosition: "",
      jobGrade: "",
      yearsOfService: 0,
      ageGroup: AgeGroup.A25_34,
      officeLocation: "",
    },
  });

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = form;

  const next = async () => {
    const valid = await trigger(STEP1_FIELDS);
    if (valid) setStep(1);
  };

  const onSubmit = async (data: RegistrationInput) => {
    try {
      // 1. Create the Supabase account.
      await signUpWithPassword(data.email, data.password, data.name);

      // 2. If email confirmation is required, there's no session yet.
      const {
        data: { session },
      } = await createClient().auth.getSession();
      if (!session) {
        toast.info(
          "Check your email to confirm your account, then sign in to finish your profile.",
        );
        router.push("/login");
        return;
      }

      // 3. Persist role/org claims + Prisma profile.
      const result = await completeRegistration({
        name: data.name,
        employeeId: data.employeeId,
        departmentId: data.departmentId,
        division: data.division,
        jobPosition: data.jobPosition,
        jobGrade: data.jobGrade,
        yearsOfService: data.yearsOfService,
        ageGroup: data.ageGroup,
        officeLocation: data.officeLocation,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Could not complete registration.");
        return;
      }
      toast.success("Account created. Welcome aboard!");
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(friendlyAuthError(err));
    }
  };

  const err = (name: keyof RegistrationInput) =>
    errors[name] ? (
      <p className="text-xs text-destructive">{errors[name]?.message as string}</p>
    ) : null;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Step {step + 1} of 2 — {step === 0 ? "account details" : "your profile"}
        </p>
        <Progress value={step === 0 ? 50 : 100} className="mt-4 h-1.5" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {step === 0 ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" {...register("email")} />
              {err("email")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" {...register("password")} />
              {err("password")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input id="confirmPassword" type="password" autoComplete="new-password" placeholder="Re-enter password" {...register("confirmPassword")} />
              {err("confirmPassword")}
            </div>
            <Button type="button" variant="gradient" size="lg" className="w-full" onClick={next}>
              Continue <ArrowRight className="size-4" />
            </Button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" autoComplete="name" {...register("name")} />
                {err("name")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input id="employeeId" {...register("employeeId")} />
                {err("employeeId")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobGrade">Job grade</Label>
                <Input id="jobGrade" placeholder="e.g. E2" {...register("jobGrade")} />
                {err("jobGrade")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="departmentId">Department</Label>
                <NativeSelect id="departmentId" defaultValue="" {...register("departmentId")}>
                  <option value="" disabled>
                    {departments.length ? "Select department" : "No departments configured"}
                  </option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </NativeSelect>
                {err("departmentId")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="division">Division</Label>
                <Input id="division" {...register("division")} />
                {err("division")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobPosition">Job position</Label>
                <Input id="jobPosition" {...register("jobPosition")} />
                {err("jobPosition")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="officeLocation">Office location</Label>
                <Input id="officeLocation" {...register("officeLocation")} />
                {err("officeLocation")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearsOfService">Years of service</Label>
                <Input id="yearsOfService" type="number" min={0} max={60} step={1} {...register("yearsOfService")} />
                {err("yearsOfService")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ageGroup">Age group</Label>
                <NativeSelect id="ageGroup" {...register("ageGroup")}>
                  {Object.values(AgeGroup).map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </NativeSelect>
                {err("ageGroup")}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" size="lg" onClick={() => setStep(0)}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button type="submit" variant="gradient" size="lg" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                Create account
              </Button>
            </div>
          </>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
