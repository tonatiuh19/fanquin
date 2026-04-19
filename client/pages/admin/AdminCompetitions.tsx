import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAdminCompetitions,
  createAdminCompetition,
  updateAdminCompetition,
  deleteAdminCompetition,
  fetchAdminTeams,
  createAdminTeam,
  updateAdminTeam,
  deleteAdminTeam,
  setSelectedCompetitionId,
} from "@/store/slices/adminSlice";
import type { AdminCompetition, AdminTeam } from "@shared/api";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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

const COMPETITION_TYPES = [
  "world_cup",
  "champions_league",
  "premier_league",
  "liga_mx",
  "nba",
  "nfl",
  "other",
];

function CompetitionForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<AdminCompetition>;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    short_name: initial?.short_name ?? "",
    type: initial?.type ?? "world_cup",
    season: initial?.season ?? "",
    starts_at: initial?.starts_at?.slice(0, 10) ?? "",
    ends_at: initial?.ends_at?.slice(0, 10) ?? "",
    is_active: initial?.is_active ?? true,
    is_test: initial?.is_test ?? false,
    logo_url: initial?.logo_url ?? "",
    external_id: initial?.external_id ?? "",
  });

  return (
    <DialogContent className="bg-[#0d0d14] border-white/10 text-white max-w-lg">
      <DialogHeader>
        <DialogTitle className="text-white">
          {initial?.id ? "Edit Competition" : "New Competition"}
        </DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3 mt-2">
        <div className="col-span-2">
          <Label className="text-white/50 text-xs mb-1 block">Name *</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Short Name</Label>
          <Input
            value={form.short_name}
            onChange={(e) =>
              setForm((f) => ({ ...f, short_name: e.target.value }))
            }
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Type *</Label>
          <Select
            value={form.type}
            onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0d0d14] border-white/10">
              {COMPETITION_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="text-white/80">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Season *</Label>
          <Input
            value={form.season}
            onChange={(e) => setForm((f) => ({ ...f, season: e.target.value }))}
            placeholder="2026"
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
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Starts At</Label>
          <Input
            type="date"
            value={form.starts_at}
            onChange={(e) =>
              setForm((f) => ({ ...f, starts_at: e.target.value }))
            }
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Ends At</Label>
          <Input
            type="date"
            value={form.ends_at}
            onChange={(e) =>
              setForm((f) => ({ ...f, ends_at: e.target.value }))
            }
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div className="col-span-2">
          <Label className="text-white/50 text-xs mb-1 block">Logo URL</Label>
          <Input
            value={form.logo_url}
            onChange={(e) =>
              setForm((f) => ({ ...f, logo_url: e.target.value }))
            }
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.is_active}
            onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
          />
          <Label className="text-white/60 text-sm">Active</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.is_test}
            onCheckedChange={(v) => setForm((f) => ({ ...f, is_test: v }))}
          />
          <Label className="text-white/60 text-sm">Test</Label>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-white/50"
        >
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() =>
            onSave({
              ...form,
              external_id: form.external_id
                ? Number(form.external_id)
                : undefined,
              starts_at: form.starts_at || undefined,
              ends_at: form.ends_at || undefined,
              logo_url: form.logo_url || undefined,
            })
          }
          disabled={saving || !form.name || !form.season}
          className="bg-violet-600 hover:bg-violet-500 text-white"
        >
          <Check className="w-4 h-4 mr-1" />
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </DialogContent>
  );
}

function TeamForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<AdminTeam>;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    short_name: initial?.short_name ?? "",
    country_code: initial?.country_code ?? "",
    flag_url: initial?.flag_url ?? "",
    tier: String(initial?.tier ?? 1),
    external_id: String(initial?.external_id ?? ""),
  });

  return (
    <DialogContent className="bg-[#0d0d14] border-white/10 text-white max-w-md">
      <DialogHeader>
        <DialogTitle className="text-white">
          {initial?.id ? "Edit Team" : "New Team"}
        </DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3 mt-2">
        <div className="col-span-2">
          <Label className="text-white/50 text-xs mb-1 block">Name *</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Short Name</Label>
          <Input
            value={form.short_name}
            onChange={(e) =>
              setForm((f) => ({ ...f, short_name: e.target.value }))
            }
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">
            Country Code
          </Label>
          <Input
            value={form.country_code}
            onChange={(e) =>
              setForm((f) => ({ ...f, country_code: e.target.value }))
            }
            placeholder="US"
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Tier (1-3)</Label>
          <Select
            value={form.tier}
            onValueChange={(v) => setForm((f) => ({ ...f, tier: v }))}
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0d0d14] border-white/10">
              {["1", "2", "3"].map((t) => (
                <SelectItem key={t} value={t} className="text-white/80">
                  Tier {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <div className="col-span-2">
          <Label className="text-white/50 text-xs mb-1 block">Flag URL</Label>
          <Input
            value={form.flag_url}
            onChange={(e) =>
              setForm((f) => ({ ...f, flag_url: e.target.value }))
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
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() =>
            onSave({
              ...form,
              tier: Number(form.tier),
              external_id: form.external_id
                ? Number(form.external_id)
                : undefined,
            })
          }
          disabled={saving || !form.name}
          className="bg-violet-600 hover:bg-violet-500 text-white"
        >
          <Check className="w-4 h-4 mr-1" />
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </DialogContent>
  );
}

export default function AdminCompetitions() {
  const dispatch = useAppDispatch();
  const {
    competitions,
    competitionsLoading,
    teams,
    teamsLoading,
    selectedCompetitionId,
  } = useAppSelector((s) => s.admin);

  const [showCompForm, setShowCompForm] = useState(false);
  const [editComp, setEditComp] = useState<AdminCompetition | null>(null);
  const [deleteCompId, setDeleteCompId] = useState<string | null>(null);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editTeam, setEditTeam] = useState<AdminTeam | null>(null);
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedComp = competitions.find((c) => c.id === selectedCompetitionId);

  useEffect(() => {
    dispatch(fetchAdminCompetitions());
  }, [dispatch]);

  const handleCreateComp = async (data: Record<string, unknown>) => {
    setSaving(true);
    await dispatch(createAdminCompetition(data));
    setSaving(false);
    setShowCompForm(false);
  };

  const handleUpdateComp = async (data: Record<string, unknown>) => {
    if (!editComp) return;
    setSaving(true);
    await dispatch(updateAdminCompetition({ id: editComp.id, updates: data }));
    setSaving(false);
    setEditComp(null);
  };

  const handleDeleteComp = async () => {
    if (!deleteCompId) return;
    await dispatch(deleteAdminCompetition(deleteCompId));
    setDeleteCompId(null);
    if (selectedCompetitionId === deleteCompId) {
      dispatch(setSelectedCompetitionId(null));
    }
  };

  const handleSelectComp = (id: string) => {
    dispatch(fetchAdminTeams(id));
  };

  const handleCreateTeam = async (data: Record<string, unknown>) => {
    if (!selectedCompetitionId) return;
    setSaving(true);
    await dispatch(
      createAdminTeam({ competitionId: selectedCompetitionId, body: data }),
    );
    setSaving(false);
    setShowTeamForm(false);
  };

  const handleUpdateTeam = async (data: Record<string, unknown>) => {
    if (!editTeam) return;
    setSaving(true);
    await dispatch(updateAdminTeam({ id: editTeam.id, updates: data }));
    setSaving(false);
    setEditTeam(null);
  };

  const handleDeleteTeam = async () => {
    if (!deleteTeamId) return;
    await dispatch(deleteAdminTeam(deleteTeamId));
    setDeleteTeamId(null);
  };

  // Teams view
  if (selectedCompetitionId) {
    return (
      <div className="p-6 space-y-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch(setSelectedCompetitionId(null))}
            className="text-white/50 hover:text-white gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Competitions
          </Button>
          <ChevronRight className="w-4 h-4 text-white/20" />
          <h1 className="text-xl font-bold text-white">
            {selectedComp?.name ?? "Teams"}
          </h1>
          <Badge className="bg-violet-500/15 text-violet-300 border-violet-500/20 text-xs">
            {teams.length} teams
          </Badge>
          <div className="ml-auto">
            <Button
              size="sm"
              onClick={() => setShowTeamForm(true)}
              className="bg-violet-600 hover:bg-violet-500 text-white gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Team
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0d0d14] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {[
                    "Flag",
                    "Name",
                    "Short",
                    "Country",
                    "Tier",
                    "Ext. ID",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teamsLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-white/5">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <Skeleton className="h-4 rounded bg-white/5" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : teams.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-white/5 hover:bg-white/3"
                      >
                        <td className="px-4 py-3">
                          {t.flag_url ? (
                            <img
                              src={t.flag_url}
                              className="w-6 h-4 object-cover rounded-sm"
                            />
                          ) : (
                            <div className="w-6 h-4 rounded-sm bg-white/10" />
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-white">
                          {t.name}
                        </td>
                        <td className="px-4 py-3 text-white/50">
                          {t.short_name || "—"}
                        </td>
                        <td className="px-4 py-3 text-white/50">
                          {t.country_code || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={
                              t.tier === 1
                                ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/20 text-[10px]"
                                : t.tier === 2
                                  ? "bg-blue-500/15 text-blue-400 border-blue-500/20 text-[10px]"
                                  : "bg-white/5 text-white/40 border-white/10 text-[10px]"
                            }
                          >
                            T{t.tier}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-white/40 text-xs tabular-nums">
                          {t.external_id ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-white/30 hover:text-white"
                              onClick={() => setEditTeam(t)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-white/30 hover:text-red-400"
                              onClick={() => setDeleteTeamId(t.id)}
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
        </div>

        <Dialog
          open={showTeamForm || !!editTeam}
          onOpenChange={(o) => {
            if (!o) {
              setShowTeamForm(false);
              setEditTeam(null);
            }
          }}
        >
          <TeamForm
            initial={editTeam ?? undefined}
            onSave={editTeam ? handleUpdateTeam : handleCreateTeam}
            onCancel={() => {
              setShowTeamForm(false);
              setEditTeam(null);
            }}
            saving={saving}
          />
        </Dialog>

        <AlertDialog
          open={!!deleteTeamId}
          onOpenChange={(o) => !o && setDeleteTeamId(null)}
        >
          <AlertDialogContent className="bg-[#0d0d14] border-white/10 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete team?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/50">
                This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-white/10 text-white/60 hover:bg-white/10">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTeam}
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

  // Competitions list view
  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Competitions</h1>
          <p className="text-sm text-white/40">
            {competitions.length} competitions
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCompForm(true)}
          className="bg-violet-600 hover:bg-violet-500 text-white gap-1"
        >
          <Plus className="w-4 h-4" />
          New Competition
        </Button>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0d0d14] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {[
                  "Name",
                  "Type",
                  "Season",
                  "Status",
                  "Teams",
                  "Matches",
                  "Groups",
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
              {competitionsLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 rounded bg-white/5" />
                        </td>
                      ))}
                    </tr>
                  ))
                : competitions.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-white/5 hover:bg-white/3 cursor-pointer"
                    >
                      <td
                        className="px-4 py-3 font-medium text-white"
                        onClick={() => handleSelectComp(c.id)}
                      >
                        <div className="flex items-center gap-2">
                          {c.logo_url && (
                            <img
                              src={c.logo_url}
                              className="w-5 h-5 rounded-sm"
                            />
                          )}
                          <span className="hover:text-violet-300 transition-colors">
                            {c.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/50">{c.type}</td>
                      <td className="px-4 py-3 text-white/60">{c.season}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {c.is_active ? (
                            <Badge className="bg-green-500/15 text-green-400 border-green-500/20 text-[10px]">
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-white/5 text-white/30 border-white/10 text-[10px]">
                              Inactive
                            </Badge>
                          )}
                          {c.is_test && (
                            <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/20 text-[10px]">
                              Test
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/60 tabular-nums">
                        {c.teams_count}
                      </td>
                      <td className="px-4 py-3 text-white/60 tabular-nums">
                        {c.matches_count}
                      </td>
                      <td className="px-4 py-3 text-white/60 tabular-nums">
                        {c.groups_count}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white/30 hover:text-white"
                            onClick={() => setEditComp(c)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white/30 hover:text-red-400"
                            onClick={() => setDeleteCompId(c.id)}
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
      </div>

      <Dialog
        open={showCompForm || !!editComp}
        onOpenChange={(o) => {
          if (!o) {
            setShowCompForm(false);
            setEditComp(null);
          }
        }}
      >
        <CompetitionForm
          initial={editComp ?? undefined}
          onSave={editComp ? handleUpdateComp : handleCreateComp}
          onCancel={() => {
            setShowCompForm(false);
            setEditComp(null);
          }}
          saving={saving}
        />
      </Dialog>

      <AlertDialog
        open={!!deleteCompId}
        onOpenChange={(o) => !o && setDeleteCompId(null)}
      >
        <AlertDialogContent className="bg-[#0d0d14] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete competition?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              This will delete the competition and all associated teams,
              matches, and groups. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white/60 hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteComp}
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
