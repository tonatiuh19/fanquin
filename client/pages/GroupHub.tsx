import { Button } from "@/components/ui/button";
import { PageMeta } from "@/components/fanquin/page-meta";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Flame,
  ShieldPlus,
  Siren,
  TimerReset,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const leaderboardBase = [
  {
    name: "Maya R.",
    rank: 1,
    team: "Argentina",
    points: 128,
    streakKey: "+4 streak",
    movement: "+2",
  },
  {
    name: "Leo V.",
    rank: 2,
    team: "Mexico",
    points: 123,
    streakKey: "+2 streak",
    movement: "-1",
  },
  {
    name: "Cam G.",
    rank: 3,
    team: "Japan",
    points: 118,
    streakKey: "Underdog hit",
    movement: "+3",
  },
  {
    name: "Nadia T.",
    rank: 4,
    team: "France",
    points: 111,
    streakKey: "Double points ready",
    movement: "-2",
  },
] as const;

type ScenarioKey = "mexicoGoal" | "japanEqualizer" | "cleanSheet";

interface ScenarioData {
  label: string;
  title: string;
  impact: string;
  badge: string;
  summary: string[];
}

function getCountdownParts(targetDate: Date) {
  const total = targetDate.getTime() - Date.now();

  if (total <= 0) {
    return { days: "00", hours: "00", minutes: "00", seconds: "00" };
  }

  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((total / (1000 * 60)) % 60);
  const seconds = Math.floor((total / 1000) % 60);

  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
}

