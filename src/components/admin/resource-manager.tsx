"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/shared/glass-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EntityForm } from "@/components/admin/entity-form";
import { RESOURCES } from "@/lib/admin/resources";
import { adminSave, adminDelete } from "@/lib/actions/admin";
import type { ColumnDef } from "@/lib/admin/columns";
import type { Option } from "@/lib/admin/field-types";

type Row = Record<string, unknown> & { id: string };

export function ResourceManager({
  resourceKey,
  rows,
  dynamicOptions,
}: {
  resourceKey: string;
  rows: Row[];
  dynamicOptions?: Record<string, Option[]>;
}) {
  const router = useRouter();
  const resource = RESOURCES[resourceKey]!;
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Row | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const defaults = React.useMemo(() => {
    const d: Record<string, unknown> = {};
    for (const f of resource.fields) {
      d[f.name] =
        f.type === "multiselect" || f.type === "tags" || f.type === "optionlist"
          ? []
          : f.type === "switch"
            ? true
            : "";
    }
    return d;
  }, [resource]);

  const initialValues = editing
    ? resource.fromDoc
      ? resource.fromDoc(editing)
      : editing
    : defaults;

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await adminSave(resourceKey, editing?.id ?? null, values);
      if (!res.ok) {
        toast.error(res.error ?? "Save failed.");
        return;
      }
      toast.success(`${resource.singular} saved.`);
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row: Row) => {
    if (!confirm(`Delete this ${resource.singular.toLowerCase()}? This cannot be undone.`)) return;
    const res = await adminDelete(resourceKey, row.id);
    if (!res.ok) {
      toast.error(res.error ?? "Delete failed.");
      return;
    }
    toast.success(`${resource.singular} deleted.`);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{resource.plural}</h1>
          <p className="text-sm text-muted-foreground">{resource.description}</p>
        </div>
        <Button variant="gradient" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="size-4" /> New {resource.singular}
        </Button>
      </div>

      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                {resource.columns.map((c) => (
                  <th key={c.name} className="px-4 py-3 font-medium">{c.label}</th>
                ))}
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr><td colSpan={resource.columns.length + 1} className="px-4 py-8 text-center text-muted-foreground">No {resource.plural.toLowerCase()} yet.</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="hover:bg-accent/30">
                  {resource.columns.map((c) => (
                    <td key={c.name} className="px-4 py-3"><Cell column={c} value={row[c.name]} /></td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(row); setOpen(true); }}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(row)}><Trash2 className="size-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "New"} {resource.singular}</DialogTitle>
            <DialogDescription>{resource.description}</DialogDescription>
          </DialogHeader>
          <EntityForm
            key={editing?.id ?? "new"}
            fields={resource.fields}
            initial={initialValues as Record<string, unknown>}
            dynamicOptions={dynamicOptions}
            submitting={submitting}
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Cell({ column, value }: { column: ColumnDef; value: unknown }) {
  if (value === undefined || value === null || value === "")
    return <span className="text-muted-foreground">—</span>;
  if (column.kind === "badge") return <Badge variant="secondary">{String(value)}</Badge>;
  if (column.kind === "number") return <span className="tabular-nums">{String(value)}</span>;
  return <span className="line-clamp-1 max-w-md">{String(value)}</span>;
}
