import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { adminLogout } from "@/store/slices/adminSlice";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Trophy,
  Swords,
  MapPin,
  ShieldX,
  BarChart3,
  Bell,
  KeyRound,
  Activity,
  LogOut,
  Shield,
  ShieldCheck,
  ChevronRight,
  UserCircle,
  Menu,
  X,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/people", label: "People", icon: ShieldCheck },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/competitions", label: "Competitions", icon: Trophy },
  { href: "/admin/matches", label: "Matches", icon: Swords },
  { href: "/admin/groups", label: "Groups", icon: ShieldX },
  { href: "/admin/predictions", label: "Predictions", icon: BarChart3 },
  { href: "/admin/venues", label: "Venues", icon: MapPin },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/otp-requests", label: "OTP Audit", icon: KeyRound },
  { href: "/admin/services", label: "Services", icon: Activity },
  { href: "/admin/ads", label: "Ad Requests", icon: Megaphone },
];

export function AdminShell() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const adminProfile = useAppSelector((s) => s.admin.adminProfile);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    dispatch(adminLogout());
    navigate("/admin/login", { replace: true });
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between gap-2 px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight text-white">
              FanQuin
            </div>
            <div className="text-[10px] font-medium text-white/40 uppercase tracking-widest">
              Admin
            </div>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="md:hidden flex items-center justify-center w-7 h-7 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 py-3">
        <nav className="px-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                  isActive
                    ? "bg-violet-500/15 text-violet-300 border border-violet-500/20"
                    : "text-white/50 hover:text-white hover:bg-white/5",
                )}
              >
                <item.icon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    isActive
                      ? "text-violet-400"
                      : "text-white/40 group-hover:text-white/70",
                  )}
                />
                <span className="truncate">{item.label}</span>
                {isActive && (
                  <ChevronRight className="w-3 h-3 ml-auto text-violet-400" />
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 space-y-1">
        <Link
          to="/admin/profile"
          onClick={() => setSidebarOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group",
            pathname === "/admin/profile"
              ? "bg-violet-500/15 border border-violet-500/20"
              : "hover:bg-white/5",
          )}
        >
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/30 to-fuchsia-600/30 border border-violet-500/20 shrink-0">
            <UserCircle className="w-3.5 h-3.5 text-violet-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-xs font-medium truncate",
                pathname === "/admin/profile"
                  ? "text-violet-300"
                  : "text-white/60 group-hover:text-white",
              )}
            >
              {adminProfile?.display_name ?? adminProfile?.username ?? "Admin"}
            </p>
            <p className="text-[10px] text-white/25 truncate">
              {adminProfile?.email ?? "Edit profile"}
            </p>
          </div>
        </Link>

        <Separator className="my-1 bg-white/5" />
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-[#0a0a0f] text-white">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — desktop always visible, mobile slide-in drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-white/10 bg-[#0d0d14] transition-transform duration-300 md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-[#0d0d14] px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-600">
              <Shield className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold text-white">FanQuin Admin</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