export default function GroupHub() {
  const openingMatch = useMemo(() => new Date("2026-06-11T19:00:00Z"), []);
  const [countdown, setCountdown] = useState(() =>
    getCountdownParts(openingMatch),
  );
  const [scenario, setScenario] = useState<ScenarioKey>("mexicoGoal");

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCountdown(getCountdownParts(openingMatch));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [openingMatch]);

  const { t } = useTranslation();

  const { streaks } = t("groupHub", { returnObjects: true }) as {
    streaks: Record<string, string>;
  };
  const leaderboard = leaderboardBase.map((entry) => ({
    ...entry,
    streak: streaks[entry.streakKey] ?? entry.streakKey,
  }));

  const scenariosData = t("groupHub.whatIf.scenarios", {
    returnObjects: true,
  }) as Record<ScenarioKey, ScenarioData>;
  const scenarioTabsList = (
    ["mexicoGoal", "japanEqualizer", "cleanSheet"] as ScenarioKey[]
  ).map((key) => ({ key, label: scenariosData[key].label }));
  const activeScenario = scenariosData[scenario];

  const fixturesList = t("groupHub.fixtures", { returnObjects: true }) as {
    match: string;
    stage: string;
    kickoff: string;
    prediction: string;
    ownershipBoost: string;
  }[];
  const draftEntries = t("groupHub.draftBoard.entries", {
    returnObjects: true,
  }) as string[];
  const scoringRules = t("groupHub.scoringPulse.rules", {
    returnObjects: true,
  }) as { label: string; value: string }[];
  const engagementInsights = t("groupHub.engagementLoop.insights", {
    returnObjects: true,
  }) as { title: string; description: string }[];

  return (
    <section className="container py-6 md:py-10">
      <PageMeta
        title={t("seo.groupHub.title")}
        description={t("seo.groupHub.description")}
        canonicalPath="/groups/world-cup-crew"
      />
      <div className="space-y-6 md:space-y-8">
        <div className="glass-panel overflow-hidden rounded-[2rem] p-6 md:p-8">
          <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
            <div className="space-y-5">
              <span className="section-label w-fit">{t("groupHub.badge")}</span>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display text-4xl font-semibold tracking-tight text-white md:text-5xl">
                    {t("groupHub.title")}
                  </h1>
                  <span className="rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-brand">
                    {t("groupHub.membersBadge")}
                  </span>
                </div>
                <p className="max-w-2xl text-base leading-7 text-foreground/[0.72] md:text-lg">
                  {t("groupHub.description")}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryCard
                  icon={<Trophy className="h-4 w-4" />}
                  label={t("groupHub.summaryCards.prize.label")}
                  value={t("groupHub.summaryCards.prize.value")}
                />
                <SummaryCard
                  icon={<Flame className="h-4 w-4" />}
                  label={t("groupHub.summaryCards.streak.label")}
                  value={t("groupHub.summaryCards.streak.value")}
                />
                <SummaryCard
                  icon={<ShieldPlus className="h-4 w-4" />}
                  label={t("groupHub.summaryCards.boosts.label")}
                  value={t("groupHub.summaryCards.boosts.value")}
                />
              </div>
            </div>

            <div className="soft-card rounded-[1.8rem] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {t("groupHub.countdown.title")}
                  </p>
                  <p className="text-sm text-foreground/[0.55]">
                    {t("groupHub.countdown.subtitle")}
                  </p>
                </div>
                <Siren className="h-5 w-5 text-brand" />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(countdown).map(([key, value]) => (
                  <div
                    key={key}
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-center"
                  >
                    <div className="font-display text-2xl font-semibold text-white">
                      {value}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.28em] text-foreground/[0.45]">
                      {t(`groupHub.countdown.${key}`)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand">
                {t("groupHub.countdown.inviteNote")}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="soft-card rounded-[1.75rem] p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {t("groupHub.leaderboard.title")}
                </p>
                <p className="text-sm text-foreground/[0.55]">
                  {t("groupHub.leaderboard.subtitle")}
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-foreground/[0.55]">
                {t("groupHub.leaderboard.updated")}
              </span>
            </div>
            <div className="space-y-3">
              {leaderboard.map((entry) => (
                <div
                  key={entry.name}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8 font-display text-lg font-semibold text-white">
                    {entry.rank}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white">{entry.name}</p>
                      <span className="rounded-full border border-brand/20 bg-brand/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-brand">
                        {entry.team}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-foreground/[0.58]">
                      {entry.streak}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-semibold text-white">
                      {entry.points}
                    </p>
                    <p
                      className={cn(
                        "text-sm",
                        entry.movement.startsWith("+")
                          ? "text-brand"
                          : "text-rose-300",
                      )}
                    >
                      {entry.movement} {t("groupHub.leaderboard.thisMatchday")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="soft-card rounded-[1.75rem] p-5 md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/15 text-brand">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-white">
                    {t("groupHub.rivalry.title")}
                  </p>
                  <p className="text-sm text-foreground/[0.55]">
                    {t("groupHub.rivalry.subtitle")}
                  </p>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between text-sm text-foreground/62">
                  <span>Maya R.</span>
                  <span>{t("groupHub.rivalry.vs")}</span>
                  <span>Leo V.</span>
                </div>
                <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="rounded-2xl bg-white/[0.06] px-4 py-5 text-center">
                    <p className="font-display text-3xl font-semibold text-white">
                      34
                    </p>
                    <p className="text-xs uppercase tracking-[0.22em] text-foreground/[0.45]">
                      Maya
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-brand" />
                  <div className="rounded-2xl bg-white/[0.06] px-4 py-5 text-center">
                    <p className="font-display text-3xl font-semibold text-white">
                      31
                    </p>
                    <p className="text-xs uppercase tracking-[0.22em] text-foreground/[0.45]">
                      Leo
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-foreground/[0.68]">
                  {t("groupHub.rivalry.winnerNote")}
                </p>
              </div>
            </div>

            <div className="soft-card rounded-[1.75rem] p-5 md:p-6">
              <div className="mb-4 flex items-center gap-3">
                <TimerReset className="h-5 w-5 text-brandAlt" />
                <div>
                  <p className="font-semibold text-white">
                    {t("groupHub.scoringPulse.title")}
                  </p>
                  <p className="text-sm text-foreground/[0.55]">
                    {t("groupHub.scoringPulse.subtitle")}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {scoringRules.map((rule) => (
                  <RuleChip
                    key={rule.label}
                    label={rule.label}
                    value={rule.value}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="soft-card rounded-[1.75rem] p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-white">
                  {t("groupHub.predictionSlate.title")}
                </p>
                <p className="text-sm text-foreground/[0.55]">
                  {t("groupHub.predictionSlate.subtitle")}
                </p>
              </div>
              <Button
                asChild
                variant="ghost"
                className="rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white hover:bg-white/10"
              >
                <Link to="/live">{t("groupHub.predictionSlate.openLive")}</Link>
              </Button>
            </div>
            <div className="space-y-3">
              {fixturesList.map((fixture) => (
                <div
                  key={fixture.match}
                  className="rounded-[1.45rem] border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">
                        {fixture.match}
                      </p>
                      <p className="text-sm text-foreground/[0.55]">
                        {fixture.stage}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-foreground/[0.58]">
                      {fixture.kickoff}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-foreground/74">
                      <p className="mb-1 text-xs uppercase tracking-[0.2em] text-foreground/40">
                        {t("groupHub.predictionSlate.yourPick")}
                      </p>
                      {fixture.prediction}
                    </div>
                    <div className="rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand">
                      <p className="mb-1 text-xs uppercase tracking-[0.2em] text-brand/60">
                        {t("groupHub.predictionSlate.ownershipImpact")}
                      </p>
                      {fixture.ownershipBoost}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="soft-card rounded-[1.75rem] p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-white">
                  {t("groupHub.whatIf.title")}
                </p>
                <p className="text-sm text-foreground/[0.55]">
                  {t("groupHub.whatIf.subtitle")}
                </p>
              </div>
              <span className="rounded-full border border-brandAlt/20 bg-brandAlt/10 px-3 py-1 text-xs text-brandAlt">
                {activeScenario.badge}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {scenarioTabsList.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setScenario(item.key)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition",
                    scenario === item.key
                      ? "border-brand/30 bg-brand text-slate-950"
                      : "border-white/10 bg-white/5 text-foreground/62 hover:text-white",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-[1.45rem] border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-brand">
                {activeScenario.title}
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                {activeScenario.impact}
              </p>
              <div className="mt-5 space-y-3">
                {activeScenario.summary.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-foreground/[0.68]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="soft-card rounded-[1.75rem] p-5 md:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brandAlt/[0.15] text-brandAlt">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-white">
                  {t("groupHub.draftBoard.title")}
                </p>
                <p className="text-sm text-foreground/[0.55]">
                  {t("groupHub.draftBoard.subtitle")}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {draftEntries.map((entry) => (
                <div
                  key={entry}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground/74"
                >
                  {entry}
                </div>
              ))}
            </div>
          </div>

          <div className="soft-card rounded-[1.75rem] p-5 md:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/15 text-brand">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-white">
                  {t("groupHub.engagementLoop.title")}
                </p>
                <p className="text-sm text-foreground/[0.55]">
                  {t("groupHub.engagementLoop.subtitle")}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {engagementInsights.map((insight) => (
                <InsightCard
                  key={insight.title}
                  title={insight.title}
                  description={insight.description}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/8 text-brand">
        {icon}
      </div>
      <p className="text-xs uppercase tracking-[0.22em] text-foreground/[0.42]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-white">{value}</p>
    </div>
  );
}

function RuleChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function InsightCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-foreground/[0.65]">
        {description}
      </p>
    </div>
  );
}
