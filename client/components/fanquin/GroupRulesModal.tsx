import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Group, BonusCriteria } from "@shared/api";
import {
  Trophy,
  Target,
  Zap,
  Flame,
  Crown,
  Globe,
  Sparkles,
  Star,
  CircleDot,
  TrendingUp,
  Shield,
  CheckCircle2,
  Clock,
  Shuffle,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  group: Group;
}

const MODE_ICON: Record<string, React.ReactNode> = {
  casual: <Sparkles className="h-4 w-4 text-amber-400" />,
  friends: <Flame className="h-4 w-4 text-brand" />,
  league: <Trophy className="h-4 w-4 text-violet-400" />,
  competitive: <Crown className="h-4 w-4 text-rose-400" />,
  global: <Globe className="h-4 w-4 text-sky-400" />,
  ownership: <Star className="h-4 w-4 text-orange-400" />,
};

const MODE_COLOR: Record<string, string> = {
  casual: "border-amber-400/20 bg-amber-400/10 text-amber-400",
  friends: "border-brand/20 bg-brand/10 text-brand",
  league: "border-violet-400/20 bg-violet-400/10 text-violet-400",
  competitive: "border-rose-400/20 bg-rose-400/10 text-rose-400",
  global: "border-sky-400/20 bg-sky-400/10 text-sky-400",
  ownership: "border-orange-400/20 bg-orange-400/10 text-orange-400",
};

// Default scoring values mirroring API scoringDefaults
interface ModeScoring {
  exact: number;
  winner: number;
  diff: number;
  streak: number;
  streakAt: number;
  elo: number | null;
  lives: number | null;
  teamWin: number;
  teamGoal: number;
  teamClean: number;
}

const MODE_SCORING: Record<string, ModeScoring> = {
  casual: {
    exact: 4,
    winner: 2,
    diff: 1,
    streak: 1,
    streakAt: 3,
    elo: null,
    lives: null,
    teamWin: 3,
    teamGoal: 1,
    teamClean: 2,
  },
  friends: {
    exact: 5,
    winner: 3,
    diff: 2,
    streak: 2,
    streakAt: 3,
    elo: null,
    lives: null,
    teamWin: 4,
    teamGoal: 1,
    teamClean: 3,
  },
  league: {
    exact: 6,
    winner: 3,
    diff: 2,
    streak: 2,
    streakAt: 3,
    elo: 32,
    lives: null,
    teamWin: 5,
    teamGoal: 1,
    teamClean: 3,
  },
  competitive: {
    exact: 7,
    winner: 4,
    diff: 2,
    streak: 3,
    streakAt: 3,
    elo: 24,
    lives: 3,
    teamWin: 5,
    teamGoal: 1,
    teamClean: 3,
  },
  global: {
    exact: 5,
    winner: 3,
    diff: 2,
    streak: 3,
    streakAt: 4,
    elo: 16,
    lives: 1,
    teamWin: 4,
    teamGoal: 1,
    teamClean: 3,
  },
  ownership: {
    exact: 0,
    winner: 0,
    diff: 0,
    streak: 2,
    streakAt: 3,
    elo: null,
    lives: null,
    teamWin: 6,
    teamGoal: 2,
    teamClean: 4,
  },
};

const DRAFT_ICON: Record<string, React.ReactNode> = {
  snake: <Shuffle className="h-3.5 w-3.5" />,
  random: <CircleDot className="h-3.5 w-3.5" />,
  balanced_tier: <TrendingUp className="h-3.5 w-3.5" />,
};

