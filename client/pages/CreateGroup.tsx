import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageMeta } from "@/components/fanquin/page-meta";
import {
  Check,
  ChevronRight,
  Copy,
  Crown,
  Flame,
  Link2,
  Loader2,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setStep,
  setMode,
  setName,
  setCompetitionId,
  setDraftType,
  setMaxMembers,
  resetWizard,
  clearError,
  fetchCompetitions,
  createGroup,
} from "@/store/slices/groupWizardSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { OtpAuthModal } from "@/components/fanquin/OtpAuthModal";
import type { GroupMode } from "@shared/api";

// ── Helpers ───────────────────────────────────────────────────────

const STEPS = [1, 2, 3, 4];

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? -60 : 60,
    opacity: 0,
  }),
};

// ── Mode options ──────────────────────────────────────────────────

interface ModeOption {
  key: GroupMode;
  icon: React.ReactNode;
  color: string;
  audience: string;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    key: "casual",
    icon: <Sparkles className="h-5 w-5" />,
    color: "text-amber-400",
    audience: "2 – 5 players",
  },
  {
    key: "friends",
    icon: <Flame className="h-5 w-5" />,
    color: "text-brand",
    audience: "6 – 12 players",
  },
  {
    key: "league",
    icon: <Trophy className="h-5 w-5" />,
    color: "text-violet-400",
    audience: "13 – 100 players",
  },
  {
    key: "competitive",
    icon: <Crown className="h-5 w-5" />,
    color: "text-rose-400",
    audience: "Any size",
  },
];

const DRAFT_OPTIONS = [
  {
    key: "snake" as const,
    label: "Snake draft",
    description: "Takes turns picking in reverse order every round",
  },
  {
    key: "random" as const,
    label: "Random draw",
    description: "Teams are randomly assigned at kick-off",
  },
  {
    key: "balanced_tier" as const,
    label: "Balanced tiers",
    description: "Equal distribution of top, mid, and underdog teams",
  },
];

// ── Step indicator ────────────────────────────────────────────────

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s) => (
        <div
          key={s}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            s === current
              ? "w-6 bg-brand"
              : s < current
                ? "w-3 bg-brand/40"
                : "w-3 bg-white/15",
          )}
        />
      ))}
    </div>
  );
}

// ── Step 1: Choose mode ───────────────────────────────────────────

