/**
 * Shared types between client and server — FanQuin API
 */

// ── Generic wrapper ────────────────────────────────────────────
export interface ApiSuccess<T> {
  success: true;
  data: T;
}
export interface ApiError {
  success: false;
  message: string;
  error?: string;
}
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── Auth ───────────────────────────────────────────────────────
export interface SendCodeRequest {
  identifier: string; // email address
  delivery_method: "email" | "sms";
}
export interface SendCodeResponse {
  success: boolean;
  message: string;
  /** Only present in development mode — never in production */
  debug_code?: number;
}

export interface VerifyCodeRequest {
  identifier: string;
  code: string;
  locale?: string;
}
export interface VerifyCodeResponse {
  success: boolean;
  sessionToken: string;
  isNewUser: boolean;
  user: UserProfile;
}

export interface ValidateSessionResponse {
  success: boolean;
  user: UserProfile;
}

// ── User / Profile ─────────────────────────────────────────────
export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  country: string | null;
  avatar_url: string | null;
  locale: string;
  created_at: string;
}

export interface UpdateProfileRequest {
  username?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  country?: string;
  avatar_url?: string;
  locale?: string;
}

// ── Competitions ───────────────────────────────────────────────
export interface Competition {
  id: string;
  name: string;
  short_name: string | null;
  type: string;
  season: string;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  is_test: boolean;
  logo_url: string | null;
  external_id: number | null;
  last_synced_at: string | null;
}

// ── Teams ──────────────────────────────────────────────────────
export interface Team {
  id: string;
  competition_id: string;
  name: string;
  short_name: string | null;
  country_code: string | null;
  flag_url: string | null;
  tier: number;
  group_label: string | null;
  is_placeholder: boolean;
}

// ── Venues ─────────────────────────────────────────────────────
export interface Venue {
  id: string;
  name: string;
  city: string;
  country: string;
  country_code: string | null;
  capacity: number | null;
}

// ── Matches ────────────────────────────────────────────────────
export interface Match {
  id: string;
  competition_id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  stage: string | null;
  match_number: number | null;
  match_date: string;
  prediction_lock: string | null;
  home_score: number | null;
  away_score: number | null;
  status: "scheduled" | "live" | "completed" | "cancelled";
  upset_multiplier: number;
  venue: Venue | null;
  home_team: Team | null;
  away_team: Team | null;
}

// ── Groups ─────────────────────────────────────────────────────
export type GroupMode =
  | "casual"
  | "friends"
  | "league"
  | "competitive"
  | "global";

export type GroupStatus = "waiting" | "draft" | "active" | "completed";

// ── Bonus Prediction Criteria ──────────────────────────────────
/**
 * The bonus criteria a group admin can enable.
 * Each correct bonus prediction adds points on top of the base score prediction.
 */
export type BonusCriterionKey =
  | "btts" // Both Teams To Score — predict yes/no
  | "total_goals_over" // Total goals over/under a threshold — predict yes/no
  | "ft_winner" // Full-time result — predict home/draw/away (independent of score)
  | "ht_winner" // Half-time result — predict home/draw/away
  | "clean_sheet"; // Which team keeps a clean sheet — predict home/away/none

export interface BonusCriteria {
  /** Which criteria are active for this group */
  enabled: BonusCriterionKey[];
  /** Points for predicting whether both teams score */
  btts_pts: number;
  /** Points for predicting total goals over/under correctly */
  total_goals_over_pts: number;
  /** The over/under goals threshold (e.g., 2.5 means "more than 2 goals") */
  total_goals_threshold: number;
  /** Points for predicting the full-time result correctly (standalone, without score) */
  ft_winner_pts: number;
  /** Points for predicting the half-time result correctly */
  ht_winner_pts: number;
  /** Points for predicting the clean-sheet team correctly */
  clean_sheet_pts: number;
}

/** Values the user fills in for each enabled bonus criterion */
export interface BonusPredictionDetails {
  btts?: boolean; // true = both teams score
  total_goals_over?: boolean; // true = total goals > threshold
  ft_winner?: "home" | "draw" | "away"; // standalone full-time result pick
  ht_winner?: "home" | "draw" | "away";
  clean_sheet?: "home" | "away" | "none";
}

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  competition_id: string;
  mode: GroupMode;
  draft_type: "snake" | "random" | "balanced_tier";
  owner_id: string | null;
  max_members: number;
  scoring_config: Record<string, number | boolean>;
  bonus_criteria: BonusCriteria;
  is_active: boolean;
  status: GroupStatus;
  draft_started_at: string | null;
  started_at: string | null;
  member_count?: number;
}

