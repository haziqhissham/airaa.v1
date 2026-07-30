import { AuthShell } from "@/components/auth/auth-shell";
import { getActiveOrganization } from "@/lib/auth/tenant";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const org = await getActiveOrganization();
  return (
    <AuthShell orgName={org.name} logoUrl={org.logoUrl} theme={org.theme}>
      {children}
    </AuthShell>
  );
}