function StepMode() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selected = useAppSelector((s) => s.groupWizard.mode);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">
          {t("createGroup.step1.title")}
        </h2>
        <p className="mt-1 text-sm text-foreground/[0.6]">
          {t("createGroup.step1.subtitle")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {MODE_OPTIONS.map((opt) => {
          const isSelected = selected === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => dispatch(setMode(opt.key))}
              className={cn(
                "group relative flex flex-col gap-3 rounded-[1.4rem] border p-5 text-left transition-all duration-200",
                isSelected
                  ? "border-brand/50 bg-brand/10 shadow-[0_0_0_1px_hsl(var(--brand)/0.3)]"
                  : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-2xl border",
                    isSelected
                      ? "border-brand/30 bg-brand/15 text-brand"
                      : "border-white/10 bg-white/8",
                    opt.color,
                  )}
                >
                  {opt.icon}
                </span>
                {isSelected && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand">
                    <Check className="h-3 w-3 text-[hsl(var(--primary-foreground))]" />
                  </span>
                )}
              </div>
              <div>
                <p className="font-semibold text-white capitalize">
                  {t(`createGroup.modes.${opt.key}.title`)}
                </p>
                <p className="mt-0.5 text-xs text-foreground/[0.5]">
                  {opt.audience}
                </p>
                <p className="mt-2 text-sm text-foreground/[0.65]">
                  {t(`createGroup.modes.${opt.key}.description`)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 2: Configure group ───────────────────────────────────────

interface StepConfigProps {
  onValid: () => void;
  submitRef: React.MutableRefObject<(() => void) | null>;
}

function StepConfig({ onValid, submitRef }: StepConfigProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const {
    name,
    competitionId,
    draftType,
    maxMembers,
    competitions,
    competitionsLoading,
  } = useAppSelector((s) => s.groupWizard);

  const validationSchema = Yup.object({
    name: Yup.string()
      .trim()
      .min(3, t("createGroup.step2.nameMin"))
      .max(60, t("createGroup.step2.nameMax"))
      .required(t("createGroup.step2.nameRequired")),
    competitionId: Yup.string().required(
      t("createGroup.step2.competitionRequired"),
    ),
  });

  const formik = useFormik({
    initialValues: { name, competitionId },
    validationSchema,
    enableReinitialize: true,
    onSubmit: (values) => {
      dispatch(setName(values.name.trim()));
      dispatch(setCompetitionId(values.competitionId));
      onValid();
    },
  });

  // Expose submit handler to parent via ref
  submitRef.current = formik.submitForm;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">
          {t("createGroup.step2.title")}
        </h2>
        <p className="mt-1 text-sm text-foreground/[0.6]">
          {t("createGroup.step2.subtitle")}
        </p>
      </div>

      <form onSubmit={formik.handleSubmit} className="space-y-5">
        {/* Group name */}
        <div className="space-y-2">
          <Label htmlFor="group-name" className="text-sm text-foreground/80">
            {t("createGroup.step2.nameLabel")}
          </Label>
          <Input
            id="group-name"
            name="name"
            placeholder={t("createGroup.step2.namePlaceholder")}
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className="rounded-xl border-white/15 bg-white/5 text-white placeholder:text-foreground/30 focus:border-brand/50"
          />
          {formik.touched.name && formik.errors.name && (
            <p className="text-xs text-rose-400">{formik.errors.name}</p>
          )}
        </div>

        {/* Competition */}
        <div className="space-y-2">
          <Label className="text-sm text-foreground/80">
            {t("createGroup.step2.competitionLabel")}
          </Label>
          {competitionsLoading ? (
            <div className="flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-foreground/50">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("createGroup.step2.loadingCompetitions")}
            </div>
          ) : (
            <div className="grid gap-2">
              {competitions.map((comp) => (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => {
                    formik.setFieldValue("competitionId", comp.id);
                    dispatch(setCompetitionId(comp.id));
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all",
                    formik.values.competitionId === comp.id
                      ? "border-brand/40 bg-brand/10 text-white"
                      : "border-white/10 bg-white/5 text-foreground/70 hover:border-white/20",
                  )}
                >
                  <div>
                    <p className="font-semibold">{comp.name}</p>
                    <p className="text-xs text-foreground/50">{comp.season}</p>
                  </div>
                  {formik.values.competitionId === comp.id && (
                    <Check className="h-4 w-4 text-brand" />
                  )}
                </button>
              ))}
              {competitions.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground/50">
                  {t("createGroup.step2.noCompetitions")}
                </div>
              )}
            </div>
          )}
          {formik.touched.competitionId && formik.errors.competitionId && (
            <p className="text-xs text-rose-400">
              {formik.errors.competitionId}
            </p>
          )}
        </div>

        {/* Draft type */}
        <div className="space-y-2">
          <Label className="text-sm text-foreground/80">
            {t("createGroup.step2.draftLabel")}
          </Label>
          <div className="grid gap-2">
            {DRAFT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => dispatch(setDraftType(opt.key))}
                className={cn(
                  "flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                  draftType === opt.key
                    ? "border-brand/40 bg-brand/10"
                    : "border-white/10 bg-white/5 hover:border-white/20",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                    draftType === opt.key
                      ? "border-brand bg-brand"
                      : "border-white/30",
                  )}
                >
                  {draftType === opt.key && (
                    <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary-foreground))]" />
                  )}
                </div>
                <div>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      draftType === opt.key
                        ? "text-white"
                        : "text-foreground/80",
                    )}
                  >
                    {opt.label}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground/50">
                    {opt.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Max members */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-foreground/80">
              {t("createGroup.step2.maxMembersLabel")}
            </Label>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-xs font-semibold text-white">
              {maxMembers}
            </span>
          </div>
          <input
            type="range"
            min={4}
            max={100}
            step={1}
            value={maxMembers}
            onChange={(e) => dispatch(setMaxMembers(Number(e.target.value)))}
            className="w-full accent-brand"
          />
          <div className="flex justify-between text-[10px] text-foreground/40">
            <span>4</span>
            <span>100</span>
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Step 3: Review + create ───────────────────────────────────────

function StepReview() {
  const { t } = useTranslation();
  const {
    mode,
    name,
    competitionId,
    draftType,
    maxMembers,
    competitions,
    error,
  } = useAppSelector((s) => s.groupWizard);
  const dispatch = useAppDispatch();

  const competition = competitions.find((c) => c.id === competitionId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">
          {t("createGroup.step3.title")}
        </h2>
        <p className="mt-1 text-sm text-foreground/[0.6]">
          {t("createGroup.step3.subtitle")}
        </p>
      </div>

      <div className="space-y-3 rounded-[1.4rem] border border-white/10 bg-white/5 p-5">
        <ReviewRow label={t("createGroup.step3.nameLabel")} value={name} />
        <ReviewRow
          label={t("createGroup.step3.modeLabel")}
          value={
            <span className="capitalize">
              {t(`createGroup.modes.${mode}.title`)}
            </span>
          }
        />
        <ReviewRow
          label={t("createGroup.step3.competitionLabel")}
          value={competition?.name ?? "—"}
        />
        <ReviewRow
          label={t("createGroup.step3.draftLabel")}
          value={
            DRAFT_OPTIONS.find((d) => d.key === draftType)?.label ?? draftType
          }
        />
        <ReviewRow
          label={t("createGroup.step3.maxMembersLabel")}
          value={`${maxMembers} ${t("createGroup.step3.members")}`}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
          <button
            className="ml-2 underline underline-offset-2"
            onClick={() => dispatch(clearError())}
          >
            dismiss
          </button>
        </div>
      )}
    </div>
  );
}

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-sm text-foreground/50">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