function ScoreRow({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${highlight ? "bg-brand/5 border border-brand/10" : "bg-white/[0.03]"}`}
    >
      <span className="flex items-center gap-2 text-sm text-foreground/70">
        {icon}
        {label}
      </span>
      <span
        className={`text-sm font-bold tabular-nums ${highlight ? "text-brand" : "text-white"}`}
      >
        +{value} pts
      </span>
    </div>
  );
}

export function GroupRulesModal({ open, onClose, group }: Props) {
  const { t } = useTranslation();

  const def = MODE_SCORING[group.mode] ?? MODE_SCORING.casual;
  const cfg = (group.scoring_config ?? {}) as Record<string, number | boolean>;

  function cfgNum(key: string, fallback: number): number {
    const v = cfg[key];
    return typeof v === "number" ? v : fallback;
  }

  const isOwnership = group.mode === "ownership";
  const isSurvivorMode =
    group.mode === "competitive" || group.mode === "global";

  const eloK = cfgNum("elo_k_factor", def.elo ?? 0);
  const scoring = {
    exact: cfgNum("exact_score_pts", def.exact),
    winner: cfgNum("correct_winner_pts", def.winner),
    diff: cfgNum("goal_difference_pts", def.diff),
    streak: cfgNum("streak_bonus_pts", def.streak),
    streakAt: cfgNum("streak_bonus_threshold", def.streakAt),
    elo: eloK > 0 ? eloK : null,
    lives: isSurvivorMode ? cfgNum("survivor_lives", def.lives ?? 1) : null,
    teamWin: cfgNum("team_win_pts", def.teamWin),
    teamGoal: cfgNum("team_goal_pts", def.teamGoal),
    teamClean: cfgNum("team_clean_sheet_pts", def.teamClean),
  };

  const modeColor = MODE_COLOR[group.mode] ?? MODE_COLOR["casual"];
  const modeIcon = MODE_ICON[group.mode] ?? <Star className="h-4 w-4" />;

  const bonus: BonusCriteria = {
    enabled: [],
    btts_pts: 2,
    total_goals_over_pts: 2,
    total_goals_threshold: 2.5,
    ft_winner_pts: 2,
    ht_winner_pts: 2,
    clean_sheet_pts: 1,
    ...((group.bonus_criteria as Partial<BonusCriteria>) ?? {}),
  };

  const hasBonuses = bonus.enabled && bonus.enabled.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-panel border-white/10 bg-[hsl(var(--surface))] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-2">
          {/* Mode badge */}
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-widest ${modeColor}`}
            >
              {modeIcon}
              {group.mode}
            </span>
            {group.draft_type && (
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-foreground/50">
                {DRAFT_ICON[group.draft_type]}
                {t(`rulesModal.draft.${group.draft_type}`)}
              </span>
            )}
          </div>

          <DialogTitle className="font-display text-xl font-bold text-white leading-tight">
            {t("rulesModal.title")}
          </DialogTitle>
          <p className="text-sm text-foreground/50 leading-relaxed">
            {t(`rulesModal.modeDesc.${group.mode}`)}
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Base prediction scoring — hidden for ownership mode */}
          {!isOwnership && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-foreground/40">
                {t("rulesModal.baseScoringLabel")}
              </p>
              <div className="space-y-1.5">
                <ScoreRow
                  highlight
                  icon={<Target className="h-4 w-4 text-brand" />}
                  label={t("rulesModal.exactScore")}
                  value={scoring.exact}
                />
                <ScoreRow
                  icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  label={t("rulesModal.correctWinner")}
                  value={scoring.winner}
                />
                <ScoreRow
                  icon={<TrendingUp className="h-4 w-4 text-sky-400" />}
                  label={t("rulesModal.correctDiff")}
                  value={scoring.diff}
                />
              </div>
            </div>
          )}

          {/* Team scoring */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-foreground/40">
              {t("rulesModal.teamScoringLabel")}
            </p>
            <div className="space-y-1.5">
              <ScoreRow
                highlight={isOwnership}
                icon={<Shield className="h-4 w-4 text-orange-400" />}
                label={t("rulesModal.teamWin")}
                value={scoring.teamWin}
              />
              <ScoreRow
                icon={<Zap className="h-4 w-4 text-amber-400" />}
                label={t("rulesModal.teamGoal")}
                value={scoring.teamGoal}
              />
              <ScoreRow
                icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                label={t("rulesModal.teamCleanSheet")}
                value={scoring.teamClean}
              />
            </div>
          </div>

          {/* Streak */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-foreground/40">
              {t("rulesModal.streakLabel")}
            </p>
            <div className="flex items-start gap-2 rounded-xl bg-amber-400/5 border border-amber-400/10 px-3 py-2.5">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-sm text-foreground/70 leading-relaxed">
                {t("rulesModal.streakDesc", {
                  n: scoring.streakAt,
                  pts: scoring.streak,
                })}
              </p>
            </div>
          </div>

          {/* ELO / lives */}
          {(scoring.elo || scoring.lives) && (
            <div className="flex gap-2">
              {scoring.elo && (
                <div className="flex-1 rounded-xl border border-violet-400/15 bg-violet-400/5 px-3 py-2.5 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-400/70 mb-0.5">
                    {t("rulesModal.eloLabel")}
                  </p>
                  <p className="text-sm text-foreground/60">
                    {t("rulesModal.eloDesc")}
                  </p>
                </div>
              )}
              {scoring.lives && (
                <div className="flex-1 rounded-xl border border-rose-400/15 bg-rose-400/5 px-3 py-2.5 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-rose-400/70 mb-0.5">
                    {t("rulesModal.livesLabel")}
                  </p>
                  <p className="text-sm text-foreground/60">
                    {t("rulesModal.livesDesc", { n: scoring.lives })}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Bonus criteria */}
          {hasBonuses && (
            <>
              <Separator className="bg-white/5" />
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-foreground/40">
                  {t("rulesModal.bonusLabel")}
                </p>
                <div className="space-y-1.5">
                  {bonus.enabled.map((key) => {
                    const pts =
                      key === "btts"
                        ? bonus.btts_pts
                        : key === "total_goals_over"
                          ? bonus.total_goals_over_pts
                          : key === "ft_winner"
                            ? bonus.ft_winner_pts
                            : key === "ht_winner"
                              ? bonus.ht_winner_pts
                              : bonus.clean_sheet_pts;
                    const extra =
                      key === "total_goals_over"
                        ? ` (>${bonus.total_goals_threshold})`
                        : "";
                    return (
                      <ScoreRow
                        key={key}
                        icon={<Star className="h-4 w-4 text-orange-400" />}
                        label={t(`groupPage.bonus.${key}.label`) + extra}
                        value={pts}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Draft type info */}
          {group.draft_type === "snake" && (
            <>
              <Separator className="bg-white/5" />
              <div className="flex items-start gap-2 rounded-xl bg-purple-400/5 border border-purple-400/10 px-3 py-2.5">
                <Shuffle className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                <p className="text-sm text-foreground/60 leading-relaxed">
                  {t("rulesModal.snakeHint")}
                </p>
              </div>
            </>
          )}

          {/* Timer hint */}
          <div className="flex items-start gap-2 rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2.5">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-foreground/30" />
            <p className="text-xs text-foreground/40 leading-relaxed">
              {t("rulesModal.timerHint")}
            </p>
          </div>

          <Button
            onClick={onClose}
            className="w-full rounded-full bg-brand font-semibold text-slate-950 shadow-glow hover:bg-brand/90"
          >
            {t("rulesModal.gotIt")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
