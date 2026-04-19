import { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAdminPeople,
  createAdminPerson,
  updateAdminPerson,
  deleteAdminPerson,
} from "@/store/slices/adminSlice";
import type { AdminPerson } from "@shared/api";
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
  DialogFooter,
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
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// ── Validation schema ─────────────────────────────────────────
const addPersonSchema = Yup.object({
  email: Yup.string().email("Invalid email").required("Email is required"),
  username: Yup.string()
    .min(3, "Min 3 characters")
    .max(30, "Max 30 characters")
    .required("Username is required"),
  display_name: Yup.string().max(60, "Max 60 characters"),
  first_name: Yup.string().max(50, "Max 50 characters"),
  last_name: Yup.string().max(50, "Max 50 characters"),
});

type AddPersonValues = {
  email: string;
  username: string;
  display_name: string;
  first_name: string;
  last_name: string;
};

// ── Helpers ───────────────────────────────────────────────────
function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      className={cn(
        "text-xs font-semibold",
        isActive
          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
          : "bg-rose-500/20 text-rose-400 border-rose-500/30",
      )}
      variant="outline"
    >
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}

function FieldBlock({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-400 uppercase tracking-wide">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function AdminPeople() {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { people, peopleLoading, adminProfile } = useAppSelector(
    (s) => s.admin,
  );

  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminPerson | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchAdminPeople());
  }, [dispatch]);

  // ── Add form ────────────────────────────────────────────────
  const formik = useFormik<AddPersonValues>({
    initialValues: {
      email: "",
      username: "",
      display_name: "",
      first_name: "",
      last_name: "",
    },
    validationSchema: addPersonSchema,
    onSubmit: async (values, { resetForm, setSubmitting }) => {
      const body: Record<string, unknown> = {
        email: values.email.trim().toLowerCase(),
        username: values.username.trim(),
      };
      if (values.display_name.trim())
        body.display_name = values.display_name.trim();
      if (values.first_name.trim()) body.first_name = values.first_name.trim();
      if (values.last_name.trim()) body.last_name = values.last_name.trim();

      const result = await dispatch(createAdminPerson(body));
      setSubmitting(false);
      if (createAdminPerson.fulfilled.match(result)) {
        toast({ title: "Admin added", description: values.email });
        resetForm();
        setAddOpen(false);
      } else {
        toast({
          title: "Failed to add admin",
          description: (result.payload as string) ?? "Unknown error",
          variant: "destructive",
        });
      }
    },
  });

  // ── Toggle active ────────────────────────────────────────────
  const handleToggle = async (person: AdminPerson) => {
    setTogglingId(person.id);
    const result = await dispatch(
      updateAdminPerson({
        id: person.id,
        updates: { is_active: !person.is_active },
      }),
    );
    setTogglingId(null);
    if (!updateAdminPerson.fulfilled.match(result)) {
      toast({
        title: "Update failed",
        description: (result.payload as string) ?? "Unknown error",
        variant: "destructive",
      });
    }
  };

  // ── Delete ───────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await dispatch(deleteAdminPerson(deleteTarget.id));
    setDeleteTarget(null);
    if (!deleteAdminPerson.fulfilled.match(result)) {
      toast({
        title: "Delete failed",
        description: (result.payload as string) ?? "Unknown error",
        variant: "destructive",
      });
    } else {
      toast({ title: "Admin removed" });
    }
  };

  const isSelf = (id: string) => id === adminProfile?.id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <ShieldCheck className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Admin Team</h1>
            <p className="text-sm text-gray-400">
              Manage who has access to the back-office
            </p>
          </div>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
          size="sm"
        >
          <UserPlus className="w-4 h-4" />
          Add Admin
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Username</th>
                <th className="px-4 py-3 text-left font-medium">
                  Display Name
                </th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Added</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {peopleLoading && people.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-t border-white/5">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full bg-white/5" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : people.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No admin users found.
                  </td>
                </tr>
              ) : (
                people.map((person) => (
                  <tr
                    key={person.id}
                    className={cn(
                      "border-t border-white/5 transition-colors hover:bg-white/[0.03]",
                      isSelf(person.id) && "bg-violet-500/5",
                    )}
                  >
                    <td className="px-4 py-3 text-gray-200">
                      <span className="font-mono text-xs">{person.email}</span>
                      {isSelf(person.id) && (
                        <span className="ml-2 text-[10px] text-violet-400 font-semibold">
                          you
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      @{person.username}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {person.display_name ?? (
                        <span className="text-gray-600 italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge isActive={person.is_active} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {format(new Date(person.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Toggle */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-7 w-7",
                            person.is_active
                              ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                              : "text-gray-500 hover:text-gray-300 hover:bg-white/5",
                          )}
                          disabled={
                            togglingId === person.id || isSelf(person.id)
                          }
                          onClick={() => handleToggle(person)}
                          title={person.is_active ? "Deactivate" : "Activate"}
                        >
                          {person.is_active ? (
                            <ToggleRight className="w-4 h-4" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                        </Button>
                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          disabled={isSelf(person.id)}
                          onClick={() => setDeleteTarget(person)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Admin Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-[#0d0d14] border border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="w-5 h-5 text-violet-400" />
              Add Admin User
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={formik.handleSubmit} className="space-y-4 mt-2">
            <FieldBlock
              label="Email *"
              error={formik.touched.email ? formik.errors.email : undefined}
            >
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                {...formik.getFieldProps("email")}
              />
            </FieldBlock>
            <FieldBlock
              label="Username *"
              error={
                formik.touched.username ? formik.errors.username : undefined
              }
            >
              <Input
                id="username"
                placeholder="jdoe"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                {...formik.getFieldProps("username")}
              />
            </FieldBlock>
            <FieldBlock
              label="Display Name"
              error={
                formik.touched.display_name
                  ? formik.errors.display_name
                  : undefined
              }
            >
              <Input
                id="display_name"
                placeholder="Jane Doe"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                {...formik.getFieldProps("display_name")}
              />
            </FieldBlock>
            <div className="grid grid-cols-2 gap-3">
              <FieldBlock
                label="First Name"
                error={
                  formik.touched.first_name
                    ? formik.errors.first_name
                    : undefined
                }
              >
                <Input
                  id="first_name"
                  placeholder="Jane"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  {...formik.getFieldProps("first_name")}
                />
              </FieldBlock>
              <FieldBlock
                label="Last Name"
                error={
                  formik.touched.last_name ? formik.errors.last_name : undefined
                }
              >
                <Input
                  id="last_name"
                  placeholder="Doe"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  {...formik.getFieldProps("last_name")}
                />
              </FieldBlock>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                className="text-gray-400 hover:text-white"
                onClick={() => {
                  setAddOpen(false);
                  formik.resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-violet-600 hover:bg-violet-700 text-white"
                disabled={formik.isSubmitting}
              >
                {formik.isSubmitting ? "Adding…" : "Add Admin"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent className="bg-[#0d0d14] border border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove admin access?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will permanently delete{" "}
              <span className="font-semibold text-white">
                {deleteTarget?.email}
              </span>{" "}
              from the admin team. Their sessions will be revoked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-gray-300 hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleDelete}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
