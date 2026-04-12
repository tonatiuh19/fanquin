import { configureStore } from "@reduxjs/toolkit";
import groupWizardReducer from "./slices/groupWizardSlice";
import authReducer from "./slices/authSlice";
import groupsReducer from "./slices/groupsSlice";
import draftReducer from "./slices/draftSlice";
import liveReducer from "./slices/liveSlice";
import predictionsReducer from "./slices/predictionsSlice";
import survivorReducer from "./slices/survivorSlice";
import notificationsReducer from "./slices/notificationsSlice";
import legalReducer from "./slices/legalSlice";
import supportReducer from "./slices/supportSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    groupWizard: groupWizardReducer,
    groups: groupsReducer,
    draft: draftReducer,
    live: liveReducer,
    predictions: predictionsReducer,
    survivor: survivorReducer,
    notifications: notificationsReducer,
    legal: legalReducer,
    support: supportReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