export interface CreateGroupRequest {
  name: string;
  competition_id: string;
  mode: GroupMode;
  draft_type?: "snake" | "random" | "balanced_tier";
  max_members?: number;
  bonus_criteria?: Partial<BonusCriteria>;
}

export interface UpdateGroupBonusCriteriaRequest {
  bonus_criteria: Partial<BonusCriteria>;
}

export interface JoinGroupRequest {
  invite_code: string;
}

// ── Leaderboard ────────────────────────────────────────────────
export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  total_points: number;
  prediction_pts: number;
  ownership_pts: number;
  current_streak: number;
  elo_rating: number;
}

// ── Predictions ────────────────────────────────────────────────
export interface SubmitPredictionRequest {
  group_id: string;
  match_id: string;
  predicted_home: number;
  predicted_away: number;
  /** Bonus criterion predictions — only keys for enabled criteria are required */
  details?: BonusPredictionDetails;
}

export interface Prediction {
  id: string;
  group_id: string;
  match_id: string;
  user_id: string;
  predicted_home: number;
  predicted_away: number;
  result:
    | "pending"
    | "exact_score"
    | "correct_winner"
    | "goal_difference"
    | "incorrect";
  points_earned: number;
  bonus_pts: number;
  details: BonusPredictionDetails;
  submitted_at: string;
  match?: Match;
}

// ── Team Ownership ─────────────────────────────────────────────
export interface TeamOwnership {
  id: string;
  group_id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  team: Team;
  draft_pick: number | null;
  total_pts: number;
  wins_pts: number;
  goals_pts: number;
  clean_sheet_pts: number;
}

// ── Group Members ──────────────────────────────────────────────
export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: "admin" | "member";
  total_points: number;
  joined_at: string;
}

// ── Live Page ─────────────────────────────────────────────────
export interface LiveMatchPrediction {
  group_id: string;
  group_name: string;
  predicted_home: number;
  predicted_away: number;
  result:
    | "pending"
    | "exact_score"
    | "correct_winner"
    | "goal_difference"
    | "incorrect";
  points_earned: number;
  bonus_pts: number;
  details: BonusPredictionDetails;
  /** bonus_criteria from the group — tells the UI which fields to show */
  group_bonus_criteria?: BonusCriteria;
}

export interface LiveMatch extends Match {
  /** Keyed by group_id. Only present when the user is authenticated. */
  my_predictions?: Record<string, LiveMatchPrediction>;
  ht_score_home?: number | null;
  ht_score_away?: number | null;
}

export interface LivePageData {
  live: LiveMatch[];
  upcoming: LiveMatch[];
  recent: LiveMatch[];
  my_active_groups: {
    id: string;
    name: string;
    competition_id: string;
    bonus_criteria: BonusCriteria;
  }[];
  last_synced_at: string | null;
  competition: Competition | null;
}

export interface SyncResult {
  matches_checked: number;
  matches_updated: number;
  predictions_scored: number;
  ownership_points_awarded: number;
  streak_bonuses_awarded: number;
  upset_bonuses_awarded: number;
  elo_updates_applied: number;
}

// ── Draft ──────────────────────────────────────────────────────
export interface DraftSession {
  group_id: string;
  member_order: string[]; // user IDs in snake draft order
  current_pick: number; // 0-indexed overall pick counter
  total_picks: number; // total teams to be drafted
  pick_deadline: string | null;
  // computed fields returned by API
  current_picker_id: string | null;
  round: number; // 1-based
  is_complete: boolean;
}

export interface DraftPick {
  id: string;
  group_id: string;
  user_id: string;
  team_id: string;
  pick_number: number;
  round: number;
  auto_picked: boolean;
  picked_at: string;
  team?: Team;
  username?: string;
  display_name?: string | null;
}

export interface DraftState {
  session: DraftSession;
  picks: DraftPick[];
  available_teams: Team[];
  members: GroupMember[];
}

export interface SubmitPickRequest {
  team_id: string;
}

// ── Legal Documents ────────────────────────────────────────────
export interface LegalDocument {
  id: string;
  type: "privacy" | "terms";
  version: string;
  title: string;
  content: string;
  jurisdiction: string;
  effective_date: string;
  is_active: boolean;
  created_at: string;
}

export type GetLegalDocResponse = ApiSuccess<LegalDocument>;
