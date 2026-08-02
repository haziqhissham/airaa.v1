/**
 * One-off: realign every organisation's stored brand theme to the teal palette
 * (#00B6B5). The auth panel gradient and other white-label surfaces read these
 * columns from the DB, so existing rows seeded with the legacy blue palette must
 * be updated in place — a redeploy alone will not change them.
 *
 * Colours only, fully reversible. `npx tsx scripts/retheme-org-teal.ts`
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });
config();
const prisma = new PrismaClient();

const THEME = {
  themePrimary: "#00b6b5",
  themeGradFrom: "#005352",
  themeGradTo: "#00b6b5",
};

async function main() {
  const before = await prisma.organization.findMany({
    select: { name: true, themePrimary: true, themeGradFrom: true, themeGradTo: true },
  });
  console.log("Before:");
  before.forEach((o) =>
    console.log(`  • ${o.name}: ${o.themePrimary} / ${o.themeGradFrom} → ${o.themeGradTo}`),
  );

  const { count } = await prisma.organization.updateMany({ data: THEME });
  console.log(`\n✓ Updated ${count} organisation(s) to teal (${THEME.themePrimary}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
