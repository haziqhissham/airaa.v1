import { z } from "zod";
import { AgeGroup } from "@/domain/enums";
import type { AgeGroup as AgeGroupType } from "@/domain/enums";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

const ageGroups = Object.values(AgeGroup) as [AgeGroupType, ...AgeGroupType[]];

/** Account credentials captured at sign-up. */
export const credentialsSchema = z
  .object({
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/** Employee profile captured at registration. */
export const employeeProfileSchema = z.object({
  name: z.string().min(2, "Enter your full name"),
  employeeId: z.string().min(1, "Employee ID is required"),
  departmentId: z.string().min(1, "Select a department"),
  division: z.string().min(1, "Division is required"),
  jobPosition: z.string().min(1, "Job position is required"),
  jobGrade: z.string().min(1, "Job grade is required"),
  yearsOfService: z.coerce.number().min(0).max(60),
  ageGroup: z.enum(ageGroups),
  officeLocation: z.string().min(1, "Office location is required"),
});
export type EmployeeProfileInput = z.infer<typeof employeeProfileSchema>;

export const registrationSchema = credentialsSchema.and(employeeProfileSchema);
export type RegistrationInput = z.infer<typeof registrationSchema>;
