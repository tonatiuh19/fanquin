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
  | "global"
  | "ownership";

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
  auto_pick?: boolean;
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
    mode: GroupMode;
    bonus_criteria: BonusCriteria;
    owned_team_ids?: string[];
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

// ── Support Cases ──────────────────────────────────────────────
export type SupportCaseCategory =
  | "account"
  | "group"
  | "predictions"
  | "scoring"
  | "technical"
  | "billing"
  | "other";

export type SupportCaseStatus = "open" | "in_review" | "resolved" | "closed";

export interface SupportCase {
  id: string;
  user_id: string;
  category: SupportCaseCategory;
  subject: string;
  message: string;
  status: SupportCaseStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateSupportCaseRequest {
  category: SupportCaseCategory;
  subject: string;
  message: string;
}

export type CreateSupportCaseResponse = ApiSuccess<SupportCase>;

// ── Admin ──────────────────────────────────────────────────────

export interface AdminStats {
  total_users: number;
  total_groups: number;
  total_predictions: number;
  total_matches: number;
  active_sessions: number;
  live_matches: number;
  groups_by_mode: Record<string, number>;
  recent_signups: number; // last 7 days
  recent_groups: number; // last 7 days
}

export interface AdminUser {
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
  updated_at: string;
  groups_count: number;
  predictions_count: number;
  active_sessions: number;
}

export interface AdminSession {
  id: string;
  user_id: string;
  username: string | null;
  delivery_method: string | null;
  device_info: Record<string, unknown> | null;
  ip_address: string | null;
  last_seen_at: string;
  expires_at: string;
  created_at: string;
}

export interface AdminGroup {
  id: string;
  name: string;
  invite_code: string;
  competition_id: string;
  competition_name: string | null;
  mode: string;
  draft_type: string;
  owner_id: string | null;
  owner_username: string | null;
  max_members: number;
  status: string;
  member_count: number;
  is_active: boolean;
  is_test: boolean;
  created_at: string;
}

export interface AdminGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  total_points: number;
  joined_at: string;
}

export interface AdminMatch {
  id: string;
  competition_id: string;
  competition_name: string | null;
  home_team_id: string | null;
  home_team_name: string | null;
  away_team_id: string | null;
  away_team_name: string | null;
  stage: string | null;
  match_date: string;
  prediction_lock: string | null;
  home_score: number | null;
  away_score: number | null;
  ht_score_home: number | null;
  ht_score_away: number | null;
  status: string;
  external_id: number | null;
  last_synced_at: string | null;
  created_at: string;
}

export interface AdminCompetition {
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
  created_at: string;
  teams_count: number;
  matches_count: number;
  groups_count: number;
}

export interface AdminTeam {
  id: string;
  competition_id: string;
  competition_name: string | null;
  name: string;
  short_name: string | null;
  country_code: string | null;
  flag_url: string | null;
  tier: number;
  external_id: number | null;
  created_at: string;
}

