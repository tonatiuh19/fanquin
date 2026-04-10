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

const scenarios = {
  mexicoGoal: {
    title: "If Mexico score first",
    impact:
      "Leo jumps to 1st with a +12 ownership swing, closing Maya's gap to 5 points.",
    badge: "Leaderboard flip",
    summary: [
      "Mexico ownership pays out across 2 players.",
      "Underdog boost window opens for Japan.",
      "Double points token activates for 38 minutes.",
    ],
  },
  japanEqualizer: {
    title: "If Japan equalize",
    impact:
      "Cam rises 3 places and Maya's streak is threatened if she predicted a Mexico win.",
    badge: "Upset alert",
    summary: [
      "Weekly reset chest fills to 90%.",
      "Maya still leads unless Argentina lose later tonight.",
      "Two streaks break, opening the leaderboard.",
    ],
  },
  cleanSheet: {
    title: "If Argentina hold a clean sheet",
    impact:
      "Maya extends the lead with +5 ownership and preserves a 4-pick streak.",
    badge: "Streak secured",
    summary: [
      "Only 11% of the group picked a scoreless win.",
      "Double points token becomes best used on USA vs Netherlands.",
      "Rivalry margin vs Leo widens to 14 points.",
    ],
  },
} as const;

type ScenarioKey = keyof typeof scenarios;

const scenarioTabs: Array<{ key: ScenarioKey; label: string }> = [
  { key: "mexicoGoal", label: "Mexico goal" },
  { key: "japanEqualizer", label: "Japan equalizer" },
  { key: "cleanSheet", label: "Argentina clean sheet" },
];

const draftBoard = [
  "Maya R. → Argentina · Brazil · Spain",
  "Leo V. → Mexico · France · Germany",
  "Cam G. → Japan · USA · Morocco",
  "Nadia T. → France · England · Netherlands",
  "Sam K. → Portugal · Italy · Senegal",
  "Alex M. → Uruguay · South Korea · Croatia",
];

