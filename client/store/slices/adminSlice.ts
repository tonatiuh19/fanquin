import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import type {
  AdminStats,
  AdminUser,
  AdminSession,
  AdminGroup,
  AdminGroupMember,
  AdminMatch,
  AdminCompetition,
  AdminTeam,
  AdminVenue,
  AdminPrediction,
  AdminNotification,
  AdminOtpRequest,
  AdminPaginated,
  AdminServiceStatus,
  AdminSendCodeResponse,
  AdminVerifyCodeResponse,
  AdminPerson,
  AdRequest,
  AdminAdRequestsResponse,
  AdminUpdateAdRequestRequest,
} from "@shared/api";
import type { RootState } from "../index";

// ── Helpers ──────────────────────────────────────────────────────

function adminHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ── State ────────────────────────────────────────────────────────

// AdminProfile mirrors the admin_users table row
// (completely separate from regular user profiles)
interface AdminProfile {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  country: string | null;
  locale: string | null;
  is_active: boolean;
  created_at?: string;
}

interface AdminState {
  adminToken: string | null;
  isAuthenticated: boolean;
  adminProfile: AdminProfile | null;
  // OTP login flow
  loginStep: "email" | "otp";
  loginEmail: string;
  loginLoading: boolean;
  loginError: string | null;

  stats: AdminStats | null;
  statsLoading: boolean;

  users: AdminPaginated<AdminUser> | null;
  usersLoading: boolean;

  sessions: AdminPaginated<AdminSession> | null;
  sessionsLoading: boolean;

  competitions: AdminCompetition[];
  competitionsLoading: boolean;

  teams: AdminTeam[];
  teamsLoading: boolean;
  selectedCompetitionId: string | null;

  matches: AdminPaginated<AdminMatch> | null;
  matchesLoading: boolean;

  venues: AdminVenue[];
  venuesLoading: boolean;

  groups: AdminPaginated<AdminGroup> | null;
  groupsLoading: boolean;
  groupMembers: Record<string, AdminGroupMember[]>;
  groupMembersLoading: boolean;

  predictions: AdminPaginated<AdminPrediction> | null;
  predictionsLoading: boolean;

  notifications: AdminPaginated<AdminNotification> | null;
  notificationsLoading: boolean;

  otpRequests: AdminPaginated<AdminOtpRequest> | null;
  otpLoading: boolean;

  services: AdminServiceStatus[];
  servicesLoading: boolean;

  profileUpdateLoading: boolean;
  profileUpdateError: string | null;

  people: AdminPerson[];
  peopleLoading: boolean;

  adRequests: AdminAdRequestsResponse | null;
  adRequestsLoading: boolean;

  error: string | null;
}

const ADMIN_TOKEN_KEY = "fanquin_admin_token";

const initialState: AdminState = {
  adminToken: localStorage.getItem(ADMIN_TOKEN_KEY),
  isAuthenticated: !!localStorage.getItem(ADMIN_TOKEN_KEY),
  adminProfile: null,
  loginStep: "email",
  loginEmail: "",
  loginLoading: false,
  loginError: null,

  stats: null,
  statsLoading: false,

  users: null,
  usersLoading: false,

  sessions: null,
  sessionsLoading: false,

  competitions: [],
  competitionsLoading: false,

  teams: [],
  teamsLoading: false,
  selectedCompetitionId: null,

  matches: null,
  matchesLoading: false,

  venues: [],
  venuesLoading: false,

  groups: null,
  groupsLoading: false,
  groupMembers: {},
  groupMembersLoading: false,

  predictions: null,
  predictionsLoading: false,

  notifications: null,
  notificationsLoading: false,

  otpRequests: null,
  otpLoading: false,

  services: [],
  servicesLoading: false,

  profileUpdateLoading: false,
  profileUpdateError: null,

  people: [],
  peopleLoading: false,

  adRequests: null,
  adRequestsLoading: false,

  error: null,
};

// ── Thunks ───────────────────────────────────────────────────────

// ── Admin OTP auth thunks ─────────────────────────────────────────

export const adminSendCode = createAsyncThunk(
  "admin/sendCode",
  async (email: string, { rejectWithValue }) => {
    try {
      const { data } = await axios.post<AdminSendCodeResponse>(
        "/api/admin/auth/send-code",
        { identifier: email },
      );
      return { email, debug_code: data.debug_code };
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to send code",
      );
    }
  },
);

export const adminVerifyCode = createAsyncThunk(
  "admin/verifyCode",
  async (
    { email, code }: { email: string; code: string },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axios.post<AdminVerifyCodeResponse>(
        "/api/admin/auth/verify-code",
        { identifier: email, code },
      );
      return data;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message ?? "Invalid code");
    }
  },
);