// ── Step 4: Done ─────────────────────────────────────────────────

function StepDone() {
  const { t } = useTranslation();
  const { createdGroup } = useAppSelector((s) => s.groupWizard);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const inviteLink = createdGroup
    ? `${window.location.origin}/join/${createdGroup.invite_code}`
    : "";

  const handleCopy = () => {
    if (inviteLink) navigator.clipboard.writeText(inviteLink);
  };

  const handleDone = () => {
    const groupId = createdGroup?.id;
    dispatch(resetWizard());
    navigate(groupId ? `/groups/${groupId}` : "/groups");
  };

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-brand/30 bg-brand/15">
        <Zap className="h-9 w-9 text-brand" />
      </div>

      <div>
        <h2 className="font-display text-2xl font-semibold text-white">
          {t("createGroup.step4.title")}
        </h2>
        <p className="mt-2 text-sm text-foreground/[0.6]">
          {t("createGroup.step4.subtitle", { name: createdGroup?.name })}
        </p>
      </div>

      {createdGroup && (
        <div className="space-y-3">
          {/* Invite link */}
          <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <Link2 className="h-4 w-4 text-brand" />
              {t("createGroup.step4.inviteLinkTitle")}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <code className="flex-1 truncate text-xs text-foreground/70">
                {inviteLink}
              </code>
              <button
                onClick={handleCopy}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-foreground/60 transition hover:bg-white/10 hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Invite code */}
          <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
            <p className="mb-2 text-xs text-foreground/50">
              {t("createGroup.step4.inviteCodeLabel")}
            </p>
            <p className="font-display text-3xl font-bold tracking-[0.25em] text-brand">
              {createdGroup.invite_code.toUpperCase()}
            </p>
          </div>

          {/* Member count */}
          <div className="flex items-center justify-center gap-2 text-sm text-foreground/50">
            <Users className="h-4 w-4" />
            <span>
              {t("createGroup.step4.membersNote", {
                max: createdGroup.max_members,
              })}
            </span>
          </div>
        </div>
      )}

      <Button
        onClick={handleDone}
        className="mx-auto flex items-center gap-2 rounded-full bg-brand px-8 text-[hsl(var(--primary-foreground))] hover:bg-brand/90"
      >
        {t("createGroup.step4.cta")}
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────

