import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import * as Yup from "yup";
import { useFormik } from "formik";
import { PageMeta } from "@/components/fanquin/page-meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  AlertTriangle,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearAuth } from "@/store/slices/authSlice";

type Step = "email" | "otp" | "reason" | "success";

export default function DeactivatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // If the user IS logged in we can prefill the email
  const loggedInEmail = useAppSelector(
    (s) => s.auth.userProfile as { email?: string } | null,
  );

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Step 1: Email ──────────────────────────────────────────────
  const emailFormik = useFormik({
    initialValues: { email: "" },
    validationSchema: Yup.object({
      email: Yup.string()
        .email(t("deactivatePage.stepEmail.invalid"))
        .required(t("deactivatePage.stepEmail.invalid")),
    }),
    onSubmit: async (values, { setSubmitting, setStatus }) => {
      setError("");
      try {
        // Check the account exists
        const { data: checkData } = await axios.get<{
          success: boolean;
          exists: boolean;
        }>("/api/auth/check-email", {
          params: { email: values.email.trim().toLowerCase() },
        });

        if (!checkData.exists) {
          setStatus(t("deactivatePage.stepEmail.notFound"));
          return;
        }

        // Send OTP
        await axios.post("/api/auth/send-code", {
          identifier: values.email.trim().toLowerCase(),
          delivery_method: "email",
        });

        setEmail(values.email.trim().toLowerCase());
        setStep("otp");
      } catch {
        setStatus(t("deactivatePage.error"));
      } finally {
        setSubmitting(false);
      }
    },
  });

  // ── Step 2: OTP ────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError(t("deactivatePage.stepOtp.invalid"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      // We don't call verify-code (that creates a session).
      // Just move to the reason step — the code will be consumed
      // when we call /api/account/deactivate.
      setStep("reason");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Reason + confirm ───────────────────────────────────
  const handleDeactivate = async () => {
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post<{ success: boolean; message?: string }>(
        "/api/account/deactivate",
        {
          identifier: email,
          code: otp,
          reason: reason.trim() || undefined,
        },
      );

      if (!data.success) {
        setError(data.message ?? t("deactivatePage.error"));
        // If code was wrong / expired, send the user back to OTP step
        if (
          data.message?.toLowerCase().includes("code") ||
          data.message?.toLowerCase().includes("c\u00f3digo")
        ) {
          setOtp("");
          setStep("otp");
        }
        return;
      }

      // Clear local auth state if the user happened to be logged in
      dispatch(clearAuth());
      setStep("success");
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? (err.response.data.message as string)
          : t("deactivatePage.error");
      setError(msg);
      // If code expired / wrong, go back to OTP step
      if (
        msg.toLowerCase().includes("code") ||
        msg.toLowerCase().includes("c\u00f3digo")
      ) {
        setOtp("");
        setStep("otp");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <PageMeta
        title={t("deactivatePage.meta.title")}
        description={t("deactivatePage.meta.description")}
        canonicalPath="/deactivate"
        noIndex
      />

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400 mb-3">
            <AlertTriangle className="h-3 w-3" />
            {t("deactivatePage.badge")}
          </span>
          <h1 className="font-display text-2xl font-bold text-white">
            {t("deactivatePage.title")}
          </h1>
          {step !== "success" && (
            <p className="mt-2 text-sm text-foreground/50">
              {t("deactivatePage.subtitle")}
            </p>
          )}
        </div>

        {/* ── Step: email ── */}
        {step === "email" && (
          <form
            onSubmit={emailFormik.handleSubmit}
            className="rounded-[1.4rem] border border-white/10 bg-white/5 p-6 space-y-5"
          >
            <div className="flex items-center gap-2 mb-1">
              <Mail className="h-4 w-4 text-rose-400" />
              <h2 className="font-display text-base font-semibold text-white">
                {t("deactivatePage.stepEmail.label")}
              </h2>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-foreground/80">
                {t("deactivatePage.stepEmail.label")}
              </Label>
              <Input
                type="email"
                name="email"
                autoComplete="email"
                placeholder={t("deactivatePage.stepEmail.placeholder")}
                value={emailFormik.values.email}
                onChange={emailFormik.handleChange}
                onBlur={emailFormik.handleBlur}
                disabled={emailFormik.isSubmitting}
                className="rounded-xl border-white/15 bg-white/5 text-white placeholder:text-foreground/30 focus:border-rose-500/50"
              />
              {emailFormik.touched.email && emailFormik.errors.email && (
                <p className="text-xs text-rose-400">
                  {emailFormik.errors.email}
                </p>
              )}
              {emailFormik.status && (
                <p className="text-xs text-rose-400">{emailFormik.status}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={emailFormik.isSubmitting}
              className="w-full rounded-full bg-rose-500 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-40"
            >
              {emailFormik.isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t("deactivatePage.stepEmail.continue")}
            </Button>
          </form>
        )}

        {/* ── Step: OTP ── */}
        {step === "otp" && (
          <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-4 w-4 text-rose-400" />
              <h2 className="font-display text-base font-semibold text-white">
                {t("deactivatePage.stepOtp.label")}
              </h2>
            </div>

            <p className="text-sm text-foreground/60">
              {t("deactivatePage.stepOtp.sent", { email })}
            </p>

            <div className="flex justify-center py-2">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(val) => {
                  setOtp(val);
                  setError("");
                }}
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="border-white/20 bg-white/5 text-white focus:border-rose-500/60"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {error && (
              <p className="text-xs text-center text-rose-400">{error}</p>
            )}

            <Button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full rounded-full bg-rose-500 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t("deactivatePage.stepOtp.verify")}
            </Button>

            <button
              type="button"
              onClick={() => {
                setStep("email");
                setOtp("");
                setError("");
              }}
              className="flex items-center gap-1.5 text-xs text-foreground/50 hover:text-foreground/80 transition mx-auto"
            >
              <ArrowLeft className="h-3 w-3" />
              {t("deactivatePage.stepOtp.changeEmail")}
            </button>
          </div>
        )}

        {/* ── Step: reason ── */}
        {step === "reason" && (
          <div className="rounded-[1.4rem] border border-rose-500/25 bg-rose-500/5 p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <h2 className="font-display text-base font-semibold text-white">
                {t("deactivatePage.stepReason.title")}
              </h2>
            </div>

            <p className="text-sm text-foreground/60">
              {t("deactivatePage.stepReason.description")}
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs text-foreground/80">
                {t("deactivatePage.stepReason.label")}
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("deactivatePage.stepReason.placeholder")}
                rows={3}
                maxLength={500}
                className="rounded-xl border-white/15 bg-white/5 text-white placeholder:text-foreground/30 focus:border-rose-500/50 resize-none"
              />
            </div>

            {error && <p className="text-xs text-rose-400">{error}</p>}

            <Button
              onClick={handleDeactivate}
              disabled={loading}
              className="w-full rounded-full bg-rose-500 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t("deactivatePage.stepReason.confirm")}
            </Button>

            <button
              type="button"
              onClick={() => setStep("otp")}
              className="flex items-center gap-1.5 text-xs text-foreground/50 hover:text-foreground/80 transition mx-auto"
            >
              <ArrowLeft className="h-3 w-3" />
              {t("deactivatePage.stepReason.back")}
            </button>
          </div>
        )}

        {/* ── Step: success ── */}
        {step === "success" && (
          <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-8 space-y-5 text-center">
            <CheckCircle2 className="h-12 w-12 text-brand mx-auto" />
            <h2 className="font-display text-xl font-bold text-white">
              {t("deactivatePage.success.title")}
            </h2>
            <p className="text-sm text-foreground/60">
              {t("deactivatePage.success.description")}
            </p>
            <Button
              onClick={() => navigate("/")}
              className="rounded-full bg-brand text-sm font-semibold text-slate-950 hover:bg-brand/90"
            >
              {t("deactivatePage.success.cta")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
