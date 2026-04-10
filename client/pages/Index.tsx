import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageMeta } from "@/components/fanquin/page-meta";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  Flame,
  Gauge,
  LogIn,
  ShieldPlus,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

const pillarIcons = [Target, Trophy, Swords, ShieldPlus];
const engagementIcons = [BellRing, Sparkles, Flame];

export default function Index() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [joinCode, setJoinCode] = useState("");

  const heroStats = t("index.stats", { returnObjects: true }) as Array<{
    label: string;
    value: string;
    note: string;
  }>;
  const productPillars = (
    t("index.pillars", { returnObjects: true }) as Array<{
      title: string;
      description: string;
    }>
  ).map((p, i) => ({ ...p, icon: pillarIcons[i] }));
  const GROUP_MODE_KEYS = ["casual", "friends", "league"] as const;
  const groupModes = (
    t("index.groupModes", { returnObjects: true }) as Array<{
      title: string;
      audience: string;
      description: string;
      features: string[];
    }>
  ).map((m, i) => ({ ...m, modeKey: GROUP_MODE_KEYS[i] ?? "casual" }));
  const scoringLayers = t("index.scoringLayers", {
    returnObjects: true,
  }) as Array<{ title: string; value: string; description: string }>;
  const engagementLoops = (
    t("index.engagementLoops", { returnObjects: true }) as Array<{
      title: string;
      description: string;
    }>
  ).map((e, i) => ({ ...e, icon: engagementIcons[i] }));
  const productValues = t("index.productDirection.values", {
    returnObjects: true,
  }) as Array<{ title: string; description: string }>;

  return (
    <div className="container py-6 md:py-10">
      <PageMeta
        title={t("seo.home.title")}
        description={t("seo.home.description")}
        canonicalPath="/"
      />
      <div className="space-y-6 md:space-y-8">
        <section className="glass-panel overflow-hidden rounded-[2rem] px-5 py-6 md:px-8 md:py-8 xl:px-10 xl:py-10">
          <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr] xl:items-center">
            <div className="space-y-6">
              <span className="section-label w-fit">{t("index.badge")}</span>
              <div className="space-y-4">
                <h1 className="max-w-4xl font-display text-4xl font-semibold tracking-tight text-white md:text-6xl xl:text-[4.5rem] xl:leading-[1.02]">
                  {t("index.hero.title")}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-foreground/[0.72] md:text-lg md:leading-8">
                  {t("index.hero.description")}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  className="rounded-full border border-brand/25 bg-brand px-5 text-sm font-semibold text-slate-950 shadow-glow hover:bg-brandStrong"
                >
                  <Link to="/groups/new">
                    {t("index.hero.ctaPrimary")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="rounded-full border border-white/10 bg-white/5 px-5 text-sm text-white hover:bg-white/10"
                >
                  <Link to="/scoring">{t("index.hero.ctaSecondary")}</Link>
                </Button>
              </div>

              {/* Join by code */}
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 pl-4">
                <LogIn className="h-4 w-4 shrink-0 text-brand/70" />
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && joinCode.trim()) {
                      navigate(`/join/${joinCode.trim().toLowerCase()}`);
                    }
                  }}
                  placeholder={t("index.hero.joinPlaceholder")}
                  maxLength={8}
                  className="h-8 flex-1 border-none bg-transparent font-mono tracking-widest text-white placeholder:text-foreground/30 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button
                  onClick={() => {
                    if (joinCode.trim()) {
                      navigate(`/join/${joinCode.trim().toLowerCase()}`);
                    }
                  }}
                  disabled={joinCode.trim().length === 0}
                  size="sm"
                  className="rounded-xl bg-brand px-4 text-xs font-semibold text-slate-950 hover:bg-brand/90 disabled:opacity-30"
                >
                  {t("index.hero.joinButton")}
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {heroStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.24em] text-foreground/40">
                      {stat.label}
                    </p>
                    <p className="mt-3 font-display text-3xl font-semibold text-white">
                      {stat.value}
                    </p>
                    <p className="mt-2 text-sm text-foreground/[0.58]">
                      {stat.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="soft-card rounded-[1.9rem] p-5 md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {t("index.matchdayPulse.title")}
                    </p>
                    <p className="text-sm text-foreground/[0.55]">
                      {t("index.matchdayPulse.subtitle")}
                    </p>
                  </div>
                  <div className="rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-brand">
                    {t("index.matchdayPulse.badge")}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <PreviewCard
                    title={t("index.previewCards.leaderboard.title")}
                    description={t(
                      "index.previewCards.leaderboard.description",
                    )}
                    icon={<BarChart3 className="h-5 w-5" />}
                  />
                  <PreviewCard
                    title={t("index.previewCards.weeklyDuel.title")}
                    description={t("index.previewCards.weeklyDuel.description")}
                    icon={<Zap className="h-5 w-5" />}
                  />
                  <PreviewCard
                    title={t("index.previewCards.streakReward.title")}
                    description={t(
                      "index.previewCards.streakReward.description",
                    )}
                    icon={<Flame className="h-5 w-5" />}
                  />
                  <PreviewCard
                    title={t("index.previewCards.whatIf.title")}
                    description={t("index.previewCards.whatIf.description")}
                    icon={<Gauge className="h-5 w-5" />}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_0.95fr]">
                <div className="soft-card rounded-[1.6rem] p-5">
                  <p className="text-sm font-semibold text-white">
                    {t("index.ownershipDraft")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      "Argentina — Maya",
                      "Mexico — Leo",
                      "Japan — Cam",
                      "France — Nadia",
                    ].map((team) => (
                      <span
                        key={team}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground/[0.72]"
                      >
                        {team}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="soft-card rounded-[1.6rem] p-5">
                  <p className="text-sm font-semibold text-white">
                    {t("index.boostBalance")}
                  </p>
                  <div className="mt-4 space-y-3 text-sm text-foreground/[0.68]">
                    <div className="rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-brand">
                      {t("index.boostMexico")}
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      {t("index.boostUSA")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="soft-card rounded-[1.8rem] p-5 md:p-6">
            <span className="section-label w-fit">
              {t("index.pillarsSection")}
            </span>
            <div className="mt-5 space-y-3">
              {productPillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={pillar.title}
                    className="grid gap-4 rounded-[1.4rem] border border-white/10 bg-white/5 p-4 md:grid-cols-[auto_1fr] md:items-start"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8 text-brand">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {pillar.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-foreground/[0.68]">
                        {pillar.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="soft-card rounded-[1.8rem] p-5 md:p-6">
            <span className="section-label w-fit">
              {t("index.groupModesSection")}
            </span>
            <div className="mt-5 grid gap-3">
              {groupModes.map((mode) => (
                <div
                  key={mode.title}
                  className="rounded-[1.45rem] border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {mode.title}
                      </p>
                      <p className="text-sm text-brand">{mode.audience}</p>
                    </div>
                    <Users className="h-5 w-5 text-brandAlt" />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-foreground/[0.68]">
                    {mode.description}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {mode.features.map((feature) => (
                        <span
                          key={feature}
                          className="rounded-full border border-white/10 bg-slate-950/40 px-3 py-2 text-xs uppercase tracking-[0.18em] text-foreground/[0.55]"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                    <Button
                      asChild
                      size="sm"
                      className="shrink-0 rounded-full bg-brand px-4 text-xs font-semibold text-slate-950 hover:bg-brandStrong"
                    >
                      <Link to={`/groups/new?mode=${mode.modeKey}`}>
                        {t("index.startMode")}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <div className="soft-card rounded-[1.8rem] p-5 md:p-6">
            <span className="section-label w-fit">
              {t("index.scoringSection")}
            </span>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {scoringLayers.map((layer) => (
                <div
                  key={layer.title}
                  className="rounded-[1.45rem] border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-foreground/40">
                    {layer.title}
                  </p>
                  <p className="mt-3 font-display text-3xl font-semibold text-white">
                    {layer.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground/[0.65]">
                    {layer.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="soft-card rounded-[1.8rem] p-5 md:p-6">
            <span className="section-label w-fit">
              {t("index.retentionSection")}
            </span>
            <div className="mt-5 space-y-3">
              {engagementLoops.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-[1.45rem] border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brandAlt/[0.15] text-brandAlt">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-lg font-semibold text-white">
                        {item.title}
                      </p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-foreground/[0.68]">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] px-5 py-6 md:px-8 md:py-8">
          <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr] xl:items-center">
            <div className="space-y-4">
              <span className="section-label w-fit">
                {t("index.productDirection.badge")}
              </span>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
                {t("index.productDirection.title")}
              </h2>
              <p className="max-w-2xl text-base leading-7 text-foreground/[0.72]">
                {t("index.productDirection.description")}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {productValues.map((v) => (
                <ValueCard
                  key={v.title}
                  title={v.title}
                  description={v.description}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function PreviewCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/8 text-brand">
        {icon}
      </div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-foreground/[0.68]">
        {description}
      </p>
    </div>
  );
}

function ValueCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.45rem] border border-white/10 bg-white/5 p-4">
      <p className="text-lg font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-foreground/[0.68]">
        {description}
      </p>
    </div>
  );
}
