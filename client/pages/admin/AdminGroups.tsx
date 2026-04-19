import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAdminGroups,
  updateAdminGroup,
  deleteAdminGroup,
  createAdminGroup,
  fetchGroupMembers,
  addGroupMember,
  removeGroupMember,
  updateGroupMemberRole,
  transferGroupOwnership,
  fetchAdminCompetitions,
} from "@/store/slices/adminSlice";
import type {
  AdminGroup,
  AdminGroupMember,
  AdminCompetition,
} from "@shared/api";
import {
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Users,
  Plus,
  FolderPlus,
  ShieldCheck,
  ArrowRightLeft,
  UserMinus,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

const modeColors: Record<string, string> = {
  friends: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  casual: "bg-white/5 text-white/40 border-white/10",
  league: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  competitive: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  global: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  ownership: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

function EditGroupDialog({
  group,
  onClose,
}: {
  group: AdminGroup;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({
    name: group.name,
    is_active: group.is_active,
    is_test: group.is_test,
    max_members: group.max_members,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await dispatch(updateAdminGroup({ id: group.id, updates: form }));
    setSaving(false);
    onClose();
  };

  return (
    <DialogContent className="bg-[#0d0d14] border-white/10 text-white max-w-sm">
      <DialogHeader>
        <DialogTitle className="text-white">Edit Group</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 mt-2">
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Name</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">
            Max Members
          </Label>
          <Input
            type="number"
            min={1}
            value={form.max_members}
            onChange={(e) =>
              setForm((f) => ({ ...f, max_members: Number(e.target.value) }))
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
          <Label className="text-white/60 text-sm">Test group</Label>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white/50"
        >
          <X className="w-4 h-4 mr-1" /> Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="bg-violet-600 hover:bg-violet-500 text-white"
        >
          <Check className="w-4 h-4 mr-1" /> {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </DialogContent>
  );
}

function CreateGroupDialog({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();
  const { competitions } = useAppSelector((s) => s.admin);
  const [form, setForm] = useState({
    name: "",
    mode: "friends",
    competition_id: "none",
    max_members: "50",
    draft_type: "none",
    is_test: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!competitions.length) dispatch(fetchAdminCompetitions({}));
  }, [dispatch, competitions.length]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      mode: form.mode,
      is_test: form.is_test,
    };
    if (form.competition_id !== "none")
      body.competition_id = form.competition_id;
    if (form.max_members) body.max_members = Number(form.max_members);
    if (form.draft_type !== "none") body.draft_type = form.draft_type;
    const result = await dispatch(createAdminGroup(body));
    setSaving(false);
    if (createAdminGroup.fulfilled.match(result)) {
      onClose();
    } else {
      setError((result.payload as string) ?? "Failed to create group");
    }
  };

  return (
    <DialogContent className="bg-[#0d0d14] border-white/10 text-white max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-white">
          <FolderPlus className="w-4 h-4 text-violet-400" /> Create Group
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-3 mt-2">
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Name *</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-white/50 text-xs mb-1 block">Mode *</Label>
            <Select
              value={form.mode}
              onValueChange={(v) => setForm((f) => ({ ...f, mode: v }))}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d0d14] border-white/10 text-white">
                {["friends", "casual", "league", "competitive", "global"].map(
                  (m) => (
                    <SelectItem key={m} value={m} className="capitalize">
                      {m}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-white/50 text-xs mb-1 block">
              Draft Type
            </Label>
            <Select
              value={form.draft_type}
              onValueChange={(v) => setForm((f) => ({ ...f, draft_type: v }))}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d0d14] border-white/10 text-white">
                <SelectItem value="none">Default (snake)</SelectItem>
                {["snake", "random", "balanced_tier"].map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">
            Competition
          </Label>
          <Select
            value={form.competition_id}
            onValueChange={(v) => setForm((f) => ({ ...f, competition_id: v }))}
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent className="bg-[#0d0d14] border-white/10 text-white">
              <SelectItem value="none">None</SelectItem>
              {competitions.map((c: AdminCompetition) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.season ? ` (${c.season})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-white/50 text-xs mb-1 block">
              Max Members
            </Label>
            <Input
              type="number"
              min={1}
              value={form.max_members}
              onChange={(e) =>
                setForm((f) => ({ ...f, max_members: e.target.value }))
              }
              className="bg-white/5 border-white/10 text-white text-sm"
            />
          </div>
          <div className="flex flex-col justify-end pb-0.5">
            <div className="flex items-center gap-3 h-9">
              <Switch
                checked={form.is_test}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_test: v }))}
              />
              <Label className="text-white/60 text-sm">Test group</Label>
            </div>
          </div>
        </div>
      </div>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
      <div className="flex justify-end gap-2 mt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white/50"
        >
          <X className="w-4 h-4 mr-1" /> Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={saving}
          className="bg-violet-600 hover:bg-violet-500 text-white"
        >
          <Check className="w-4 h-4 mr-1" /> {saving ? "Creating…" : "Create"}
        </Button>
      </div>
    </DialogContent>
  );
}

function ManageMembersSheet({
  group,
  open,
  onClose,
}: {
  group: AdminGroup;
  open: boolean;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const { groupMembers, groupMembersLoading } = useAppSelector((s) => s.admin);
  const members: AdminGroupMember[] = groupMembers[group.id] ?? [];
  const [identifier, setIdentifier] = useState("");
  const [addRole, setAddRole] = useState("member");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [confirmTransfer, setConfirmTransfer] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  useEffect(() => {
    if (open) dispatch(fetchGroupMembers(group.id));
  }, [open, group.id, dispatch]);

  const handleAdd = async () => {
    if (!identifier.trim()) return;
    setAdding(true);
    setAddError(null);
    const result = await dispatch(
      addGroupMember({
        groupId: group.id,
        identifier: identifier.trim(),
        role: addRole,
      }),
    );
    setAdding(false);
    if (addGroupMember.fulfilled.match(result)) {
      setIdentifier("");
    } else {
      setAddError((result.payload as string) ?? "Failed to add member");
    }
  };

  const handleRoleToggle = async (m: AdminGroupMember) => {
    const newRole = m.role === "admin" ? "member" : "admin";
    await dispatch(
      updateGroupMemberRole({
        groupId: group.id,
        userId: m.user_id,
        role: newRole,
      }),
    );
  };

  const handleRemove = async (userId: string) => {
    await dispatch(removeGroupMember({ groupId: group.id, userId }));
    setConfirmRemove(null);
  };

  const handleTransfer = async (userId: string) => {
    await dispatch(transferGroupOwnership({ groupId: group.id, userId }));
    setConfirmTransfer(null);
    dispatch(fetchGroupMembers(group.id));
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="bg-[#0a0a0f] border-white/10 text-white w-full max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-400" />
            {group.name} — Members
          </SheetTitle>
        </SheetHeader>

        {/* Add member */}
        <div className="bg-white/3 rounded-xl p-4 mb-5 border border-white/8">
          <p className="text-xs text-white/50 mb-2 font-medium uppercase tracking-wider">
            Add Member
          </p>
          <div className="flex gap-2">
            <Input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Email or username"
              className="flex-1 bg-white/5 border-white/10 text-white text-sm placeholder:text-white/20"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Select value={addRole} onValueChange={setAddRole}>
              <SelectTrigger className="w-28 bg-white/5 border-white/10 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d0d14] border-white/10 text-white">
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={adding || !identifier.trim()}
              className="bg-violet-600 hover:bg-violet-500 text-white px-3"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {addError && <p className="text-xs text-rose-400 mt-1">{addError}</p>}
        </div>

        {/* Member list */}
        {groupMembersLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg bg-white/5" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="text-center text-white/30 text-sm py-10">
            No members yet
          </p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => {
              const isOwner = m.user_id === group.owner_id;
              return (
                <div
                  key={m.user_id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/3 border border-white/8 hover:bg-white/5 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-300 text-xs font-bold shrink-0">
                    {(m.username ?? m.display_name ?? "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {m.display_name ?? m.username ?? "Unknown"}
                      {isOwner && (
                        <span className="ml-1.5 text-[10px] text-amber-400 font-normal">
                          Owner
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-white/40 truncate">
                      @{m.username ?? "—"} · {m.total_points} pts
                    </p>
                  </div>
                  <Badge
                    className={`text-[10px] shrink-0 cursor-pointer transition-colors ${
                      m.role === "admin"
                        ? "bg-violet-500/15 text-violet-400 border-violet-500/20 hover:bg-violet-500/25"
                        : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
                    }`}
                    onClick={() => !isOwner && handleRoleToggle(m)}
                    title={isOwner ? "Owner cannot be demoted" : `Toggle role`}
                  >
                    {m.role === "admin" ? (
                      <ShieldCheck className="w-2.5 h-2.5 mr-1 inline" />
                    ) : null}
                    {m.role}
                  </Badge>
                  <div className="flex gap-1 shrink-0">
                    {!isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-white/20 hover:text-amber-400"
                        title="Transfer ownership"
                        onClick={() => setConfirmTransfer(m.user_id)}
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                      </Button>
                    )}
                    {!isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-white/20 hover:text-red-400"
                        title="Remove member"
                        onClick={() => setConfirmRemove(m.user_id)}
                      >
                        <UserMinus className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Transfer ownership confirm */}
        <AlertDialog
          open={!!confirmTransfer}
          onOpenChange={(o) => !o && setConfirmTransfer(null)}
        >
          <AlertDialogContent className="bg-[#0d0d14] border-white/10 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Transfer ownership?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/50">
                This user will become the new group owner. The previous owner
                keeps admin role.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-white/10 text-white/60 hover:bg-white/10">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  confirmTransfer && handleTransfer(confirmTransfer)
                }
                className="bg-amber-600 hover:bg-amber-500 text-white"
              >
                Transfer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Remove member confirm */}
        <AlertDialog
          open={!!confirmRemove}
          onOpenChange={(o) => !o && setConfirmRemove(null)}
        >
          <AlertDialogContent className="bg-[#0d0d14] border-white/10 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove member?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/50">
                This will remove the member from the group. Their predictions
                are preserved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-white/10 text-white/60 hover:bg-white/10">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => confirmRemove && handleRemove(confirmRemove)}
                className="bg-red-600 hover:bg-red-500 text-white"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}

export default function AdminGroups() {
  const dispatch = useAppDispatch();
  const { groups, groupsLoading } = useAppSelector((s) => s.admin);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editGroup, setEditGroup] = useState<AdminGroup | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [membersGroup, setMembersGroup] = useState<AdminGroup | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    dispatch(fetchAdminGroups({ page, limit: 25, search: debouncedSearch }));
  }, [dispatch, page, debouncedSearch]);

  const handleDelete = async () => {
    if (!deleteId) return;
    await dispatch(deleteAdminGroup(deleteId));
    setDeleteId(null);
  };

  const totalPages = groups ? Math.ceil(groups.total / 25) : 1;

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Groups</h1>
          <p className="text-sm text-white/40">
            {groups?.total ?? 0} total groups
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/25 text-sm"
            />
          </div>
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="bg-violet-600 hover:bg-violet-500 text-white gap-1.5"
          >
            <FolderPlus className="w-4 h-4" /> New Group
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0d0d14] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {[
                  "Name",
                  "Competition",
                  "Mode",
                  "Owner",
                  "Members",
                  "Status",
                  "Flags",
                  "Created",
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
              {groupsLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 rounded bg-white/5" />
                        </td>
                      ))}
                    </tr>
                  ))
                : (groups?.items ?? []).map((g) => (
                    <tr
                      key={g.id}
                      className="border-b border-white/5 hover:bg-white/3"
                    >
                      <td className="px-4 py-3 font-medium text-white">
                        {g.name}
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs">
                        {g.competition_name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`${modeColors[g.mode] ?? "bg-white/5 text-white/30 border-white/10"} text-[10px] capitalize`}
                        >
                          {g.mode}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs">
                        {g.owner_username ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-white/60 tabular-nums">
                        {g.member_count}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`text-[10px] capitalize ${g.status === "active" ? "bg-green-500/15 text-green-400 border-green-500/20" : g.status === "draft" ? "bg-blue-500/15 text-blue-400 border-blue-500/20" : g.status === "completed" ? "bg-white/5 text-white/40 border-white/10" : "bg-yellow-500/15 text-yellow-400 border-yellow-500/20"}`}
                        >
                          {g.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {!g.is_active && (
                            <Badge className="bg-red-500/15 text-red-400 border-red-500/20 text-[10px]">
                              Inactive
                            </Badge>
                          )}
                          {g.is_test && (
                            <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/20 text-[10px]">
                              Test
                            </Badge>
                          )}
                          {g.is_active && !g.is_test && (
                            <span className="text-white/20 text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">
                        {new Date(g.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white/30 hover:text-violet-400"
                            title="Manage members"
                            onClick={() => setMembersGroup(g)}
                          >
                            <Users className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white/30 hover:text-white"
                            onClick={() => setEditGroup(g)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white/30 hover:text-red-400"
                            onClick={() => setDeleteId(g.id)}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <CreateGroupDialog onClose={() => setCreateOpen(false)} />
      </Dialog>

      <Dialog open={!!editGroup} onOpenChange={(o) => !o && setEditGroup(null)}>
        {editGroup && (
          <EditGroupDialog
            group={editGroup}
            onClose={() => setEditGroup(null)}
          />
        )}
      </Dialog>

      {membersGroup && (
        <ManageMembersSheet
          group={membersGroup}
          open={!!membersGroup}
          onClose={() => setMembersGroup(null)}
        />
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent className="bg-[#0d0d14] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              This permanently deletes the group and all members, predictions,
              and ownership data.
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
