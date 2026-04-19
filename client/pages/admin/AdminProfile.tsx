import { useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAdminProfile,
  updateAdminProfile,
} from "@/store/slices/adminSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, Globe, Save, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const profileSchema = Yup.object({
  display_name: Yup.string().max(60, "Max 60 characters"),
  first_name: Yup.string().max(50, "Max 50 characters"),
  last_name: Yup.string().max(50, "Max 50 characters"),
  phone: Yup.string()
    .max(30, "Max 30 characters")
    .matches(/^[+\d\s()\-]*$/, "Invalid phone format")
    .nullable(),
  country: Yup.string().max(60, "Max 60 characters").nullable(),
  locale: Yup.string().oneOf(["en", "es"]),
});

type ProfileFormValues = {
  display_name: string;
  first_name: string;
  last_name: string;
  phone: string;
  country: string;
  locale: string;
};

function FieldWrapper({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-white/70">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function AdminProfile() {
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const adminProfile = useAppSelector((s) => s.admin.adminProfile);
  const profileUpdateLoading = useAppSelector(
    (s) => s.admin.profileUpdateLoading,
  );
  const profileUpdateError = useAppSelector((s) => s.admin.profileUpdateError);

  // Fetch full profile on mount (verifyCode only stores partial data)
  useEffect(() => {
    dispatch(fetchAdminProfile());
  }, [dispatch]);

  const formik = useFormik<ProfileFormValues>({
    enableReinitialize: true,
    initialValues: {
      display_name: adminProfile?.display_name ?? "",
      first_name: adminProfile?.first_name ?? "",
      last_name: adminProfile?.last_name ?? "",
      phone: adminProfile?.phone ?? "",
      country: adminProfile?.country ?? "",
      locale: adminProfile?.locale ?? "en",
    },
    validationSchema: profileSchema,
    onSubmit: async (values) => {
      // Only send changed non-empty fields
      const updates: Record<string, unknown> = {};
      if (values.display_name !== (adminProfile?.display_name ?? ""))
        updates.display_name = values.display_name;
      if (values.first_name !== (adminProfile?.first_name ?? ""))
        updates.first_name = values.first_name;
      if (values.last_name !== (adminProfile?.last_name ?? ""))
        updates.last_name = values.last_name;
      if (values.phone !== (adminProfile?.phone ?? ""))
        updates.phone = values.phone || null;
      if (values.country !== (adminProfile?.country ?? ""))
        updates.country = values.country || null;
      if (values.locale !== (adminProfile?.locale ?? "en"))
        updates.locale = values.locale;

      if (Object.keys(updates).length === 0) {
        toast({ title: "No changes to save." });
        return;
      }

      const result = await dispatch(updateAdminProfile(updates));
      if (updateAdminProfile.fulfilled.match(result)) {
        toast({
          title: "Profile updated",
          description: "Your information has been saved.",
        });
      } else {
        toast({
          title: "Update failed",
          description: profileUpdateError ?? "Something went wrong.",
          variant: "destructive",
        });
      }
    },
  });

  const isLoading = !adminProfile;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-600/20 border border-violet-500/20">
          <User className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Admin Profile</h1>
          <p className="text-sm text-white/40">
            Manage your back-office account information
          </p>
        </div>
      </div>

      {/* Read-only identity card */}
      <div className="rounded-xl border border-white/10 bg-[#0d0d14] p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/30">
          <Shield className="w-3.5 h-3.5" />
          Identity
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-white/40 flex items-center gap-1.5">
              <Mail className="w-3 h-3" /> Email
            </Label>
            {isLoading ? (
              <Skeleton className="h-9 w-full bg-white/5" />
            ) : (
              <Input
                value={adminProfile?.email ?? ""}
                disabled
                className="bg-white/5 border-white/10 text-white/50 cursor-not-allowed"
              />
            )}
          </div>
          {/* Username */}
          <div className="space-y-1">
            <Label className="text-xs text-white/40 flex items-center gap-1.5">
              <User className="w-3 h-3" /> Username
            </Label>
            {isLoading ? (
              <Skeleton className="h-9 w-full bg-white/5" />
            ) : (
              <Input
                value={adminProfile?.username ?? ""}
                disabled
                className="bg-white/5 border-white/10 text-white/50 cursor-not-allowed"
              />
            )}
          </div>
        </div>
        <p className="text-xs text-white/20">
          Email and username cannot be changed here.
        </p>
      </div>

      {/* Editable form */}
      <form onSubmit={formik.handleSubmit} noValidate>
        <div className="rounded-xl border border-white/10 bg-[#0d0d14] p-5 space-y-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/30">
            <User className="w-3.5 h-3.5" />
            Personal Information
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-full bg-white/5" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Display name — full row */}
              <FieldWrapper
                label="Display name"
                error={
                  formik.touched.display_name
                    ? formik.errors.display_name
                    : undefined
                }
              >
                <Input
                  id="display_name"
                  name="display_name"
                  placeholder="Alex Gomez"
                  value={formik.values.display_name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={cn(
                    "bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-500/50",
                    formik.touched.display_name &&
                      formik.errors.display_name &&
                      "border-red-500/50",
                  )}
                />
              </FieldWrapper>

              {/* First / Last name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldWrapper
                  label="First name"
                  error={
                    formik.touched.first_name
                      ? formik.errors.first_name
                      : undefined
                  }
                >
                  <Input
                    id="first_name"
                    name="first_name"
                    placeholder="Alex"
                    value={formik.values.first_name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={cn(
                      "bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-500/50",
                      formik.touched.first_name &&
                        formik.errors.first_name &&
                        "border-red-500/50",
                    )}
                  />
                </FieldWrapper>
                <FieldWrapper
                  label="Last name"
                  error={
                    formik.touched.last_name
                      ? formik.errors.last_name
                      : undefined
                  }
                >
                  <Input
                    id="last_name"
                    name="last_name"
                    placeholder="Gomez"
                    value={formik.values.last_name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={cn(
                      "bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-500/50",
                      formik.touched.last_name &&
                        formik.errors.last_name &&
                        "border-red-500/50",
                    )}
                  />
                </FieldWrapper>
              </div>

              {/* Phone / Country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldWrapper
                  label="Phone"
                  error={formik.touched.phone ? formik.errors.phone : undefined}
                >
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                    <Input
                      id="phone"
                      name="phone"
                      placeholder="+1 555 000 0000"
                      value={formik.values.phone}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={cn(
                        "pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-500/50",
                        formik.touched.phone &&
                          formik.errors.phone &&
                          "border-red-500/50",
                      )}
                    />
                  </div>
                </FieldWrapper>
                <FieldWrapper
                  label="Country"
                  error={
                    formik.touched.country ? formik.errors.country : undefined
                  }
                >
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                    <Input
                      id="country"
                      name="country"
                      placeholder="Mexico"
                      value={formik.values.country}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={cn(
                        "pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-500/50",
                        formik.touched.country &&
                          formik.errors.country &&
                          "border-red-500/50",
                      )}
                    />
                  </div>
                </FieldWrapper>
              </div>

              {/* Locale */}
              <FieldWrapper label="Language preference">
                <Select
                  value={formik.values.locale}
                  onValueChange={(val) => formik.setFieldValue("locale", val)}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-violet-500/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0d0d14] border-white/10 text-white">
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </FieldWrapper>
            </div>
          )}

          <Separator className="bg-white/5" />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-white/30">
              Member since{" "}
              {adminProfile?.created_at
                ? new Date(
                    (adminProfile as any).created_at,
                  ).toLocaleDateString()
                : "—"}
            </p>
            <Button
              type="submit"
              disabled={isLoading || profileUpdateLoading || !formik.dirty}
              className="gap-2 bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40"
            >
              <Save className="w-4 h-4" />
              {profileUpdateLoading ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