export const fetchAdminServices = createAsyncThunk(
  "admin/fetchServices",
  async (_, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.get<{
        success: boolean;
        services: AdminServiceStatus[];
      }>("/api/admin/services/health", { headers: adminHeaders(token) });
      return data.services;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to load services",
      );
    }
  },
);

export const fetchAdminStats = createAsyncThunk(
  "admin/fetchStats",
  async (_, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.get<{ success: boolean; data: AdminStats }>(
        "/api/admin/stats",
        { headers: adminHeaders(token) },
      );
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to load stats",
      );
    }
  },
);

export const fetchAdminUsers = createAsyncThunk(
  "admin/fetchUsers",
  async (
    params: { page?: number; limit?: number; search?: string } = {},
    { getState, rejectWithValue },
  ) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.get<{
        success: boolean;
        data: AdminPaginated<AdminUser>;
      }>("/api/admin/users", {
        headers: adminHeaders(token),
        params: {
          page: params.page ?? 1,
          limit: params.limit ?? 25,
          search: params.search ?? "",
        },
      });
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to load users",
      );
    }
  },
);

export const updateAdminUser = createAsyncThunk(
  "admin/updateUser",
  async (
    { id, updates }: { id: string; updates: Record<string, unknown> },
    { getState, rejectWithValue },
  ) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.patch<{ success: boolean; data: AdminUser }>(
        `/api/admin/users/${id}`,
        updates,
        { headers: adminHeaders(token) },
      );
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to update user",
      );
    }
  },
);

export const deleteAdminUser = createAsyncThunk(
  "admin/deleteUser",
  async (id: string, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      await axios.delete(`/api/admin/users/${id}`, {
        headers: adminHeaders(token),
      });
      return id;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to delete user",
      );
    }
  },
);

export const fetchAdminSessions = createAsyncThunk(
  "admin/fetchSessions",
  async (
    params: { page?: number; limit?: number } = {},
    { getState, rejectWithValue },
  ) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.get<{
        success: boolean;
        data: AdminPaginated<AdminSession>;
      }>("/api/admin/sessions", {
        headers: adminHeaders(token),
        params: { page: params.page ?? 1, limit: params.limit ?? 25 },
      });
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to load sessions",
      );
    }
  },
);

export const revokeAdminSession = createAsyncThunk(
  "admin/revokeSession",
  async (id: string, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      await axios.delete(`/api/admin/sessions/${id}`, {
        headers: adminHeaders(token),
      });
      return id;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to revoke session",
      );
    }
  },
);

export const fetchAdminCompetitions = createAsyncThunk(
  "admin/fetchCompetitions",
  async (_, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.get<{
        success: boolean;
        data: AdminCompetition[];
      }>("/api/admin/competitions", { headers: adminHeaders(token) });
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to load competitions",
      );
    }
  },
);

export const createAdminCompetition = createAsyncThunk(
  "admin/createCompetition",
  async (body: Record<string, unknown>, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.post<{
        success: boolean;
        data: AdminCompetition;
      }>("/api/admin/competitions", body, { headers: adminHeaders(token) });
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to create competition",
      );
    }
  },
);

export const updateAdminCompetition = createAsyncThunk(
  "admin/updateCompetition",
  async (
    { id, updates }: { id: string; updates: Record<string, unknown> },
    { getState, rejectWithValue },
  ) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.patch<{
        success: boolean;
        data: AdminCompetition;
      }>(`/api/admin/competitions/${id}`, updates, {
        headers: adminHeaders(token),
      });
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to update competition",
      );
    }
  },
);

export const deleteAdminCompetition = createAsyncThunk(
  "admin/deleteCompetition",
  async (id: string, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      await axios.delete(`/api/admin/competitions/${id}`, {
        headers: adminHeaders(token),
      });
      return id;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to delete competition",
      );
    }
  },
);

export const fetchAdminTeams = createAsyncThunk(
  "admin/fetchTeams",
  async (competitionId: string, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.get<{
        success: boolean;
        data: AdminTeam[];
      }>(`/api/admin/competitions/${competitionId}/teams`, {
        headers: adminHeaders(token),
      });
      return { competitionId, teams: data.data };
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to load teams",
      );
    }
  },
);

export const createAdminTeam = createAsyncThunk(
  "admin/createTeam",
  async (
    {
      competitionId,
      body,
    }: { competitionId: string; body: Record<string, unknown> },
    { getState, rejectWithValue },
  ) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.post<{ success: boolean; data: AdminTeam }>(
        `/api/admin/competitions/${competitionId}/teams`,
        body,
        { headers: adminHeaders(token) },
      );
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to create team",
      );
    }
  },
);

