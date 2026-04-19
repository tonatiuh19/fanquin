import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAdminVenues,
  createAdminVenue,
  updateAdminVenue,
  deleteAdminVenue,
} from "@/store/slices/adminSlice";
import type { AdminVenue } from "@shared/api";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function VenueForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<AdminVenue>;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    city: initial?.city ?? "",
    country: initial?.country ?? "",
    country_code: initial?.country_code ?? "",
    capacity: String(initial?.capacity ?? ""),
    latitude: String(initial?.latitude ?? ""),
    longitude: String(initial?.longitude ?? ""),
  });

  const numOrNull = (v: string) => (v === "" ? null : Number(v));

  return (
    <DialogContent className="bg-[#0d0d14] border-white/10 text-white max-w-md">
      <DialogHeader>
        <DialogTitle className="text-white">
          {initial?.id ? "Edit Venue" : "New Venue"}
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
          <Label className="text-white/50 text-xs mb-1 block">City *</Label>
          <Input
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Country *</Label>
          <Input
            value={form.country}
            onChange={(e) =>
              setForm((f) => ({ ...f, country: e.target.value }))
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
            placeholder="US"
            onChange={(e) =>
              setForm((f) => ({ ...f, country_code: e.target.value }))
            }
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Capacity</Label>
          <Input
            type="number"
            value={form.capacity}
            onChange={(e) =>
              setForm((f) => ({ ...f, capacity: e.target.value }))
            }
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Latitude</Label>
          <Input
            type="number"
            step="any"
            value={form.latitude}
            onChange={(e) =>
              setForm((f) => ({ ...f, latitude: e.target.value }))
            }
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Longitude</Label>
          <Input
            type="number"
            step="any"
            value={form.longitude}
            onChange={(e) =>
              setForm((f) => ({ ...f, longitude: e.target.value }))
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
              ...form,
              capacity: numOrNull(form.capacity),
              latitude: numOrNull(form.latitude),
              longitude: numOrNull(form.longitude),
              country_code: form.country_code || undefined,
            })
          }
          disabled={saving || !form.name || !form.city || !form.country}
          className="bg-violet-600 hover:bg-violet-500 text-white"
        >
          <Check className="w-4 h-4 mr-1" /> {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </DialogContent>
  );
}

export default function AdminVenues() {
  const dispatch = useAppDispatch();
  const { venues, venuesLoading } = useAppSelector((s) => s.admin);
  const [showForm, setShowForm] = useState(false);
  const [editVenue, setEditVenue] = useState<AdminVenue | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchAdminVenues());
  }, [dispatch]);

  const handleCreate = async (data: Record<string, unknown>) => {
    setSaving(true);
    await dispatch(createAdminVenue(data));
    setSaving(false);
    setShowForm(false);
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!editVenue) return;
    setSaving(true);
    await dispatch(updateAdminVenue({ id: editVenue.id, updates: data }));
    setSaving(false);
    setEditVenue(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await dispatch(deleteAdminVenue(deleteId));
    setDeleteId(null);
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Venues</h1>
          <p className="text-sm text-white/40">{venues.length} venues</p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(true)}
          className="bg-violet-600 hover:bg-violet-500 text-white gap-1"
        >
          <Plus className="w-4 h-4" /> New Venue
        </Button>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0d0d14] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {[
                  "Name",
                  "City",
                  "Country",
                  "Code",
                  "Capacity",
                  "Coords",
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
              {venuesLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 rounded bg-white/5" />
                        </td>
                      ))}
                    </tr>
                  ))
                : venues.map((v) => (
                    <tr
                      key={v.id}
                      className="border-b border-white/5 hover:bg-white/3"
                    >
                      <td className="px-4 py-3 font-medium text-white">
                        {v.name}
                      </td>
                      <td className="px-4 py-3 text-white/60">{v.city}</td>
                      <td className="px-4 py-3 text-white/50">{v.country}</td>
                      <td className="px-4 py-3 text-white/40 text-xs">
                        {v.country_code ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-white/60 tabular-nums">
                        {v.capacity?.toLocaleString() ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-white/30 text-xs font-mono">
                        {v.latitude !== null && v.longitude !== null
                          ? `${v.latitude}, ${v.longitude}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white/30 hover:text-white"
                            onClick={() => setEditVenue(v)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white/30 hover:text-red-400"
                            onClick={() => setDeleteId(v.id)}
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
        open={showForm || !!editVenue}
        onOpenChange={(o) => {
          if (!o) {
            setShowForm(false);
            setEditVenue(null);
          }
        }}
      >
        <VenueForm
          initial={editVenue ?? undefined}
          onSave={editVenue ? handleUpdate : handleCreate}
          onCancel={() => {
            setShowForm(false);
            setEditVenue(null);
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
            <AlertDialogTitle>Delete venue?</AlertDialogTitle>
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
