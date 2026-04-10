import { configureStore } from "@reduxjs/toolkit";
import groupWizardReducer from "./slices/groupWizardSlice";
import authReducer from "./slices/authSlice";
import groupsReducer from "./slices/groupsSlice";
import draftReducer from "./slices/draftSlice";
import liveReducer from "./slices/liveSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    groupWizard: groupWizardReducer,
    groups: groupsReducer,
    draft: draftReducer,
    live: liveReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
