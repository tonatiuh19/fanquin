import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Home,
  LayoutGrid,
  Radio,
  Users,
  LogOut,
  ChevronDown,
  UserCircle,
} from "lucide-react";
import { OtpAuthModal } from "./OtpAuthModal";
import { useTranslation } from "react-i18next";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearAuth, setAuth } from "@/store/slices/authSlice";
import axios from "axios";

import { FanQuinLogo } from "./logo";

export function AppShell() {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const userProfile = useAppSelector((s) => s.auth.userProfile);
  const sessionToken = useAppSelector((s) => s.auth.sessionToken);
  const [authOpen, setAuthOpen] = useState(false);

  const displayName =
    userProfile?.display_name ||
    `${userProfile?.first_name ?? ""} ${userProfile?.last_name ?? ""}`.trim() ||
    userProfile?.username ||
    null;

  const initials = displayName
    ? displayName
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  const primaryNav = [
    { label: t("nav.home"), to: "/" },
    ...(userProfile
      ? [{ label: t("nav.myGroups"), to: "/groups" }]
      : [{ label: t("nav.groupHub"), to: "/groups/world-cup-crew" }]),
    { label: t("nav.live"), to: "/live" },
    { label: t("nav.scoring"), to: "/scoring" },
  ];

  const mobileNav = userProfile
    ? [
        { label: t("mobileNav.home"), to: "/", icon: Home },
        { label: t("nav.myGroups"), to: "/groups", icon: Users },
        { label: t("mobileNav.live"), to: "/live", icon: Radio },
        { label: t("nav.profile"), to: "/profile", icon: UserCircle },
      ]
    : [
        { label: t("mobileNav.home"), to: "/", icon: Home },
        {
          label: t("mobileNav.hub"),
          to: "/groups/world-cup-crew",
          icon: LayoutGrid,
        },
        { label: t("mobileNav.live"), to: "/live", icon: Radio },
        { label: t("mobileNav.groups"), to: "/groups", icon: Users },
      ];

  const footerLinks = [
    { label: t("footer.links.worldCupCrew"), to: "/groups/world-cup-crew" },
    { label: t("footer.links.privateGroups"), to: "/groups" },
    { label: t("footer.links.liveMoments"), to: "/live" },
    { label: t("footer.links.scoringEngine"), to: "/scoring" },
  ];

  const toggleLang = async () => {
    const next = i18n.language === "es" ? "en" : "es";
    i18n.changeLanguage(next);
    localStorage.setItem("fanquin_lang", next);
    if (sessionToken) {
      try {
        const { data } = await axios.patch(
          "/api/profile",
          { locale: next },
          { headers: { Authorization: `Bearer ${sessionToken}` } },
        );
        if (data.success && userProfile) {
          dispatch(setAuth({ sessionToken, userProfile: data.data }));
        }
      } catch {
        // non-critical — locale change already applied locally
      }
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-hero-radial opacity-90" />
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[34rem] bg-grid-fade opacity-40" />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/78 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between gap-4 md:h-20">
          <Link to="/" className="shrink-0">
            <FanQuinLogo />
          </Link>

          <nav className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 md:flex">
            {primaryNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-full px-4 py-2 text-sm font-medium text-foreground/70 transition hover:text-white",
                    isActive && "bg-white/10 text-white shadow-panel",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {userProfile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 pl-1 pr-3 py-1 text-sm text-white/80 transition hover:bg-white/10 hover:text-white md:flex">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={userProfile.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-brand/20 text-brand text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[8rem] truncate text-xs font-medium">
                      {displayName}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-foreground/50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 bg-[hsl(var(--surface))] border-white/10"
                >
                  <DropdownMenuItem
                    asChild
                    className="text-white/80 focus:bg-white/10 focus:text-white"
                  >
                    <Link to="/groups">{t("nav.myGroups")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    className="text-white/80 focus:bg-white/10 focus:text-white"
                  >
                    <Link to="/profile">{t("nav.profile")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    className="text-rose-400 focus:bg-rose-500/10 focus:text-rose-400 cursor-pointer"
                    onClick={() => dispatch(clearAuth())}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("nav.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  onClick={() => setAuthOpen(true)}
                  variant="ghost"
                  className="hidden rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white/80 hover:bg-white/10 hover:text-white md:inline-flex"
                >
                  {t("nav.signIn")}
                </Button>
                <Button
                  className="rounded-full border border-brand/30 bg-brand px-5 text-sm font-semibold text-slate-950 shadow-glow transition hover:bg-brandStrong"
                  onClick={() => setAuthOpen(true)}
                >
                  {t("nav.createGroup")}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative flex-1 pb-28 md:pb-12">
        <Outlet />
      </main>

      <footer className="border-t border-white/10 bg-slate-950/40">
        <div className="container flex flex-col gap-8 py-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-md space-y-3">
            <FanQuinLogo />
            <p className="text-sm leading-6 text-foreground/[0.62]">
              {t("footer.description")}
            </p>
          </div>

          <div className="flex flex-col items-end gap-4">
            <div className="grid gap-3 text-sm text-foreground/[0.62] sm:grid-cols-2 md:text-right">
              {footerLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="transition hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
              <span className="text-foreground/40">
                {location.pathname === "/"
                  ? t("footer.worldCupMode")
                  : t("footer.layoutActive")}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleLang}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/50 transition hover:bg-white/10 hover:text-white"
            >
              {i18n.language === "es" ? "EN" : "ES"}
            </button>
          </div>
        </div>
      </footer>

      <nav className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-[1.6rem] border border-white/10 bg-slate-950/88 px-2 py-2 shadow-panel backdrop-blur-xl md:hidden">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.to ||
            (item.to !== "/" && location.pathname.startsWith(item.to));

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-w-[4.2rem] flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-medium text-foreground/60 transition",
                isActive && "bg-white/10 text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        {!userProfile && (
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="flex min-w-[4.2rem] flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-medium text-foreground/60 transition hover:text-white"
          >
            <UserCircle className="h-4 w-4" />
            <span>{t("nav.signIn")}</span>
          </button>
        )}
      </nav>

      <OtpAuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={() => setAuthOpen(false)}
      />
    </div>
  );
}
