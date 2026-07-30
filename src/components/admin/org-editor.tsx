"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GlassCard } from "@/components/shared/glass-card";
import { EntityForm } from "@/components/admin/entity-form";
import { saveOrganization } from "@/lib/actions/admin";
import type { FieldDef } from "@/lib/admin/field-types";
import type { Organization } from "@/domain/types";

const fields: FieldDef[] = [
  { name: "name", label: "Organization name", type: "text", colSpan: 2 },
  { name: "slug", label: "Slug", type: "text" },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: ["ACTIVE", "TRIAL", "SUSPENDED"].map((v) => ({ value: v, label: v })),
  },
  { name: "logoUrl", label: "Logo URL", type: "text", colSpan: 2 },
  { name: "themePrimary", label: "Primary colour", type: "color" },
  { name: "themeGradFrom", label: "Gradient from", type: "color" },
  { name: "themeGradTo", label: "Gradient to", type: "color" },
];

export function OrgEditor({ org }: { org: Organization }) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  const initial = {
    name: org.name,
    slug: org.code,
    status: org.status,
    logoUrl: org.logoUrl ?? "",
    themePrimary: org.theme.primary,
    themeGradFrom: org.theme.gradientFrom,
    themeGradTo: org.theme.gradientTo,
  };

  const onSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await saveOrganization(values);
      if (!res.ok) {
        toast.error(res.error ?? "Save failed.");
        return;
      }
      toast.success("Organization updated.");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organization</h1>
        <p className="text-sm text-muted-foreground">
          Profile and branding theme (white-label).
        </p>
      </div>
      <GlassCard className="p-6">
        <EntityForm
          fields={fields}
          initial={initial}
          submitting={submitting}
          onSubmit={onSubmit}
          submitLabel="Save organization"
        />
      </GlassCard>
    </div>
  );
}
