import "server-only";

/**
 * Generic Prisma CRUD dispatch for the admin CMS. Maps a resource `model` key to
 * the right Prisma delegate. `organizationId` is injected on create; callers
 * (server actions) enforce role + org via requireRole.
 */

import { prisma } from "@/lib/db/prisma";

type Row = Record<string, unknown> & { id: string };
type Data = Record<string, unknown>;

interface Delegate {
  list: (orgId: string) => Promise<Row[]>;
  create: (orgId: string, data: Data) => Promise<{ id: string }>;
  update: (id: string, data: Data) => Promise<{ id: string }>;
  remove: (id: string) => Promise<void>;
}

/** Dynamic option sources for select/multiselect fields. */
export async function loadDynamicOptions(
  orgId: string,
  sources: string[] = [],
): Promise<Record<string, { value: string; label: string }[]>> {
  const out: Record<string, { value: string; label: string }[]> = {};
  if (sources.includes("categories")) {
    const cats = await prisma.assessmentCategory.findMany({
      where: { organizationId: orgId },
      orderBy: { order: "asc" },
    });
    out.categories = cats.map((c) => ({ value: c.id, label: c.name }));
  }
  if (sources.includes("modules")) {
    const mods = await prisma.trainingModule.findMany({
      where: { organizationId: orgId },
      orderBy: { title: "asc" },
    });
    out.modules = mods.map((m) => ({ value: m.id, label: m.title }));
  }
  return out;
}

const DELEGATES: Record<string, Delegate> = {
  assessmentCategory: {
    list: (orgId) => prisma.assessmentCategory.findMany({ where: { organizationId: orgId }, orderBy: { order: "asc" } }) as Promise<Row[]>,
    create: (orgId, data) => prisma.assessmentCategory.create({ data: { ...data, organizationId: orgId } as never }),
    update: (id, data) => prisma.assessmentCategory.update({ where: { id }, data: data as never }),
    remove: async (id) => { await prisma.assessmentCategory.delete({ where: { id } }); },
  },
  assessmentQuestion: {
    list: (orgId) => prisma.assessmentQuestion.findMany({ where: { organizationId: orgId }, orderBy: [{ categoryId: "asc" }, { order: "asc" }] }) as Promise<Row[]>,
    create: (orgId, data) => prisma.assessmentQuestion.create({ data: { ...data, organizationId: orgId } as never }),
    update: (id, data) => prisma.assessmentQuestion.update({ where: { id }, data: data as never }),
    remove: async (id) => { await prisma.assessmentQuestion.delete({ where: { id } }); },
  },
  readinessLevel: {
    list: (orgId) => prisma.readinessLevel.findMany({ where: { organizationId: orgId }, orderBy: { order: "asc" } }) as Promise<Row[]>,
    create: (orgId, data) => prisma.readinessLevel.create({ data: { ...data, organizationId: orgId } as never }),
    update: (id, data) => prisma.readinessLevel.update({ where: { id }, data: data as never }),
    remove: async (id) => { await prisma.readinessLevel.delete({ where: { id } }); },
  },
  trainingModule: {
    list: (orgId) => prisma.trainingModule.findMany({ where: { organizationId: orgId }, orderBy: { title: "asc" } }) as Promise<Row[]>,
    create: (orgId, data) => prisma.trainingModule.create({ data: { ...data, organizationId: orgId } as never }),
    update: (id, data) => prisma.trainingModule.update({ where: { id }, data: data as never }),
    remove: async (id) => { await prisma.trainingModule.delete({ where: { id } }); },
  },
  recommendation: {
    list: (orgId) => prisma.recommendation.findMany({ where: { organizationId: orgId }, orderBy: { priority: "asc" } }) as Promise<Row[]>,
    create: (orgId, data) => prisma.recommendation.create({ data: { ...data, organizationId: orgId } as never }),
    update: (id, data) => prisma.recommendation.update({ where: { id }, data: data as never }),
    remove: async (id) => { await prisma.recommendation.delete({ where: { id } }); },
  },
};

export function delegate(model: string): Delegate | null {
  return DELEGATES[model] ?? null;
}
