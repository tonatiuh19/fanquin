import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAdminMatches,
  createAdminMatch,
  updateAdminMatch,
  deleteAdminMatch,
  fetchAdminCompetitions,
} from "@/store/slices/adminSlice";
import type { AdminMatch } from "@shared/api";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = ["scheduled", "live", "completed", "cancelled"];

const statusColor: Record<string, string> = {
  scheduled: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  live: "bg-red-500/15 text-red-400 border-red-500/20",
  completed: "bg-green-500/15 text-green-400 border-green-500/20",
  cancelled: "bg-white/5 text-white/30 border-white/10",
};

function MatchForm({
  initial,
  competitions,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<AdminMatch>;
  competitions: { id: string; name: string }[];
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    competition_id: initial?.competition_id ?? "",
    stage: initial?.stage ?? "",
    match_date: initial?.match_date?.slice(0, 16) ?? "",
    prediction_lock: initial?.prediction_lock?.slice(0, 16) ?? "",
    home_score: String(initial?.home_score ?? ""),
    away_score: String(initial?.away_score ?? ""),
    ht_score_home: String(initial?.ht_score_home ?? ""),
    ht_score_away: String(initial?.ht_score_away ?? ""),
    status: initial?.status ?? "scheduled",
    external_id: String(initial?.external_id ?? ""),
  });

  const numOrNull = (v: string) => (v === "" ? null : Number(v));

  return (
    <DialogContent className="bg-[#0d0d14] border-white/10 text-white max-w-lg">
      <DialogHeader>
        <DialogTitle className="text-white">
          {initial?.id ? "Edit Match" : "New Match"}
        </DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3 mt-2">
        <div className="col-span-2">
          <Label className="text-white/50 text-xs mb-1 block">
            Competition *
          </Label>
          <Select
            value={form.competition_id}
            onValueChange={(v) => setForm((f) => ({ ...f, competition_id: v }))}
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm">
              <SelectValue placeholder="Select competition" />
            </SelectTrigger>
            <SelectContent className="bg-[#0d0d14] border-white/10 max-h-48">
              {competitions.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-white/80">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Stage</Label>
          <Input
            value={form.stage}
            onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
            placeholder="Group Stage"
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Status</Label>
          <Select
            value={form.status}
            onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0d0d14] border-white/10">
              {STATUS_OPTIONS.map((s) => (
                <SelectItem
                  key={s}
                  value={s}
                  className="text-white/80 capitalize"
                >
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">
            Match Date *
          </Label>
          <Input
            type="datetime-local"
            value={form.match_date}
            onChange={(e) =>
              setForm((f) => ({ ...f, match_date: e.target.value }))
            }
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">
            Prediction Lock
          </Label>
          <Input
            type="datetime-local"
            value={form.prediction_lock}
            onChange={(e) =>
              setForm((f) => ({ ...f, prediction_lock: e.target.value }))
            }
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Home Score</Label>
          <Input
            type="number"
            min={0}
            value={form.home_score}
            onChange={(e) =>
              setForm((f) => ({ ...f, home_score: e.target.value }))
            }
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Away Score</Label>
          <Input
            type="number"
            min={0}
            value={form.away_score}
            onChange={(e) =>
              setForm((f) => ({ ...f, away_score: e.target.value }))
            }
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">HT Home</Label>
          <Input
            type="number"
            min={0}
            value={form.ht_score_home}
            onChange={(e) =>
              setForm((f) => ({ ...f, ht_score_home: e.target.value }))
            }
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">HT Away</Label>
          <Input
            type="number"
            min={0}
            value={form.ht_score_away}
            onChange={(e) =>
              setForm((f) => ({ ...f, ht_score_away: e.target.value }))
            }
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">
            External ID
          </Label>
          <Input
            type="number"
            value={form.external_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, external_id: e.target.value }))
            }
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-white/50"
        >
          <X className="w-4 h-4 mr-1" /> Cancel
        </Button>
        <Button
          size="sm"
          onClick={() =>
            onSave({
              competition_id: form.competition_id,
              stage: form.stage || undefined,
              match_date: form.match_date,
              prediction_lock: form.prediction_lock || undefined,
              home_score: numOrNull(form.home_score),
              away_score: numOrNull(form.away_score),
              ht_score_home: numOrNull(form.ht_score_home),
              ht_score_away: numOrNull(form.ht_score_away),
              status: form.status,
              external_id: form.external_id
                ? Number(form.external_id)
                : undefined,
            })
          }
          disabled={saving || !form.competition_id || !form.match_date}
          className="bg-violet-600 hover:bg-violet-500 text-white"
        >
          <Check className="w-4 h-4 mr-1" /> {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </DialogContent>
  );
}

