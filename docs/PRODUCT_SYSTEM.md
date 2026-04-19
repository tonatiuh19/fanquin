# FanQuin — Product System Reference

> **Version:** 1.0 · **Last updated:** 2026-04-14  
> **Status:** Production-ready  
> **Audience:** Designers, frontend engineers, backend engineers, AI agents

This document is the single source of truth for the FanQuin product system. Every design decision, technical pattern, and product rule is recorded here. No ambiguity is tolerated — if something is not in this document, it is not yet decided.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Brand & Visual Identity](#2-brand--visual-identity)
3. [Design System](#3-design-system)
4. [UI/UX Behavior](#4-uiux-behavior)
5. [Technical Architecture](#5-technical-architecture)
6. [Data & Schema](#6-data--schema)
7. [API Reference](#7-api-reference) — [Overview](#70-api-overview) · [Auth Guide](#71-authentication-guide) · [Conventions](#72-request--response-conventions) · [Client Usage](#73-using-apis-from-the-client-redux-pattern) · [Endpoints §7.4–7.16](#74-auth-endpoints)
8. [State Management](#8-state-management)
9. [Content & Internationalization](#9-content--internationalization)
10. [Performance & Best Practices](#10-performance--best-practices)
11. [Security](#11-security)
12. [Governance & Scalability](#12-governance--scalability)
13. [Back-Office Admin Panel](#13-back-office-admin-panel) — [Access](#131-access-point) · [Auth](#132-authentication) · [State](#133-admin-state-redux) · [Sections](#135-admin-sections) · [Services](#136-services-monitoring)

---

## 1. Product Overview

**FanQuin** is a social fantasy prediction platform ("quiniela") for real football competitions. Players compete in private, invite-only groups where they predict match scores, draft national teams, earn points from team performance, unlock streak bonuses, and engage in weekly 1v1 rivalries.

### 1.1 Core Value Proposition

| Pillar               | Description                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Private groups       | Every group is invite-only. No public feed, no discovery, no strangers.                                                                |
| Team ownership draft | Each player drafts real national teams; team results earn ownership points automatically.                                              |
| Flexible scoring     | Admin configures exact score, correct winner, team win, goal, clean sheet, streak, and bonus criteria point values.                    |
| Bonus predictions    | Up to 5 optional bonus criteria per match: BTTS, half-time result, total goals over/under, full-time result (standalone), clean sheet. |
| Live & async play    | Predictions lock at each match's kickoff time. Ownership points land automatically after each match.                                   |

### 1.2 Primary Competition

FIFA World Cup 2026 (launch). Expansion roadmap: Champions League, Premier League, Liga MX, NBA, NFL.

### 1.3 Play Modes

| Mode          | Audience               | Key Features                                                                           |
| ------------- | ---------------------- | -------------------------------------------------------------------------------------- |
| `casual`      | 2–10 players, families | Random team draw, optional bonus criteria, simple scoring.                             |
| `friends`     | 6–20 players           | Live snake draft, all 5 bonus criteria, streak bonuses, 1v1 weekly rivalries.          |
| `league`      | 13–100 players         | Balanced tier draft, ELO ranking, survivor mode, configurable scoring.                 |
| `competitive` | 13–100 players         | Same as league + survivor mode enabled by default.                                     |
| `global`      | Unlimited              | Daily challenges, brackets, global leaderboard.                                        |
| `ownership`   | Any size               | No score predictions required. Points earned automatically from team performance only. |

### 1.4 Draft Types

| Type            | Behavior                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `snake`         | Live draft room. Players pick one team per turn; order reverses each round. 60-second pick window; auto-pick on timeout. |
| `random`        | Teams assigned randomly before kickoff. Instant.                                                                         |
| `balanced_tier` | Teams sorted into tiers (T1 strong, T2 mid, T3 underdog). Each player receives one team per tier.                        |

### 1.5 Tagline

> "Own a team. Compete with your crew."

### 1.6 Gambling Disclaimer

FanQuin is a **free-to-play** prediction game for entertainment purposes only. No real money, no wagering.

---

## 2. Brand & Visual Identity

### 2.1 Color Palette

All colors are defined as CSS custom properties on `:root` using HSL. The dark theme is the **only** supported theme (no light mode).

#### Semantic Tokens (HSL values)

| Token                      | HSL           | Approximate HEX | Usage                              |
| -------------------------- | ------------- | --------------- | ---------------------------------- |
| `--background`             | `225 42% 8%`  | `#0c1220`       | Page background                    |
| `--foreground`             | `210 40% 96%` | `#eef2f8`       | Primary text                       |
| `--card`                   | `225 34% 11%` | `#121c2e`       | Card backgrounds                   |
| `--card-foreground`        | `210 40% 96%` | `#eef2f8`       | Text on cards                      |
| `--popover`                | `226 34% 10%` | `#101928`       | Popover/dropdown bg                |
| `--popover-foreground`     | `210 40% 96%` | `#eef2f8`       | Popover text                       |
| `--primary`                | `157 95% 47%` | `#04ef8e`       | Primary action, brand green        |
| `--primary-foreground`     | `224 45% 10%` | `#0d1628`       | Text on primary buttons            |
| `--secondary`              | `223 24% 16%` | `#1e2840`       | Secondary UI surfaces              |
| `--secondary-foreground`   | `210 40% 96%` | `#eef2f8`       | Text on secondary                  |
| `--muted`                  | `223 24% 16%` | `#1e2840`       | Muted surfaces (same as secondary) |
| `--muted-foreground`       | `217 16% 70%` | `#9daabf`       | De-emphasised text, placeholders   |
| `--accent`                 | `259 88% 69%` | `#885cff`       | Purple accent / alt brand color    |
| `--accent-foreground`      | `210 40% 98%` | `#f0f4fb`       | Text on accent                     |
| `--destructive`            | `0 75% 60%`   | `#e85454`       | Errors, destructive actions        |
| `--destructive-foreground` | `210 40% 98%` | `#f0f4fb`       | Text on destructive                |
| `--border`                 | `224 21% 21%` | `#273245`       | Borders, dividers                  |
| `--input`                  | `224 21% 21%` | `#273245`       | Input field borders                |
| `--ring`                   | `157 95% 47%` | `#04ef8e`       | Focus rings                        |
| `--brand`                  | `157 95% 47%` | `#04ef8e`       | Brand green (same as primary)      |
| `--brand-strong`           | `168 84% 44%` | `#12d68a`       | Stronger green for hover states    |
| `--brand-alt`              | `259 88% 69%` | `#885cff`       | Purple alternate brand             |
| `--surface`                | `225 31% 13%` | `#131f33`       | Elevated surface panels            |
| `--surface-strong`         | `225 28% 17%` | `#192740`       | Stronger elevated surface          |
| `--success`                | `157 72% 44%` | `#1dc97a`       | Success states                     |
| `--warning`                | `42 96% 61%`  | `#fbbf24`       | Warning states                     |
| `--radius`                 | `1.25rem`     | —               | Border radius base (20px)          |

#### Sidebar Tokens

| Token                          | HSL           | Usage                  |
| ------------------------------ | ------------- | ---------------------- |
| `--sidebar-background`         | `226 36% 9%`  | Sidebar bg             |
| `--sidebar-foreground`         | `210 40% 96%` | Sidebar text           |
| `--sidebar-primary`            | `157 95% 47%` | Active sidebar items   |
| `--sidebar-primary-foreground` | `224 45% 10%` | Text on active sidebar |
| `--sidebar-accent`             | `223 24% 16%` | Sidebar hover          |
| `--sidebar-border`             | `224 21% 18%` | Sidebar dividers       |

#### Semantic Color Aliases (Tailwind)

| Tailwind Class                  | Resolves To                  |
| ------------------------------- | ---------------------------- |
| `bg-background`                 | `hsl(var(--background))`     |
| `text-foreground`               | `hsl(var(--foreground))`     |
| `bg-brand` / `text-brand`       | `hsl(var(--brand))`          |
| `bg-brandAlt` / `text-brandAlt` | `hsl(var(--brand-alt))`      |
| `bg-surface`                    | `hsl(var(--surface))`        |
| `bg-surfaceStrong`              | `hsl(var(--surface-strong))` |
| `text-success`                  | `hsl(var(--success))`        |
| `text-warning`                  | `hsl(var(--warning))`        |

#### Body Background

The page body uses a layered gradient:

```css
radial-gradient(circle at top, rgba(65,255,175,0.18), transparent 28%),
radial-gradient(circle at 85% 10%, rgba(136,92,255,0.18), transparent 22%),
linear-gradient(180deg, rgba(12,18,38,0.98), rgba(9,12,24,1))
```

This produces a dark navy base with a green glow at the top and a subtle purple glow upper-right.

#### Scrollbar Gradient

```css
linear-gradient(180deg, hsl(var(--brand)/0.8), hsl(var(--brand-alt)/0.8))
```

Width: `12px`. Thumb: rounded (`border-radius: 999px`).

### 2.2 Typography

#### Font Families

| Family        | Variable              | Usage                                              |
| ------------- | --------------------- | -------------------------------------------------- |
| **Inter**     | `font-sans` (default) | All body text, UI labels, inputs, navigation       |
| **Squartiqa** | `font-display`        | Brand logos, section hero headings, display titles |

Inter is loaded from Google Fonts (`wght@400;500;600;700;800`).  
Squartiqa is a custom typeface loaded from `/Squartiqa.ttf` (weight 400) and `/SquartiqaBold.ttf` (weight 700), both served from the `public/` directory.

#### Font Weights

| Weight | Usage                                       |
| ------ | ------------------------------------------- |
| 400    | Body text, descriptions                     |
| 500    | UI labels, secondary actions                |
| 600    | Sub-headings, card titles, important values |
| 700    | Headings, button labels, section titles     |
| 800    | Hero headings, stat numbers                 |

#### Text Rendering

```css
font-feature-settings:
  "ss01" 1,
  "cv02" 1;
text-rendering: optimizeLegibility;
-webkit-font-smoothing: antialiased;
```

#### Type Scale (Tailwind defaults apply)

| Class          | Size    | Usage                            |
| -------------- | ------- | -------------------------------- |
| `text-xs`      | 12px    | Badges, section labels, metadata |
| `text-sm`      | 14px    | Form labels, secondary content   |
| `text-base`    | 16px    | Body text, descriptions          |
| `text-lg`      | 18px    | Card titles                      |
| `text-xl`      | 20px    | Sub-section headings             |
| `text-2xl`     | 24px    | Page section headings            |
| `text-3xl–4xl` | 30–36px | Hero secondary headings          |
| `text-5xl–6xl` | 48–60px | Hero primary headings            |

#### Section Labels

Reusable class `.section-label`:

```css
rounded-full border border-brand/20 bg-brand/10 px-3 py-1
text-[11px] font-semibold uppercase tracking-[0.28em] text-brand
```

Usage: small badge-style labels above section headings.

### 2.3 Logo

- **Primary logo:** `FanQuinLogo` component from `client/components/fanquin/logo.tsx`
- **Email logo:** `https://disruptinglabs.com/data/fanquin/assets/images/logo_white.png` (white variant, 140px wide in emails)
- **Squartiqa font** is used for the wordmark where rendered as text
- **Tagline:** "Own a team. Compete with your crew."
- **Rule:** Never place the logo on a light background. The design system is dark-only.

### 2.4 Iconography

- **Primary library:** `lucide-react` (Lucide icons)
- **Fallback library:** `react-icons` (for icons not available in Lucide)
- Icon stroke weight: default Lucide (1.5px stroke)
- Icon sizes follow spacing scale: `w-4 h-4` (16px), `w-5 h-5` (20px), `w-6 h-6` (24px)

### 2.5 Imagery Style

- Team flags: served via `flag_url` from database (external CDN)
- Competition logos: served via `logo_url` from database
- Avatars: user-uploaded `avatar_url`, with fallback to initials display
- All imagery uses `aspect-ratio` utility for stable layout
- No stock photography in the UI — data-driven images only

### 2.6 Gradients

| Name           | Value                                                                | Usage                            |
| -------------- | -------------------------------------------------------------------- | -------------------------------- |
| `hero-radial`  | Green top + purple upper-right radial                                | Hero section backgrounds         |
| `grid-fade`    | Subtle white grid lines                                              | Decorative grid overlays         |
| `glow` shadow  | `0 0 0 1px rgba(65,255,175,0.15), 0 18px 45px rgba(52,211,153,0.22)` | Highlighted interactive elements |
| `panel` shadow | `0 24px 60px rgba(2,6,23,0.4)`                                       | Cards and panel depth            |

---

## 3. Design System

### 3.1 Spacing Scale

Tailwind default spacing scale applies. Key values:

| Scale | Value | Common usage            |
| ----- | ----- | ----------------------- |
| 1     | 4px   | Icon gaps               |
| 2     | 8px   | Inner badge padding     |
| 3     | 12px  | Small component padding |
| 4     | 16px  | Standard padding        |
| 5     | 20px  | Section inner padding   |
| 6     | 24px  | Card padding            |
| 8     | 32px  | Large section spacing   |
| 10    | 40px  | Section gap             |
| 12    | 48px  | Row/section padding     |
| 16    | 64px  | Page section gap        |
| 20    | 80px  | Large section gap       |
| 24    | 96px  | Hero padding            |

### 3.2 Grid / Container

Config in `tailwind.config.ts`:

```
max-width: 1400px (2xl breakpoint)
center: true
padding:
  DEFAULT: 1rem (16px)
  sm: 1.25rem (20px)
  lg: 1.5rem (24px)
  xl: 2rem (32px)
```

Use `<div className="container mx-auto">` for all page-level centering.

### 3.3 Border Radius

| Token          | Value                        | Usage                  |
| -------------- | ---------------------------- | ---------------------- |
| `rounded-sm`   | `calc(1.25rem - 4px)` = 16px | Small components       |
| `rounded-md`   | `calc(1.25rem - 2px)` = 18px | Cards, modals          |
| `rounded-lg`   | `1.25rem` = 20px             | Main card radius       |
| `rounded-full` | 9999px                       | Badges, avatars, pills |

### 3.4 Shadows

| Utility        | Value                         | Usage                      |
| -------------- | ----------------------------- | -------------------------- |
| `shadow-glow`  | Green glow ring + drop shadow | Selected/highlighted cards |
| `shadow-panel` | Dark deep shadow              | Floating panels, cards     |

### 3.5 Animations

| Name             | Duration | Easing                | Trigger                     |
| ---------------- | -------- | --------------------- | --------------------------- |
| `accordion-down` | 200ms    | ease-out              | Accordion open              |
| `accordion-up`   | 200ms    | ease-out              | Accordion close             |
| `pulse-glow`     | 2800ms   | ease-in-out, infinite | CTA focus / live indicators |

`tailwindcss-animate` plugin is active for all transition utilities.

### 3.6 Utility Classes

| Class            | Description                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `.glass-panel`   | `border border-white/10 bg-white/5 shadow-panel backdrop-blur-2xl` — frosted glass panel  |
| `.soft-card`     | `border border-white/10 bg-surface/80 shadow-panel backdrop-blur-xl` — soft elevated card |
| `.section-label` | Rounded uppercase brand-colored badge label                                               |

### 3.7 Component Library

All UI primitives live in `client/components/ui/` and are built on **Radix UI** with TailwindCSS styling (shadcn/ui pattern).

#### Available Components

| Component File                    | Description                             |
| --------------------------------- | --------------------------------------- |
| `accordion.tsx`                   | Collapsible content sections (Radix)    |
| `alert-dialog.tsx`                | Blocking confirmation dialog            |
| `alert.tsx`                       | Inline status messages                  |
| `aspect-ratio.tsx`                | Constrained aspect ratio container      |
| `avatar.tsx`                      | User avatar with fallback initials      |
| `badge.tsx`                       | Status/label pill                       |
| `breadcrumb.tsx`                  | Navigation breadcrumb                   |
| `button.tsx`                      | Primary action button with variants     |
| `calendar.tsx`                    | Date picker calendar                    |
| `card.tsx`                        | Surface card with header/content/footer |
| `carousel.tsx`                    | Horizontal scroll carousel              |
| `chart.tsx`                       | Data visualisation wrapper              |
| `checkbox.tsx`                    | Standard checkbox (Radix)               |
| `collapsible.tsx`                 | Animate expand/collapse container       |
| `command.tsx`                     | Command palette / search                |
| `context-menu.tsx`                | Right-click context menu                |
| `dialog.tsx`                      | Modal dialog (Radix)                    |
| `drawer.tsx`                      | Bottom/side sheet drawer                |
| `dropdown-menu.tsx`               | Dropdown action menu (Radix)            |
| `form.tsx`                        | React Hook Form integration wrapper     |
| `hover-card.tsx`                  | Rich hover tooltip                      |
| `input-otp.tsx`                   | 6-digit OTP input                       |
| `input.tsx`                       | Text input field                        |
| `label.tsx`                       | Form label                              |
| `menubar.tsx`                     | Horizontal menu bar                     |
| `navigation-menu.tsx`             | Top-level navigation menu               |
| `pagination.tsx`                  | Page navigation controls                |
| `popover.tsx`                     | Floating content popover                |
| `progress.tsx`                    | Progress bar                            |
| `radio-group.tsx`                 | Radio button group                      |
| `resizable.tsx`                   | Drag-to-resize panel                    |
| `scroll-area.tsx`                 | Custom scrollbar container              |
| `select.tsx`                      | Dropdown select input                   |
| `separator.tsx`                   | Horizontal/vertical divider             |
| `sheet.tsx`                       | Side panel sheet                        |
| `sidebar.tsx`                     | Full sidebar layout component           |
| `skeleton.tsx`                    | Loading skeleton placeholder            |
| `slider.tsx`                      | Range slider                            |
| `sonner.tsx`                      | Toast notification system (Sonner)      |
| `switch.tsx`                      | Toggle switch (Radix)                   |
| `table.tsx`                       | Data table with head/body/row/cell      |
| `tabs.tsx`                        | Tabbed navigation                       |
| `textarea.tsx`                    | Multiline text input                    |
| `toast.tsx` / `toaster.tsx`       | Toast notifications (Radix)             |
| `toggle.tsx` / `toggle-group.tsx` | Toggle button and toggle group          |
| `tooltip.tsx`                     | Hover tooltip                           |

#### Button Variants

Defined in `button.tsx` with class-variance-authority:

| Variant       | Usage                                            |
| ------------- | ------------------------------------------------ |
| `default`     | Primary action — green background (`bg-primary`) |
| `destructive` | Danger/delete — red background                   |
| `outline`     | Secondary action — border only                   |
| `secondary`   | Neutral action — `bg-secondary`                  |
| `ghost`       | No background, hover only                        |
| `link`        | Text-only link style                             |

Button sizes: `default`, `sm`, `lg`, `icon`.

### 3.8 Form Validation Pattern

All forms MUST use **Formik** + **Yup**:

```typescript
import { useFormik } from "formik";
import * as Yup from "yup";

const schema = Yup.object({
  email: Yup.string()
    .email(t("validation.email_invalid"))
    .required(t("validation.required")),
});

const formik = useFormik({
  initialValues: { email: "" },
  validationSchema: schema,
  onSubmit: (values) => dispatch(submitForm(values)),
});
```

- All validation messages MUST use `t("key")` — never hardcoded strings
- Never use `defaultValue` as a substitute for proper i18n keys

### 3.9 Component States

Every interactive component must implement these states:

| State              | Implementation                                                      |
| ------------------ | ------------------------------------------------------------------- |
| **Default**        | Base Tailwind classes                                               |
| **Hover**          | `hover:` prefix utilities                                           |
| **Active/Pressed** | `active:` prefix utilities                                          |
| **Focused**        | `focus-visible:ring-2 focus-visible:ring-ring`                      |
| **Disabled**       | `disabled:opacity-50 disabled:pointer-events-none`                  |
| **Loading**        | Skeleton component or spinner, disable interaction                  |
| **Error**          | `text-destructive`, `border-destructive`, error message below field |
| **Success**        | `text-success` / green confirmation text                            |

### 3.10 Responsive Breakpoints

Tailwind default breakpoints:

| Breakpoint | Min-width | Target devices                       |
| ---------- | --------- | ------------------------------------ |
| `sm`       | 640px     | Large phones (landscape)             |
| `md`       | 768px     | Tablets                              |
| `lg`       | 1024px    | Laptops                              |
| `xl`       | 1280px    | Desktops                             |
| `2xl`      | 1536px    | Large screens (container max 1400px) |

The app ships a **mobile-first** design with a **bottom navigation bar** on mobile and a **top navigation bar** on desktop. `use-mobile.tsx` hook (`useIsMobile()`) detects viewport <768px.

### 3.11 Accessibility Standards

- All interactive elements MUST be keyboard-navigable
- Focus rings: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- All images MUST have meaningful `alt` text
- Color contrast: minimum WCAG AA (4.5:1 for normal text, 3:1 for large text)
- `--brand` green (#04ef8e) on `--background` (#0c1220) = passes AA large text
- Semantic HTML: use `<nav>`, `<main>`, `<section>`, `<article>`, `<button>` appropriately
- Radix UI primitives handle ARIA attributes automatically — do not override without reason
- Text wrapping: all text elements use `overflow-wrap: anywhere; word-break: break-word`

---

## 4. UI/UX Behavior

### 4.1 Navigation Structure

#### Top Navigation (≥768px)

```
[FanQuin Logo] [Home] [My Groups / Group Hub] [Live*] [Scoring]   [Lang] [Notifications*] [Avatar Dropdown*]
                                                                                     * authenticated only
```

- Logo: `FanQuinLogo` component, links to `/`
- Authenticated nav: Home, My Groups, Live, Scoring, Language toggle, Notifications bell, Avatar dropdown (My Profile, Sign Out)
- Unauthenticated nav: Home, Group Hub, Scoring, Language toggle, Sign In button

#### Bottom Navigation (mobile, <768px — authenticated)

```
[Home] [My Groups] [Live] [Profile]
```

Unauthenticated mobile nav: Home, Hub, Groups (redirects to sign-in).

#### Route Structure

| Path                     | Component      | Auth Required | Description                              |
| ------------------------ | -------------- | ------------- | ---------------------------------------- |
| `/`                      | `Index`        | No            | Landing / home page                      |
| `/groups/world-cup-crew` | `GroupHub`     | No            | Marketing demo hub                       |
| `/groups/new`            | `CreateGroup`  | No            | Group creation wizard                    |
| `/join/:code`            | `JoinPage`     | No            | Join group via invite code               |
| `/groups`                | `MyGroups`     | **Yes**       | User's joined groups                     |
| `/groups/:id`            | `GroupPage`    | **Yes**       | Individual group leaderboard/predictions |
| `/groups/:id/draft`      | `DraftPage`    | **Yes**       | Live snake draft room                    |
| `/profile`               | `ProfilePage`  | **Yes**       | User profile editor                      |
| `/live`                  | `LivePage`     | **Yes**       | Live match predictions                   |
| `/scoring`               | `ScoringPage`  | No            | Scoring rules explainer                  |
| `/privacy`               | `LegalDocPage` | No            | Privacy policy                           |
| `/terms`                 | `LegalDocPage` | No            | Terms of service                         |
| `/faq`                   | `FaqPage`      | No            | FAQ & Support                            |
| `*`                      | `NotFound`     | No            | 404 page                                 |

#### Auth Guard

`RequireAuth` component: checks `state.auth.sessionToken`. While `state.auth.profileLoading = true`, renders nothing (skeleton from `AppShell` is shown). On missing token, redirects to `/` with the original location saved in `state.from`.

### 4.2 Page Layouts

#### AppShell Layout

```
┌────────────────────────┐
│       TopNav           │ (sticky, backdrop blur)
├────────────────────────┤
│                        │
│    <Outlet />          │ (page content)
│    (HelmetProvider)    │
│                        │
├────────────────────────┤
│     BottomNav          │ (mobile only, fixed bottom)
└────────────────────────┘
```

#### Standard Page Layout

```
container mx-auto px-4
  pt-8 pb-16
    [Page Header: badge + title + description]
    [Content Grid / Stack]
```

### 4.3 Authentication Flow

1. User clicks "Sign In" → `OtpAuthModal` opens
2. User enters email address
3. `POST /api/auth/send-code` → 6-digit OTP sent via email (expiry: 10 min)
4. User enters OTP in `InputOtp` component
5. `POST /api/auth/verify-code` → returns `sessionToken` + `UserProfile`
6. Token stored in `localStorage` as `fanquin_session`
7. `setAuth` action dispatched to Redux store
8. New users proceed to profile setup (username, display name)
9. On app load, `bootstrapAuth` thunk validates stored token via `GET /api/profile`

**OTP Security rules:**

- Codes are hashed (bcrypt) before storage — never stored in plaintext
- Expiry: 10 minutes
- Max: 5 failed attempts before block
- Rate limiting by IP is enforced server-side

### 4.4 Group Creation Flow

1. `/groups/new` — `CreateGroup` page with multi-step wizard (`groupWizardSlice`)
2. Step 1: Select competition
3. Step 2: Configure group (name, mode, draft type, max members)
4. Step 3: Configure scoring and bonus criteria
5. `POST /api/groups` → group created with invite code
6. Redirect to `/groups/:id`
7. Owner shares 8-character `invite_code` via any channel

### 4.5 Draft Flow

1. Group owner starts draft from group page → `PATCH /api/groups/:id/start-draft`
2. Group status transitions: `waiting` → `draft`
3. All members notified via email ("Draft is live")
4. Players navigate to `/groups/:id/draft` (`DraftPage`)
5. Real-time polling (or server-push): current picker + 60-second timer visible
6. Active picker submits `POST /api/groups/:id/draft/pick` with `team_id`
7. Auto-pick triggers server-side if deadline passes
8. When all picks complete, group transitions: `draft` → `active`
9. Draft complete email sent to all members with full squad summary

### 4.6 Prediction Flow

1. User navigates to `/groups/:id` or `/live`
2. Upcoming matches displayed with lock countdown
3. Before lock: user enters `predicted_home` and `predicted_away` scores
4. If bonus criteria enabled: bonus fields shown per match (BTTS toggle, HT result select, etc.)
5. `POST /api/predictions` — idempotent (can update before lock)
6. After `prediction_lock` timestamp: prediction slot closed — no late entries
7. After match completes: server scores prediction, updates `group_members.total_points`

### 4.7 Live Page Flow

1. `GET /api/live` returns `LivePageData` (live, upcoming, recent matches + user's predictions)
2. Auto-refresh on a polling interval
3. Match cards show: score, prediction result badge, points earned, bonus details
4. Owned teams highlighted in live scoreboard

### 4.8 Interaction Patterns

- **Optimistic UI:** Not currently used — all mutations await server confirmation
- **Loading states:** Skeleton components during data fetch; button spinners during mutations
- **Toast notifications:** Sonner + Radix toasts for action feedback (success/error)
- **Scroll restoration:** `ScrollToTop` component resets scroll position on route change
- **Smooth scroll:** `scroll-behavior: smooth` on `html`
- **Selection highlight:** `::selection` → brand green tint

### 4.9 Empty States

Every list component that may have zero items MUST display an empty state with:

- An explanatory icon (Lucide)
- A headline (`t("key.empty_title")`)
- A description (`t("key.empty_description")`)
- An optional CTA (e.g., "Create a group")

### 4.10 Error States

- API errors: displayed as a `toast.error(t("error.key"))`
- Form field errors: red `text-destructive` text below the field via Formik `formik.errors.field`
- Network errors: generic fallback toast with retry option
- 404 route: `NotFound` page with navigation back to home

---

## 5. Technical Architecture

### 5.1 Technology Stack

| Layer              | Technology                                            |
| ------------------ | ----------------------------------------------------- |
| Frontend framework | React 18 (TypeScript)                                 |
| Build tool         | Vite 6                                                |
| Styling            | TailwindCSS 3 + CSS custom properties                 |
| UI primitives      | Radix UI                                              |
| Form validation    | Formik + Yup                                          |
| State management   | Redux Toolkit                                         |
| Server-side state  | TanStack React Query (supplementary)                  |
| Routing            | React Router v6                                       |
| i18n               | i18next + react-i18next                               |
| SEO                | react-helmet-async                                    |
| Backend framework  | Express 5 (TypeScript)                                |
| Database           | Supabase (PostgreSQL)                                 |
| Auth               | Custom OTP via email (Nodemailer + SMTP)              |
| Token storage      | SHA-256 hash in `user_sessions` table                 |
| Email              | Nodemailer (SMTP) with server-rendered HTML templates |
| HTTP client        | Axios                                                 |
| Testing            | Vitest                                                |
| Deployment         | Vercel (serverless functions) + Netlify (fallback)    |
| Package manager    | **npm** (never pnpm or yarn)                          |

### 5.2 Project Structure

```
/
├── api/
│   ├── index.ts          # All Express routes + email templates + business logic
│   └── swagger.yaml      # OpenAPI 3.0 API specification (must stay in sync with index.ts)
├── client/
│   ├── App.tsx           # Root component: providers + router + auth bootstrap
│   ├── global.css        # TailwindCSS directives + CSS custom properties (design tokens)
│   ├── vite-env.d.ts     # Vite type declarations
│   ├── components/
│   │   ├── fanquin/      # App-specific components (AppShell, Logo, OtpAuthModal, etc.)
│   │   └── ui/           # Generic UI component library (shadcn/ui pattern)
│   ├── hooks/            # Custom React hooks (use-mobile, use-toast)
│   ├── i18n/
│   │   ├── index.ts      # i18next configuration
│   │   └── locales/
│   │       ├── en.json   # English strings
│   │       └── es.json   # Spanish strings
│   ├── lib/
│   │   ├── supabase.ts   # Supabase client (anon key, client-side only)
│   │   └── utils.ts      # Utility functions (cn, etc.)
│   ├── pages/            # Route-level page components
│   │   ├── Index.tsx     # / — Landing page
│   │   ├── GroupHub.tsx  # /groups/world-cup-crew — Demo hub
│   │   ├── GroupPage.tsx # /groups/:id — Group detail
│   │   ├── MyGroups.tsx  # /groups — User's groups list
│   │   ├── CreateGroup.tsx # /groups/new — Group wizard
│   │   ├── DraftPage.tsx # /groups/:id/draft — Snake draft room
│   │   ├── JoinPage.tsx  # /join/:code — Join via invite code
│   │   ├── LivePage.tsx  # /live — Live match predictions
│   │   ├── ScoringPage.tsx # /scoring — Scoring rules
│   │   ├── ProfilePage.tsx # /profile — Profile editor
│   │   ├── LegalDocPage.tsx # /privacy, /terms
│   │   ├── FaqPage.tsx   # /faq
│   │   └── NotFound.tsx  # 404
│   └── store/
│       ├── index.ts      # Store configuration
│       ├── hooks.ts      # useAppDispatch + useAppSelector
│       └── slices/       # Redux slices (see §8)
├── database/
│   ├── schema.sql        # Canonical database schema — SOURCE OF TRUTH
│   └── supabase/
│       ├── config.toml   # Supabase local dev config
│       └── migrations/   # Timestamped migration files
├── docs/
│   └── PRODUCT_SYSTEM.md # This document
├── netlify/functions/api.ts # Netlify Function adapter
├── shared/
│   └── api.ts            # TypeScript types shared between client and server
├── tailwind.config.ts    # Tailwind theme configuration
├── vite.config.ts        # Vite config (client build + dev server Express proxy)
└── vite.config.server.ts # Vite config for server build
```

### 5.3 Path Aliases

| Alias       | Resolves to | Usage                                  |
| ----------- | ----------- | -------------------------------------- |
| `@/*`       | `client/`   | All client-side imports                |
| `@shared/*` | `shared/`   | Types shared between client and server |

**Rule:** Always use these aliases. Never use relative `../../` imports across major boundaries.

### 5.4 Backend Architecture

- Single Express 5 app in `api/index.ts`
- All routes prefixed `/api/`
- Single port `8080` for both frontend and backend in development (Vite dev server proxies to Express middleware)
- Production: Vercel serverless function via `@vercel/node` adapter
- `createApp()` factory function exported from `api/index.ts`

#### Middleware Chain

1. `express.json()` — body parsing
2. `cors()` — CORS headers
3. `requireAuth` middleware — validates `Authorization: Bearer <token>` header on protected routes

#### Authentication Middleware (`requireAuth`)

```
1. Extract token from Authorization header
2. Hash token with SHA-256
3. Query user_sessions WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()
4. Get user_id from session row
5. Fetch profile from public.profiles
6. Attach user to req.user
```

#### Session Token Lifecycle

1. Generated: `crypto.randomBytes(48).toString('hex')` → 96 hex chars
2. Stored: `crypto.createHash('sha256').update(token).digest('hex')` in `user_sessions.token_hash`
3. Expiry: 30 days
4. Revocation: `revoked_at` timestamp set on logout or admin action

### 5.5 Environment Variables

| Variable                    | Required   | Description                               |
| --------------------------- | ---------- | ----------------------------------------- |
| `SUPABASE_URL`              | Yes        | Supabase project URL                      |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes        | Service role key (server only)            |
| `SMTP_HOST`                 | Yes (prod) | SMTP server hostname                      |
| `SMTP_PORT`                 | No         | SMTP port (default: 587)                  |
| `SMTP_USER`                 | Yes (prod) | SMTP username                             |
| `SMTP_PASSWORD`             | Yes (prod) | SMTP password                             |
| `SMTP_SECURE`               | No         | `"true"` for TLS                          |
| `APP_URL`                   | No         | Public app URL (used in email links)      |
| `NODE_ENV`                  | No         | `"production"` disables dev-only features |
| `USERNAME_EXTRA_BLOCKED`    | No         | Comma-separated extra profanity terms     |

### 5.6 Data Flow

```
User Action
    ↓
React Component (dispatches Redux action)
    ↓
createAsyncThunk (in Redux slice)
    ↓
axios.{get,post,patch} to /api/* (with Authorization header)
    ↓
Express route handler
    ↓
requireAuth middleware (on protected routes)
    ↓
Supabase admin client (service role)
    ↓
PostgreSQL (Supabase DB)
    ↓
Response → Redux state update → Component re-render
```

**Rule:** Components NEVER call axios directly. All data fetching is in Redux slices via `createAsyncThunk`.

---

## 6. Data & Schema

### 6.1 Schema Overview

The canonical source of truth is `/database/schema.sql`. Never assume column names — always verify against this file.

Database engine: **PostgreSQL** (Supabase, version 8.0 compatible migrations for HostGator fallback).

Row Level Security (RLS) is enabled on all tables. Mutations use the service role key (bypasses RLS on the server) while client-side queries use the anon key (respects RLS).

### 6.2 Enums

| Enum                    | Values                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `group_mode`            | `casual`, `friends`, `league`, `competitive`, `global`, `ownership`                 |
| `group_status`          | `waiting`, `draft`, `active`, `completed`                                           |
| `draft_type`            | `snake`, `random`, `balanced_tier`                                                  |
| `boost_type`            | `double_points`, `underdog_boost`, `last_minute_change`, `streak_insurance`         |
| `prediction_result`     | `pending`, `exact_score`, `correct_winner`, `goal_difference`, `incorrect`          |
| `rivalry_status`        | `active`, `completed`, `tied`                                                       |
| `match_status`          | `scheduled`, `live`, `completed`, `cancelled`                                       |
| `competition_type`      | `world_cup`, `champions_league`, `premier_league`, `liga_mx`, `nba`, `nfl`, `other` |
| `support_case_category` | `account`, `group`, `predictions`, `scoring`, `technical`, `billing`, `other`       |
| `support_case_status`   | `open`, `in_review`, `resolved`, `closed`                                           |

### 6.3 Tables

#### `public.profiles`

Extends `auth.users`. Primary user identity record.

| Column         | Type        | Constraints                     | Description             |
| -------------- | ----------- | ------------------------------- | ----------------------- |
| `id`           | uuid        | PK, FK → auth.users(id) CASCADE | User ID                 |
| `username`     | text        | UNIQUE NOT NULL                 | URL-safe display handle |
| `display_name` | text        | —                               | Full display name       |
| `first_name`   | text        | —                               | Given name              |
| `last_name`    | text        | —                               | Family name             |
| `phone`        | text        | —                               | Phone number (E.164)    |
| `country`      | text        | —                               | ISO 3166-1 alpha-2      |
| `avatar_url`   | text        | —                               | Profile image URL       |
| `locale`       | text        | DEFAULT 'en'                    | UI language preference  |
| `created_at`   | timestamptz | DEFAULT now()                   |                         |
| `updated_at`   | timestamptz | DEFAULT now()                   |                         |

**RLS:** `SELECT` public; `INSERT`/`UPDATE` own row only.

#### `public.otp_requests`

OTP verification audit log. Codes never stored in plaintext.

| Column            | Type        | Description                                     |
| ----------------- | ----------- | ----------------------------------------------- |
| `id`              | uuid PK     |                                                 |
| `identifier`      | text        | Email or phone                                  |
| `delivery_method` | text        | `'email'` or `'sms'`                            |
| `code_hash`       | text        | `crypt(code, gen_salt('bf'))` — never plaintext |
| `expires_at`      | timestamptz | `now() + interval '10 minutes'`                 |
| `verified_at`     | timestamptz | Set on successful match                         |
| `attempt_count`   | int         | Incremented per failed attempt; blocked at 5    |
| `is_used`         | boolean     | True after first successful verification        |
| `ip_address`      | inet        | Request origin for rate limiting                |
| `created_at`      | timestamptz |                                                 |

**RLS:** server-only via service_role. No client-facing policies.

#### `public.user_sessions`

Active authenticated sessions.

| Column            | Type               | Description                              |
| ----------------- | ------------------ | ---------------------------------------- |
| `id`              | uuid PK            |                                          |
| `user_id`         | uuid FK → profiles |                                          |
| `token_hash`      | text UNIQUE        | SHA-256 of raw token                     |
| `delivery_method` | text               | How user authenticated                   |
| `device_info`     | jsonb              | `{ platform, browser, os, app_version }` |
| `ip_address`      | inet               |                                          |
| `last_seen_at`    | timestamptz        |                                          |
| `expires_at`      | timestamptz        | `now() + interval '30 days'`             |
| `revoked_at`      | timestamptz        | null = active                            |
| `created_at`      | timestamptz        |                                          |

#### `public.competitions`

| Column           | Type             | Description                      |
| ---------------- | ---------------- | -------------------------------- |
| `id`             | uuid PK          |                                  |
| `name`           | text             | Full competition name            |
| `short_name`     | text             | E.g. "WC 2026"                   |
| `type`           | competition_type |                                  |
| `season`         | text             | E.g. "2026"                      |
| `starts_at`      | timestamptz      |                                  |
| `ends_at`        | timestamptz      |                                  |
| `is_active`      | boolean          | Visible to users                 |
| `is_test`        | boolean          | Hidden from public lists         |
| `logo_url`       | text             |                                  |
| `external_id`    | integer          | football-data.org competition ID |
| `last_synced_at` | timestamptz      | Last external sync               |

#### `public.teams`

| Column           | Type                   | Description               |
| ---------------- | ---------------------- | ------------------------- |
| `id`             | uuid PK                |                           |
| `competition_id` | uuid FK → competitions |                           |
| `name`           | text                   |                           |
| `short_name`     | text                   |                           |
| `country_code`   | text                   | ISO 3166-1 alpha-2        |
| `flag_url`       | text                   |                           |
| `tier`           | int                    | 1=top, 2=mid, 3=underdog  |
| `external_id`    | integer                | football-data.org team ID |

#### `public.matches`

| Column              | Type            | Description                                      |
| ------------------- | --------------- | ------------------------------------------------ |
| `id`                | uuid PK         |                                                  |
| `competition_id`    | uuid FK         |                                                  |
| `home_team_id`      | uuid FK → teams |                                                  |
| `away_team_id`      | uuid FK → teams |                                                  |
| `stage`             | text            | "Group Stage", "Quarter-Final", etc.             |
| `match_date`        | timestamptz     |                                                  |
| `prediction_lock`   | timestamptz     | Predictions close at this time                   |
| `home_score`        | int             | null until completed                             |
| `away_score`        | int             | null until completed                             |
| `ht_score_home`     | int             | Half-time home                                   |
| `ht_score_away`     | int             | Half-time away                                   |
| `status`            | match_status    |                                                  |
| `upset_multiplier`  | numeric(4,2)    | Recomputed after lock: BasePoints × (1/pick_pct) |
| `home_win_pick_pct` | numeric(5,4)    | % of pickers who chose home win                  |
| `away_win_pick_pct` | numeric(5,4)    |                                                  |
| `draw_pick_pct`     | numeric(5,4)    |                                                  |
| `total_picks`       | int             |                                                  |
| `external_id`       | integer         | football-data.org match ID                       |

#### `public.groups`

| Column             | Type               | Description                              |
| ------------------ | ------------------ | ---------------------------------------- |
| `id`               | uuid PK            |                                          |
| `name`             | text               |                                          |
| `invite_code`      | text UNIQUE        | 8-char alphanumeric                      |
| `competition_id`   | uuid FK            |                                          |
| `mode`             | group_mode         |                                          |
| `draft_type`       | draft_type         |                                          |
| `owner_id`         | uuid FK → profiles |                                          |
| `max_members`      | int                | DEFAULT 50                               |
| `status`           | group_status       | DEFAULT 'waiting'                        |
| `draft_started_at` | timestamptz        |                                          |
| `started_at`       | timestamptz        |                                          |
| `scoring_config`   | jsonb              | Point values per event (see §6.4)        |
| `bonus_criteria`   | jsonb              | Enabled bonus criteria config (see §6.5) |
| `is_active`        | boolean            |                                          |
| `is_test`          | boolean            | Hidden from public lists                 |

#### `public.group_members`

| Column           | Type        | Description                       |
| ---------------- | ----------- | --------------------------------- |
| `id`             | uuid PK     |                                   |
| `group_id`       | uuid FK     |                                   |
| `user_id`        | uuid FK     |                                   |
| `role`           | text        | `'admin'` or `'member'`           |
| `total_points`   | int         | prediction_pts + ownership_pts    |
| `prediction_pts` | int         | From score predictions            |
| `ownership_pts`  | int         | From team wins/goals/clean sheets |
| `current_streak` | int         | Consecutive correct predictions   |
| `best_streak`    | int         | Historical best streak            |
| `weekly_pts`     | int         | Current week's points             |
| `elo_rating`     | int         | DEFAULT 1000 (league/competitive) |
| `survivor_lives` | int         | DEFAULT 1 (competitive/global)    |
| `is_eliminated`  | boolean     | Survivor mode                     |
| `rank`           | int         | Current leaderboard rank          |
| `joined_at`      | timestamptz |                                   |

UNIQUE constraint: `(group_id, user_id)`

#### `public.team_ownership`

| Column            | Type        | Description                         |
| ----------------- | ----------- | ----------------------------------- |
| `id`              | uuid PK     |                                     |
| `group_id`        | uuid FK     |                                     |
| `user_id`         | uuid FK     |                                     |
| `team_id`         | uuid FK     |                                     |
| `draft_pick`      | int         | Pick order in snake draft           |
| `wins_pts`        | int         | team_win_pts × wins                 |
| `goals_pts`       | int         | team_goal_pts × goals               |
| `clean_sheet_pts` | int         | team_clean_sheet_pts × clean sheets |
| `total_pts`       | int         | wins + goals + clean_sheet          |
| `assigned_at`     | timestamptz |                                     |

UNIQUE: `(group_id, team_id)` — one owner per team per group.

#### `public.team_match_events`

| Column         | Type    | Description   |
| -------------- | ------- | ------------- |
| `id`           | uuid PK |               |
| `match_id`     | uuid FK |               |
| `team_id`      | uuid FK |               |
| `goals_scored` | int     | DEFAULT 0     |
| `clean_sheet`  | boolean | DEFAULT false |
| `won`          | boolean | DEFAULT false |

UNIQUE: `(match_id, team_id)`

#### `public.predictions`

| Column           | Type              | Description                   |
| ---------------- | ----------------- | ----------------------------- |
| `id`             | uuid PK           |                               |
| `group_id`       | uuid FK           |                               |
| `user_id`        | uuid FK           |                               |
| `match_id`       | uuid FK           |                               |
| `predicted_home` | int               |                               |
| `predicted_away` | int               |                               |
| `result`         | prediction_result | DEFAULT 'pending'             |
| `points_earned`  | int               | Base prediction points        |
| `upset_pts`      | int               | Upset bonus points            |
| `bonus_pts`      | int               | Bonus criteria points         |
| `details`        | jsonb             | BonusPredictionDetails object |
| `submitted_at`   | timestamptz       |                               |

UNIQUE: `(group_id, user_id, match_id)` — one prediction per user per match per group.

#### `public.boosts`

| Column       | Type        | Description     |
| ------------ | ----------- | --------------- |
| `id`         | uuid PK     |                 |
| `group_id`   | uuid FK     |                 |
| `user_id`    | uuid FK     |                 |
| `boost_type` | boost_type  |                 |
| `match_id`   | uuid FK     | null = unplayed |
| `applied_at` | timestamptz |                 |
| `expires_at` | timestamptz |                 |
| `is_used`    | boolean     |                 |

#### `public.rivalries`

Weekly 1v1 head-to-head matchups.

| Column           | Type           | Description       |
| ---------------- | -------------- | ----------------- |
| `id`             | uuid PK        |                   |
| `group_id`       | uuid FK        |                   |
| `player_a_id`    | uuid FK        |                   |
| `player_b_id`    | uuid FK        |                   |
| `week_number`    | int            | ISO week number   |
| `competition_id` | uuid FK        |                   |
| `player_a_pts`   | int            |                   |
| `player_b_pts`   | int            |                   |
| `winner_id`      | uuid FK        | null while active |
| `status`         | rivalry_status |                   |

UNIQUE: `(group_id, player_a_id, player_b_id, week_number)`

#### `public.leaderboard_snapshots`

Historical weekly leaderboard for replays and share cards.

| Column                                                    | Description     |
| --------------------------------------------------------- | --------------- |
| `group_id`, `user_id`, `week_number`                      | Composite key   |
| `rank`, `total_points`, `prediction_pts`, `ownership_pts` | Snapshot values |

#### `public.streak_events`

Audit log of streak milestones and breaks.

#### `public.elo_history`

Per-match ELO change log. `delta` is a generated column (`elo_after - elo_before`).

#### `public.survivor_rounds` / `public.survivor_entries`

Tracks survivor mode elimination rounds. `survived` is null while round is active.

#### `public.brackets` / `public.bracket_matchups`

Tournament bracket structure. `next_matchup_id` enables bracket progression linking.

#### `public.daily_challenges` / `public.daily_challenge_entries`

Global mode daily challenge questions. `answer` is a flexible `jsonb` field.

#### `public.notifications`

| Column          | Description                                                                     |
| --------------- | ------------------------------------------------------------------------------- |
| `type`          | `lock_reminder`, `rivalry_result`, `rank_swing`, `boost_ready`, `streak_broken` |
| `title`, `body` | Notification text                                                               |
| `metadata`      | jsonb — contextual data for deep linking                                        |
| `is_read`       | boolean                                                                         |

#### `public.venues`

Stadium data with geolocation (`latitude`, `longitude`).

#### `public.draft_sessions`

| Column          | Description                               |
| --------------- | ----------------------------------------- |
| `group_id`      | UNIQUE FK — one session per group         |
| `member_order`  | `uuid[]` — member user IDs in draft order |
| `current_pick`  | 0-indexed overall pick counter            |
| `total_picks`   | Total teams to draft                      |
| `pick_deadline` | Current picker's 60-second window expiry  |

#### `public.draft_picks`

| Column        | Description                              |
| ------------- | ---------------------------------------- |
| `pick_number` | 0-indexed overall pick number            |
| `round`       | 1-based round                            |
| `auto_picked` | True if server auto-picked after timeout |

UNIQUE: `(group_id, pick_number)` and `(group_id, team_id)`.

#### `public.support_cases`

User-submitted support requests.

| Column     | Type                  | Description    |
| ---------- | --------------------- | -------------- |
| `category` | support_case_category |                |
| `subject`  | text                  |                |
| `message`  | text                  |                |
| `status`   | support_case_status   | DEFAULT 'open' |

### 6.4 Scoring Config (JSONB)

Default `scoring_config` on `groups`:

```json
{
  "exact_score_pts": 5,
  "correct_winner_pts": 3,
  "goal_difference_pts": 2,
  "team_win_pts": 4,
  "team_goal_pts": 1,
  "team_clean_sheet_pts": 3,
  "upset_base_pts": 5,
  "streak_bonus_threshold": 3,
  "streak_bonus_pts": 2,
  "elo_k_factor": 32,
  "survivor_lives": 1,
  "weekly_reset_enabled": true
}
```

All values are configurable per group by the admin.

### 6.5 Bonus Criteria Config (JSONB)

Default `bonus_criteria` on `groups`:

```json
{
  "enabled": [],
  "btts_pts": 2,
  "total_goals_over_pts": 2,
  "total_goals_threshold": 2.5,
  "ft_winner_pts": 2,
  "ht_winner_pts": 2,
  "clean_sheet_pts": 1
}
```

`enabled` is an array of `BonusCriterionKey` values: `"btts"`, `"total_goals_over"`, `"ft_winner"`, `"ht_winner"`, `"clean_sheet"`.

### 6.6 Naming Conventions

| Convention      | Rule                                                   |
| --------------- | ------------------------------------------------------ |
| Table names     | `snake_case`, plural                                   |
| Column names    | `snake_case`                                           |
| PKs             | `id uuid primary key default gen_random_uuid()`        |
| FKs             | `<table_singular>_id` pointing to `<table>.id`         |
| Timestamps      | `created_at`, `updated_at`, `*_at` for specific events |
| Booleans        | Prefixed `is_` or verb form (`auto_picked`, `is_used`) |
| Migration files | `YYYYMMDD_HHMMSS_description.sql`                      |

### 6.7 Validation Rules

| Field                 | Rule                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------- |
| `username`            | Unique, not null, profanity-checked (EN + ES dictionaries + leet-speak normalization) |
| `invite_code`         | 8 chars, auto-generated from `substr(md5(random()::text), 1, 8)`                      |
| `prediction_lock`     | Must be set and in the future for predictions to be accepted                          |
| `otp code`            | 6-digit numeric; max 5 failed attempts; expires in 10 minutes                         |
| `delivery_method`     | Must be `'email'` or `'sms'` (DB constraint)                                          |
| `predicted_home/away` | Non-negative integers                                                                 |
| `group.max_members`   | Default 50; admin-configurable                                                        |
| `draft pick deadline` | 60 seconds per turn                                                                   |

### 6.8 Key Indexes

```sql
-- Performance-critical indexes (defined in schema.sql)
matches(competition_id, match_date)
matches(status)
predictions(group_id, match_id)
predictions(user_id, group_id)
group_members(group_id, total_points DESC)  -- leaderboard
team_ownership(group_id, user_id)
team_ownership(group_id, team_id)
notifications(user_id, is_read, created_at DESC)
user_sessions(token_hash)
otp_requests(identifier, created_at DESC)
competitions(external_id)  -- football-data.org sync
```

### 6.9 RLS Policies Summary

| Table                              | Read               | Write                      |
| ---------------------------------- | ------------------ | -------------------------- |
| `profiles`                         | Public (all users) | Own row only               |
| `groups`                           | Group members      | Owner + admin              |
| `group_members`                    | Group members      | Self (join)                |
| `predictions`                      | Group members      | Own prediction before lock |
| `notifications`                    | Own rows only      | Server only                |
| `otp_requests`                     | None (server only) | Server only                |
| `user_sessions`                    | None (server only) | Server only                |
| `competitions`, `teams`, `matches` | Public             | Server only                |
| `venues`                           | Public             | Server only                |

---

## 7. API Reference

### 7.0 API Overview

#### Where the API Lives

| Artifact                 | Path                  | Purpose                                                                                                           |
| ------------------------ | --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Route implementation** | `api/index.ts`        | Single Express 5 / TypeScript file (~6,200 lines). All routes, middleware, and business logic live here.          |
| **OpenAPI spec**         | `api/swagger.yaml`    | OpenAPI 3.1.0 specification. Ground truth for all request/response shapes. Must stay in sync with `api/index.ts`. |
| **Shared types**         | `shared/api.ts`       | TypeScript interfaces shared by client and server. Canonical source for all data shapes.                          |
| **DB schema**            | `database/schema.sql` | PostgreSQL schema for Supabase. Canonical source for all table structures and enum values.                        |

#### Server & Base URL

| Environment | URL                         | Notes                                                                                               |
| ----------- | --------------------------- | --------------------------------------------------------------------------------------------------- |
| Development | `http://localhost:8080/api` | Vite dev server proxies `/api/*` → Express on port 8080. Single port for both frontend and backend. |
| Production  | `https://fanquin.com/api`   | Netlify functions or Node server. Same single-port model.                                           |

All endpoint paths in this document are **prefixed `/api/`**. In `swagger.yaml` the server base is `/api`, so paths there omit the prefix (e.g., `/groups` in swagger = `/api/groups` in the browser).

#### Authentication Schemes

| Scheme          | Header           | Value                         | Used By                      |
| --------------- | ---------------- | ----------------------------- | ---------------------------- |
| **BearerAuth**  | `Authorization`  | `Bearer <sessionToken>`       | All protected user endpoints |
| **AdminSecret** | `X-Admin-Secret` | Server env var `ADMIN_SECRET` | Admin-only endpoints         |

---

### 7.1 Authentication Guide

#### Step 1 — Check if the email is registered (optional)

```http
GET /api/auth/check-email?email=felix@example.com
```

Response: `{ success: true, exists: boolean }`  
Used by the UI to decide whether to show the "new account" profile form.

#### Step 2 — Request an OTP

```http
POST /api/auth/send-code
Content-Type: application/json

{ "identifier": "felix@example.com" }
```

Response: `{ success: true, message: "Code sent" }`  
Rate-limited to **5 requests per email per 15 minutes**. OTP expires in **10 minutes**.

#### Step 3 — Verify the OTP and obtain a session token

```http
POST /api/auth/verify-code
Content-Type: application/json

{
  "identifier": "felix@example.com",
  "code": "482910",
  "username": "felix",        // required for new users
  "first_name": "Felix",      // optional profile fields
  "last_name": "Gomez",
  "locale": "en"
}
```

Response:

```json
{
  "success": true,
  "sessionToken": "a3f91c...(96-char hex)",
  "user": { "id": "...", "username": "felix", "locale": "en", ... }
}
```

**Store the token:** `localStorage.setItem('fanquin_session', sessionToken)`  
Sessions expire after **30 days**.

#### Step 4 — Use the token on protected requests

```http
GET /api/groups
Authorization: Bearer a3f91c...(96-char hex)
```

---

### 7.2 Request / Response Conventions

All responses return JSON conforming to one of two shapes:

```typescript
// Success
{ success: true, ...data }

// Error
{ success: false, message: string, error?: string }
```

#### Common HTTP Status Codes

| Code  | Meaning                                                  |
| ----- | -------------------------------------------------------- |
| `200` | Success (GET, PATCH)                                     |
| `201` | Created (POST that creates a resource)                   |
| `400` | Validation error — malformed input                       |
| `401` | Missing, invalid, or expired session token               |
| `403` | Authenticated but not authorised (e.g., not group owner) |
| `404` | Resource not found                                       |
| `409` | Conflict (e.g., duplicate username, already a member)    |
| `429` | Rate limit exceeded                                      |
| `500` | Internal server error / external API failure             |

---

### 7.3 Using APIs from the Client (Redux Pattern)

**Rule:** All API calls from the frontend MUST go through Redux slices using `createAsyncThunk`. Never call `axios` directly inside a React component.

#### Minimal slice example

```typescript
// client/store/slices/groupsSlice.ts
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { RootState } from "@/store";
import { Group } from "@shared/api";

export const fetchGroups = createAsyncThunk(
  "groups/fetchAll",
  async (_, { getState }) => {
    const { sessionToken } = (getState() as RootState).auth;
    const { data } = await axios.get<{ success: true; data: Group[] }>(
      "/api/groups",
      { headers: { Authorization: `Bearer ${sessionToken}` } },
    );
    return data.data;
  },
);

const groupsSlice = createSlice({
  name: "groups",
  initialState: { items: [] as Group[], loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGroups.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchGroups.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.items = payload;
      });
  },
});
```

#### Dispatching from a component

```typescript
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchGroups } from "@/store/slices/groupsSlice";

function MyComponent() {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector((s) => s.groups);

  useEffect(() => { dispatch(fetchGroups()); }, [dispatch]);

  return loading ? <Spinner /> : <GroupList groups={items} />;
}
```

#### Import aliases

| Alias       | Resolves to |
| ----------- | ----------- |
| `@/*`       | `client/`   |
| `@shared/*` | `shared/`   |

---

### 7.4 Auth Endpoints

| Method | Path                       | Auth | Description                    |
| ------ | -------------------------- | ---- | ------------------------------ |
| `GET`  | `/api/ping`                | No   | Health check                   |
| `GET`  | `/api/auth/check-email`    | No   | Check if email is registered   |
| `GET`  | `/api/auth/check-username` | No   | Check if username is available |
| `POST` | `/api/auth/send-code`      | No   | Send 6-digit OTP to email      |
| `POST` | `/api/auth/verify-code`    | No   | Verify OTP, create session     |
| `GET`  | `/api/auth/validate`       | Yes  | Validate current session token |
| `POST` | `/api/auth/logout`         | Yes  | Revoke current session         |

**`POST /api/auth/send-code`**

```json
// Request
{ "identifier": "felix@example.com" }

// Response
{ "success": true, "message": "Code sent", "debug_code": 482910 }
```

`debug_code` is only present in development mode (`NODE_ENV !== "production"`).

**`POST /api/auth/verify-code`**

```json
// Request
{
  "identifier": "felix@example.com",
  "code": "482910",
  "username": "felix_mex",       // required for new users (3–30 chars, lowercase a-z 0-9 _)
  "first_name": "Felix",         // optional
  "last_name": "Gomez",          // optional
  "phone": "+52 55 1234 5678",   // optional
  "country": "MX",               // optional, ISO 3166-1 alpha-2
  "locale": "es"                 // optional, "en" | "es"
}

// Response
{
  "success": true,
  "sessionToken": "a3f91c...",   // 96-char hex, store as localStorage 'fanquin_session'
  "user": { /* UserProfile */ }
}
```

---

### 7.5 Profile Endpoints

| Method  | Path           | Auth | Description                |
| ------- | -------------- | ---- | -------------------------- |
| `GET`   | `/api/profile` | Yes  | Get current user's profile |
| `PATCH` | `/api/profile` | Yes  | Update profile fields      |

**`PATCH /api/profile`** — all fields optional:

```json
{
  "username": "felix_mex",
  "display_name": "Felix",
  "first_name": "Felix",
  "last_name": "Gomez",
  "phone": "+52 55 1234 5678",
  "country": "MX",
  "avatar_url": "https://...",
  "locale": "es"
}
```

---

### 7.6 Competition & Venue Endpoints

| Method | Path                            | Auth | Description                                    |
| ------ | ------------------------------- | ---- | ---------------------------------------------- |
| `GET`  | `/api/competitions`             | No   | List all active competitions                   |
| `GET`  | `/api/competitions/:id/teams`   | No   | List teams for a competition                   |
| `GET`  | `/api/competitions/:id/matches` | No   | List matches (filterable by `stage`, `status`) |
| `GET`  | `/api/venues`                   | No   | List all venues                                |

Query params for `/api/competitions/:id/matches`:

| Param    | Type   | Example                                       |
| -------- | ------ | --------------------------------------------- |
| `stage`  | string | `group`, `knockout`                           |
| `status` | string | `scheduled`, `live`, `completed`, `cancelled` |

---

### 7.7 Group Endpoints

| Method  | Path                             | Auth         | Description                                                                         |
| ------- | -------------------------------- | ------------ | ----------------------------------------------------------------------------------- |
| `GET`   | `/api/groups`                    | Yes          | List groups the user belongs to                                                     |
| `POST`  | `/api/groups`                    | Yes          | Create a new group                                                                  |
| `GET`   | `/api/groups/:id`                | Yes (member) | Get group details                                                                   |
| `PATCH` | `/api/groups/:id`                | Yes (owner)  | Update name / max_members / bonus_criteria (while `waiting`)                        |
| `PATCH` | `/api/groups/:id/bonus-criteria` | Yes (owner)  | Update bonus criteria only                                                          |
| `POST`  | `/api/groups/join`               | Yes          | Join a group by invite code                                                         |
| `PATCH` | `/api/groups/:id/start`          | Yes (owner)  | Start the group — initiates draft (snake) or assigns teams (random / balanced_tier) |
| `PATCH` | `/api/groups/:id/activate`       | Yes (owner)  | After snake draft completes, transition status → `active`                           |

**Group lifecycle:** `waiting` → (snake: `draft` →) `active` → `completed`

**`POST /api/groups`**

```json
// Request
{
  "name": "World Cup 2026 Boys",
  "competition_id": "uuid",
  "mode": "friends",             // casual | friends | league | competitive | global | ownership
  "draft_type": "snake",         // snake | random | balanced_tier
  "max_members": 20,
  "bonus_criteria": { "enabled": ["btts", "ft_winner"], "btts_pts": 3, "ft_winner_pts": 2 }
}

// Response 201
{ "success": true, "data": { /* Group */ } }
```

**`POST /api/groups/join`**

```json
// Request
{ "invite_code": "ABC123" }
```

---

### 7.8 Draft Endpoints

Only relevant when the group has `draft_type: "snake"` and `status: "draft"`. See §4.5 and §1.4.

| Method  | Path                                        | Auth                      | Description                                                            |
| ------- | ------------------------------------------- | ------------------------- | ---------------------------------------------------------------------- |
| `GET`   | `/api/groups/:id/draft`                     | Yes (member)              | Get full draft state (session + all picks + available teams + members) |
| `POST`  | `/api/groups/:id/picks`                     | Yes (current picker only) | Submit a team pick                                                     |
| `PATCH` | `/api/groups/:id/members/:userId/auto-pick` | Yes (owner)               | Enable/disable auto-pick for a member                                  |

**`GET /api/groups/:id/draft`** — returns `DraftState`:

```json
{
  "session": {
    "group_id": "uuid",
    "member_order": ["user-uuid-1", "user-uuid-2"],
    "current_pick": 3,
    "total_picks": 16,
    "pick_deadline": "2026-01-01T15:00:00Z",
    "current_picker_id": "user-uuid-2",
    "round": 2,
    "is_complete": false
  },
  "picks": [
    /* DraftPick[] ordered by pick_number */
  ],
  "available_teams": [
    /* Team[] not yet picked */
  ],
  "members": [
    /* GroupMember[] with auto_pick flag */
  ]
}
```

**`POST /api/groups/:id/picks`** — only valid on your turn, must submit within 60 s:

```json
// Request
{ "team_id": "uuid" }

// Response 201
{ "success": true, "pick": { /* DraftPick */ }, "next_picker_id": "uuid" }
```

---

### 7.9 Prediction Endpoints

| Method | Path                          | Auth | Description                                                     |
| ------ | ----------------------------- | ---- | --------------------------------------------------------------- |
| `GET`  | `/api/groups/:id/predictions` | Yes  | Get user's predictions for a group                              |
| `POST` | `/api/predictions`            | Yes  | Submit or update a prediction (locks at `prediction_lock` time) |

**`POST /api/predictions`**

```json
// Request
{
  "group_id": "uuid",
  "match_id": "uuid",
  "predicted_home": 2,
  "predicted_away": 1,
  "details": {
    "btts": true,
    "ft_winner": "home",
    "ht_winner": "home",
    "total_goals_over": true,
    "clean_sheet": "home"
  }
}

// Response 200/201
{ "success": true, "prediction": { /* Prediction */ } }
```

`details` is only evaluated if the group has the corresponding `bonus_criteria.enabled` items. Predictions can be updated up until `match.prediction_lock`. Outcome (`result` field) is set automatically after the match completes via `POST /api/sync-matches`.

---

### 7.10 Leaderboard & Ownership Endpoints

| Method | Path                          | Auth         | Description                                                   |
| ------ | ----------------------------- | ------------ | ------------------------------------------------------------- |
| `GET`  | `/api/groups/:id/leaderboard` | Yes (member) | Full leaderboard with prediction + ownership points breakdown |
| `GET`  | `/api/groups/:id/ownership`   | Yes (member) | Team ownership board — who owns each team and their points    |

**Leaderboard response** returns `LeaderboardEntry[]`:

```json
[
  {
    "rank": 1,
    "user_id": "uuid",
    "username": "felix_mex",
    "total_points": 42,
    "prediction_pts": 28,
    "ownership_pts": 14,
    "current_streak": 3,
    "elo_rating": 1082
  }
]
```

---

### 7.11 Live Endpoints

| Method | Path                | Auth     | Description                                                                           |
| ------ | ------------------- | -------- | ------------------------------------------------------------------------------------- |
| `GET`  | `/api/live`         | Optional | Live + upcoming + recent matches. Enriched with user predictions when authenticated.  |
| `POST` | `/api/sync-matches` | Yes      | Pull match updates from football-data.org, score predictions, award ownership points. |

**`GET /api/live`** — query params:

| Param            | Type | Description                                       |
| ---------------- | ---- | ------------------------------------------------- |
| `competition_id` | uuid | Scope to a competition (defaults to first active) |

Returns `LivePageData` with three match bands (`live`, `upcoming`, `recent`) plus `my_active_groups` (authenticated only).  
This endpoint **never calls an external API** — it only reads the database. Call `POST /api/sync-matches` first if fresh data is needed.

**`POST /api/sync-matches`** — rate-limited to once per 5 minutes per competition. Requires `FOOTBALL_DATA_API_KEY` env var. Returns `SyncResult` summary.

---

### 7.12 Notification Endpoints

| Method  | Path                          | Auth | Description                        |
| ------- | ----------------------------- | ---- | ---------------------------------- |
| `GET`   | `/api/notifications`          | Yes  | Get user's notifications           |
| `PATCH` | `/api/notifications/:id/read` | Yes  | Mark a single notification as read |
| `PATCH` | `/api/notifications/read-all` | Yes  | Mark all as read                   |

Notification types: `lock_reminder`, `rivalry_result`, `rank_swing`, `boost_ready`, `streak_broken`.

---

### 7.13 Legal Endpoints

| Method | Path               | Auth | Description                                          |
| ------ | ------------------ | ---- | ---------------------------------------------------- |
| `GET`  | `/api/legal/:type` | No   | Get legal document — `:type` is `privacy` or `terms` |

Returns `LegalDocument` with `content` in Markdown format.

---

### 7.14 Support Endpoints

| Method | Path                 | Auth | Description           |
| ------ | -------------------- | ---- | --------------------- |
| `POST` | `/api/support/cases` | Yes  | Submit a support case |

**`POST /api/support/cases`**

```json
// Request
{
  "category": "scoring", // account | group | predictions | scoring | technical | billing | other
  "subject": "Points not awarded after match ended",
  "message": "The Mexico vs Brazil match completed 3 hours ago..."
}
```

---

### 7.15 Admin Endpoints

Require `X-Admin-Secret: <ADMIN_SECRET>` header instead of BearerAuth.

| Method | Path                           | Auth  | Description                      |
| ------ | ------------------------------ | ----- | -------------------------------- |
| `POST` | `/api/admin/test-league/reset` | Admin | Reset test league data           |
| `POST` | `/api/admin/weekly-reset`      | Admin | Trigger weekly leaderboard reset |

---

### 7.16 Swagger / OpenAPI

The full **OpenAPI 3.1.0** specification is maintained at `api/swagger.yaml`.

- All schemas match `shared/api.ts` and `database/schema.sql`
- All endpoint descriptions reference the relevant §§ in this document
- **Rule:** Any change to `api/index.ts` routes or request/response shapes must be reflected in `swagger.yaml` immediately, and vice versa
- The spec can be rendered with any OpenAPI viewer (Swagger UI, Redoc, Stoplight, etc.)

---

## 8. State Management

### 8.1 Store Structure

```typescript
store.getState() = {
  auth: AuthState,
  groupWizard: GroupWizardState,
  groups: GroupsState,
  draft: DraftState,
  live: LiveState,
  predictions: PredictionsState,
  survivor: SurvivorState,
  notifications: NotificationsState,
  legal: LegalState,
  support: SupportState,
};
```

### 8.2 Slice Responsibilities

| Slice           | File                    | Responsibility                                       |
| --------------- | ----------------------- | ---------------------------------------------------- |
| `auth`          | `authSlice.ts`          | Session token, user profile, login/logout, bootstrap |
| `groupWizard`   | `groupWizardSlice.ts`   | Multi-step group creation wizard state               |
| `groups`        | `groupsSlice.ts`        | User's groups, group detail, leaderboard, ownership  |
| `draft`         | `draftSlice.ts`         | Draft session, picks, available teams                |
| `live`          | `liveSlice.ts`          | Live/upcoming/recent matches + user predictions      |
| `predictions`   | `predictionsSlice.ts`   | Prediction submission and retrieval                  |
| `survivor`      | `survivorSlice.ts`      | Survivor mode rounds and entries                     |
| `notifications` | `notificationsSlice.ts` | In-app notifications + unread count                  |
| `legal`         | `legalSlice.ts`         | Legal document content                               |
| `support`       | `supportSlice.ts`       | Support case submission                              |

### 8.3 Auth Slice Detail

```typescript
interface AuthState {
  sessionToken: string | null; // stored in localStorage as 'fanquin_session'
  userProfile: UserProfile | null;
  profileLoading: boolean; // true while bootstrapAuth is in-flight
}
```

Key actions:

- `bootstrapAuth` (thunk): runs on app mount, validates stored token via `GET /api/profile`
- `setAuth`: sets token + profile, persists to localStorage
- `clearAuth`: clears token + profile, removes from localStorage

Language persistence:

- `fanquin_lang` localStorage key stores explicit language preference
- Never derived from `profile.locale` (which defaults to `'en'` in DB)
- Set on first sign-in; applied on every `bootstrapAuth.fulfilled`

### 8.4 Redux Patterns

```typescript
// ✅ CORRECT: data fetching in slice
export const fetchGroups = createAsyncThunk(
  "groups/fetch",
  async (_, { getState }) => {
    const { sessionToken } = (getState() as RootState).auth;
    const { data } = await axios.get("/api/groups", {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    return data.data;
  },
);

// ❌ WRONG: axios in component
useEffect(() => {
  axios.get("/api/groups").then(setGroups); // NEVER DO THIS
}, []);
```

### 8.5 React Query Usage

`@tanstack/react-query` (`QueryClient`) is configured but used only for supplementary caching patterns. The primary data fetching mechanism is Redux + `createAsyncThunk`.

---

## 9. Content & Internationalization

### 9.1 Supported Languages

| Code | Language | Locale file                   |
| ---- | -------- | ----------------------------- |
| `en` | English  | `client/i18n/locales/en.json` |
| `es` | Spanish  | `client/i18n/locales/es.json` |

Default language on first load: **Spanish (`es`)** (configured in `client/i18n/index.ts`).

### 9.2 i18n Rules (Mandatory)

1. **Never hardcode** user-facing strings — every label, message, placeholder, error, or button text MUST use `t("key")`
2. Always import the hook: `const { t } = useTranslation();`
3. Add every new key to **both** `en.json` and `es.json` simultaneously
4. Never use `defaultValue` fallback as a substitute for proper locale keys
5. Yup validation messages MUST use `t("key")`

### 9.3 Key Naming Convention

```
"<screen/feature>.<element>"
"<screen/feature>.<subsection>.<element>"
```

Examples:

- `"login.continue"` — Sign-in screen continue button
- `"nav.home"` — Navigation home link
- `"groupHub.leaderboard.title"` — Group hub leaderboard section title
- `"index.hero.title"` — Landing page hero heading
- `"profile.save_changes"` — Profile save button

### 9.4 Language Toggle

Language can be changed at runtime via `i18n.changeLanguage(lang)`. The selected language is persisted to `localStorage` under key `fanquin_lang`.

### 9.5 Email i18n

Email templates in `api/index.ts` have their own separate `emailCopy` object (not the JSON locale files) with `en` and `es` variants. The `t(locale)` helper function selects the correct copy object. The email template language defaults to `'es'` when no locale is specified.

### 9.6 Content Voice & Tone

- **Voice:** Energetic, competitive, social — like a knowledgeable friend who loves football
- **Tone:** Confident, direct, slightly playful. Never formal or corporate.
- **Emoji usage:** Allowed in email templates and marketing copy. Sparingly in UI labels.
- **Numbers:** Point values always written as "+N pts" (e.g., "+5 pts")
- **Gambling disclaimer:** Always included in footer on pages that describe scoring or prizes

---

## 10. Performance & Best Practices

### 10.1 Loading Performance

- Vite code splitting by route (React lazy loading with `React.lazy` + `Suspense` where applicable)
- Google Fonts loaded with `display=swap` to prevent FOUT
- Custom fonts use `font-display: swap`
- Images: serve via CDN URLs (never generate blob URLs from APIs)
- Skeleton components shown immediately during async data loads

### 10.2 Rendering Performance

- `ScrollToTop` prevents stale scroll positions on navigation
- `QueryClient` caches API responses to avoid redundant refetches
- `useIsMobile()` hook uses media query listener — not resize handler

### 10.3 SEO

- `react-helmet-async` provides `<title>` and `<meta>` tags per page via `PageMeta` component
- `public/robots.txt` controls crawler access
- All routes are client-side (SPA) — server-side rendering is not used
- Open Graph meta tags should be set per page for social sharing

### 10.4 Bundle Size

- Radix UI components are tree-shaken — only import used components
- `lucide-react` supports named imports for tree-shaking
- `three.js` / `@react-three/fiber` is a devDependency for any 3D effects — ensure it is only used where needed

---

## 11. Security

### 11.1 Authentication Security

- OTP codes: hashed with bcrypt (`crypt(code, gen_salt('bf'))`) before DB storage
- Session tokens: 96-char hex, stored as SHA-256 hash in DB
- Token expiry: 30 days; revocable on logout
- OTP expiry: 10 minutes; max 5 failed attempts
- Rate limiting: OTP enforced by IP and identifier in `otp_requests`
- Never log tokens or OTP codes in production

### 11.2 Input Validation

- Usernames: profanity-checked using `leo-profanity` (EN + ES) with leet-speak normalization
- All API inputs validated server-side before DB operations
- Zod (`zod` package) available for runtime schema validation
- SQL injection: prevented by Supabase parameterized queries (never string concatenation)

### 11.3 Access Control

- All business logic runs server-side using Supabase service role key
- Client never receives or uses the service role key
- RLS policies enforce data isolation between users/groups
- Admin endpoints protected (check admin role or internal secret)
- `is_test` flag on competitions and groups prevents test data leaking to users

### 11.4 Security Headers

- CORS configured via `cors()` middleware
- `.env` files and `*.{crt,pem}` files explicitly denied from Vite dev server `fs` access
- No sensitive values committed to repository

### 11.5 OWASP Top 10 Compliance

| Risk                          | Mitigation                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------- |
| A01 Broken Access Control     | RLS on all tables; requireAuth middleware; ownership checks in routes         |
| A02 Cryptographic Failures    | bcrypt for OTP; SHA-256 for session tokens; HTTPS enforced in production      |
| A03 Injection                 | Supabase parameterized queries; no string SQL concatenation                   |
| A04 Insecure Design           | Session expiry; OTP attempt limits; server-side scoring computation           |
| A05 Security Misconfiguration | ENV validation on startup; explicit Vite fs deny rules                        |
| A06 Vulnerable Components     | Regular npm audit; no unreviewed dependencies                                 |
| A07 Auth Failures             | Short OTP window; token revocation; no credential storage                     |
| A08 Data Integrity Failures   | Server-side business logic; no client-side score computation                  |
| A09 Logging Failures          | Use `logger` utilities from `client/utils/logger.ts` in UI; never log secrets |
| A10 SSRF                      | No user-controlled URLs fetched server-side                                   |

---

## 12. Governance & Scalability

### 12.1 Adding a New Page

1. Create `client/pages/NewPage.tsx` with `PageMeta` component for SEO
2. Add route to `client/App.tsx` under `<Route element={<AppShell />}>`
3. Add navigation links to `app-shell.tsx` if needed
4. Add all user-facing strings to both `en.json` and `es.json`
5. Create a Redux slice in `client/store/slices/` if the page fetches data
6. Register new reducer in `client/store/index.ts`

### 12.2 Adding a New API Endpoint

1. Add the Express route handler in `api/index.ts`
2. Add request/response types to `shared/api.ts`
3. Update `api/swagger.yaml` to document the new endpoint
4. Create a `createAsyncThunk` in the appropriate Redux slice
5. Add `Authorization` header to the axios call if endpoint requires auth

### 12.3 Adding a Database Table

1. **Never modify `database/schema.sql` directly**
2. Create a migration file: `database/supabase/migrations/YYYYMMDD_HHMMSS_description.sql`
3. Add `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` to migration
4. Add RLS policies appropriate to data access patterns
5. Add necessary indexes for query patterns
6. If using the new table from the server, add any new TypeScript types to `shared/api.ts`

### 12.4 Adding a New Competition

1. Insert into `public.competitions` (via admin endpoint or migration)
2. Insert teams into `public.teams` with correct `competition_id` and `tier` values
3. Sync matches via the football-data.org external sync mechanism (sets `external_id`)
4. Set `is_active = true` to make competition visible to users

### 12.5 Adding a UI Component

1. Check `client/components/ui/` first — use an existing component if available
2. If building a new generic element, create it in `client/components/ui/` following the shadcn/ui pattern (Radix primitive + TailwindCSS)
3. App-specific components (not reusable primitives) go in `client/components/fanquin/`
4. All new strings must use `t()` — zero hardcoded copy

### 12.6 Extending the Scoring System

The `scoring_config` JSONB on `groups` is intentionally schema-free for extensibility. To add a new scoring event:

1. Add the new config key with a default value to the JSONB default in `schema.sql`
2. Create a migration to `ALTER TABLE groups ALTER COLUMN scoring_config SET DEFAULT ...`
3. Add the computation logic in the sync/scoring route in `api/index.ts`
4. Add the UI display in the group settings page and scoring explainer page
5. Add i18n keys for the new scoring label

### 12.7 Database Migration Process

Migration files follow the naming pattern: `YYYYMMDD_HHMMSS_description.sql`

Target MySQL compatibility note: migrations must be written for Supabase PostgreSQL (primary) but when deploying to HostGator MySQL 8.0, ensure SQL syntax compatibility. Use ANSI-standard SQL where possible.

### 12.8 Logger Usage

In any client-side UI code (`client/`), debugging statements MUST use the logger utilities from `client/utils/logger.ts`:

```typescript
import { logger } from "@/utils/logger";
logger.info("message", data);
logger.error("error context", error);
```

Never use `console.log` or `console.error` directly in client code. Backend (`api/index.ts`) and `lib/` folder code may use console methods directly.

### 12.9 Versioning

- API versioning: currently unversioned (`/api/`). Breaking changes require a new version prefix (`/api/v2/`) and backwards compatibility period.
- Schema versioning: managed via migration files with timestamps
- This document: update version header and "Last updated" date on any significant change

---

## 13. Back-Office Admin Panel

FanQuin includes a full back-office admin panel accessible only to users with `profiles.is_admin = true`. The panel is completely isolated from the regular user experience — separate auth state, separate Redux slice, separate routes.

### 13.1 Access Point

A subtle **"BO"** link is embedded in the bottom-right of the app footer (`app-shell.tsx`). It navigates to `/admin/login` and is intentionally low-visibility (10% opacity, hover to 40%).

### 13.2 Authentication

Admin auth reuses the exact same OTP infrastructure as the regular user flow:

| Step | Action                                                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Admin navigates to `/admin/login` and enters their email                                                                        |
| 2    | Frontend dispatches `adminSendCode(email)` → `POST /api/admin/auth/send-code`                                                   |
| 3    | Backend silently checks `profiles.is_admin = true` for that email. If not admin, returns generic success (prevents enumeration) |
| 4    | Admin receives 6-digit OTP via Resend email                                                                                     |
| 5    | Admin enters OTP → `adminVerifyCode({email, code})` → `POST /api/admin/auth/verify-code`                                        |
| 6    | Backend verifies OTP + confirms `is_admin = true`, creates a 30-day `user_sessions` row, returns `sessionToken`                 |
| 7    | Token stored in `localStorage` key `fanquin_admin_token`                                                                        |

**Granting admin access** (run once in Supabase SQL editor):

```sql
UPDATE public.profiles SET is_admin = true WHERE username = 'your_admin_username';
```

**`requireAdmin` middleware** validates every protected route:

1. Extracts Bearer token from `Authorization` header
2. Looks up token hash in `user_sessions` table
3. Verifies `profiles.is_admin = true` for the session owner
4. Returns 401/403 on any failure

### 13.3 Admin State (Redux)

The admin panel has its own independent Redux slice (`client/store/slices/adminSlice.ts`) registered as `state.admin`. It is completely separate from `state.auth`.

Key state fields: `adminToken`, `isAuthenticated`, `adminProfile`, `loginStep`, `loginEmail`, `loginLoading`, `loginError`, plus separate loading/data fields for each admin section (users, sessions, competitions, teams, matches, venues, groups, predictions, notifications, otpRequests, services).

### 13.4 Route Guard

`RequireAdmin` component in `client/App.tsx` wraps all `/admin/*` routes (except `/admin/login`). Unauthenticated requests redirect to `/admin/login`.

### 13.5 Admin Sections

| Section              | Route                  | Description                                                                                                                       |
| -------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard            | `/admin`               | Aggregated platform stats (users, groups, matches, predictions)                                                                   |
| Users                | `/admin/users`         | Paginated, debounced-search user table. Edit profile fields or hard-delete (cascades auth + profile)                              |
| Competitions + Teams | `/admin/competitions`  | Full CRUD for competitions. Click a competition to manage its teams                                                               |
| Matches              | `/admin/matches`       | Full CRUD. Filter by competition and status (scheduled / live / completed / cancelled)                                            |
| Groups               | `/admin/groups`        | Paginated group table. Edit config (mode, scoring toggles, max members) or delete (cascades members + predictions)                |
| Venues               | `/admin/venues`        | Full CRUD for match venues (small list, no pagination)                                                                            |
| Predictions          | `/admin/predictions`   | Read-only paginated log. Result badges: gold=exact score, green=correct winner, blue=goal difference, red=incorrect, gray=pending |
| Notifications        | `/admin/notifications` | Paginated list. Send bulk notifications — leave `user_ids` empty to target all users                                              |
| OTP Audit            | `/admin/otp-requests`  | Read-only log of all OTP send/verify attempts with email, IP, and timestamps                                                      |
| **Services**         | `/admin/services`      | Real-time health monitoring of external integrations (see §13.6)                                                                  |

### 13.6 Services Monitoring

`GET /api/admin/services/health` pings each integration in parallel (5 s timeout each) and returns:

| Service               | Check                                 |
| --------------------- | ------------------------------------- |
| **Supabase**          | PostgreSQL `SELECT 1` query           |
| **Football Data API** | `GET /v4/competitions` with API token |
| **Resend**            | `GET /domains` with API key           |

Each result contains `name`, `status` (`healthy` / `degraded` / `down`), `latency_ms`, `message`, and `checked_at`.

The Services page (`AdminServices.tsx`) displays an animated status dot (green ping = healthy, yellow = degraded, red = down), latency badge, and an overall banner. There is a manual Refresh button.

### 13.7 Navigation

`admin-shell.tsx` provides the sidebar layout with the following nav items: Dashboard, Users, Competitions, Matches, Groups, Predictions, Venues, Notifications, OTP Audit, Services. Logout dispatches `adminLogout()` and clears `localStorage`.

---

_End of FanQuin Product System Reference v1.0_
