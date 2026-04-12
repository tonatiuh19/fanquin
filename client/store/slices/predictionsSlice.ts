import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";
import type { BonusPredictionDetails } from "@shared/api";

// ── Types ─────────────────────────────────────────────────────────

export interface SubmitPredictionArgs {
  match_id: string;
  group_id: string;
  group_name: string;
  predicted_home: number;
  predicted_away: number;
  details?: BonusPredictionDetails;
}

interface PredictionsState {
  /** keyed by `${group_id}_${match_id}` */
  submitting: Record<string, boolean>;
  errors: Record<string, string | null>;
  succeeded: Record<string, boolean>;
}

const initialState: PredictionsState = {
  submitting: {},
  errors: {},
  succeeded: {},
};

// ── Thunk ─────────────────────────────────────────────────────────

export const submitPrediction = createAsyncThunk(
  "predictions/submit",
  async (args: SubmitPredictionArgs, { getState, rejectWithValue }) => {
    try {
      const token =
        (getState() as RootState).auth.sessionToken ??
        localStorage.getItem("fanquin_session");

      await axios.post(
        "/api/predictions",
        {
          match_id: args.match_id,
          group_id: args.group_id,
          predicted_home: args.predicted_home,
          predicted_away: args.predicted_away,
          ...(args.details &&
            Object.keys(args.details).length > 0 && { details: args.details }),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      return args;
    } catch (err: any) {
      const msg = err.response?.data?.message ?? "Failed to submit prediction.";
      return rejectWithValue({ ...args, message: msg });
    }
  },
);

// ── Slice ─────────────────────────────────────────────────────────

const predictionsSlice = createSlice({
  name: "predictions",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(submitPrediction.pending, (state, action) => {
        const key = `${action.meta.arg.group_id}_${action.meta.arg.match_id}`;
        state.submitting[key] = true;
        delete state.errors[key];
        delete state.succeeded[key];
      })
      .addCase(submitPrediction.fulfilled, (state, action) => {
        const key = `${action.payload.group_id}_${action.payload.match_id}`;
        state.submitting[key] = false;
        state.succeeded[key] = true;
      })
      .addCase(submitPrediction.rejected, (state, action) => {
        const p = action.payload as {
          group_id: string;
          match_id: string;
          message: string;
        };
        const key = `${p.group_id}_${p.match_id}`;
        state.submitting[key] = false;
        state.errors[key] = p.message;
      });
  },
});

export default predictionsSlice.reducer;
