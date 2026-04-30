# FanQuin — Apple App Store Submission Guide

> **Version:** 1.0 · **Date:** 2026-04-29
> **Owner:** Submission team
> **Status:** Draft — fill in all `[TODO]` fields before submitting

---

## Table of Contents

1. [App Identity](#1-app-identity)
2. [App Store Listing Copy](#2-app-store-listing-copy)
3. [Age Rating & Content](#3-age-rating--content)
4. [Privacy Policy & Data Use](#4-privacy-policy--data-use)
5. [App Review Information](#5-app-review-information)
6. [Screenshot & Preview Requirements](#6-screenshot--preview-requirements)
7. [Export Compliance](#7-export-compliance)
8. [Submission Checklist](#8-submission-checklist)
9. [Manual QA Verification Guide](#9-manual-qa-verification-guide)

---

## 1. App Identity

| Field                       | Value                                        |
| --------------------------- | -------------------------------------------- |
| **App Name**                | FanQuin                                      |
| **Subtitle** (30 chars max) | Fantasy Predictions & Quiniela               |
| **Bundle ID**               | `[TODO: com.fanquin.app]`                    |
| **SKU**                     | `[TODO: FANQUIN-001]`                        |
| **Primary Language**        | Spanish (Mexico)                             |
| **Secondary Language**      | English (U.S.)                               |
| **Platform**                | iOS (iPhone + iPad)                          |
| **Category**                | Sports (Primary) · Entertainment (Secondary) |
| **Copyright**               | © 2026 FanQuin. All rights reserved.         |
| **Apple Developer Account** | `[TODO: Apple Team ID]`                      |

---

## 2. App Store Listing Copy

### 2.1 Description (4000 chars max)

```
FanQuin — La quiniela social definitiva para fútbol.

Únete a grupos privados con amigos, elige tus equipos en un draft en vivo y predice los marcadores de cada partido del Mundial 2026.

🏆 QUINIELA + OWNERSHIP
• Predice resultados: marcador exacto, ganador, diferencia de goles y más.
• Haz draft de selecciones nacionales reales — sus victorias te dan puntos automáticamente.
• Desbloquea bonos de racha por predicciones consecutivas correctas.

👥 GRUPOS PRIVADOS
• Crea o únete a grupos de 2 a 100 jugadores con código de invitación.
• Sin feed público, sin extraños — solo tus amigos y familia.
• 6 modos de juego: Casual, Amigos, Liga, Competitivo, Global, Ownership.

⚡ JUEGO EN VIVO
• Las predicciones se cierran al inicio de cada partido.
• Puntos de ownership se actualizan automáticamente tras cada resultado.
• Rivalidades semanales 1v1 entre miembros del grupo.

🔒 SEGURO Y PRIVADO
• Inicio de sesión solo con código OTP por correo — sin contraseñas.
• Grupos 100% privados por código de invitación.
• Tus datos nunca se venden ni comparten.

PRÓXIMAMENTE: Champions League, Premier League, Liga MX, NBA y NFL.

Descarga FanQuin y empieza tu quiniela ahora.
```

### 2.2 Promotional Text (170 chars max — updatable without re-review)

```
¡El Mundial 2026 ya está aquí! Crea tu grupo, haz tu draft y predice los marcadores. La mejor quiniela social, gratis.
```

### 2.3 Keywords (100 chars max, comma-separated)

```
quiniela,mundial,predicciones,futbol,fantasy,grupos,draft,puntos,apuestas,deportes,score
```

### 2.4 Support URL

`[TODO: https://fanquin.com/support]`

### 2.5 Marketing URL

`https://fanquin.com`

### 2.6 Privacy Policy URL

`[TODO: https://fanquin.com/legal/privacy]`

---

## 3. Age Rating & Content

### Questionnaire Answers (App Store Connect)

| Question                               | Answer |
| -------------------------------------- | ------ |
| Cartoon or fantasy violence            | No     |
| Realistic violence                     | No     |
| Prolonged graphic or sadistic violence | No     |
| Profanity or crude humor               | No     |
| Mature/suggestive themes               | No     |
| Horror/fear themes for children        | No     |
| Medical/treatment information          | No     |
| Alcohol, tobacco or drug use           | No     |
| Simulated gambling                     | **No** |
| Gambling (real money)                  | No     |
| Sexual content or nudity               | No     |
| Unrestricted web access                | No     |
| User-generated content (UGC)           | Yes    |

> **Important note on gambling:** FanQuin is a **skill-based prediction game** with no real-money wagering, no virtual currency purchases, and no prize payouts. Select **No** for all gambling questions. The app earns points for football knowledge, not chance.

> **This is NOT a casino app.** FanQuin is a free-to-play social game for football fans. There is no betting, no wagering, no chips, no tokens, no in-app currency, and no real or virtual prizes. Points exist purely for fun and friendly competition within private groups.

### Resulting Rating

**4+** (recommended — no objectionable content)

---

## 4. Privacy Policy & Data Use

### 4.1 Data Collected

| Data Type          | Purpose                                | Linked to User? | Used for Tracking? |
| ------------------ | -------------------------------------- | --------------- | ------------------ |
| Email address      | Account creation, OTP authentication   | Yes             | No                 |
| Name               | Display in group leaderboards          | Yes             | No                 |
| Phone number       | Optional profile field, future SMS OTP | Yes             | No                 |
| Country            | Locale and team selection defaults     | Yes             | No                 |
| Usage data         | App analytics, crash reporting         | No              | No                 |
| Device identifiers | Session management                     | No              | No                 |

### 4.2 Data NOT Collected

- Location data
- Browsing history
- Purchases / financial info
- Health & fitness data
- Contacts
- Photos or media

### 4.3 App Tracking Transparency

FanQuin does **not** use any third-party ad networks or cross-app tracking. ATT prompt is **not required**.

### 4.4 Privacy Nutrition Label (App Store Connect → "App Privacy")

| Section                | Selection                   |
| ---------------------- | --------------------------- |
| Data Used to Track You | None                        |
| Data Linked to You     | Email, Name, Phone, User ID |
| Data Not Linked to You | Usage Data, Crash Data      |

---

## 5. App Review Information

### 5.1 Demo Account — Apple App Store Review

Provide these credentials in App Store Connect → **App Review Information → Sign-In Information**.

| Field                   | Value              |
| ----------------------- | ------------------ |
| **Email / Username**    | `test@fanquin.com` |
| **OTP Code (password)** | `123456`           |
| **Full Name**           | Hugo Sanchez       |
| **Country**             | Mexico (MX)        |

> **How login works:** FanQuin uses passwordless OTP authentication. When `test@fanquin.com` is entered, the app sends an OTP request and then asks for the code. Enter `123456` — this static code is permanently accepted for this account and bypasses the live email delivery requirement. No email access is needed.

### 5.2 Notes for Apple Reviewer

```
FanQuin uses email-based OTP (one-time password) for authentication —
no traditional username/password is used.

To log in during review:
1. Open the app and tap "Continue with Email" (or enter your email on the login screen).
2. Enter: test@fanquin.com
3. Tap "Send Code".
4. When prompted for the 6-digit code, enter: 123456
5. You will be logged in as "Hugo Sanchez" and can explore all features.

This account is pre-populated with:
- Group "Amigos del Mundial 🌍" (World Cup 2026, friends mode, 5 members)
- 3 completed match predictions with scored results (exact score, correct winner, goal difference)
- 2 upcoming matches with open prediction slots
- Full leaderboard with 5 members ranked by points
- Team ownership draft (MEX, ARG, BRA, FRA, GER)
- Completed Week 1 rivalry vs Carlos Vela

The app requires an internet connection to load live match data.

IMPORTANT — This is NOT a casino or gambling app.
FanQuin is a free-to-play social prediction game for football fans.
There is no real-money betting, no wagering, no in-app currency,
no chips, and no prizes of any kind. Points are earned for football
knowledge and are used only for friendly competition within
private, invite-only groups. The app is intended purely for fun.
```

### 5.3 Deep Links / Special URLs

| URL                              | Description                                                     |
| -------------------------------- | --------------------------------------------------------------- |
| `https://fanquin.com/join`       | Join a group via invite code (requires login)                   |
| `https://fanquin.com/deactivate` | Self-service account deactivation (works without login via OTP) |

---

## 6. Screenshot & Preview Requirements

### 6.1 Required Screenshot Sizes

| Device                          | Size (px)   | Quantity |
| ------------------------------- | ----------- | -------- |
| iPhone 6.9" (iPhone 16 Pro Max) | 1320 × 2868 | 3–10     |
| iPhone 6.7" (iPhone 15 Plus)    | 1290 × 2796 | 3–10     |
| iPhone 6.5" (iPhone 11 Pro Max) | 1242 × 2688 | 3–10     |
| iPad Pro 13" (M4)               | 2064 × 2752 | 3–10     |

> Providing 6.9" and iPad Pro 13" covers all iPhone and iPad sizes via auto-scaling.

### 6.2 Recommended Screenshot Sequence

1. **Hero** — Live group leaderboard (score predictions, ownership points)
2. **Login** — OTP email screen (clean, passwordless)
3. **Draft** — Live snake draft picking national teams
4. **Predictions** — Match card with score inputs and bonus criteria
5. **Scoring** — Points breakdown after a match result
6. **Groups** — My Groups list with invite code

### 6.3 App Preview Video (Optional but Recommended)

- Duration: 15–30 seconds
- Format: H.264 .mp4
- Show the core loop: Login → Group → Draft → Predict → Leaderboard

---

## 7. Export Compliance

| Question                                                              | Answer |
| --------------------------------------------------------------------- | ------ |
| Does the app use encryption beyond what is in the OS/platform?        | No     |
| Does the app qualify for the French encryption declaration exemption? | N/A    |

> FanQuin uses standard HTTPS/TLS (provided by the OS/Vercel) and bcrypt for local password hashing (server-side only). No proprietary or exportable encryption algorithms are implemented in the app binary.

**Export Compliance Answer in App Store Connect:** Select **"No"** for the encryption question.

---

## 8. Submission Checklist

### 8.1 Pre-Submission

- [ ] All `[TODO]` fields in this document filled in
- [ ] Bundle ID registered in Apple Developer Portal
- [ ] App Store Connect app record created
- [ ] Privacy Policy live at the support URL
- [ ] Terms of Service live at the app's legal URL
- [ ] Production build signed with Distribution certificate
- [ ] App version and build number set correctly in Xcode
- [ ] All required screenshot sizes uploaded
- [ ] Age rating questionnaire completed (result: 4+)
- [ ] Privacy nutrition labels filled in
- [ ] Demo account credentials entered in Review Information
- [ ] Reviewer notes written (§5.2)
- [ ] Export compliance answered (No)
- [ ] Test user migration `20260429_000002_apple_review_test_user.sql` run in production Supabase
- [ ] Test data migration `20260429_000003_apple_review_test_data.sql` run in production Supabase

### 8.2 App Review Common Rejection Reasons to Avoid

| Guideline                       | Risk                                 | Mitigation                                     |
| ------------------------------- | ------------------------------------ | ---------------------------------------------- |
| 2.1 App Completeness            | Broken features during review        | Run full QA (§9) before submitting             |
| 4.0 Design                      | Non-standard or broken UI            | Test on real device, not only simulator        |
| 5.1.1 Privacy — Data Collection | Missing or inaccurate privacy labels | Cross-check §4 against actual data collected   |
| 5.1.2 Data Use                  | Privacy policy missing or vague      | Ensure privacy policy URL is live and complete |
| 3.1.1 In-App Purchase           | Paid features not using IAP          | FanQuin has no paid features — N/A             |
| 1.4.3 Physical Harm             | Real-money gambling claim            | Clearly state skill-based game in notes (§5.2) |

---

## 9. Manual QA Verification Guide

> Run this guide end-to-end on a **real iPhone** (not Simulator) before each App Store submission.

### 9.1 Environment

- Device: iPhone (any model running iOS 17+)
- Network: Wi-Fi (production)
- Account: `test@fanquin.com` / OTP `123456`
- Build: Release / TestFlight build

---

### 9.2 Authentication Flow

| #   | Step                                            | Expected Result                              | Pass/Fail |
| --- | ----------------------------------------------- | -------------------------------------------- | --------- |
| 1   | Open the app fresh (first launch or logged out) | Login screen appears with email input        |           |
| 2   | Enter `test@fanquin.com`, tap "Send Code"       | Loading indicator → "Code sent" confirmation |           |
| 3   | Enter `123456` in the OTP field                 | Screen advances to home/groups               |           |
| 4   | Verify display name shows "Hugo Sanchez"        | Name visible in profile or header            |           |
| 5   | Log out from Profile page                       | Returns to login screen, session cleared     |           |
| 6   | Log back in with `test@fanquin.com` + `123456`  | Successful re-login, existing data preserved |           |

---

### 9.3 Group & Prediction Flow

| #   | Step                                               | Expected Result                                  | Pass/Fail |
| --- | -------------------------------------------------- | ------------------------------------------------ | --------- |
| 7   | Navigate to "My Groups"                            | List of groups appears (or empty state with CTA) |           |
| 8   | Tap "Create Group"                                 | Group creation form opens                        |           |
| 9   | Fill in group name, select competition, tap Create | Group created, invite code generated             |           |
| 10  | Navigate to an active group with matches           | Match list with prediction inputs visible        |           |
| 11  | Enter a score prediction for an upcoming match     | Prediction saved, confirmation visible           |           |
| 12  | View the group leaderboard                         | Leaderboard loads with member rankings           |           |

---

### 9.4 Profile Flow

| #   | Step                                        | Expected Result                      | Pass/Fail |
| --- | ------------------------------------------- | ------------------------------------ | --------- |
| 13  | Open Profile page                           | Name, email, country (MX) visible    |           |
| 14  | Edit display name, tap Save                 | Name updated, success toast shown    |           |
| 15  | Scroll to Danger Zone                       | "Deactivate Account" section visible |           |
| 16  | Tap "Deactivate Account" → Cancel on dialog | Dialog closes, account unchanged     |           |

---

### 9.5 Deep Link & Edge Cases

| #   | Step                                             | Expected Result                               | Pass/Fail |
| --- | ------------------------------------------------ | --------------------------------------------- | --------- |
| 17  | Open `https://fanquin.com/deactivate` in Safari  | Deactivate page loads (no login required)     |           |
| 18  | Enter `test@fanquin.com` on deactivate page      | "Check your email" / OTP input shown          |           |
| 19  | Press back / Cancel                              | Returns to home without deactivating          |           |
| 20  | Open `https://fanquin.com/join` while logged out | Redirects to login, then join page after auth |           |

---

### 9.6 Offline & Error Handling

| #   | Step                                            | Expected Result                         | Pass/Fail |
| --- | ----------------------------------------------- | --------------------------------------- | --------- |
| 21  | Enable Airplane Mode, open app                  | Graceful offline message / cached state |           |
| 22  | Enter wrong OTP code (not 123456 for test user) | "Invalid code" error shown              |           |
| 23  | Re-enable Wi-Fi, refresh                        | Data reloads correctly                  |           |

---

### 9.7 Sign-Off

| Reviewer       | Date | Device          | iOS Version | Result      |
| -------------- | ---- | --------------- | ----------- | ----------- |
| `[TODO: Name]` |      | `[TODO: Model]` |             | Pass / Fail |

> **All rows must pass before submitting to App Store Review.** Document any failures and retest after fixing.

---

_Last updated: 2026-04-29_