export const updateAdminTeam = createAsyncThunk(
  "admin/updateTeam",
  async (
    { id, updates }: { id: string; updates: Record<string, unknown> },
    { getState, rejectWithValue },
  ) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.patch<{ success: boolean; data: AdminTeam }>(
        `/api/admin/teams/${id}`,
        updates,
        { headers: adminHeaders(token) },
      );
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to update team",
      );
    }
  },
);

export const deleteAdminTeam = createAsyncThunk(
  "admin/deleteTeam",
  async (id: string, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      await axios.delete(`/api/admin/teams/${id}`, {
        headers: adminHeaders(token),
      });
      return id;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to delete team",
      );
    }
  },
);

export const fetchAdminMatches = createAsyncThunk(
  "admin/fetchMatches",
  async (
    params: {
      page?: number;
      limit?: number;
      competition_id?: string;
      status?: string;
    } = {},
    { getState, rejectWithValue },
  ) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.get<{
        success: boolean;
        data: AdminPaginated<AdminMatch>;
      }>("/api/admin/matches", {
        headers: adminHeaders(token),
        params: {
          page: params.page ?? 1,
          limit: params.limit ?? 25,
          ...(params.competition_id
            ? { competition_id: params.competition_id }
            : {}),
          ...(params.status ? { status: params.status } : {}),
        },
      });
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to load matches",
      );
    }
  },
);

export const createAdminMatch = createAsyncThunk(
  "admin/createMatch",
  async (body: Record<string, unknown>, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.post<{ success: boolean; data: AdminMatch }>(
        "/api/admin/matches",
        body,
        { headers: adminHeaders(token) },
      );
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to create match",
      );
    }
  },
);

export const updateAdminMatch = createAsyncThunk(
  "admin/updateMatch",
  async (
    { id, updates }: { id: string; updates: Record<string, unknown> },
    { getState, rejectWithValue },
  ) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.patch<{
        success: boolean;
        data: AdminMatch;
      }>(`/api/admin/matches/${id}`, updates, {
        headers: adminHeaders(token),
      });
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to update match",
      );
    }
  },
);

export const deleteAdminMatch = createAsyncThunk(
  "admin/deleteMatch",
  async (id: string, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      await axios.delete(`/api/admin/matches/${id}`, {
        headers: adminHeaders(token),
      });
      return id;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to delete match",
      );
    }
  },
);

export const fetchAdminVenues = createAsyncThunk(
  "admin/fetchVenues",
  async (_, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.get<{
        success: boolean;
        data: AdminVenue[];
      }>("/api/admin/venues", { headers: adminHeaders(token) });
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to load venues",
      );
    }
  },
);

export const createAdminVenue = createAsyncThunk(
  "admin/createVenue",
  async (body: Record<string, unknown>, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.post<{ success: boolean; data: AdminVenue }>(
        "/api/admin/venues",
        body,
        { headers: adminHeaders(token) },
      );
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to create venue",
      );
    }
  },
);

export const updateAdminVenue = createAsyncThunk(
  "admin/updateVenue",
  async (
    { id, updates }: { id: string; updates: Record<string, unknown> },
    { getState, rejectWithValue },
  ) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.patch<{
        success: boolean;
        data: AdminVenue;
      }>(`/api/admin/venues/${id}`, updates, {
        headers: adminHeaders(token),
      });
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to update venue",
      );
    }
  },
);

export const deleteAdminVenue = createAsyncThunk(
  "admin/deleteVenue",
  async (id: string, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      await axios.delete(`/api/admin/venues/${id}`, {
        headers: adminHeaders(token),
      });
      return id;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to delete venue",
      );
    }
  },
);

export const fetchAdminGroups = createAsyncThunk(
  "admin/fetchGroups",
  async (
    params: { page?: number; limit?: number; search?: string } = {},
    { getState, rejectWithValue },
  ) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.get<{
        success: boolean;
        data: AdminPaginated<AdminGroup>;
      }>("/api/admin/groups", {
        headers: adminHeaders(token),
        params: {
          page: params.page ?? 1,
          limit: params.limit ?? 25,
          search: params.search ?? "",
        },
      });
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to load groups",
      );
    }
  },
);

export const updateAdminGroup = createAsyncThunk(
  "admin/updateGroup",
  async (
    { id, updates }: { id: string; updates: Record<string, unknown> },
    { getState, rejectWithValue },
  ) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.patch<{
        success: boolean;
        data: AdminGroup;
      }>(`/api/admin/groups/${id}`, updates, {
        headers: adminHeaders(token),
      });
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to update group",
      );
    }
  },
);

export const deleteAdminGroup = createAsyncThunk(
  "admin/deleteGroup",
  async (id: string, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      await axios.delete(`/api/admin/groups/${id}`, {
        headers: adminHeaders(token),
      });
      return id;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to delete group",
      );
    }
  },
);

