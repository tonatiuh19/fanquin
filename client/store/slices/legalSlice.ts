import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import type { LegalDocument, GetLegalDocResponse } from "@shared/api";

interface LegalState {
  privacy: LegalDocument | null;
  terms: LegalDocument | null;
  loading: boolean;
  error: string | null;
}

const initialState: LegalState = {
  privacy: null,
  terms: null,
  loading: false,
  error: null,
};

export const fetchLegalDoc = createAsyncThunk(
  "legal/fetchLegalDoc",
  async (type: "privacy" | "terms") => {
    const { data } = await axios.get<GetLegalDocResponse>(`/api/legal/${type}`);
    return data.data;
  },
);

const legalSlice = createSlice({
  name: "legal",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLegalDoc.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLegalDoc.fulfilled, (state, action) => {
        state.loading = false;
        state[action.payload.type] = action.payload;
      })
      .addCase(fetchLegalDoc.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Error al cargar el documento";
      });
  },
});

export default legalSlice.reducer;
