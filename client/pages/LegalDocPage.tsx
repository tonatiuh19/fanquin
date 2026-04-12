import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Shield } from "lucide-react";
import { PageMeta } from "@/components/fanquin/page-meta";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchLegalDoc } from "@/store/slices/legalSlice";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";

interface Props {
  type: "privacy" | "terms";
}

const META = {
  privacy: {
    icon: Shield,
    title: "Aviso de Privacidad",
    subtitle: "Cómo recopilamos, usamos y protegemos tu información personal",
    badge: "LFPDPPP · GDPR · CCPA",
    color: "text-blue-400",
    ring: "ring-blue-500/20",
    bg: "bg-blue-500/10",
  },
  terms: {
    icon: FileText,
    title: "Términos y Condiciones",
    subtitle: "Las reglas del juego que rigen el uso de FanQuin",
    badge: "Legislación Mexicana · Versión 1.0",
    color: "text-emerald-400",
    ring: "ring-emerald-500/20",
    bg: "bg-emerald-500/10",
  },
};

export default function LegalDocPage({ type }: Props) {
  const dispatch = useAppDispatch();
  const doc = useAppSelector((s) => s.legal[type]);
  const loading = useAppSelector((s) => s.legal.loading);
  const error = useAppSelector((s) => s.legal.error);

  useEffect(() => {
    if (!doc) {
      dispatch(fetchLegalDoc(type));
    }
  }, [dispatch, doc, type]);

  const meta = META[type];
  const Icon = meta.icon;

  return (
    <>
      <PageMeta title={meta.title} description={meta.subtitle} />

      <div className="min-h-screen">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="relative py-20 overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-foreground/40 hover:text-foreground/70 transition mb-8 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Volver al inicio
            </Link>

            <div className="flex items-center gap-4 mb-6">
              <div className={`p-3 rounded-xl ${meta.bg} ring-1 ${meta.ring}`}>
                <Icon className={`w-6 h-6 ${meta.color}`} />
              </div>
              <span className="text-xs font-mono text-foreground/30 tracking-widest uppercase">
                {meta.badge}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              {meta.title}
            </h1>
            <p className="text-lg text-foreground/50">{meta.subtitle}</p>

            {doc && (
              <p className="mt-4 text-xs text-foreground/30">
                Versión {doc.version} · Vigente desde{" "}
                {new Date(doc.effective_date).toLocaleDateString("es-MX", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
          </div>
        </section>

        {/* ── Content ──────────────────────────────────────── */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
          {loading && !doc && (
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className={`h-4 w-${i % 3 === 0 ? "1/2" : "full"}`}
                />
              ))}
            </div>
          )}

          {error && !doc && (
            <div className="glass-panel p-8 text-center">
              <p className="text-foreground/50 text-sm">
                No se pudo cargar el documento. Por favor, inténtalo de nuevo
                más tarde.
              </p>
            </div>
          )}

          {doc && (
            <div className="glass-panel rounded-2xl p-8 sm:p-12 prose-legal">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold mb-2 text-foreground">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-semibold mt-10 mb-3 text-foreground border-b border-white/5 pb-2">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-semibold mt-6 mb-2 text-foreground/80">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-sm text-foreground/60 leading-relaxed mb-4">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="space-y-1.5 mb-4 ml-4 list-disc marker:text-foreground/20">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="space-y-1.5 mb-4 ml-4 list-decimal marker:text-foreground/20">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-sm text-foreground/60 leading-relaxed">
                      {children}
                    </li>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-white/10 pl-4 my-4 italic text-foreground/40">
                      {children}
                    </blockquote>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground/80">
                      {children}
                    </strong>
                  ),
                  hr: () => <hr className="border-white/5 my-8" />,
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-6">
                      <table className="w-full text-sm border-collapse">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="border-b border-white/10">
                      {children}
                    </thead>
                  ),
                  th: ({ children }) => (
                    <th className="text-left py-2 px-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="py-2 px-3 text-foreground/60 border-b border-white/5">
                      {children}
                    </td>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      className="text-brand underline underline-offset-2 hover:text-brand/80 transition"
                      target={href?.startsWith("http") ? "_blank" : undefined}
                      rel={
                        href?.startsWith("http")
                          ? "noopener noreferrer"
                          : undefined
                      }
                    >
                      {children}
                    </a>
                  ),
                  code: ({ children }) => (
                    <code className="bg-white/5 rounded px-1.5 py-0.5 text-xs font-mono text-foreground/70">
                      {children}
                    </code>
                  ),
                }}
              >
                {doc.content}
              </ReactMarkdown>
            </div>
          )}

          {/* ── Footer note ───────────────────────────────── */}
          <div className="mt-12 text-center">
            <p className="text-xs text-foreground/20">
              FanQuin — Hecho en México para el mundo 🇲🇽 ·{" "}
              <a
                href="mailto:privacidad@fanquin.com"
                className="underline hover:text-foreground/40 transition"
              >
                privacidad@fanquin.com
              </a>
            </p>
            <div className="flex justify-center gap-4 mt-4">
              {type === "terms" && (
                <Link
                  to="/privacy"
                  className="text-xs text-foreground/30 hover:text-foreground/60 transition underline"
                >
                  Aviso de Privacidad
                </Link>
              )}
              {type === "privacy" && (
                <Link
                  to="/terms"
                  className="text-xs text-foreground/30 hover:text-foreground/60 transition underline"
                >
                  Términos y Condiciones
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
