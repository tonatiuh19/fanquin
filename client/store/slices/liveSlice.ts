import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import type { LivePageData, SyncResult } from "@shared/api";
import type { RootState } from "../index";

// ── State ─────────────────────────────────────────────────────────

interface LiveState {
  data: LivePageData | null;
  loading: boolean;
  error: string | null;
  syncing: boolean;
  syncResult: SyncResult | null;
  syncError: string | null;
  testResetting: boolean;
  testResetResult: string | null;
  testResetError: string | null;
}

const initialState: LiveState = {
  data: null,
  loading: false,
  error: null,
  syncing: false,
  syncResult: null,
  syncError: null,
  testResetting: false,
  testResetResult: null,
  testResetError: null,
};

// ── Thunks ────────────────────────────────────────────────────────

/**
 * Fetch live match data from OUR database.
 * Optional auth — pass token when available to include group predictions.
 */
export const fetchLiveData = createAsyncThunk(
  "live/fetch",
  async (competitionId: string | undefined, { getState, rejectWithValue }) => {
    try {
      const token =
        (getState() as RootState).auth.sessionToken ??
        localStorage.getItem("fanquin_session");

      const params = competitionId ? `?competition_id=${competitionId}` : "";
      const { data } = await axios.get<{
        success: boolean;
        data: LivePageData;
      }>(`/api/live${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return data.data;
    } catch {
      return rejectWithValue("Failed to load live data.");
    }
  },
);

/**
 * Trigger a sync with football-data.org.
 * Requires auth. Rate-limited to once per 5 minutes server-side.
 * After a successful sync, re-fetches live data automatically.
 */
export const syncMatches = createAsyncThunk(
  "live/sync",
  async (
    competitionId: string | undefined,
    { getState, dispatch, rejectWithValue },
  ) => {
    try {
      const token =
        (getState() as RootState).auth.sessionToken ??
        localStorage.getItem("fanquin_session");

      if (!token) return rejectWithValue("Not authenticated.");

      const params = competitionId ? `?competition_id=${competitionId}` : "";
      const { data } = await axios.post<{
        success: boolean;
        data: SyncResult;
        message?: string;
      }>(`/api/sync-matches${params}`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!data.success) {
        return rejectWithValue(data.message ?? "Sync failed.");
      }

      // Re-fetch live data after a successful sync
      dispatch(fetchLiveData(competitionId));

      return data.data;
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? "Sync failed. Please try again.";
      return rejectWithValue(msg);
    }
  },
);

/**
 * Reset the test league: all 5 matches rescheduled 5 min apart from now,
 * predictions cleared. Requires VITE_ADMIN_SECRET env var.
 */
export const resetTestLeague = createAsyncThunk(
  "live/resetTestLeague",
  async (competitionId: string | undefined, { dispatch, rejectWithValue }) => {
    try {
      const secret = import.meta.env.VITE_ADMIN_SECRET as string | undefined;
      if (!secret) return rejectWithValue("VITE_ADMIN_SECRET not set.");
      await axios.post(
        "/api/admin/test-league/reset?mode=all_scheduled",
        null,
        { headers: { "x-admin-secret": secret } },
      );
      dispatch(fetchLiveData(competitionId));
      return "ok";
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message ?? "Reset failed.");
    }
  },
);

// ── Slice ─────────────────────────────────────────────────────────

const liveSlice = createSlice({
  name: "live",
  initialState,
  reducers: {
    clearSyncResult(state) {
      state.syncResult = null;
      state.syncError = null;
    },
    clearTestResetResult(state) {
      state.testResetResult = null;
      state.testResetError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchLiveData
      .addCase(fetchLiveData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLiveData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchLiveData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // syncMatches
      .addCase(syncMatches.pending, (state) => {
        state.syncing = true;
        state.syncError = null;
        state.syncResult = null;
      })
      .addCase(syncMatches.fulfilled, (state, action) => {
        state.syncing = false;
        state.syncResult = action.payload ?? null;
      })
      .addCase(syncMatches.rejected, (state, action) => {
        state.syncing = false;
        state.syncError = action.payload as string;
      })
      // resetTestLeague
      .addCase(resetTestLeague.pending, (state) => {
        state.testResetting = true;
        state.testResetResult = null;
        state.testResetError = null;
      })
      .addCase(resetTestLeague.fulfilled, (state) => {
        state.testResetting = false;
        state.testResetResult = "ok";
      })
      .addCase(resetTestLeague.rejected, (state, action) => {
        state.testResetting = false;
        state.testResetError = action.payload as string;
      })
      // Optimistically update my_predictions when a prediction is submitted
      .addCase("predictions/submit/fulfilled", (state, action: any) => {
        if (!state.data) return;
        const {
          match_id,
          group_id,
          group_name,
          predicted_home,
          predicted_away,
        } = action.payload as {
          match_id: string;
          group_id: string;
          group_name: string;
          predicted_home: number;
          predicted_away: number;
        };
        for (const arr of [
          state.data.live,
          state.data.upcoming,
          state.data.recent,
        ]) {
          const match = arr.find((m) => m.id === match_id);
          if (match) {
            if (!match.my_predictions) match.my_predictions = {};
            match.my_predictions[group_id] = {
              group_id,
              group_name,
              predicted_home,
              predicted_away,
              result: "pending",
              points_earned: 0,
            };
          }
        }
      });
  },
});

export const { clearSyncResult, clearTestResetResult } = liveSlice.actions;
export default liveSlice.reducer;
