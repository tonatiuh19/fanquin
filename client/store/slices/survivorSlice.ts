import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";

export interface SurvivorMember {
  user_id: string;
  survivor_lives: number;
  is_eliminated: boolean;
  total_points: number;
  prediction_pts: number;
  weekly_pts: number;
}

interface SurvivorState {
  data: {
    survivor_lives_start: number;
    members: SurvivorMember[];
    rounds: unknown[];
  } | null;
  loading: boolean;
  groupId: string | null;
}

const initialState: SurvivorState = {
  data: null,
  loading: false,
  groupId: null,
};

export const fetchSurvivor = createAsyncThunk(
  "survivor/fetch",
  async (groupId: string, { getState, rejectWithValue }) => {
    const token =
      (getState() as RootState).auth.sessionToken ??
      localStorage.getItem("fanquin_session");
    if (!token) return rejectWithValue("not authenticated");
    try {
      const { data } = await axios.get<{
        success: boolean;
        data: {
          survivor_lives_start: number;
          members: SurvivorMember[];
          rounds: unknown[];
        };
      }>(`/api/groups/${groupId}/survivor`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { groupId, data: data.data };
    } catch {
      return rejectWithValue("Failed to load survivor data");
    }
  },
);

const survivorSlice = createSlice({
  name: "survivor",
  initialState,
  reducers: {
    clearSurvivor(state) {
      state.data = null;
      state.groupId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSurvivor.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSurvivor.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload.data;
        state.groupId = action.payload.groupId;
      })
      .addCase(fetchSurvivor.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const { clearSurvivor } = survivorSlice.actions;
export default survivorSlice.reducer;