const fixtures = [
  {
    match: "Mexico vs Argentina",
    stage: "Group A · Matchday 1",
    kickoff: "Today · 18:00",
    prediction: "Argentina win 2–1 (Exact score)",
    ownershipBoost: "+11% swing if Argentina score first",
  },
  {
    match: "USA vs Netherlands",
    stage: "Group B · Matchday 1",
    kickoff: "Today · 21:00",
    prediction: "Draw 1–1 (Underdog pick)",
    ownershipBoost: "Unlocks +5 upset bonus for 3 members",
  },
  {
    match: "Japan vs Senegal",
    stage: "Group C · Matchday 1",
    kickoff: "Tomorrow · 15:00",
    prediction: "Japan win 1–0 (Correct winner)",
    ownershipBoost: "Cam's streak extends +2 if correct",
  },
] as const;

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
  const activeScenario = scenarios[scenario];

  const { streaks } = t("groupHub", { returnObjects: true }) as {
    streaks: Record<string, string>;
  };
  const leaderboard = leaderboardBase.map((entry) => ({
    ...entry,
    streak: streaks[entry.streakKey] ?? entry.streakKey,
  }));

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
              <span className="section-label w-fit">
                Private group command center
              </span>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display text-4xl font-semibold tracking-tight text-white md:text-5xl">
                    World Cup Crew
                  </h1>
                  <span className="rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-brand">
                    8 members • medium mode
                  </span>
                </div>
                <p className="max-w-2xl text-base leading-7 text-foreground/[0.72] md:text-lg">
                  This hub blends private group predictions, snake draft team
                  ownership, rivalry resets, and real-time “what-if” swings into
                  one matchday experience.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryCard
                  icon={<Trophy className="h-4 w-4" />}
                  label="Prize pool mood"
                  value="Bragging rights + weekly drops"
                />
                <SummaryCard
                  icon={<Flame className="h-4 w-4" />}
                  label="Best streak"
                  value="Maya holds 4 straight hits"
                />
                <SummaryCard
                  icon={<ShieldPlus className="h-4 w-4" />}
                  label="Boosts live"
                  value="2 underdog boosts unplayed"
                />
              </div>
            </div>

            <div className="soft-card rounded-[1.8rem] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Opening match countdown
                  </p>
                  <p className="text-sm text-foreground/[0.55]">
                    FIFA World Cup 2026 kick-off in North America
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
                      {key}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand">
                Invite flow is structured for share links, reminder nudges, and
                weekly reset rewards.
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="soft-card rounded-[1.75rem] p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  Live leaderboard
                </p>
                <p className="text-sm text-foreground/[0.55]">
                  Ranking shifts combine predictions, ownership, and streaks.
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-foreground/[0.55]">
                Updated after every goal event
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
                      {entry.movement} this matchday
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
                  <p className="font-semibold text-white">Weekly rivalry</p>
                  <p className="text-sm text-foreground/[0.55]">
                    Head-to-head micro reward keeps the table alive.
                  </p>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between text-sm text-foreground/62">
                  <span>Maya R.</span>
                  <span>vs</span>
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
                  Winner unlocks a weekly reset chest with streak insurance for
                  the next slate.
                </p>
              </div>
            </div>

            <div className="soft-card rounded-[1.75rem] p-5 md:p-6">
              <div className="mb-4 flex items-center gap-3">
                <TimerReset className="h-5 w-5 text-brandAlt" />
                <div>
                  <p className="font-semibold text-white">Scoring pulse</p>
                  <p className="text-sm text-foreground/[0.55]">
                    Modular rules active for this group size.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <RuleChip label="Exact score" value="+8 pts" />
                <RuleChip label="Correct winner" value="+3 pts" />
                <RuleChip label="Goal difference" value="+2 pts" />
                <RuleChip label="Team win bonus" value="+4 pts" />
                <RuleChip label="Upset pick" value="+5 to +12" />
                <RuleChip label="Power-up token" value="Double or underdog" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="soft-card rounded-[1.75rem] p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-white">Prediction slate</p>
                <p className="text-sm text-foreground/[0.55]">
                  Match cards fuse predictions with ownership swings.
                </p>
              </div>
              <Button
                asChild
                variant="ghost"
                className="rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white hover:bg-white/10"
              >
                <Link to="/live">Open live route</Link>
              </Button>
            </div>
            <div className="space-y-3">
              {fixtures.map((fixture) => (
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
                        Your pick
                      </p>
                      {fixture.prediction}
                    </div>
                    <div className="rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand">
                      <p className="mb-1 text-xs uppercase tracking-[0.2em] text-brand/60">
                        Ownership impact
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
                <p className="font-semibold text-white">What-if simulator</p>
                <p className="text-sm text-foreground/[0.55]">
                  Contextual insights make every live event feel personal.
                </p>
              </div>
              <span className="rounded-full border border-brandAlt/20 bg-brandAlt/10 px-3 py-1 text-xs text-brandAlt">
                {activeScenario.badge}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {scenarioTabs.map((item) => (
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
                <p className="font-semibold text-white">Team ownership board</p>
                <p className="text-sm text-foreground/[0.55]">
                  Snake draft creates identity and emotional stakes.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {draftBoard.map((entry) => (
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
                <p className="font-semibold text-white">Engagement loop</p>
                <p className="text-sm text-foreground/[0.55]">
                  Built for invites, retention nudges, and daily matchday
                  return.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <InsightCard
                title="Invite momentum"
                description="3 dormant friends can rejoin with one-tap share links and seeded draft spots."
              />
              <InsightCard
                title="Weekly catch-up"
                description="Trailing players still chase micro rewards and rivalry wins even when the season table stretches."
              />
              <InsightCard
                title="Notification hooks"
                description="Ready for reminders on lock deadlines, rank swings, and power-up opportunities."
              />
              <InsightCard
                title="League expansion"
                description="Rule cards are modular, so the same shell can power other tournaments and sports."
              />
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
