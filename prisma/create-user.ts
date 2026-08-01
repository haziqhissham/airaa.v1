/**
 * Create a single sign-in-ready user (default role: EMPLOYEE) in the demo tenant.
 *
 * Creates the Supabase auth user (email pre-confirmed, password set), writes
 * authoritative role/org claims to `app_metadata` (read by RLS), and mirrors the
 * profile into Prisma (`employees`, or `admins` for admin roles). Idempotent:
 * re-running resets the password + metadata for an existing email.
 *
 * Usage:
 *   npx tsx prisma/create-user.ts --email a@b.com [--password ...] \
 *     [--name "Full Name"] [--role EMPLOYEE] [--position "Job Title"]
 *
 * If --password is omitted a strong one is generated and printed.
 */

import { config } from "dotenv";
import { PrismaClient, Role } from "@prisma/client";
import { createClient, type User } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

config({ path: ".env.local" });
config();

const prisma = new PrismaClient();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORG_SLUG = process.env.NEXT_PUBLIC_DEFAULT_ORG_SLUG ?? "demo";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Minimal --flag value parser. */
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** Readable strong password: e.g. Glow-3f9a2c7b. */
function genPassword(): string {
  return `Glow-${randomBytes(6).toString("hex")}`;
}

const ADMIN_ROLES = new Set<Role>([
  Role.SUPER_ADMIN,
  Role.ORG_ADMIN,
  Role.HR_ADMIN,
  Role.TRAINER,
]);

async function findAuthUserByEmail(email: string): Promise<User | null> {
  const target = email.toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === target);
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

async function main() {
  const email = arg("email");
  if (!email) {
    console.error('❌ --email is required. Example: npx tsx prisma/create-user.ts --email a@b.com');
    process.exit(1);
  }
  const password = arg("password") ?? genPassword();
  const roleInput = (arg("role") ?? "EMPLOYEE").toUpperCase();
  if (!(roleInput in Role)) {
    console.error(`❌ Invalid --role "${roleInput}". Valid: ${Object.keys(Role).join(", ")}`);
    process.exit(1);
  }
  const role = Role[roleInput as keyof typeof Role];
  const name = arg("name") ?? email.split("@")[0] ?? email;
  const position = arg("position") ?? (ADMIN_ROLES.has(role) ? "Administrator" : "Staff");

  const org =
    (await prisma.organization.findFirst({ where: { slug: ORG_SLUG } })) ??
    (await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } }));
  if (!org) {
    console.error(`❌ No organization found (slug "${ORG_SLUG}"). Run \`npm run db:seed\` first.`);
    process.exit(1);
  }

  const app_metadata = { role, organization_id: org.id, profile_complete: true };
  const user_metadata = { name };

  const existing = await findAuthUserByEmail(email);
  let userId: string;
  let created: boolean;
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      app_metadata,
      user_metadata,
    });
    if (error) throw error;
    userId = existing.id;
    created = false;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata,
      user_metadata,
    });
    if (error || !data.user) throw error ?? new Error("createUser returned no user");
    userId = data.user.id;
    created = true;
  }

  if (ADMIN_ROLES.has(role)) {
    await prisma.admin.upsert({
      where: { userId },
      create: { userId, organizationId: org.id, name, email, role },
      update: { organizationId: org.id, name, email, role },
    });
  } else {
    const department =
      (await prisma.department.findFirst({ where: { organizationId: org.id } })) ??
      (await prisma.department.create({
        data: { organizationId: org.id, name: "General", division: "Corporate" },
      }));
    await prisma.employee.upsert({
      where: { userId },
      create: {
        userId,
        organizationId: org.id,
        departmentId: department.id,
        name,
        email,
        jobPosition: position,
        role,
      },
      update: {
        organizationId: org.id,
        departmentId: department.id,
        name,
        email,
        jobPosition: position,
        role,
      },
    });
  }

  const homeByRole: Record<string, string> = {
    SUPER_ADMIN: "/super",
    ORG_ADMIN: "/admin",
    HR_ADMIN: "/hr",
  };
  console.log(`\n✅ User ${created ? "created" : "updated"} in ${org.name} (${org.slug}):\n`);
  console.log(`   Name     : ${name}`);
  console.log(`   Email    : ${email}`);
  console.log(`   Password : ${password}`);
  console.log(`   Role     : ${role}`);
  console.log(`   Lands on : ${homeByRole[role] ?? "/dashboard"}\n`);
}

main()
  .catch((e) => {
    console.error("❌ create-user failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
