import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAdminPredictions } from "@/store/slices/adminSlice";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const resultColors: Record<string, string> = {
  exact_score: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  correct_winner: "bg-green-500/15 text-green-400 border-green-500/20",
  goal_difference: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  incorrect: "bg-red-500/15 text-red-400 border-red-500/20",
  pending: "bg-white/5 text-white/30 border-white/10",
};

export default function AdminPredictions() {
  const dispatch = useAppDispatch();
  const { predictions, predictionsLoading } = useAppSelector((s) => s.admin);
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchAdminPredictions({ page, limit: 25 }));
  }, [dispatch, page]);

  const totalPages = predictions ? Math.ceil(predictions.total / 25) : 1;

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Predictions</h1>
        <p className="text-sm text-white/40">
          {predictions?.total ?? 0} total predictions
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0d0d14] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {[
                  "User",
                  "Group",
                  "Match",
                  "Prediction",
                  "Result",
                  "Points",
                  "Submitted",
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
              {predictionsLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 rounded bg-white/5" />
                        </td>
                      ))}
                    </tr>
                  ))
                : (predictions?.items ?? []).map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-white/5 hover:bg-white/3"
                    >
                      <td className="px-4 py-3 text-white/70">
                        {p.username ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs">
                        {p.group_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-white/60 text-xs">
                        {p.match_label ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-white font-medium">
                        {p.predicted_home}–{p.predicted_away}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`${resultColors[p.result] ?? "bg-white/5 text-white/30 border-white/10"} text-[10px]`}
                        >
                          {p.result.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-white/60 tabular-nums">
                        {p.points_earned + p.bonus_pts > 0 ? (
                          <span className="text-green-400 font-semibold">
                            +{p.points_earned + p.bonus_pts}
                          </span>
                        ) : (
                          <span className="text-white/30">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">
                        {new Date(p.submitted_at).toLocaleString()}
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
