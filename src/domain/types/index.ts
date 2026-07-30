/**
 * Domain entity models — Firestore-shaped, framework-agnostic.
 *
 * The platform is a multi-tenant, white-label SaaS. Every tenant-scoped
 * document carries `organizationId`. There is NO hardcoded client — Johor Land
 * Berhad (JLG) exists only as seed data under its own organization document.
 *
 * Timestamps are ISO strings at the domain boundary so the core stays free of
 * Firebase types. Repository converters translate to/from Firestore Timestamp.
 */

import type {
  AgeGroup,
  AssessmentStatus,
  AuditAction,
  Dimension,
  JobFunction,
  OrganizationStatus,
  Persona,
  ProgrammeCode,
  ProgrammeLevel,
  QuestionType,
  ScoreMode,
  ScoredDimension,
  Section,
  UserRole,
  UserStatus,
  VersionStatus,
} from "@/domain/enums";

/** Scores keyed by the five scored dimensions, each 0..100. */
export type DimensionScores = Record<Lowercase<ScoredDimension>, number>;

/** Weights per dimension; must sum to ~1.0. Derived from assessment_sections. */
export type DimensionWeights = Record<Lowercase<ScoredDimension>, number>;

/** Base fields on every tenant-scoped document. */
export interface BaseDoc {
  organizationId: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─────────────────────────────────────────────────────────────
// Tenancy
// ─────────────────────────────────────────────────────────────

export interface OrganizationTheme {
  /** Primary brand hue (hex). Drives the generated CSS variables. */
  primary: string;
  /** Optional secondary/accent hue (hex). */
  accent?: string;
  /** Gradient stops for hero/brand surfaces. */
  gradientFrom: string;
  gradientTo: string;
}

/** A tenant. The root of white-label isolation. */
export interface Organization {
  id: string;
  name: string;
  /** URL-safe slug + tenant resolution key (e.g. "jlg"). */
  code: string;
  status: OrganizationStatus;
  logoUrl?: string;
  theme: OrganizationTheme;
  /** Currently published assessment version for this org. */
  defaultVersionId?: string;
  /** Custom domains/subdomains that resolve to this tenant. */
  domains?: string[];
  contactEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Auth identity + authorization, keyed by Firebase Auth UID. */
export interface User extends BaseDoc {
  uid: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  /** True once the linked employee profile is completed. */
  profileComplete: boolean;
  displayName?: string;
  lastLoginAt?: string;
}

// ─────────────────────────────────────────────────────────────
// People
// ─────────────────────────────────────────────────────────────

/** Rich HR profile linked 1:1 to a User via uid. */
export interface Employee extends BaseDoc {
  uid: string;
  employeeId: string;
  name: string;
  email: string;
  departmentId: string;
  department: string;
  division: string;
  jobRoleId?: string;
  jobPosition: string;
  jobGrade: string;
  yearsOfService: number;
  ageGroup: AgeGroup;
  officeLocation: string;
  jobFunction: JobFunction;
}

export interface Department extends BaseDoc {
  id: string;
  name: string;
  division: string;
  jobFunction: JobFunction;
  headcount?: number;
}

export interface JobRole extends BaseDoc {
  id: string;
  title: string;
  jobFunction: JobFunction;
  jobGrade: string;
  defaultRole: UserRole;
}

// ─────────────────────────────────────────────────────────────
// Assessment structure
// ─────────────────────────────────────────────────────────────

export interface AssessmentVersion extends BaseDoc {
  id: string;
  title: string;
  description: string;
  status: VersionStatus;
  isDefault: boolean;
}

/**
 * A section of an assessment version. Sections map 1:1 to a scored dimension
 * and carry the CONFIGURABLE weight for that dimension (source of truth).
 */
export interface AssessmentSection extends BaseDoc {
  id: string;
  versionId: string;
  key: Section;
  title: string;
  description: string;
  order: number;
  dimension: Dimension;
  /** Weight of this dimension in the overall score (0..1). Configurable. */
  weight: number;
}

export interface Question extends BaseDoc {
  id: string;
  versionId: string;
  sectionId: string;
  section: Section;
  dimension: Dimension;
  order: number;
  type: QuestionType;
  text: string;
  helpText?: string;
  required: boolean;
  /** Relative weight within its dimension. */
  weight: number;
  scoreMode: ScoreMode;
  /** Normalization ceiling for this question's raw score. */
  maxScore: number;
}

/** A selectable option, stored in its own collection (question_options). */
export interface QuestionOption extends BaseDoc {
  id: string;
  questionId: string;
  versionId: string;
  order: number;
  label: string;
  /** Stored answer value. */
  value: string;
  /** Score contribution (0..question.maxScore). */
  score: number;
}

/** A question hydrated with its options — the shape the engines consume. */
export interface HydratedQuestion extends Question {
  options: QuestionOption[];
}

// ─────────────────────────────────────────────────────────────
// Assessment runs, responses, results
// ─────────────────────────────────────────────────────────────

export type AnswerValue = string | string[] | number;

export interface Answer {
  value: AnswerValue;
  answeredAt: string;
}

export interface Assessment extends BaseDoc {
  id: string;
  uid: string;
  versionId: string;
  status: AssessmentStatus;
  currentSection: Section;
  progress: number;
  startedAt: string;
  submittedAt?: string;
}

export interface ResponseSet extends BaseDoc {
  id: string;
  assessmentId: string;
  uid: string;
  versionId: string;
  answers: Record<string, Answer>;
}

export interface Recommendation {
  programmeId: string;
  programmeCode: ProgrammeCode | string;
  title: string;
  reason: string;
  priority: number;
}

export interface LearningPathStep {
  step: number;
  programmeId: string;
  programmeCode: ProgrammeCode | string;
  title: string;
  focus: string;
}

export interface AssessmentResult extends BaseDoc {
  id: string;
  uid: string;
  assessmentId: string;
  versionId: string;
  dimensionScores: DimensionScores;
  overallScore: number;
  persona: Persona;
  personaLabel: string;
  strengths: string[];
  areasToImprove: string[];
  recommendations: Recommendation[];
  learningPath: LearningPathStep[];
  computedAt: string;
}

// ─────────────────────────────────────────────────────────────
// Configurable classification & recommendation
// ─────────────────────────────────────────────────────────────

/** Persona tier — CONFIGURABLE via the `personas` collection. */
export interface PersonaConfig extends BaseDoc {
  id: string;
  key: Persona;
  label: string;
  /** Inclusive score band [min, max] within 0..100. */
  min: number;
  max: number;
  order: number;
  tagline: string;
  description: string;
  /** Accent hue (hex) for result UI. */
  accent: string;
}

export interface TrainingProgramme extends BaseDoc {
  id: string;
  code: ProgrammeCode | string;
  title: string;
  description: string;
  duration: string;
  level: ProgrammeLevel;
  skills: string[];
  jobFunctions: JobFunction[];
  minScore: number;
  maxScore: number;
}

export interface RuleConditions {
  jobFunctions?: JobFunction[];
  departmentIds?: string[];
  personas?: Persona[];
  minScore?: number;
  maxScore?: number;
  dimensionBelow?: { dimension: ScoredDimension; threshold: number };
}

export interface RecommendationRule extends BaseDoc {
  id: string;
  priority: number;
  label: string;
  conditions: RuleConditions;
  programmeCodes: (ProgrammeCode | string)[];
  reasonTemplate: string;
  stopOnMatch: boolean;
}

// ─────────────────────────────────────────────────────────────
// Operations
// ─────────────────────────────────────────────────────────────

export interface AuditLog extends BaseDoc {
  id: string;
  action: AuditAction;
  actorUid: string;
  actorEmail?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  at: string;
}

/** Per-organization (or global when organizationId === "GLOBAL") settings. */
export interface SystemSetting extends BaseDoc {
  id: string;
  key: string;
  value: unknown;
  description?: string;
}
