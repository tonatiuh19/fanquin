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
import ScoringPage from "./pages/ScoringPage";
import LegalDocPage from "./pages/LegalDocPage";
import FaqPage from "./pages/FaqPage";
import { useTranslation } from "react-i18next";
import { AdminShell } from "./components/fanquin/admin-shell";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCompetitions from "./pages/admin/AdminCompetitions";
import AdminMatches from "./pages/admin/AdminMatches";
import AdminGroups from "./pages/admin/AdminGroups";
import AdminVenues from "./pages/admin/AdminVenues";
import AdminPredictions from "./pages/admin/AdminPredictions";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminOtpRequests from "./pages/admin/AdminOtpRequests";
import AdminServices from "./pages/admin/AdminServices";
import AdminProfile from "./pages/admin/AdminProfile";
import AdminPeople from "./pages/admin/AdminPeople";
import AdminAds from "./pages/admin/AdminAds";
import AdvertisePage from "./pages/AdvertisePage";

const queryClient = new QueryClient();

function AuthBootstrap() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(bootstrapAuth());
  }, [dispatch]);
  return null;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
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

/** Redirects to "/admin/login" if not authenticated as admin. */
function RequireAdmin() {
  const isAuthenticated = useAppSelector((s) => s.admin.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
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
              <ScrollToTop />
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
                    <Route path="/live" element={<LivePage />} />
                  </Route>
                  <Route path="/scoring" element={<ScoringPage />} />
                  <Route
                    path="/privacy"
                    element={<LegalDocPage type="privacy" />}
                  />
                  <Route
                    path="/terms"
                    element={<LegalDocPage type="terms" />}
                  />
                  <Route path="/faq" element={<FaqPage />} />
                  <Route path="/advertise" element={<AdvertisePage />} />
                  <Route path="*" element={<NotFound />} />
                </Route>

                {/* Admin routes — completely separate from main app */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route element={<RequireAdmin />}>
                  <Route element={<AdminShell />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route
                      path="/admin/competitions"
                      element={<AdminCompetitions />}
                    />
                    <Route path="/admin/matches" element={<AdminMatches />} />
                    <Route path="/admin/groups" element={<AdminGroups />} />
                    <Route path="/admin/venues" element={<AdminVenues />} />
                    <Route
                      path="/admin/predictions"
                      element={<AdminPredictions />}
                    />
                    <Route
                      path="/admin/notifications"
                      element={<AdminNotifications />}
                    />
                    <Route
                      path="/admin/otp-requests"
                      element={<AdminOtpRequests />}
                    />
                    <Route path="/admin/services" element={<AdminServices />} />
                    <Route path="/admin/profile" element={<AdminProfile />} />
                    <Route path="/admin/people" element={<AdminPeople />} />
                    <Route path="/admin/ads" element={<AdminAds />} />
                  </Route>
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
