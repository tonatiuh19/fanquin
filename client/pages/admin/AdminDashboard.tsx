import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAdminStats } from "@/store/slices/adminSlice";
import {
  Users,
  Trophy,
  BarChart3,
  Swords,
  MonitorPlay,
  Shield,
  TrendingUp,
  Activity,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent: string;
  sub?: string;
}

function StatCard({ label, value, icon, accent, sub }: StatCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-[#0d0d14] p-5 transition-all hover:border-white/20 ${accent}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className="text-3xl font-bold text-white tabular-nums leading-none">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {sub && <p className="text-xs text-white/30 mt-1.5">{sub}</p>}
        </div>
        <div className="shrink-0 opacity-80">{icon}</div>
      </div>
    </div>
  );
}

function ModeBar({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-white/50 w-24 shrink-0 capitalize">
        {label}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-white/60 tabular-nums w-8 text-right">
        {count}
      </span>
    </div>
  );
}

export default function AdminDashboard() {
  const dispatch = useAppDispatch();
  const { stats, statsLoading } = useAppSelector((s) => s.admin);

  useEffect(() => {
    dispatch(fetchAdminStats());
  }, [dispatch]);

  const totalGroups = stats?.total_groups ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-white/40 mt-0.5">
            FanQuin platform overview
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-medium text-green-400">Live</span>
        </div>
      </div>

      {/* Stats grid */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Users"
            value={stats?.total_users ?? 0}
            icon={<Users className="w-8 h-8 text-blue-400" />}
            accent="border-blue-500/15 hover:border-blue-500/25"
            sub={`+${stats?.recent_signups ?? 0} this week`}
          />
          <StatCard
            label="Total Groups"
            value={stats?.total_groups ?? 0}
            icon={<Shield className="w-8 h-8 text-violet-400" />}
            accent="border-violet-500/15 hover:border-violet-500/25"
            sub={`+${stats?.recent_groups ?? 0} this week`}
          />
          <StatCard
            label="Predictions"
            value={stats?.total_predictions ?? 0}
            icon={<BarChart3 className="w-8 h-8 text-emerald-400" />}
            accent="border-emerald-500/15 hover:border-emerald-500/25"
          />
          <StatCard
            label="Total Matches"
            value={stats?.total_matches ?? 0}
            icon={<Swords className="w-8 h-8 text-orange-400" />}
            accent="border-orange-500/15 hover:border-orange-500/25"
          />
          <StatCard
            label="Active Sessions"
            value={stats?.active_sessions ?? 0}
            icon={<Activity className="w-8 h-8 text-cyan-400" />}
            accent="border-cyan-500/15 hover:border-cyan-500/25"
          />
          <StatCard
            label="Live Matches"
            value={stats?.live_matches ?? 0}
            icon={<MonitorPlay className="w-8 h-8 text-red-400" />}
            accent="border-red-500/15 hover:border-red-500/25"
          />
          <StatCard
            label="New Users (7d)"
            value={stats?.recent_signups ?? 0}
            icon={<TrendingUp className="w-8 h-8 text-pink-400" />}
            accent="border-pink-500/15 hover:border-pink-500/25"
          />
          <StatCard
            label="New Groups (7d)"
            value={stats?.recent_groups ?? 0}
            icon={<Trophy className="w-8 h-8 text-yellow-400" />}
            accent="border-yellow-500/15 hover:border-yellow-500/25"
          />
        </div>
      )}

      {/* Groups by mode */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-white/10 bg-[#0d0d14] p-5">
          <h2 className="text-sm font-semibold text-white/70 mb-4">
            Groups by Mode
          </h2>
          {statsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-4 rounded bg-white/5" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(stats?.groups_by_mode ?? {}).map(
                ([mode, count]) => (
                  <ModeBar
                    key={mode}
                    label={mode}
                    count={count as number}
                    total={totalGroups}
                  />
                ),
              )}
              {!Object.keys(stats?.groups_by_mode ?? {}).length && (
                <p className="text-sm text-white/30">No groups yet.</p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0d0d14] p-5">
          <h2 className="text-sm font-semibold text-white/70 mb-4">
            Quick Navigation
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                label: "Manage Users",
                href: "/admin/users",
                color: "text-blue-400",
              },
              {
                label: "Competitions",
                href: "/admin/competitions",
                color: "text-violet-400",
              },
              {
                label: "Matches",
                href: "/admin/matches",
                color: "text-orange-400",
              },
              {
                label: "Groups",
                href: "/admin/groups",
                color: "text-emerald-400",
              },
              {
                label: "Venues",
                href: "/admin/venues",
                color: "text-cyan-400",
              },
              {
                label: "Send Notification",
                href: "/admin/notifications",
                color: "text-pink-400",
              },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5 hover:border-white/15"
              >
                <span className={`text-xs font-medium ${item.color}`}>
                  {item.label}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
