/**
 * Demo users seed — provisions three sign-in-ready accounts for the demo tenant,
 * one per access level:
 *
 *   • Admin    → ORG_ADMIN  (lands on /admin)
 *   • HR       → HR_ADMIN   (lands on /hr)
 *   • Employee → EMPLOYEE   (lands on /dashboard)
 *
 * Each account is created in Supabase auth (email pre-confirmed, password set),
 * given authoritative role/org claims in `app_metadata` (read by RLS), and
 * mirrored into the Prisma profile table (`admins` for admin roles, `employees`
 * for the employee). Credentials are printed at the end — these are sample
 * accounts for TESTING ONLY. Do not enable them in production.
 *
 * Usage: set DATABASE_URL + DIRECT_URL + NEXT_PUBLIC_SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY, then `npm run db:seed:users`.
 * Idempotent: re-running resets the password + metadata for existing accounts.
 */

import { config } from "dotenv";
import { PrismaClient, Role } from "@prisma/client";
import { createClient, type User } from "@supabase/supabase-js";

// Load env for standalone `tsx` runs (prefers .env.local, then .env).
config({ path: ".env.local" });
config();

const prisma = new PrismaClient();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORG_SLUG = process.env.NEXT_PUBLIC_DEFAULT_ORG_SLUG ?? "demo";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.",
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface DemoUser {
  label: string;
  role: Role;
  email: string;
  password: string;
  name: string;
  jobPosition: string;
  home: string;
}

// Sample credentials — TESTING ONLY.
const DEMO_USERS: DemoUser[] = [
  {
    label: "Admin",
    role: Role.ORG_ADMIN,
    email: "admin@demo.glow.test",
    password: "Admin@Demo2026",
    name: "Demo Admin",
    jobPosition: "Organization Administrator",
    home: "/admin",
  },
  {
    label: "HR",
    role: Role.HR_ADMIN,
    email: "hr@demo.glow.test",
    password: "Hr@Demo2026",
    name: "Demo HR Manager",
    jobPosition: "HR Manager",
    home: "/hr",
  },
  {
    label: "User / Employee",
    role: Role.EMPLOYEE,
    email: "employee@demo.glow.test",
    password: "Employee@Demo2026",
    name: "Demo Employee",
    jobPosition: "Staff",
    home: "/dashboard",
  },
];

/** Paginated lookup — Supabase admin has no getUserByEmail. */
async function findAuthUserByEmail(email: string): Promise<User | null> {
  const target = email.toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === target);
    if (hit) return hit;
    if (data.users.length < 200) break; // last page
  }
  return null;
}

async function upsertAuthUser(
  u: DemoUser,
  organizationId: string,
): Promise<string> {
  const app_metadata = {
    role: u.role,
    organization_id: organizationId,
    profile_complete: true,
  };
  const user_metadata = { name: u.name };

  const existing = await findAuthUserByEmail(u.email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: u.password,
      email_confirm: true,
      app_metadata,
      user_metadata,
    });
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    app_metadata,
    user_metadata,
  });
  if (error || !data.user) throw error ?? new Error("createUser returned no user");
  return data.user.id;
}

async function main() {
  console.log("🌱 Seeding demo users (Admin / HR / Employee)…\n");

  // Resolve the demo org (by slug, then first org) — must exist. Run the main
  // seed first if this fails.
  const org =
    (await prisma.organization.findFirst({ where: { slug: ORG_SLUG } })) ??
    (await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } }));
  if (!org) {
    console.error(
      `❌ No organization found (looked for slug "${ORG_SLUG}"). Run \`npm run db:seed\` first.`,
    );
    process.exit(1);
  }
  console.log(`  ✓ organization: ${org.name} (${org.slug})\n`);

  // Ensure a department for the employee profile.
  const department =
    (await prisma.department.findFirst({ where: { organizationId: org.id } })) ??
    (await prisma.department.create({
      data: { organizationId: org.id, name: "General", division: "Corporate" },
    }));

  for (const u of DEMO_USERS) {
    const userId = await upsertAuthUser(u, org.id);

    if (u.role === Role.EMPLOYEE) {
      await prisma.employee.upsert({
        where: { userId },
        create: {
          userId,
          organizationId: org.id,
          departmentId: department.id,
          name: u.name,
          email: u.email,
          jobPosition: u.jobPosition,
          role: u.role,
        },
        update: {
          organizationId: org.id,
          departmentId: department.id,
          name: u.name,
          email: u.email,
          jobPosition: u.jobPosition,
          role: u.role,
        },
      });
    } else {
      await prisma.admin.upsert({
        where: { userId },
        create: {
          userId,
          organizationId: org.id,
          name: u.name,
          email: u.email,
          role: u.role,
        },
        update: {
          organizationId: org.id,
          name: u.name,
          email: u.email,
          role: u.role,
        },
      });
    }

    console.log(`  ✓ ${u.label.padEnd(15)} ${u.role.padEnd(10)} ${u.email}`);
  }

  console.log("\n✅ Demo users ready. Sample credentials (TESTING ONLY):\n");
  console.log(
    "  ┌────────────────┬────────────┬──────────────────────────┬─────────────────────┬────────────┐",
  );
  console.log(
    "  │ User           │ Role       │ Email                    │ Password            │ Lands on   │",
  );
  console.log(
    "  ├────────────────┼────────────┼──────────────────────────┼─────────────────────┼────────────┤",
  );
  for (const u of DEMO_USERS) {
    console.log(
      `  │ ${u.label.padEnd(14)} │ ${u.role.padEnd(10)} │ ${u.email.padEnd(24)} │ ${u.password.padEnd(19)} │ ${u.home.padEnd(10)} │`,
    );
  }
  console.log(
    "  └────────────────┴────────────┴──────────────────────────┴─────────────────────┴────────────┘",
  );
  console.log("\n  ⚠  Demo accounts only — do not enable in production.\n");
}

main()
  .catch((e) => {
    console.error("❌ Demo user seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