export interface AdminVenue {
  id: string;
  name: string;
  city: string;
  country: string;
  country_code: string | null;
  capacity: number | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface AdminPrediction {
  id: string;
  group_id: string;
  group_name: string | null;
  user_id: string;
  username: string | null;
  match_id: string;
  match_label: string | null;
  predicted_home: number;
  predicted_away: number;
  result: string;
  points_earned: number;
  bonus_pts: number;
  submitted_at: string;
}

export interface AdminNotification {
  id: string;
  user_id: string;
  username: string | null;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AdminOtpRequest {
  id: string;
  identifier: string;
  delivery_method: string;
  expires_at: string;
  verified_at: string | null;
  attempt_count: number;
  is_used: boolean;
  ip_address: string | null;
  created_at: string;
}

// paginated list wrapper
export interface AdminPaginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// Admin request bodies
export interface AdminUpdateUserRequest {
  username?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  country?: string;
  locale?: string;
}

export interface AdminCreateCompetitionRequest {
  name: string;
  short_name?: string;
  type: string;
  season: string;
  starts_at?: string;
  ends_at?: string;
  is_active?: boolean;
  is_test?: boolean;
  logo_url?: string;
  external_id?: number;
}

export interface AdminUpdateCompetitionRequest {
  name?: string;
  short_name?: string;
  type?: string;
  season?: string;
  starts_at?: string;
  ends_at?: string;
  is_active?: boolean;
  is_test?: boolean;
  logo_url?: string;
  external_id?: number;
}

export interface AdminCreateTeamRequest {
  name: string;
  short_name?: string;
  country_code?: string;
  flag_url?: string;
  tier?: number;
  external_id?: number;
}

export interface AdminUpdateTeamRequest {
  name?: string;
  short_name?: string;
  country_code?: string;
  flag_url?: string;
  tier?: number;
  external_id?: number;
}

export interface AdminCreateMatchRequest {
  competition_id: string;
  home_team_id?: string;
  away_team_id?: string;
  stage?: string;
  match_date: string;
  prediction_lock?: string;
  home_score?: number;
  away_score?: number;
  ht_score_home?: number;
  ht_score_away?: number;
  status?: string;
  external_id?: number;
}

export interface AdminUpdateMatchRequest {
  home_team_id?: string;
  away_team_id?: string;
  stage?: string;
  match_date?: string;
  prediction_lock?: string;
  home_score?: number | null;
  away_score?: number | null;
  ht_score_home?: number | null;
  ht_score_away?: number | null;
  status?: string;
  external_id?: number | null;
}

export interface AdminCreateVenueRequest {
  name: string;
  city: string;
  country: string;
  country_code?: string;
  capacity?: number;
  latitude?: number;
  longitude?: number;
}

export interface AdminUpdateVenueRequest {
  name?: string;
  city?: string;
  country?: string;
  country_code?: string;
  capacity?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface AdminUpdateGroupRequest {
  name?: string;
  is_active?: boolean;
  is_test?: boolean;
  status?: string;
  max_members?: number;
}

export interface AdminBulkNotificationRequest {
  user_ids?: string[]; // if empty → send to all users
  type: string;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
}

// Admin OTP auth
export interface AdminSendCodeRequest {
  identifier: string; // email
}

export interface AdminSendCodeResponse {
  success: boolean;
  debug_code?: number; // dev only
}

export interface AdminVerifyCodeRequest {
  identifier: string;
  code: string;
}

export interface AdminVerifyCodeResponse {
  success: boolean;
  sessionToken: string;
  adminProfile: {
    id: string;
    username: string;
    display_name: string | null;
    email: string;
  };
}

// Services health monitoring
export interface AdminServiceStatus {
  name: string;
  status: "healthy" | "degraded" | "down";
  latency_ms: number | null;
  message?: string;
  checked_at: string;
}

export interface AdminServicesHealthResponse {
  success: boolean;
  services: AdminServiceStatus[];
}

// Keep for backward compat — no longer used by new OTP flow
export interface AdminLoginResponse {
  success: boolean;
  token: string;
}

// ── Admin people (admin_users table) ──────────────────────────
// Completely separate from regular profiles / auth.users.
export interface AdminPerson {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  country: string | null;
  locale: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminCreatePersonRequest {
  email: string;
  username: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  country?: string;
  locale?: string;
}

export interface AdminUpdatePersonRequest {
  display_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  country?: string;
  locale?: string;
  is_active?: boolean;
}

// ── Advertise with Us ─────────────────────────────────────────

export type AdFormat =
  | "banner"
  | "sponsored_group"
  | "email_marketing"
  | "homepage_spotlight"
  | "other";

export type AdRequestStatus = "pending" | "contacted" | "approved" | "rejected";

export interface CreateAdRequestRequest {
  brand_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  website_url?: string;
  ad_format: AdFormat;
  budget_range?: string;
  campaign_goal?: string;
  message?: string;
}

export interface AdRequest {
  id: string;
  brand_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  website_url: string | null;
  ad_format: AdFormat;
  budget_range: string | null;
  campaign_goal: string | null;
  message: string | null;
  status: AdRequestStatus;
  admin_notes: string | null;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateAdRequestResponse = ApiSuccess<{ id: string }>;

export interface AdminAdRequestsResponse {
  data: AdRequest[];
  total: number;
  page: number;
  per_page: number;
}

export interface AdminUpdateAdRequestRequest {
  status?: AdRequestStatus;
  admin_notes?: string;
}
