import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "@/store";
import type {
  CreateSupportCaseRequest,
  CreateSupportCaseResponse,
} from "@shared/api";

export const submitSupportCase = createAsyncThunk(
  "support/submitCase",
  async (payload: CreateSupportCaseRequest, { getState, rejectWithValue }) => {
    const { sessionToken } = (getState() as RootState).auth;
    try {
      const { data } = await axios.post<CreateSupportCaseResponse>(
        "/api/support/cases",
        payload,
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
      return data.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        return rejectWithValue(
          err.response?.data?.message ?? "Failed to submit support case.",
        );
      }
      return rejectWithValue("Failed to submit support case.");
    }
  },
);

interface SupportState {
  submitting: boolean;
  submitted: boolean;
  error: string | null;
}

const initialState: SupportState = {
  submitting: false,
  submitted: false,
  error: null,
};

const supportSlice = createSlice({
  name: "support",
  initialState,
  reducers: {
    resetSupportForm(state) {
      state.submitting = false;
      state.submitted = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitSupportCase.pending, (state) => {
        state.submitting = true;
        state.submitted = false;
        state.error = null;
      })
      .addCase(submitSupportCase.fulfilled, (state) => {
        state.submitting = false;
        state.submitted = true;
        state.error = null;
      })
      .addCase(submitSupportCase.rejected, (state, action) => {
        state.submitting = false;
        state.error = (action.payload as string) ?? "Unknown error";
      });
  },
});

export const { resetSupportForm } = supportSlice.actions;
export default supportSlice.reducer;