export const createAdminGroup = createAsyncThunk(
  "admin/createGroup",
  async (body: Record<string, unknown>, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.post<{ success: boolean; data: AdminGroup }>(
        "/api/admin/groups",
        body,
        { headers: adminHeaders(token) },
      );
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to create group",
      );
    }
  },
);

export const createAdminUser = createAsyncThunk(
  "admin/createUser",
  async (body: Record<string, unknown>, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.post<{ success: boolean; data: AdminUser }>(
        "/api/admin/users",
        body,
        { headers: adminHeaders(token) },
      );
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to create user",
      );
    }
  },
);

export const fetchGroupMembers = createAsyncThunk(
  "admin/fetchGroupMembers",
  async (groupId: string, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.get<{
        success: boolean;
        data: AdminGroupMember[];
      }>(`/api/admin/groups/${groupId}/members`, {
        headers: adminHeaders(token),
      });
      return { groupId, members: data.data };
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to load members",
      );
    }
  },
);

export const addGroupMember = createAsyncThunk(
  "admin/addGroupMember",
  async (
    {
      groupId,
      identifier,
      role,
    }: { groupId: string; identifier: string; role?: string },
    { getState, rejectWithValue },
  ) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.post<{
        success: boolean;
        data: AdminGroupMember;
      }>(
        `/api/admin/groups/${groupId}/members`,
        { identifier, role },
        { headers: adminHeaders(token) },
      );
      return { groupId, member: data.data };
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to add member",
      );
    }
  },
);

export const removeGroupMember = createAsyncThunk(
  "admin/removeGroupMember",
  async (
    { groupId, userId }: { groupId: string; userId: string },
    { getState, rejectWithValue },
  ) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      await axios.delete(`/api/admin/groups/${groupId}/members/${userId}`, {
        headers: adminHeaders(token),
      });
      return { groupId, userId };
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to remove member",
      );
    }
  },
);

export const updateGroupMemberRole = createAsyncThunk(
  "admin/updateGroupMemberRole",
  async (
    {
      groupId,
      userId,
      role,
    }: { groupId: string; userId: string; role: string },
    { getState, rejectWithValue },
  ) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.patch<{
        success: boolean;
        data: { id: string; user_id: string; role: string };
      }>(
        `/api/admin/groups/${groupId}/members/${userId}`,
        { role },
        { headers: adminHeaders(token) },
      );
      return { groupId, userId, role: data.data.role };
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to update role",
      );
    }
  },
);

export const transferGroupOwnership = createAsyncThunk(
  "admin/transferGroupOwnership",
  async (
    { groupId, userId }: { groupId: string; userId: string },
    { getState, rejectWithValue },
  ) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      await axios.patch(
        `/api/admin/groups/${groupId}/owner`,
        { user_id: userId },
        { headers: adminHeaders(token) },
      );
      return { groupId, userId };
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to transfer ownership",
      );
    }
  },
);

export const fetchAdminPredictions = createAsyncThunk(
  "admin/fetchPredictions",
  async (
    params: {
      page?: number;
      limit?: number;
      group_id?: string;
      user_id?: string;
    } = {},
    { getState, rejectWithValue },
  ) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.get<{
        success: boolean;
        data: AdminPaginated<AdminPrediction>;
      }>("/api/admin/predictions", {
        headers: adminHeaders(token),
        params: {
          page: params.page ?? 1,
          limit: params.limit ?? 25,
          ...(params.group_id ? { group_id: params.group_id } : {}),
          ...(params.user_id ? { user_id: params.user_id } : {}),
        },
      });
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to load predictions",
      );
    }
  },
);

export const fetchAdminNotifications = createAsyncThunk(
  "admin/fetchNotifications",
  async (
    params: { page?: number; limit?: number } = {},
    { getState, rejectWithValue },
  ) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.get<{
        success: boolean;
        data: AdminPaginated<AdminNotification>;
      }>("/api/admin/notifications", {
        headers: adminHeaders(token),
        params: { page: params.page ?? 1, limit: params.limit ?? 25 },
      });
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to load notifications",
      );
    }
  },
);

export const sendAdminBulkNotification = createAsyncThunk(
  "admin/sendBulkNotification",
  async (
    body: {
      user_ids?: string[];
      type: string;
      title: string;
      body?: string;
      metadata?: Record<string, unknown>;
    },
    { getState, rejectWithValue },
  ) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.post<{
        success: boolean;
        data: { sent_to: number };
      }>("/api/admin/notifications", body, { headers: adminHeaders(token) });
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to send notification",
      );
    }
  },
);

export const fetchAdminPeople = createAsyncThunk(
  "admin/fetchPeople",
  async (_, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.get<{
        success: boolean;
        data: AdminPerson[];
      }>("/api/admin/people", { headers: adminHeaders(token) });
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to load admin team",
      );
    }
  },
);

