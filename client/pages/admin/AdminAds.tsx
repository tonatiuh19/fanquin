import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAdminAdRequests,
  updateAdminAdRequest,
  deleteAdminAdRequest,
} from "@/store/slices/adminSlice";
import type { AdRequest, AdRequestStatus } from "@shared/api";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe2,
  Mail,
  Megaphone,
  MoreHorizontal,
  Phone,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AdRequestStatus, { label: string; color: string }> =
  {
    pending: {
      label: "Pending",
      color: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    },
    contacted: {
      label: "Contacted",
      color: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    },
    approved: {
      label: "Approved",
      color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    },
    rejected: {
      label: "Rejected",
      color: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    },
  };

const FORMAT_LABELS: Record<string, string> = {
  banner: "Banner",
  sponsored_group: "Sponsored Group",
  email_marketing: "Email Marketing",
  homepage_spotlight: "Homepage Spotlight",
  other: "Custom",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// ── Detail Dialog ─────────────────────────────────────────────────

function AdRequestDetail({
  request,
  onClose,
}: {
  request: AdRequest;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const [status, setStatus] = useState<AdRequestStatus>(request.status);
  const [notes, setNotes] = useState(request.admin_notes ?? "");
  const [saving, setSaving] = useState(false);

  const isDirty =
    status !== request.status || notes !== (request.admin_notes ?? "");

  const handleSave = async () => {
    setSaving(true);
    const result = await dispatch(
      updateAdminAdRequest({
        id: request.id,
        updates: { status, admin_notes: notes || undefined },
      }),
    );
    setSaving(false);
    if (updateAdminAdRequest.fulfilled.match(result)) {
      toast({ title: "Updated", description: "Ad request saved." });
      onClose();
    } else {
      toast({
        title: "Error",
        description: "Failed to update.",
        variant: "destructive",
      });
    }
  };

  const cfg = STATUS_CONFIG[status];

  return (
    <DialogContent className="max-w-lg bg-[#0d0d14] border-white/10 text-white">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-white">
          <Megaphone className="h-4 w-4 text-violet-400" />
          {request.brand_name}
        </DialogTitle>
      </DialogHeader>

      <div className="mt-2 space-y-4">
        {/* Info grid */}
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-3">
          <InfoRow label="Contact" value={request.contact_name} />
          <InfoRow
            label="Email"
            value={
              <a
                href={`mailto:${request.contact_email}`}
                className="flex items-center gap-1 text-violet-300 hover:text-violet-200"
              >
                <Mail className="h-3.5 w-3.5" />
                {request.contact_email}
              </a>
            }
          />
          {request.contact_phone && (
            <InfoRow
              label="Phone"
              value={
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-foreground/40" />
                  {request.contact_phone}
                </span>
              }
            />
          )}
          {request.website_url && (
            <InfoRow
              label="Website"
              value={
                <a
                  href={request.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-violet-300 hover:text-violet-200"
                >
                  <Globe2 className="h-3.5 w-3.5" />
                  {request.website_url}
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              }
            />
          )}
          <InfoRow
            label="Format"
            value={FORMAT_LABELS[request.ad_format] ?? request.ad_format}
          />
          {request.budget_range && (
            <InfoRow label="Budget" value={request.budget_range} />
          )}
          {request.campaign_goal && (
            <InfoRow label="Goal" value={request.campaign_goal} />
          )}
          <InfoRow label="Received" value={formatDate(request.created_at)} />
        </div>

        {/* Message */}
        {request.message && (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
            <p className="mb-1 text-xs text-foreground/40">Message</p>
            <p className="text-sm leading-relaxed text-white/80">
              {request.message}
            </p>
          </div>
        )}

        {/* Status */}
        <div className="space-y-1.5">
          <Label className="text-xs text-foreground/50">Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as AdRequestStatus)}
          >
            <SelectTrigger
              className={cn("border text-sm font-semibold", cfg.color)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0d0d14] border-white/10 text-white">
              {(
                Object.entries(STATUS_CONFIG) as [
                  AdRequestStatus,
                  { label: string; color: string },
                ][]
              ).map(([key, val]) => (
                <SelectItem key={key} value={key} className="focus:bg-white/10">
                  {val.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Admin notes */}
        <div className="space-y-1.5">
          <Label className="text-xs text-foreground/50">Admin notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes about this inquiry..."
            rows={3}
            className="resize-none bg-white/[0.04] border-white/10 text-white text-sm placeholder:text-foreground/25"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="flex-1 bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-white/60 hover:bg-white/10 hover:text-white"
          >
            Close
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-foreground/40">{label}</span>
      <span className="text-right text-white/80">{value}</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────

export default function AdminAds() {
  const dispatch = useAppDispatch();
  const { adRequests, adRequestsLoading } = useAppSelector((s) => s.admin);
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<AdRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const perPage = 25;

  useEffect(() => {
    dispatch(
      fetchAdminAdRequests({
        page,
        per_page: perPage,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
    );
  }, [dispatch, page, statusFilter]);

  const handleDelete = async (id: string) => {
    const result = await dispatch(deleteAdminAdRequest(id));
    if (deleteAdminAdRequest.fulfilled.match(result)) {
      toast({ title: "Deleted", description: "Ad request removed." });
    } else {
      toast({
        title: "Error",
        description: "Could not delete.",
        variant: "destructive",
      });
    }
    setDeleteTarget(null);
  };

  const rows = adRequests?.data ?? [];
  const total = adRequests?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15">
            <Megaphone className="h-4.5 w-4.5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Ad Requests</h1>
            <p className="text-xs text-foreground/40">
              {total} inquir{total === 1 ? "y" : "ies"} received
            </p>
          </div>
        </div>

        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-36 bg-white/[0.04] border-white/10 text-white text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#0d0d14] border-white/10 text-white">
            <SelectItem value="all" className="focus:bg-white/10">
              All statuses
            </SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <SelectItem key={key} value={key} className="focus:bg-white/10">
                {val.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          Object.entries(STATUS_CONFIG) as [
            AdRequestStatus,
            { label: string; color: string },
          ][]
        ).map(([key, cfg]) => {
          const count =
            adRequests?.data.filter((r) => r.status === key).length ?? 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setStatusFilter(key);
                setPage(1);
              }}
              className={cn(
                "rounded-xl border p-3 text-left transition hover:opacity-90",
                statusFilter === key
                  ? cfg.color
                  : "border-white/[0.07] bg-white/[0.02] text-white/70",
              )}
            >
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
        {adRequestsLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-white/[0.04]" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-foreground/30 text-sm">
            No ad requests found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                  <Th>Brand</Th>
                  <Th>Contact</Th>
                  <Th>Format</Th>
                  <Th>Budget</Th>
                  <Th>Status</Th>
                  <Th>Date</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {rows.map((req) => {
                  const cfg = STATUS_CONFIG[req.status];
                  return (
                    <tr
                      key={req.id}
                      className="border-b border-white/[0.05] transition hover:bg-white/[0.03] last:border-0"
                    >
                      <td className="px-4 py-3 font-semibold text-white">
                        {req.brand_name}
                      </td>
                      <td className="px-4 py-3 text-foreground/60">
                        <div>{req.contact_name}</div>
                        <div className="text-xs text-violet-400">
                          {req.contact_email}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground/60">
                        {FORMAT_LABELS[req.ad_format] ?? req.ad_format}
                      </td>
                      <td className="px-4 py-3 text-foreground/60">
                        {req.budget_range ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                            cfg.color,
                          )}
                        >
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground/40 whitespace-nowrap">
                        {formatDate(req.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-foreground/40 hover:bg-white/10 hover:text-white"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-[#0d0d14] border-white/10 text-white w-40"
                          >
                            <DropdownMenuItem
                              onClick={() => setSelected(req)}
                              className="text-white/80 focus:bg-white/10 focus:text-white cursor-pointer"
                            >
                              <Check className="mr-2 h-3.5 w-3.5" />
                              View / Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(req.id)}
                              className="text-rose-400 focus:bg-rose-500/10 focus:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-foreground/40">
            Page {page} of {totalPages} · {total} total
          </p>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-8 w-8 text-white/60 hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 w-8 text-white/60 hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <AdRequestDetail
            request={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm bg-[#0d0d14] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Delete ad request?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground/60">
            This action cannot be undone.
          </p>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              className="flex-1 bg-rose-600 text-white hover:bg-rose-500"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              className="text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-foreground/30">
      {children}
    </th>
  );
}