export default function CreateGroup() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { step, mode, name, competitionId, submitting, sessionToken } =
    useAppSelector((s) => s.groupWizard);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Tracks animation direction
  const prevStep = useRef(step);
  const dir = step >= prevStep.current ? 1 : -1;
  prevStep.current = step;

  // Ref to trigger Formik submit from step 2 externally
  const step2SubmitRef = useRef<(() => void) | null>(null);

  // Load competitions on mount and pre-select mode from ?mode= query param
  useEffect(() => {
    dispatch(fetchCompetitions());
    const modeParam = searchParams.get("mode") as
      | import("@shared/api").GroupMode
      | null;
    const validModes = ["casual", "friends", "league", "competitive", "global"];
    if (modeParam && validModes.includes(modeParam)) {
      dispatch(setMode(modeParam));
      dispatch(setStep(1));
    }
  }, [dispatch, searchParams]);

  const canAdvance = () => {
    if (step === 1) return mode !== null;
    if (step === 2) return true; // Formik validates on submit
    if (step === 3) return true;
    return false;
  };

  const doCreateGroup = () => {
    dispatch(
      createGroup({
        name,
        competition_id: competitionId,
        mode: mode!,
        draft_type: "snake",
        max_members: 20,
      }),
    );
  };

  const handleNext = () => {
    if (step === 2) {
      // Trigger Formik validation + submit
      step2SubmitRef.current?.();
      return;
    }
    if (step === 3) {
      const token = sessionToken ?? localStorage.getItem("fanquin_session");
      if (!token) {
        setShowAuthModal(true);
        return;
      }
      doCreateGroup();
      return;
    }
    dispatch(setStep(step + 1));
  };

  const handleBack = () => {
    if (step === 1) {
      navigate(-1);
    } else {
      dispatch(setStep(step - 1));
    }
  };

  return (
    <section className="container py-8 md:py-12">
      <PageMeta
        title={t("seo.createGroup.title")}
        description={t("seo.createGroup.description")}
        canonicalPath="/groups/new"
      />
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm text-foreground/50 transition hover:text-white"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            {step === 1 ? t("createGroup.back") : t("createGroup.backStep")}
          </button>
          <StepDots current={step} />
          <span className="text-xs text-foreground/40">
            {t("createGroup.stepOf", { current: step, total: 4 })}
          </span>
        </div>

        {/* Step panel */}
        <div className="glass-panel overflow-hidden rounded-[2rem] p-6 md:p-8">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              {step === 1 && <StepMode />}
              {step === 2 && (
                <StepConfig
                  submitRef={step2SubmitRef}
                  onValid={() => dispatch(setStep(3))}
                />
              )}
              {step === 3 && <StepReview />}
              {step === 4 && <StepDone />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer actions */}
        {step < 4 && (
          <div className="mt-5 flex justify-end">
            <Button
              onClick={handleNext}
              disabled={!canAdvance() || submitting}
              className="flex items-center gap-2 rounded-full bg-brand px-6 text-[hsl(var(--primary-foreground))] hover:bg-brand/90 disabled:opacity-40"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {step === 3
                ? t("createGroup.createButton")
                : t("createGroup.nextButton")}
              {!submitting && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>
      <OtpAuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSuccess={doCreateGroup}
      />
    </section>
  );
}
