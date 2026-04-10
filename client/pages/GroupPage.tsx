import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchGroupById } from "@/store/slices/groupsSlice";
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
} from "lucide-react";
import axios from "axios";
import type { GroupStatus } from "@shared/api";

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
}

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { currentGroup, currentGroupLoading } = useAppSelector((s) => s.groups);
  const userProfile = useAppSelector((s) => s.auth.userProfile);
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
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    if (id) dispatch(fetchGroupById(id));
  }, [dispatch, id]);

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
        { name: trimmed, max_members: settingsMaxMembers },
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
                        <p className="truncate text-sm font-medium text-white">
                          {name}
                          {isMe && (
                            <span className="ml-1.5 text-xs text-brand">
                              {t("groupPage.you")}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-foreground/40">
                          {t("groupPage.streak", { n: entry.current_streak })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">
                          {entry.total_points}
                        </p>
                        <p className="text-xs text-foreground/40">pts</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Invite panel */}
          <div className="space-y-4">
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
        <DialogContent className="glass-panel border-white/10 bg-[hsl(var(--surface))] sm:max-w-sm">
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
