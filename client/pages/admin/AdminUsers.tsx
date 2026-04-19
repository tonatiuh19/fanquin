import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  createAdminUser,
} from "@/store/slices/adminSlice";
import type { AdminUser } from "@shared/api";
import {
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  UserPlus,
  Loader2,
} from "lucide-react";
import axios from "axios";
import PhoneInput, { getCountries } from "react-phone-number-input";
import type { Country as CountryCode } from "react-phone-number-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Label } from "@/components/ui/label";

const _regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const COUNTRIES = getCountries()
  .map((code) => ({ code, name: _regionNames.of(code) ?? code }))
  .sort((a, b) => a.name.localeCompare(b.name));

const LOCALES = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
];

function EditUserDialog({
  user,
  onClose,
}: {
  user: AdminUser;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({
    username: user.username ?? "",
    display_name: user.display_name ?? "",
    first_name: user.first_name ?? "",
    last_name: user.last_name ?? "",
    phone: user.phone ?? "",
    country: (user.country ?? "") as CountryCode | "",
    locale: user.locale ?? "en",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await dispatch(updateAdminUser({ id: user.id, updates: form }));
    setSaving(false);
    onClose();
  };

  return (
    <DialogContent className="bg-[#0d0d14] border-white/10 text-white max-w-md">
      <DialogHeader>
        <DialogTitle className="text-white">Edit User</DialogTitle>
      </DialogHeader>
      <div className="space-y-3 mt-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-white/50 text-xs mb-1 block">Username</Label>
            <Input
              value={form.username}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  username: e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9_]/g, ""),
                }))
              }
              className="bg-white/5 border-white/10 text-white text-sm"
              maxLength={30}
            />
          </div>
          <div>
            <Label className="text-white/50 text-xs mb-1 block">
              First Name
            </Label>
            <Input
              value={form.first_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, first_name: e.target.value }))
              }
              className="bg-white/5 border-white/10 text-white text-sm"
            />
          </div>
          <div>
            <Label className="text-white/50 text-xs mb-1 block">
              Last Name
            </Label>
            <Input
              value={form.last_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, last_name: e.target.value }))
              }
              className="bg-white/5 border-white/10 text-white text-sm"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-white/50 text-xs mb-1 block">
              Display Name{" "}
              <span className="text-white/25">(auto: first + last)</span>
            </Label>
            <Input
              value={form.display_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, display_name: e.target.value }))
              }
              className="bg-white/5 border-white/10 text-white text-sm"
            />
          </div>
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Phone</Label>
          <div className="phone-input-dark">
            <PhoneInput
              international
              withCountryCallingCode
              addInternationalOption={false}
              defaultCountry={(form.country as CountryCode) || "US"}
              value={form.phone}
              onChange={(val) => setForm((f) => ({ ...f, phone: val ?? "" }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-white/50 text-xs mb-1 block">Country</Label>
            <Select
              value={form.country || "none"}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  country: v === "none" ? "" : (v as CountryCode),
                }))
              }
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="bg-[#0d0d14] border-white/10 text-white max-h-64">
                <SelectItem value="none">—</SelectItem>
                {COUNTRIES.map(({ code, name }) => (
                  <SelectItem key={code} value={code}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-white/50 text-xs mb-1 block">Locale</Label>
            <Select
              value={form.locale}
              onValueChange={(v) => setForm((f) => ({ ...f, locale: v }))}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d0d14] border-white/10 text-white">
                {LOCALES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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

function CreateUserDialog({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({
    email: "",
    password: "",
    username: "",
    first_name: "",
    last_name: "",
    phone: "",
    country: "US" as CountryCode,
    locale: "en",
  });
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced username availability check
  useEffect(() => {
    if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);
    const raw = form.username.trim();
    if (!raw) {
      setUsernameStatus("idle");
      return;
    }
    const valid = /^[a-z0-9_]{3,30}$/.test(raw);
    if (!valid) {
      setUsernameStatus("invalid");
      return;
    }
    setUsernameStatus("checking");
    usernameDebounceRef.current = setTimeout(async () => {
      try {
        const { data } = await axios.get<{ available: boolean }>(
          `/api/auth/check-username?username=${encodeURIComponent(raw)}`,
        );
        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 500);
    return () => {
      if (usernameDebounceRef.current)
        clearTimeout(usernameDebounceRef.current);
    };
  }, [form.username]);

  const handleCreate = async () => {
    if (!form.email.trim() || !form.password.trim()) {
      setError("Email and password are required.");
      return;
    }
    if (form.username && usernameStatus !== "available") {
      setError("Fix username before submitting.");
      return;
    }
    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = {
      email: form.email.trim().toLowerCase(),
      password: form.password,
    };
    if (form.username.trim()) body.username = form.username.trim();
    if (form.first_name.trim()) body.first_name = form.first_name.trim();
    if (form.last_name.trim()) body.last_name = form.last_name.trim();
    if (form.phone.trim()) body.phone = form.phone.trim();
    if (form.country) body.country = form.country;
    body.locale = form.locale;
    const result = await dispatch(createAdminUser(body));
    setSaving(false);
    if (createAdminUser.fulfilled.match(result)) {
      onClose();
    } else {
      setError((result.payload as string) ?? "Failed to create user");
    }
  };

  return (
    <DialogContent className="bg-[#0d0d14] border-white/10 text-white max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-white">
          <UserPlus className="w-4 h-4 text-violet-400" /> Create User
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-3 mt-2">
        {/* Email + Password */}
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Email *</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="user@example.com"
            className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/20"
          />
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Password *</Label>
          <Input
            type="password"
            value={form.password}
            onChange={(e) =>
              setForm((f) => ({ ...f, password: e.target.value }))
            }
            placeholder="Min 8 characters"
            className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/20"
          />
        </div>
        {/* Username with availability check */}
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Username</Label>
          <div className="relative">
            <Input
              value={form.username}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  username: e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9_]/g, ""),
                }))
              }
              placeholder="letters, numbers, underscores"
              maxLength={30}
              className="bg-white/5 border-white/10 text-white text-sm pr-8 placeholder:text-white/20"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              {usernameStatus === "checking" && (
                <Loader2 className="h-4 w-4 animate-spin text-white/40" />
              )}
              {usernameStatus === "available" && (
                <Check className="h-4 w-4 text-green-400" />
              )}
              {(usernameStatus === "taken" || usernameStatus === "invalid") && (
                <X className="h-4 w-4 text-rose-400" />
              )}
            </span>
          </div>
          {usernameStatus === "taken" && (
            <p className="text-xs text-rose-400 mt-0.5">
              Username already taken
            </p>
          )}
          {usernameStatus === "invalid" && (
            <p className="text-xs text-rose-400 mt-0.5">
              3–30 chars, letters/numbers/underscore only
            </p>
          )}
          {usernameStatus === "available" && (
            <p className="text-xs text-green-400 mt-0.5">Available</p>
          )}
        </div>
        {/* First + Last name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-white/50 text-xs mb-1 block">
              First Name
            </Label>
            <Input
              value={form.first_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, first_name: e.target.value }))
              }
              className="bg-white/5 border-white/10 text-white text-sm"
            />
          </div>
          <div>
            <Label className="text-white/50 text-xs mb-1 block">
              Last Name
            </Label>
            <Input
              value={form.last_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, last_name: e.target.value }))
              }
              className="bg-white/5 border-white/10 text-white text-sm"
            />
          </div>
        </div>
        {/* Phone */}
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Phone</Label>
          <div className="phone-input-dark">
            <PhoneInput
              international
              withCountryCallingCode
              addInternationalOption={false}
              defaultCountry={form.country}
              value={form.phone}
              onChange={(val) => setForm((f) => ({ ...f, phone: val ?? "" }))}
            />
          </div>
        </div>
        {/* Country + Locale */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-white/50 text-xs mb-1 block">Country</Label>
            <Select
              value={form.country}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, country: v as CountryCode }))
              }
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d0d14] border-white/10 text-white max-h-64">
                {COUNTRIES.map(({ code, name }) => (
                  <SelectItem key={code} value={code}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-white/50 text-xs mb-1 block">Locale</Label>
            <Select
              value={form.locale}
              onValueChange={(v) => setForm((f) => ({ ...f, locale: v }))}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d0d14] border-white/10 text-white">
                {LOCALES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          disabled={
            saving ||
            (!!form.username &&
              usernameStatus !== "available" &&
              usernameStatus !== "idle")
          }
          className="bg-violet-600 hover:bg-violet-500 text-white"
        >
          <Check className="w-4 h-4 mr-1" /> {saving ? "Creating…" : "Create"}
        </Button>
      </div>
    </DialogContent>
  );
}

export default function AdminUsers() {
  const dispatch = useAppDispatch();
  const { users, usersLoading } = useAppSelector((s) => s.admin);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    dispatch(fetchAdminUsers({ page, limit: 25, search: debouncedSearch }));
  }, [dispatch, page, debouncedSearch]);

  const handleDelete = async () => {
    if (!deleteId) return;
    await dispatch(deleteAdminUser(deleteId));
    setDeleteId(null);
  };

  const totalPages = users ? Math.ceil(users.total / 25) : 1;

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-sm text-white/40">
            {users?.total ?? 0} total users
          </p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username, name…"
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/25 text-sm"
          />
        </div>
        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="bg-violet-600 hover:bg-violet-500 text-white gap-1.5"
        >
          <UserPlus className="w-4 h-4" /> New User
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <CreateUserDialog onClose={() => setCreateOpen(false)} />
      </Dialog>

      {/* Table */}
      <div className="rounded-xl border border-white/10 bg-[#0d0d14] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {[
                  "Username",
                  "Name",
                  "Country",
                  "Locale",
                  "Groups",
                  "Predictions",
                  "Sessions",
                  "Joined",
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
              {usersLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 rounded bg-white/5" />
                        </td>
                      ))}
                    </tr>
                  ))
                : (users?.items ?? []).map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-white/5 hover:bg-white/3 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-white">
                        {u.username}
                      </td>
                      <td className="px-4 py-3 text-white/60">
                        {[u.first_name, u.last_name]
                          .filter(Boolean)
                          .join(" ") ||
                          u.display_name ||
                          "—"}
                      </td>
                      <td className="px-4 py-3 text-white/50">
                        {u.country || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className="text-[10px] border-white/15 text-white/50"
                        >
                          {u.locale}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-white/60 tabular-nums">
                        {u.groups_count}
                      </td>
                      <td className="px-4 py-3 text-white/60 tabular-nums">
                        {u.predictions_count}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            u.active_sessions > 0
                              ? "bg-green-500/15 text-green-400 border-green-500/20 text-[10px]"
                              : "bg-white/5 text-white/30 border-white/10 text-[10px]"
                          }
                        >
                          {u.active_sessions}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-white/40 whitespace-nowrap text-xs">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white/30 hover:text-white hover:bg-white/10"
                            onClick={() => setEditUser(u)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white/30 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => setDeleteId(u.id)}
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

        {/* Pagination */}
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

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        {editUser && (
          <EditUserDialog user={editUser} onClose={() => setEditUser(null)} />
        )}
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent className="bg-[#0d0d14] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              This permanently deletes the user and all their data. This action
              cannot be undone.
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
