import { Button } from "@/components/ui/button";
import { PageMeta } from "@/components/fanquin/page-meta";
import { Compass, MoveLeft } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

export default function NotFound() {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <section className="container py-10 md:py-16">
      <PageMeta
        title={t("seo.notFound.title")}
        description={t("seo.notFound.description")}
        noIndex
      />
      <div className="glass-panel rounded-[2rem] p-6 md:p-10">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.6rem] bg-white/8 text-brand">
            <Compass className="h-7 w-7" />
          </div>
          <p className="mt-6 text-xs uppercase tracking-[0.28em] text-brand">
            {t("notFound.badge")}
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-white md:text-5xl">
            {t("notFound.title")}
          </h1>
          <p className="mt-4 text-base leading-7 text-foreground/[0.68] md:text-lg">
            {t("notFound.description")}
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              className="rounded-full border border-brand/25 bg-brand px-5 text-sm font-semibold text-slate-950 hover:bg-brandStrong"
            >
              <Link to="/">
                <MoveLeft className="h-4 w-4" />
                {t("notFound.backHome")}
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="rounded-full border border-white/10 bg-white/5 px-5 text-sm text-white hover:bg-white/10"
            >
              <Link to="/groups/world-cup-crew">{t("notFound.openHub")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
