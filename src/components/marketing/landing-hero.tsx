"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  Clock,
  Compass,
  LineChart,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/shared/glass-card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/providers/theme-toggle";
import { siteConfig } from "@/config/site";
import type { OrganizationTheme } from "@/domain/types";

interface LandingHeroProps {
  orgName: string;
  logoUrl?: string;
  theme?: OrganizationTheme;
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }),
};

const steps = [
  {
    icon: Compass,
    title: "Assess",
    text: "Answer ten short sections spanning leadership, technology, people, data, security, ethics and more.",
  },
  {
    icon: LineChart,
    title: "Discover",
    text: "Get an instant readiness score, your readiness level and a clear breakdown across every category.",
  },
  {
    icon: Sparkles,
    title: "Grow",
    text: "Receive a personalised training path matched to your role and where you can improve most.",
  },
];

export function LandingHero({ orgName, logoUrl, theme }: LandingHeroProps) {
  const brandStyle = theme
    ? ({
        background: `linear-gradient(135deg, ${theme.gradientFrom} 0%, ${theme.primary} 45%, ${theme.gradientTo} 100%)`,
      } as React.CSSProperties)
    : undefined;

  return (
    <main className="brand-bg relative min-h-dvh overflow-hidden">
      {/* Decorative orbs */}
      <div className="pointer-events-none absolute -left-24 top-10 size-72 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-40 size-80 rounded-full bg-brand-700/20 blur-3xl" />

      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={`${orgName} logo`}
              className="size-9 rounded-xl object-contain"
            />
          ) : (
            <div
              className="grid size-9 place-items-center rounded-xl text-white shadow-lg"
              style={brandStyle ?? { background: "#2563eb" }}
            >
              <BrainCircuit className="size-5" />
            </div>
          )}
          <div className="leading-tight">
            <p className="text-sm font-semibold">AI Readiness</p>
            <p className="text-xs text-muted-foreground">{orgName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-16 pt-8 md:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <motion.div initial="hidden" animate="show" variants={fadeUp} custom={0}>
              <Badge variant="info" className="mb-5 gap-1.5">
                <Sparkles className="size-3.5" /> Enterprise AI Readiness
              </Badge>
            </motion.div>

            <motion.h1
              initial="hidden"
              animate="show"
              variants={fadeUp}
              custom={1}
              className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
            >
              Discover your{" "}
              <span className="text-gradient">AI Readiness</span>
            </motion.h1>

            <motion.p
              initial="hidden"
              animate="show"
              variants={fadeUp}
              custom={2}
              className="mt-5 max-w-xl text-lg text-muted-foreground"
            >
              A guided assessment for {orgName} employees. Understand
              where you stand with AI today and get a personalised training
              path to grow — no right or wrong answers, just insight.
            </motion.p>

            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              custom={3}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <Button asChild size="lg" variant="gradient">
                <Link href="/login">
                  Start Assessment <ArrowRight className="size-4" />
                </Link>
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="size-4" />
                About {siteConfig.durationMinutes} minutes
              </div>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              custom={4}
              className="mt-6 flex flex-wrap gap-4 text-xs text-muted-foreground"
            >
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-brand-500" /> Confidential
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="size-4 text-brand-500" /> Used only for training
                guidance
              </span>
            </motion.div>
          </div>

          {/* Steps card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          >
            <GlassCard className="p-7">
              <h2 className="text-lg font-semibold">How it works</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Three simple steps to your personalised path.
              </p>
              <div className="mt-6 space-y-4">
                {steps.map((s, i) => (
                  <div key={s.title} className="flex gap-4">
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-600">
                      <s.icon className="size-5" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {i + 1}. {s.title}
                      </p>
                      <p className="text-sm text-muted-foreground">{s.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Privacy notice */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          custom={6}
        >
          <GlassCard className="mt-12 flex flex-col gap-3 p-6 md:flex-row md:items-start">
            <ShieldCheck className="size-6 shrink-0 text-brand-600" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Privacy notice</p>
              <p className="mt-1">
                Your responses are collected on behalf of{" "}
                {orgName} solely to assess AI readiness and recommend
                suitable training. Individual results are visible only to you and
                authorised HR personnel. Data is stored securely and is never
                sold or shared for marketing. By starting the assessment you
                consent to this use.
              </p>
            </div>
          </GlassCard>
        </motion.div>
      </section>

      <footer className="relative z-10 border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {orgName} · {siteConfig.name}
      </footer>
    </main>
  );
}
