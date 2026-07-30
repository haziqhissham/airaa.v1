import "server-only";

/**
 * Tenant resolution. Authenticated requests use the org on the user's session
 * (app_metadata.organization_id); public requests fall back to a neutral,
 * env-driven organization so marketing/auth pages render without a DB. The
 * Prisma organization row is mapped to the framework-agnostic domain shape the
 * reused UI expects.
 */

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

export async function getActiveOrganizationId(): Promise<string> {
  const user = await safe(() => getSessionUser());
  return user?.organizationId || DEFAULT_ORG_ID;
}

export async function getActiveOrganization(): Promise<Organization> {
  const orgId = await getActiveOrganizationId();
  const org = await safe(() =>
    prisma.organization.findUnique({ where: { id: orgId } }),
  );
  return org ? toDomain(org as PrismaOrg) : FALLBACK_ORG;
}
