import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

interface PlaceholderPageProps {
  badge: string;
  title: string;
  description: string;
  highlights: string[];
}

export function PlaceholderPage({
  badge,
  title,
  description,
  highlights,
}: PlaceholderPageProps) {
  const { t } = useTranslation();
  return (
    <section className="container py-8 md:py-12">
      <div className="glass-panel overflow-hidden rounded-[2rem] p-6 md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-5">
            <span className="section-label w-fit">{badge}</span>
            <div className="space-y-3">
              <h1 className="font-display text-4xl font-semibold tracking-tight text-white md:text-5xl">
                {title}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-foreground/70 md:text-lg">
                {description}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="rounded-full border border-brand/30 bg-brand px-5 text-sm font-semibold text-slate-950 hover:bg-brandStrong"
              >
                <Link to="/groups/world-cup-crew">
                  {t("placeholder.exploreHub")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="rounded-full border border-white/10 bg-white/5 px-5 text-sm text-white hover:bg-white/10"
              >
                <Link to="/">{t("placeholder.returnHome")}</Link>
              </Button>
            </div>
          </div>

          <div className="soft-card rounded-[1.75rem] p-5 md:p-6">
            <div className="mb-5 flex items-center gap-3 text-sm text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand/20 text-brand">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">{t("placeholder.routeLive")}</p>
                <p className="text-foreground/[0.55]">
                  {t("placeholder.routeExpand")}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {highlights.map((highlight) => (
                <div
                  key={highlight}
                  className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-foreground/[0.72]"
                >
                  {highlight}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
