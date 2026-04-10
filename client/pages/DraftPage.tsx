import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchDraftState,
  submitPick,
  clearPickError,
} from "@/store/slices/draftSlice";
import { fetchGroupById } from "@/store/slices/groupsSlice";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { PageMeta } from "@/components/fanquin/page-meta";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  Trophy,
  Loader2,
  Crown,
  RefreshCw,
} from "lucide-react";
import type { Team, DraftPick, GroupMember } from "@shared/api";

// ── Helper: compute pick owner for a given pick index in snake order ──
function computePicker(
  pickIndex: number,
  memberOrder: string[],
): string | null {
  if (!memberOrder.length) return null;
  const m = memberOrder.length;
  const round0 = Math.floor(pickIndex / m);
  const posInRound = pickIndex % m;
  const idx = round0 % 2 === 0 ? posInRound : m - 1 - posInRound;
  return memberOrder[idx];
}

// ── Tier badge helper ──────────────────────────────────────────────
const TIER_COLORS: Record<number, string> = {
  1: "border-amber-400/40 bg-amber-400/10 text-amber-400",
  2: "border-sky-400/40 bg-sky-400/10 text-sky-400",
  3: "border-slate-400/30 bg-slate-400/10 text-slate-400",
};

function TierBadge({ tier }: { tier: number }) {
  const { t } = useTranslation();
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${TIER_COLORS[tier] ?? TIER_COLORS[3]}`}
    >
      {t("draft.tier", { n: tier })}
    </span>
  );
}

// ── Member avatar chip ─────────────────────────────────────────────
function MemberChip({
  member,
  isActive,
  isSelf,
}: {
  member: GroupMember;
  isActive: boolean;
  isSelf: boolean;
}) {
  const name = member.display_name || member.username;
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all ${
        isActive
          ? "border-brand/40 bg-brand/10 text-white shadow-glow"
          : "border-white/10 bg-white/5 text-foreground/60"
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          isActive
            ? "bg-brand text-slate-950"
            : "bg-white/10 text-foreground/60"
        }`}
      >
        {name.charAt(0).toUpperCase()}
      </span>
      <span className="truncate max-w-[90px]">{name}</span>
      {isSelf && (
        <span className="ml-auto shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-foreground/50">
          you
        </span>
      )}
      {isActive && <Crown className="ml-1 h-3.5 w-3.5 shrink-0 text-brand" />}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────

