import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardList, Clock, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { AppChrome } from "@/components/layout/app-chrome";
import { GlassCard } from "@/components/shared/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScoreRing } from "@/components/result/score-ring";
import { ResetAssessmentButton } from "@/components/assessment/reset-assessment-button";
import { requireProfile } from "@/lib/auth/guards";
import { getActiveOrganization, getActiveOrganizationId } from "@/lib/auth/tenant";
import { prisma } from "@/lib/db/prisma";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Dashboard" };

interface DashState {
  status: "none" | "in_progress" | "completed";
  progress: number;
  overallScore?: number;
  tierLabel?: string;
  tierColor?: string;
  categoryScores?: { name: string; score: number }[];
}

async function loadState(userId: string, orgId: string): Promise<DashState> {
  try {
    const employee = await prisma.employee.findUnique({ where: { userId } });
    if (!employee) return { status: "none", progress: 0 };

    const session = await prisma.assessmentSession.findFirst({
      where: { employeeId: employee.id },
      orderBy: { startedAt: "desc" },
      include: { score: { include: { readinessLevel: true } } },
    });
    if (!session) return { status: "none", progress: 0 };

    if (session.status === "SUBMITTED" && session.score) {
      const categories = await prisma.assessmentCategory.findMany({
        where: { organizationId: orgId },
        orderBy: { order: "asc" },
      });
      const scores = (session.score.categoryScores ?? {}) as Record<string, number>;
      return {
        status: "completed",
        progress: 100,
        overallScore: session.score.overallScore,
        tierLabel: session.score.readinessLevel?.label,
        tierColor: session.score.readinessLevel?.color,
        categoryScores: categories.map((c) => ({
          name: c.name,
          score: Math.round(scores[c.id] ?? 0),
        })),
      };
    }
    return { status: "in_progress", progress: session.progress };
  } catch {
    return { status: "none", progress: 0 };
  }
}

export default async function DashboardPage() {
  const user = await requireProfile();
  const org = await getActiveOrganization();
  const orgId = await getActiveOrganizationId();
  const firstName = (user.displayName ?? "there").split(" ")[0];
  const state = await loadState(user.uid, orgId);

  return (
    <AppChrome orgName={org.name} displayName={user.displayName ?? user.email} role={user.role}>
      <div className="animate-fade-in space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {firstName} 👋</h1>
          <p className="mt-1.5 text-muted-foreground">
            {state.status === "completed"
              ? "Here's your AI readiness result."
              : "Take the AI Readiness Assessment to discover your readiness level and training path."}
          </p>
        </div>

        {state.status === "completed" ? (
          <CompletedCard state={state} />
        ) : (
          <StartCard status={state.status} progress={state.progress} />
        )}

        {siteConfig.demoMode && (state.status === "completed" || state.status === "in_progress") && (
          <div className="flex justify-end">
            <ResetAssessmentButton />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: ClipboardList, title: "Assess", text: "45 questions across AI knowledge, readiness and workplace scenarios." },
            { icon: Sparkles, title: "Discover", text: "Get your readiness level, AI persona and a category-by-category breakdown." },
            { icon: ArrowRight, title: "Grow", text: "Follow a training path matched to your role and gaps." },
          ].map((c) => (
            <GlassCard key={c.title} className="p-5">
              <c.icon className="size-5 text-brand-600" />
              <p className="mt-3 font-medium">{c.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{c.text}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </AppChrome>
  );
}

function StartCard({ status, progress }: { status: string; progress: number }) {
  const resuming = status === "in_progress";
  return (
    <GlassCard className="flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
      <div className="flex items-start gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-white shadow-lg">
          <ClipboardList className="size-6" />
        </div>
        <div className="w-full">
          <h2 className="text-xl font-semibold">AI Readiness Assessment</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Three categories · 45 questions · about 10–15 minutes. Your answers are confidential.
          </p>
          {resuming ? (
            <div className="mt-3 max-w-xs">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>In progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="mt-1.5 h-1.5" />
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4" /> About {siteConfig.durationMinutes} minutes · Auto-saved
            </div>
          )}
        </div>
      </div>
      <Button asChild size="lg" variant="gradient" className="shrink-0">
        <Link href="/assessment">
          {resuming ? (<><RotateCcw className="size-4" /> Resume</>) : (<>Start Assessment <ArrowRight className="size-4" /></>)}
        </Link>
      </Button>
    </GlassCard>
  );
}

function CompletedCard({ state }: { state: DashState }) {
  return (
    <GlassCard className="p-8">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <ScoreRing score={state.overallScore ?? 0} accent={state.tierColor ?? "#00b6b5"} />
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <Trophy className="size-4 text-brand-600" />
            <Badge variant="info" style={{ backgroundColor: `${state.tierColor ?? "#00b6b5"}22`, color: state.tierColor }}>
              {state.tierLabel ?? "Assessed"}
            </Badge>
          </div>
          <h2 className="mt-2 text-xl font-semibold">Your AI Readiness Level</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Full report with recommendations and learning path arrives in the next module.
          </p>
        </div>
      </div>

      {state.categoryScores && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {state.categoryScores.map((c) => (
            <div key={c.name} className="rounded-xl border bg-background/50 p-3">
              <p className="truncate text-xs text-muted-foreground">{c.name}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{c.score}</p>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
