"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/supabase/auth-client";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const onLogout = async () => {
    setLoading(true);
    try {
      await signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={onLogout} disabled={loading}>
      <LogOut className="size-4" /> Sign out
    </Button>
  );
}
