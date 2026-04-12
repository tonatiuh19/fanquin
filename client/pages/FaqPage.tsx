import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Loader2,
  Lock,
  MessageSquare,
  Search,
  Send,
  ShieldCheck,
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
  submitSupportCase,
  resetSupportForm,
} from "@/store/slices/supportSlice";
import type { SupportCaseCategory } from "@shared/api";

// ── Section icon map ──────────────────────────────────────────────
const SECTION_ICONS: Record<string, React.ElementType> = {
  howItWorks: HelpCircle,
  scoring: ShieldCheck,
  teams: ArrowRight,
  groups: MessageSquare,
  account: Lock,
};

export default function FaqPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const sessionToken = useAppSelector((s) => s.auth.sessionToken);
  const { submitting, submitted, error } = useAppSelector((s) => s.support);

  const [searchQuery, setSearchQuery] = useState("");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Support form state
  const [category, setCategory] = useState<SupportCaseCategory | "">("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const sections = t("faq.sections", { returnObjects: true }) as Array<{
    key: string;
    label: string;
    items: Array<{ q: string; a: string }>;
  }>;

  const categoryKeys = Object.keys(
    t("faq.support.categories", { returnObjects: true }) as Record<
      string,
      string
    >,
  ) as SupportCaseCategory[];

  // Filtered sections based on search
  const filteredSections = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return sections;
    return sections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter(
          (item) =>
            item.q.toLowerCase().includes(q) ||
            item.a.toLowerCase().includes(q),
        ),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [sections, searchQuery]);

  const toggleItem = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    setFormError(null);
    if (!category) {
      setFormError(t("faq.support.categoryPlaceholder"));
      return;
    }
    if (subject.trim().length < 3) {
      setFormError(t("faq.support.subjectMin"));
      return;
    }
    if (message.trim().length < 10) {
      setFormError(t("faq.support.messageMin"));
      return;
    }
    dispatch(
      submitSupportCase({
        category: category as SupportCaseCategory,
        subject: subject.trim(),
        message: message.trim(),
      }),
    );
  };

  const handleReset = () => {
    dispatch(resetSupportForm());
    setCategory("");
    setSubject("");
    setMessage("");
    setFormError(null);
  };

  // Expand all matched items when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const allKeys = filteredSections.flatMap((sec) =>
        sec.items.map((item) => `${sec.key}-${item.q}`),
      );
      setOpenItems(new Set(allKeys));
    }
  }, [searchQuery, filteredSections]);

  return (
    <>
      <PageMeta
        title={t("faq.seo.title")}
        description={t("faq.seo.description")}
      />

      <div className="container py-8 md:py-12">
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="glass-panel relative overflow-hidden rounded-[2rem] px-6 py-10 md:px-10 md:py-14 mb-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-brand/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-brandAlt/10 blur-3xl" />
          </div>
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="section-label w-fit">{t("faq.badge")}</span>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-white md:text-5xl">
              {t("faq.title")}
            </h1>
            <p className="text-base leading-7 text-foreground/[0.68] md:text-lg">
              {t("faq.subtitle")}
            </p>
            {/* Search */}
            <div className="relative mt-2 max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("faq.searchPlaceholder")}
                className="rounded-2xl border-white/15 bg-white/5 pl-10 text-white placeholder:text-foreground/30 focus:border-brand/50 focus-visible:ring-0"
              />
            </div>
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[220px_1fr_380px] xl:items-start">
          {/* ── Sidebar nav ───────────────────────────────────── */}
          <nav className="hidden xl:flex xl:flex-col xl:gap-1 xl:sticky xl:top-6">
            {sections.map((sec) => {
              const Icon = SECTION_ICONS[sec.key] ?? HelpCircle;
              return (
                <button
                  key={sec.key}
                  onClick={() => {
                    setActiveSection(sec.key);
                    document
                      .getElementById(`faq-section-${sec.key}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition",
                    activeSection === sec.key
                      ? "bg-white/8 text-white font-medium"
                      : "text-foreground/50 hover:bg-white/5 hover:text-foreground/80",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {sec.label}
                </button>
              );
            })}
            {/* Support link */}
            <button
              onClick={() =>
                document
                  .getElementById("support-form")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="mt-3 flex items-center gap-2.5 rounded-xl border border-brand/20 bg-brand/8 px-3 py-2.5 text-left text-sm font-medium text-brand transition hover:bg-brand/15"
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              {t("faq.support.title")}
            </button>
          </nav>

          {/* ── FAQ accordion ─────────────────────────────────── */}
          <div className="space-y-6 min-w-0">
            {filteredSections.length === 0 && (
              <p className="py-10 text-center text-sm text-foreground/40">
                {t("faq.noResults")}
              </p>
            )}

            {filteredSections.map((sec) => {
              const Icon = SECTION_ICONS[sec.key] ?? HelpCircle;
              return (
                <section
                  key={sec.key}
                  id={`faq-section-${sec.key}`}
                  className="scroll-mt-6"
                >
                  <div className="mb-3 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h2 className="text-base font-semibold text-white">
                      {sec.label}
                    </h2>
                  </div>

                  <div className="space-y-2">
                    {sec.items.map((item) => {
                      const itemKey = `${sec.key}-${item.q}`;
                      const isOpen = openItems.has(itemKey);
                      return (
                        <div
                          key={itemKey}
                          className={cn(
                            "rounded-2xl border transition-colors duration-200",
                            isOpen
                              ? "border-brand/20 bg-white/[0.06]"
                              : "border-white/10 bg-white/[0.03] hover:border-white/20",
                          )}
                        >
                          <button
                            onClick={() => toggleItem(itemKey)}
                            className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
                          >
                            <span
                              className={cn(
                                "text-sm font-medium leading-6 transition-colors",
                                isOpen ? "text-white" : "text-foreground/80",
                              )}
                            >
                              {item.q}
                            </span>
                            <ChevronDown
                              className={cn(
                                "mt-0.5 h-4 w-4 shrink-0 text-foreground/40 transition-transform duration-300",
                                isOpen && "rotate-180 text-brand",
                              )}
                            />
                          </button>
                          <div
                            className={cn(
                              "overflow-hidden transition-all duration-300",
                              isOpen ? "max-h-96" : "max-h-0",
                            )}
                          >
                            <p className="px-5 pb-5 text-sm leading-7 text-foreground/[0.68]">
                              {item.a}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          {/* ── Support case form ──────────────────────────────── */}
          <div
            id="support-form"
            className="scroll-mt-6 xl:sticky xl:top-6 space-y-4"
          >
            <div className="glass-panel rounded-[1.8rem] p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand/20 bg-brand/10">
                  <MessageSquare className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {t("faq.support.title")}
                  </p>
                  <p className="text-xs text-foreground/50">
                    {t("faq.support.subtitle")}
                  </p>
                </div>
              </div>

              {/* Guest state */}
              {!sessionToken ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-6 text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-foreground/30">
                      <Lock className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-white">
                      {t("faq.support.guestTitle")}
                    </p>
                    <p className="text-xs leading-5 text-foreground/50">
                      {t("faq.support.guestSubtitle")}
                    </p>
                  </div>
                </div>
              ) : submitted ? (
                /* Success state */
                <div className="space-y-4 text-center py-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand/15 ring-1 ring-brand/30">
                    <CheckCircle2 className="h-7 w-7 text-brand" />
                  </div>
                  <p className="text-base font-semibold text-white">
                    {t("faq.support.successTitle")}
                  </p>
                  <p className="text-sm leading-6 text-foreground/60">
                    {t("faq.support.successMessage")}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="rounded-full border border-white/10 bg-white/5 text-xs text-foreground/60 hover:bg-white/10 hover:text-white"
                  >
                    {t("faq.support.submitAnother")}
                  </Button>
                </div>
              ) : (
                /* Form */
                <div className="space-y-4">
                  {/* Category */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground/70">
                      {t("faq.support.category")}{" "}
                      <span className="text-rose-400">*</span>
                    </Label>
                    <Select
                      value={category}
                      onValueChange={(v) => {
                        setCategory(v as SupportCaseCategory);
                        setFormError(null);
                      }}
                      disabled={submitting}
                    >
                      <SelectTrigger className="rounded-xl border-white/15 bg-white/5 text-white focus:border-brand/50 focus:ring-0">
                        <SelectValue
                          placeholder={t("faq.support.categoryPlaceholder")}
                        />
                      </SelectTrigger>
                      <SelectContent className="max-h-52 bg-[hsl(var(--surface))] border-white/15">
                        {categoryKeys.map((key) => (
                          <SelectItem
                            key={key}
                            value={key}
                            className="text-white focus:bg-white/10 focus:text-white"
                          >
                            {t(`faq.support.categories.${key}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subject */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground/70">
                      {t("faq.support.subject")}{" "}
                      <span className="text-rose-400">*</span>
                    </Label>
                    <Input
                      value={subject}
                      onChange={(e) => {
                        setSubject(e.target.value);
                        setFormError(null);
                      }}
                      placeholder={t("faq.support.subjectPlaceholder")}
                      maxLength={200}
                      disabled={submitting}
                      className="rounded-xl border-white/15 bg-white/5 text-white placeholder:text-foreground/30 focus:border-brand/50 focus-visible:ring-0"
                    />
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground/70">
                      {t("faq.support.message")}{" "}
                      <span className="text-rose-400">*</span>
                    </Label>
                    <Textarea
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value);
                        setFormError(null);
                      }}
                      placeholder={t("faq.support.messagePlaceholder")}
                      maxLength={5000}
                      rows={5}
                      disabled={submitting}
                      className="resize-none rounded-xl border-white/15 bg-white/5 text-white placeholder:text-foreground/30 focus:border-brand/50 focus-visible:ring-0"
                    />
                    <p className="text-right text-[0.68rem] text-foreground/25">
                      {message.length}/5000
                    </p>
                  </div>

                  {/* Errors */}
                  {(formError || error) && (
                    <p className="text-xs text-rose-400">
                      {formError ?? error ?? t("faq.support.errorGeneric")}
                    </p>
                  )}

                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !category || !subject || !message}
                    className="w-full rounded-full bg-brand text-slate-950 font-semibold hover:bg-brandStrong disabled:opacity-40"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("faq.support.submitting")}
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        {t("faq.support.submit")}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
