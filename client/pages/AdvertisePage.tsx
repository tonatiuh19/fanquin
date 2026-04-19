import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Globe2,
  Loader2,
  Mail,
  Megaphone,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { PageMeta } from "@/components/fanquin/page-meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  submitAdRequest,
  resetAdvertiseForm,
} from "@/store/slices/advertiseSlice";
import type { AdFormat } from "@shared/api";

// ── Format icon map ───────────────────────────────────────────────
const FORMAT_ICONS: Record<string, React.ElementType> = {
  banner: Globe2,
  sponsored_group: Users,
  email_marketing: Mail,
  homepage_spotlight: Sparkles,
  other: Rocket,
};

// ── Why icons ─────────────────────────────────────────────────────
const WHY_ICONS = [Target, Zap, BarChart3, TrendingUp];

export default function AdvertisePage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { submitting, submitted, error } = useAppSelector((s) => s.advertise);
  const formRef = useRef<HTMLDivElement>(null);
  const [highlightedFormat, setHighlightedFormat] = useState<string | null>(
    null,
  );

  const stats = t("advertise.stats", { returnObjects: true }) as Array<{
    value: string;
    label: string;
    note: string;
  }>;

  const formats = t("advertise.formats.items", {
    returnObjects: true,
  }) as Array<{
    key: string;
    label: string;
    description: string;
  }>;

  const whyItems = t("advertise.why.items", { returnObjects: true }) as Array<{
    title: string;
    description: string;
  }>;

  const budgetRanges = t("advertise.form.budget_ranges", {
    returnObjects: true,
  }) as string[];

  const campaignGoals = t("advertise.form.campaign_goals", {
    returnObjects: true,
  }) as string[];

  const validationSchema = Yup.object({
    brand_name: Yup.string().required(t("advertise.form.error_required")),
    contact_name: Yup.string().required(t("advertise.form.error_required")),
    contact_email: Yup.string()
      .email(t("advertise.form.error_email"))
      .required(t("advertise.form.error_required")),
    contact_phone: Yup.string(),
    website_url: Yup.string().url(),
    ad_format: Yup.string().required(t("advertise.form.error_required")),
    budget_range: Yup.string(),
    campaign_goal: Yup.string(),
    message: Yup.string(),
  });

  const formik = useFormik({
    initialValues: {
      brand_name: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      website_url: "",
      ad_format: "" as AdFormat | "",
      budget_range: "",
      campaign_goal: "",
      message: "",
    },
    validationSchema,
    onSubmit: (values) => {
      dispatch(
        submitAdRequest({
          brand_name: values.brand_name,
          contact_name: values.contact_name,
          contact_email: values.contact_email,
          contact_phone: values.contact_phone || undefined,
          website_url: values.website_url || undefined,
          ad_format: values.ad_format as AdFormat,
          budget_range: values.budget_range || undefined,
          campaign_goal: values.campaign_goal || undefined,
          message: values.message || undefined,
        }),
      );
    },
  });

  // Pre-fill ad_format when user clicks a format card
  function selectFormat(key: string) {
    setHighlightedFormat(key);
    formik.setFieldValue("ad_format", key);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  useEffect(() => {
    return () => {
      dispatch(resetAdvertiseForm());
    };
  }, [dispatch]);

  return (
    <>
      <PageMeta
        title={t("advertise.meta.title")}
        description={t("advertise.meta.description")}
      />

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 md:py-36">
        {/* ── Video background with image fallback ── */}
        {/* Video: "Vibrant soccer match at iconic stadium" – Pexels #34686032 (free licence) */}
        <div className="pointer-events-none absolute inset-0 select-none">
          <video
            autoPlay
            muted
            loop
            playsInline
            poster="https://images.pexels.com/videos/34686032/pictures/preview-0.jpg"
            className="h-full w-full object-cover"
          >
            <source
              src="https://videos.pexels.com/video-files/34686032/14702118_2560_1440_60fps.mp4"
              type="video/mp4"
            />
          </video>
          {/* Dark gradient overlay so text stays legible */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-background" />
          {/* Subtle colour tint to keep brand palette */}
          <div className="absolute inset-0 bg-violet-950/30" />
        </div>

        {/* Residual glow blobs (visible even when video loads) */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="pointer-events-none absolute top-20 -right-32 h-72 w-72 rounded-full bg-fuchsia-600/15 blur-[80px]" />

        <div className="container relative text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-white md:text-6xl">
            {t("advertise.hero.title")}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-foreground/60">
            {t("advertise.hero.description")}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              onClick={() =>
                formRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
              className="rounded-full bg-violet-600 px-8 py-3 text-sm font-semibold text-white shadow-[0_0_32px_rgba(124,58,237,0.5)] transition hover:bg-violet-500 hover:shadow-[0_0_48px_rgba(124,58,237,0.7)]"
            >
              {t("advertise.form.submit")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── Stats bar ──────────────────────────────────────────── */}
      <section className="border-y border-white/[0.07] bg-white/[0.02] py-10">
        <div className="container">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-black text-white md:text-4xl">
                  {s.value}
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground/70">
                  {s.label}
                </div>
                <div className="mt-0.5 text-xs text-foreground/40">
                  {s.note}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Ad formats ─────────────────────────────────────────── */}
      <section className="py-20">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              {t("advertise.formats.title")}
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {formats.map((f, idx) => {
              const Icon = FORMAT_ICONS[f.key] ?? Rocket;
              const isHighlighted = highlightedFormat === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => selectFormat(f.key)}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border p-6 text-left transition-all duration-300",
                    isHighlighted
                      ? "border-violet-500/60 bg-violet-500/10 shadow-[0_0_32px_rgba(124,58,237,0.25)]"
                      : "border-white/10 bg-white/[0.03] hover:border-violet-500/40 hover:bg-violet-500/[0.06]",
                    idx === 4 && "sm:col-span-2 lg:col-span-1",
                  )}
                >
                  <div
                    className={cn(
                      "mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
                      isHighlighted
                        ? "bg-violet-500/30 text-violet-300"
                        : "bg-white/[0.06] text-foreground/50 group-hover:bg-violet-500/20 group-hover:text-violet-300",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-white">
                    {f.label}
                  </h3>
                  <p className="text-sm leading-relaxed text-foreground/55">
                    {f.description}
                  </p>
                  <div
                    className={cn(
                      "mt-4 flex items-center gap-1.5 text-xs font-semibold transition-colors",
                      isHighlighted
                        ? "text-violet-300"
                        : "text-foreground/30 group-hover:text-violet-300",
                    )}
                  >
                    {isHighlighted ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Selected
                      </>
                    ) : (
                      <>
                        Select this format
                        <ArrowRight className="h-3 w-3" />
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Why FanQuin ────────────────────────────────────────── */}
      <section className="py-16">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              {t("advertise.why.title")}
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {whyItems.map((item, i) => {
              const Icon = WHY_ICONS[i % WHY_ICONS.length];
              return (
                <div
                  key={item.title}
                  className="flex gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 transition hover:border-white/[0.14]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-sm font-semibold text-white">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-foreground/55">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Contact Form ───────────────────────────────────────── */}
      <section ref={formRef} className="py-20 scroll-mt-20">
        <div className="container">
          <div className="mx-auto max-w-2xl">
            {/* Form header */}
            <div className="mb-10 text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-fuchsia-300">
                <Megaphone className="h-3.5 w-3.5" />
                {t("advertise.form.title")}
              </div>
              <p className="mt-3 text-base text-foreground/55">
                {t("advertise.form.subtitle")}
              </p>
            </div>

            {/* Success state */}
            {submitted ? (
              <div className="flex flex-col items-center gap-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.08] p-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {t("advertise.form.success_title")}
                  </h3>
                  <p className="mt-2 text-foreground/60">
                    {t("advertise.form.success_body")}
                  </p>
                </div>
                <Button
                  asChild
                  className="rounded-full bg-violet-600 px-8 text-white hover:bg-violet-500"
                >
                  <Link to="/">{t("advertise.form.success_cta")}</Link>
                </Button>
              </div>
            ) : (
              <form
                onSubmit={formik.handleSubmit}
                className="space-y-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8"
                noValidate
              >
                {/* Row: Brand + Contact name */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/60">
                      {t("advertise.form.brand_name")} *
                    </Label>
                    <Input
                      name="brand_name"
                      placeholder={t("advertise.form.brand_name_placeholder")}
                      value={formik.values.brand_name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={cn(
                        "bg-white/[0.04] border-white/10 text-white placeholder:text-foreground/30 focus:border-violet-500/50",
                        formik.touched.brand_name &&
                          formik.errors.brand_name &&
                          "border-rose-500/60",
                      )}
                    />
                    {formik.touched.brand_name && formik.errors.brand_name && (
                      <p className="text-xs text-rose-400">
                        {formik.errors.brand_name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/60">
                      {t("advertise.form.contact_name")} *
                    </Label>
                    <Input
                      name="contact_name"
                      placeholder={t("advertise.form.contact_name_placeholder")}
                      value={formik.values.contact_name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={cn(
                        "bg-white/[0.04] border-white/10 text-white placeholder:text-foreground/30 focus:border-violet-500/50",
                        formik.touched.contact_name &&
                          formik.errors.contact_name &&
                          "border-rose-500/60",
                      )}
                    />
                    {formik.touched.contact_name &&
                      formik.errors.contact_name && (
                        <p className="text-xs text-rose-400">
                          {formik.errors.contact_name}
                        </p>
                      )}
                  </div>
                </div>

                {/* Row: Email + Phone */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/60">
                      {t("advertise.form.contact_email")} *
                    </Label>
                    <Input
                      name="contact_email"
                      type="email"
                      placeholder={t(
                        "advertise.form.contact_email_placeholder",
                      )}
                      value={formik.values.contact_email}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={cn(
                        "bg-white/[0.04] border-white/10 text-white placeholder:text-foreground/30 focus:border-violet-500/50",
                        formik.touched.contact_email &&
                          formik.errors.contact_email &&
                          "border-rose-500/60",
                      )}
                    />
                    {formik.touched.contact_email &&
                      formik.errors.contact_email && (
                        <p className="text-xs text-rose-400">
                          {formik.errors.contact_email}
                        </p>
                      )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/60">
                      {t("advertise.form.contact_phone")}
                    </Label>
                    <Input
                      name="contact_phone"
                      type="tel"
                      placeholder={t(
                        "advertise.form.contact_phone_placeholder",
                      )}
                      value={formik.values.contact_phone}
                      onChange={formik.handleChange}
                      className="bg-white/[0.04] border-white/10 text-white placeholder:text-foreground/30 focus:border-violet-500/50"
                    />
                  </div>
                </div>

                {/* Website */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/60">
                    {t("advertise.form.website_url")}
                  </Label>
                  <Input
                    name="website_url"
                    type="url"
                    placeholder={t("advertise.form.website_url_placeholder")}
                    value={formik.values.website_url}
                    onChange={formik.handleChange}
                    className="bg-white/[0.04] border-white/10 text-white placeholder:text-foreground/30 focus:border-violet-500/50"
                  />
                </div>

                {/* Row: Format + Budget */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/60">
                      {t("advertise.form.ad_format")} *
                    </Label>
                    <Select
                      value={formik.values.ad_format}
                      onValueChange={(v) => {
                        formik.setFieldValue("ad_format", v);
                        setHighlightedFormat(v);
                      }}
                    >
                      <SelectTrigger
                        className={cn(
                          "bg-white/[0.04] border-white/10 text-white focus:border-violet-500/50",
                          formik.touched.ad_format &&
                            formik.errors.ad_format &&
                            "border-rose-500/60",
                        )}
                      >
                        <SelectValue
                          placeholder={t(
                            "advertise.form.ad_format_placeholder",
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0d0d14] border-white/10 text-white">
                        {formats.map((f) => (
                          <SelectItem
                            key={f.key}
                            value={f.key}
                            className="focus:bg-white/10"
                          >
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formik.touched.ad_format && formik.errors.ad_format && (
                      <p className="text-xs text-rose-400">
                        {formik.errors.ad_format}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/60">
                      {t("advertise.form.budget_range")}
                    </Label>
                    <Select
                      value={formik.values.budget_range}
                      onValueChange={(v) =>
                        formik.setFieldValue("budget_range", v)
                      }
                    >
                      <SelectTrigger className="bg-white/[0.04] border-white/10 text-white focus:border-violet-500/50">
                        <SelectValue
                          placeholder={t(
                            "advertise.form.budget_range_placeholder",
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0d0d14] border-white/10 text-white">
                        {budgetRanges.map((r) => (
                          <SelectItem
                            key={r}
                            value={r}
                            className="focus:bg-white/10"
                          >
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Campaign Goal */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/60">
                    {t("advertise.form.campaign_goal")}
                  </Label>
                  <Select
                    value={formik.values.campaign_goal}
                    onValueChange={(v) =>
                      formik.setFieldValue("campaign_goal", v)
                    }
                  >
                    <SelectTrigger className="bg-white/[0.04] border-white/10 text-white focus:border-violet-500/50">
                      <SelectValue
                        placeholder={t(
                          "advertise.form.campaign_goal_placeholder",
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0d0d14] border-white/10 text-white">
                      {campaignGoals.map((g) => (
                        <SelectItem
                          key={g}
                          value={g}
                          className="focus:bg-white/10"
                        >
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/60">
                    {t("advertise.form.message")}
                  </Label>
                  <Textarea
                    name="message"
                    placeholder={t("advertise.form.message_placeholder")}
                    rows={4}
                    value={formik.values.message}
                    onChange={formik.handleChange}
                    className="resize-none bg-white/[0.04] border-white/10 text-white placeholder:text-foreground/30 focus:border-violet-500/50"
                  />
                </div>

                {error && (
                  <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full bg-violet-600 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.4)] transition hover:bg-violet-500 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("advertise.form.submitting")}
                    </>
                  ) : (
                    <>
                      {t("advertise.form.submit")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
