import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { useAppSelector } from "@/store/hooks";
import { Button } from "@/components/ui/button";
import { Loader2, Users, CheckCircle2, XCircle } from "lucide-react";
import { OtpAuthModal } from "@/components/fanquin/OtpAuthModal";
import { PageMeta } from "@/components/fanquin/page-meta";

type JoinState =
  | "idle"
  | "joining"
  | "success"
  | "already"
  | "full"
  | "invalid"
  | "error";

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const sessionToken = useAppSelector((s) => s.auth.sessionToken);
  const userProfile = useAppSelector((s) => s.auth.userProfile);

  const [state, setState] = useState<JoinState>("idle");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const joinedRef = useRef(false);

  const doJoin = async (token: string) => {
    if (joinedRef.current) return;
    joinedRef.current = true;
    setState("joining");
    try {
      const { data } = await axios.post<{
        success: boolean;
        data?: { group_id: string; group_name: string };
        message?: string;
      }>(
        "/api/groups/join",
        { invite_code: code },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (data.success && data.data) {
        setGroupId(data.data.group_id);
        setGroupName(data.data.group_name);
        setState("success");
      } else {
        joinedRef.current = false;
        setState("error");
      }
    } catch (err: any) {
      joinedRef.current = false;
      const msg: string = err?.response?.data?.message ?? "";
      if (msg.includes("already")) setState("already");
      else if (msg.includes("full")) setState("full");
      else if (msg.includes("Invalid") || err?.response?.status === 404)
        setState("invalid");
      else setState("error");
      // If already a member, try to figure out the group id from error context
      // We'll still try to fetch the group by invite code to get its id
      if (msg.includes("already")) {
        try {
          const { data: gData } = await axios.get<{
            success: boolean;
            data: { id: string; name: string }[];
          }>("/api/groups", { headers: { Authorization: `Bearer ${token}` } });
          // We can't easily reverse-lookup by invite code from /api/groups list,
          // so just send them to /groups
        } catch {}
      }
    }
  };

  // Auto-join when we have a token
  useEffect(() => {
    if (sessionToken && !joinedRef.current) {
      doJoin(sessionToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken]);

  // After successful auth, token lands in store → effect above fires
  const handleAuthSuccess = () => {
    setAuthOpen(false);
    // the useEffect with sessionToken will kick in
  };

  // ── Render states ────────────────────────────────────────────

  if (state === "joining") {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center">
        <PageMeta
          title={t("seo.join.title")}
          description={t("seo.join.description")}
          noIndex
        />
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-brand" />
          <p className="text-foreground/60">{t("join.joining")}</p>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <PageMeta
          title={t("seo.join.title")}
          description={t("seo.join.description")}
          noIndex
        />
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand">
            {t("nav.myGroups")}
          </p>
          <h1 className="font-display text-2xl font-bold text-white">
            {t("join.success", { name: groupName })}
          </h1>
        </div>
        <Button
          onClick={() => navigate(groupId ? `/groups/${groupId}` : "/groups")}
          className="rounded-full bg-brand px-8 text-slate-950 hover:bg-brand/90"
        >
          {t("join.goToGroup")}
        </Button>
      </div>
    );
  }

  if (state === "already") {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <PageMeta
          title={t("seo.join.title")}
          description={t("seo.join.description")}
          noIndex
        />
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-brand/20 bg-brand/10">
          <Users className="h-10 w-10 text-brand" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            {t("join.alreadyMember")}
          </h1>
        </div>
        <Button
          onClick={() => navigate("/groups")}
          className="rounded-full bg-brand px-8 text-slate-950 hover:bg-brand/90"
        >
          {t("join.goToGroup")}
        </Button>
      </div>
    );
  }

  if (state === "full" || state === "invalid" || state === "error") {
    const msg =
      state === "full"
        ? t("join.full")
        : state === "invalid"
          ? t("join.invalid")
          : t("join.error");
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <PageMeta
          title={t("seo.join.title")}
          description={t("seo.join.description")}
          noIndex
        />
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10">
          <XCircle className="h-10 w-10 text-rose-400" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-white">{msg}</h1>
        </div>
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="rounded-full border border-white/10"
        >
          ← {t("notFound.home")}
        </Button>
      </div>
    );
  }

  // idle + not signed in → prompt auth
  if (!sessionToken) {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <PageMeta
          title={t("seo.join.title")}
          description={t("seo.join.description")}
          noIndex
        />
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-brand/20 bg-brand/10">
          <Users className="h-10 w-10 text-brand" />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand">
            {t("nav.myGroups")}
          </p>
          <h1 className="font-display text-2xl font-bold text-white">
            {t("join.signInTitle")}
          </h1>
          <p className="mt-2 max-w-xs text-sm text-foreground/60">
            {t("join.signInBody")}
          </p>
        </div>
        <Button
          onClick={() => setAuthOpen(true)}
          className="rounded-full bg-brand px-8 text-slate-950 shadow-glow hover:bg-brand/90"
        >
          {t("join.signIn")}
        </Button>

        <OtpAuthModal
          open={authOpen}
          onOpenChange={setAuthOpen}
          onSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  // idle + signed in → auto-join is running (shouldn't reach here normally)
  return (
    <div className="container flex min-h-[60vh] items-center justify-center">
      <PageMeta
        title={t("seo.join.title")}
        description={t("seo.join.description")}
        noIndex
      />
      <Loader2 className="h-10 w-10 animate-spin text-brand" />
    </div>
  );
}
