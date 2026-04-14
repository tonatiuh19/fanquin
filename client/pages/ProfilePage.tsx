import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import leoProfanity from "leo-profanity";
leoProfanity.loadDictionary("en");
leoProfanity.loadDictionary("es");
import axios from "axios";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setAuth } from "@/store/slices/authSlice";
import type { UserProfile } from "@shared/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageMeta } from "@/components/fanquin/page-meta";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCountries } from "react-phone-number-input";
import type { Country as CountryCode } from "react-phone-number-input";
import { Loader2, UserCircle, Save, CheckCircle2, LogOut } from "lucide-react";
import { useState } from "react";
import { clearAuth } from "@/store/slices/authSlice";

const _regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const COUNTRIES = getCountries()
  .map((code) => ({ code, name: _regionNames.of(code) ?? code }))
  .sort((a, b) => a.name.localeCompare(b.name));

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const userProfile = useAppSelector((s) => s.auth.userProfile);
  const sessionToken = useAppSelector(
    (s) => s.auth.sessionToken ?? localStorage.getItem("fanquin_session"),
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!sessionToken) navigate("/");
  }, [sessionToken, navigate]);

  const displayName =
    userProfile?.display_name ??
    `${userProfile?.first_name ?? ""} ${userProfile?.last_name ?? ""}`.trim() ??
    userProfile?.username ??
    "";

  const initials = displayName
    ? displayName
        .split(" ")
        .map((w: string) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      display_name: userProfile?.display_name ?? "",
      first_name: userProfile?.first_name ?? "",
      last_name: userProfile?.last_name ?? "",
      phone: userProfile?.phone ?? "",
      country: (userProfile?.country as CountryCode) ?? "",
      username: userProfile?.username ?? "",
    },
    validationSchema: Yup.object({
      display_name: Yup.string().max(60, t("profile.displayNameMax")),
      first_name: Yup.string().required(t("profile.required")),
      last_name: Yup.string().required(t("profile.required")),
      phone: Yup.string(),
      country: Yup.string(),
      username: Yup.string()
        .min(3, t("profile.usernameMin"))
        .max(30, t("profile.usernameMax"))
        .matches(/^[a-z0-9_]+$/, t("profile.usernameInvalid"))
        .test("not-blocked", t("profile.usernameBlocked"), (val) => {
          if (!val) return true;
          const normalized = val
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/_/g, "")
            .replace(/0/g, "o")
            .replace(/1/g, "i")
            .replace(/3/g, "e")
            .replace(/4/g, "a")
            .replace(/5/g, "s")
            .replace(/8/g, "b");
          return !leoProfanity.check(normalized);
        }),
    }),
    onSubmit: async (values, { setSubmitting, setStatus }) => {
      setSaved(false);
      try {
        const { data } = await axios.patch<{
          success: boolean;
          data: UserProfile;
        }>("/api/profile", values, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        if (data.success) {
          dispatch(
            setAuth({ sessionToken: sessionToken!, userProfile: data.data }),
          );
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        }
      } catch {
        setStatus(t("profile.saveError"));
      } finally {
        setSubmitting(false);
      }
    },
  });

  if (!userProfile) return null;

  return (
    <div className="container max-w-2xl py-10 md:py-16">
      <PageMeta
        title={t("seo.profile.title")}
        description={t("seo.profile.description")}
        canonicalPath="/profile"
        noIndex
      />
      {/* Header */}
      <div className="mb-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand">
          {t("profile.badge")}
        </p>
        <h1 className="font-display text-3xl font-bold text-white">
          {t("profile.title")}
        </h1>
      </div>

      {/* Avatar card */}
      <div className="mb-6 flex items-center gap-5 rounded-[1.4rem] border border-white/10 bg-white/5 p-5">
        <Avatar className="h-16 w-16 text-xl">
          <AvatarImage src={userProfile.avatar_url ?? undefined} />
          <AvatarFallback className="bg-brand/20 text-brand text-xl font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-display text-lg font-semibold text-white">
            {displayName || userProfile.username}
          </p>
          <p className="text-sm text-foreground/50">@{userProfile.username}</p>
          <p className="mt-1 text-xs text-foreground/40">
            {t("profile.memberSince", {
              date: new Date(userProfile.created_at).toLocaleDateString(),
            })}
          </p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={formik.handleSubmit}
        className="rounded-[1.4rem] border border-white/10 bg-white/5 p-6 space-y-5"
      >
        <div className="flex items-center gap-2 mb-1">
          <UserCircle className="h-4 w-4 text-brand" />
          <h2 className="font-display text-base font-semibold text-white">
            {t("profile.personalInfo")}
          </h2>
        </div>

        {/* First + Last */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground/80">
              {t("auth.firstName")} <span className="text-rose-400">*</span>
            </Label>
            <Input
              name="first_name"
              value={formik.values.first_name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              disabled={formik.isSubmitting}
              className="rounded-xl border-white/15 bg-white/5 text-white placeholder:text-foreground/30 focus:border-brand/50"
            />
            {formik.touched.first_name && formik.errors.first_name && (
              <p className="text-xs text-rose-400">
                {formik.errors.first_name}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground/80">
              {t("auth.lastName")} <span className="text-rose-400">*</span>
            </Label>
            <Input
              name="last_name"
              value={formik.values.last_name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              disabled={formik.isSubmitting}
              className="rounded-xl border-white/15 bg-white/5 text-white placeholder:text-foreground/30 focus:border-brand/50"
            />
            {formik.touched.last_name && formik.errors.last_name && (
              <p className="text-xs text-rose-400">{formik.errors.last_name}</p>
            )}
          </div>
        </div>

        {/* Display name */}
        <div className="space-y-1.5">
          <Label className="text-xs text-foreground/80">
            {t("profile.displayName")}
          </Label>
          <Input
            name="display_name"
            placeholder={t("profile.displayNamePlaceholder")}
            value={formik.values.display_name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            disabled={formik.isSubmitting}
            className="rounded-xl border-white/15 bg-white/5 text-white placeholder:text-foreground/30 focus:border-brand/50"
          />
          {formik.touched.display_name && formik.errors.display_name && (
            <p className="text-xs text-rose-400">
              {formik.errors.display_name}
            </p>
          )}
        </div>

        {/* Username */}
        <div className="space-y-1.5">
          <Label className="text-xs text-foreground/80">
            {t("profile.username")}
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground/40">
              @
            </span>
            <Input
              name="username"
              value={formik.values.username}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              disabled={formik.isSubmitting}
              className="rounded-xl border-white/15 bg-white/5 pl-7 text-white placeholder:text-foreground/30 focus:border-brand/50"
            />
          </div>
          {formik.touched.username && formik.errors.username && (
            <p className="text-xs text-rose-400">{formik.errors.username}</p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <Label className="text-xs text-foreground/80">
            {t("auth.phone")}
          </Label>
          <Input
            name="phone"
            type="tel"
            value={formik.values.phone}
            onChange={formik.handleChange}
            disabled={formik.isSubmitting}
            className="rounded-xl border-white/15 bg-white/5 text-white placeholder:text-foreground/30 focus:border-brand/50"
          />
        </div>

        {/* Country */}
        <div className="space-y-1.5">
          <Label className="text-xs text-foreground/80">
            {t("auth.country")}
          </Label>
          <Select
            value={formik.values.country}
            onValueChange={(val) => formik.setFieldValue("country", val)}
            disabled={formik.isSubmitting}
          >
            <SelectTrigger className="rounded-xl border-white/15 bg-white/5 text-white focus:border-brand/50">
              <SelectValue placeholder={t("auth.countryPlaceholder")} />
            </SelectTrigger>
            <SelectContent className="max-h-64 bg-[hsl(var(--surface))] border-white/15">
              {COUNTRIES.map(({ code, name }) => (
                <SelectItem
                  key={code}
                  value={code}
                  className="text-white focus:bg-white/10 focus:text-white"
                >
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Errors / success */}
        {formik.status && (
          <p className="text-xs text-rose-400">{formik.status}</p>
        )}

        <Button
          type="submit"
          disabled={formik.isSubmitting || !formik.dirty}
          className="w-full rounded-full bg-brand text-sm font-semibold text-slate-950 hover:bg-brand/90 disabled:opacity-40"
        >
          {formik.isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saved ? t("profile.saved") : t("profile.saveChanges")}
        </Button>
      </form>

      {/* Mobile-only sign out */}
      <div className="mt-4 md:hidden">
        <button
          type="button"
          onClick={() => dispatch(clearAuth())}
          className="flex w-full items-center justify-center gap-2 rounded-[1.4rem] border border-rose-500/20 bg-rose-500/5 py-3.5 text-sm font-semibold text-rose-400 transition hover:bg-rose-500/10"
        >
          <LogOut className="h-4 w-4" />
          {t("nav.signOut")}
        </button>
      </div>
    </div>
  );
}
