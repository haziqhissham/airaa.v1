/**
 * Domain enums — the shared vocabulary of the platform.
 * Framework-agnostic. No Firebase/React imports here.
 */

/** The five scored readiness dimensions (Section A / PROFILE is unscored). */
export const Dimension = {
  PROFILE: "PROFILE",
  AWARENESS: "AWARENESS",
  EXPOSURE: "EXPOSURE",
  CONFIDENCE: "CONFIDENCE",
  ADOPTION: "ADOPTION",
  MINDSET: "MINDSET",
} as const;
export type Dimension = (typeof Dimension)[keyof typeof Dimension];

/** The scored dimensions only (used for weighting + radar). */
export const SCORED_DIMENSIONS = [
  "AWARENESS",
  "EXPOSURE",
  "CONFIDENCE",
  "ADOPTION",
  "MINDSET",
] as const;
export type ScoredDimension = (typeof SCORED_DIMENSIONS)[number];

/** Assessment sections A–F map 1:1 to dimensions. */
export const Section = {
  A: "A",
  B: "B",
  C: "C",
  D: "D",
  E: "E",
  F: "F",
} as const;
export type Section = (typeof Section)[keyof typeof Section];

export const SECTION_DIMENSION: Record<Section, Dimension> = {
  A: "PROFILE",
  B: "AWARENESS",
  C: "EXPOSURE",
  D: "CONFIDENCE",
  E: "ADOPTION",
  F: "MINDSET",
};

/** Question input types. */
export const QuestionType = {
  MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
  CHECKBOX: "CHECKBOX",
  LIKERT: "LIKERT",
  DROPDOWN: "DROPDOWN",
} as const;
export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

/** How a question's options roll up to a raw score. */
export const ScoreMode = {
  SUM: "SUM", // checkbox — sum selected, capped at maxScore
  MAX: "MAX", // single choice / dropdown — selected option score
  LIKERT: "LIKERT", // 1..5 normalized
} as const;
export type ScoreMode = (typeof ScoreMode)[keyof typeof ScoreMode];

/** AI Personas by overall-score band. */
export const Persona = {
  UNAWARE: "UNAWARE",
  CURIOUS: "CURIOUS",
  EXPLORER: "EXPLORER",
  PRACTITIONER: "PRACTITIONER",
  CHAMPION: "CHAMPION",
} as const;
export type Persona = (typeof Persona)[keyof typeof Persona];

/** Employee job function — drives recommendations. */
export const JobFunction = {
  ADMIN: "ADMIN",
  SALES: "SALES",
  FINANCE: "FINANCE",
  HR: "HR",
  IT: "IT",
  OPERATIONS: "OPERATIONS",
  MANAGEMENT: "MANAGEMENT",
  OTHER: "OTHER",
} as const;
export type JobFunction = (typeof JobFunction)[keyof typeof JobFunction];

/** Authorization roles (v2 — six-tier, enforced by Supabase RLS + guards). */
export const UserRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ORG_ADMIN: "ORG_ADMIN",
  HR_ADMIN: "HR_ADMIN",
  TRAINER: "TRAINER",
  EMPLOYEE: "EMPLOYEE",
  GUEST: "GUEST",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Roles with organization-wide management access. */
export const ORG_MANAGER_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ORG_ADMIN,
];
/** Roles that can view org-wide people analytics (HR dashboard). */
export const HR_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ORG_ADMIN,
  UserRole.HR_ADMIN,
];

/** Training programme codes. */
export const ProgrammeCode = {
  OFFICE_MGMT: "OFFICE_MGMT",
  SALES_CX: "SALES_CX",
  COPILOT: "COPILOT",
  DATA_ANALYTICS: "DATA_ANALYTICS",
} as const;
export type ProgrammeCode = (typeof ProgrammeCode)[keyof typeof ProgrammeCode];

export const AssessmentStatus = {
  IN_PROGRESS: "IN_PROGRESS",
  SUBMITTED: "SUBMITTED",
} as const;
export type AssessmentStatus =
  (typeof AssessmentStatus)[keyof typeof AssessmentStatus];

export const VersionStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;
export type VersionStatus = (typeof VersionStatus)[keyof typeof VersionStatus];

export const AgeGroup = {
  UNDER_25: "<25",
  A25_34: "25-34",
  A35_44: "35-44",
  A45_54: "45-54",
  OVER_55: "55+",
} as const;
export type AgeGroup = (typeof AgeGroup)[keyof typeof AgeGroup];

export const ProgrammeLevel = {
  FOUNDATION: "FOUNDATION",
  INTERMEDIATE: "INTERMEDIATE",
  ADVANCED: "ADVANCED",
} as const;
export type ProgrammeLevel =
  (typeof ProgrammeLevel)[keyof typeof ProgrammeLevel];

/** Lifecycle of a tenant organization. */
export const OrganizationStatus = {
  ACTIVE: "ACTIVE",
  TRIAL: "TRIAL",
  SUSPENDED: "SUSPENDED",
} as const;
export type OrganizationStatus =
  (typeof OrganizationStatus)[keyof typeof OrganizationStatus];

/** Lifecycle of an auth user within an organization. */
export const UserStatus = {
  ACTIVE: "ACTIVE",
  INVITED: "INVITED",
  DISABLED: "DISABLED",
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

/** Audited actions for the audit_logs collection. */
export const AuditAction = {
  USER_REGISTERED: "USER_REGISTERED",
  USER_LOGIN: "USER_LOGIN",
  ASSESSMENT_STARTED: "ASSESSMENT_STARTED",
  ASSESSMENT_SUBMITTED: "ASSESSMENT_SUBMITTED",
  RESULT_COMPUTED: "RESULT_COMPUTED",
  QUESTION_UPDATED: "QUESTION_UPDATED",
  VERSION_PUBLISHED: "VERSION_PUBLISHED",
  RULE_UPDATED: "RULE_UPDATED",
  PERSONA_UPDATED: "PERSONA_UPDATED",
  PROGRAMME_UPDATED: "PROGRAMME_UPDATED",
  ORG_UPDATED: "ORG_UPDATED",
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
