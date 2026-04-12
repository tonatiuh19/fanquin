import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchGroupById } from "@/store/slices/groupsSlice";
import { fetchSurvivor, clearSurvivor } from "@/store/slices/survivorSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageMeta } from "@/components/fanquin/page-meta";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Users,
  Copy,
  Check,
  Crown,
  ChevronLeft,
  Trophy,
  Link2,
  Lock,
  Settings,
  Shield,
  Play,
  Loader2,
  Clock,
  Radio,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Info,
  Zap,
  Heart,
  BarChart2,
  Skull,
} from "lucide-react";
import axios from "axios";
import type {
  GroupStatus,
  BonusCriteria,
  BonusCriterionKey,
} from "@shared/api";

const BONUS_CRITERION_KEYS: BonusCriterionKey[] = [
  "btts",
  "total_goals_over",
  "ft_winner",
  "ht_winner",
  "clean_sheet",
];

const DEFAULT_BONUS_CRITERIA: BonusCriteria = {
  enabled: [],
  btts_pts: 2,
  total_goals_over_pts: 2,
  total_goals_threshold: 2.5,
  ft_winner_pts: 2,
  ht_winner_pts: 2,
  clean_sheet_pts: 1,
};

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  total_points: number;
  prediction_pts: number;
  ownership_pts: number;
  current_streak: number;
  elo_rating?: number;
  is_eliminated?: boolean;
  survivor_lives?: number;
}

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { currentGroup, currentGroupLoading } = useAppSelector((s) => s.groups);
  const userProfile = useAppSelector((s) => s.auth.userProfile);
  const { data: survivorData, loading: survivorLoading } = useAppSelector(
    (s) => s.survivor,
  );
  const sessionToken = useAppSelector(
    (s) => s.auth.sessionToken ?? localStorage.getItem("fanquin_session"),
  );

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Settings dialog state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsName, setSettingsName] = useState("");
  const [settingsMaxMembers, setSettingsMaxMembers] = useState(50);
  const [settingsBonusCriteria, setSettingsBonusCriteria] =
    useState<BonusCriteria>(DEFAULT_BONUS_CRITERIA);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    if (id) dispatch(fetchGroupById(id));
    return () => {
      dispatch(clearSurvivor());
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (!id || !currentGroup) return;
    if (
      currentGroup.status === "active" &&
      (currentGroup.mode === "competitive" || currentGroup.mode === "global")
    ) {
      dispatch(fetchSurvivor(id));
    }
  }, [dispatch, id, currentGroup?.status, currentGroup?.mode]);

  useEffect(() => {
    if (!id || !sessionToken) return;
    setLbLoading(true);
    axios
      .get<{ success: boolean; data: LeaderboardEntry[] }>(
        `/api/groups/${id}/leaderboard`,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      )
      .then((res) => setLeaderboard(res.data.data ?? []))
      .catch(() => setLeaderboard([]))
      .finally(() => setLbLoading(false));
  }, [id, sessionToken]);

  const inviteLink = currentGroup
    ? `${window.location.origin}/join/${currentGroup.invite_code}`
    : "";

  const handleCopy = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isOwner = currentGroup?.owner_id === userProfile?.id;

  const handleStartGroup = async () => {
    if (!id || !sessionToken) return;
    setStarting(true);
    setStartError(null);
    try {
      await axios.patch(
        `/api/groups/${id}/start`,
        {},
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      dispatch(fetchGroupById(id));
    } catch {
      setStartError(t("groupPage.startError"));
    } finally {
      setStarting(false);
    }
  };

  const handleOpenSettings = () => {
    if (!currentGroup) return;
    setSettingsName(currentGroup.name);
    setSettingsMaxMembers(currentGroup.max_members);
    setSettingsBonusCriteria({
      ...DEFAULT_BONUS_CRITERIA,
      ...((currentGroup as any).bonus_criteria ?? {}),
    });
    setSettingsError(null);
    setSettingsSaved(false);
    setSettingsOpen(true);
  };

  const handleSaveSettings = async () => {
    if (!id || !sessionToken) return;
    const trimmed = settingsName.trim();
    if (trimmed.length < 3 || trimmed.length > 60) {
      setSettingsError(t("createGroup.step2.nameMin"));
      return;
    }
    setSettingsSaving(true);
    setSettingsError(null);
    try {
      await axios.patch(
        `/api/groups/${id}`,
        {
          name: trimmed,
          max_members: settingsMaxMembers,
          bonus_criteria: settingsBonusCriteria,
        },
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      dispatch(fetchGroupById(id));
      setSettingsSaved(true);
      setTimeout(() => {
        setSettingsOpen(false);
        setSettingsSaved(false);
      }, 1200);
    } catch (err: any) {
      setSettingsError(
        err?.response?.data?.message ?? t("groupPage.settingsSaveError"),
      );
    } finally {
      setSettingsSaving(false);
    }
  };

  const statusConfig: Record<
    GroupStatus,
    { color: string; icon: React.ReactNode }
  > = {
    waiting: {
      color: "border-amber-400/20 bg-amber-400/10 text-amber-400",
      icon: <Clock className="h-3 w-3" />,
    },
    draft: {
      color: "border-purple-400/20 bg-purple-400/10 text-purple-400",
      icon: <Play className="h-3 w-3" />,
    },
    active: {
      color: "border-emerald-400/20 bg-emerald-400/10 text-emerald-400",
      icon: <Radio className="h-3 w-3" />,
    },
    completed: {
      color: "border-white/10 bg-white/5 text-foreground/40",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
  };

  const status: GroupStatus =
    (currentGroup?.status as GroupStatus) ?? "waiting";
  const statusCfg = statusConfig[status];

  if (currentGroupLoading) {
    return (
      <div className="container py-10 space-y-4">
        <Skeleton className="h-8 w-48 rounded-xl bg-white/5" />
        <Skeleton className="h-40 rounded-[1.4rem] bg-white/5" />
        <Skeleton className="h-64 rounded-[1.4rem] bg-white/5" />
      </div>
    );
  }

  if (!currentGroup) {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <Shield className="h-12 w-12 text-foreground/30" />
        <p className="text-foreground/60">{t("groupPage.notFound")}</p>
        <Button
          variant="ghost"
          className="rounded-full border border-white/10"
          onClick={() => navigate("/groups")}
        >
          {t("groupPage.backToGroups")}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="container py-10 md:py-16">
        <PageMeta
          title={t("seo.group.titleTemplate", { name: currentGroup.name })}
          description={t("seo.group.descriptionTemplate", {
            name: currentGroup.name,
          })}
          noIndex
        />
        {/* Back */}
        <button
          onClick={() => navigate("/groups")}
          className="mb-6 flex items-center gap-1.5 text-sm text-foreground/50 transition hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("groupPage.backToGroups")}
        </button>

        {/* Hero card */}
        <div className="mb-6 rounded-[1.6rem] border border-white/10 bg-white/5 p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-brand/20 bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-brand">
                  {currentGroup.mode}
                </span>
                {/* Status badge */}
                <span
                  className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusCfg.color}`}
                >
                  {statusCfg.icon}
                  {t(`groupPage.status.${status}`)}
                </span>
                {isOwner && (
                  <span className="flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
                    <Crown className="h-3 w-3" />
                    {t("groupPage.owner")}
                  </span>
                )}
              </div>
              <span className="flex w-fit items-center gap-1 rounded-full border border-brand/20 bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                <Lock className="h-3 w-3" />
                {t("groupPage.private")}
              </span>
              <h1 className="font-display text-2xl font-bold text-white md:text-3xl">
                {currentGroup.name}
              </h1>
              <div className="mt-2 flex items-center gap-3 text-sm text-foreground/50">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {(currentGroup as any).member_count ?? 1} /{" "}
                  {currentGroup.max_members} {t("groupPage.members")}
                </span>
                <span className="rounded bg-white/5 px-2 py-0.5 text-xs">
                  {currentGroup.draft_type}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {isOwner && status === "waiting" && (
                <Button
                  onClick={handleStartGroup}
                  disabled={starting}
                  className="flex items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-slate-950 shadow-glow hover:bg-brand/90 disabled:opacity-50"
                >
                  {starting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {t("groupPage.startGroup")}
                </Button>
              )}
              {isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenSettings}
                  className="rounded-full border border-white/10 text-foreground/60 hover:text-white"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  {t("groupPage.settings")}
                </Button>
              )}
            </div>
          </div>

          {/* Status hint */}
          <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm text-foreground/60">
            {t(`groupPage.statusHint.${status}`)}
          </div>

          {/* Draft Room CTA — shown while draft is open */}
          {status === "draft" && (
            <Link
              to={`/groups/${id}/draft`}
              className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-purple-400/20 bg-purple-400/5 px-4 py-3 text-sm font-medium text-purple-300 transition hover:bg-purple-400/10"
            >
              <span className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                {t("draft.title")} — {t("draft.round", { n: "..." })}
              </span>
              <span className="text-xs text-purple-400/60">→</span>
            </Link>
          )}
          {startError && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-400">
              <XCircle className="h-3.5 w-3.5" /> {startError}
            </p>
          )}

          {/* Snake draft explainer — shown when draft_type is snake */}
          {currentGroup.draft_type === "snake" &&
            (status === "waiting" || status === "draft") && (
              <Collapsible className="mt-3">
                <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-foreground/50 transition hover:text-foreground/80">
                  <Info className="h-3.5 w-3.5 text-brand" />
                  {t("groupPage.snakeExplain")}
                  <ChevronDown className="h-3.5 w-3.5" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-4 space-y-3">
                  {/* Intro */}
                  <p className="text-xs text-foreground/60 leading-relaxed">
                    {t("groupPage.snakeExplainIntro")}
                  </p>

                  {/* Rules */}
                  <ul className="space-y-1">
                    {(
                      [
                        "snakeExplainRule1",
                        "snakeExplainRule2",
                        "snakeExplainRule3",
                      ] as const
                    ).map((key) => (
                      <li
                        key={key}
                        className="flex items-start gap-2 text-xs text-foreground/55 leading-relaxed"
                      >
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand/60" />
                        {t(`groupPage.${key}`)}
                      </li>
                    ))}
                  </ul>

                  {/* Example */}
                  <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2.5 space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-brand/70">
                      {t("groupPage.snakeExplainExLabel")}
                    </p>
                    {(
                      [
                        "snakeExplainExRow1",
                        "snakeExplainExRow2",
                        "snakeExplainExRow3",
                      ] as const
                    ).map((key) => (
                      <p
                        key={key}
                        className="font-mono text-[11px] text-foreground/55"
                      >
                        {t(`groupPage.${key}`)}
                      </p>
                    ))}
                  </div>

                  {/* Fairness note */}
                  <p className="text-xs text-foreground/45 leading-relaxed italic">
                    {t("groupPage.snakeExplainFair")}
                  </p>
                </CollapsibleContent>
              </Collapsible>
            )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Leaderboard */}
          <div className="lg:col-span-2 rounded-[1.4rem] border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-brand" />
              <h2 className="font-display text-base font-semibold text-white">
                {t("groupPage.leaderboard")}
              </h2>
            </div>

            {lbLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 rounded-xl bg-white/5" />
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <p className="py-10 text-center text-sm text-foreground/40">
                {t("groupPage.noScores")}
              </p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, i) => {
                  const firstLast =
                    `${entry.first_name ?? ""} ${entry.last_name ?? ""}`.trim();
                  const name =
                    entry.display_name ||
                    firstLast ||
                    entry.username ||
                    t("groupPage.anonymous");
                  const initials = name
                    .split(" ")
                    .map((w: string) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  const isMe = entry.user_id === userProfile?.id;
                  const medalColors = [
                    "text-amber-400",
                    "text-slate-300",
                    "text-amber-600",
                  ];
                  return (
                    <div
                      key={entry.user_id}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${isMe ? "border border-brand/25 bg-brand/10" : "hover:bg-white/5"}`}
                    >
                      <span
                        className={`w-6 text-center text-sm font-bold ${medalColors[i] ?? "text-foreground/40"}`}
                      >
                        {i + 1}
                      </span>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={entry.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-brand/20 text-brand text-xs font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`truncate text-sm font-medium ${entry.is_eliminated ? "line-through text-foreground/40" : "text-white"}`}
                        >
                          {name}
                          {isMe && (
                            <span className="ml-1.5 text-xs text-brand">
                              {t("groupPage.you")}
                            </span>
                          )}
                          {entry.is_eliminated && (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-400">
                              <Skull className="h-2.5 w-2.5" />
                              {t("groupPage.eliminated")}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-foreground/40">
                          {t("groupPage.streak", { n: entry.current_streak })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.elo_rating !== undefined &&
                          (currentGroup.mode === "league" ||
                            currentGroup.mode === "competitive") && (
                            <span className="flex items-center gap-0.5 rounded-full border border-blue-400/20 bg-blue-400/10 px-2 py-0.5 text-[11px] font-semibold text-blue-400">
                              <BarChart2 className="h-3 w-3" />
                              {entry.elo_rating}
                            </span>
                          )}
                        <div className="text-right">
                          <p className="text-sm font-bold text-white">
                            {entry.total_points}
                          </p>
                          <p className="text-xs text-foreground/40">pts</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Invite panel — only shown while group is still accepting members */}
          <div className="space-y-4">
            {currentGroup.status === "waiting" && (
              <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-brand" />
                  <h2 className="font-display text-base font-semibold text-white">
                    {t("groupPage.invite")}
                  </h2>
                </div>

                {/* Code */}
                <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                  <p className="mb-1 text-xs text-foreground/50">
                    {t("groupPage.inviteCode")}
                  </p>
                  <p className="font-display text-2xl font-bold tracking-[0.25em] text-brand">
                    {currentGroup.invite_code.toUpperCase()}
                  </p>
                </div>

                {/* Link */}
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-foreground/60">
                  <span className="flex-1 truncate">{inviteLink}</span>
                  <button
                    onClick={handleCopy}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition hover:bg-white/10 hover:text-white"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-brand" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                <Button
                  onClick={handleCopy}
                  className="mt-4 w-full rounded-full bg-brand text-sm font-semibold text-slate-950 hover:bg-brand/90"
                >
                  {copied ? t("groupPage.copied") : t("groupPage.copyLink")}
                </Button>
              </div>
            )}{" "}
            {/* end waiting-only invite panel */}
            {/* Survivor panel — competitive/global active groups */}
            {currentGroup.status === "active" &&
              (currentGroup.mode === "competitive" ||
                currentGroup.mode === "global") && (
                <div className="rounded-[1.4rem] border border-rose-400/20 bg-rose-400/5 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-rose-400" />
                    <h2 className="font-display text-base font-semibold text-white">
                      {t("groupPage.survivorPanel")}
                    </h2>
                  </div>
                  {survivorLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-8 rounded-lg bg-white/5 animate-pulse"
                        />
                      ))}
                    </div>
                  ) : survivorData ? (
                    <div className="space-y-2">
                      {survivorData.members.map((m) => {
                        const lbEntry = leaderboard.find(
                          (e) => e.user_id === m.user_id,
                        );
                        const memberName = lbEntry
                          ? lbEntry.display_name ||
                            `${lbEntry.first_name ?? ""} ${lbEntry.last_name ?? ""}`.trim() ||
                            lbEntry.username
                          : m.user_id.slice(0, 8);
                        const isMe = m.user_id === userProfile?.id;
                        return (
                          <div
                            key={m.user_id}
                            className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                              m.is_eliminated
                                ? "opacity-40"
                                : isMe
                                  ? "border border-brand/20 bg-brand/5"
                                  : "bg-white/[0.03]"
                            }`}
                          >
                            <p
                              className={`text-sm font-medium ${m.is_eliminated ? "line-through text-foreground/40" : "text-white"}`}
                            >
                              {memberName}
                              {isMe && (
                                <span className="ml-1 text-xs text-brand">
                                  {t("groupPage.you")}
                                </span>
                              )}
                            </p>
                            <div className="flex items-center gap-0.5">
                              {m.is_eliminated ? (
                                <span className="text-xs text-rose-400">
                                  {t("groupPage.eliminated")}
                                </span>
                              ) : (
                                Array.from({
                                  length: survivorData.survivor_lives_start,
                                }).map((_, i) => (
                                  <Heart
                                    key={i}
                                    className={`h-3.5 w-3.5 ${
                                      i < m.survivor_lives
                                        ? "fill-rose-400 text-rose-400"
                                        : "text-foreground/20"
                                    }`}
                                  />
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-foreground/40">
                      {t("groupPage.survivorPanelEmpty")}
                    </p>
                  )}
                </div>
              )}
            {/* Predict matches CTA — shown when group is active */}
            {currentGroup.status === "active" && (
              <div className="rounded-[1.4rem] border border-brand/20 bg-brand/5 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-brand" />
                  <h2 className="font-display text-base font-semibold text-white">
                    {t("groupPage.predictTitle")}
                  </h2>
                </div>
                <p className="mb-4 text-sm text-foreground/60">
                  {t("groupPage.predictBody")}
                </p>
                <Button
                  asChild
                  className="w-full rounded-full bg-brand text-sm font-semibold text-slate-950 hover:bg-brand/90"
                >
                  <Link to="/live">
                    <Radio className="mr-2 h-4 w-4" />
                    {t("groupPage.goPredict")}
                  </Link>
                </Button>
              </div>
            )}
            {/* Quick actions */}
            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-5 space-y-2">
              <h2 className="font-display text-base font-semibold text-white mb-3">
                {t("groupPage.quickActions")}
              </h2>
              <Button
                asChild
                variant="ghost"
                className="w-full justify-start rounded-xl border border-white/5 text-sm text-foreground/70 hover:text-white hover:bg-white/10"
              >
                <Link to="/groups/new">
                  <Users className="mr-2 h-4 w-4" />
                  {t("groupPage.createAnother")}
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start rounded-xl border border-white/5 text-sm text-foreground/70 hover:text-white hover:bg-white/10"
                onClick={() => navigate("/groups")}
              >
                <Trophy className="mr-2 h-4 w-4" />
                {t("groupPage.allMyGroups")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="glass-panel border-white/10 bg-[hsl(var(--surface))] sm:max-w-md">
          <DialogHeader className="space-y-1">
            <DialogTitle className="font-display text-lg font-semibold text-white">
              {t("groupPage.settingsTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm text-foreground/55">
              {status === "waiting"
                ? t("groupPage.settingsSubtitle")
                : t("groupPage.settingsLockedHint")}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="settings-name"
                className="text-sm text-foreground/80"
              >
                {t("groupPage.settingsNameLabel")}
              </Label>
              <Input
                id="settings-name"
                value={settingsName}
                onChange={(e) => {
                  setSettingsName(e.target.value);
                  setSettingsError(null);
                }}
                disabled={settingsSaving || status !== "waiting"}
                maxLength={60}
                className="rounded-xl border-white/15 bg-white/5 text-white placeholder:text-foreground/30 focus:border-brand/50"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="settings-max"
                className="text-sm text-foreground/80"
              >
                {t("groupPage.settingsMaxMembersLabel")}
              </Label>
              <Input
                id="settings-max"
                type="number"
                min={2}
                max={100}
                value={settingsMaxMembers}
                onChange={(e) => setSettingsMaxMembers(Number(e.target.value))}
                disabled={settingsSaving || status !== "waiting"}
                className="rounded-xl border-white/15 bg-white/5 text-white focus:border-brand/50"
              />
            </div>

            {/* Bonus prediction criteria */}
            {status === "waiting" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  <Label className="text-sm text-foreground/80">
                    {t("groupPage.bonusCriteriaLabel")}
                  </Label>
                </div>
                <p className="text-xs text-foreground/45">
                  {t("groupPage.bonusCriteriaHint")}
                </p>
                <div className="space-y-3">
                  {BONUS_CRITERION_KEYS.map((key) => {
                    const isEnabled =
                      settingsBonusCriteria.enabled.includes(key);
                    const ptsKey =
                      `${key === "btts" ? "btts_pts" : key === "total_goals_over" ? "total_goals_over_pts" : key === "ft_winner" ? "ft_winner_pts" : key === "ht_winner" ? "ht_winner_pts" : "clean_sheet_pts"}` as keyof Omit<
                        BonusCriteria,
                        "enabled"
                      >;
                    return (
                      <div
                        key={key}
                        className={`rounded-xl border px-3 py-2.5 transition-all ${
                          isEnabled
                            ? "border-amber-500/30 bg-amber-500/5"
                            : "border-white/8 bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <button
                              type="button"
                              disabled={settingsSaving}
                              onClick={() => {
                                setSettingsBonusCriteria((prev) => ({
                                  ...prev,
                                  enabled: isEnabled
                                    ? prev.enabled.filter((k) => k !== key)
                                    : [...prev.enabled, key],
                                }));
                              }}
                              className={`relative flex h-4 w-7 shrink-0 rounded-full transition-colors ${
                                isEnabled ? "bg-amber-500" : "bg-white/15"
                              } disabled:opacity-40`}
                            >
                              <span
                                className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${
                                  isEnabled ? "left-3.5" : "left-0.5"
                                }`}
                              />
                            </button>
                            <span className="text-[12px] font-medium text-foreground/75">
                              {t(`groupPage.bonus.${key}.label`)}
                            </span>
                          </div>
                          {isEnabled && (
                            <div className="flex shrink-0 items-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                max={50}
                                value={settingsBonusCriteria[ptsKey] as number}
                                onChange={(e) =>
                                  setSettingsBonusCriteria((prev) => ({
                                    ...prev,
                                    [ptsKey]: Number(e.target.value),
                                  }))
                                }
                                disabled={settingsSaving}
                                className="w-10 rounded-lg border border-amber-500/30 bg-amber-500/10 px-1 py-0.5 text-center text-[12px] font-bold text-amber-300 outline-none focus:border-amber-500/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                              <span className="text-[10px] text-foreground/40">
                                {t("live.pts")}
                              </span>
                            </div>
                          )}
                        </div>
                        {isEnabled && key === "total_goals_over" && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[11px] text-foreground/50">
                              {t("groupPage.bonus.threshold")}:
                            </span>
                            <div className="flex gap-1">
                              {[1.5, 2.5, 3.5, 4.5].map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  disabled={settingsSaving}
                                  onClick={() =>
                                    setSettingsBonusCriteria((prev) => ({
                                      ...prev,
                                      total_goals_threshold: v,
                                    }))
                                  }
                                  className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold transition ${
                                    settingsBonusCriteria.total_goals_threshold ===
                                    v
                                      ? "bg-amber-500/20 text-amber-300"
                                      : "bg-white/5 text-foreground/40 hover:bg-white/10"
                                  } disabled:opacity-40`}
                                >
                                  {v}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {isEnabled && (
                          <p className="mt-1.5 text-[10px] text-foreground/40">
                            {t(`groupPage.bonus.${key}.hint`)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {settingsError && (
              <p className="text-xs text-rose-400">{settingsError}</p>
            )}

            <Button
              onClick={handleSaveSettings}
              disabled={settingsSaving || settingsSaved || status !== "waiting"}
              className="w-full rounded-full bg-brand text-sm font-semibold text-slate-950 hover:bg-brand/90 disabled:opacity-50"
            >
              {settingsSaved ? (
                t("groupPage.settingsSaved")
              ) : settingsSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("groupPage.settingsSave")
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