export const createAdminPerson = createAsyncThunk(
  "admin/createPerson",
  async (body: Record<string, unknown>, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.post<{
        success: boolean;
        data: AdminPerson;
      }>("/api/admin/people", body, { headers: adminHeaders(token) });
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to create admin user",
      );
    }
  },
);

export const updateAdminPerson = createAsyncThunk(
  "admin/updatePerson",
  async (
    { id, updates }: { id: string; updates: Record<string, unknown> },
    { getState, rejectWithValue },
  ) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.patch<{
        success: boolean;
        data: AdminPerson;
      }>(`/api/admin/people/${id}`, updates, { headers: adminHeaders(token) });
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to update admin user",
      );
    }
  },
);

export const deleteAdminPerson = createAsyncThunk(
  "admin/deletePerson",
  async (id: string, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      await axios.delete(`/api/admin/people/${id}`, {
        headers: adminHeaders(token),
      });
      return id;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to delete admin user",
      );
    }
  },
);

export const fetchAdminProfile = createAsyncThunk(
  "admin/fetchProfile",
  async (_, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.get<{
        success: boolean;
        data: AdminProfile;
      }>("/api/admin/profile", { headers: adminHeaders(token) });
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to load profile",
      );
    }
  },
);

export const updateAdminProfile = createAsyncThunk(
  "admin/updateProfile",
  async (updates: Record<string, unknown>, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.patch<{
        success: boolean;
        data: AdminProfile;
      }>("/api/admin/profile", updates, { headers: adminHeaders(token) });
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to update profile",
      );
    }
  },
);

export const fetchAdminOtpRequests = createAsyncThunk(
  "admin/fetchOtpRequests",
  async (
    params: { page?: number; limit?: number } = {},
    { getState, rejectWithValue },
  ) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.get<{
        success: boolean;
        data: AdminPaginated<AdminOtpRequest>;
      }>("/api/admin/otp-requests", {
        headers: adminHeaders(token),
        params: { page: params.page ?? 1, limit: params.limit ?? 25 },
      });
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to load OTP requests",
      );
    }
  },
);

// ── Ad Requests thunks ────────────────────────────────────────────

export const fetchAdminAdRequests = createAsyncThunk(
  "admin/fetchAdRequests",
  async (
    params: { page?: number; per_page?: number; status?: string } = {},
    { getState, rejectWithValue },
  ) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.get<{
        success: boolean;
        data: AdminAdRequestsResponse;
      }>("/api/admin/ad-requests", {
        headers: adminHeaders(token),
        params: {
          page: params.page ?? 1,
          per_page: params.per_page ?? 25,
          ...(params.status ? { status: params.status } : {}),
        },
      });
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to load ad requests",
      );
    }
  },
);

export const updateAdminAdRequest = createAsyncThunk(
  "admin/updateAdRequest",
  async (
    { id, updates }: { id: string; updates: AdminUpdateAdRequestRequest },
    { getState, rejectWithValue },
  ) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      const { data } = await axios.patch<{ success: boolean; data: AdRequest }>(
        `/api/admin/ad-requests/${id}`,
        updates,
        { headers: adminHeaders(token) },
      );
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to update ad request",
      );
    }
  },
);

export const deleteAdminAdRequest = createAsyncThunk(
  "admin/deleteAdRequest",
  async (id: string, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).admin.adminToken!;
    try {
      await axios.delete(`/api/admin/ad-requests/${id}`, {
        headers: adminHeaders(token),
      });
      return id;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to delete ad request",
      );
    }
  },
);

