import "./global.css";
import "./i18n";

import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { Provider } from "react-redux";
import { useEffect } from "react";

import { store } from "./store";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { bootstrapAuth } from "./store/slices/authSlice";
import { AppShell } from "./components/fanquin/app-shell";
import { PlaceholderPage } from "./components/fanquin/page-placeholder";
import GroupHub from "./pages/GroupHub";
import CreateGroup from "./pages/CreateGroup";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MyGroups from "./pages/MyGroups";
import GroupPage from "./pages/GroupPage";
import ProfilePage from "./pages/ProfilePage";
import DraftPage from "./pages/DraftPage";
import JoinPage from "./pages/JoinPage";
import LivePage from "./pages/LivePage";
import { useTranslation } from "react-i18next";

const queryClient = new QueryClient();

function AuthBootstrap() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(bootstrapAuth());
  }, [dispatch]);
  return null;
}

/** Redirects to "/" if not authenticated. Waits for bootstrap before deciding. */
function RequireAuth() {
  const sessionToken = useAppSelector((s) => s.auth.sessionToken);
  const profileLoading = useAppSelector((s) => s.auth.profileLoading);
  const location = useLocation();

  // Still validating the stored token — render nothing (AppShell skeleton shows)
  if (profileLoading) return null;

  if (!sessionToken) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

const App = () => {
  const { t } = useTranslation();
  return (
    <HelmetProvider>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthBootstrap />
              <Routes>
                <Route element={<AppShell />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/groups/world-cup-crew" element={<GroupHub />} />
                  <Route path="/join/:code" element={<JoinPage />} />
                  <Route path="/groups/new" element={<CreateGroup />} />

                  {/* Protected routes — require authentication */}
                  <Route element={<RequireAuth />}>
                    <Route path="/groups" element={<MyGroups />} />
                    <Route path="/groups/:id" element={<GroupPage />} />
                    <Route path="/groups/:id/draft" element={<DraftPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                  </Route>
                  <Route path="/live" element={<LivePage />} />
                  <Route
                    path="/scoring"
                    element={
                      <PlaceholderPage
                        badge={t("placeholder.routes.scoring.badge")}
                        title={t("placeholder.routes.scoring.title")}
                        description={t(
                          "placeholder.routes.scoring.description",
                        )}
                        highlights={
                          t("placeholder.routes.scoring.highlights", {
                            returnObjects: true,
                          }) as string[]
                        }
                      />
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </Provider>
    </HelmetProvider>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