export default function AdminMatches() {
  const dispatch = useAppDispatch();
  const { matches, matchesLoading, competitions } = useAppSelector(
    (s) => s.admin,
  );
  const [page, setPage] = useState(1);
  const [filterComp, setFilterComp] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editMatch, setEditMatch] = useState<AdminMatch | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!competitions.length) dispatch(fetchAdminCompetitions());
  }, [dispatch, competitions.length]);

  useEffect(() => {
    dispatch(
      fetchAdminMatches({
        page,
        limit: 25,
        competition_id: filterComp || undefined,
        status: filterStatus || undefined,
      }),
    );
  }, [dispatch, page, filterComp, filterStatus]);

  const totalPages = matches ? Math.ceil(matches.total / 25) : 1;

  const handleCreate = async (data: Record<string, unknown>) => {
    setSaving(true);
    await dispatch(createAdminMatch(data));
    setSaving(false);
    setShowForm(false);
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!editMatch) return;
    setSaving(true);
    await dispatch(updateAdminMatch({ id: editMatch.id, updates: data }));
    setSaving(false);
    setEditMatch(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await dispatch(deleteAdminMatch(deleteId));
    setDeleteId(null);
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Matches</h1>
          <p className="text-sm text-white/40">{matches?.total ?? 0} total</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={filterComp}
            onValueChange={(v) => {
              setFilterComp(v === "__all__" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44 bg-white/5 border-white/10 text-white/70 text-sm h-8">
              <SelectValue placeholder="All competitions" />
            </SelectTrigger>
            <SelectContent className="bg-[#0d0d14] border-white/10 max-h-48">
              <SelectItem value="__all__" className="text-white/60">
                All competitions
              </SelectItem>
              {competitions.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-white/80">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filterStatus}
            onValueChange={(v) => {
              setFilterStatus(v === "__all__" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white/70 text-sm h-8">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent className="bg-[#0d0d14] border-white/10">
              <SelectItem value="__all__" className="text-white/60">
                All statuses
              </SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem
                  key={s}
                  value={s}
                  className="text-white/80 capitalize"
                >
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="bg-violet-600 hover:bg-violet-500 text-white gap-1 h-8"
          >
            <Plus className="w-4 h-4" /> New Match
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0d0d14] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {[
                  "Competition",
                  "Match",
                  "Stage",
                  "Date",
                  "Score",
                  "HT",
                  "Status",
                  "",
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
              {matchesLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 rounded bg-white/5" />
                        </td>
                      ))}
                    </tr>
                  ))
                : (matches?.items ?? []).map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-white/5 hover:bg-white/3"
                    >
                      <td className="px-4 py-3 text-white/50 text-xs">
                        {m.competition_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                        {m.home_team_name ?? "?"}{" "}
                        <span className="text-white/30">vs</span>{" "}
                        {m.away_team_name ?? "?"}
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs">
                        {m.stage ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">
                        {new Date(m.match_date).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-white font-mono text-xs">
                        {m.home_score !== null && m.away_score !== null
                          ? `${m.home_score}–${m.away_score}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-white/40 font-mono text-xs">
                        {m.ht_score_home !== null && m.ht_score_away !== null
                          ? `${m.ht_score_home}–${m.ht_score_away}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`${statusColor[m.status] ?? "bg-white/5 text-white/30 border-white/10"} text-[10px] capitalize`}
                        >
                          {m.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white/30 hover:text-white"
                            onClick={() => setEditMatch(m)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white/30 hover:text-red-400"
                            onClick={() => setDeleteId(m.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
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

      <Dialog
        open={showForm || !!editMatch}
        onOpenChange={(o) => {
          if (!o) {
            setShowForm(false);
            setEditMatch(null);
          }
        }}
      >
        <MatchForm
          initial={editMatch ?? undefined}
          competitions={competitions.map((c) => ({ id: c.id, name: c.name }))}
          onSave={editMatch ? handleUpdate : handleCreate}
          onCancel={() => {
            setShowForm(false);
            setEditMatch(null);
          }}
          saving={saving}
        />
      </Dialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent className="bg-[#0d0d14] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete match?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white/60 hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
