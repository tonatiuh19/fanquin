import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Loader2,
  Mail,
  ShieldCheck,
  ArrowLeft,
  UserRound,
  Check,
  X,
} from "lucide-react";
import axios from "axios";
import PhoneInput, {
  getCountries,
  isValidPhoneNumber,
} from "react-phone-number-input";
import type { Country as CountryCode } from "react-phone-number-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppDispatch } from "@/store/hooks";
import { setAuth } from "@/store/slices/authSlice";
import { setSessionToken } from "@/store/slices/groupWizardSlice";

const _regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const COUNTRIES = getCountries()
  .map((code) => ({ code, name: _regionNames.of(code) ?? code }))
  .sort((a, b) => a.name.localeCompare(b.name));

interface OtpAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// email → check → if new: profile → send OTP → otp verify
//                 if existing:          send OTP → otp verify
type Screen = "email" | "profile" | "otp";

export function OtpAuthModal({
  open,
  onOpenChange,
  onSuccess,
}: OtpAuthModalProps) {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();

  const [screen, setScreen] = useState<Screen>("email");
  const [isNewUser, setIsNewUser] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Debounced username availability check
  useEffect(() => {
    if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);
    const raw = username.trim().toLowerCase();
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
  }, [username]);
  const [phone, setPhone] = useState<string>("");
  const [country, setCountry] = useState<CountryCode>("US");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setScreen("email");
    setIsNewUser(false);
    setEmail("");
    setFirstName("");
    setLastName("");
    setUsername("");
    setUsernameStatus("idle");
    setPhone("");
    setCountry("US");
    setOtp("");
    setError(null);
    setLoading(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  // Step 1: email submitted → check if user exists
  const handleCheckEmail = async () => {
    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmed || !emailRegex.test(trimmed)) {
      setError(t("auth.emailInvalid"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { data } = await axios.get<{ success: boolean; exists: boolean }>(
        `/api/auth/check-email?email=${encodeURIComponent(trimmed)}`,
      );
      if (data.exists) {
        // Existing user — send OTP straight away
        setIsNewUser(false);
        await sendOtp(trimmed);
      } else {
        // New user — collect profile info first
        setIsNewUser(true);
        setScreen("profile");
      }
    } catch {
      setError(t("auth.sendCodeError"));
    } finally {
      setLoading(false);
    }
  };

  // Step 2 (new user): profile submitted → send OTP
  const handleProfileContinue = async () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !phone ||
      !isValidPhoneNumber(phone) ||
      !country ||
      !username.trim() ||
      usernameStatus !== "available"
    ) {
      setError(t("auth.profileRequired"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await sendOtp(email.trim().toLowerCase());
    } finally {
      setLoading(false);
    }
  };

  // Internal helper — sends OTP and moves to otp screen
  const sendOtp = async (normalizedEmail: string) => {
    await axios.post("/api/auth/send-code", {
      identifier: normalizedEmail,
      delivery_method: "email",
    });
    setScreen("otp");
  };

  // Step 3: verify OTP — pass profile fields if new user
  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      setError(t("auth.otpInvalid"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { data } = await axios.post<{
        success: boolean;
        sessionToken: string;
        user: import("@shared/api").UserProfile;
      }>("/api/auth/verify-code", {
        identifier: email.trim().toLowerCase(),
        code: otp,
        locale: i18n.language,
        ...(isNewUser && {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: username.trim().toLowerCase(),
          phone,
          country,
        }),
      });
      if (!data.success || !data.sessionToken) {
        setError(t("auth.otpWrong"));
        return;
      }
      dispatch(
        setAuth({ sessionToken: data.sessionToken, userProfile: data.user }),
      );
      dispatch(setSessionToken(data.sessionToken));
      handleOpenChange(false);
      onSuccess();
    } catch {
      setError(t("auth.otpWrong"));
    } finally {
      setLoading(false);
    }
  };

  const icons: Record<Screen, React.ReactNode> = {
    email: <Mail className="h-5 w-5 text-brand" />,
    profile: <UserRound className="h-5 w-5 text-brand" />,
    otp: <ShieldCheck className="h-5 w-5 text-brand" />,
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="glass-panel border-white/10 bg-[hsl(var(--surface))] p-0 sm:max-w-sm">
        <div className="max-h-[90dvh] overflow-y-auto p-8">
          <DialogHeader className="space-y-2 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-brand/30 bg-brand/15">
              {icons[screen]}
            </div>
            <DialogTitle className="font-display text-xl font-semibold text-white">
              {t(`auth.${screen}Title`)}
            </DialogTitle>
            <DialogDescription className="text-sm text-foreground/60">
              {screen === "email" && t("auth.emailSubtitle")}
              {screen === "profile" && t("auth.profileSubtitle")}
              {screen === "otp" && t("auth.otpSubtitle", { email })}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* ── Email screen ── */}
            {screen === "email" && (
              <>
                <div className="space-y-2">
                  <Label
                    htmlFor="auth-email"
                    className="text-sm text-foreground/80"
                  >
                    {t("auth.emailLabel")}
                  </Label>
                  <Input
                    id="auth-email"
                    type="email"
                    placeholder={t("auth.emailPlaceholder")}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleCheckEmail()}
                    disabled={loading}
                    className="rounded-xl border-white/15 bg-white/5 text-white placeholder:text-foreground/30 focus:border-brand/50"
                  />
                </div>
                {error && <p className="text-xs text-rose-400">{error}</p>}
                <Button
                  onClick={handleCheckEmail}
                  disabled={loading || !email.trim()}
                  className="w-full rounded-full bg-brand text-[hsl(var(--primary-foreground))] hover:bg-brand/90 disabled:opacity-40"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("auth.continue")}
                </Button>
                <p className="text-center text-xs text-foreground/35">
                  Al continuar, aceptas nuestros{" "}
                  <Link
                    to="/terms"
                    className="underline underline-offset-2 hover:text-foreground/70 transition"
                    onClick={() => onOpenChange(false)}
                  >
                    Términos y Condiciones
                  </Link>{" "}
                  y el{" "}
                  <Link
                    to="/privacy"
                    className="underline underline-offset-2 hover:text-foreground/70 transition"
                    onClick={() => onOpenChange(false)}
                  >
                    Aviso de Privacidad
                  </Link>
                  .
                </p>
              </>
            )}

            {/* ── Profile screen (new users only) ── */}
            {screen === "profile" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground/80">
                      {t("auth.firstName")}{" "}
                      <span className="text-rose-400">*</span>
                    </Label>
                    <Input
                      placeholder={t("auth.firstNamePlaceholder")}
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        setError(null);
                      }}
                      disabled={loading}
                      className="rounded-xl border-white/15 bg-white/5 text-white placeholder:text-foreground/30 focus:border-brand/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground/80">
                      {t("auth.lastName")}{" "}
                      <span className="text-rose-400">*</span>
                    </Label>
                    <Input
                      placeholder={t("auth.lastNamePlaceholder")}
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        setError(null);
                      }}
                      disabled={loading}
                      className="rounded-xl border-white/15 bg-white/5 text-white placeholder:text-foreground/30 focus:border-brand/50"
                    />
                  </div>
                </div>

                {/* Username field */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground/80">
                    {t("auth.username")}{" "}
                    <span className="text-rose-400">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder={t("auth.usernamePlaceholder")}
                      value={username}
                      onChange={(e) => {
                        setUsername(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9_]/g, ""),
                        );
                        setError(null);
                      }}
                      disabled={loading}
                      maxLength={30}
                      className="rounded-xl border-white/15 bg-white/5 pr-8 text-white placeholder:text-foreground/30 focus:border-brand/50"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameStatus === "checking" && (
                        <Loader2 className="h-4 w-4 animate-spin text-foreground/40" />
                      )}
                      {usernameStatus === "available" && (
                        <Check className="h-4 w-4 text-brand" />
                      )}
                      {(usernameStatus === "taken" ||
                        usernameStatus === "invalid") && (
                        <X className="h-4 w-4 text-rose-400" />
                      )}
                    </span>
                  </div>
                  <p
                    className={`text-xs ${
                      usernameStatus === "available"
                        ? "text-brand"
                        : usernameStatus === "taken"
                          ? "text-rose-400"
                          : usernameStatus === "invalid"
                            ? "text-rose-400"
                            : "text-foreground/40"
                    }`}
                  >
                    {usernameStatus === "available" &&
                      t("auth.usernameAvailable")}
                    {usernameStatus === "taken" && t("auth.usernameTaken")}
                    {usernameStatus === "checking" &&
                      t("auth.usernameChecking")}
                    {(usernameStatus === "idle" ||
                      usernameStatus === "invalid") &&
                      t("auth.usernameHint")}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground/80">
                    {t("auth.phone")} <span className="text-rose-400">*</span>
                  </Label>
                  <div className="phone-input-dark">
                    <PhoneInput
                      international
                      withCountryCallingCode
                      addInternationalOption={false}
                      defaultCountry={country}
                      value={phone}
                      onChange={(val) => {
                        setPhone(val ?? "");
                        setError(null);
                      }}
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground/80">
                    {t("auth.country")} <span className="text-rose-400">*</span>
                  </Label>
                  <Select
                    value={country}
                    onValueChange={(val) => {
                      setCountry(val as CountryCode);
                      setError(null);
                    }}
                    disabled={loading}
                  >
                    <SelectTrigger className="rounded-xl border-white/15 bg-white/5 text-white placeholder:text-foreground/30 focus:border-brand/50">
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
                {error && <p className="text-xs text-rose-400">{error}</p>}
                <Button
                  onClick={handleProfileContinue}
                  disabled={
                    loading ||
                    !firstName.trim() ||
                    !lastName.trim() ||
                    !phone ||
                    !isValidPhoneNumber(phone) ||
                    !country ||
                    usernameStatus !== "available"
                  }
                  className="w-full rounded-full bg-brand text-[hsl(var(--primary-foreground))] hover:bg-brand/90 disabled:opacity-40"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("auth.sendCode")}
                </Button>
                <button
                  onClick={() => {
                    setScreen("email");
                    setError(null);
                  }}
                  className="flex w-full items-center justify-center gap-1.5 text-xs text-foreground/50 transition hover:text-foreground/70"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t("auth.changeEmail")}
                </button>
              </>
            )}

            {/* ── OTP screen ── */}
            {screen === "otp" && (
              <>
                <div className="space-y-3">
                  <Label className="text-sm text-foreground/80">
                    {t("auth.otpLabel")}
                  </Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(val) => {
                        setOtp(val);
                        setError(null);
                      }}
                      disabled={loading}
                    >
                      <InputOTPGroup className="gap-2">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot
                            key={i}
                            index={i}
                            className="h-11 w-11 rounded-xl border-white/15 bg-white/5 text-white text-lg font-bold"
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>
                {error && (
                  <p className="text-center text-xs text-rose-400">{error}</p>
                )}
                <Button
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length < 6}
                  className="w-full rounded-full bg-brand text-[hsl(var(--primary-foreground))] hover:bg-brand/90 disabled:opacity-40"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("auth.verify")}
                </Button>
                <button
                  onClick={() => {
                    setScreen(isNewUser ? "profile" : "email");
                    setOtp("");
                    setError(null);
                  }}
                  className="flex w-full items-center justify-center gap-1.5 text-xs text-foreground/50 transition hover:text-foreground/70"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t("auth.back")}
                </button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
