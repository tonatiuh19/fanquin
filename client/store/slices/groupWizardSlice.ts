import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import type {
  Competition,
  Group,
  GroupMode,
  CreateGroupRequest,
} from "@shared/api";
import type { RootState } from "../index";

// ── Thunks ────────────────────────────────────────────────────────

export const fetchCompetitions = createAsyncThunk(
  "groupWizard/fetchCompetitions",
  async () => {
    const { data } = await axios.get<{ success: true; data: Competition[] }>(
      "/api/competitions",
    );
    return data.data;
  },
);

export const createGroup = createAsyncThunk(
  "groupWizard/createGroup",
  async (payload: CreateGroupRequest, { getState, rejectWithValue }) => {
    const sessionToken =
      (getState() as RootState).auth?.sessionToken ??
      (getState() as RootState).groupWizard.sessionToken ??
      localStorage.getItem("fanquin_session");

    if (!sessionToken) {
      return rejectWithValue("Not authenticated. Please sign in first.");
    }

    try {
      const { data } = await axios.post<{ success: true; data: Group }>(
        "/api/groups",
        payload,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        return rejectWithValue(
          err.response?.data?.message ?? "Failed to create group.",
        );
      }
      return rejectWithValue("Failed to create group.");
    }
  },
);

// ── State ─────────────────────────────────────────────────────────

export interface GroupWizardState {
  step: number; // 1 | 2 | 3 | 4
  // Step 1
  mode: GroupMode | null;
  // Step 2
  name: string;
  competitionId: string;
  draftType: "snake" | "random" | "balanced_tier";
  maxMembers: number;
  // Competitions list
  competitions: Competition[];
  competitionsLoading: boolean;
  // Submission
  submitting: boolean;
  error: string | null;
  createdGroup: Group | null;
  // Auth
  sessionToken: string | null;
}

const initialState: GroupWizardState = {
  step: 1,
  mode: null,
  name: "",
  competitionId: "",
  draftType: "snake",
  maxMembers: 20,
  competitions: [],
  competitionsLoading: false,
  submitting: false,
  error: null,
  createdGroup: null,
  sessionToken: null,
};

// ── Slice ─────────────────────────────────────────────────────────

const groupWizardSlice = createSlice({
  name: "groupWizard",
  initialState,
  reducers: {
    setStep(state, action: PayloadAction<number>) {
      state.step = action.payload;
    },
    setMode(state, action: PayloadAction<GroupMode>) {
      state.mode = action.payload;
    },
    setName(state, action: PayloadAction<string>) {
      state.name = action.payload;
    },
    setCompetitionId(state, action: PayloadAction<string>) {
      state.competitionId = action.payload;
    },
    setDraftType(
      state,
      action: PayloadAction<"snake" | "random" | "balanced_tier">,
    ) {
      state.draftType = action.payload;
    },
    setMaxMembers(state, action: PayloadAction<number>) {
      state.maxMembers = action.payload;
    },
    setSessionToken(state, action: PayloadAction<string>) {
      state.sessionToken = action.payload;
    },
    resetWizard() {
      return initialState;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchCompetitions
    builder
      .addCase(fetchCompetitions.pending, (state) => {
        state.competitionsLoading = true;
      })
      .addCase(fetchCompetitions.fulfilled, (state, action) => {
        state.competitionsLoading = false;
        state.competitions = action.payload;
        if (action.payload.length > 0 && !state.competitionId) {
          state.competitionId = action.payload[0].id;
        }
      })
      .addCase(fetchCompetitions.rejected, (state) => {
        state.competitionsLoading = false;
      });

    // createGroup
    builder
      .addCase(createGroup.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.submitting = false;
        state.createdGroup = action.payload;
        state.step = 4;
      })
      .addCase(createGroup.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setStep,
  setMode,
  setName,
  setCompetitionId,
  setDraftType,
  setMaxMembers,
  setSessionToken,
  resetWizard,
  clearError,
} = groupWizardSlice.actions;

export default groupWizardSlice.reducer;
