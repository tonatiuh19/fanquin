import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  adminSendCode,
  adminVerifyCode,
  adminResetLoginStep,
} from "@/store/slices/adminSlice";
import { Mail, ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { FanQuinLogo } from "@/components/fanquin/logo";

export default function AdminLogin() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, loginStep, loginEmail, loginLoading, loginError } =
    useAppSelector((s) => s.admin);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (isAuthenticated) navigate("/admin", { replace: true });
  }, [isAuthenticated, navigate]);

  // Reset step on unmount
  useEffect(
    () => () => {
      dispatch(adminResetLoginStep());
    },
    [dispatch],
  );

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    dispatch(adminSendCode(trimmed));
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;
    const result = await dispatch(
      adminVerifyCode({ email: loginEmail, code: otp }),
    );
    if (adminVerifyCode.fulfilled.match(result)) {
      navigate("/admin", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-violet-600/8 blur-[120px] rounded-full" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <FanQuinLogo />
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-8 space-y-6 shadow-2xl shadow-black/40">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-2xl border border-violet-500/30 bg-violet-500/10 flex items-center justify-center">
              {loginStep === "email" ? (
                <Mail className="h-5 w-5 text-violet-400" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-violet-400" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">
                {loginStep === "email" ? "Admin Access" : "Verify identity"}
              </h1>
              <p className="text-sm text-white/40 mt-0.5">
                {loginStep === "email"
                  ? "Sign in with your admin email"
                  : `Code sent to ${loginEmail}`}
              </p>
            </div>
          </div>

          {/* Email step */}
          {loginStep === "email" && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <Label className="text-white/50 text-xs mb-1.5 block">
                  Email address
                </Label>
                <Input
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-violet-500/50"
                />
              </div>
              {loginError && (
                <p className="text-xs text-red-400 text-center">{loginError}</p>
              )}
              <Button
                type="submit"
                disabled={loginLoading || !email.trim()}
                className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl"
              >
                {loginLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Send code"
                )}
              </Button>
            </form>
          )}

          {/* OTP step */}
          {loginStep === "otp" && (
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup className="gap-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="w-10 h-12 rounded-xl bg-white/5 border-white/10 text-white text-lg font-mono focus:border-violet-500/60"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {loginError && (
                <p className="text-xs text-red-400 text-center">{loginError}</p>
              )}
              <Button
                type="submit"
                disabled={loginLoading || otp.length < 6}
                className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl"
              >
                {loginLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Verify"
                )}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setOtp("");
                  dispatch(adminResetLoginStep());
                }}
                className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition mx-auto"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-white/15 mt-6">
          FanQuin Back Office — restricted access
        </p>
      </div>
    </div>
  );
}
