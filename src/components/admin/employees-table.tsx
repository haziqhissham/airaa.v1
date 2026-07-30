"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GlassCard } from "@/components/shared/glass-card";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { setEmployeeRole } from "@/lib/actions/admin";
import { UserRole } from "@/domain/enums";

export interface EmployeeRow {
  uid: string;
  name: string;
  email: string;
  department: string;
  role: string;
  completed: boolean;
}

export function EmployeesTable({ rows }: { rows: EmployeeRow[] }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);

  const changeRole = async (uid: string, role: string) => {
    setPending(uid);
    try {
      const res = await setEmployeeRole(uid, role);
      if (!res.ok) {
        toast.error(res.error ?? "Could not update role.");
        return;
      }
      toast.success("Role updated.");
      router.refresh();
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} registered · change roles to grant HR or Admin access.
        </p>
      </div>

      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Assessment</th>
                <th className="px-4 py-3 font-medium">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No employees registered yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.uid} className="hover:bg-accent/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                    </td>
                    <td className="px-4 py-3">{r.department}</td>
                    <td className="px-4 py-3">
                      {r.completed ? (
                        <Badge variant="success">Completed</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <NativeSelect
                        value={r.role}
                        disabled={pending === r.uid}
                        onChange={(e) => changeRole(r.uid, e.target.value)}
                        className="h-9 max-w-40"
                      >
                        {Object.values(UserRole).map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </NativeSelect>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
