import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../index";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationsState {
  notifications: AppNotification[];
  unread_count: number;
  loading: boolean;
}

const initialState: NotificationsState = {
  notifications: [],
  unread_count: 0,
  loading: false,
};

export const fetchNotifications = createAsyncThunk(
  "notifications/fetch",
  async (_, { getState, rejectWithValue }) => {
    const token =
      (getState() as RootState).auth.sessionToken ??
      localStorage.getItem("fanquin_session");
    if (!token) return rejectWithValue("not authenticated");
    try {
      const { data } = await axios.get<{
        success: boolean;
        data: { notifications: AppNotification[]; unread_count: number };
      }>("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return data.data;
    } catch {
      return rejectWithValue("Failed to load notifications");
    }
  },
);

export const markNotificationRead = createAsyncThunk(
  "notifications/markRead",
  async (id: string, { getState, rejectWithValue }) => {
    const token =
      (getState() as RootState).auth.sessionToken ??
      localStorage.getItem("fanquin_session");
    if (!token) return rejectWithValue("not authenticated");
    try {
      await axios.patch(
        `/api/notifications/${id}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return id;
    } catch {
      return rejectWithValue("Failed to mark notification as read");
    }
  },
);

export const markAllNotificationsRead = createAsyncThunk(
  "notifications/markAllRead",
  async (_, { getState, rejectWithValue }) => {
    const token =
      (getState() as RootState).auth.sessionToken ??
      localStorage.getItem("fanquin_session");
    if (!token) return rejectWithValue("not authenticated");
    try {
      await axios.patch(
        "/api/notifications/read-all",
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch {
      return rejectWithValue("Failed to mark all notifications as read");
    }
  },
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.notifications;
        state.unread_count = action.payload.unread_count;
      })
      .addCase(fetchNotifications.rejected, (state) => {
        state.loading = false;
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const n = state.notifications.find((n) => n.id === action.payload);
        if (n && !n.is_read) {
          n.is_read = true;
          state.unread_count = Math.max(0, state.unread_count - 1);
        }
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.notifications.forEach((n) => (n.is_read = true));
        state.unread_count = 0;
      });
  },
});

export default notificationsSlice.reducer;