export default function DraftPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const userProfile = useAppSelector((s) => s.auth.userProfile);
  const { draftState, loading, submitting, pickError } = useAppSelector(
    (s) => s.draft,
  );

  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [justRefreshed, setJustRefreshed] = useState(false);
  const [mobileTab, setMobileTab] = useState<"teams" | "board">("teams");

  const handleManualRefresh = () => {
    if (!id || loading) return;
    dispatch(fetchDraftState(id));
    setCountdown(15);
    setJustRefreshed(true);
    setTimeout(() => setJustRefreshed(false), 1500);
  };

  // Load draft state
  useEffect(() => {
    if (id) dispatch(fetchDraftState(id));
  }, [dispatch, id]);

  // Poll every 15 s so other players' picks show up
  useEffect(() => {
    if (!id) return;
    const interval = setInterval(() => {
      dispatch(fetchDraftState(id));
      setCountdown(15);
      setJustRefreshed(true);
      setTimeout(() => setJustRefreshed(false), 1500);
    }, 15_000);
    return () => clearInterval(interval);
  }, [dispatch, id]);

  // Countdown ticker
  useEffect(() => {
    if (!id) return;
    const tick = setInterval(
      () => setCountdown((c) => (c > 0 ? c - 1 : 0)),
      1000,
    );
    return () => clearInterval(tick);
  }, [id]);

  const handlePick = (team: Team) => {
    setSelectedTeam(team);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedTeam || !id) return;
    setConfirmOpen(false);
    const result = await dispatch(
      submitPick({ groupId: id, team_id: selectedTeam.id }),
    );
    if (submitPick.fulfilled.match(result)) {
      dispatch(fetchDraftState(id));
      if (result.payload.is_complete) {
        dispatch(fetchGroupById(id));
      }
    }
    setSelectedTeam(null);
  };

  if (loading && !draftState) {
    return (
      <div className="container py-10">
        <Skeleton className="mb-4 h-8 w-48 rounded-full bg-white/5" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-[1.2rem] bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  // Draft complete — redirect to group
  if (draftState?.session.is_complete) {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-6 py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            {t("draft.draftComplete")}
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            {t("draft.draftCompleteBody")}
          </p>
        </div>
        <Button
          onClick={() => navigate(`/groups/${id}`)}
          className="rounded-full bg-brand px-8 text-slate-950 hover:bg-brand/90"
        >
          {t("draft.goToGroup")}
        </Button>
      </div>
    );
  }

  if (!draftState) {
    return (
      <div className="container py-20 text-center text-foreground/60">
        <p>{t("groupPage.notFound")}</p>
      </div>
    );
  }

  const { session, picks, available_teams, members } = draftState;
  const isMyTurn = session.current_picker_id === userProfile?.id;

  // Group available teams by tier
  const teamsByTier = available_teams.reduce<Record<number, Team[]>>(
    (acc, t) => {
      const tier = t.tier ?? 3;
      if (!acc[tier]) acc[tier] = [];
      acc[tier].push(t);
      return acc;
    },
    {},
  );

  const filteredTiers = Object.entries(teamsByTier)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([tier, teams]) => ({
      tier: Number(tier),
      teams: teams.filter((t) =>
        search
          ? t.name.toLowerCase().includes(search.toLowerCase()) ||
            (t.short_name ?? "").toLowerCase().includes(search.toLowerCase())
          : true,
      ),
    }))
    .filter((t) => t.teams.length > 0);

  // Member lookup
  const memberMap = Object.fromEntries(members.map((m) => [m.user_id, m]));

  // Picks grouped by member (for sidebar)
  const picksByMember: Record<string, DraftPick[]> = {};
  for (const pick of picks) {
    if (!picksByMember[pick.user_id]) picksByMember[pick.user_id] = [];
    picksByMember[pick.user_id].push(pick);
  }

  return (
    <div className="container py-10 md:py-14">
      <PageMeta
        title={t("seo.draft.title")}
        description={t("seo.draft.description")}
        noIndex
      />
      {/* Back + header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          to={`/groups/${id}`}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-foreground/60 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("groupPage.backToGroups")}
        </Link>
        <button
          onClick={handleManualRefresh}
          disabled={loading}
          title={t("draft.refresh")}
          className="group relative ml-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:border-brand/40 hover:bg-brand/10 disabled:opacity-50"
        >
          {/* SVG countdown ring */}
          <svg
            className="absolute inset-0 h-full w-full -rotate-90"
            viewBox="0 0 36 36"
          >
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-white/5"
            />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${2 * Math.PI * 15}`}
              strokeDashoffset={`${2 * Math.PI * 15 * (1 - countdown / 15)}`}
              strokeLinecap="round"
              className={`transition-all duration-1000 ${justRefreshed ? "text-brand" : "text-brand/50"}`}
            />
          </svg>
          <RefreshCw
            className={`relative h-3.5 w-3.5 transition-colors ${loading ? "animate-spin text-brand" : justRefreshed ? "text-brand" : "text-foreground/40 group-hover:text-brand"}`}
          />
        </button>
      </div>

      {/* Status banner */}
      <div className="mb-6 rounded-[1.4rem] border border-white/10 bg-white/5 p-5 md:p-6">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-brand/20 bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-brand">
            {t("draft.badge")}
          </span>
          <span className="rounded-full border border-purple-400/20 bg-purple-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-purple-400">
            {t("draft.round", { n: session.round })}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-foreground/50">
            {t("draft.pickNumber", { n: session.current_pick + 1 })} /{" "}
            {session.total_picks}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {isMyTurn ? (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
              </span>
              <span className="text-lg font-bold text-white">
                {t("draft.yourTurn")}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-foreground/60">
              <Clock className="h-4 w-4" />
              <span className="text-sm">
                {t("draft.waitingFor", {
                  name:
                    memberMap[session.current_picker_id ?? ""]?.display_name ??
                    memberMap[session.current_picker_id ?? ""]?.username ??
                    "...",
                })}
              </span>
            </div>
          )}
        </div>

        {/* Draft order chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {session.member_order.map((uid, i) => {
            const member = memberMap[uid];
            if (!member) return null;
            return (
              <MemberChip
                key={uid}
                member={member}
                isActive={uid === session.current_picker_id}
                isSelf={uid === userProfile?.id}
              />
            );
          })}
        </div>
      </div>

      {pickError && (
        <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {pickError}
          <button
            onClick={() => dispatch(clearPickError())}
            className="ml-2 underline"
          >
            {t("draft.cancel")}
          </button>
        </div>
      )}

      {/* Mobile tab switcher */}
      <div className="mb-4 flex rounded-full border border-white/10 bg-white/5 p-1 lg:hidden">
        <button
          onClick={() => setMobileTab("teams")}
          className={`flex-1 rounded-full py-2 text-xs font-semibold transition ${
            mobileTab === "teams"
              ? "bg-brand text-slate-950"
              : "text-foreground/60 hover:text-white"
          }`}
        >
          {t("draft.available")}
        </button>
        <button
          onClick={() => setMobileTab("board")}
          className={`flex-1 rounded-full py-2 text-xs font-semibold transition ${
            mobileTab === "board"
              ? "bg-brand text-slate-950"
              : "text-foreground/60 hover:text-white"
          }`}
        >
          {t("draft.boardTitle")}
          {picks.length > 0 && (
            <span
              className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                mobileTab === "board"
                  ? "bg-slate-950/30"
                  : "bg-white/10 text-white"
              }`}
            >
              {picks.length}
            </span>
          )}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* LEFT — available teams */}
        <div className={mobileTab === "board" ? "hidden lg:block" : ""}>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="hidden font-display text-lg font-semibold text-white lg:block">
              {t("draft.available")}
            </h2>
            <div className="relative w-full lg:ml-auto lg:w-48">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/40" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("draft.search")}
                className="h-9 rounded-full bg-white/5 border-white/10 pl-8 text-xs text-white placeholder:text-foreground/40"
              />
            </div>
          </div>

          {filteredTiers.length === 0 ? (
            <p className="text-sm text-foreground/40">{t("draft.noPicks")}</p>
          ) : (
            filteredTiers.map(({ tier, teams }) => (
              <div key={tier} className="mb-5">
                <div className="mb-2 flex items-center gap-2">
                  <TierBadge tier={tier} />
                  <span className="text-xs text-foreground/40">
                    {teams.length}
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {teams.map((team) => (
                    <button
                      key={team.id}
                      disabled={!isMyTurn || submitting}
                      onClick={() => handlePick(team)}
                      className={`group flex items-center gap-3 rounded-[1.2rem] border p-3.5 text-left transition-all ${
                        isMyTurn
                          ? "border-white/10 bg-white/5 hover:border-brand/40 hover:bg-brand/5 cursor-pointer"
                          : "border-white/5 bg-white/[0.03] cursor-not-allowed opacity-60"
                      }`}
                    >
                      {team.flag_url ? (
                        <img
                          src={team.flag_url}
                          alt={team.name}
                          className="h-8 w-11 rounded object-cover"
                        />
                      ) : (
                        <span className="flex h-8 w-11 items-center justify-center rounded bg-white/10 text-xs font-bold text-foreground/40">
                          {team.short_name ??
                            team.name.slice(0, 3).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white group-hover:text-brand">
                          {team.name}
                        </p>
                        <TierBadge tier={team.tier ?? 3} />
                      </div>
                      {submitting && selectedTeam?.id === team.id && (
                        <Loader2 className="ml-auto h-4 w-4 animate-spin text-brand" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* RIGHT — draft board */}
        <div className={mobileTab === "teams" ? "hidden lg:block" : ""}>
          <h2 className="mb-4 hidden font-display text-lg font-semibold text-white lg:block">
            {t("draft.boardTitle")}
          </h2>

          {picks.length === 0 ? (
            <p className="text-sm text-foreground/40">{t("draft.noPicks")}</p>
          ) : (
            <div className="space-y-2">
              {[...picks].reverse().map((pick) => {
                const member = memberMap[pick.user_id];
                const isSelf = pick.user_id === userProfile?.id;
                return (
                  <div
                    key={pick.id}
                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${
                      isSelf
                        ? "border-brand/20 bg-brand/5"
                        : "border-white/5 bg-white/[0.03]"
                    }`}
                  >
                    <span className="shrink-0 w-5 text-center text-xs text-foreground/40">
                      #{pick.pick_number + 1}
                    </span>
                    {pick.team?.flag_url ? (
                      <img
                        src={pick.team.flag_url}
                        alt={pick.team.name}
                        className="h-6 w-8 rounded object-cover"
                      />
                    ) : (
                      <span className="h-6 w-8 rounded bg-white/10 text-[10px] font-bold text-foreground/40 flex items-center justify-center">
                        {pick.team?.short_name ?? "??"}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">
                        {pick.team?.name ?? pick.team_id}
                      </p>
                      <p className="truncate text-[11px] text-foreground/50">
                        {member?.display_name ??
                          member?.username ??
                          pick.username}
                        {isSelf && (
                          <span className="ml-1 text-brand">
                            {t("groupPage.you")}
                          </span>
                        )}
                      </p>
                    </div>
                    {isSelf && (
                      <Trophy className="h-3.5 w-3.5 shrink-0 text-brand" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Your picks summary */}
          {picks.filter((p) => p.user_id === userProfile?.id).length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-foreground/40">
                {t("draft.yourPicks")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {picks
                  .filter((p) => p.user_id === userProfile?.id)
                  .map((p) => (
                    <span
                      key={p.id}
                      className="rounded-lg border border-brand/20 bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand"
                    >
                      {p.team?.short_name ?? p.team?.name ?? "?"}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm pick dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="mx-4 max-w-sm border border-white/10 bg-slate-950 text-white sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {t("draft.confirmPick", { name: selectedTeam?.name })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-4 py-2">
            {selectedTeam?.flag_url ? (
              <img
                src={selectedTeam.flag_url}
                alt={selectedTeam.name}
                className="h-14 w-20 rounded-lg object-cover"
              />
            ) : (
              <span className="flex h-14 w-20 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-foreground/40">
                {selectedTeam?.short_name}
              </span>
            )}
            <div>
              <p className="text-lg font-bold text-white">
                {selectedTeam?.name}
              </p>
              {selectedTeam && <TierBadge tier={selectedTeam.tier ?? 3} />}
              <p className="mt-1 text-xs text-foreground/50">
                {t("draft.confirmPickBody")}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              className="rounded-full border border-white/10"
            >
              {t("draft.cancel")}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={submitting}
              className="rounded-full bg-brand text-slate-950 hover:bg-brand/90"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t("draft.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
