import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow, format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import {
  RefreshCw,
  Radio,
  Calendar,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  Trophy,
  ChevronRight,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchLiveData,
  syncMatches,
  clearSyncResult,
} from "@/store/slices/liveSlice";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageMeta } from "@/components/fanquin/page-meta";
import type { LiveMatch, LiveMatchPrediction } from "@shared/api";
import { Link } from "react-router-dom";

// ── Date helpers ──────────────────────────────────────────────────

function useDateLocale() {
  const { i18n } = useTranslation();
  return i18n.language === "es" ? es : enUS;
}

function relativeTime(iso: string, locale: Locale) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale });
  } catch {
    return iso;
  }
}

function matchDateTime(iso: string, locale: Locale) {
  try {
    return format(new Date(iso), "d MMM · HH:mm", { locale });
  } catch {
    return iso;
  }
}

// ── Prediction result badge ───────────────────────────────────────

function PredBadge({
  result,
  pts,
}: {
  result: LiveMatchPrediction["result"];
  pts: number;
}) {
  const { t } = useTranslation();
  if (result === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-foreground/40">
        <Clock className="h-2.5 w-2.5" />
        {t("live.pending")}
      </span>
    );
  }
  if (result === "exact_score") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-brand">
        <CheckCircle2 className="h-2.5 w-2.5" />+{pts} {t("live.pts")}
      </span>
    );
  }
  if (result === "correct_winner" || result === "goal_difference") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
        <MinusCircle className="h-2.5 w-2.5" />+{pts} {t("live.pts")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">
      <XCircle className="h-2.5 w-2.5" />0 {t("live.pts")}
    </span>
  );
}

// ── Match card ────────────────────────────────────────────────────

