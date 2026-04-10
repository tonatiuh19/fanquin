import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import i18n from "@/i18n";
import type { UserProfile } from "@shared/api";
import type { RootState } from "../index";

// ── State ────────────────────────────────────────────────────────

interface AuthState {
  sessionToken: string | null;
  userProfile: UserProfile | null;
  profileLoading: boolean;
}

const initialState: AuthState = {
  sessionToken: localStorage.getItem("fanquin_session"),
  userProfile: null,
  profileLoading: false,
};

// ── Thunks ───────────────────────────────────────────────────────

export const bootstrapAuth = createAsyncThunk(
  "auth/bootstrap",
  async (_, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.sessionToken;
    if (!token) return rejectWithValue("no token");
    try {
      const { data } = await axios.get<{ success: boolean; data: UserProfile }>(
        "/api/profile",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!data.success) return rejectWithValue("invalid session");
      return data.data;
    } catch {
      return rejectWithValue("session expired");
    }
  },
);

// ── Slice ────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth(
      state,
      action: PayloadAction<{ sessionToken: string; userProfile: UserProfile }>,
    ) {
      state.sessionToken = action.payload.sessionToken;
      state.userProfile = action.payload.userProfile;
      localStorage.setItem("fanquin_session", action.payload.sessionToken);
      // Persist the current UI language so bootstrapAuth does not overwrite it
      // with the DB profile default ('en') on subsequent page loads.
      if (!localStorage.getItem("fanquin_lang")) {
        localStorage.setItem("fanquin_lang", i18n.language);
      }
    },
    clearAuth(state) {
      state.sessionToken = null;
      state.userProfile = null;
      localStorage.removeItem("fanquin_session");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuth.pending, (state) => {
        state.profileLoading = true;
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.userProfile = action.payload;
        state.profileLoading = false;
        // Only apply a saved explicit language preference. Never derive the UI
        // language from profile.locale — it carries the DB column default ('en')
        // for users who never explicitly changed it.
        const savedLang = localStorage.getItem("fanquin_lang");
        if (savedLang) {
          // Apply the stored preference
          i18n.changeLanguage(savedLang);
        } else {
          // No stored preference yet — persist whatever language i18n is currently
          // using (the default 'es' from i18n config) so future loads stay stable.
          localStorage.setItem("fanquin_lang", i18n.language);
        }
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.profileLoading = false;
        state.sessionToken = null;
        state.userProfile = null;
        localStorage.removeItem("fanquin_session");
      });
  },
});

export const { setAuth, clearAuth } = authSlice.actions;
export default authSlice.reducer;
