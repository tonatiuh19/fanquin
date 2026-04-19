import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAdminNotifications,
  sendAdminBulkNotification,
} from "@/store/slices/adminSlice";
import { Send, ChevronLeft, ChevronRight, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

function SendNotificationDialog({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const [form, setForm] = useState({
    type: "admin_announcement",
    title: "",
    body: "",
    user_ids_raw: "", // comma-separated user IDs, empty = all users
  });
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!form.title || !form.type) return;
    setSending(true);
    const user_ids = form.user_ids_raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const result = await dispatch(
      sendAdminBulkNotification({
        type: form.type,
        title: form.title,
        body: form.body || undefined,
        user_ids: user_ids.length ? user_ids : undefined,
      }),
    );
    setSending(false);
    if (sendAdminBulkNotification.fulfilled.match(result)) {
      toast({
        title: "Notification sent",
        description: `Sent to ${result.payload.sent_to} user(s).`,
      });
      onClose();
    }
  };

  return (
    <DialogContent className="bg-[#0d0d14] border-white/10 text-white max-w-md">
      <DialogHeader>
        <DialogTitle className="text-white">Send Notification</DialogTitle>
      </DialogHeader>
      <div className="space-y-3 mt-2">
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Type *</Label>
          <Input
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            placeholder="admin_announcement"
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Title *</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">Body</Label>
          <Textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            rows={3}
            className="bg-white/5 border-white/10 text-white text-sm resize-none"
          />
        </div>
        <div>
          <Label className="text-white/50 text-xs mb-1 block">
            Target User IDs{" "}
            <span className="text-white/30">
              (comma-separated, empty = all users)
            </span>
          </Label>
          <Textarea
            value={form.user_ids_raw}
            onChange={(e) =>
              setForm((f) => ({ ...f, user_ids_raw: e.target.value }))
            }
            rows={2}
            placeholder="uuid1, uuid2, …"
            className="bg-white/5 border-white/10 text-white text-sm resize-none font-mono"
          />
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
          onClick={handleSend}
          disabled={sending || !form.title || !form.type}
          className="bg-violet-600 hover:bg-violet-500 text-white"
        >
          <Check className="w-4 h-4 mr-1" /> {sending ? "Sending…" : "Send"}
        </Button>
      </div>
    </DialogContent>
  );
}

export default function AdminNotifications() {
  const dispatch = useAppDispatch();
  const { notifications, notificationsLoading } = useAppSelector(
    (s) => s.admin,
  );
  const [page, setPage] = useState(1);
  const [showSend, setShowSend] = useState(false);

  useEffect(() => {
    dispatch(fetchAdminNotifications({ page, limit: 25 }));
  }, [dispatch, page]);

  const totalPages = notifications ? Math.ceil(notifications.total / 25) : 1;

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-sm text-white/40">
            {notifications?.total ?? 0} total notifications
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowSend(true)}
          className="bg-violet-600 hover:bg-violet-500 text-white gap-1"
        >
          <Send className="w-4 h-4" /> Send Notification
        </Button>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0d0d14] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {["User", "Type", "Title", "Body", "Read", "Sent"].map((h) => (
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
              {notificationsLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 rounded bg-white/5" />
                        </td>
                      ))}
                    </tr>
                  ))
                : (notifications?.items ?? []).map((n) => (
                    <tr
                      key={n.id}
                      className="border-b border-white/5 hover:bg-white/3"
                    >
                      <td className="px-4 py-3 text-white/70 text-xs">
                        {n.username ?? n.user_id.slice(0, 8) + "…"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-white/5 text-white/40 border-white/10 text-[10px]">
                          {n.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-white/80 max-w-xs truncate">
                        {n.title}
                      </td>
                      <td className="px-4 py-3 text-white/40 text-xs max-w-xs truncate">
                        {n.body ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            n.is_read
                              ? "bg-green-500/15 text-green-400 border-green-500/20 text-[10px]"
                              : "bg-white/5 text-white/30 border-white/10 text-[10px]"
                          }
                        >
                          {n.is_read ? "Read" : "Unread"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">
                        {new Date(n.created_at).toLocaleString()}
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

      <Dialog open={showSend} onOpenChange={(o) => !o && setShowSend(false)}>
        <SendNotificationDialog onClose={() => setShowSend(false)} />
      </Dialog>
    </div>
  );
}