function MatchCard({
  match,
  myGroups,
}: {
  match: LiveMatch;
  myGroups: { id: string; name: string }[];
}) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const isLive = match.status === "live";
  const isCompleted = match.status === "completed";

  const homeFlag = match.home_team?.flag_url;
  const awayFlag = match.away_team?.flag_url;

  const predictions = match.my_predictions ?? {};
  const hasPredictions = Object.keys(predictions).length > 0;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all duration-200 ${
        isLive
          ? "border-brand/30 bg-brand/5 shadow-[0_0_20px_rgba(22,163,74,0.08)]"
          : "border-white/8 bg-white/[0.03]"
      }`}
    >
      {/* Live pulse strip */}
      {isLive && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-brand to-transparent" />
      )}

      <div className="p-4">
        {/* Meta row */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-brand">
                  {t("live.liveLabel")}
                </span>
              </span>
            )}
            {isCompleted && (
              <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/50">
                {t("live.completedLabel")}
              </span>
            )}
            <span className="text-xs text-foreground/40">{match.stage}</span>
          </div>
          <span className="text-[11px] text-foreground/40">
            {isCompleted || isLive
              ? relativeTime(match.match_date, dateLocale)
              : matchDateTime(match.match_date, dateLocale)}
          </span>
        </div>

        {/* Teams + score */}
        <div className="flex items-center justify-between gap-3">
          {/* Home */}
          <div className="flex flex-1 items-center gap-2.5">
            {homeFlag ? (
              <img
                src={homeFlag}
                alt={match.home_team?.short_name ?? ""}
                className="h-7 w-7 rounded-full object-cover shadow-sm ring-1 ring-white/10"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-base">
                🏳️
              </div>
            )}
            <span className="truncate text-sm font-semibold text-foreground">
              {match.home_team?.name ?? "TBD"}
            </span>
          </div>

          {/* Score / VS */}
          <div className="flex min-w-[72px] shrink-0 items-center justify-center gap-2">
            {isCompleted || isLive ? (
              <>
                <span className="text-xl font-black tabular-nums text-foreground">
                  {match.home_score ?? "—"}
                </span>
                <span className="text-sm font-bold text-foreground/30">:</span>
                <span className="text-xl font-black tabular-nums text-foreground">
                  {match.away_score ?? "—"}
                </span>
              </>
            ) : (
              <span className="text-sm font-bold text-foreground/30">vs</span>
            )}
          </div>

          {/* Away */}
          <div className="flex flex-1 items-center justify-end gap-2.5">
            <span className="truncate text-right text-sm font-semibold text-foreground">
              {match.away_team?.name ?? "TBD"}
            </span>
            {awayFlag ? (
              <img
                src={awayFlag}
                alt={match.away_team?.short_name ?? ""}
                className="h-7 w-7 rounded-full object-cover shadow-sm ring-1 ring-white/10"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-base">
                🏳️
              </div>
            )}
          </div>
        </div>

        {/* Venue */}
        {match.venue && (
          <p className="mt-2 text-center text-[11px] text-foreground/30">
            {match.venue.name} · {match.venue.city}
          </p>
        )}

        {/* Predictions per group */}
        {hasPredictions && (
          <div className="mt-3 space-y-1.5 border-t border-white/6 pt-3">
            {Object.values(predictions).map((pred) => (
              <div
                key={(pred as LiveMatchPrediction).group_id}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate text-[11px] text-foreground/50">
                  {(pred as LiveMatchPrediction).group_name}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="font-mono text-[11px] text-foreground/60">
                    {(pred as LiveMatchPrediction).predicted_home}–
                    {(pred as LiveMatchPrediction).predicted_away}
                  </span>
                  <PredBadge
                    result={(pred as LiveMatchPrediction).result}
                    pts={(pred as LiveMatchPrediction).points_earned}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No prediction notice when in active groups but no prediction */}
        {!hasPredictions &&
          myGroups.length > 0 &&
          match.my_predictions !== undefined && (
            <p className="mt-2 text-center text-[11px] text-foreground/30">
              {t("live.noPrediction")}
            </p>
          )}
      </div>
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────

function MatchCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2.5">
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-16" />
        <div className="flex flex-1 items-center justify-end gap-2.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  message,
}: {
  icon: React.ElementType;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
        <Icon className="h-5 w-5 text-foreground/30" />
      </div>
      <p className="text-sm text-foreground/40">{message}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

export default function LivePage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { data, loading, syncing, syncResult, syncError } = useAppSelector(
    (s) => s.live,
  );
  const sessionToken = useAppSelector((s) => s.auth.sessionToken);
  const dateLocale = useDateLocale();
  const [activeTab, setActiveTab] = useState("upcoming");

  // Auto-switch to "live" tab if there are live matches
  useEffect(() => {
    if (data?.live && data.live.length > 0) {
      setActiveTab("live");
    }
  }, [data?.live?.length]);

  // Initial fetch on mount
  useEffect(() => {
    dispatch(fetchLiveData(undefined));
  }, [dispatch]);

  // Clear sync result after 4 seconds
  useEffect(() => {
    if (syncResult || syncError) {
      const t = setTimeout(() => dispatch(clearSyncResult()), 4000);
      return () => clearTimeout(t);
    }
  }, [syncResult, syncError, dispatch]);

  const competition = data?.competition;
  const myGroups = data?.my_active_groups ?? [];
  const lastSynced = data?.last_synced_at;

  const handleSync = () => {
    dispatch(syncMatches(competition?.id));
  };

  const handleRefresh = () => {
    dispatch(fetchLiveData(competition?.id));
  };

  const liveCount = data?.live.length ?? 0;
  const upcomingCount = data?.upcoming.length ?? 0;
  const recentCount = data?.recent.length ?? 0;

  return (
    <>
      <PageMeta
        title={t("live.pageTitle")}
        description={t("live.pageDescription")}
        canonicalPath="/live"
      />

      <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Radio className="h-4 w-4 text-brand" />
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                {t("live.title")}
              </h1>
            </div>
            <p className="text-sm text-foreground/50">
              {competition?.name ?? t("live.subtitle")}
            </p>
            {lastSynced && (
              <p className="mt-0.5 text-[11px] text-foreground/30">
                {t("live.lastSynced")}: {relativeTime(lastSynced, dateLocale)}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Refresh (re-read DB) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="h-8 rounded-xl border border-white/8 bg-white/[0.04] px-3 text-xs text-foreground/60 hover:bg-white/[0.07]"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
            </Button>

            {/* Sync (calls football-data.org — auth required) */}
            {sessionToken && (
              <Button
                size="sm"
                onClick={handleSync}
                disabled={syncing || loading}
                className="h-8 rounded-xl bg-brand px-3 text-xs font-semibold text-slate-950 hover:bg-brand/90 disabled:opacity-50"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    {t("live.syncing")}
                  </>
                ) : (
                  t("live.sync")
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Sync feedback pill */}
        {(syncResult || syncError) && (
          <div
            className={`mb-4 rounded-xl border px-4 py-2.5 text-sm ${
              syncError
                ? "border-red-500/20 bg-red-500/8 text-red-400"
                : "border-brand/20 bg-brand/8 text-brand"
            }`}
          >
            {syncError
              ? syncError
              : `${t("live.syncDone")} — ${syncResult!.matches_updated} ${t(
                  "live.matchesUpdated",
                )}, ${syncResult!.predictions_scored} ${t("live.predsScored")}`}
          </div>
        )}

        {/* Active groups hint */}
        {sessionToken && myGroups.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-1.5">
            <span className="text-[11px] text-foreground/40">
              {t("live.showingForGroups")}:
            </span>
            {myGroups.map((g) => (
              <Link key={g.id} to={`/groups/${g.id}`}>
                <Badge
                  variant="secondary"
                  className="cursor-pointer rounded-full border-white/8 bg-white/5 text-[10px] hover:bg-white/10"
                >
                  {g.name}
                  <ChevronRight className="ml-0.5 h-2.5 w-2.5 opacity-50" />
                </Badge>
              </Link>
            ))}
          </div>
        )}

        {sessionToken && myGroups.length === 0 && data && (
          <p className="mb-5 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs text-foreground/40">
            {t("live.noActiveGroups")}
          </p>
        )}

        {!sessionToken && data && (
          <p className="mb-5 text-xs text-foreground/40">
            {t("live.signInToSeeGroups")}
          </p>
        )}

        {/* ── Tabs ───────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 grid w-full grid-cols-3 rounded-xl border border-white/8 bg-white/[0.04] p-1">
            <TabsTrigger
              value="live"
              className="relative rounded-lg text-xs data-[state=active]:bg-brand data-[state=active]:text-slate-950 data-[state=active]:font-semibold"
            >
              {liveCount > 0 && (
                <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand/20 text-[9px] font-bold text-brand data-[state=active]:bg-slate-950/20 data-[state=active]:text-slate-950">
                  {liveCount}
                </span>
              )}
              {t("live.tabLive")}
            </TabsTrigger>
            <TabsTrigger
              value="upcoming"
              className="rounded-lg text-xs data-[state=active]:bg-white/10 data-[state=active]:font-semibold"
            >
              {t("live.tabUpcoming")}
              {upcomingCount > 0 && (
                <span className="ml-1.5 text-[10px] text-foreground/40">
                  {upcomingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="results"
              className="rounded-lg text-xs data-[state=active]:bg-white/10 data-[state=active]:font-semibold"
            >
              {t("live.tabResults")}
              {recentCount > 0 && (
                <span className="ml-1.5 text-[10px] text-foreground/40">
                  {recentCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Live */}
          <TabsContent value="live" className="mt-0 space-y-3">
            {loading ? (
              <>
                <MatchCardSkeleton />
                <MatchCardSkeleton />
              </>
            ) : liveCount === 0 ? (
              <EmptyState icon={Radio} message={t("live.noLive")} />
            ) : (
              data!.live.map((m) => (
                <MatchCard key={m.id} match={m} myGroups={myGroups} />
              ))
            )}
          </TabsContent>

          {/* Upcoming */}
          <TabsContent value="upcoming" className="mt-0 space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <MatchCardSkeleton key={i} />
              ))
            ) : upcomingCount === 0 ? (
              <EmptyState icon={Calendar} message={t("live.noUpcoming")} />
            ) : (
              data!.upcoming.map((m) => (
                <MatchCard key={m.id} match={m} myGroups={myGroups} />
              ))
            )}
          </TabsContent>

          {/* Results */}
          <TabsContent value="results" className="mt-0 space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <MatchCardSkeleton key={i} />
              ))
            ) : recentCount === 0 ? (
              <EmptyState icon={Trophy} message={t("live.noResults")} />
            ) : (
              data!.recent.map((m) => (
                <MatchCard key={m.id} match={m} myGroups={myGroups} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
