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
  Flag,
  Trophy,
  ChevronRight,
  Loader2,
  Target,
  Zap,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchLiveData,
  syncMatches,
  clearSyncResult,
  resetTestLeague,
  clearTestResetResult,
} from "@/store/slices/liveSlice";
import { submitPrediction } from "@/store/slices/predictionsSlice";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageMeta } from "@/components/fanquin/page-meta";
import type {
  LiveMatch,
  LiveMatchPrediction,
  BonusCriteria,
  BonusPredictionDetails,
} from "@shared/api";
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

// ── Bonus prediction fields ───────────────────────────────────────

function BonusFields({
  groupId,
  criteria,
  details,
  onChange,
  disabled,
}: {
  groupId: string;
  criteria: BonusCriteria;
  details: BonusPredictionDetails;
  onChange: (d: BonusPredictionDetails) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const enabled = criteria.enabled ?? [];
  if (enabled.length === 0) return null;

  return (
    <div className="mt-2 space-y-2 border-t border-white/6 pt-2">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/35">
        <Zap className="h-2.5 w-2.5 text-amber-400" />
        {t("live.bonusLabel")}
      </p>

      {enabled.includes("btts") && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-foreground/55">
            {t("live.btts")}
            <span className="ml-1 text-[10px] text-amber-400">
              +{criteria.btts_pts ?? 2}
            </span>
          </span>
          <div className="flex gap-1">
            {(["yes", "no"] as const).map((v) => {
              const val = v === "yes";
              const active = details.btts === val;
              return (
                <button
                  key={v}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ ...details, btts: val })}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
                    active
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-white/5 text-foreground/40 hover:bg-white/10"
                  } disabled:opacity-40`}
                >
                  {t(`live.${v}`)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {enabled.includes("total_goals_over") && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-foreground/55">
            {t("live.totalGoalsOver", {
              threshold: criteria.total_goals_threshold ?? 2.5,
            })}
            <span className="ml-1 text-[10px] text-amber-400">
              +{criteria.total_goals_over_pts ?? 2}
            </span>
          </span>
          <div className="flex gap-1">
            {(["yes", "no"] as const).map((v) => {
              const val = v === "yes";
              const active = details.total_goals_over === val;
              return (
                <button
                  key={v}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onChange({ ...details, total_goals_over: val })
                  }
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
                    active
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-white/5 text-foreground/40 hover:bg-white/10"
                  } disabled:opacity-40`}
                >
                  {t(`live.${v}`)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {enabled.includes("ft_winner") && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-foreground/55">
            {t("live.ftWinner")}
            <span className="ml-1 text-[10px] text-amber-400">
              +{criteria.ft_winner_pts ?? 2}
            </span>
          </span>
          <div className="flex gap-1">
            {(["home", "draw", "away"] as const).map((v) => {
              const active = details.ft_winner === v;
              return (
                <button
                  key={v}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ ...details, ft_winner: v })}
                  className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition ${
                    active
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-white/5 text-foreground/40 hover:bg-white/10"
                  } disabled:opacity-40`}
                >
                  {t(`live.${v}`)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {enabled.includes("ht_winner") && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-foreground/55">
            {t("live.htWinner")}
            <span className="ml-1 text-[10px] text-amber-400">
              +{criteria.ht_winner_pts ?? 2}
            </span>
          </span>
          <div className="flex gap-1">
            {(["home", "draw", "away"] as const).map((v) => {
              const active = details.ht_winner === v;
              return (
                <button
                  key={v}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ ...details, ht_winner: v })}
                  className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition ${
                    active
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-white/5 text-foreground/40 hover:bg-white/10"
                  } disabled:opacity-40`}
                >
                  {t(`live.${v}`)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {enabled.includes("clean_sheet") && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-foreground/55">
            {t("live.cleanSheet")}
            <span className="ml-1 text-[10px] text-amber-400">
              +{criteria.clean_sheet_pts ?? 1}
            </span>
          </span>
          <div className="flex gap-1">
            {(["home", "away", "none"] as const).map((v) => {
              const active = details.clean_sheet === v;
              return (
                <button
                  key={v}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ ...details, clean_sheet: v })}
                  className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition ${
                    active
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-white/5 text-foreground/40 hover:bg-white/10"
                  } disabled:opacity-40`}
                >
                  {t(`live.${v === "none" ? "noCleanSheet" : v}`)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Match card ────────────────────────────────────────────────────

function MatchCard({
  match,
  myGroups,
}: {
  match: LiveMatch;
  myGroups: { id: string; name: string; bonus_criteria: BonusCriteria }[];
}) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const predictState = useAppSelector((s) => s.predictions);
  const dateLocale = useDateLocale();
  const isLive = match.status === "live";
  const isCompleted = match.status === "completed";
  const isScheduled = match.status === "scheduled";

  const homeFlag = match.home_team?.flag_url;
  const awayFlag = match.away_team?.flag_url;

  const predictions = match.my_predictions ?? {};
  const hasPredictions =
    Object.keys(predictions).filter((k) => !k.startsWith("__")).length > 0;

  const isPredictionLocked =
    match.prediction_lock != null &&
    new Date(match.prediction_lock) <= new Date();

  // Local score inputs, pre-filled from existing predictions
  const [scores, setScores] = useState<
    Record<string, { home: string; away: string }>
  >(() => {
    const init: Record<string, { home: string; away: string }> = {};
    for (const g of myGroups) {
      const existing = match.my_predictions?.[g.id];
      init[g.id] = {
        home: existing !== undefined ? String(existing.predicted_home) : "",
        away: existing !== undefined ? String(existing.predicted_away) : "",
      };
    }
    return init;
  });

  // Local bonus prediction details, pre-filled from existing predictions
  const [bonusDetails, setBonusDetails] = useState<
    Record<string, BonusPredictionDetails>
  >(() => {
    const init: Record<string, BonusPredictionDetails> = {};
    for (const g of myGroups) {
      const existing = match.my_predictions?.[g.id];
      init[g.id] = existing?.details ?? {};
    }
    return init;
  });

  const handleSubmit = (groupId: string, groupName: string) => {
    const s = scores[groupId];
    const h = parseInt(s?.home ?? "", 10);
    const a = parseInt(s?.away ?? "", 10);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return;
    dispatch(
      submitPrediction({
        match_id: match.id,
        group_id: groupId,
        group_name: groupName,
        predicted_home: h,
        predicted_away: a,
        details: bonusDetails[groupId] ?? {},
      }),
    );
  };

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
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-foreground/30">
                <Flag className="h-4 w-4" />
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
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-foreground/30">
                <Flag className="h-4 w-4" />
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

        {/* Predictions per group — read-only for live/completed */}
        {hasPredictions && !isScheduled && (
          <div className="mt-3 space-y-1.5 border-t border-white/6 pt-3">
            {Object.values(predictions)
              .filter((pred) => (pred as LiveMatchPrediction).group_id)
              .map((pred) => {
                const p = pred as LiveMatchPrediction;
                const totalPts = p.points_earned + (p.bonus_pts ?? 0);
                return (
                  <div
                    key={p.group_id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate text-[11px] text-foreground/50">
                      {p.group_name}
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="font-mono text-[11px] text-foreground/60">
                        {p.predicted_home}–{p.predicted_away}
                      </span>
                      {(p.bonus_pts ?? 0) > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                          <Zap className="h-2.5 w-2.5" />+{p.bonus_pts}
                        </span>
                      )}
                      <PredBadge result={p.result} pts={totalPts} />
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* No prediction notice — live/completed only */}
        {!hasPredictions &&
          !isScheduled &&
          myGroups.length > 0 &&
          match.my_predictions !== undefined && (
            <p className="mt-2 text-center text-[11px] text-foreground/30">
              {t("live.noPrediction")}
            </p>
          )}

        {/* Prediction form — upcoming/scheduled matches */}
        {isScheduled && myGroups.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-white/6 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/35">
              {t("live.predict")}
            </p>
            {isPredictionLocked ? (
              <p className="flex items-center gap-1.5 text-[11px] text-foreground/40">
                <Clock className="h-3 w-3" />
                {t("live.predictionLocked")}
              </p>
            ) : (
              myGroups.map((group) => {
                const stateKey = `${group.id}_${match.id}`;
                const isSubmitting = !!predictState.submitting[stateKey];
                const hasSaved = !!predictState.succeeded[stateKey];
                const hasError = predictState.errors[stateKey];
                const s = scores[group.id] ?? { home: "", away: "" };
                const hasPred = !!match.my_predictions?.[group.id];
                const criteria = group.bonus_criteria;
                const hasBonus = (criteria?.enabled ?? []).length > 0;

                return (
                  <div
                    key={group.id}
                    className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-[11px] font-medium text-foreground/60">
                          {group.name}
                        </span>
                        {hasBonus && (
                          <span className="flex h-4 items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 text-[9px] font-semibold text-amber-400">
                            <Target className="h-2 w-2" />+
                            {criteria.enabled.length}
                          </span>
                        )}
                      </div>
                      {hasSaved && (
                        <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-brand">
                          <CheckCircle2 className="h-3 w-3" />
                          {t("live.predictionSaved")}
                        </span>
                      )}
                      {hasError && (
                        <span className="shrink-0 text-[10px] text-red-400">
                          {hasError}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={s.home}
                        onChange={(e) =>
                          setScores((prev) => ({
                            ...prev,
                            [group.id]: {
                              ...prev[group.id],
                              home: e.target.value,
                            },
                          }))
                        }
                        disabled={isSubmitting}
                        placeholder="0"
                        className="w-10 rounded-lg border border-white/10 bg-white/5 px-1 py-1 text-center text-sm font-bold text-white outline-none focus:border-brand/50 disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <span className="text-xs font-bold text-foreground/30">
                        –
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={s.away}
                        onChange={(e) =>
                          setScores((prev) => ({
                            ...prev,
                            [group.id]: {
                              ...prev[group.id],
                              away: e.target.value,
                            },
                          }))
                        }
                        disabled={isSubmitting}
                        placeholder="0"
                        className="w-10 rounded-lg border border-white/10 bg-white/5 px-1 py-1 text-center text-sm font-bold text-white outline-none focus:border-brand/50 disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </div>
                    {/* Bonus criteria fields */}
                    {hasBonus && (
                      <BonusFields
                        groupId={group.id}
                        criteria={criteria}
                        details={bonusDetails[group.id] ?? {}}
                        onChange={(d) =>
                          setBonusDetails((prev) => ({
                            ...prev,
                            [group.id]: d,
                          }))
                        }
                        disabled={isSubmitting}
                      />
                    )}
                    {/* Save button — always below bonus fields so it's clear it saves everything */}
                    {(() => {
                      const d = bonusDetails[group.id] ?? {};
                      const enabled = criteria?.enabled ?? [];
                      const bonusComplete = enabled.every((key) => {
                        if (key === "btts") return d.btts !== undefined;
                        if (key === "total_goals_over")
                          return d.total_goals_over !== undefined;
                        if (key === "ft_winner")
                          return d.ft_winner !== undefined;
                        if (key === "ht_winner")
                          return d.ht_winner !== undefined;
                        if (key === "clean_sheet")
                          return d.clean_sheet !== undefined;
                        return true;
                      });
                      const canSave =
                        !isSubmitting &&
                        s.home !== "" &&
                        s.away !== "" &&
                        bonusComplete;
                      return (
                        <button
                          onClick={() => handleSubmit(group.id, group.name)}
                          disabled={!canSave}
                          className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-brand/15 px-3 text-[11px] font-semibold text-brand transition hover:bg-brand/25 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : hasPred ? (
                            t("live.predictUpdate")
                          ) : (
                            t("live.predictSubmit")
                          )}
                        </button>
                      );
                    })()}
                  </div>
                );
              })
            )}
          </div>
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
  const {
    data,
    loading,
    syncing,
    syncResult,
    syncError,
    testResetting,
    testResetResult,
    testResetError,
  } = useAppSelector((s) => s.live);
  const sessionToken = useAppSelector((s) => s.auth.sessionToken);
  const dateLocale = useDateLocale();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

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

  // Clear test reset feedback after 4 seconds
  useEffect(() => {
    if (testResetResult || testResetError) {
      const t = setTimeout(() => dispatch(clearTestResetResult()), 4000);
      return () => clearTimeout(t);
    }
  }, [testResetResult, testResetError, dispatch]);

  const competition = data?.competition;
  const myGroups = data?.my_active_groups ?? [];
  const lastSynced = data?.last_synced_at;

  // Filter groups shown in match cards — null means show all
  const visibleGroups =
    selectedGroupId !== null
      ? myGroups.filter((g) => g.id === selectedGroupId)
      : myGroups;

  const handleSync = () => {
    dispatch(syncMatches(competition?.id));
  };

  const handleRefresh = () => {
    dispatch(fetchLiveData(competition?.id));
  };

  const handleTestReset = () => {
    dispatch(resetTestLeague(competition?.id));
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

            {/* Reset test data — only visible on test competitions */}
            {competition?.is_test && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleTestReset}
                disabled={testResetting || loading}
                className="h-8 rounded-xl border-amber-500/30 bg-amber-500/10 px-3 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
              >
                {testResetting ? (
                  <>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    {t("live.testLeagueResetting")}
                  </>
                ) : (
                  t("live.testLeagueReset")
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

        {/* Test reset feedback pill */}
        {(testResetResult || testResetError) && (
          <div
            className={`mb-4 rounded-xl border px-4 py-2.5 text-sm ${
              testResetError
                ? "border-red-500/20 bg-red-500/8 text-red-400"
                : "border-amber-500/20 bg-amber-500/8 text-amber-400"
            }`}
          >
            {testResetError ? testResetError : t("live.testLeagueResetDone")}
          </div>
        )}

        {/* Active groups filter */}
        {sessionToken && myGroups.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-foreground/40">
              {t("live.showingForGroups")}:
            </span>
            {myGroups.length > 1 && (
              <button
                onClick={() => setSelectedGroupId(null)}
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition ${
                  selectedGroupId === null
                    ? "border-brand/40 bg-brand/15 text-brand"
                    : "border-white/10 bg-white/5 text-foreground/50 hover:bg-white/10"
                }`}
              >
                {t("live.allGroups")}
              </button>
            )}
            {myGroups.map((g) => (
              <div key={g.id} className="flex items-center gap-0.5">
                <button
                  onClick={() =>
                    setSelectedGroupId(selectedGroupId === g.id ? null : g.id)
                  }
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition ${
                    selectedGroupId === g.id
                      ? "border-brand/40 bg-brand/15 text-brand"
                      : "border-white/10 bg-white/5 text-foreground/50 hover:bg-white/10"
                  }`}
                >
                  {g.name}
                </button>
                <Link
                  to={`/groups/${g.id}`}
                  className="text-foreground/25 hover:text-foreground/50 transition"
                >
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        )}

        {sessionToken && myGroups.length === 0 && data && (
          <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
            <p className="mb-1 text-sm font-semibold text-foreground/70">
              {t("live.noGroupsTitle")}
            </p>
            <p className="mb-4 text-xs text-foreground/40">
              {t("live.noGroupsHint")}
            </p>
            <div className="flex justify-center gap-2">
              <Link
                to="/groups/new"
                className="rounded-full bg-brand px-5 py-2 text-xs font-semibold text-slate-950 hover:bg-brand/90"
              >
                {t("live.createGroup")}
              </Link>
              <Link
                to="/groups"
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold text-foreground/60 hover:bg-white/10"
              >
                {t("live.joinGroup")}
              </Link>
            </div>
          </div>
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
                <MatchCard key={m.id} match={m} myGroups={visibleGroups} />
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
                <MatchCard key={m.id} match={m} myGroups={visibleGroups} />
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
                <MatchCard key={m.id} match={m} myGroups={visibleGroups} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