// ── Slice ────────────────────────────────────────────────────────

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    adminLogout(state) {
      state.adminToken = null;
      state.isAuthenticated = false;
      state.adminProfile = null;
      state.loginStep = "email";
      state.loginEmail = "";
      state.loginError = null;
      state.stats = null;
      state.users = null;
      state.sessions = null;
      state.competitions = [];
      state.teams = [];
      state.matches = null;
      state.venues = [];
      state.groups = null;
      state.predictions = null;
      state.notifications = null;
      state.otpRequests = null;
      state.services = [];
      state.profileUpdateLoading = false;
      state.profileUpdateError = null;
      state.people = [];
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    },
    adminResetLoginStep(state) {
      state.loginStep = "email";
      state.loginEmail = "";
      state.loginError = null;
    },
    clearAdminError(state) {
      state.error = null;
      state.loginError = null;
    },
    setSelectedCompetitionId(state, action: PayloadAction<string | null>) {
      state.selectedCompetitionId = action.payload;
      state.teams = [];
    },
  },
  extraReducers: (builder) => {
    // Send code (step 1)
    builder
      .addCase(adminSendCode.pending, (state) => {
        state.loginLoading = true;
        state.loginError = null;
      })
      .addCase(adminSendCode.fulfilled, (state, action) => {
        state.loginLoading = false;
        state.loginStep = "otp";
        state.loginEmail = action.payload.email;
      })
      .addCase(adminSendCode.rejected, (state, action) => {
        state.loginLoading = false;
        state.loginError = action.payload as string;
      });

    // Verify code (step 2)
    builder
      .addCase(adminVerifyCode.pending, (state) => {
        state.loginLoading = true;
        state.loginError = null;
      })
      .addCase(adminVerifyCode.fulfilled, (state, action) => {
        state.loginLoading = false;
        state.adminToken = action.payload.sessionToken;
        state.adminProfile = action.payload.adminProfile;
        state.isAuthenticated = true;
        state.loginStep = "email";
        state.loginEmail = "";
        localStorage.setItem(ADMIN_TOKEN_KEY, action.payload.sessionToken);
      })
      .addCase(adminVerifyCode.rejected, (state, action) => {
        state.loginLoading = false;
        state.loginError = action.payload as string;
      });

    // Services health
    builder
      .addCase(fetchAdminServices.pending, (state) => {
        state.servicesLoading = true;
      })
      .addCase(fetchAdminServices.fulfilled, (state, action) => {
        state.servicesLoading = false;
        state.services = action.payload;
      })
      .addCase(fetchAdminServices.rejected, (state, action) => {
        state.servicesLoading = false;
        state.error = action.payload as string;
      });

    // Stats
    builder
      .addCase(fetchAdminStats.pending, (state) => {
        state.statsLoading = true;
      })
      .addCase(fetchAdminStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchAdminStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.error = action.payload as string;
      });

    // Users
    builder
      .addCase(fetchAdminUsers.pending, (state) => {
        state.usersLoading = true;
      })
      .addCase(fetchAdminUsers.fulfilled, (state, action) => {
        state.usersLoading = false;
        state.users = action.payload;
      })
      .addCase(fetchAdminUsers.rejected, (state, action) => {
        state.usersLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateAdminUser.fulfilled, (state, action) => {
        if (state.users) {
          const idx = state.users.items.findIndex(
            (u) => u.id === action.payload.id,
          );
          if (idx !== -1)
            state.users.items[idx] = {
              ...state.users.items[idx],
              ...action.payload,
            };
        }
      })
      .addCase(deleteAdminUser.fulfilled, (state, action) => {
        if (state.users) {
          state.users.items = state.users.items.filter(
            (u) => u.id !== action.payload,
          );
          state.users.total -= 1;
        }
      });

    // Sessions
    builder
      .addCase(fetchAdminSessions.pending, (state) => {
        state.sessionsLoading = true;
      })
      .addCase(fetchAdminSessions.fulfilled, (state, action) => {
        state.sessionsLoading = false;
        state.sessions = action.payload;
      })
      .addCase(fetchAdminSessions.rejected, (state, action) => {
        state.sessionsLoading = false;
        state.error = action.payload as string;
      })
      .addCase(revokeAdminSession.fulfilled, (state, action) => {
        if (state.sessions) {
          state.sessions.items = state.sessions.items.filter(
            (s) => s.id !== action.payload,
          );
          state.sessions.total -= 1;
        }
      });

    // Competitions
    builder
      .addCase(fetchAdminCompetitions.pending, (state) => {
        state.competitionsLoading = true;
      })
      .addCase(fetchAdminCompetitions.fulfilled, (state, action) => {
        state.competitionsLoading = false;
        state.competitions = action.payload;
      })
      .addCase(fetchAdminCompetitions.rejected, (state, action) => {
        state.competitionsLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createAdminCompetition.fulfilled, (state, action) => {
        state.competitions.unshift({
          ...action.payload,
          teams_count: 0,
          matches_count: 0,
          groups_count: 0,
        });
      })
      .addCase(updateAdminCompetition.fulfilled, (state, action) => {
        const idx = state.competitions.findIndex(
          (c) => c.id === action.payload.id,
        );
        if (idx !== -1)
          state.competitions[idx] = {
            ...state.competitions[idx],
            ...action.payload,
          };
      })
      .addCase(deleteAdminCompetition.fulfilled, (state, action) => {
        state.competitions = state.competitions.filter(
          (c) => c.id !== action.payload,
        );
      });

    // Teams
    builder
      .addCase(fetchAdminTeams.pending, (state) => {
        state.teamsLoading = true;
      })
      .addCase(fetchAdminTeams.fulfilled, (state, action) => {
        state.teamsLoading = false;
        state.selectedCompetitionId = action.payload.competitionId;
        state.teams = action.payload.teams;
      })
      .addCase(fetchAdminTeams.rejected, (state, action) => {
        state.teamsLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createAdminTeam.fulfilled, (state, action) => {
        state.teams.push(action.payload);
      })
      .addCase(updateAdminTeam.fulfilled, (state, action) => {
        const idx = state.teams.findIndex((t) => t.id === action.payload.id);
        if (idx !== -1) state.teams[idx] = action.payload;
      })
      .addCase(deleteAdminTeam.fulfilled, (state, action) => {
        state.teams = state.teams.filter((t) => t.id !== action.payload);
      });

    // Matches
    builder
      .addCase(fetchAdminMatches.pending, (state) => {
        state.matchesLoading = true;
      })
      .addCase(fetchAdminMatches.fulfilled, (state, action) => {
        state.matchesLoading = false;
        state.matches = action.payload;
      })
      .addCase(fetchAdminMatches.rejected, (state, action) => {
        state.matchesLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createAdminMatch.fulfilled, (state, action) => {
        if (state.matches) {
          state.matches.items.unshift(action.payload);
          state.matches.total += 1;
        }
      })
      .addCase(updateAdminMatch.fulfilled, (state, action) => {
        if (state.matches) {
          const idx = state.matches.items.findIndex(
            (m) => m.id === action.payload.id,
          );
          if (idx !== -1)
            state.matches.items[idx] = {
              ...state.matches.items[idx],
              ...action.payload,
            };
        }
      })
      .addCase(deleteAdminMatch.fulfilled, (state, action) => {
        if (state.matches) {
          state.matches.items = state.matches.items.filter(
            (m) => m.id !== action.payload,
          );
          state.matches.total -= 1;
        }
      });

    // Venues
    builder
      .addCase(fetchAdminVenues.pending, (state) => {
        state.venuesLoading = true;
      })
      .addCase(fetchAdminVenues.fulfilled, (state, action) => {
        state.venuesLoading = false;
        state.venues = action.payload;
      })
      .addCase(fetchAdminVenues.rejected, (state, action) => {
        state.venuesLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createAdminVenue.fulfilled, (state, action) => {
        state.venues.unshift(action.payload);
      })
      .addCase(updateAdminVenue.fulfilled, (state, action) => {
        const idx = state.venues.findIndex((v) => v.id === action.payload.id);
        if (idx !== -1) state.venues[idx] = action.payload;
      })
      .addCase(deleteAdminVenue.fulfilled, (state, action) => {
        state.venues = state.venues.filter((v) => v.id !== action.payload);
      });

    // Groups
    builder
      .addCase(fetchAdminGroups.pending, (state) => {
        state.groupsLoading = true;
      })
      .addCase(fetchAdminGroups.fulfilled, (state, action) => {
        state.groupsLoading = false;
        state.groups = action.payload;
      })
      .addCase(fetchAdminGroups.rejected, (state, action) => {
        state.groupsLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateAdminGroup.fulfilled, (state, action) => {
        if (state.groups) {
          const idx = state.groups.items.findIndex(
            (g) => g.id === action.payload.id,
          );
          if (idx !== -1)
            state.groups.items[idx] = {
              ...state.groups.items[idx],
              ...action.payload,
            };
        }
      })
      .addCase(deleteAdminGroup.fulfilled, (state, action) => {
        if (state.groups) {
          state.groups.items = state.groups.items.filter(
            (g) => g.id !== action.payload,
          );
          state.groups.total -= 1;
        }
      })
      .addCase(createAdminGroup.fulfilled, (state, action) => {
        if (state.groups) {
          state.groups.items.unshift(action.payload);
          state.groups.total += 1;
        }
      })
      .addCase(createAdminUser.fulfilled, (state, action) => {
        if (state.users) {
          state.users.items.unshift(action.payload);
          state.users.total += 1;
        }
      });

    // Group members
    builder
      .addCase(fetchGroupMembers.pending, (state) => {
        state.groupMembersLoading = true;
      })
      .addCase(fetchGroupMembers.fulfilled, (state, action) => {
        state.groupMembersLoading = false;
        state.groupMembers[action.payload.groupId] = action.payload.members;
      })
      .addCase(fetchGroupMembers.rejected, (state, action) => {
        state.groupMembersLoading = false;
        state.error = action.payload as string;
      })
      .addCase(addGroupMember.fulfilled, (state, action) => {
        const { groupId, member } = action.payload;
        if (!state.groupMembers[groupId]) state.groupMembers[groupId] = [];
        state.groupMembers[groupId].push(member);
        if (state.groups) {
          const g = state.groups.items.find((g) => g.id === groupId);
          if (g) g.member_count += 1;
        }
      })
      .addCase(removeGroupMember.fulfilled, (state, action) => {
        const { groupId, userId } = action.payload;
        if (state.groupMembers[groupId]) {
          state.groupMembers[groupId] = state.groupMembers[groupId].filter(
            (m) => m.user_id !== userId,
          );
        }
        if (state.groups) {
          const g = state.groups.items.find((g) => g.id === groupId);
          if (g) g.member_count = Math.max(0, g.member_count - 1);
        }
      })
      .addCase(updateGroupMemberRole.fulfilled, (state, action) => {
        const { groupId, userId, role } = action.payload;
        if (state.groupMembers[groupId]) {
          const m = state.groupMembers[groupId].find(
            (m) => m.user_id === userId,
          );
          if (m) m.role = role;
        }
      })
      .addCase(transferGroupOwnership.fulfilled, (state, action) => {
        const { groupId, userId } = action.payload;
        if (state.groups) {
          const g = state.groups.items.find((g) => g.id === groupId);
          if (g) g.owner_id = userId;
        }
      });

    // Predictions
    builder
      .addCase(fetchAdminPredictions.pending, (state) => {
        state.predictionsLoading = true;
      })
      .addCase(fetchAdminPredictions.fulfilled, (state, action) => {
        state.predictionsLoading = false;
        state.predictions = action.payload;
      })
      .addCase(fetchAdminPredictions.rejected, (state, action) => {
        state.predictionsLoading = false;
        state.error = action.payload as string;
      });

    // Notifications
    builder
      .addCase(fetchAdminNotifications.pending, (state) => {
        state.notificationsLoading = true;
      })
      .addCase(fetchAdminNotifications.fulfilled, (state, action) => {
        state.notificationsLoading = false;
        state.notifications = action.payload;
      })
      .addCase(fetchAdminNotifications.rejected, (state, action) => {
        state.notificationsLoading = false;
        state.error = action.payload as string;
      });

    // People (admin team)
    builder
      .addCase(fetchAdminPeople.pending, (state) => {
        state.peopleLoading = true;
      })
      .addCase(fetchAdminPeople.fulfilled, (state, action) => {
        state.peopleLoading = false;
        state.people = action.payload;
      })
      .addCase(fetchAdminPeople.rejected, (state, action) => {
        state.peopleLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createAdminPerson.fulfilled, (state, action) => {
        state.people.push(action.payload);
      })
      .addCase(updateAdminPerson.fulfilled, (state, action) => {
        const idx = state.people.findIndex((p) => p.id === action.payload.id);
        if (idx !== -1) state.people[idx] = action.payload;
      })
      .addCase(deleteAdminPerson.fulfilled, (state, action) => {
        state.people = state.people.filter((p) => p.id !== action.payload);
      });

    // Admin profile
    builder
      .addCase(fetchAdminProfile.fulfilled, (state, action) => {
        state.adminProfile = action.payload;
      })
      .addCase(updateAdminProfile.pending, (state) => {
        state.profileUpdateLoading = true;
        state.profileUpdateError = null;
      })
      .addCase(updateAdminProfile.fulfilled, (state, action) => {
        state.profileUpdateLoading = false;
        state.adminProfile = {
          ...state.adminProfile,
          ...action.payload,
        } as AdminProfile;
      })
      .addCase(updateAdminProfile.rejected, (state, action) => {
        state.profileUpdateLoading = false;
        state.profileUpdateError = action.payload as string;
      });

    // OTP
    builder
      .addCase(fetchAdminOtpRequests.pending, (state) => {
        state.otpLoading = true;
      })
      .addCase(fetchAdminOtpRequests.fulfilled, (state, action) => {
        state.otpLoading = false;
        state.otpRequests = action.payload;
      })
      .addCase(fetchAdminOtpRequests.rejected, (state, action) => {
        state.otpLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchAdminAdRequests.pending, (state) => {
        state.adRequestsLoading = true;
      })
      .addCase(fetchAdminAdRequests.fulfilled, (state, action) => {
        state.adRequestsLoading = false;
        state.adRequests = action.payload;
      })
      .addCase(fetchAdminAdRequests.rejected, (state, action) => {
        state.adRequestsLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateAdminAdRequest.fulfilled, (state, action) => {
        if (state.adRequests) {
          const idx = state.adRequests.data.findIndex(
            (r) => r.id === action.payload.id,
          );
          if (idx !== -1) {
            state.adRequests.data[idx] = action.payload;
          }
        }
      })
      .addCase(deleteAdminAdRequest.fulfilled, (state, action) => {
        if (state.adRequests) {
          state.adRequests.data = state.adRequests.data.filter(
            (r) => r.id !== action.payload,
          );
          state.adRequests.total = Math.max(0, state.adRequests.total - 1);
        }
      });
  },
});

export const {
  adminLogout,
  adminResetLoginStep,
  clearAdminError,
  setSelectedCompetitionId,
} = adminSlice.actions;
export default adminSlice.reducer;
