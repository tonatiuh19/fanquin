import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { PageMeta } from "@/components/fanquin/page-meta";
import {
  ArrowRight,
  BarChart2,
  CheckCircle2,
  CircleDot,
  Clock,
  Crown,
  Flame,
  Globe,
  Info,
  Layers,
  Lock,
  Settings2,
  Shield,
  Shuffle,
  Sparkles,
  Swords,
  Target,
  TrendingUp,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Mode data (mirrors API scoringDefaults in api/index.ts) ──────
const MODES = [
  {
    key: "casual",
    label: "Casual",
    color: "text-amber-400",
    rowBg: "bg-amber-400/5",
    icon: Sparkles,
    exact: 4,
    winner: 2,
    diff: 1,
    teamWin: 3,
    goal: 1,
    cs: 2,
    upset: 3,
    streakPts: 1,
    streakAt: 3,
    elo: null as number | null,
    lives: 1,
    weekly: false,
  },
  {
    key: "friends",
    label: "Friends",
    color: "text-brand",
    rowBg: "bg-brand/5",
    icon: Flame,
    exact: 5,
    winner: 3,
    diff: 2,
    teamWin: 4,
    goal: 1,
    cs: 3,
    upset: 5,
    streakPts: 2,
    streakAt: 3,
    elo: null as number | null,
    lives: 1,
    weekly: false,
  },
  {
    key: "league",
    label: "League",
    color: "text-violet-400",
    rowBg: "bg-violet-400/5",
    icon: Trophy,
    exact: 6,
    winner: 3,
    diff: 2,
    teamWin: 5,
    goal: 1,
    cs: 3,
    upset: 6,
    streakPts: 2,
    streakAt: 3,
    elo: 32 as number | null,
    lives: 1,
    weekly: true,
  },
  {
    key: "competitive",
    label: "Competitive",
    color: "text-rose-400",
    rowBg: "bg-rose-400/5",
    icon: Crown,
    exact: 7,
    winner: 4,
    diff: 2,
    teamWin: 5,
    goal: 1,
    cs: 3,
    upset: 7,
    streakPts: 3,
    streakAt: 3,
    elo: 24 as number | null,
    lives: 3,
    weekly: true,
  },
  {
    key: "global",
    label: "Global",
    color: "text-sky-400",
    rowBg: "bg-sky-400/5",
    icon: Globe,
    exact: 5,
    winner: 3,
    diff: 2,
    teamWin: 4,
    goal: 1,
    cs: 3,
    upset: 8,
    streakPts: 3,
    streakAt: 4,
    elo: 16 as number | null,
    lives: 1,
    weekly: true,
  },
] as const;

// ── Bonus criteria data ──────────────────────────────────────────
const BONUS_CRITERIA = [
  { key: "btts", pts: 2, icon: Swords },
  { key: "ft_winner", pts: 2, icon: Target },
  { key: "ht_winner", pts: 2, icon: CircleDot },
  { key: "total_goals_over", pts: 2, icon: BarChart2 },
  { key: "clean_sheet", pts: 1, icon: Shield },
] as const;

// ── Draft types ──────────────────────────────────────────────────
const DRAFT_TYPES = [
  { key: "snake", icon: Zap },
  { key: "random", icon: Shuffle },
  { key: "balanced_tier", icon: Layers },
] as const;

// ── Mode table column keys (in display order) ────────────────────
const TABLE_COLS = [
  "mode",
  "exact",
  "winner",
  "diff",
  "teamWin",
  "goal",
  "cs",
  "upset",
  "streak",
  "elo",
  "lives",
  "weekly",
] as const;

export default function ScoringPage() {
  const { t } = useTranslation();

  const adminControls = t("scoring.admin.controls", {
    returnObjects: true,
  }) as Array<{ label: string; desc: string }>;

  const timingTimeline = t("scoring.timing.timeline", {
    returnObjects: true,
  }) as Array<{ label: string; desc: string }>;

  const timingRules = t("scoring.timing.rules", {
    returnObjects: true,
  }) as Array<{ label: string; desc: string }>;

  return (
    <div className="container py-6 md:py-10">
      <PageMeta
        title={t("scoring.meta.title")}
        description={t("scoring.meta.description")}
        canonicalPath="/scoring"
      />

      {/* ── Hero ───────────────────────────────────────────────── */}
      <div className="mb-12 max-w-2xl">
        <span className="section-label mb-4 inline-block">
          {t("scoring.hero.badge")}
        </span>
        <h1 className="font-display text-4xl font-bold text-white md:text-5xl">
          {t("scoring.hero.title")}
        </h1>
        <p className="mt-4 text-base leading-7 text-foreground/[0.7]">
          {t("scoring.hero.description")}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="sm" className="rounded-full">
            <Link to="/groups/new">
              {t("scoring.hero.ctaCreate")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="rounded-full text-foreground/60"
          >
            <Link to="/">{t("scoring.hero.ctaHome")}</Link>
          </Button>
        </div>
      </div>

      {/* ── Section 1: Base prediction scoring ─────────────────── */}
      <section className="mb-14">
        <span className="section-label mb-3 inline-block">
          {t("scoring.base.badge")}
        </span>
        <h2 className="mb-2 font-display text-2xl font-semibold text-white">
          {t("scoring.base.title")}
        </h2>
        <p className="mb-6 max-w-xl text-sm leading-6 text-foreground/[0.65]">
          {t("scoring.base.description")}
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Exact score */}
          <div className="glass-panel rounded-[1.6rem] p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
                <Target className="h-5 w-5 text-emerald-400" />
              </div>
              <span className="font-display text-3xl font-bold text-emerald-400">
                +5
              </span>
            </div>
            <p className="font-semibold text-white">
              {t("scoring.base.exact.label")}
            </p>
            <p className="mt-1 text-sm leading-5 text-foreground/55">
              {t("scoring.base.exact.desc")}
            </p>
          </div>

          {/* Correct winner */}
          <div className="glass-panel rounded-[1.6rem] p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand/20 bg-brand/10">
                <CheckCircle2 className="h-5 w-5 text-brand" />
              </div>
              <span className="font-display text-3xl font-bold text-brand">
                +3
              </span>
            </div>
            <p className="font-semibold text-white">
              {t("scoring.base.winner.label")}
            </p>
            <p className="mt-1 text-sm leading-5 text-foreground/55">
              {t("scoring.base.winner.desc")}
            </p>
          </div>

          {/* Goal difference */}
          <div className="glass-panel rounded-[1.6rem] p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10">
                <TrendingUp className="h-5 w-5 text-violet-400" />
              </div>
              <span className="font-display text-3xl font-bold text-violet-400">
                +2
              </span>
            </div>
            <p className="font-semibold text-white">
              {t("scoring.base.diff.label")}
            </p>
            <p className="mt-1 text-sm leading-5 text-foreground/55">
              {t("scoring.base.diff.desc")}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-foreground/40" />
          <div className="space-y-1">
            <p className="text-sm text-foreground/70">
              {t("scoring.base.stackNote")}
            </p>
            <p className="text-xs text-foreground/40">
              {t("scoring.base.lockNote")}
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 2: Bonus criteria ───────────────────────────── */}
      <section className="mb-14">
        <span className="section-label mb-3 inline-block">
          {t("scoring.bonus.badge")}
        </span>
        <h2 className="mb-2 font-display text-2xl font-semibold text-white">
          {t("scoring.bonus.title")}
        </h2>
        <p className="mb-6 max-w-xl text-sm leading-6 text-foreground/[0.65]">
          {t("scoring.bonus.description")}
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BONUS_CRITERIA.map(({ key, pts, icon: Icon }) => (
            <div
              key={key}
              className="soft-card flex items-start gap-4 rounded-[1.5rem] p-4"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <Icon className="h-4 w-4 text-foreground/60" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">
                    {t(`scoring.bonus.criteria.${key}.label`)}
                  </p>
                  <span className="shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-xs font-semibold text-brand">
                    +{pts} pts
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-foreground/55">
                  {t(`scoring.bonus.criteria.${key}.desc`)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-foreground/40">
          {t("scoring.bonus.maxNote")}
        </p>
      </section>

      {/* ── Section 3: Team ownership ───────────────────────────── */}
      <section className="mb-14">
        <span className="section-label mb-3 inline-block">
          {t("scoring.ownership.badge")}
        </span>
        <h2 className="mb-2 font-display text-2xl font-semibold text-white">
          {t("scoring.ownership.title")}
        </h2>
        <p className="mb-6 max-w-xl text-sm leading-6 text-foreground/[0.65]">
          {t("scoring.ownership.description")}
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Team win */}
          <div className="soft-card rounded-[1.6rem] p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
              <Trophy className="h-5 w-5 text-amber-400" />
            </div>
            <span className="font-display text-3xl font-bold text-amber-400">
              +4
            </span>
            <p className="mt-2 font-semibold text-white">
              {t("scoring.ownership.win.label")}
            </p>
            <p className="mt-1 text-xs leading-5 text-foreground/55">
              {t("scoring.ownership.win.desc")}
            </p>
          </div>

          {/* Every goal */}
          <div className="soft-card rounded-[1.6rem] p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10">
              <Flame className="h-5 w-5 text-rose-400" />
            </div>
            <span className="font-display text-3xl font-bold text-rose-400">
              +1
            </span>
            <p className="mt-2 font-semibold text-white">
              {t("scoring.ownership.goal.label")}
            </p>
            <p className="mt-1 text-xs leading-5 text-foreground/55">
              {t("scoring.ownership.goal.desc")}
            </p>
          </div>

          {/* Clean sheet */}
          <div className="soft-card rounded-[1.6rem] p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10">
              <Shield className="h-5 w-5 text-sky-400" />
            </div>
            <span className="font-display text-3xl font-bold text-sky-400">
              +3
            </span>
            <p className="mt-2 font-semibold text-white">
              {t("scoring.ownership.sheet.label")}
            </p>
            <p className="mt-1 text-xs leading-5 text-foreground/55">
              {t("scoring.ownership.sheet.desc")}
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs text-foreground/40">
          {t("scoring.ownership.draftNote")}
        </p>
      </section>

      {/* ── Section 4: Streak & Upset ───────────────────────────── */}
      <section className="mb-14">
        <span className="section-label mb-3 inline-block">
          {t("scoring.multipliers.badge")}
        </span>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Streak bonus */}
          <div className="glass-panel rounded-[1.6rem] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand/20 bg-brand/10">
                <TrendingUp className="h-5 w-5 text-brand" />
              </div>
              <h3 className="font-display text-lg font-semibold text-white">
                {t("scoring.multipliers.streak.title")}
              </h3>
            </div>
            <p className="text-sm leading-6 text-foreground/65">
              {t("scoring.multipliers.streak.description")}
            </p>
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-2.5">
                <span className="text-sm text-foreground/60">
                  {t("scoring.multipliers.streak.thresholdLabel")}
                </span>
                <span className="text-sm font-semibold text-white">
                  {t("scoring.multipliers.streak.threshold")}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-2.5">
                <span className="text-sm text-foreground/60">
                  {t("scoring.multipliers.streak.rewardLabel")}
                </span>
                <span className="text-sm font-semibold text-brand">
                  {t("scoring.multipliers.streak.reward")}
                </span>
              </div>
            </div>
            <p className="mt-4 text-xs text-foreground/40">
              {t("scoring.multipliers.streak.note")}
            </p>
          </div>

          {/* Upset bonus */}
          <div className="glass-panel rounded-[1.6rem] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
                <Zap className="h-5 w-5 text-amber-400" />
              </div>
              <h3 className="font-display text-lg font-semibold text-white">
                {t("scoring.multipliers.upset.title")}
              </h3>
            </div>
            <p className="text-sm leading-6 text-foreground/65">
              {t("scoring.multipliers.upset.description")}
            </p>
            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="font-mono text-xs leading-6 text-foreground/50">
                {t("scoring.multipliers.upset.formula")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Mode comparison table ───────────────────── */}
      <section className="mb-14">
        <span className="section-label mb-3 inline-block">
          {t("scoring.modes.badge")}
        </span>
        <h2 className="mb-2 font-display text-2xl font-semibold text-white">
          {t("scoring.modes.title")}
        </h2>
        <p className="mb-6 max-w-xl text-sm leading-6 text-foreground/[0.65]">
          {t("scoring.modes.description")}
        </p>

        <div className="overflow-x-auto rounded-[1.5rem] border border-white/10">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.04]">
                {TABLE_COLS.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground/40"
                  >
                    {t(`scoring.modes.cols.${col}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODES.map((m) => {
                const Icon = m.icon;
                return (
                  <tr
                    key={m.key}
                    className="border-b border-white/5 transition-colors hover:bg-white/[0.025]"
                  >
                    {/* Mode name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-4 w-4", m.color)} />
                        <span className={cn("font-semibold", m.color)}>
                          {m.label}
                        </span>
                      </div>
                    </td>
                    {/* Exact */}
                    <td className="px-4 py-3.5">
                      <span className="font-mono font-semibold text-white">
                        +{m.exact}
                      </span>
                    </td>
                    {/* Winner */}
                    <td className="px-4 py-3.5 font-mono text-foreground/75">
                      +{m.winner}
                    </td>
                    {/* Goal diff */}
                    <td className="px-4 py-3.5 font-mono text-foreground/75">
                      +{m.diff}
                    </td>
                    {/* Team win */}
                    <td className="px-4 py-3.5 font-mono text-foreground/75">
                      +{m.teamWin}
                    </td>
                    {/* Goal */}
                    <td className="px-4 py-3.5 font-mono text-foreground/75">
                      +{m.goal}
                    </td>
                    {/* Clean sheet */}
                    <td className="px-4 py-3.5 font-mono text-foreground/75">
                      +{m.cs}
                    </td>
                    {/* Upset base */}
                    <td className="px-4 py-3.5 font-mono text-foreground/75">
                      +{m.upset}
                    </td>
                    {/* Streak */}
                    <td className="px-4 py-3.5 text-foreground/65">
                      +{m.streakPts} @ {m.streakAt}+
                    </td>
                    {/* ELO */}
                    <td className="px-4 py-3.5 text-foreground/65">
                      {m.elo !== null ? (
                        <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-semibold text-violet-400">
                          k={m.elo}
                        </span>
                      ) : (
                        <span className="text-foreground/25">—</span>
                      )}
                    </td>
                    {/* Lives */}
                    <td className="px-4 py-3.5 text-foreground/65">
                      {m.lives > 1 ? (
                        <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-400">
                          {m.lives}
                        </span>
                      ) : (
                        m.lives
                      )}
                    </td>
                    {/* Weekly reset */}
                    <td className="px-4 py-3.5">
                      {m.weekly ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <span className="text-foreground/25">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-foreground/40">
          {t("scoring.modes.note")}
        </p>
      </section>

      {/* ── Section 6: Admin controls ───────────────────────────── */}
      <section className="mb-14">
        <span className="section-label mb-3 inline-block">
          {t("scoring.admin.badge")}
        </span>
        <h2 className="mb-2 font-display text-2xl font-semibold text-white">
          {t("scoring.admin.title")}
        </h2>
        <p className="mb-6 max-w-xl text-sm leading-6 text-foreground/[0.65]">
          {t("scoring.admin.description")}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {adminControls.map((ctrl) => (
            <div
              key={ctrl.label}
              className="soft-card flex items-start gap-4 rounded-[1.4rem] p-4"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <Settings2 className="h-4 w-4 text-foreground/50" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{ctrl.label}</p>
                <p className="mt-0.5 text-xs leading-5 text-foreground/55">
                  {ctrl.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-500/15 bg-amber-500/[0.06] p-4">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-sm text-foreground/70">
            {t("scoring.admin.lockedNote")}
          </p>
        </div>
      </section>

      {/* ── Section 7: Draft types ──────────────────────────────── */}
      <section className="mb-14">
        <span className="section-label mb-3 inline-block">
          {t("scoring.draft.badge")}
        </span>
        <h2 className="mb-2 font-display text-2xl font-semibold text-white">
          {t("scoring.draft.title")}
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {DRAFT_TYPES.map(({ key, icon: Icon }) => (
            <div key={key} className="glass-panel rounded-[1.6rem] p-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <Icon className="h-5 w-5 text-foreground/60" />
              </div>
              <p className="font-semibold text-white">
                {t(`scoring.draft.${key}.label`)}
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground/60">
                {t(`scoring.draft.${key}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 8: Timing ───────────────────────────────────── */}
      <section className="mb-14">
        <span className="section-label mb-3 inline-block">
          {t("scoring.timing.badge")}
        </span>
        <h2 className="mb-2 font-display text-2xl font-semibold text-white">
          {t("scoring.timing.title")}
        </h2>
        <p className="mb-8 max-w-xl text-sm leading-6 text-foreground/[0.65]">
          {t("scoring.timing.description")}
        </p>

        {/* Timeline */}
        <div className="relative mb-8 space-y-0">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-0 h-full w-px bg-white/10" />

          {timingTimeline.map((step, i) => {
            const isLock = i === 2; // deadline step
            const isDone = i === 5; // points awarded step
            return (
              <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
                {/* Dot */}
                <div
                  className={cn(
                    "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
                    isLock
                      ? "border-rose-500/30 bg-rose-500/10"
                      : isDone
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : "border-white/15 bg-white/[0.05]",
                  )}
                >
                  {isLock ? (
                    <Lock className="h-4 w-4 text-rose-400" />
                  ) : isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <span className="text-xs font-bold text-foreground/40">
                      {i + 1}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="pt-1.5">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      isLock
                        ? "text-rose-300"
                        : isDone
                          ? "text-emerald-300"
                          : "text-white",
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="mt-0.5 text-sm text-foreground/55">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Four rules */}
        <div className="grid gap-3 sm:grid-cols-2">
          {timingRules.map((rule, i) => {
            const isWarning = i === 0 || i === 2; // hard rules
            return (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-3 rounded-[1.4rem] border p-4",
                  isWarning
                    ? "border-rose-500/20 bg-rose-500/[0.05]"
                    : "border-white/10 bg-white/[0.03]",
                )}
              >
                {isWarning ? (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                ) : (
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-foreground/40" />
                )}
                <div>
                  <p className="text-sm font-semibold text-white">
                    {rule.label}
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-foreground/55">
                    {rule.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────────── */}
      <section className="glass-panel rounded-[1.8rem] p-8 text-center">
        <p className="font-display text-2xl font-semibold text-white">
          {t("scoring.cta.title")}
        </p>
        <p className="mt-2 text-sm text-foreground/60">
          {t("scoring.cta.description")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild className="rounded-full px-6">
            <Link to="/groups/new">
              {t("scoring.cta.create")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="rounded-full px-6 text-foreground/60"
          >
            <Link to="/">{t("scoring.cta.home")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
