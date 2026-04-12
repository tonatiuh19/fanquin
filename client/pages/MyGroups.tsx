import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMyGroups } from "@/store/slices/groupsSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageMeta } from "@/components/fanquin/page-meta";
import {
  Users,
  Plus,
  ChevronRight,
  Trophy,
  Crown,
  Shield,
  Clock,
  Lock,
  Play,
  Radio,
  CheckCircle2,
  LogIn,
} from "lucide-react";
import type { GroupStatus } from "@shared/api";

export default function MyGroups() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { myGroups, myGroupsLoading } = useAppSelector((s) => s.groups);
  const userProfile = useAppSelector((s) => s.auth.userProfile);
  const sessionToken = useAppSelector((s) => s.auth.sessionToken);

  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionToken) {
      dispatch(fetchMyGroups());
    }
  }, [dispatch, sessionToken]);

  const handleJoin = () => {
    const code = joinCode.trim().toLowerCase().replace(/\s/g, "");
    if (code.length !== 8) {
      setJoinError(t("myGroups.joinInvalid"));
      return;
    }
    navigate(`/join/${code}`);
  };

  if (!sessionToken) {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-6 py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <Users className="h-9 w-9 text-foreground/40" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">
            {t("myGroups.signInTitle")}
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            {t("myGroups.signInSubtitle")}
          </p>
        </div>
        <Button
          onClick={() => navigate("/groups/new")}
          className="rounded-full bg-brand px-8 text-slate-950 hover:bg-brand/90"
        >
          {t("myGroups.createFirst")}
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10 md:py-16">
      <PageMeta
        title={t("seo.myGroups.title")}
        description={t("seo.myGroups.description")}
        canonicalPath="/groups"
        noIndex
      />
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand">
            {t("myGroups.badge")}
          </p>
          <h1 className="font-display text-3xl font-bold text-white">
            {t("myGroups.title")}
          </h1>
          {userProfile && (
            <p className="mt-1 text-sm text-foreground/60">
              {t("myGroups.welcome", {
                name:
                  userProfile.first_name ??
                  userProfile.display_name ??
                  userProfile.username,
              })}
            </p>
          )}
        </div>
        <Button
          onClick={() => navigate("/groups/new")}
          className="flex shrink-0 items-center gap-2 rounded-full bg-brand px-3 text-sm font-semibold text-slate-950 shadow-glow hover:bg-brand/90 sm:px-5"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("myGroups.newGroup")}</span>
        </Button>
      </div>

      {/* Join by code widget */}
      <div className="mb-8 flex flex-col gap-2 rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 shrink-0">
          <LogIn className="h-4 w-4 text-brand" />
          <span className="text-sm font-medium text-foreground/70">
            {t("myGroups.joinTitle")}
          </span>
        </div>
        <div className="flex flex-1 gap-2">
          <Input
            value={joinCode}
            onChange={(e) => {
              setJoinCode(e.target.value.toUpperCase());
              setJoinError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            placeholder={t("myGroups.joinPlaceholder")}
            maxLength={8}
            className="rounded-xl border-white/15 bg-white/5 font-mono uppercase tracking-widest text-white placeholder:text-foreground/30 focus:border-brand/50"
          />
          <Button
            onClick={handleJoin}
            disabled={!joinCode.trim()}
            className="shrink-0 rounded-full bg-brand px-5 text-sm font-semibold text-slate-950 hover:bg-brand/90 disabled:opacity-40"
          >
            {t("myGroups.joinButton")}
          </Button>
        </div>
        {joinError && (
          <p className="text-xs text-rose-400 sm:hidden">{joinError}</p>
        )}
      </div>
      {joinError && (
        <p className="-mt-6 mb-6 hidden text-xs text-rose-400 sm:block">
          {joinError}
        </p>
      )}

      {/* Groups grid */}
      {myGroupsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-[1.4rem] bg-white/5" />
          ))}
        </div>
      ) : myGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
            <Trophy className="h-9 w-9 text-foreground/30" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-white">
              {t("myGroups.emptyTitle")}
            </h2>
            <p className="mt-2 text-sm text-foreground/60">
              {t("myGroups.emptySubtitle")}
            </p>
          </div>
          <Button
            onClick={() => navigate("/groups/new")}
            className="rounded-full bg-brand px-8 text-slate-950 hover:bg-brand/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("myGroups.createFirst")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myGroups.map((group) => {
            const isOwner = group.owner_id === userProfile?.id;
            const grpStatus: GroupStatus =
              (group.status as GroupStatus) ?? "waiting";
            const statusPill: Record<
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
                color:
                  "border-emerald-400/20 bg-emerald-400/10 text-emerald-400",
                icon: <Radio className="h-3 w-3" />,
              },
              completed: {
                color: "border-white/10 bg-white/5 text-foreground/40",
                icon: <CheckCircle2 className="h-3 w-3" />,
              },
            };
            const sCfg = statusPill[grpStatus];
            return (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="group relative flex flex-col gap-4 rounded-[1.4rem] border border-white/10 bg-white/5 p-5 transition hover:border-brand/30 hover:bg-white/[0.07]"
              >
                {/* Mode + status badges */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full border border-brand/20 bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-brand">
                      {group.mode}
                    </span>
                    <span
                      className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${sCfg.color}`}
                    >
                      {sCfg.icon}
                      {t(`groupPage.status.${grpStatus}`)}
                    </span>
                  </div>
                  {isOwner ? (
                    <Crown className="h-4 w-4 shrink-0 text-amber-400" />
                  ) : (
                    <Shield className="h-4 w-4 shrink-0 text-foreground/30" />
                  )}
                </div>

                {/* Name */}
                <div>
                  <h3 className="font-display text-lg font-semibold text-white group-hover:text-brand transition-colors">
                    {group.name}
                  </h3>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-foreground/50">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {(group as any).member_count ?? 1} / {group.max_members}
                    </span>
                    <span className="rounded bg-white/5 px-2 py-0.5">
                      {group.draft_type}
                    </span>
                    <span className="flex items-center gap-1 text-brand/70">
                      <Lock className="h-3 w-3" />
                      {t("groupPage.private")}
                    </span>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-end text-xs font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100">
                  {t("myGroups.openGroup")}
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
