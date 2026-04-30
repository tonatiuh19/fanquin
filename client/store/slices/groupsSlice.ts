import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import type { Group, LeaderboardEntry, TeamOwnership } from "@shared/api";
import type { RootState } from "../index";

// ── Thunks ────────────────────────────────────────────────────────

export const fetchMyGroups = createAsyncThunk(
  "groups/fetchMy",
  async (_, { getState, rejectWithValue }) => {
    const token =
      (getState() as RootState).auth.sessionToken ??
      localStorage.getItem("fanquin_session");
    if (!token) return rejectWithValue("not authenticated");
    try {
      const { data } = await axios.get<{ success: boolean; data: Group[] }>(
        "/api/groups",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return data.data;
    } catch {
      return rejectWithValue("Failed to load groups");
    }
  },
);

export const fetchGroupById = createAsyncThunk(
  "groups/fetchById",
  async (id: string, { getState, rejectWithValue }) => {
    const token =
      (getState() as RootState).auth.sessionToken ??
      localStorage.getItem("fanquin_session");
    if (!token) return rejectWithValue("not authenticated");
    try {
      const { data } = await axios.get<{ success: boolean; data: Group }>(
        `/api/groups/${id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return data.data;
    } catch {
      return rejectWithValue("Failed to load group");
    }
  },
);

export const fetchLeaderboard = createAsyncThunk(
  "groups/fetchLeaderboard",
  async (groupId: string, { getState, rejectWithValue }) => {
    const token =
      (getState() as RootState).auth.sessionToken ??
      localStorage.getItem("fanquin_session");
    if (!token) return rejectWithValue("not authenticated");
    try {
      const { data } = await axios.get<{
        success: boolean;
        data: LeaderboardEntry[];
      }>(`/api/groups/${groupId}/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return data.data;
    } catch {
      return rejectWithValue("Failed to load leaderboard");
    }
  },
);

export const fetchGroupOwnership = createAsyncThunk(
  "groups/fetchOwnership",
  async (groupId: string, { getState, rejectWithValue }) => {
    const token =
      (getState() as RootState).auth.sessionToken ??
      localStorage.getItem("fanquin_session");
    if (!token) return rejectWithValue("not authenticated");
    try {
      const { data } = await axios.get<{
        success: boolean;
        data: TeamOwnership[];
      }>(`/api/groups/${groupId}/ownership`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return data.data;
    } catch {
      return rejectWithValue("Failed to load ownership");
    }
  },
);

// ── State ─────────────────────────────────────────────────────────

interface GroupsState {
  myGroups: Group[];
  myGroupsLoading: boolean;
  currentGroup: Group | null;
  currentGroupLoading: boolean;
  leaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;
  ownedTeams: TeamOwnership[];
  ownedTeamsLoading: boolean;
  error: string | null;
}

const initialState: GroupsState = {
  myGroups: [],
  myGroupsLoading: false,
  currentGroup: null,
  currentGroupLoading: false,
  leaderboard: [],
  leaderboardLoading: false,
  ownedTeams: [],
  ownedTeamsLoading: false,
  error: null,
};

// ── Slice ─────────────────────────────────────────────────────────

const groupsSlice = createSlice({
  name: "groups",
  initialState,
  reducers: {
    clearCurrentGroup(state) {
      state.currentGroup = null;
    },
    clearGroupData(state) {
      state.leaderboard = [];
      state.ownedTeams = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyGroups.pending, (state) => {
        state.myGroupsLoading = true;
        state.error = null;
      })
      .addCase(fetchMyGroups.fulfilled, (state, action) => {
        state.myGroups = action.payload;
        state.myGroupsLoading = false;
      })
      .addCase(fetchMyGroups.rejected, (state, action) => {
        state.myGroupsLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchGroupById.pending, (state) => {
        state.currentGroupLoading = true;
        state.error = null;
      })
      .addCase(fetchGroupById.fulfilled, (state, action) => {
        state.currentGroup = action.payload;
        state.currentGroupLoading = false;
      })
      .addCase(fetchGroupById.rejected, (state, action) => {
        state.currentGroupLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchLeaderboard.pending, (state) => {
        state.leaderboardLoading = true;
      })
      .addCase(fetchLeaderboard.fulfilled, (state, action) => {
        state.leaderboard = action.payload;
        state.leaderboardLoading = false;
      })
      .addCase(fetchLeaderboard.rejected, (state) => {
        state.leaderboardLoading = false;
      })
      .addCase(fetchGroupOwnership.pending, (state) => {
        state.ownedTeamsLoading = true;
      })
      .addCase(fetchGroupOwnership.fulfilled, (state, action) => {
        state.ownedTeams = action.payload;
        state.ownedTeamsLoading = false;
      })
      .addCase(fetchGroupOwnership.rejected, (state) => {
        state.ownedTeamsLoading = false;
      });
  },
});

export const { clearCurrentGroup, clearGroupData } = groupsSlice.actions;
export default groupsSlice.reducer;
