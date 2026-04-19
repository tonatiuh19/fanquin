import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAdminOtpRequests } from "@/store/slices/adminSlice";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminOtpRequests() {
  const dispatch = useAppDispatch();
  const { otpRequests, otpLoading: otpRequestsLoading } = useAppSelector(
    (s) => s.admin,
  );
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchAdminOtpRequests({ page, limit: 25 }));
  }, [dispatch, page]);

  const totalPages = otpRequests ? Math.ceil(otpRequests.total / 25) : 1;

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">OTP Audit Log</h1>
        <p className="text-sm text-white/40">
          {otpRequests?.total ?? 0} total OTP requests
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0d0d14] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {[
                  "Identifier",
                  "Method",
                  "Created",
                  "Expires",
                  "Verified",
                  "Attempts",
                  "Status",
                  "IP Address",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {otpRequestsLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 rounded bg-white/5" />
                        </td>
                      ))}
                    </tr>
                  ))
                : (otpRequests?.items ?? []).map((o) => (
                    <tr
                      key={o.id}
                      className="border-b border-white/5 hover:bg-white/3"
                    >
                      <td className="px-4 py-3 font-mono text-white/70 text-xs">
                        {o.identifier}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-white/5 text-white/40 border-white/10 text-[10px] capitalize">
                          {o.delivery_method}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">
                        {new Date(o.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">
                        {new Date(o.expires_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {o.verified_at ? (
                          <span className="text-green-400 whitespace-nowrap">
                            {new Date(o.verified_at).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-white/25">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/60 tabular-nums text-center">
                        {o.attempt_count}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            o.is_used
                              ? "bg-green-500/15 text-green-400 border-green-500/20 text-[10px]"
                              : "bg-yellow-500/15 text-yellow-400 border-yellow-500/20 text-[10px]"
                          }
                        >
                          {o.is_used ? "Used" : "Unused"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-white/30 text-xs">
                        {o.ip_address ?? "—"}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
          <span className="text-xs text-white/30">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 border-white/10 bg-transparent text-white/50 hover:bg-white/10 disabled:opacity-30"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 border-white/10 bg-transparent text-white/50 hover:bg-white/10 disabled:opacity-30"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
