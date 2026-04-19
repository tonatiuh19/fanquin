import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAdminServices } from "@/store/slices/adminSlice";
import type { AdminServiceStatus } from "@shared/api";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Mail,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const SERVICE_META: Record<
  string,
  { icon: React.ReactNode; description: string }
> = {
  Supabase: {
    icon: <Database className="w-5 h-5" />,
    description: "PostgreSQL database & auth layer",
  },
  "Football Data API": {
    icon: <BarChart3 className="w-5 h-5" />,
    description: "Match data sync (football-data.org)",
  },
  Resend: {
    icon: <Mail className="w-5 h-5" />,
    description: "Transactional email delivery",
  },
};

const STATUS_CONFIG = {
  healthy: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
    badge: "bg-green-500/15 text-green-400 border-green-500/20",
    dot: "bg-green-400",
    label: "Healthy",
  },
  degraded: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    dot: "bg-yellow-400",
    label: "Degraded",
  },
  down: {
    icon: <XCircle className="w-4 h-4" />,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    badge: "bg-red-500/15 text-red-400 border-red-500/20",
    dot: "bg-red-400",
    label: "Down",
  },
} as const;

function ServiceCard({ service }: { service: AdminServiceStatus }) {
  const meta = SERVICE_META[service.name] ?? {
    icon: <BarChart3 className="w-5 h-5" />,
    description: "",
  };
  const cfg = STATUS_CONFIG[service.status];

  return (
    <div
      className={`rounded-xl border ${cfg.bg} p-5 flex items-start gap-4 transition-all duration-300`}
    >
      {/* Service icon */}
      <div className={`${cfg.color} mt-0.5 shrink-0`}>{meta.icon}</div>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {/* Animated status dot */}
            <span className="relative flex h-2.5 w-2.5">
              {service.status === "healthy" && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${cfg.dot}`}
              />
            </span>
            <h3 className="font-semibold text-white text-sm">{service.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${cfg.badge} text-[10px] gap-1`}>
              {cfg.icon}
              {cfg.label}
            </Badge>
            {service.latency_ms !== null && (
              <span className="text-xs text-white/30 tabular-nums">
                {service.latency_ms}ms
              </span>
            )}
          </div>
        </div>

        <p className="text-xs text-white/40">{meta.description}</p>

        {service.message && (
          <p
            className={`text-xs font-mono ${cfg.color} bg-black/20 rounded px-2 py-1`}
          >
            {service.message}
          </p>
        )}

        <p className="text-[10px] text-white/20">
          Checked {new Date(service.checked_at).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

// Summary bar at the top
function OverallStatus({ services }: { services: AdminServiceStatus[] }) {
  const down = services.filter((s) => s.status === "down").length;
  const degraded = services.filter((s) => s.status === "degraded").length;

  if (services.length === 0) return null;

  if (down === 0 && degraded === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3">
        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
        <p className="text-sm text-green-300 font-medium">
          All systems operational
        </p>
      </div>
    );
  }
  if (down > 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
        <p className="text-sm text-red-300 font-medium">
          {down} service{down > 1 ? "s" : ""} down
          {degraded > 0 ? `, ${degraded} degraded` : ""}
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-4 py-3">
      <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
      <p className="text-sm text-yellow-300 font-medium">
        {degraded} service{degraded > 1 ? "s" : ""} degraded
      </p>
    </div>
  );
}

export default function AdminServices() {
  const dispatch = useAppDispatch();
  const { services, servicesLoading } = useAppSelector((s) => s.admin);

  useEffect(() => {
    dispatch(fetchAdminServices());
  }, [dispatch]);

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Services</h1>
          <p className="text-sm text-white/40">
            Real-time status of external integrations
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => dispatch(fetchAdminServices())}
          disabled={servicesLoading}
          className="border-white/10 bg-transparent text-white/60 hover:bg-white/10 hover:text-white gap-1.5"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${servicesLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {servicesLoading && services.length === 0 ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-white/5" />
          ))}
        </div>
      ) : (
        <>
          <OverallStatus services={services} />
          <div className="space-y-3">
            {services.map((s) => (
              <ServiceCard key={s.name} service={s} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
