import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import type { CreateAdRequestRequest } from "@shared/api";

export const submitAdRequest = createAsyncThunk(
  "advertise/submit",
  async (payload: CreateAdRequestRequest, { rejectWithValue }) => {
    try {
      const { data } = await axios.post<{
        success: boolean;
        data: { id: string };
      }>("/api/advertise", payload);
      return data.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        return rejectWithValue(
          err.response?.data?.message ?? "Failed to submit your request.",
        );
      }
      return rejectWithValue("Failed to submit your request.");
    }
  },
);

interface AdvertiseState {
  submitting: boolean;
  submitted: boolean;
  error: string | null;
}

const initialState: AdvertiseState = {
  submitting: false,
  submitted: false,
  error: null,
};

const advertiseSlice = createSlice({
  name: "advertise",
  initialState,
  reducers: {
    resetAdvertiseForm(state) {
      state.submitting = false;
      state.submitted = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitAdRequest.pending, (state) => {
        state.submitting = true;
        state.submitted = false;
        state.error = null;
      })
      .addCase(submitAdRequest.fulfilled, (state) => {
        state.submitting = false;
        state.submitted = true;
      })
      .addCase(submitAdRequest.rejected, (state, action) => {
        state.submitting = false;
        state.error = (action.payload as string) ?? "Unknown error";
      });
  },
});

export const { resetAdvertiseForm } = advertiseSlice.actions;
export default advertiseSlice.reducer;
