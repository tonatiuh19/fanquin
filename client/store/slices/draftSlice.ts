import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import type { DraftState, SubmitPickRequest } from "@shared/api";
import type { RootState } from "../index";

// ── Thunks ────────────────────────────────────────────────────────

export const fetchDraftState = createAsyncThunk(
  "draft/fetchState",
  async (groupId: string, { getState, rejectWithValue }) => {
    const token =
      (getState() as RootState).auth.sessionToken ??
      localStorage.getItem("fanquin_session");
    if (!token) return rejectWithValue("not authenticated");
    try {
      const { data } = await axios.get<{ success: boolean; data: DraftState }>(
        `/api/groups/${groupId}/draft`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return data.data;
    } catch {
      return rejectWithValue("Failed to load draft state");
    }
  },
);

export const submitPick = createAsyncThunk(
  "draft/submitPick",
  async (
    { groupId, team_id }: { groupId: string } & SubmitPickRequest,
    { getState, rejectWithValue },
  ) => {
    const token =
      (getState() as RootState).auth.sessionToken ??
      localStorage.getItem("fanquin_session");
    if (!token) return rejectWithValue("not authenticated");
    try {
      const { data } = await axios.post<{
        success: boolean;
        data: {
          pick_number: number;
          round: number;
          next_picker_id: string | null;
          is_complete: boolean;
        };
      }>(
        `/api/groups/${groupId}/picks`,
        { team_id },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to submit pick",
      );
    }
  },
);

// ── State ─────────────────────────────────────────────────────────

interface DraftSliceState {
  draftState: DraftState | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  pickError: string | null;
}

const initialState: DraftSliceState = {
  draftState: null,
  loading: false,
  submitting: false,
  error: null,
  pickError: null,
};

// ── Slice ─────────────────────────────────────────────────────────

const draftSlice = createSlice({
  name: "draft",
  initialState,
  reducers: {
    clearPickError(state) {
      state.pickError = null;
    },
    clearDraft(state) {
      state.draftState = null;
      state.error = null;
      state.pickError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDraftState.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDraftState.fulfilled, (state, action) => {
        state.loading = false;
        state.draftState = action.payload;
      })
      .addCase(fetchDraftState.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(submitPick.pending, (state) => {
        state.submitting = true;
        state.pickError = null;
      })
      .addCase(submitPick.fulfilled, (state, action) => {
        state.submitting = false;
        // When the last pick is submitted the group transitions to "active",
        // so a subsequent fetchDraftState will fail (group no longer in draft).
        // Reflect is_complete directly so the completion screen renders immediately.
        if (action.payload.is_complete && state.draftState) {
          state.draftState.session.is_complete = true;
        }
      })
      .addCase(submitPick.rejected, (state, action) => {
        state.submitting = false;
        state.pickError = action.payload as string;
      });
  },
});

export const { clearPickError, clearDraft } = draftSlice.actions;
export default draftSlice.reducer;
