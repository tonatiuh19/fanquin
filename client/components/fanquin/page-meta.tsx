import { Helmet } from "react-helmet-async";

const SITE_NAME = "FanQuin";
const DEFAULT_OG_IMAGE = "/og-default.png";
const SITE_URL = import.meta.env.VITE_SITE_URL ?? "https://fanquin.com";

interface PageMetaProps {
  /** Page title — will be suffixed with " – FanQuin" unless it already contains "FanQuin" */
  title: string;
  /** Meta description (recommended 120–160 chars) */
  description: string;
  /** Absolute or root-relative URL for og:image and twitter:image */
  image?: string;
  /** Canonical path (e.g. "/groups/abc"). Full URL is derived from SITE_URL. */
  canonicalPath?: string;
  /** og:type — defaults to "website" */
  type?: "website" | "article";
  /** Prevent indexing (private/auth-only pages) */
  noIndex?: boolean;
}

export function PageMeta({
  title,
  description,
  image = DEFAULT_OG_IMAGE,
  canonicalPath,
  type = "website",
  noIndex = false,
}: PageMetaProps) {
  const fullTitle = title.includes(SITE_NAME)
    ? title
    : `${title} – ${SITE_NAME}`;

  const fullImage = image.startsWith("http") ? image : `${SITE_URL}${image}`;
  const canonicalUrl = canonicalPath
    ? `${SITE_URL}${canonicalPath}`
    : undefined;

  return (
    <Helmet>
      {/* Primary */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
    </Helmet>
  );
}
