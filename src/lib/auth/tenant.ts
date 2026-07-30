import "server-only";

/**
 * Tenant resolution. Authenticated requests use the org on the user's session
 * (app_metadata.organization_id); public requests fall back to a neutral,
 * env-driven organization so marketing/auth pages render without a DB. The
 * Prisma organization row is mapped to the framework-agnostic domain shape the
 * reused UI expects.
 */

import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { DEFAULT_ORG_ID } from "@/lib/utils";
import { OrganizationStatus } from "@/domain/enums";
import type { Organization } from "@/domain/types";

export const FALLBACK_ORG: Organization = {
  id: DEFAULT_ORG_ID,
  name: process.env.NEXT_PUBLIC_DEFAULT_ORG_NAME ?? "Your Organisation",
  code: process.env.NEXT_PUBLIC_DEFAULT_ORG_SLUG ?? "default",
  status: OrganizationStatus.ACTIVE,
  theme: {
    primary: "#2563eb",
    accent: "#3b82f6",
    gradientFrom: "#1e3a8a",
    gradientTo: "#3b82f6",
  },
};

type PrismaOrg = {
  id: string;
  name: string;
  slug: string;
  status: string;
  logoUrl: string | null;
  themePrimary: string;
  themeGradFrom: string;
  themeGradTo: string;
  defaultVersionId: string | null;
};

function toDomain(o: PrismaOrg): Organization {
  return {
    id: o.id,
    name: o.name,
    code: o.slug,
    status: o.status as Organization["status"],
    logoUrl: o.logoUrl ?? undefined,
    defaultVersionId: o.defaultVersionId ?? undefined,
    theme: {
      primary: o.themePrimary,
      accent: o.themePrimary,
      gradientFrom: o.themeGradFrom,
      gradientTo: o.themeGradTo,
    },
  };
}

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

const DEFAULT_SLUG = process.env.NEXT_PUBLIC_DEFAULT_ORG_SLUG ?? "demo";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve the current organization row (request-scoped via `cache()`, so the
 * many callers per render share one lookup). Authenticated requests use the
 * user's org; otherwise the default is found by env id → slug → first org, so a
 * single-tenant deployment "just works" regardless of the seeded org's id.
 * `id` lookups are UUID-guarded to avoid a wasted query + Prisma error when
 * DEFAULT_ORG_ID is a non-UUID placeholder (e.g. "org-jlg").
 */
const resolveOrg = cache(async (): Promise<PrismaOrg | null> => {
  const user = await safe(() => getSessionUser());
  if (user?.organizationId && UUID_RE.test(user.organizationId)) {
    const byUser = await safe(() =>
      prisma.organization.findUnique({ where: { id: user.organizationId } }),
    );
    if (byUser) return byUser as PrismaOrg;
  }

  if (UUID_RE.test(DEFAULT_ORG_ID)) {
    const byId = await safe(() =>
      prisma.organization.findUnique({ where: { id: DEFAULT_ORG_ID } }),
    );
    if (byId) return byId as PrismaOrg;
  }

  const bySlug = await safe(() =>
    prisma.organization.findFirst({ where: { slug: DEFAULT_SLUG } }),
  );
  if (bySlug) return bySlug as PrismaOrg;

  const first = await safe(() =>
    prisma.organization.findFirst({ orderBy: { createdAt: "asc" } }),
  );
  return (first as PrismaOrg) ?? null;
});

export async function getActiveOrganizationId(): Promise<string> {
  const org = await resolveOrg();
  return org?.id ?? DEFAULT_ORG_ID;
}

export async function getActiveOrganization(): Promise<Organization> {
  const org = await resolveOrg();
  return org ? toDomain(org) : FALLBACK_ORG;
}
