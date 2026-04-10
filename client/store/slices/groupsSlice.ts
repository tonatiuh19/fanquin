import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import type { Group } from "@shared/api";
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

// ── State ─────────────────────────────────────────────────────────

interface GroupsState {
  myGroups: Group[];
  myGroupsLoading: boolean;
  currentGroup: Group | null;
  currentGroupLoading: boolean;
  error: string | null;
}

const initialState: GroupsState = {
  myGroups: [],
  myGroupsLoading: false,
  currentGroup: null,
  currentGroupLoading: false,
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
      });
  },
});

export const { clearCurrentGroup } = groupsSlice.actions;
export default groupsSlice.reducer;
