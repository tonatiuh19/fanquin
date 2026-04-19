import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import express, { type RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import bcrypt from "bcryptjs";
import type {
  SendCodeResponse,
  VerifyCodeResponse,
  ValidateSessionResponse,
  UserProfile,
  AdminLoginResponse,
} from "@shared/api";

// ─────────────────────────────────────────────────────────────────
// ENV VALIDATION
// ─────────────────────────────────────────────────────────────────
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required environment variables.",
  );
}

const isDev = process.env.NODE_ENV !== "production";

// ─────────────────────────────────────────────────────────────────
// USERNAME PROFANITY FILTER
// Uses leo-profanity (EN + ES dictionaries) so offensive terms are
// not stored in the repository. Regional slang not covered by the
// library is added via environment variable USERNAME_EXTRA_BLOCKED
// (comma-separated, optional).
// ─────────────────────────────────────────────────────────────────
import leoProfanity from "leo-profanity";
leoProfanity.loadDictionary("en");
leoProfanity.loadDictionary("es");
if (process.env.USERNAME_EXTRA_BLOCKED) {
  const extra = process.env.USERNAME_EXTRA_BLOCKED.split(",")
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);
  if (extra.length) leoProfanity.add(extra);
}

function normalizeForBlocklist(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents: ó→o, é→e, etc.
    .replace(/_/g, "")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/8/g, "b");
}

function isBlockedUsername(username: string): boolean {
  return leoProfanity.check(normalizeForBlocklist(username));
}

// ─────────────────────────────────────────────────────────────────
// SUPABASE ADMIN CLIENT (service role — server only, never on client)
// ─────────────────────────────────────────────────────────────────
function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// ─────────────────────────────────────────────────────────────────
// SESSION TOKEN HELPERS
// SHA-256 of the random token → stored in user_sessions.token_hash
// Deterministic so we can look it up fast with an index.
// ─────────────────────────────────────────────────────────────────
function generateSessionToken(): string {
  return crypto.randomBytes(48).toString("hex");
}
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Returns the ISO week number (1-53) for a given date.
function getISOWeek(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * After a group transitions to active, seed survivor_lives from scoring_config
 * for competitive/global groups. No-op for other modes.
 */
async function seedSurvivorLives(supabase: any, groupId: string) {
  const { data: group } = await supabase
    .from("groups")
    .select("mode, scoring_config")
    .eq("id", groupId)
    .single();

  if (!group) return;
  if (group.mode !== "competitive" && group.mode !== "global") return;

  const lives: number = (group.scoring_config ?? {}).survivor_lives ?? 1;
  if (lives <= 1) return; // DB default is already 1, only override when > 1

  await supabase
    .from("group_members")
    .update({ survivor_lives: lives })
    .eq("group_id", groupId);
}

// ─────────────────────────────────────────────────────────────────
// EMAIL: RESEND CLIENT
// ─────────────────────────────────────────────────────────────────
function createResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

// ─────────────────────────────────────────────────────────────────
// EMAIL TEMPLATES
// ─────────────────────────────────────────────────────────────────

// ── i18n copy used by all templates ───────────────────────────────
const emailCopy = {
  en: {
    footerNote:
      "You received this email because an account action was requested on FanQuin.",
    privacy: "Privacy",
    terms: "Terms",
    otpSubject: (code: number) =>
      `${String(code).padStart(6, "0")} — your FanQuin sign-in code`,
    otpHey: (name: string) =>
      `Hey${name ? ` ${name}` : ""}, here's your code 🎯`,
    otpBody: (mins: number) =>
      `Enter this code to sign in to FanQuin. It expires in <strong style="color:#111827;">${mins} minutes</strong>.`,
    otpSecurityTitle: "🔒 Security reminder",
    otpSecurityBody:
      "FanQuin will <strong>never</strong> ask for this code via chat, phone, or any other channel. If you didn't request this, you can safely ignore it.",
    welcomeSubject: "Welcome to FanQuin 🎯",
    welcomeBadge: "Welcome to FanQuin",
    welcomeTitle: (name: string) =>
      name ? `Welcome, ${name}! 🎉` : "You're in! 🎉",
    welcomeTagline: "Your quiniela era begins now.",
    welcomeIntro:
      "FanQuin is the social fantasy platform where you compete with friends on real football matches. Pick scores, draft teams, climb leaderboards, and settle every debate the right way — with data.",
    welcomeHowTitle: "How it works",
    welcomeSteps: [
      [
        "🏟️",
        "Pick a competition",
        "World Cup 2026 is live. More leagues coming soon.",
      ],
      [
        "👥",
        "Create or join a group",
        "Invite friends with a single link — no sign-up needed.",
      ],
      [
        "⚽",
        "Draft your teams",
        "Snake draft, random, or tier-balanced. You choose.",
      ],
      [
        "🎯",
        "Predict every match",
        "Pick scores, earn points, crush your friends.",
      ],
    ],
    welcomeCta: "World Cup 2026 kicks off June 11. Don't miss matchday 1.",
    welcomeBtn: "Start Playing →",
    groupWelcomeSubject: (groupName: string) =>
      `You joined ${groupName} on FanQuin! 🏆`,
    groupWelcomeBadge: "Group Joined",
    groupWelcomeTitle: (groupName: string) => `You're in — ${groupName}! 🎉`,
    groupWelcomeIntro: (name: string) =>
      `${name ? `Hey ${name}! ` : ""}You've just joined a group on FanQuin. Get ready for the competition!`,
    groupWelcomeNextTitle: "What's next?",
    groupWelcomeSteps: [
      [
        "👥",
        "Wait for the owner to start the draft",
        "Once all members are in, the group owner will kick off the draft.",
      ],
      [
        "⚽",
        "Pick your teams",
        "Each member drafts real teams from the competition.",
      ],
      [
        "🎯",
        "Predict every match",
        "Submit your score predictions before kickoff to earn points.",
      ],
      [
        "🏆",
        "Climb the leaderboard",
        "Earn points from predictions and team ownership. May the best quiniela win.",
      ],
    ],
    groupWelcomeCta: "Check your group and invite more friends!",
    groupWelcomeBtn: "Go to Group →",
    groupRulesTitle: "Group Rules",
    groupSettingsSubtitle: "Settings",
    groupModeLabel: "Mode",
    groupDraftLabel: "Team assignment",
    groupMaxMembersLabel: "Max members",
    groupScoringTitle: "Prediction Scoring",
    groupScoringExact: "Exact score",
    groupScoringWinner: "Correct winner",
    groupScoringDiff: "Goal difference",
    groupOwnershipTitle: "Team Ownership",
    groupOwnershipWin: "Team win",
    groupOwnershipGoal: "Team goal",
    groupOwnershipCleanSheet: "Team clean sheet",
    groupOwnershipStreakBonus: (threshold: number) =>
      `${threshold}+ correct streak bonus`,
    groupBonusTitle: "Bonus Criteria",
    groupBonusNone: "No bonus criteria enabled.",
    groupBonusBtts: "Both teams score",
    groupBonusFtWinner: "Full-time result (standalone)",
    groupBonusHtWinner: "Half-time result",
    groupBonusGoals: (n: number) => `Total goals over ${n}`,
    groupBonusCleanSheet: "Clean sheet prediction",
    groupTimingTitle: "⏱️ Prediction window",
    groupTimingBody:
      "Predictions lock at each match's kickoff time. Submit before the whistle or your pick won't count!",
    groupOwnershipTimingTitle: "📺 Just watch & earn",
    groupOwnershipTimingBody:
      "No predictions needed! Points are awarded automatically whenever your teams win, score or keep a clean sheet.",
    groupOwnershipWelcomeSteps: [
      [
        "🎲",
        "Wait for the draft",
        "Once all members have joined, the group owner will start the team draft.",
      ],
      [
        "⚽",
        "Your teams play for you",
        "You earn points automatically every time your teams win, score or keep a clean sheet.",
      ],
      [
        "📊",
        "Track the leaderboard",
        "Follow the standings and see how your teams are performing in real time.",
      ],
    ] as [string, string, string][],
    groupOwnershipActiveSteps: [
      [
        "⚽",
        "Check your teams",
        "See which teams you own for this competition.",
      ],
      [
        "📺",
        "Just watch & earn",
        "Points land automatically — win (+6), goal (+2), clean sheet (+4). No action needed.",
      ],
      [
        "📊",
        "Track the leaderboard",
        "Watch the standings update in real time as matches finish.",
      ],
    ] as [string, string, string][],
    groupOwnershipActiveIntro: (name: string) =>
      `${name ? `Hey ${name}! ` : ""}Teams have been assigned. Sit back — points are earned automatically whenever your teams play. No predictions required.`,
    groupOwnershipActiveStartCta: "Check the leaderboard and track your teams!",
    groupPts: "pts",
    groupDraftStartSubject: (groupName: string) =>
      `🏈 The draft is open — ${groupName}`,
    groupDraftStartBadge: "Draft is live",
    groupDraftStartTitle: (groupName: string) =>
      `Time to pick! — ${groupName} 🎯`,
    groupDraftStartIntro: (name: string) =>
      `${name ? `Hey ${name}! ` : ""}The owner has started the snake draft. Head to the draft room to pick your teams before the window closes!`,
    groupDraftStartSteps: [
      [
        "⚡",
        "It's a live draft",
        "60 seconds per turn. Miss your window and a team is auto-assigned — don't keep your group waiting.",
      ],
      [
        "⚽",
        "Pick your teams",
        "Choose wisely — your picks decide your season.",
      ],
      [
        "🎯",
        "Predict every match",
        "Once the draft ends, start submitting score predictions.",
      ],
    ] as [string, string, string][],
    groupDraftStartCta: "Open the draft room now and make your picks!",
    groupDraftStartBtn: "Go to Draft Room →",
    groupActiveStartSubject: (groupName: string) =>
      `🏆 ${groupName} is live — teams are assigned!`,
    groupActiveStartBadge: "Competition live",
    groupActiveStartTitle: (groupName: string) =>
      `Your teams are ready — ${groupName}! 🚀`,
    groupActiveStartIntro: (name: string) =>
      `${name ? `Hey ${name}! ` : ""}Teams have been assigned automatically. Head to your group to see your lineup and start predicting matches!`,
    groupActiveStartSteps: [
      [
        "⚽",
        "Check your teams",
        "See which teams you own for this competition.",
      ],
      [
        "🎯",
        "Predict every match",
        "Submit score predictions before kickoff to earn points.",
      ],
      [
        "🏆",
        "Climb the leaderboard",
        "Earn points from predictions and team ownership. May the best quiniela win.",
      ],
    ] as [string, string, string][],
    groupActiveStartCta: "Check your group and start predicting!",
    groupActiveStartBtn: "Go to Group →",
    draftCompleteSubject: (groupName: string) =>
      `🏆 Draft complete — ${groupName}`,
    draftCompleteBadge: "Draft complete",
    draftCompleteTitle: (groupName: string) =>
      `The draft is over — ${groupName} 🏆`,
    draftCompleteIntro: (name: string) =>
      `${name ? `Hey ${name}! ` : ""}All picks are in — may the best squad win! Head to your group to start predicting matches.`,
    draftCompleteCta: "Predictions are now open. Good luck!",
    draftCompleteBtn: "Go to Group →",
  },
  es: {
    footerNote:
      "Recibiste este correo porque se solicitó una acción en tu cuenta de FanQuin.",
    privacy: "Privacidad",
    terms: "Términos",
    otpSubject: (code: number) =>
      `${String(code).padStart(6, "0")} — tu código de acceso a FanQuin`,
    otpHey: (name: string) =>
      `Hola${name ? ` ${name}` : ""}, aquí está tu código 🎯`,
    otpBody: (mins: number) =>
      `Ingresa este código para acceder a FanQuin. Expira en <strong style="color:#111827;">${mins} minutos</strong>.`,
    otpSecurityTitle: "🔒 Recordatorio de seguridad",
    otpSecurityBody:
      "FanQuin <strong>nunca</strong> te pedirá este código por chat, teléfono u otro canal. Si no solicitaste esto, puedes ignorarlo con toda seguridad.",
    welcomeSubject: "Bienvenido a FanQuin 🎯",
    welcomeBadge: "Bienvenido a FanQuin",
    welcomeTitle: (name: string) =>
      name ? `¡Bienvenido, ${name}! 🎉` : "¡Ya estás adentro! 🎉",
    welcomeTagline: "Tu era de quinielas comienza ahora.",
    welcomeIntro:
      "FanQuin es la plataforma de fantasy social donde compites con amigos en partidos de fútbol reales. Predice resultados, elige equipos, sube clasificaciones y zanja cada debate de la manera correcta — con datos.",
    welcomeHowTitle: "¿Cómo funciona?",
    welcomeSteps: [
      [
        "🏟️",
        "Elige una competición",
        "Copa del Mundo 2026 está en vivo. Más ligas próximamente.",
      ],
      [
        "👥",
        "Crea o únete a un grupo",
        "Invita amigos con un solo enlace — sin registro adicional.",
      ],
      [
        "⚽",
        "Elige tus equipos",
        "Draft snake, aleatorio o por niveles. Tú decides.",
      ],
      [
        "🎯",
        "Predice cada partido",
        "Pon marcadores, gana puntos y supera a tus amigos.",
      ],
    ],
    welcomeCta:
      "Copa del Mundo 2026 arranca el 11 de junio. No te pierdas la jornada 1.",
    welcomeBtn: "Empieza a jugar →",
    groupWelcomeSubject: (groupName: string) =>
      `¡Te uniste a ${groupName} en FanQuin! 🏆`,
    groupWelcomeBadge: "Grupo unido",
    groupWelcomeTitle: (groupName: string) => `¡Ya estás en — ${groupName}! 🎉`,
    groupWelcomeIntro: (name: string) =>
      `${name ? `¡Hola ${name}! ` : ""}Acabas de unirte a un grupo en FanQuin. ¡Prepárate para la competición!`,
    groupWelcomeNextTitle: "¿Qué sigue?",
    groupWelcomeSteps: [
      [
        "👥",
        "Espera a que el dueño inicie el draft",
        "Una vez que estén todos los miembros, el creador del grupo comenzará el draft.",
      ],
      [
        "⚽",
        "Elige tus equipos",
        "Cada miembro elige equipos reales de la competición.",
      ],
      [
        "🎯",
        "Predice cada partido",
        "Envía tus predicciones de marcador antes del pitido inicial para ganar puntos.",
      ],
      [
        "🏆",
        "Sube la clasificación",
        "Gana puntos con predicciones y posesión de equipos. Que gane la mejor quiniela.",
      ],
    ],
    groupWelcomeCta: "¡Revisa tu grupo e invita a más amigos!",
    groupWelcomeBtn: "Ir al grupo →",
    groupRulesTitle: "Reglas del grupo",
    groupSettingsSubtitle: "Configuración",
    groupModeLabel: "Modo",
    groupDraftLabel: "Asignación de equipos",
    groupMaxMembersLabel: "Máximo de jugadores",
    groupScoringTitle: "Puntuación de predicciones",
    groupScoringExact: "Marcador exacto",
    groupScoringWinner: "Ganador correcto",
    groupScoringDiff: "Diferencia de goles",
    groupOwnershipTitle: "Puntos de equipo",
    groupOwnershipWin: "Victoria del equipo",
    groupOwnershipGoal: "Gol del equipo",
    groupOwnershipCleanSheet: "Portería a cero del equipo",
    groupOwnershipStreakBonus: (threshold: number) =>
      `Bono por racha de ${threshold}+ aciertos`,
    groupBonusTitle: "Criterios de bonificación",
    groupBonusNone: "Este grupo no tiene criterios de bonificación.",
    groupBonusBtts: "Ambos equipos marcan",
    groupBonusFtWinner: "Resultado a tiempo reglamentario (independiente)",
    groupBonusHtWinner: "Resultado al descanso",
    groupBonusGoals: (n: number) => `Más de ${n} goles en total`,
    groupBonusCleanSheet: "Predicción de portería a cero",
    groupTimingTitle: "⏱️ Ventana de predicción",
    groupTimingBody:
      "Las predicciones se cierran al inicio de cada partido. ¡Envíalas antes del pitido o no contarán!",
    groupOwnershipTimingTitle: "📺 Solo mira y acumula",
    groupOwnershipTimingBody:
      "¡Sin predicciones! Los puntos se acreditan automáticamente cada vez que tus equipos ganan, marcan o dejan su portería a cero.",
    groupOwnershipWelcomeSteps: [
      [
        "🎲",
        "Espera el draft",
        "Cuando estén todos los miembros, el dueño del grupo iniciará el draft.",
      ],
      [
        "⚽",
        "Tus equipos juegan por ti",
        "Ganas puntos automáticamente cada vez que tus equipos ganan, marcan goles o dejan su portería a cero.",
      ],
      [
        "📊",
        "Sigue la clasificación",
        "Consulta la tabla y mira cómo rinden tus equipos en tiempo real.",
      ],
    ] as [string, string, string][],
    groupOwnershipActiveSteps: [
      [
        "⚽",
        "Revisa tus equipos",
        "Mira qué equipos tienes en esta competición.",
      ],
      [
        "📺",
        "Solo mira y acumula",
        "Los puntos llegan automáticamente — victoria (+6), gol (+2), portería a cero (+4). Sin hacer nada.",
      ],
      [
        "📊",
        "Sigue la clasificación",
        "La tabla se actualiza en tiempo real cuando terminan los partidos.",
      ],
    ] as [string, string, string][],
    groupOwnershipActiveIntro: (name: string) =>
      `${name ? `¡Hola ${name}! ` : ""}Los equipos han sido asignados. Relájate — los puntos se acumulan automáticamente cada vez que tus equipos juegan. No se necesitan predicciones.`,
    groupOwnershipActiveStartCta:
      "¡Revisa la clasificación y sigue tus equipos!",
    groupPts: "pts",
    groupDraftStartSubject: (groupName: string) =>
      `🏈 El draft está abierto — ${groupName}`,
    groupDraftStartBadge: "Draft en vivo",
    groupDraftStartTitle: (groupName: string) =>
      `¡Hora de elegir! — ${groupName} 🎯`,
    groupDraftStartIntro: (name: string) =>
      `${name ? `¡Hola ${name}! ` : ""}El dueño ha iniciado el snake draft. ¡Ve a la sala de draft y elige tus equipos antes de que se cierre!`,
    groupDraftStartSteps: [
      [
        "⚡",
        "Es un draft en vivo",
        "60 segundos por turno. Si se acaba el tiempo te asignan equipo automáticamente — no hagas esperar a tu grupo.",
      ],
      [
        "⚽",
        "Elige tus equipos",
        "Piensa bien — tus picks definen tu temporada.",
      ],
      [
        "🎯",
        "Predice cada partido",
        "Cuando termine el draft, empieza a enviar tus predicciones.",
      ],
    ] as [string, string, string][],
    groupDraftStartCta: "¡Entra a la sala de draft y haz tus picks!",
    groupDraftStartBtn: "Ir al Draft →",
    groupActiveStartSubject: (groupName: string) =>
      `🏆 ${groupName} está en vivo — ¡equipos asignados!`,
    groupActiveStartBadge: "Competición en vivo",
    groupActiveStartTitle: (groupName: string) =>
      `¡Tus equipos están listos — ${groupName}! 🚀`,
    groupActiveStartIntro: (name: string) =>
      `${name ? `¡Hola ${name}! ` : ""}Los equipos han sido asignados automáticamente. ¡Ve a tu grupo para ver tu alineación y empieza a predecir partidos!`,
    groupActiveStartSteps: [
      [
        "⚽",
        "Revisa tus equipos",
        "Mira qué equipos tienes en esta competición.",
      ],
      [
        "🎯",
        "Predice cada partido",
        "Envía tus predicciones antes del pitido inicial para ganar puntos.",
      ],
      [
        "🏆",
        "Sube la clasificación",
        "Gana puntos con predicciones y posesión. Que gane la mejor quiniela.",
      ],
    ] as [string, string, string][],
    groupActiveStartCta: "¡Revisa tu grupo y empieza a predecir!",
    groupActiveStartBtn: "Ir al grupo →",
    draftCompleteSubject: (groupName: string) =>
      `🏆 Draft completado — ${groupName}`,
    draftCompleteBadge: "Draft completado",
    draftCompleteTitle: (groupName: string) =>
      `El draft ha terminado — ${groupName} 🏆`,
    draftCompleteIntro: (name: string) =>
      `${name ? `¡Hola ${name}! ` : ""}¡Todos los picks están hechos — que gane la mejor plantilla! Entra a tu grupo para empezar a predecir partidos.`,
    draftCompleteCta: "Las predicciones ya están abiertas. ¡Buena suerte!",
    draftCompleteBtn: "Ir al grupo →",
  },
} as const;

type Locale = keyof typeof emailCopy;
type EmailCopyEntry = {
  footerNote: string;
  privacy: string;
  terms: string;
  otpSubject: (code: number) => string;
  otpHey: (name: string) => string;
  otpBody: (mins: number) => string;
  otpSecurityTitle: string;
  otpSecurityBody: string;
  welcomeSubject: string;
  welcomeBadge: string;
  welcomeTitle: (name: string) => string;
  welcomeTagline: string;
  welcomeIntro: string;
  welcomeHowTitle: string;
  welcomeSteps: readonly (readonly string[])[];
  welcomeCta: string;
  welcomeBtn: string;
  groupWelcomeSubject: (groupName: string) => string;
  groupWelcomeBadge: string;
  groupWelcomeTitle: (groupName: string) => string;
  groupWelcomeIntro: (name: string) => string;
  groupWelcomeNextTitle: string;
  groupWelcomeSteps: readonly (readonly string[])[];
  groupWelcomeCta: string;
  groupWelcomeBtn: string;
  groupRulesTitle: string;
  groupSettingsSubtitle: string;
  groupModeLabel: string;
  groupDraftLabel: string;
  groupMaxMembersLabel: string;
  groupScoringTitle: string;
  groupScoringExact: string;
  groupScoringWinner: string;
  groupScoringDiff: string;
  groupOwnershipTitle: string;
  groupOwnershipWin: string;
  groupOwnershipGoal: string;
  groupOwnershipCleanSheet: string;
  groupOwnershipStreakBonus: (threshold: number) => string;
  groupBonusTitle: string;
  groupBonusNone: string;
  groupBonusBtts: string;
  groupBonusFtWinner: string;
  groupBonusHtWinner: string;
  groupBonusGoals: (n: number) => string;
  groupBonusCleanSheet: string;
  groupTimingTitle: string;
  groupTimingBody: string;
  groupOwnershipTimingTitle: string;
  groupOwnershipTimingBody: string;
  groupOwnershipWelcomeSteps: [string, string, string][];
  groupOwnershipActiveSteps: [string, string, string][];
  groupOwnershipActiveIntro: (name: string) => string;
  groupOwnershipActiveStartCta: string;
  groupPts: string;
  groupDraftStartSubject: (groupName: string) => string;
  groupDraftStartBadge: string;
  groupDraftStartTitle: (groupName: string) => string;
  groupDraftStartIntro: (name: string) => string;
  groupDraftStartSteps: [string, string, string][];
  groupDraftStartCta: string;
  groupDraftStartBtn: string;
  groupActiveStartSubject: (groupName: string) => string;
  groupActiveStartBadge: string;
  groupActiveStartTitle: (groupName: string) => string;
  groupActiveStartIntro: (name: string) => string;
  groupActiveStartSteps: [string, string, string][];
  groupActiveStartCta: string;
  groupActiveStartBtn: string;
  draftCompleteSubject: (groupName: string) => string;
  draftCompleteBadge: string;
  draftCompleteTitle: (groupName: string) => string;
  draftCompleteIntro: (name: string) => string;
  draftCompleteCta: string;
  draftCompleteBtn: string;
};
function t(locale: string): EmailCopyEntry {
  return emailCopy[
    (locale as Locale) in emailCopy ? (locale as Locale) : "es"
  ] as EmailCopyEntry;
}

/** Branded wrapper shared by all templates */
function emailShell(content: string, locale = "es"): string {
  const c = t(locale);
  const accentColor = "#16a34a";
  const darkBg = "#0a0f1e";
  const appUrl = process.env.APP_URL || "https://fanquin.com";

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>FanQuin</title>
</head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="background:${darkBg};padding:20px 32px;border-radius:16px 16px 0 0;text-align:center;">
            <a href="${appUrl}" style="text-decoration:none;display:inline-block;">
              <img src="https://disruptinglabs.com/data/fanquin/assets/images/logo_white.png" alt="FanQuin" width="140" style="height:auto;display:block;margin:0 auto;" />
            </a>
          </td>
        </tr>

        <!-- CONTENT -->
        ${content}

        <!-- FOOTER -->
        <tr>
          <td style="background:${darkBg};padding:20px 32px;border-radius:0 0 16px 16px;text-align:center;">
            <p style="margin:0 0 6px 0;color:#9ca3af;font-size:12px;line-height:1.6;">
              ${c.footerNote}
            </p>
            <p style="margin:0;color:#6b7280;font-size:11px;">
              © ${new Date().getFullYear()} FanQuin · 
              <a href="${appUrl}/privacy" style="color:#6b7280;text-decoration:none;">${c.privacy}</a> · 
              <a href="${appUrl}/terms" style="color:#6b7280;text-decoration:none;">${c.terms}</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Draft complete summary email sent to every group member */
function buildDraftCompleteEmail(
  displayName: string,
  groupName: string,
  groupId: string,
  memberPicks: {
    userId: string;
    name: string;
    teams: {
      name: string;
      shortName: string | null;
      tier: number | null;
      flagUrl: string | null;
    }[];
  }[],
  appUrl: string,
  locale = "es",
): string {
  const c = t(locale);
  const groupUrl = `${appUrl}/groups/${groupId}`;

  const memberRows = memberPicks
    .map(({ name, teams }) => {
      const teamPills = teams
        .map(
          (team) =>
            `<span style="display:inline-block;background:#f3f4f6;border-radius:6px;padding:3px 8px;margin:2px;font-size:12px;color:#374151;font-weight:600;">${
              team.shortName ?? team.name
            }${team.tier != null ? ` <span style="color:#9ca3af;font-weight:400;">T${team.tier}</span>` : ""}</span>`,
        )
        .join("");
      return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;">
          <p style="margin:0 0 6px 0;color:#111827;font-size:14px;font-weight:700;">${name}</p>
          <div>${teamPills}</div>
        </td>
      </tr>`;
    })
    .join("");

  const content = `
    <!-- HERO -->
    <tr>
      <td style="background:linear-gradient(135deg,#0c2340 0%,#1e3a5f 50%,#2563eb 100%);padding:36px 32px;text-align:center;">
        <p style="margin:0 0 6px 0;color:#bfdbfe;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">${c.draftCompleteBadge}</p>
        <h1 style="margin:0 0 8px 0;color:#ffffff;font-size:26px;font-weight:800;">${c.draftCompleteTitle(groupName)}</h1>
        <p style="margin:0;color:#bfdbfe;font-size:15px;">${c.draftCompleteIntro(displayName)}</p>
      </td>
    </tr>

    <tr>
      <td style="background:#ffffff;padding:32px 32px 0;">
        <p style="margin:0 0 16px 0;color:#111827;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Final Squads</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          ${memberRows}
        </table>
      </td>
    </tr>

    <tr>
      <td style="background:#ffffff;padding:24px 32px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="background:#eff6ff;border-radius:12px;padding:24px;">
              <p style="margin:0 0 14px 0;color:#374151;font-size:14px;">${c.draftCompleteCta}</p>
              <a href="${groupUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 48px;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.3px;">
                ${c.draftCompleteBtn}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  return emailShell(content, locale);
}

/** OTP verification code email */
function buildOtpEmail(
  displayName: string,
  code: number,
  expiryMinutes = 10,
  locale = "es",
): string {
  const c = t(locale);
  const accentColor = "#16a34a";
  const digits = String(code).padStart(6, "0").split("");

  const digitBoxes = digits
    .map(
      (d) =>
        `<td style="padding:0 4px;"><span style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;font-size:32px;font-weight:800;color:${accentColor};background:#f0fdf4;border:2px solid ${accentColor};border-radius:10px;">${d}</span></td>`,
    )
    .join("");

  const content = `
    <tr>
      <td style="background:#ffffff;padding:40px 32px 32px;">
        <h2 style="margin:0 0 6px 0;color:#111827;font-size:22px;font-weight:700;">
          ${c.otpHey(displayName)}
        </h2>
        <p style="margin:0 0 28px 0;color:#6b7280;font-size:15px;line-height:1.6;">
          ${c.otpBody(expiryMinutes)}
        </p>

        <!-- CODE DIGITS -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
          <tr>
            <td style="background:#f9fafb;border-radius:14px;padding:24px;text-align:center;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>${digitBoxes}</tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- SECURITY NOTE -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="background:#fefce8;border-left:4px solid #eab308;border-radius:0 8px 8px 0;padding:14px 18px;">
              <p style="margin:0 0 4px 0;color:#78350f;font-size:13px;font-weight:700;">${c.otpSecurityTitle}</p>
              <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
                ${c.otpSecurityBody}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  return emailShell(content, locale);
}

/** Welcome email for first-time sign-in */
function buildWelcomeEmail(
  displayName: string,
  appUrl: string,
  locale = "es",
): string {
  const c = t(locale);
  const accentColor = "#16a34a";

  const stepsHTML = c.welcomeSteps
    .map(
      ([icon, title, desc]) => `
      <tr>
        <td style="padding:10px 0;vertical-align:top;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="width:44px;vertical-align:top;padding-top:2px;">
                <span style="display:inline-block;width:36px;height:36px;background:${accentColor};border-radius:50%;text-align:center;line-height:36px;font-size:18px;">${icon}</span>
              </td>
              <td style="padding-left:14px;">
                <p style="margin:0 0 2px 0;color:#111827;font-size:14px;font-weight:700;">${title}</p>
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.5;">${desc}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`,
    )
    .join("");

  const content = `
    <!-- HERO -->
    <tr>
      <td style="background:linear-gradient(135deg,#14532d 0%,#15803d 50%,#16a34a 100%);padding:36px 32px;text-align:center;">
        <p style="margin:0 0 6px 0;color:#bbf7d0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">${c.welcomeBadge}</p>
        <h1 style="margin:0 0 8px 0;color:#ffffff;font-size:28px;font-weight:800;">
          ${c.welcomeTitle(displayName)}
        </h1>
        <p style="margin:0;color:#bbf7d0;font-size:15px;">${c.welcomeTagline}</p>
      </td>
    </tr>

    <tr>
      <td style="background:#ffffff;padding:40px 32px 32px;">
        <p style="margin:0 0 24px 0;color:#374151;font-size:15px;line-height:1.7;">
          ${c.welcomeIntro}
        </p>

        <p style="margin:0 0 14px 0;color:#111827;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">${c.welcomeHowTitle}</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
          ${stepsHTML}
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="background:#f0fdf4;border-radius:12px;padding:28px;">
              <p style="margin:0 0 16px 0;color:#374151;font-size:14px;">${c.welcomeCta}</p>
              <a href="${appUrl}" style="display:inline-block;background:${accentColor};color:#ffffff;text-decoration:none;padding:14px 48px;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.3px;">
                ${c.welcomeBtn}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  return emailShell(content, locale);
}

/** Welcome email when a user joins a group */
function buildGroupWelcomeEmail(
  displayName: string,
  groupName: string,
  groupId: string,
  appUrl: string,
  locale = "es",
  groupConfig?: {
    mode?: string;
    draft_type?: string;
    max_members?: number;
    scoring_config?: Record<string, unknown>;
    bonus_criteria?: {
      enabled?: string[];
      btts_pts?: number;
      total_goals_over_pts?: number;
      total_goals_threshold?: number;
      ft_winner_pts?: number;
      ht_winner_pts?: number;
      clean_sheet_pts?: number;
    };
  },
): string {
  const c = t(locale);
  const accentColor = "#16a34a";
  const groupUrl = `${appUrl}/groups/${groupId}`;

  const modeNames: Record<string, Record<string, string>> = {
    en: {
      friends: "Friends",
      casual: "Casual",
      league: "League",
      competitive: "Competitive",
      global: "Global",
      ownership: "Team Ownership",
    },
    es: {
      friends: "Amigos",
      casual: "Casual",
      league: "Liga",
      competitive: "Competitivo",
      global: "Global",
      ownership: "Seguimiento de equipos",
    },
  };
  const draftNames: Record<string, Record<string, string>> = {
    en: {
      snake: "🐍 Snake draft (live room)",
      random: "🎲 Random draw",
      balanced_tier: "⚖️ Balanced tiers",
    },
    es: {
      snake: "🐍 Draft snake (sala en vivo)",
      random: "🎲 Sorteo aleatorio",
      balanced_tier: "⚖️ Niveles balanceados",
    },
  };
  const l = locale in modeNames ? locale : "es";
  const modeName =
    modeNames[l][groupConfig?.mode ?? ""] ?? groupConfig?.mode ?? "—";
  const draftName =
    draftNames[l][groupConfig?.draft_type ?? ""] ??
    groupConfig?.draft_type ??
    "—";

  const toNum = (val: unknown): number => (typeof val === "number" ? val : 0);
  const sc = (groupConfig?.scoring_config ?? {}) as Record<string, unknown>;
  const bc = groupConfig?.bonus_criteria ?? {};
  const pts = c.groupPts;

  const makeRow = (label: string, value: string, color: string) =>
    `<tr>
       <td style="color:#6b7280;font-size:13px;padding:7px 0;border-bottom:1px solid #f3f4f6;">${label}</td>
       <td align="right" style="color:${color};font-size:13px;font-weight:700;padding:7px 0;border-bottom:1px solid #f3f4f6;">${value}</td>
     </tr>`;

  const settingsHTML = [
    makeRow(c.groupModeLabel, modeName, "#111827"),
    makeRow(c.groupDraftLabel, draftName, "#111827"),
    makeRow(
      c.groupMaxMembersLabel,
      String(groupConfig?.max_members ?? "—"),
      "#111827",
    ),
  ].join("");

  const scoringHTML = (
    [
      [c.groupScoringExact, toNum(sc.exact_score_pts)],
      [c.groupScoringWinner, toNum(sc.correct_winner_pts)],
      [c.groupScoringDiff, toNum(sc.goal_difference_pts)],
    ] as [string, number][]
  )
    .filter(([, p]) => p > 0)
    .map(([label, p]) => makeRow(label, `+${p} ${pts}`, "#16a34a"))
    .join("");

  const streakThreshold = toNum(sc.streak_bonus_threshold);
  const streakPts = toNum(sc.streak_bonus_pts);
  const ownershipHTML =
    (
      [
        [c.groupOwnershipWin, toNum(sc.team_win_pts)],
        [c.groupOwnershipGoal, toNum(sc.team_goal_pts)],
        [c.groupOwnershipCleanSheet, toNum(sc.team_clean_sheet_pts)],
      ] as [string, number][]
    )
      .filter(([, p]) => p > 0)
      .map(([label, p]) => makeRow(label, `+${p} ${pts}`, "#7c3aed"))
      .join("") +
    (streakThreshold > 0 && streakPts > 0
      ? makeRow(
          c.groupOwnershipStreakBonus(streakThreshold),
          `+${streakPts} ${pts}`,
          "#f59e0b",
        )
      : "");

  const enabledCriteria: string[] = bc.enabled ?? [];
  const bonusCriterionLabel: Record<string, string> = {
    btts: c.groupBonusBtts,
    ft_winner: c.groupBonusFtWinner,
    ht_winner: c.groupBonusHtWinner,
    total_goals_over: c.groupBonusGoals(bc.total_goals_threshold ?? 2.5),
    clean_sheet: c.groupBonusCleanSheet,
  };
  const bonusPtsMap: Record<string, number> = {
    btts: toNum(bc.btts_pts),
    ft_winner: toNum(bc.ft_winner_pts),
    ht_winner: toNum(bc.ht_winner_pts),
    total_goals_over: toNum(bc.total_goals_over_pts),
    clean_sheet: toNum(bc.clean_sheet_pts),
  };
  const bonusHTML =
    enabledCriteria.length === 0
      ? `<tr><td colspan="2" style="color:#9ca3af;font-size:13px;padding:8px 0;font-style:italic;">${c.groupBonusNone}</td></tr>`
      : enabledCriteria
          .map((key) =>
            makeRow(
              bonusCriterionLabel[key] ?? key,
              `+${bonusPtsMap[key] ?? 0} ${pts}`,
              "#0891b2",
            ),
          )
          .join("");

  const tableBlock = (title: string, rows: string) => `
    <p style="margin:0 0 6px 0;color:#374151;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;">${title}</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">
      <tr>
        <td style="background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;padding:0 14px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tbody>${rows}</tbody>
          </table>
        </td>
      </tr>
    </table>`;

  const rulesHTML = groupConfig
    ? `
    <!-- GROUP RULES -->
    <tr>
      <td style="background:#f8fafc;padding:28px 32px;border-top:2px solid #e5e7eb;">
        <p style="margin:0 0 20px 0;color:#111827;font-size:15px;font-weight:800;letter-spacing:0.3px;">📋 ${c.groupRulesTitle}</p>
        ${tableBlock(c.groupSettingsSubtitle, settingsHTML)}
        ${scoringHTML ? tableBlock("🎯 " + c.groupScoringTitle, scoringHTML) : ""}
        ${ownershipHTML ? tableBlock("🏆 " + c.groupOwnershipTitle, ownershipHTML) : ""}
        ${tableBlock("⭐ " + c.groupBonusTitle, bonusHTML)}
        ${
          groupConfig?.mode !== "ownership"
            ? `<table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;">
              <p style="margin:0 0 4px 0;color:#92400e;font-size:13px;font-weight:700;">${c.groupTimingTitle}</p>
              <p style="margin:0;color:#78350f;font-size:13px;line-height:1.5;">${c.groupTimingBody}</p>
            </td>
          </tr>
        </table>`
            : `<table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 16px;">
              <p style="margin:0 0 4px 0;color:#1e40af;font-size:13px;font-weight:700;">${c.groupOwnershipTimingTitle}</p>
              <p style="margin:0;color:#1e3a8a;font-size:13px;line-height:1.5;">${c.groupOwnershipTimingBody}</p>
            </td>
          </tr>
        </table>`
        }
      </td>
    </tr>`
    : "";

  const stepsHTML = (
    groupConfig?.mode === "ownership"
      ? c.groupOwnershipWelcomeSteps
      : c.groupWelcomeSteps
  )
    .map(
      ([icon, title, desc]) => `
      <tr>
        <td style="padding:10px 0;vertical-align:top;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="width:44px;vertical-align:top;padding-top:2px;">
                <span style="display:inline-block;width:36px;height:36px;background:${accentColor};border-radius:50%;text-align:center;line-height:36px;font-size:18px;">${icon}</span>
              </td>
              <td style="padding-left:14px;">
                <p style="margin:0 0 2px 0;color:#111827;font-size:14px;font-weight:700;">${title}</p>
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.5;">${desc}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`,
    )
    .join("");

  const content = `
    <!-- HERO -->
    <tr>
      <td style="background:linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 50%,#2563eb 100%);padding:36px 32px;text-align:center;">
        <p style="margin:0 0 6px 0;color:#bfdbfe;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">${c.groupWelcomeBadge}</p>
        <h1 style="margin:0 0 8px 0;color:#ffffff;font-size:26px;font-weight:800;">
          ${c.groupWelcomeTitle(groupName)}
        </h1>
        <p style="margin:0;color:#bfdbfe;font-size:15px;">${c.groupWelcomeIntro(displayName)}</p>
      </td>
    </tr>

    ${rulesHTML}

    <tr>
      <td style="background:#ffffff;padding:40px 32px 32px;">
        <p style="margin:0 0 14px 0;color:#111827;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">${c.groupWelcomeNextTitle}</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
          ${stepsHTML}
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="background:#eff6ff;border-radius:12px;padding:28px;">
              <p style="margin:0 0 16px 0;color:#374151;font-size:14px;">${c.groupWelcomeCta}</p>
              <a href="${groupUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 48px;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.3px;">
                ${c.groupWelcomeBtn}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  return emailShell(content, locale);
}

/** Notification email sent to all members when a group is started.
 *  isDraft=true → snake draft room CTA; false → auto-assigned teams CTA */
function buildGroupStartEmail(
  displayName: string,
  groupName: string,
  groupId: string,
  appUrl: string,
  locale = "es",
  isDraft = true,
  mode = "",
): string {
  const c = t(locale);
  const isOwnership = mode === "ownership";
  const accentColor = isDraft ? "#7c3aed" : "#16a34a";
  const heroBg = isDraft
    ? "linear-gradient(135deg,#2e1065 0%,#5b21b6 50%,#7c3aed 100%)"
    : "linear-gradient(135deg,#14532d 0%,#15803d 50%,#16a34a 100%)";
  const heroBadgeColor = isDraft ? "#ddd6fe" : "#bbf7d0";
  const btnColor = isDraft ? "#7c3aed" : "#16a34a";
  const ctaBg = isDraft ? "#f5f3ff" : "#f0fdf4";

  const badge = isDraft ? c.groupDraftStartBadge : c.groupActiveStartBadge;
  const title = isDraft
    ? c.groupDraftStartTitle(groupName)
    : c.groupActiveStartTitle(groupName);
  const intro = isDraft
    ? c.groupDraftStartIntro(displayName)
    : isOwnership
      ? c.groupOwnershipActiveIntro(displayName)
      : c.groupActiveStartIntro(displayName);
  const steps = isDraft
    ? c.groupDraftStartSteps
    : isOwnership
      ? c.groupOwnershipActiveSteps
      : c.groupActiveStartSteps;
  const cta = isDraft
    ? c.groupDraftStartCta
    : isOwnership
      ? c.groupOwnershipActiveStartCta
      : c.groupActiveStartCta;
  const btn = isDraft ? c.groupDraftStartBtn : c.groupActiveStartBtn;
  const targetUrl = isDraft
    ? `${appUrl}/groups/${groupId}/draft`
    : `${appUrl}/groups/${groupId}`;

  const stepsHTML = steps
    .map(
      ([icon, stepTitle, desc]) => `
      <tr>
        <td style="padding:10px 0;vertical-align:top;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="width:44px;vertical-align:top;padding-top:2px;">
                <span style="display:inline-block;width:36px;height:36px;background:${accentColor};border-radius:50%;text-align:center;line-height:36px;font-size:18px;">${icon}</span>
              </td>
              <td style="padding-left:14px;">
                <p style="margin:0 0 2px 0;color:#111827;font-size:14px;font-weight:700;">${stepTitle}</p>
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.5;">${desc}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`,
    )
    .join("");

  const content = `
    <!-- HERO -->
    <tr>
      <td style="background:${heroBg};padding:36px 32px;text-align:center;">
        <p style="margin:0 0 6px 0;color:${heroBadgeColor};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">${badge}</p>
        <h1 style="margin:0 0 8px 0;color:#ffffff;font-size:26px;font-weight:800;">${title}</h1>
        <p style="margin:0;color:${heroBadgeColor};font-size:15px;">${intro}</p>
      </td>
    </tr>

    <tr>
      <td style="background:#ffffff;padding:40px 32px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
          ${stepsHTML}
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="background:${ctaBg};border-radius:12px;padding:28px;">
              <p style="margin:0 0 16px 0;color:#374151;font-size:14px;">${cta}</p>
              <a href="${targetUrl}" style="display:inline-block;background:${btnColor};color:#ffffff;text-decoration:none;padding:14px 48px;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.3px;">
                ${btn}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  return emailShell(content, locale);
}

// ─────────────────────────────────────────────────────────────────
// EMAIL SENDER WRAPPER
// ─────────────────────────────────────────────────────────────────
async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const resend = createResendClient();
  if (!resend) {
    console.warn("⚠️  Resend not configured — email not sent to:", opts.to);
    return;
  }
  await resend.emails.send({
    from:
      process.env.RESEND_FROM ||
      "FanQuin <no-reply-fanquin@disruptinglabs.com>",
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}

// ─────────────────────────────────────────────────────────────────
// AUTH MIDDLEWARE
// ─────────────────────────────────────────────────────────────────
interface AuthenticatedRequest extends express.Request {
  userId?: string;
  userProfile?: UserProfile;
}

const requireAuth: RequestHandler = async (
  req: AuthenticatedRequest,
  res,
  next,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ success: false, message: "No session token provided." });
    return;
  }

  const rawToken = authHeader.substring(7);
  const tokenHash = hashToken(rawToken);
  const supabase = getSupabaseAdmin();

  const { data: session, error } = await supabase
    .from("user_sessions")
    .select("user_id, expires_at")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !session) {
    res
      .status(401)
      .json({ success: false, message: "Invalid or expired session." });
    return;
  }

  // Touch last_seen_at (fire and forget)
  supabase
    .from("user_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("token_hash", tokenHash)
    .then(() => {});

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, first_name, last_name, phone, country, avatar_url, locale, created_at",
    )
    .eq("id", session.user_id)
    .single();

  if (!profile) {
    res
      .status(401)
      .json({ success: false, message: "User profile not found." });
    return;
  }

  req.userId = profile.id;
  req.userProfile = profile as UserProfile;
  next();
};

// ─────────────────────────────────────────────────────────────────
// APP FACTORY
// ─────────────────────────────────────────────────────────────────
export function createApp() {
  const app = express();

  app.use(express.json());

  // ──────────────────────────────────────────────────────────────
  // HEALTH
  // ──────────────────────────────────────────────────────────────
  app.get("/api/ping", (_req, res) => {
    res.json({
      success: true,
      data: { message: process.env.PING_MESSAGE || "pong" },
    });
  });

  // ──────────────────────────────────────────────────────────────
  // GET /api/auth/check-email
  // Returns whether a user with the given email already exists.
  // Used by the UI to decide whether to show the profile form.
  // ──────────────────────────────────────────────────────────────
  const handleCheckEmail: RequestHandler = async (req, res) => {
    try {
      const email = (req.query.email as string | undefined)
        ?.trim()
        .toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        res
          .status(400)
          .json({ success: false, message: "Invalid email address." });
        return;
      }
      const supabase = getSupabaseAdmin();
      const { data: listData } = await supabase.auth.admin.listUsers();
      const exists = (listData?.users ?? []).some((u) => u.email === email);
      res.json({ success: true, exists });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Failed to check email.",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  // ──────────────────────────────────────────────────────────────
  // GET /api/auth/check-username
  // Returns whether a given username is available (not taken).
  // ──────────────────────────────────────────────────────────────
  const handleCheckUsername: RequestHandler = async (req, res) => {
    try {
      const raw = (req.query.username as string | undefined)?.trim();
      const usernameRegex = /^[a-z0-9_]{3,30}$/;
      if (!raw || !usernameRegex.test(raw)) {
        res.status(400).json({
          success: false,
          available: false,
          message: "Invalid username format.",
        });
        return;
      }
      if (isBlockedUsername(raw)) {
        res.status(200).json({
          success: true,
          available: false,
          message: "Username not allowed.",
        });
        return;
      }
      const supabase = getSupabaseAdmin();
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", raw)
        .maybeSingle();
      res.json({ success: true, available: !existing });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Failed to check username.",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  // ──────────────────────────────────────────────────────────────
  // POST /api/auth/send-code
  // Send a 6-digit OTP to the user's email (or SMS in the future).
  // Creates the user profile automatically on first login.
  // ──────────────────────────────────────────────────────────────
  const handleSendCode: RequestHandler = async (req, res) => {
    try {
      const { identifier, delivery_method = "email" } = req.body as {
        identifier?: string;
        delivery_method?: string;
      };

      if (!identifier) {
        res
          .status(400)
          .json({ success: false, message: "identifier is required." });
        return;
      }
      if (delivery_method !== "email") {
        res.status(400).json({
          success: false,
          message: "Only delivery_method 'email' is supported.",
        });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identifier)) {
        res
          .status(400)
          .json({ success: false, message: "Invalid email address." });
        return;
      }

      const normalizedEmail = identifier.trim().toLowerCase();
      const supabase = getSupabaseAdmin();

      // Rate-limit: max 5 OTPs per identifier in the last 15 minutes
      const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("otp_requests")
        .select("id", { count: "exact", head: true })
        .eq("identifier", normalizedEmail)
        .gte("created_at", windowStart);

      if ((count ?? 0) >= 5) {
        res.status(429).json({
          success: false,
          message:
            "Too many code requests. Please wait 15 minutes and try again.",
        });
        return;
      }

      // Generate 6-digit code and bcrypt hash it
      const code = Math.floor(100000 + Math.random() * 900000);
      const salt = await bcrypt.genSalt(10);
      const codeHash = await bcrypt.hash(String(code), salt);

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const ip =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
        req.socket.remoteAddress ||
        null;

      await supabase.from("otp_requests").insert({
        identifier: normalizedEmail,
        delivery_method,
        code_hash: codeHash,
        expires_at: expiresAt,
        ip_address: ip,
      });

      // Look up the user to personalise the email (if they already exist)
      const { data: existingAuth } = await supabase.auth.admin.listUsers();
      const allUsers = existingAuth?.users ?? [];
      const existingUser = allUsers.find((u) => u.email === normalizedEmail);

      let displayName = "";
      let userLocale = "es";
      if (existingUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, locale")
          .eq("id", existingUser.id)
          .single();
        displayName = profile?.display_name || "";
        userLocale = profile?.locale || "es";
      }

      const otpCopy = emailCopy[userLocale as Locale] ?? emailCopy.es;
      // Send email
      try {
        await sendEmail({
          to: normalizedEmail,
          subject: otpCopy.otpSubject(code),
          html: buildOtpEmail(displayName, code, 10, userLocale),
        });
      } catch (emailError) {
        console.error("❌ Failed to send OTP email:", emailError);
        // Continue: code is valid even if email delivery fails in dev
      }

      const response: SendCodeResponse = {
        success: true,
        message: `Verification code sent to ${normalizedEmail}.`,
        ...(isDev && { debug_code: code }),
      };
      res.json(response);
    } catch (err) {
      console.error("Error in send-code:", err);
      res.status(500).json({
        success: false,
        message: "Failed to send verification code.",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  // ──────────────────────────────────────────────────────────────
  // POST /api/auth/verify-code
  // Verify OTP, provision Supabase auth user + profile on first login,
  // create a session row, return the opaque session token.
  // ──────────────────────────────────────────────────────────────
  const handleVerifyCode: RequestHandler = async (req, res) => {
    try {
      const {
        identifier,
        code,
        first_name,
        last_name,
        phone,
        country,
        username,
        locale: requestLocale,
      } = req.body as {
        identifier?: string;
        code?: string;
        first_name?: string;
        last_name?: string;
        phone?: string;
        country?: string;
        username?: string;
        locale?: string;
      };

      if (!identifier || !code) {
        res.status(400).json({
          success: false,
          message: "identifier and code are required.",
        });
        return;
      }

      const normalizedEmail = identifier.trim().toLowerCase();
      const supabase = getSupabaseAdmin();

      // Fetch the latest valid OTP request
      const { data: otpRow, error: otpErr } = await supabase
        .from("otp_requests")
        .select("id, code_hash, attempt_count, is_used, expires_at")
        .eq("identifier", normalizedEmail)
        .eq("is_used", false)
        .gt("expires_at", new Date().toISOString())
        .lt("attempt_count", 5)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (otpErr || !otpRow) {
        res.status(401).json({
          success: false,
          message: "No valid code found. Please request a new one.",
        });
        return;
      }

      // Verify bcrypt
      const codeMatch = await bcrypt.compare(
        String(code).trim(),
        otpRow.code_hash,
      );
      if (!codeMatch) {
        // Increment attempt counter
        await supabase
          .from("otp_requests")
          .update({ attempt_count: otpRow.attempt_count + 1 })
          .eq("id", otpRow.id);

        res.status(401).json({ success: false, message: "Invalid code." });
        return;
      }

      // Mark OTP as used
      await supabase
        .from("otp_requests")
        .update({ is_used: true, verified_at: new Date().toISOString() })
        .eq("id", otpRow.id);

      // Upsert Supabase auth user
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: normalizedEmail,
          email_confirm: true,
        });

      let authUserId: string;
      let isNewUser = false;

      if (
        authError?.message?.includes("already been registered") ||
        authError?.message?.includes("already exists")
      ) {
        // User already exists — look them up
        const { data: listData } = await supabase.auth.admin.listUsers();
        const allAuthUsers = listData?.users ?? [];
        const existing = allAuthUsers.find((u) => u.email === normalizedEmail);
        if (!existing) {
          res.status(500).json({
            success: false,
            message: "Could not resolve user account.",
          });
          return;
        }
        authUserId = existing.id;
      } else if (authError) {
        console.error("Auth user creation error:", authError);
        res.status(500).json({
          success: false,
          message: "Failed to provision user account.",
        });
        return;
      } else {
        authUserId = authData.user.id;
        isNewUser = true;
      }

      // Ensure profile row exists (the trigger handles it, but upsert is safe)
      const usernameRegex = /^[a-z0-9_]{3,30}$/;
      const usernameFromEmail = normalizedEmail
        .split("@")[0]
        .replace(/[^a-z0-9_]/gi, "_")
        .toLowerCase()
        .slice(0, 30);
      const candidateUsername = username?.trim().toLowerCase();
      const resolvedUsername =
        candidateUsername &&
        usernameRegex.test(candidateUsername) &&
        !isBlockedUsername(candidateUsername)
          ? candidateUsername
          : usernameFromEmail;

      const displayName =
        first_name && last_name
          ? `${first_name.trim()} ${last_name.trim()}`
          : resolvedUsername;

      const hasProfileData = !!(
        first_name?.trim() ||
        last_name?.trim() ||
        username?.trim() ||
        phone?.trim() ||
        country?.trim()
      );

      if (hasProfileData) {
        // New user provided profile data — UPDATE so the trigger-created row
        // gets overwritten with the user's actual chosen values.
        await supabase
          .from("profiles")
          .update({
            username: resolvedUsername,
            display_name: displayName,
            ...(first_name?.trim() && { first_name: first_name.trim() }),
            ...(last_name?.trim() && { last_name: last_name.trim() }),
            ...(phone?.trim() && { phone: phone.trim() }),
            ...(country?.trim() && { country: country.trim() }),
            ...(requestLocale && { locale: requestLocale }),
          })
          .eq("id", authUserId);
      } else {
        // Existing user re-authenticating — just ensure the profile row exists
        // (trigger already created it; this is a safe no-op on conflict).
        await supabase
          .from("profiles")
          .upsert(
            { id: authUserId },
            { onConflict: "id", ignoreDuplicates: true },
          );
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "id, username, display_name, first_name, last_name, phone, country, avatar_url, locale, created_at",
        )
        .eq("id", authUserId)
        .single();

      if (!profile) {
        res
          .status(500)
          .json({ success: false, message: "Failed to load user profile." });
        return;
      }

      // Create a new session
      const rawToken = generateSessionToken();
      const tokenHash = hashToken(rawToken);
      const ip =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
        req.socket.remoteAddress ||
        null;

      await supabase.from("user_sessions").insert({
        user_id: authUserId,
        token_hash: tokenHash,
        delivery_method: "email",
        ip_address: ip,
        expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });

      // Send welcome email for first-time login
      if (isNewUser) {
        const appUrl = process.env.APP_URL || "https://fanquin.com";
        // Prefer the locale sent by the client (reflects the UI language the
        // user was actually using), fall back to whatever is in the profile.
        const welcomeLocale = requestLocale || profile.locale || "es";
        const welcomeCopy = emailCopy[welcomeLocale as Locale] ?? emailCopy.es;
        sendEmail({
          to: normalizedEmail,
          subject: welcomeCopy.welcomeSubject,
          html: buildWelcomeEmail(
            // Use the in-memory displayName — profile.display_name may still
            // reflect the trigger-set email-derived value at this point.
            displayName,
            appUrl,
            welcomeLocale,
          ),
        }).catch((e) => console.error("Welcome email failed:", e));
      }

      const response: VerifyCodeResponse = {
        success: true,
        sessionToken: rawToken,
        isNewUser,
        user: profile as UserProfile,
      };
      res.json(response);
    } catch (err) {
      console.error("Error in verify-code:", err);
      res.status(500).json({
        success: false,
        message: "Failed to verify code.",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  // ──────────────────────────────────────────────────────────────
  // GET /api/auth/validate
  // Returns the current user if the session token is valid.
  // ──────────────────────────────────────────────────────────────
  const handleValidateSession: RequestHandler = async (
    req: AuthenticatedRequest,
    res,
  ) => {
    const response: ValidateSessionResponse = {
      success: true,
      user: req.userProfile!,
    };
    res.json(response);
  };

  // ──────────────────────────────────────────────────────────────
  // POST /api/auth/logout
  // Revokes the current session.
  // ──────────────────────────────────────────────────────────────
  const handleLogout: RequestHandler = async (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const tokenHash = hashToken(authHeader.substring(7));
      const supabase = getSupabaseAdmin();
      await supabase
        .from("user_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("token_hash", tokenHash);
    }
    res.json({ success: true, message: "Signed out." });
  };

  // ──────────────────────────────────────────────────────────────
  // GET /api/competitions
  // ──────────────────────────────────────────────────────────────
  app.get("/api/competitions", async (_req, res) => {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("competitions")
        .select("*")
        .eq("is_active", true)
        .eq("is_test", false)
        .order("starts_at", { ascending: true });

      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch competitions.",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // ──────────────────────────────────────────────────────────────
  // GET /api/competitions/:id/teams
  // ──────────────────────────────────────────────────────────────
  app.get("/api/competitions/:id/teams", async (req, res) => {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("competition_id", req.params.id)
        .order("group_label", { ascending: true })
        .order("tier", { ascending: true });

      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch teams.",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // ──────────────────────────────────────────────────────────────
  // GET /api/competitions/:id/matches
  // Query params: stage, status, group_label
  // ──────────────────────────────────────────────────────────────
  app.get("/api/competitions/:id/matches", async (req, res) => {
    try {
      const supabase = getSupabaseAdmin();
      let query = supabase
        .from("matches")
        .select(
          `
          *,
          venue:venues(*),
          home_team:teams!matches_home_team_id_fkey(*),
          away_team:teams!matches_away_team_id_fkey(*)
        `,
        )
        .eq("competition_id", req.params.id)
        .order("match_number", { ascending: true });

      if (req.query.stage) query = query.eq("stage", req.query.stage as string);
      if (req.query.status)
        query = query.eq("status", req.query.status as string);

      const { data, error } = await query;
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch matches.",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // ──────────────────────────────────────────────────────────────
  // GET /api/venues
  // ──────────────────────────────────────────────────────────────
  app.get("/api/venues", async (_req, res) => {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .order("country", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch venues.",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // ──────────────────────────────────────────────────────────────
  // GET /api/profile  (auth required)
  // ──────────────────────────────────────────────────────────────
  app.get("/api/profile", requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ success: true, data: req.userProfile });
  });

  // ──────────────────────────────────────────────────────────────
  // PATCH /api/profile  (auth required)
  // ──────────────────────────────────────────────────────────────
  app.patch(
    "/api/profile",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const {
          username,
          display_name,
          first_name,
          last_name,
          phone,
          country,
          avatar_url,
          locale,
        } = req.body;
        const supabase = getSupabaseAdmin();

        const updates: Record<string, string> = {};
        if (username) {
          const cleaned = username
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "_");
          if (isBlockedUsername(cleaned)) {
            res
              .status(400)
              .json({ success: false, message: "Username not allowed." });
            return;
          }
          updates.username = cleaned;
        }
        if (display_name) updates.display_name = display_name.trim();
        if (first_name) updates.first_name = first_name.trim();
        if (last_name) updates.last_name = last_name.trim();
        if (phone) updates.phone = phone.trim();
        if (country) updates.country = country.trim();
        if (avatar_url) updates.avatar_url = avatar_url.trim();
        if (locale) updates.locale = locale;

        // Auto-sync display_name when first/last name are updated and the current
        // display_name is still the username fallback (was never explicitly set).
        if (!display_name && (first_name || last_name)) {
          const currentProfile = req.userProfile!;
          const newFirst =
            first_name?.trim() ?? currentProfile.first_name ?? "";
          const newLast = last_name?.trim() ?? currentProfile.last_name ?? "";
          const derivedName = `${newFirst} ${newLast}`.trim();
          const currentDisplayName = currentProfile.display_name ?? "";
          const currentUsername = currentProfile.username ?? "";
          // Only auto-update if display_name was set to username (registration fallback)
          // or is null/empty — i.e., the user never explicitly set a custom display name.
          if (
            derivedName &&
            (currentDisplayName === currentUsername || !currentDisplayName)
          ) {
            updates.display_name = derivedName;
          }
        }

        if (Object.keys(updates).length === 0) {
          res
            .status(400)
            .json({ success: false, message: "No valid fields to update." });
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", req.userId!)
          .select(
            "id, username, display_name, first_name, last_name, phone, country, avatar_url, locale, created_at",
          )
          .single();

        if (error) throw error;
        res.json({ success: true, data });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to update profile.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────
  // GET /api/groups  (auth required)
  // Returns groups the user is a member of.
  // ──────────────────────────────────────────────────────────────
  app.get(
    "/api/groups",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from("group_members")
          .select(
            `
          groups(
            id, name, invite_code, competition_id, mode, draft_type,
            owner_id, max_members, scoring_config, is_active,
            group_members(count)
          )
        `,
          )
          .eq("user_id", req.userId!);

        if (error) throw error;
        const groups = (data ?? []).map((row: any) => ({
          ...row.groups,
          member_count: row.groups?.group_members?.[0]?.count ?? 0,
        }));
        res.json({ success: true, data: groups });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to fetch groups.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────
  // POST /api/groups  (auth required)
  // ──────────────────────────────────────────────────────────────
  app.post(
    "/api/groups",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const {
          name,
          competition_id,
          mode,
          draft_type = "snake",
          max_members = 50,
          bonus_criteria,
        } = req.body;

        if (!name || !competition_id || !mode) {
          res.status(400).json({
            success: false,
            message: "name, competition_id, and mode are required.",
          });
          return;
        }

        if (isBlockedUsername(name)) {
          res.status(400).json({
            success: false,
            message: "Group name not allowed.",
          });
          return;
        }

        const validModes = [
          "casual",
          "friends",
          "league",
          "competitive",
          "global",
          "ownership",
        ];
        if (!validModes.includes(mode)) {
          res.status(400).json({
            success: false,
            message: `mode must be one of: ${validModes.join(", ")}`,
          });
          return;
        }

        // Per-mode scoring config defaults:
        //  casual    – relaxed points, no ELO, no survivor
        //  friends   – defaults
        //  league    – ELO enabled (k=32), higher points per win
        //  competitive – survivor (3 lives), ELO (k=24), higher exact bonus
        //  global    – massive pool, lower ELO k-factor, weekly streak important
        const scoringDefaults: Record<string, object> = {
          casual: {
            exact_score_pts: 4,
            correct_winner_pts: 2,
            goal_difference_pts: 1,
            team_win_pts: 3,
            team_goal_pts: 1,
            team_clean_sheet_pts: 2,
            upset_base_pts: 3,
            streak_bonus_threshold: 3,
            streak_bonus_pts: 1,
            elo_k_factor: 0,
            survivor_lives: 1,
            weekly_reset_enabled: false,
          },
          friends: {
            exact_score_pts: 5,
            correct_winner_pts: 3,
            goal_difference_pts: 2,
            team_win_pts: 4,
            team_goal_pts: 1,
            team_clean_sheet_pts: 3,
            upset_base_pts: 5,
            streak_bonus_threshold: 3,
            streak_bonus_pts: 2,
            elo_k_factor: 0,
            survivor_lives: 1,
            weekly_reset_enabled: false,
          },
          league: {
            exact_score_pts: 6,
            correct_winner_pts: 3,
            goal_difference_pts: 2,
            team_win_pts: 5,
            team_goal_pts: 1,
            team_clean_sheet_pts: 3,
            upset_base_pts: 6,
            streak_bonus_threshold: 3,
            streak_bonus_pts: 2,
            elo_k_factor: 32,
            survivor_lives: 1,
            weekly_reset_enabled: true,
          },
          competitive: {
            exact_score_pts: 7,
            correct_winner_pts: 4,
            goal_difference_pts: 2,
            team_win_pts: 5,
            team_goal_pts: 1,
            team_clean_sheet_pts: 3,
            upset_base_pts: 7,
            streak_bonus_threshold: 3,
            streak_bonus_pts: 3,
            elo_k_factor: 24,
            survivor_lives: 3,
            weekly_reset_enabled: true,
          },
          global: {
            exact_score_pts: 5,
            correct_winner_pts: 3,
            goal_difference_pts: 2,
            team_win_pts: 4,
            team_goal_pts: 1,
            team_clean_sheet_pts: 3,
            upset_base_pts: 8,
            streak_bonus_threshold: 4,
            streak_bonus_pts: 3,
            elo_k_factor: 16,
            survivor_lives: 1,
            weekly_reset_enabled: true,
          },
          // ownership — no predictions; points come entirely from team results
          ownership: {
            exact_score_pts: 0,
            correct_winner_pts: 0,
            goal_difference_pts: 0,
            team_win_pts: 6,
            team_goal_pts: 2,
            team_clean_sheet_pts: 4,
            upset_base_pts: 0,
            streak_bonus_threshold: 3,
            streak_bonus_pts: 2,
            elo_k_factor: 0,
            survivor_lives: 1,
            weekly_reset_enabled: false,
          },
        };

        const supabase = getSupabaseAdmin();

        const { data: group, error } = await supabase
          .from("groups")
          .insert({
            name,
            competition_id,
            mode,
            draft_type,
            owner_id: req.userId!,
            max_members,
            scoring_config: scoringDefaults[mode] ?? scoringDefaults.friends,
            ...(bonus_criteria &&
            typeof bonus_criteria === "object" &&
            !Array.isArray(bonus_criteria)
              ? { bonus_criteria }
              : {}),
          })
          .select()
          .single();

        if (error) throw error;

        // Auto-join as admin
        await supabase.from("group_members").insert({
          group_id: group.id,
          user_id: req.userId!,
          role: "admin",
        });

        res.status(201).json({ success: true, data: group });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to create group.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────
  // PATCH /api/groups/:id  (auth required, owner only, waiting only)
  // Update group name, max_members, and/or bonus_criteria before the draft starts.
  // ──────────────────────────────────────────────────────────────
  app.patch(
    "/api/groups/:id",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const supabase = getSupabaseAdmin();
        const groupId = req.params.id;
        const { name, max_members, bonus_criteria } = req.body as {
          name?: string;
          max_members?: number;
          bonus_criteria?: {
            enabled?: string[];
            btts_pts?: number;
            total_goals_over_pts?: number;
            total_goals_threshold?: number;
            ft_winner_pts?: number;
            ht_winner_pts?: number;
            clean_sheet_pts?: number;
          };
        };

        // At least one field required
        if (
          name === undefined &&
          max_members === undefined &&
          bonus_criteria === undefined
        ) {
          res.status(400).json({
            success: false,
            message: "Provide at least one field to update.",
          });
          return;
        }

        // Validate name
        if (name !== undefined) {
          const trimmed = name.trim();
          if (trimmed.length < 3 || trimmed.length > 60) {
            res.status(400).json({
              success: false,
              message: "Group name must be between 3 and 60 characters.",
            });
            return;
          }
          if (isBlockedUsername(trimmed)) {
            res.status(400).json({
              success: false,
              message: "Group name not allowed.",
            });
            return;
          }
        }

        // Validate max_members
        if (max_members !== undefined) {
          const n = Number(max_members);
          if (!Number.isInteger(n) || n < 2 || n > 100) {
            res.status(400).json({
              success: false,
              message: "max_members must be an integer between 2 and 100.",
            });
            return;
          }
        }

        // Validate bonus_criteria
        const validCriterionKeys = [
          "btts",
          "total_goals_over",
          "ft_winner",
          "ht_winner",
          "clean_sheet",
        ];
        if (bonus_criteria !== undefined) {
          if (
            typeof bonus_criteria !== "object" ||
            Array.isArray(bonus_criteria)
          ) {
            res.status(400).json({
              success: false,
              message: "bonus_criteria must be an object.",
            });
            return;
          }
          if (bonus_criteria.enabled !== undefined) {
            if (
              !Array.isArray(bonus_criteria.enabled) ||
              bonus_criteria.enabled.some(
                (k) => !validCriterionKeys.includes(k),
              )
            ) {
              res.status(400).json({
                success: false,
                message: `bonus_criteria.enabled may only contain: ${validCriterionKeys.join(", ")}.`,
              });
              return;
            }
          }
          const ptFields = [
            "btts_pts",
            "total_goals_over_pts",
            "ft_winner_pts",
            "ht_winner_pts",
            "clean_sheet_pts",
          ] as const;
          for (const f of ptFields) {
            const v = bonus_criteria[f];
            if (v !== undefined && (!Number.isInteger(v) || v < 0 || v > 50)) {
              res.status(400).json({
                success: false,
                message: `${f} must be an integer between 0 and 50.`,
              });
              return;
            }
          }
          if (bonus_criteria.total_goals_threshold !== undefined) {
            const t = bonus_criteria.total_goals_threshold;
            if (typeof t !== "number" || t < 0 || t > 20) {
              res.status(400).json({
                success: false,
                message:
                  "total_goals_threshold must be a number between 0 and 20.",
              });
              return;
            }
          }
        }

        // Fetch group — must belong to this user and be in waiting status
        const { data: group, error: fetchErr } = await supabase
          .from("groups")
          .select("id, owner_id, status, bonus_criteria, group_members(count)")
          .eq("id", groupId)
          .single();

        if (fetchErr || !group) {
          res.status(404).json({ success: false, message: "Group not found." });
          return;
        }

        if (group.owner_id !== req.userId) {
          res.status(403).json({
            success: false,
            message: "Only the group owner can update settings.",
          });
          return;
        }

        if (group.status !== "waiting") {
          res.status(409).json({
            success: false,
            message:
              "Group settings can only be changed before the draft starts.",
          });
          return;
        }

        // If reducing max_members, make sure it's not below current member count
        if (max_members !== undefined) {
          const currentCount =
            (group.group_members as unknown as { count: number }[])?.[0]
              ?.count ?? 0;
          if (max_members < currentCount) {
            res.status(409).json({
              success: false,
              message: `Cannot set max members below current member count (${currentCount}).`,
            });
            return;
          }
        }

        const updates: Record<string, unknown> = {};
        if (name !== undefined) updates.name = name.trim();
        if (max_members !== undefined)
          updates.max_members = Number(max_members);
        if (bonus_criteria !== undefined) {
          // Merge with existing bonus_criteria rather than full-replace
          const existing =
            (group.bonus_criteria as Record<string, unknown>) ?? {};
          updates.bonus_criteria = { ...existing, ...bonus_criteria };
        }

        const { data: updated, error: updateErr } = await supabase
          .from("groups")
          .update(updates)
          .eq("id", groupId)
          .select()
          .single();

        if (updateErr || !updated) {
          res
            .status(500)
            .json({ success: false, message: "Failed to update group." });
          return;
        }

        res.json({ success: true, data: updated });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to update group.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────
  // PATCH /api/groups/:id/start  (auth required, owner only)
  // snake → status: draft + creates draft_sessions row
  // random/balanced_tier → auto-assigns all teams + status: active
  // ──────────────────────────────────────────────────────────────
  app.patch(
    "/api/groups/:id/start",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const supabase = getSupabaseAdmin();
        const groupId = req.params.id;
        const now = new Date().toISOString();

        const { data: group, error: groupErr } = await supabase
          .from("groups")
          .select(
            "id, name, owner_id, status, draft_type, competition_id, mode",
          )
          .eq("id", groupId)
          .single();

        if (groupErr || !group) {
          res.status(404).json({ success: false, message: "Group not found." });
          return;
        }
        if (group.owner_id !== req.userId) {
          res.status(403).json({
            success: false,
            message: "Only the group owner can start it.",
          });
          return;
        }
        if (group.status !== "waiting") {
          res.status(400).json({
            success: false,
            message: `Group is already ${group.status}.`,
          });
          return;
        }

        // Fetch members
        const { data: members, error: membersErr } = await supabase
          .from("group_members")
          .select("user_id")
          .eq("group_id", groupId);

        if (membersErr || !members || members.length === 0) {
          res
            .status(400)
            .json({ success: false, message: "No members in group." });
          return;
        }

        // Fetch competition teams
        const { data: teams, error: teamsErr } = await supabase
          .from("teams")
          .select("id, tier")
          .eq("competition_id", group.competition_id);

        if (teamsErr || !teams || teams.length === 0) {
          res.status(400).json({
            success: false,
            message: "No teams found for this competition.",
          });
          return;
        }

        const memberIds = members.map((m: any) => m.user_id);

        /** Fire-and-forget: fetch profiles+emails and send start notifications */
        const sendStartEmails = (isDraft: boolean) => {
          const appUrl = process.env.APP_URL || "https://fanquin.com";
          Promise.all(
            memberIds.map(async (uid: string) => {
              try {
                const [{ data: authUser }, { data: profileRow }] =
                  await Promise.all([
                    supabase.auth.admin.getUserById(uid),
                    supabase
                      .from("profiles")
                      .select("display_name, first_name, last_name, locale")
                      .eq("id", uid)
                      .single(),
                  ]);
                const email = authUser?.user?.email;
                if (!email) return;
                const locale = profileRow?.locale || "es";
                const displayName =
                  profileRow?.display_name ||
                  `${profileRow?.first_name ?? ""} ${profileRow?.last_name ?? ""}`.trim() ||
                  "";
                const copy = emailCopy[locale as Locale] ?? emailCopy.es;
                const subject = isDraft
                  ? copy.groupDraftStartSubject(group.name)
                  : copy.groupActiveStartSubject(group.name);
                await sendEmail({
                  to: email,
                  subject,
                  html: buildGroupStartEmail(
                    displayName,
                    group.name,
                    groupId as string,
                    appUrl,
                    locale,
                    isDraft,
                    group.mode ?? "",
                  ),
                });
              } catch {
                // non-critical per member
              }
            }),
          ).catch((e) => console.error("Group start emails failed:", e));
        };

        if (group.draft_type === "snake") {
          // Snake — interactive async draft; shuffle members for pick order
          const shuffled = [...memberIds].sort(() => Math.random() - 0.5);

          const { error: sessionErr } = await supabase
            .from("draft_sessions")
            .insert({
              group_id: groupId,
              member_order: shuffled,
              current_pick: 0,
              total_picks: teams.length,
              pick_deadline: new Date(Date.now() + 60_000).toISOString(),
            });

          if (sessionErr) throw sessionErr;

          const { data: updated, error: updateErr } = await supabase
            .from("groups")
            .update({ status: "draft", draft_started_at: now, updated_at: now })
            .eq("id", groupId)
            .select()
            .single();

          if (updateErr) throw updateErr;
          sendStartEmails(true);
          res.json({ success: true, data: updated });
          return;
        }

        // random or balanced_tier — auto-assign all teams immediately
        let orderedTeams: typeof teams;
        if (group.draft_type === "balanced_tier") {
          // Sort by tier so snake rotation balances tiers across members
          orderedTeams = [...teams].sort(
            (a: any, b: any) => (a.tier ?? 1) - (b.tier ?? 1),
          );
        } else {
          orderedTeams = [...teams].sort(() => Math.random() - 0.5);
        }

        const m = memberIds.length;
        const ownership = orderedTeams.map((team: any, i: number) => {
          const round0 = Math.floor(i / m);
          const posInRound = i % m;
          const memberIdx = round0 % 2 === 0 ? posInRound : m - 1 - posInRound;
          return {
            group_id: groupId,
            user_id: memberIds[memberIdx],
            team_id: team.id,
            draft_pick: i,
          };
        });

        const { error: ownershipErr } = await supabase
          .from("team_ownership")
          .insert(ownership);

        if (ownershipErr) throw ownershipErr;

        const { data: updated, error: updateErr } = await supabase
          .from("groups")
          .update({ status: "active", started_at: now, updated_at: now })
          .eq("id", groupId)
          .select()
          .single();

        if (updateErr) throw updateErr;
        sendStartEmails(false);
        await seedSurvivorLives(supabase, groupId as string);
        res.json({ success: true, data: updated });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to start group.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────
  // PATCH /api/groups/:id/activate  (auth required, owner only)
  // Transitions draft → active (after all picks are done)
  // ──────────────────────────────────────────────────────────────
  app.patch(
    "/api/groups/:id/activate",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const supabase = getSupabaseAdmin();
        const groupId = req.params.id;

        const { data: group, error: groupErr } = await supabase
          .from("groups")
          .select("id, owner_id, status")
          .eq("id", groupId)
          .single();

        if (groupErr || !group) {
          res.status(404).json({ success: false, message: "Group not found." });
          return;
        }
        if (group.owner_id !== req.userId) {
          res.status(403).json({
            success: false,
            message: "Only the group owner can activate it.",
          });
          return;
        }
        if (group.status !== "draft") {
          res.status(400).json({
            success: false,
            message: "Group must be in draft status to activate.",
          });
          return;
        }

        const { data: updated, error: updateErr } = await supabase
          .from("groups")
          .update({
            status: "active",
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", groupId)
          .select()
          .single();

        if (updateErr) throw updateErr;
        // Seed survivor lives now that the group is active
        await seedSurvivorLives(supabase, groupId as string);
        res.json({ success: true, data: updated });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to activate group.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────
  // PATCH /api/groups/:id/members/:userId/auto-pick  (admin only)
  // Enable or disable auto-pick for a member during a live draft
  // ──────────────────────────────────────────────────────────────
  app.patch(
    "/api/groups/:id/members/:userId/auto-pick",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const supabase = getSupabaseAdmin();
        const groupId = req.params.id;
        const targetUserId = req.params.userId;
        const { enabled } = req.body as { enabled: boolean };

        if (typeof enabled !== "boolean") {
          res.status(400).json({
            success: false,
            message: "'enabled' (boolean) is required.",
          });
          return;
        }

        // Caller must be admin of the group
        const { data: caller } = await supabase
          .from("group_members")
          .select("role")
          .eq("group_id", groupId)
          .eq("user_id", req.userId!)
          .single();

        if (!caller || caller.role !== "admin") {
          res.status(403).json({
            success: false,
            message: "Only the group admin can manage auto-pick.",
          });
          return;
        }

        // Target must be a member of the group
        const { data: target, error: targetErr } = await supabase
          .from("group_members")
          .select("id")
          .eq("group_id", groupId)
          .eq("user_id", targetUserId)
          .single();

        if (targetErr || !target) {
          res.status(404).json({
            success: false,
            message: "Member not found in this group.",
          });
          return;
        }

        const { error: updateErr } = await supabase
          .from("group_members")
          .update({ auto_pick: enabled })
          .eq("group_id", groupId)
          .eq("user_id", targetUserId);

        if (updateErr) throw updateErr;

        res.json({
          success: true,
          data: { user_id: targetUserId, auto_pick: enabled },
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to update auto-pick setting.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────
  // GET /api/groups/:id/draft  (auth required, member)
  // Returns full draft state: session, picks, available teams, members
  // ──────────────────────────────────────────────────────────────
  app.get(
    "/api/groups/:id/draft",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const supabase = getSupabaseAdmin();
        const groupId = req.params.id;

        const { data: membership } = await supabase
          .from("group_members")
          .select("id")
          .eq("group_id", groupId)
          .eq("user_id", req.userId!)
          .single();

        if (!membership) {
          res.status(403).json({
            success: false,
            message: "You are not a member of this group.",
          });
          return;
        }

        const { data: group } = await supabase
          .from("groups")
          .select("id, status, draft_type, competition_id")
          .eq("id", groupId)
          .single();

        // When status is "active" the draft is complete — return the finished
        // session so all members (not just the last picker) see the completion screen.
        if (group && group.status === "active") {
          const { data: session } = await supabase
            .from("draft_sessions")
            .select("*")
            .eq("group_id", groupId)
            .single();

          if (session) {
            const [{ data: picks }, { data: members }] = await Promise.all([
              supabase
                .from("draft_picks")
                .select(
                  `id, pick_number, round, auto_picked, picked_at, user_id, team_id,
                teams(id, name, short_name, country_code, flag_url, tier),
                profiles(username, display_name)`,
                )
                .eq("group_id", groupId)
                .order("pick_number", { ascending: true }),
              supabase
                .from("group_members")
                .select(
                  `id, group_id, user_id, role, total_points, joined_at,
                profiles(username, display_name, avatar_url)`,
                )
                .eq("group_id", groupId),
            ]);

            res.json({
              success: true,
              data: {
                session: {
                  group_id: groupId,
                  member_order: session.member_order ?? [],
                  current_pick: session.current_pick,
                  total_picks: session.total_picks,
                  pick_deadline: session.pick_deadline,
                  current_picker_id: null,
                  round: Math.ceil(
                    session.total_picks /
                      Math.max((session.member_order ?? []).length, 1),
                  ),
                  is_complete: true,
                },
                picks: (picks ?? []).map((p: any) => ({
                  id: p.id,
                  group_id: groupId,
                  user_id: p.user_id,
                  team_id: p.team_id,
                  pick_number: p.pick_number,
                  round: p.round,
                  auto_picked: p.auto_picked,
                  picked_at: p.picked_at,
                  team: p.teams,
                  username: p.profiles?.username ?? "",
                  display_name: p.profiles?.display_name ?? null,
                })),
                available_teams: [],
                members: (members ?? []).map((m: any) => ({
                  id: m.id,
                  group_id: m.group_id,
                  user_id: m.user_id,
                  username: m.profiles?.username ?? "",
                  display_name: m.profiles?.display_name ?? null,
                  avatar_url: m.profiles?.avatar_url ?? null,
                  role: m.role,
                  total_points: m.total_points,
                  joined_at: m.joined_at,
                })),
              },
            });
            return;
          }
        }

        if (!group || group.status !== "draft") {
          res
            .status(400)
            .json({ success: false, message: "Group is not in draft mode." });
          return;
        }

        const { data: session, error: sessionErr } = await supabase
          .from("draft_sessions")
          .select("*")
          .eq("group_id", groupId)
          .single();

        if (sessionErr || !session) {
          res
            .status(404)
            .json({ success: false, message: "Draft session not found." });
          return;
        }

        const [{ data: picks }, { data: allTeams }, { data: members }] =
          await Promise.all([
            supabase
              .from("draft_picks")
              .select(
                `id, pick_number, round, auto_picked, picked_at, user_id, team_id,
              teams(id, name, short_name, country_code, flag_url, tier),
              profiles(username, display_name)`,
              )
              .eq("group_id", groupId)
              .order("pick_number", { ascending: true }),
            supabase
              .from("teams")
              .select(
                "id, name, short_name, country_code, flag_url, tier, competition_id, group_label, is_placeholder",
              )
              .eq("competition_id", group.competition_id)
              .order("tier", { ascending: true }),
            supabase
              .from("group_members")
              .select(
                `id, group_id, user_id, role, auto_pick, total_points, joined_at,
              profiles(username, display_name, avatar_url)`,
              )
              .eq("group_id", groupId),
          ]);

        // ── Auto-pick: if the current picker has auto_pick=true OR their
        // pick_deadline has expired, execute picks on their behalf.
        let sessionCurrentPick: number = session.current_pick;
        let updatedPicks = picks ? [...picks] : [];

        {
          const memberAutoPickMap: Record<string, boolean> = {};
          for (const m of members ?? []) {
            memberAutoPickMap[(m as any).user_id] = !!(m as any).auto_pick;
          }

          const pickedSet = new Set(updatedPicks.map((p: any) => p.team_id));
          const sortedTeams = (allTeams ?? [])
            .slice()
            .sort((a: any, b: any) => (a.tier ?? 99) - (b.tier ?? 99));

          const memberOrder2: string[] = session.member_order ?? [];
          const mLen = memberOrder2.length;
          // Only the very first iteration may be triggered by a deadline expiry.
          // Subsequent picks in the same loop are only due to explicit auto_pick=true.
          let deadlineExpired =
            !!session.pick_deadline &&
            new Date(session.pick_deadline) < new Date();

          while (sessionCurrentPick < session.total_picks) {
            const r2 = Math.floor(sessionCurrentPick / mLen);
            const pos2 = sessionCurrentPick % mLen;
            const idx2 = r2 % 2 === 0 ? pos2 : mLen - 1 - pos2;
            const pickerId = memberOrder2[idx2];

            if (!memberAutoPickMap[pickerId] && !deadlineExpired) break; // human, not timed out
            deadlineExpired = false; // only applies once per request

            // Find the first available team (lowest tier first)
            const autoTeam = sortedTeams.find((t: any) => !pickedSet.has(t.id));
            if (!autoTeam) break;

            const autoRound = r2 + 1;
            const { error: autoPickErr } = await supabase
              .from("draft_picks")
              .insert({
                group_id: groupId,
                user_id: pickerId,
                team_id: (autoTeam as any).id,
                pick_number: sessionCurrentPick,
                round: autoRound,
                auto_picked: true,
              });

            if (autoPickErr) break; // stop on error, don't loop forever

            await supabase.from("team_ownership").insert({
              group_id: groupId,
              user_id: pickerId,
              team_id: (autoTeam as any).id,
              draft_pick: sessionCurrentPick,
            });

            pickedSet.add((autoTeam as any).id);
            sessionCurrentPick += 1;

            // Add fake pick row to our in-memory list for the response
            updatedPicks.push({
              id: crypto.randomUUID(),
              pick_number: sessionCurrentPick - 1,
              round: autoRound,
              auto_picked: true,
              picked_at: new Date().toISOString(),
              user_id: pickerId,
              team_id: (autoTeam as any).id,
              teams: autoTeam,
              profiles: null,
            } as any);
          }

          // Flush updated current_pick + new deadline to DB if any auto-picks happened
          if (sessionCurrentPick !== session.current_pick) {
            const isDraftDone = sessionCurrentPick >= session.total_picks;
            await supabase
              .from("draft_sessions")
              .update({
                current_pick: sessionCurrentPick,
                pick_deadline: isDraftDone
                  ? null
                  : new Date(Date.now() + 60_000).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("group_id", groupId);

            if (isDraftDone) {
              await supabase
                .from("groups")
                .update({
                  status: "active",
                  started_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", groupId);
              seedSurvivorLives(supabase, groupId as string).catch(
                console.error,
              );
            }
          }
        }

        const pickedTeamIds = new Set(updatedPicks.map((p: any) => p.team_id));
        const availableTeams = (allTeams ?? []).filter(
          (t: any) => !pickedTeamIds.has(t.id),
        );

        const memberOrder: string[] = session.member_order ?? [];
        const currentPick: number = sessionCurrentPick;
        const isComplete = currentPick >= session.total_picks;
        let currentPickerId: string | null = null;
        let round = 1;

        if (!isComplete && memberOrder.length > 0) {
          const m = memberOrder.length;
          const r = Math.floor(currentPick / m);
          const posInRound = currentPick % m;
          const idx = r % 2 === 0 ? posInRound : m - 1 - posInRound;
          currentPickerId = memberOrder[idx];
          round = r + 1;
        }

        res.json({
          success: true,
          data: {
            session: {
              group_id: groupId,
              member_order: memberOrder,
              current_pick: currentPick,
              total_picks: session.total_picks,
              pick_deadline: session.pick_deadline,
              current_picker_id: currentPickerId,
              round,
              is_complete: isComplete,
            },
            picks: updatedPicks.map((p: any) => ({
              id: p.id,
              group_id: groupId,
              user_id: p.user_id,
              team_id: p.team_id,
              pick_number: p.pick_number,
              round: p.round,
              auto_picked: p.auto_picked,
              picked_at: p.picked_at,
              team: p.teams,
              username: p.profiles?.username ?? "",
              display_name: p.profiles?.display_name ?? null,
            })),
            available_teams: availableTeams,
            members: (members ?? []).map((m: any) => ({
              id: m.id,
              group_id: m.group_id,
              user_id: m.user_id,
              username: m.profiles?.username ?? "",
              display_name: m.profiles?.display_name ?? null,
              avatar_url: m.profiles?.avatar_url ?? null,
              role: m.role,
              auto_pick: m.auto_pick ?? false,
              total_points: m.total_points,
              joined_at: m.joined_at,
            })),
          },
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to fetch draft state.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────
  // POST /api/groups/:id/picks  (auth required, must be your turn)
  // Submit a draft pick; advances session; auto-activates when done
  // ──────────────────────────────────────────────────────────────
  app.post(
    "/api/groups/:id/picks",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const supabase = getSupabaseAdmin();
        const groupId = req.params.id;
        const { team_id } = req.body as { team_id?: string };

        if (!team_id) {
          res
            .status(400)
            .json({ success: false, message: "team_id is required." });
          return;
        }

        const { data: membership } = await supabase
          .from("group_members")
          .select("id")
          .eq("group_id", groupId)
          .eq("user_id", req.userId!)
          .single();

        if (!membership) {
          res.status(403).json({
            success: false,
            message: "You are not a member of this group.",
          });
          return;
        }

        const { data: session, error: sessionErr } = await supabase
          .from("draft_sessions")
          .select("*")
          .eq("group_id", groupId)
          .single();

        if (sessionErr || !session) {
          res
            .status(404)
            .json({ success: false, message: "Draft session not found." });
          return;
        }

        if (session.current_pick >= session.total_picks) {
          res
            .status(400)
            .json({ success: false, message: "Draft is already complete." });
          return;
        }

        // Verify it's this user's turn
        const memberOrder: string[] = session.member_order ?? [];
        const m = memberOrder.length;
        const round0 = Math.floor(session.current_pick / m);
        const posInRound = session.current_pick % m;
        const idx = round0 % 2 === 0 ? posInRound : m - 1 - posInRound;

        if (memberOrder[idx] !== req.userId) {
          res
            .status(403)
            .json({ success: false, message: "It is not your turn to pick." });
          return;
        }

        // Verify team not already picked
        const { data: alreadyPicked } = await supabase
          .from("draft_picks")
          .select("id")
          .eq("group_id", groupId)
          .eq("team_id", team_id)
          .maybeSingle();

        if (alreadyPicked) {
          res.status(409).json({
            success: false,
            message: "This team has already been picked.",
          });
          return;
        }

        // Verify team belongs to competition
        const { data: group } = await supabase
          .from("groups")
          .select("competition_id")
          .eq("id", groupId)
          .single();

        const { data: teamRow } = await supabase
          .from("teams")
          .select("id")
          .eq("id", team_id)
          .eq("competition_id", group!.competition_id)
          .maybeSingle();

        if (!teamRow) {
          res.status(400).json({
            success: false,
            message: "Team not found in this competition.",
          });
          return;
        }

        const pickNumber = session.current_pick;
        const round = round0 + 1;

        // Insert draft pick + team_ownership atomically via separate inserts
        const { error: pickErr } = await supabase.from("draft_picks").insert({
          group_id: groupId,
          user_id: req.userId!,
          team_id,
          pick_number: pickNumber,
          round,
          auto_picked: false,
        });

        if (pickErr) throw pickErr;

        const { error: ownershipErr } = await supabase
          .from("team_ownership")
          .insert({
            group_id: groupId,
            user_id: req.userId!,
            team_id,
            draft_pick: pickNumber,
          });

        if (ownershipErr) throw ownershipErr;

        const nextPick = pickNumber + 1;
        const isComplete = nextPick >= session.total_picks;

        await supabase
          .from("draft_sessions")
          .update({
            current_pick: nextPick,
            pick_deadline: isComplete
              ? null
              : new Date(Date.now() + 60_000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("group_id", groupId);

        if (isComplete) {
          await supabase
            .from("groups")
            .update({
              status: "active",
              started_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", groupId);
          // Seed survivor lives for competitive/global groups
          seedSurvivorLives(supabase, groupId as string).catch(console.error);
        }

        // Compute next picker for response
        let nextPickerId: string | null = null;
        if (!isComplete) {
          const nr = Math.floor(nextPick / m);
          const np = nextPick % m;
          const ni = nr % 2 === 0 ? np : m - 1 - np;
          nextPickerId = memberOrder[ni];
        }

        // Send draft-complete summary email to all members (fire-and-forget)
        if (isComplete) {
          const appUrl = process.env.APP_URL || "https://fanquin.com";
          Promise.all([
            supabase
              .from("draft_picks")
              .select(
                `user_id, team_id, pick_number, teams(name, short_name, tier, flag_url)`,
              )
              .eq("group_id", groupId)
              .order("pick_number", { ascending: true }),
            supabase
              .from("group_members")
              .select(`user_id, profiles(username, display_name)`)
              .eq("group_id", groupId),
            supabase.from("groups").select("name").eq("id", groupId).single(),
          ])
            .then(
              async ([
                { data: allPicks },
                { data: allMembers },
                { data: grp },
              ]) => {
                if (!allPicks || !allMembers || !grp) return;
                const groupName = grp.name as string;
                const memberPicks = allMembers.map((mem: any) => ({
                  userId: mem.user_id as string,
                  name:
                    (mem.profiles?.display_name as string | null) ??
                    (mem.profiles?.username as string | null) ??
                    "Player",
                  teams: (allPicks as any[])
                    .filter((p: any) => p.user_id === mem.user_id)
                    .map((p: any) => ({
                      name: p.teams?.name ?? "",
                      shortName: p.teams?.short_name ?? null,
                      tier: p.teams?.tier ?? null,
                      flagUrl: p.teams?.flag_url ?? null,
                    })),
                }));
                const emailPromises = await Promise.all(
                  allMembers.map(async (mem: any) => {
                    const { data: authUser } =
                      await supabase.auth.admin.getUserById(mem.user_id);
                    const email = authUser?.user?.email;
                    if (!email) return;
                    const locale: string =
                      (authUser?.user?.user_metadata?.locale as string) ?? "es";
                    const displayName =
                      (mem.profiles?.display_name as string | null) ??
                      (mem.profiles?.username as string | null) ??
                      "";
                    const copy = emailCopy[locale as Locale] ?? emailCopy.es;
                    return sendEmail({
                      to: email,
                      subject: copy.draftCompleteSubject(groupName),
                      html: buildDraftCompleteEmail(
                        displayName,
                        groupName,
                        groupId as string,
                        memberPicks,
                        appUrl,
                        locale,
                      ),
                    });
                  }),
                );
                return emailPromises;
              },
            )
            .catch((e) => console.error("Draft complete email failed:", e));
        }

        res.status(201).json({
          success: true,
          data: {
            pick_number: pickNumber,
            round,
            next_picker_id: nextPickerId,
            is_complete: isComplete,
          },
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to submit pick.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────
  // GET /api/groups/:id  (auth required, must be member)
  // ──────────────────────────────────────────────────────────────
  app.get(
    "/api/groups/:id",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const supabase = getSupabaseAdmin();

        // Verify membership
        const { data: membership } = await supabase
          .from("group_members")
          .select("role")
          .eq("group_id", req.params.id)
          .eq("user_id", req.userId!)
          .single();

        if (!membership) {
          res.status(403).json({
            success: false,
            message: "You are not a member of this group.",
          });
          return;
        }

        const { data: group, error } = await supabase
          .from("groups")
          .select(`*, group_members(count)`)
          .eq("id", req.params.id)
          .single();

        if (error || !group) {
          res.status(404).json({ success: false, message: "Group not found." });
          return;
        }

        res.json({
          success: true,
          data: {
            ...group,
            member_count: group.group_members?.[0]?.count ?? 0,
          },
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to fetch group.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────
  // POST /api/groups/join  (auth required)
  // ──────────────────────────────────────────────────────────────
  app.post(
    "/api/groups/join",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { invite_code } = req.body;

        if (!invite_code) {
          res
            .status(400)
            .json({ success: false, message: "invite_code is required." });
          return;
        }

        const supabase = getSupabaseAdmin();

        const { data: group, error } = await supabase
          .from("groups")
          .select(
            "id, name, status, max_members, mode, draft_type, scoring_config, bonus_criteria, group_members(count)",
          )
          .eq("invite_code", invite_code.trim().toLowerCase())
          .eq("is_active", true)
          .single();

        if (error || !group) {
          res.status(404).json({
            success: false,
            message: "Invalid or expired invite code.",
          });
          return;
        }

        if (group.status === "draft" || group.status === "active") {
          res.status(409).json({
            success: false,
            message:
              "This group has already started and is no longer accepting new members.",
          });
          return;
        }

        const currentCount = group.group_members?.[0]?.count ?? 0;
        if (currentCount >= group.max_members) {
          res
            .status(409)
            .json({ success: false, message: "This group is full." });
          return;
        }

        // Check if already a member
        const { data: existing } = await supabase
          .from("group_members")
          .select("id")
          .eq("group_id", group.id)
          .eq("user_id", req.userId!)
          .single();

        if (existing) {
          res.status(409).json({
            success: false,
            message: "You are already in this group.",
          });
          return;
        }

        const { error: joinError } = await supabase
          .from("group_members")
          .insert({ group_id: group.id, user_id: req.userId!, role: "member" });

        if (joinError) throw joinError;

        // Fire-and-forget group join welcome email
        const joinLocale = req.userProfile?.locale || "es";
        const joinCopy = emailCopy[joinLocale as Locale] ?? emailCopy.es;
        const appUrl = process.env.APP_URL || "https://fanquin.com";
        supabase.auth.admin
          .getUserById(req.userId!)
          .then(({ data: authUser }) => {
            const email = authUser?.user?.email;
            if (!email) return;
            return sendEmail({
              to: email,
              subject: joinCopy.groupWelcomeSubject(group.name),
              html: buildGroupWelcomeEmail(
                req.userProfile?.display_name || "",
                group.name,
                group.id,
                appUrl,
                joinLocale,
                {
                  mode: group.mode,
                  draft_type: group.draft_type,
                  max_members: group.max_members,
                  scoring_config: (group.scoring_config ?? {}) as Record<
                    string,
                    unknown
                  >,
                  bonus_criteria: (group.bonus_criteria ?? {}) as {
                    enabled?: string[];
                    btts_pts?: number;
                    total_goals_over_pts?: number;
                    total_goals_threshold?: number;
                    ft_winner_pts?: number;
                    ht_winner_pts?: number;
                    clean_sheet_pts?: number;
                  },
                },
              ),
            });
          })
          .catch((e) => console.error("Group join email failed:", e));

        res.status(201).json({
          success: true,
          data: { group_id: group.id, group_name: group.name },
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to join group.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────
  // GET /api/groups/:id/leaderboard  (auth required, member)
  // ──────────────────────────────────────────────────────────────
  app.get(
    "/api/groups/:id/leaderboard",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const supabase = getSupabaseAdmin();

        const { data: membership } = await supabase
          .from("group_members")
          .select("id")
          .eq("group_id", req.params.id)
          .eq("user_id", req.userId!)
          .single();

        if (!membership) {
          res.status(403).json({
            success: false,
            message: "You are not a member of this group.",
          });
          return;
        }

        const { data, error } = await supabase
          .from("group_members")
          .select(
            `
          user_id, total_points, prediction_pts, ownership_pts,
          current_streak, elo_rating, rank, is_eliminated, survivor_lives,
          profiles(username, display_name, first_name, last_name, avatar_url)
        `,
          )
          .eq("group_id", req.params.id)
          .order("total_points", { ascending: false });

        if (error) throw error;

        const leaderboard = (data ?? []).map((row: any, i: number) => ({
          rank: row.rank ?? i + 1,
          user_id: row.user_id,
          username: row.profiles?.username ?? "",
          display_name: row.profiles?.display_name ?? null,
          first_name: row.profiles?.first_name ?? null,
          last_name: row.profiles?.last_name ?? null,
          avatar_url: row.profiles?.avatar_url ?? null,
          total_points: row.total_points,
          prediction_pts: row.prediction_pts,
          ownership_pts: row.ownership_pts,
          current_streak: row.current_streak,
          elo_rating: row.elo_rating,
          is_eliminated: row.is_eliminated ?? false,
          survivor_lives: row.survivor_lives ?? null,
        }));

        res.json({ success: true, data: leaderboard });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to fetch leaderboard.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────
  // GET /api/groups/:id/ownership  (auth required, member)
  // ──────────────────────────────────────────────────────────────
  app.get(
    "/api/groups/:id/ownership",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const supabase = getSupabaseAdmin();

        const { data: membership } = await supabase
          .from("group_members")
          .select("id")
          .eq("group_id", req.params.id)
          .eq("user_id", req.userId!)
          .single();

        if (!membership) {
          res.status(403).json({
            success: false,
            message: "You are not a member of this group.",
          });
          return;
        }

        const { data, error } = await supabase
          .from("team_ownership")
          .select(
            `
          id, draft_pick, total_pts, wins_pts, goals_pts, clean_sheet_pts, user_id,
          teams(*),
          profiles(username, display_name)
        `,
          )
          .eq("group_id", req.params.id)
          .order("draft_pick", { ascending: true, nullsFirst: false });

        if (error) throw error;

        const ownership = (data ?? []).map((row: any) => ({
          id: row.id,
          group_id: req.params.id,
          user_id: row.user_id,
          username: row.profiles?.username ?? "",
          display_name: row.profiles?.display_name ?? null,
          team: row.teams,
          draft_pick: row.draft_pick,
          total_pts: row.total_pts,
          wins_pts: row.wins_pts,
          goals_pts: row.goals_pts,
          clean_sheet_pts: row.clean_sheet_pts,
        }));

        res.json({ success: true, data: ownership });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to fetch team ownership.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────
  // POST /api/predictions  (auth required)
  // Creates or updates (upserts) a single prediction before lock time.
  // ──────────────────────────────────────────────────────────────
  app.post(
    "/api/predictions",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { group_id, match_id, predicted_home, predicted_away, details } =
          req.body;

        if (
          !group_id ||
          !match_id ||
          predicted_home === undefined ||
          predicted_away === undefined
        ) {
          res.status(400).json({
            success: false,
            message:
              "group_id, match_id, predicted_home, and predicted_away are required.",
          });
          return;
        }
        if (
          !Number.isInteger(predicted_home) ||
          !Number.isInteger(predicted_away) ||
          predicted_home < 0 ||
          predicted_away < 0
        ) {
          res.status(400).json({
            success: false,
            message:
              "predicted_home and predicted_away must be non-negative integers.",
          });
          return;
        }

        // Validate bonus prediction details shape if provided
        if (
          details !== undefined &&
          (typeof details !== "object" || Array.isArray(details))
        ) {
          res
            .status(400)
            .json({ success: false, message: "details must be an object." });
          return;
        }
        const safeDetails = details ?? {};
        if (
          safeDetails.btts !== undefined &&
          typeof safeDetails.btts !== "boolean"
        ) {
          res.status(400).json({
            success: false,
            message: "details.btts must be a boolean.",
          });
          return;
        }
        if (
          safeDetails.total_goals_over !== undefined &&
          typeof safeDetails.total_goals_over !== "boolean"
        ) {
          res.status(400).json({
            success: false,
            message: "details.total_goals_over must be a boolean.",
          });
          return;
        }
        if (
          safeDetails.ht_winner !== undefined &&
          !["home", "draw", "away"].includes(safeDetails.ht_winner)
        ) {
          res.status(400).json({
            success: false,
            message: "details.ht_winner must be 'home', 'draw', or 'away'.",
          });
          return;
        }
        if (
          safeDetails.clean_sheet !== undefined &&
          !["home", "away", "none"].includes(safeDetails.clean_sheet)
        ) {
          res.status(400).json({
            success: false,
            message: "details.clean_sheet must be 'home', 'away', or 'none'.",
          });
          return;
        }

        const supabase = getSupabaseAdmin();

        // Verify membership
        const { data: membership } = await supabase
          .from("group_members")
          .select("id")
          .eq("group_id", group_id)
          .eq("user_id", req.userId!)
          .single();

        if (!membership) {
          res.status(403).json({
            success: false,
            message: "You are not a member of this group.",
          });
          return;
        }

        // Check prediction lock
        const { data: match, error: matchErr } = await supabase
          .from("matches")
          .select("id, prediction_lock, status, home_team_id, away_team_id")
          .eq("id", match_id)
          .single();

        if (matchErr || !match) {
          res.status(404).json({ success: false, message: "Match not found." });
          return;
        }
        if (match.status !== "scheduled") {
          res.status(409).json({
            success: false,
            message: "Predictions are closed for this match.",
          });
          return;
        }
        if (
          match.prediction_lock &&
          new Date(match.prediction_lock) <= new Date()
        ) {
          res.status(409).json({
            success: false,
            message: "Prediction window has closed for this match.",
          });
          return;
        }

        // Block predictions entirely for ownership-mode groups
        const { data: groupRecord } = await supabase
          .from("groups")
          .select("mode")
          .eq("id", group_id)
          .single();

        if ((groupRecord as any)?.mode === "ownership") {
          res.status(403).json({
            success: false,
            message:
              "This group uses Team Tracking mode — points are earned automatically from your teams' results. No predictions are allowed.",
          });
          return;
        }

        // Enforce draft ownership: if the user has drafted teams in this group,
        // they may only predict matches involving one of those teams.
        const { data: ownedTeams } = await supabase
          .from("team_ownership")
          .select("team_id")
          .eq("group_id", group_id)
          .eq("user_id", req.userId!);

        if (ownedTeams && ownedTeams.length > 0) {
          const ownedIds = new Set(ownedTeams.map((o: any) => o.team_id));
          if (
            !ownedIds.has((match as any).home_team_id) &&
            !ownedIds.has((match as any).away_team_id)
          ) {
            res.status(403).json({
              success: false,
              message:
                "You can only predict matches involving your drafted teams.",
            });
            return;
          }
        }

        const { data: prediction, error } = await supabase
          .from("predictions")
          .upsert(
            {
              group_id,
              match_id,
              user_id: req.userId!,
              predicted_home,
              predicted_away,
              details: safeDetails,
              result: "pending",
            },
            { onConflict: "group_id,user_id,match_id" },
          )
          .select()
          .single();

        if (error) throw error;
        res.status(201).json({ success: true, data: prediction });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to submit prediction.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────
  // GET /api/groups/:id/predictions  (auth required, member)
  // Returns the current user's predictions for all matches in the group's competition.
  // ──────────────────────────────────────────────────────────────
  app.get(
    "/api/groups/:id/predictions",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const supabase = getSupabaseAdmin();

        const { data: membership } = await supabase
          .from("group_members")
          .select("id")
          .eq("group_id", req.params.id)
          .eq("user_id", req.userId!)
          .single();

        if (!membership) {
          res.status(403).json({
            success: false,
            message: "You are not a member of this group.",
          });
          return;
        }

        const { data, error } = await supabase
          .from("predictions")
          .select(
            `
          id, match_id, predicted_home, predicted_away, result,
          points_earned, upset_pts, submitted_at,
          matches(
            id, match_date, stage, match_number, status, prediction_lock,
            home_score, away_score,
            home_team:teams!matches_home_team_id_fkey(id, name, short_name, flag_url),
            away_team:teams!matches_away_team_id_fkey(id, name, short_name, flag_url),
            venue:venues(name, city)
          )
        `,
          )
          .eq("group_id", req.params.id)
          .eq("user_id", req.userId!)
          .order("matches(match_number)", { ascending: true });

        if (error) throw error;
        res.json({ success: true, data });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to fetch predictions.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────
  // GET /api/live  (optional auth)
  // Returns live / upcoming / recent matches for the most active
  // competition. If a valid Bearer token is supplied, enriches each
  // match with the user's predictions across their active groups.
  // No external API call — reads only from the Supabase DB.
  // ──────────────────────────────────────────────────────────────
  app.get("/api/live", async (req: AuthenticatedRequest, res) => {
    try {
      const supabase = getSupabaseAdmin();

      // ── Optional auth ──────────────────────────────────────────
      let userId: string | null = null;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        const rawToken = authHeader.substring(7);
        const tokenHash = hashToken(rawToken);
        const { data: session } = await supabase
          .from("user_sessions")
          .select("user_id")
          .eq("token_hash", tokenHash)
          .is("revoked_at", null)
          .gt("expires_at", new Date().toISOString())
          .single();
        userId = session?.user_id ?? null;
      }

      // ── Resolve competition ────────────────────────────────────
      // Priority: explicit ?competition_id → user's active group competition
      //           → most active non-test competition (unauthenticated fallback)
      const competitionId = req.query.competition_id as string | undefined;
      let competition: Record<string, unknown> | null = null;

      if (competitionId) {
        const { data } = await supabase
          .from("competitions")
          .select("*")
          .eq("id", competitionId)
          .single();
        competition = data;
      } else if (userId) {
        // Find the competition the user is actively playing in
        const { data: membership } = await supabase
          .from("group_members")
          .select("groups(competition_id, competitions(*))")
          .eq("user_id", userId)
          .limit(1)
          .single();
        const comp = (membership as any)?.groups?.competitions;
        if (comp) {
          competition = comp;
        } else {
          // User has no groups yet — return empty so LivePage shows join prompt
          res.json({
            success: true,
            data: {
              live: [],
              upcoming: [],
              recent: [],
              my_active_groups: [],
              last_synced_at: null,
              competition: null,
            },
          });
          return;
        }
      } else {
        const { data } = await supabase
          .from("competitions")
          .select("*")
          .eq("is_active", true)
          .eq("is_test", false)
          .order("starts_at", { ascending: true })
          .limit(1)
          .single();
        competition = data;
      }

      if (!competition) {
        res.json({
          success: true,
          data: {
            live: [],
            upcoming: [],
            recent: [],
            my_active_groups: [],
            last_synced_at: null,
            competition: null,
          },
        });
        return;
      }

      // ── Auto-reschedule test competition matches ────────────────
      // When the test league is loaded, silently rebase all 5 test
      // matches to 5-min intervals from now (no data wipe).
      if ((competition as any).is_test === true) {
        const MIN = 60_000;
        const now = Date.now();
        const ts = (ms: number) => new Date(now + ms).toISOString();
        const testMatchIds = [
          "ffffffff-3333-0000-0000-000000000001",
          "ffffffff-3333-0000-0000-000000000002",
          "ffffffff-3333-0000-0000-000000000003",
          "ffffffff-3333-0000-0000-000000000004",
          "ffffffff-3333-0000-0000-000000000005",
        ];
        await Promise.all(
          testMatchIds.map((id, i) =>
            supabase
              .from("matches")
              .update({
                status: "scheduled",
                match_date: ts((i + 1) * 5 * MIN),
                prediction_lock: ts((i + 1) * 5 * MIN - 2 * MIN),
                home_score: null,
                away_score: null,
                ht_score_home: null,
                ht_score_away: null,
              })
              .eq("id", id),
          ),
        );
      }

      // ── Fetch match bands in parallel ─────────────────────────
      const [
        { data: liveMatches },
        { data: upcomingMatches },
        { data: recentMatches },
      ] = await Promise.all([
        // Currently live
        supabase
          .from("matches")
          .select(
            `id, stage, match_number, match_date, prediction_lock,
             home_score, away_score, ht_score_home, ht_score_away, status,
             home_team:teams!matches_home_team_id_fkey(id, name, short_name, flag_url, country_code),
             away_team:teams!matches_away_team_id_fkey(id, name, short_name, flag_url, country_code),
             venue:venues(name, city)`,
          )
          .eq("competition_id", competition.id as string)
          .eq("status", "live")
          .order("match_date", { ascending: true }),

        // Next 20 scheduled
        supabase
          .from("matches")
          .select(
            `id, stage, match_number, match_date, prediction_lock,
             home_score, away_score, ht_score_home, ht_score_away, status,
             home_team:teams!matches_home_team_id_fkey(id, name, short_name, flag_url, country_code),
             away_team:teams!matches_away_team_id_fkey(id, name, short_name, flag_url, country_code),
             venue:venues(name, city)`,
          )
          .eq("competition_id", competition.id as string)
          .eq("status", "scheduled")
          .order("match_date", { ascending: true })
          .limit(20),

        // Last 20 completed (most recent first)
        supabase
          .from("matches")
          .select(
            `id, stage, match_number, match_date, prediction_lock,
             home_score, away_score, ht_score_home, ht_score_away, status,
             home_team:teams!matches_home_team_id_fkey(id, name, short_name, flag_url, country_code),
             away_team:teams!matches_away_team_id_fkey(id, name, short_name, flag_url, country_code),
             venue:venues(name, city)`,
          )
          .eq("competition_id", competition.id as string)
          .eq("status", "completed")
          .order("match_date", { ascending: false })
          .limit(20),
      ]);

      const allMatches = [
        ...(liveMatches ?? []),
        ...(upcomingMatches ?? []),
        ...(recentMatches ?? []),
      ];

      // ── Enrich with user predictions ───────────────────────────
      let predictionsMap: Record<string, Record<string, unknown>> = {};
      let myActiveGroups: {
        id: string;
        name: string;
        competition_id: string;
      }[] = [];

      if (userId && allMatches.length > 0) {
        // User's active groups for this competition (include bonus_criteria)
        const { data: memberships } = await supabase
          .from("group_members")
          .select(
            "groups(id, name, competition_id, status, mode, bonus_criteria)",
          )
          .eq("user_id", userId);

        const activeGroupsFull = (memberships ?? [])
          .map((m: any) => m.groups)
          .filter(
            (g: any) =>
              g &&
              g.competition_id === competition!.id &&
              g.status === "active",
          );

        myActiveGroups = activeGroupsFull.map((g: any) => ({
          id: g.id,
          name: g.name,
          competition_id: g.competition_id,
          mode: g.mode,
          bonus_criteria: g.bonus_criteria ?? {
            enabled: [],
            btts_pts: 2,
            total_goals_over_pts: 2,
            total_goals_threshold: 2.5,
            ft_winner_pts: 2,
            ht_winner_pts: 2,
            clean_sheet_pts: 1,
          },
        }));

        if (myActiveGroups.length > 0) {
          const groupIds = myActiveGroups.map((g) => g.id);
          const matchIds = allMatches.map((m: any) => m.id);

          const { data: predictions } = await supabase
            .from("predictions")
            .select(
              "match_id, group_id, predicted_home, predicted_away, result, points_earned, bonus_pts, details",
            )
            .eq("user_id", userId)
            .in("group_id", groupIds)
            .in("match_id", matchIds);

          for (const pred of predictions ?? []) {
            const group = myActiveGroups.find((g) => g.id === pred.group_id);
            if (!predictionsMap[pred.match_id]) {
              predictionsMap[pred.match_id] = {};
            }
            predictionsMap[pred.match_id][pred.group_id] = {
              group_id: pred.group_id,
              group_name: group?.name ?? "",
              predicted_home: pred.predicted_home,
              predicted_away: pred.predicted_away,
              result: pred.result,
              points_earned: pred.points_earned,
              bonus_pts: pred.bonus_pts ?? 0,
              details: pred.details ?? {},
              group_bonus_criteria: (group as any)?.bonus_criteria ?? {
                enabled: [],
              },
            };
          }

          // Enrich each group with the user's owned team IDs from the draft
          const { data: ownerships } = await supabase
            .from("team_ownership")
            .select("group_id, team_id")
            .eq("user_id", userId as string)
            .in("group_id", groupIds);

          const ownersByGroup: Record<string, string[]> = {};
          for (const o of ownerships ?? []) {
            if (!ownersByGroup[o.group_id]) ownersByGroup[o.group_id] = [];
            ownersByGroup[o.group_id].push(o.team_id);
          }
          myActiveGroups = myActiveGroups.map((g) => ({
            ...g,
            owned_team_ids: ownersByGroup[g.id] ?? [],
          }));
        }
      }

      const enrich = (matches: any[]) =>
        matches.map((m) => ({
          ...m,
          ...(userId !== null && {
            my_predictions: predictionsMap[m.id] ?? {},
          }),
        }));

      res.json({
        success: true,
        data: {
          live: enrich(liveMatches ?? []),
          upcoming: enrich(upcomingMatches ?? []),
          recent: enrich(recentMatches ?? []),
          my_active_groups: myActiveGroups,
          last_synced_at: (competition.last_synced_at as string) ?? null,
          competition,
        },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch live data.",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // ──────────────────────────────────────────────────────────────
  // POST /api/sync-matches  (auth required)
  // Pulls latest match data from football-data.org and:
  //   1. Updates match status + scores in our DB
  //   2. Scores all pending predictions for newly-completed matches
  //   3. Updates group_members prediction points
  //   4. Upserts team_match_events + updates team ownership points
  //
  // Rate-limited to one sync per 5 minutes per competition.
  // Requires FOOTBALL_DATA_API_KEY env var.
  // ──────────────────────────────────────────────────────────────
  app.post(
    "/api/sync-matches",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const apiKey = process.env.FOOTBALL_DATA_API_KEY;
        if (!apiKey) {
          res.status(503).json({
            success: false,
            message:
              "FOOTBALL_DATA_API_KEY is not configured. Set it in your environment variables.",
          });
          return;
        }

        const supabase = getSupabaseAdmin();

        // ── Resolve competition ──────────────────────────────────
        const competitionIdParam = req.query.competition_id as
          | string
          | undefined;
        let competitionRow: any = null;

        const compQuery = supabase
          .from("competitions")
          .select("id, external_id, last_synced_at")
          .eq("is_active", true);

        if (competitionIdParam) {
          const { data } = await compQuery
            .eq("id", competitionIdParam)
            .single();
          competitionRow = data;
        } else {
          const { data } = await compQuery
            .order("starts_at", { ascending: true })
            .limit(1)
            .single();
          competitionRow = data;
        }

        if (!competitionRow) {
          res
            .status(404)
            .json({ success: false, message: "No active competition found." });
          return;
        }

        // ── Rate limit: max one sync per 5 minutes ───────────────
        const RATE_LIMIT_MS = 5 * 60 * 1000;
        if (competitionRow.last_synced_at) {
          const msSinceLast =
            Date.now() - new Date(competitionRow.last_synced_at).getTime();
          if (msSinceLast < RATE_LIMIT_MS) {
            const waitSecs = Math.ceil((RATE_LIMIT_MS - msSinceLast) / 1000);
            res.status(429).json({
              success: false,
              message: `Sync rate limit reached. Try again in ${waitSecs} seconds.`,
              data: {
                matches_checked: 0,
                matches_updated: 0,
                predictions_scored: 0,
                ownership_points_awarded: 0,
              },
            });
            return;
          }
        }

        // ── Call football-data.org ───────────────────────────────
        // Use competition external_id if set; fall back to "WC" (World Cup)
        const competitionCode = competitionRow.external_id
          ? competitionRow.external_id.toString()
          : "WC";

        const fdResponse = await fetch(
          `https://api.football-data.org/v4/competitions/${competitionCode}/matches`,
          { headers: { "X-Auth-Token": apiKey } },
        );

        if (!fdResponse.ok) {
          res.status(502).json({
            success: false,
            message: `football-data.org API error: ${fdResponse.status} ${fdResponse.statusText}`,
          });
          return;
        }

        const fdData = (await fdResponse.json()) as { matches?: any[] };
        const fdMatches = fdData.matches ?? [];

        // ── Load our data for mapping ────────────────────────────
        const [{ data: dbTeams }, { data: dbMatches }] = await Promise.all([
          supabase
            .from("teams")
            .select("id, name, short_name, country_code, external_id")
            .eq("competition_id", competitionRow.id),
          supabase
            .from("matches")
            .select(
              "id, external_id, home_team_id, away_team_id, status, home_score, away_score",
            )
            .eq("competition_id", competitionRow.id),
        ]);

        // Build lookup maps
        const teamByExtId = new Map<number, any>(
          (dbTeams ?? [])
            .filter((t) => t.external_id)
            .map((t) => [t.external_id, t]),
        );
        const teamByName = new Map<string, any>(
          (dbTeams ?? []).map((t) => [t.name.toLowerCase(), t]),
        );
        const teamByShortName = new Map<string, any>(
          (dbTeams ?? [])
            .filter((t) => t.short_name)
            .map((t) => [t.short_name!.toLowerCase(), t]),
        );
        const teamByCode = new Map<string, any>(
          (dbTeams ?? [])
            .filter((t) => t.country_code)
            .map((t) => [t.country_code!.toUpperCase(), t]),
        );
        const matchByExtId = new Map<number, any>(
          (dbMatches ?? [])
            .filter((m) => m.external_id)
            .map((m) => [m.external_id, m]),
        );

        // ── Helper: map fd team → our team ──────────────────────
        function resolveTeam(fdTeam: any): any | null {
          if (!fdTeam) return null;
          // 1. By external_id
          const byId = teamByExtId.get(fdTeam.id);
          if (byId) return byId;
          // 2. By country code (tla in fd = 3-letter; our country_code = 2-letter ISO)
          if (fdTeam.tla && fdTeam.tla.length === 2) {
            const byCode = teamByCode.get(fdTeam.tla.toUpperCase());
            if (byCode) return byCode;
          }
          // 3. By name
          const byName = teamByName.get((fdTeam.name ?? "").toLowerCase());
          if (byName) return byName;
          // 4. By short name
          const byShort = teamByShortName.get(
            (fdTeam.shortName ?? "").toLowerCase(),
          );
          return byShort ?? null;
        }

        // ── Helper: map fd status → our status ──────────────────
        function mapStatus(fdStatus: string): string {
          switch (fdStatus) {
            case "IN_PLAY":
            case "HALFTIME":
            case "PAUSED":
              return "live";
            case "FINISHED":
            case "AWARDED":
              return "completed";
            case "POSTPONED":
            case "CANCELLED":
            case "SUSPENDED":
              return "cancelled";
            default:
              return "scheduled";
          }
        }

        // ── Process each fd match ────────────────────────────────
        let matchesChecked = 0;
        let matchesUpdated = 0;
        let predictionsScored = 0;
        let ownershipPointsAwarded = 0;
        let streakBonusesAwarded = 0;
        let upsetBonusesAwarded = 0;
        let eloUpdatesApplied = 0;

        for (const fdMatch of fdMatches) {
          matchesChecked++;
          const newStatus = mapStatus(fdMatch.status ?? "");
          const homeScore: number | null =
            fdMatch.score?.fullTime?.home ?? null;
          const awayScore: number | null =
            fdMatch.score?.fullTime?.away ?? null;

          // Find our DB match
          let dbMatch = matchByExtId.get(fdMatch.id);

          if (!dbMatch) {
            // Fallback: find by home+away team IDs
            const fdHome = resolveTeam(fdMatch.homeTeam);
            const fdAway = resolveTeam(fdMatch.awayTeam);
            if (fdHome && fdAway) {
              dbMatch = (dbMatches ?? []).find(
                (m) =>
                  m.home_team_id === fdHome.id && m.away_team_id === fdAway.id,
              );
            }
          }

          if (!dbMatch) continue;

          // Save external_id mapping if missing
          if (!dbMatch.external_id) {
            await supabase
              .from("matches")
              .update({ external_id: fdMatch.id })
              .eq("id", dbMatch.id);
          }

          // Skip if nothing changed
          if (
            dbMatch.status === newStatus &&
            dbMatch.home_score === homeScore &&
            dbMatch.away_score === awayScore
          ) {
            continue;
          }

          // Update match record (including half-time scores from football-data.org)
          const htHome: number | null = fdMatch.score?.halfTime?.home ?? null;
          const htAway: number | null = fdMatch.score?.halfTime?.away ?? null;
          await supabase
            .from("matches")
            .update({
              status: newStatus,
              home_score: homeScore,
              away_score: awayScore,
              ht_score_home: htHome,
              ht_score_away: htAway,
              external_id: fdMatch.id,
              last_synced_at: new Date().toISOString(),
            })
            .eq("id", dbMatch.id);

          matchesUpdated++;

          // ── Score predictions for newly completed matches ──────
          const wasCompleted = dbMatch.status === "completed";
          const isNowCompleted = newStatus === "completed";
          if (
            isNowCompleted &&
            !wasCompleted &&
            homeScore !== null &&
            awayScore !== null
          ) {
            // Fetch all pending predictions for this match (including bonus details)
            const { data: pendingPreds } = await supabase
              .from("predictions")
              .select(
                "id, group_id, user_id, predicted_home, predicted_away, details",
              )
              .eq("match_id", dbMatch.id)
              .eq("result", "pending");

            if (pendingPreds && pendingPreds.length > 0) {
              // Load scoring configs + bonus criteria for involved groups
              const groupIds = [
                ...new Set(pendingPreds.map((p) => p.group_id)),
              ];
              const { data: groups } = await supabase
                .from("groups")
                .select("id, scoring_config, bonus_criteria")
                .in("id", groupIds);

              const configByGroup = new Map<string, any>(
                (groups ?? []).map((g) => [g.id, g.scoring_config ?? {}]),
              );
              const bonusByGroup = new Map<string, any>(
                (groups ?? []).map((g) => [
                  g.id,
                  g.bonus_criteria ?? { enabled: [] },
                ]),
              );

              // ── Pre-scoring: compute pick percentages for upset bonus ────
              const totalPicksForMatch = pendingPreds.length;
              let homeWinCount = 0;
              let awayWinCount = 0;
              let drawCountPicks = 0;
              for (const p of pendingPreds) {
                if (p.predicted_home > p.predicted_away) homeWinCount++;
                else if (p.predicted_away > p.predicted_home) awayWinCount++;
                else drawCountPicks++;
              }
              const actOutcome =
                homeScore > awayScore
                  ? "home"
                  : awayScore > homeScore
                    ? "away"
                    : "draw";
              const actOutcomeCount =
                actOutcome === "home"
                  ? homeWinCount
                  : actOutcome === "away"
                    ? awayWinCount
                    : drawCountPicks;
              const actPickPct =
                totalPicksForMatch > 0
                  ? actOutcomeCount / totalPicksForMatch
                  : 0.5;
              // Upset: actual outcome was the minority pick (< 50%)
              const isUpsetResult = totalPicksForMatch >= 5 && actPickPct < 0.5;
              const upsetMult = isUpsetResult
                ? Math.min(
                    parseFloat((1 / actPickPct).toFixed(2)),
                    10, // cap multiplier at 10×
                  )
                : 1.0;

              // Persist pick stats + upset_multiplier on the match
              await supabase
                .from("matches")
                .update({
                  home_win_pick_pct:
                    totalPicksForMatch > 0
                      ? homeWinCount / totalPicksForMatch
                      : null,
                  away_win_pick_pct:
                    totalPicksForMatch > 0
                      ? awayWinCount / totalPicksForMatch
                      : null,
                  draw_pick_pct:
                    totalPicksForMatch > 0
                      ? drawCountPicks / totalPicksForMatch
                      : null,
                  total_picks: totalPicksForMatch,
                  upset_multiplier: upsetMult,
                })
                .eq("id", dbMatch.id);

              // Accumulate per-user-group point deltas + track correctness
              const ptsDelta = new Map<string, number>(); // `${groupId}:${userId}` → total pts
              const correctKeys = new Set<string>(); // correctly predicted
              const incorrectKeys = new Set<string>(); // incorrectly predicted

              for (const pred of pendingPreds) {
                const cfg = configByGroup.get(pred.group_id) ?? {};
                const bonus = bonusByGroup.get(pred.group_id) ?? {
                  enabled: [],
                };
                const exactPts: number = cfg.exact_score_pts ?? 5;
                const winnerPts: number = cfg.correct_winner_pts ?? 3;
                const diffPts: number = cfg.goal_difference_pts ?? 2;
                const upsetBasePts: number = cfg.upset_base_pts ?? 5;

                let result: string;
                let pts = 0;
                let upsetPts = 0;

                if (
                  pred.predicted_home === homeScore &&
                  pred.predicted_away === awayScore
                ) {
                  result = "exact_score";
                  pts = exactPts;
                } else {
                  const predWinner =
                    pred.predicted_home > pred.predicted_away
                      ? "home"
                      : pred.predicted_away > pred.predicted_home
                        ? "away"
                        : "draw";
                  const actWinner =
                    homeScore > awayScore
                      ? "home"
                      : awayScore > homeScore
                        ? "away"
                        : "draw";
                  const predDiff = pred.predicted_home - pred.predicted_away;
                  const actDiff = homeScore - awayScore;

                  if (predDiff === actDiff && predWinner === actWinner) {
                    result = "goal_difference";
                    pts = diffPts;
                  } else if (predWinner === actWinner) {
                    result = "correct_winner";
                    pts = winnerPts;
                  } else {
                    result = "incorrect";
                    pts = 0;
                  }
                }

                // Upset bonus: correct pick of minority-outcome
                if (pts > 0 && isUpsetResult) {
                  upsetPts = Math.round(upsetBasePts * upsetMult);
                  upsetBonusesAwarded++;
                }

                // ── Bonus criteria scoring ───────────────────────────────
                const details: Record<string, any> = pred.details ?? {};
                const enabledCriteria: string[] = bonus.enabled ?? [];
                let bonusPts = 0;

                if (
                  enabledCriteria.includes("btts") &&
                  details.btts !== undefined
                ) {
                  const actualBtts = homeScore > 0 && awayScore > 0;
                  if (details.btts === actualBtts) {
                    bonusPts += bonus.btts_pts ?? 2;
                  }
                }

                if (
                  enabledCriteria.includes("total_goals_over") &&
                  details.total_goals_over !== undefined
                ) {
                  const threshold: number = bonus.total_goals_threshold ?? 2.5;
                  const actualOver = homeScore + awayScore > threshold;
                  if (details.total_goals_over === actualOver) {
                    bonusPts += bonus.total_goals_over_pts ?? 2;
                  }
                }

                if (
                  enabledCriteria.includes("ft_winner") &&
                  details.ft_winner !== undefined
                ) {
                  const actualFtWinner =
                    homeScore > awayScore
                      ? "home"
                      : awayScore > homeScore
                        ? "away"
                        : "draw";
                  if (details.ft_winner === actualFtWinner) {
                    bonusPts += bonus.ft_winner_pts ?? 2;
                  }
                }

                if (
                  enabledCriteria.includes("ht_winner") &&
                  details.ht_winner !== undefined
                ) {
                  // Use half-time scores extracted from fdMatch
                  const htH: number | null =
                    fdMatch.score?.halfTime?.home ?? null;
                  const htA: number | null =
                    fdMatch.score?.halfTime?.away ?? null;
                  if (htH !== null && htA !== null) {
                    const actualHtWinner =
                      htH > htA ? "home" : htA > htH ? "away" : "draw";
                    if (details.ht_winner === actualHtWinner) {
                      bonusPts += bonus.ht_winner_pts ?? 2;
                    }
                  }
                }

                if (
                  enabledCriteria.includes("clean_sheet") &&
                  details.clean_sheet !== undefined
                ) {
                  const actualCleanSheet =
                    awayScore === 0 && homeScore > 0
                      ? "home"
                      : homeScore === 0 && awayScore > 0
                        ? "away"
                        : "none";
                  if (details.clean_sheet === actualCleanSheet) {
                    bonusPts += bonus.clean_sheet_pts ?? 1;
                  }
                }
                // ── End bonus scoring ────────────────────────────────────

                const totalPredPts = pts + upsetPts + bonusPts;

                await supabase
                  .from("predictions")
                  .update({
                    result,
                    points_earned: totalPredPts,
                    upset_pts: upsetPts,
                    bonus_pts: bonusPts,
                  })
                  .eq("id", pred.id);

                predictionsScored++;

                const predKey = `${pred.group_id}:${pred.user_id}`;
                if (pts > 0 || bonusPts > 0) {
                  correctKeys.add(predKey);
                  ptsDelta.set(
                    predKey,
                    (ptsDelta.get(predKey) ?? 0) + totalPredPts,
                  );
                } else {
                  incorrectKeys.add(predKey);
                }
              }

              // ── Batch-fetch all affected group_members ───────────────────
              const allPredKeys = [
                ...new Set([...correctKeys, ...incorrectKeys]),
              ];
              const memberRows = await Promise.all(
                allPredKeys.map(async (key) => {
                  const [gid, uid] = key.split(":");
                  const { data } = await supabase
                    .from("group_members")
                    .select(
                      "prediction_pts, total_points, current_streak, best_streak, weekly_pts, elo_rating",
                    )
                    .eq("group_id", gid)
                    .eq("user_id", uid)
                    .single();
                  return { key, groupId: gid, uid, member: data };
                }),
              );

              // ── Load group modes + configs ───────────────────────────────
              const affectedGroupIds = [
                ...new Set(allPredKeys.map((k) => k.split(":")[0])),
              ];
              const { data: affectedGroupsData } = await supabase
                .from("groups")
                .select("id, mode, scoring_config, bonus_criteria")
                .in("id", affectedGroupIds);

              const groupModeMap = new Map<string, string>(
                (affectedGroupsData ?? []).map((g) => [g.id, g.mode]),
              );
              const groupCfgMap = new Map<string, any>(
                (affectedGroupsData ?? []).map((g) => [
                  g.id,
                  g.scoring_config ?? {},
                ]),
              );

              // ── Pre-load all member ELOs for avg computation ─────────────
              const eloGroupIds = affectedGroupIds.filter((gid) => {
                const m = groupModeMap.get(gid);
                return m === "league" || m === "competitive";
              });
              const groupEloMap = new Map<string, Map<string, number>>();
              if (eloGroupIds.length > 0) {
                const { data: allEloMembers } = await supabase
                  .from("group_members")
                  .select("group_id, user_id, elo_rating")
                  .in("group_id", eloGroupIds);
                for (const em of allEloMembers ?? []) {
                  if (!groupEloMap.has(em.group_id))
                    groupEloMap.set(em.group_id, new Map());
                  groupEloMap.get(em.group_id)!.set(em.user_id, em.elo_rating);
                }
              }

              // ── Apply updates: pts + weekly_pts + streaks + ELO ─────────
              const eloHistoryRows: any[] = [];

              for (const { key, groupId, uid, member } of memberRows) {
                if (!member) continue;

                const predPts = ptsDelta.get(key) ?? 0;
                const isCorrect = correctKeys.has(key);
                const isIncorrect = incorrectKeys.has(key);
                const cfg = groupCfgMap.get(groupId) ?? {};
                const streakThreshold: number = cfg.streak_bonus_threshold ?? 3;
                const streakBonusPts: number = cfg.streak_bonus_pts ?? 2;

                // ── Streak ───────────────────────────────────────────────
                let newStreak = member.current_streak;
                let streakBonus = 0;
                let streakBroken = false;

                if (isCorrect) {
                  newStreak = member.current_streak + 1;
                  if (newStreak >= streakThreshold) {
                    streakBonus = streakBonusPts;
                    streakBonusesAwarded++;
                  }
                } else if (isIncorrect) {
                  streakBroken = member.current_streak >= streakThreshold;
                  newStreak = 0;
                }

                const newBestStreak = Math.max(member.best_streak, newStreak);

                // ── ELO (league / competitive only) ──────────────────────
                let eloAfter = member.elo_rating;
                const mode = groupModeMap.get(groupId);
                if (
                  (mode === "league" || mode === "competitive") &&
                  (isCorrect || isIncorrect)
                ) {
                  const K: number = cfg.elo_k_factor ?? 32;
                  const groupElos = groupEloMap.get(groupId) ?? new Map();
                  const eloValues = [...groupElos.values()];
                  const avgElo =
                    eloValues.length > 0
                      ? eloValues.reduce((s, e) => s + e, 0) / eloValues.length
                      : 1000;
                  // Expected score vs field average
                  const expected =
                    1 / (1 + Math.pow(10, (avgElo - member.elo_rating) / 400));
                  const actual = isCorrect ? 1 : 0;
                  const eloDelta = Math.round(K * (actual - expected));
                  eloAfter = Math.max(100, member.elo_rating + eloDelta);
                  eloHistoryRows.push({
                    group_id: groupId,
                    user_id: uid,
                    match_id: dbMatch.id,
                    elo_before: member.elo_rating,
                    elo_after: eloAfter,
                  });
                  eloUpdatesApplied++;
                }

                const totalDelta = predPts + streakBonus;

                await supabase
                  .from("group_members")
                  .update({
                    prediction_pts: member.prediction_pts + predPts,
                    total_points: member.total_points + totalDelta,
                    weekly_pts: member.weekly_pts + totalDelta,
                    current_streak: newStreak,
                    best_streak: newBestStreak,
                    elo_rating: eloAfter,
                  })
                  .eq("group_id", groupId)
                  .eq("user_id", uid);

                // Log streak events
                if (isIncorrect && streakBroken) {
                  await supabase.from("streak_events").insert({
                    group_id: groupId,
                    user_id: uid,
                    streak_length: member.current_streak,
                    broken: true,
                  });
                } else if (isCorrect && newStreak >= streakThreshold) {
                  await supabase.from("streak_events").insert({
                    group_id: groupId,
                    user_id: uid,
                    streak_length: newStreak,
                    broken: false,
                  });
                }
              }

              // Bulk-insert ELO history
              if (eloHistoryRows.length > 0) {
                await supabase.from("elo_history").insert(eloHistoryRows);
              }
            }

            // ── Update team ownership points ─────────────────────
            if (dbMatch.home_team_id && dbMatch.away_team_id) {
              // Upsert team_match_events
              await supabase.from("team_match_events").upsert(
                [
                  {
                    match_id: dbMatch.id,
                    team_id: dbMatch.home_team_id,
                    goals_scored: homeScore,
                    clean_sheet: awayScore === 0,
                    won: homeScore > awayScore,
                  },
                  {
                    match_id: dbMatch.id,
                    team_id: dbMatch.away_team_id,
                    goals_scored: awayScore,
                    clean_sheet: homeScore === 0,
                    won: awayScore > homeScore,
                  },
                ],
                { onConflict: "match_id,team_id" },
              );

              // Load ownership rows for both teams
              const { data: ownerships } = await supabase
                .from("team_ownership")
                .select(
                  "id, group_id, user_id, team_id, wins_pts, goals_pts, clean_sheet_pts, total_pts",
                )
                .in("team_id", [dbMatch.home_team_id, dbMatch.away_team_id]);

              if (ownerships && ownerships.length > 0) {
                // Load scoring configs for involved groups
                const ownerGroupIds = [
                  ...new Set(ownerships.map((o: any) => o.group_id)),
                ];
                const { data: ownerGroups } = await supabase
                  .from("groups")
                  .select("id, scoring_config")
                  .in("id", ownerGroupIds);

                const ownerConfigByGroup = new Map<string, any>(
                  (ownerGroups ?? []).map((g) => [
                    g.id,
                    g.scoring_config ?? {},
                  ]),
                );

                for (const owner of ownerships) {
                  const cfg = ownerConfigByGroup.get(owner.group_id) ?? {};
                  const winPts: number = cfg.team_win_pts ?? 4;
                  const goalPts: number = cfg.team_goal_pts ?? 1;
                  const cleanSheetPts: number = cfg.team_clean_sheet_pts ?? 3;

                  const isHome = owner.team_id === dbMatch.home_team_id;
                  const teamScore = isHome ? homeScore : awayScore;
                  const isWinner = isHome
                    ? homeScore > awayScore
                    : awayScore > homeScore;
                  const isCleanSheet = isHome
                    ? awayScore === 0
                    : homeScore === 0;

                  const deltaWins = isWinner ? winPts : 0;
                  const deltaGoals = (teamScore ?? 0) * goalPts;
                  const deltaClean = isCleanSheet ? cleanSheetPts : 0;
                  const deltaTotal = deltaWins + deltaGoals + deltaClean;

                  if (deltaTotal > 0) {
                    await supabase
                      .from("team_ownership")
                      .update({
                        wins_pts: owner.wins_pts + deltaWins,
                        goals_pts: owner.goals_pts + deltaGoals,
                        clean_sheet_pts: owner.clean_sheet_pts + deltaClean,
                        total_pts: owner.total_pts + deltaTotal,
                      })
                      .eq("id", owner.id);

                    // Update group_member ownership_pts + total_points
                    const { data: omember } = await supabase
                      .from("group_members")
                      .select("ownership_pts, total_points")
                      .eq("group_id", owner.group_id)
                      .eq("user_id", owner.user_id)
                      .single();

                    if (omember) {
                      await supabase
                        .from("group_members")
                        .update({
                          ownership_pts: omember.ownership_pts + deltaTotal,
                          total_points: omember.total_points + deltaTotal,
                        })
                        .eq("group_id", owner.group_id)
                        .eq("user_id", owner.user_id);
                    }

                    ownershipPointsAwarded += deltaTotal;
                  }
                }
              }
            }
          }
        }

        // ── Update competition last_synced_at ────────────────────
        await supabase
          .from("competitions")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", competitionRow.id);

        res.json({
          success: true,
          data: {
            matches_checked: matchesChecked,
            matches_updated: matchesUpdated,
            predictions_scored: predictionsScored,
            ownership_points_awarded: ownershipPointsAwarded,
            streak_bonuses_awarded: streakBonusesAwarded,
            upset_bonuses_awarded: upsetBonusesAwarded,
            elo_updates_applied: eloUpdatesApplied,
          },
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Sync failed.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────
  // POST /api/admin/test-league/reset
  // Resets test match states.
  //
  // ?mode=mixed         (default) All 5 states covered: completed/live/open/locked/final
  // ?mode=all_scheduled All 5 matches scheduled, 5-min apart from now — ideal for
  //                     end-to-end prediction testing. Always clears predictions.
  //
  // ?clear_data=true    (mixed mode only) Also clears predictions + member points.
  // Requires X-Admin-Secret header matching ADMIN_SECRET env var.
  // ──────────────────────────────────────────────────────────────
  app.post("/api/admin/test-league/reset", async (req, res) => {
    try {
      const adminSecret = process.env.ADMIN_SECRET;
      if (!adminSecret) {
        res
          .status(503)
          .json({ success: false, message: "ADMIN_SECRET is not configured." });
        return;
      }
      const provided = req.headers["x-admin-secret"];
      if (!provided || provided !== adminSecret) {
        res.status(401).json({ success: false, message: "Unauthorized." });
        return;
      }

      const supabase = getSupabaseAdmin();
      const now = new Date();
      const mode = (req.query.mode as string) ?? "mixed";
      const clearData =
        req.query.clear_data === "true" || mode === "all_scheduled";

      const testCompId = "ffffffff-0000-0000-0000-000000000001";
      const matchIds = {
        m1: "ffffffff-3333-0000-0000-000000000001",
        m2: "ffffffff-3333-0000-0000-000000000002",
        m3: "ffffffff-3333-0000-0000-000000000003",
        m4: "ffffffff-3333-0000-0000-000000000004",
        m5: "ffffffff-3333-0000-0000-000000000005",
      };

      const ts = (offsetMs: number) =>
        new Date(now.getTime() + offsetMs).toISOString();
      const MIN = 60_000;
      const HR = 3_600_000;
      const DAY = 86_400_000;

      if (mode === "all_scheduled") {
        // All 5 matches scheduled, 5-min apart, predictions window open
        // m1: now+5min, m2: now+10min, m3: now+15min, m4: now+20min, m5: now+25min
        // lock = match_date - 2min (window open)
        const schedules = [
          {
            id: matchIds.m1,
            offset: 5 * MIN,
            stage: "Group Stage - A",
            number: 1,
          },
          {
            id: matchIds.m2,
            offset: 10 * MIN,
            stage: "Group Stage - A",
            number: 2,
          },
          {
            id: matchIds.m3,
            offset: 15 * MIN,
            stage: "Group Stage - B",
            number: 3,
          },
          {
            id: matchIds.m4,
            offset: 20 * MIN,
            stage: "Group Stage - B",
            number: 4,
          },
          { id: matchIds.m5, offset: 25 * MIN, stage: "Final", number: 5 },
        ];

        for (const s of schedules) {
          await supabase
            .from("matches")
            .update({
              status: "scheduled",
              match_date: ts(s.offset),
              prediction_lock: ts(s.offset - 2 * MIN),
              home_score: null,
              away_score: null,
              ht_score_home: null,
              ht_score_away: null,
            })
            .eq("id", s.id);
        }
      } else {
        // mixed mode — original 5 distinct states
        const completed = "ffffffff-3333-0000-0000-000000000001";
        const live = "ffffffff-3333-0000-0000-000000000002";
        const open = "ffffffff-3333-0000-0000-000000000003";
        const locked = "ffffffff-3333-0000-0000-000000000004";
        const final_ = "ffffffff-3333-0000-0000-000000000005";

        await supabase
          .from("matches")
          .update({
            status: "completed",
            match_date: ts(-2 * DAY),
            prediction_lock: ts(-2 * DAY - HR),
            home_score: 2,
            away_score: 1,
          })
          .eq("id", completed);

        await supabase
          .from("matches")
          .update({
            status: "live",
            match_date: ts(-30 * MIN),
            prediction_lock: ts(-90 * MIN),
            home_score: null,
            away_score: null,
          })
          .eq("id", live);

        await supabase
          .from("matches")
          .update({
            status: "scheduled",
            match_date: ts(2 * DAY),
            prediction_lock: ts(2 * DAY - HR),
            home_score: null,
            away_score: null,
          })
          .eq("id", open);

        await supabase
          .from("matches")
          .update({
            status: "scheduled",
            match_date: ts(2 * HR),
            prediction_lock: ts(-HR),
            home_score: null,
            away_score: null,
          })
          .eq("id", locked);

        await supabase
          .from("matches")
          .update({
            status: "scheduled",
            match_date: ts(7 * DAY),
            prediction_lock: ts(7 * DAY - HR),
            home_score: null,
            away_score: null,
          })
          .eq("id", final_);
      }

      if (clearData) {
        // Clear predictions on test matches
        await supabase
          .from("predictions")
          .delete()
          .in("match_id", Object.values(matchIds));

        // Reset group_members points for test groups
        await supabase
          .from("group_members")
          .update({
            total_points: 0,
            prediction_pts: 0,
            ownership_pts: 0,
            current_streak: 0,
            best_streak: 0,
            weekly_pts: 0,
            elo_rating: 1000,
            rank: null,
          })
          .in("group_id", [
            "ffffffff-4444-0000-0000-000000000001",
            "ffffffff-4444-0000-0000-000000000002",
            "ffffffff-4444-0000-0000-000000000003",
            "ffffffff-4444-0000-0000-000000000004",
            "ffffffff-4444-0000-0000-000000000005",
          ]);

        // Reset test groups to 'active' so they show in GET /api/live
        await supabase
          .from("groups")
          .update({
            status: "active",
            draft_started_at: null,
            started_at: null,
          })
          .eq("competition_id", testCompId)
          .eq("is_test", true);
      }

      res.json({
        success: true,
        data: {
          message: `Test league reset (${mode}) successfully.`,
          matches_reset: 5,
          mode,
          data_cleared: clearData,
        },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Test league reset failed.",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // ──────────────────────────────────────────────────────────────
  // REGISTER ROUTES
  // ──────────────────────────────────────────────────────────────
  // POST /api/admin/weekly-reset  (admin secret required)
  // 1. Snapshots the current leaderboard to leaderboard_snapshots
  // 2. Runs survivor check for competitive/global groups:
  //    - If a member earned 0 weekly_pts this week → lose a life
  //    - If lives reach 0 → is_eliminated = true
  // 3. Resets weekly_pts = 0 for groups with weekly_reset_enabled
  // ──────────────────────────────────────────────────────────────
  app.post("/api/admin/weekly-reset", async (req, res) => {
    try {
      const adminSecret = process.env.ADMIN_SECRET;
      if (!adminSecret) {
        res
          .status(503)
          .json({ success: false, message: "ADMIN_SECRET is not configured." });
        return;
      }
      const provided = req.headers["x-admin-secret"];
      if (!provided || provided !== adminSecret) {
        res.status(401).json({ success: false, message: "Unauthorized." });
        return;
      }

      const supabase = getSupabaseAdmin();
      const competitionId = req.query.competition_id as string | undefined;
      const weekNumber = getISOWeek(new Date());

      // Load all active groups
      let groupQuery = supabase
        .from("groups")
        .select("id, mode, scoring_config")
        .eq("status", "active")
        .eq("is_active", true);

      if (competitionId) {
        groupQuery = groupQuery.eq("competition_id", competitionId);
      }

      const { data: activeGroups } = await groupQuery;

      if (!activeGroups || activeGroups.length === 0) {
        res.json({
          success: true,
          data: { message: "No active groups.", groups_processed: 0 },
        });
        return;
      }

      let groupsProcessed = 0;
      let snapshotsTaken = 0;
      let survivorChecksRun = 0;
      let membersEliminated = 0;

      for (const group of activeGroups) {
        const cfg = group.scoring_config ?? {};
        const weeklyResetEnabled: boolean = cfg.weekly_reset_enabled ?? true;
        const isSurvivorMode =
          group.mode === "competitive" || group.mode === "global";

        // Load all non-eliminated members
        const { data: members } = await supabase
          .from("group_members")
          .select(
            "id, user_id, total_points, prediction_pts, ownership_pts, weekly_pts, survivor_lives, is_eliminated",
          )
          .eq("group_id", group.id)
          .eq("is_eliminated", false);

        if (!members) continue;

        // ── Snapshot leaderboard ─────────────────────────────────
        if (weeklyResetEnabled && members.length > 0) {
          const sorted = [...members].sort(
            (a, b) => b.total_points - a.total_points,
          );
          await supabase.from("leaderboard_snapshots").insert(
            sorted.map((m, i) => ({
              group_id: group.id,
              user_id: m.user_id,
              week_number: weekNumber,
              rank: i + 1,
              total_points: m.total_points,
              prediction_pts: m.prediction_pts,
              ownership_pts: m.ownership_pts,
            })),
          );
          snapshotsTaken += sorted.length;
        }

        // ── Survivor check ───────────────────────────────────────
        if (isSurvivorMode) {
          survivorChecksRun++;

          // Upsert this week's round
          const { data: round } = await supabase
            .from("survivor_rounds")
            .upsert(
              {
                group_id: group.id,
                round_number: weekNumber,
                week_number: weekNumber,
                started_at: new Date(Date.now() - 7 * 86_400_000).toISOString(),
                ended_at: new Date().toISOString(),
              },
              { onConflict: "group_id,round_number" },
            )
            .select()
            .single();

          if (round) {
            const entries: any[] = [];
            for (const member of members) {
              const survived = member.weekly_pts > 0;
              let newLives = member.survivor_lives ?? 1;
              let eliminated = false;

              if (!survived) {
                newLives = Math.max(0, newLives - 1);
                if (newLives <= 0) {
                  eliminated = true;
                  membersEliminated++;
                }
              }

              entries.push({
                group_id: group.id,
                round_id: round.id,
                user_id: member.user_id,
                survived,
                lives_remaining: newLives,
                eliminated_at: eliminated ? new Date().toISOString() : null,
              });

              if (!survived || eliminated) {
                await supabase
                  .from("group_members")
                  .update({
                    survivor_lives: newLives,
                    is_eliminated: eliminated,
                  })
                  .eq("id", member.id);
              }
            }

            await supabase.from("survivor_entries").insert(entries);
          }
        }

        // ── Reset weekly_pts ─────────────────────────────────────
        if (weeklyResetEnabled) {
          await supabase
            .from("group_members")
            .update({ weekly_pts: 0 })
            .eq("group_id", group.id);
        }

        groupsProcessed++;
      }

      res.json({
        success: true,
        data: {
          week_number: weekNumber,
          groups_processed: groupsProcessed,
          snapshots_taken: snapshotsTaken,
          survivor_checks_run: survivorChecksRun,
          members_eliminated: membersEliminated,
        },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Weekly reset failed.",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // ──────────────────────────────────────────────────────────────
  // GET /api/groups/:id/survivor  (auth required)
  // Returns survivor state for the group — lives, eliminations,
  // round history. Only available for competitive/global groups.
  // ──────────────────────────────────────────────────────────────
  app.get(
    "/api/groups/:id/survivor",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const supabase = getSupabaseAdmin();
        const groupId = req.params.id;

        // Verify membership
        const { data: membership } = await supabase
          .from("group_members")
          .select("id")
          .eq("group_id", groupId)
          .eq("user_id", req.userId!)
          .single();

        if (!membership) {
          res
            .status(403)
            .json({ success: false, message: "Not a member of this group." });
          return;
        }

        const { data: group } = await supabase
          .from("groups")
          .select("id, mode, scoring_config")
          .eq("id", groupId)
          .single();

        if (
          !group ||
          (group.mode !== "competitive" && group.mode !== "global")
        ) {
          res.status(400).json({
            success: false,
            message:
              "Survivor mode is only available for competitive/global groups.",
          });
          return;
        }

        const [{ data: members }, { data: rounds }] = await Promise.all([
          supabase
            .from("group_members")
            .select(
              "user_id, survivor_lives, is_eliminated, total_points, prediction_pts, weekly_pts",
            )
            .eq("group_id", groupId)
            .order("is_eliminated", { ascending: true })
            .order("total_points", { ascending: false }),
          supabase
            .from("survivor_rounds")
            .select(
              "id, round_number, week_number, started_at, ended_at, survivor_entries(user_id, survived, lives_remaining, eliminated_at)",
            )
            .eq("group_id", groupId)
            .order("round_number", { ascending: false })
            .limit(10),
        ]);

        const cfg = group.scoring_config ?? {};
        res.json({
          success: true,
          data: {
            survivor_lives_start: cfg.survivor_lives ?? 1,
            members: members ?? [],
            rounds: rounds ?? [],
          },
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to load survivor state.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────
  // GET /api/groups/:id/elo-history  (auth required)
  // Returns per-match ELO history and current standings.
  // Only meaningful for league/competitive groups.
  // ──────────────────────────────────────────────────────────────
  app.get(
    "/api/groups/:id/elo-history",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const supabase = getSupabaseAdmin();
        const groupId = req.params.id;

        // Verify membership
        const { data: membership } = await supabase
          .from("group_members")
          .select("id")
          .eq("group_id", groupId)
          .eq("user_id", req.userId!)
          .single();

        if (!membership) {
          res
            .status(403)
            .json({ success: false, message: "Not a member of this group." });
          return;
        }

        const [{ data: history }, { data: currentElos }] = await Promise.all([
          supabase
            .from("elo_history")
            .select(
              "user_id, match_id, elo_before, elo_after, delta, recorded_at",
            )
            .eq("group_id", groupId)
            .order("recorded_at", { ascending: false })
            .limit(200),
          supabase
            .from("group_members")
            .select("user_id, elo_rating, total_points")
            .eq("group_id", groupId)
            .order("elo_rating", { ascending: false }),
        ]);

        res.json({
          success: true,
          data: {
            current_elos: currentElos ?? [],
            history: history ?? [],
          },
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to load ELO history.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────
  // NOTIFICATIONS
  // ──────────────────────────────────────────────────────────────

  // GET /api/notifications — list user's notifications (paginated)
  app.get(
    "/api/notifications",
    requireAuth,
    async (req: express.Request, res: express.Response) => {
      try {
        const supabase = getSupabaseAdmin();
        const userId = (req as any).userId as string;
        const limit = Math.min(
          parseInt((req.query.limit as string) ?? "50", 10),
          100,
        );
        const offset = parseInt((req.query.offset as string) ?? "0", 10);

        const [{ data: notifications, error }, { count: unreadCount }] =
          await Promise.all([
            supabase
              .from("notifications")
              .select("id, type, title, body, metadata, is_read, created_at")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .range(offset, offset + limit - 1),
            supabase
              .from("notifications")
              .select("id", { count: "exact", head: true })
              .eq("user_id", userId)
              .eq("is_read", false),
          ]);

        if (error) throw error;

        res.json({
          success: true,
          data: {
            notifications: notifications ?? [],
            unread_count: unreadCount ?? 0,
          },
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to load notifications.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // PATCH /api/notifications/read-all — mark all notifications as read
  app.patch(
    "/api/notifications/read-all",
    requireAuth,
    async (req: express.Request, res: express.Response) => {
      try {
        const supabase = getSupabaseAdmin();
        const userId = (req as any).userId as string;

        const { error } = await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("user_id", userId)
          .eq("is_read", false);

        if (error) throw error;

        res.json({ success: true });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to mark all notifications as read.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // PATCH /api/notifications/:id/read — mark one notification as read
  app.patch(
    "/api/notifications/:id/read",
    requireAuth,
    async (req: express.Request, res: express.Response) => {
      try {
        const supabase = getSupabaseAdmin();
        const userId = (req as any).userId as string;
        const { id } = req.params;

        const { error } = await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("id", id)
          .eq("user_id", userId);

        if (error) throw error;

        res.json({ success: true });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to mark notification as read.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────
  // RIVALRIES
  // ──────────────────────────────────────────────────────────────

  // GET /api/groups/:id/rivalries — current week rivalries for group
  app.get(
    "/api/groups/:id/rivalries",
    requireAuth,
    async (req: express.Request, res: express.Response) => {
      try {
        const supabase = getSupabaseAdmin();
        const userId = (req as any).userId as string;
        const { id: groupId } = req.params;
        const weekNumber = req.query.week
          ? parseInt(req.query.week as string, 10)
          : getISOWeek(new Date());

        // Verify membership
        const { data: member } = await supabase
          .from("group_members")
          .select("user_id")
          .eq("group_id", groupId)
          .eq("user_id", userId)
          .single();
        if (!member) {
          return res
            .status(403)
            .json({ success: false, message: "Not a member of this group." });
        }

        const { data: rivalries, error } = await supabase
          .from("rivalries")
          .select(
            `id, week_number, status,
             player_a_pts, player_b_pts, winner_id,
             player_a:profiles!rivalries_player_a_id_fkey(id, display_name, username, avatar_url),
             player_b:profiles!rivalries_player_b_id_fkey(id, display_name, username, avatar_url)`,
          )
          .eq("group_id", groupId)
          .eq("week_number", weekNumber)
          .order("created_at", { ascending: true });

        if (error) throw error;

        res.json({
          success: true,
          data: { week_number: weekNumber, rivalries: rivalries ?? [] },
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to load rivalries.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // POST /api/groups/:id/rivalries/generate — generate this week's 1v1 matchups
  app.post(
    "/api/groups/:id/rivalries/generate",
    requireAuth,
    async (req: express.Request, res: express.Response) => {
      try {
        const supabase = getSupabaseAdmin();
        const userId = (req as any).userId as string;
        const { id: groupId } = req.params;
        const weekNumber = req.body.week_number ?? getISOWeek(new Date());
        const competitionId = req.body.competition_id as string | undefined;

        // Only group owner can generate
        const { data: group } = await supabase
          .from("groups")
          .select("owner_id, mode")
          .eq("id", groupId)
          .single();
        if (!group || group.owner_id !== userId) {
          return res.status(403).json({
            success: false,
            message: "Only the group owner can generate rivalries.",
          });
        }

        // Fetch active members sorted by total_points desc
        const { data: members } = await supabase
          .from("group_members")
          .select("user_id, total_points")
          .eq("group_id", groupId)
          .order("total_points", { ascending: false });

        if (!members || members.length < 2) {
          return res.status(400).json({
            success: false,
            message: "Need at least 2 members to generate rivalries.",
          });
        }

        // Pair members: top vs 2nd, 3rd vs 4th, etc. (Shuffle if odd)
        const shuffled = [...members];
        const pairs: { a: string; b: string }[] = [];
        for (let i = 0; i + 1 < shuffled.length; i += 2) {
          pairs.push({ a: shuffled[i].user_id, b: shuffled[i + 1].user_id });
        }

        // Delete existing matchups for this week (idempotent)
        await supabase
          .from("rivalries")
          .delete()
          .eq("group_id", groupId)
          .eq("week_number", weekNumber);

        const inserts = pairs.map(({ a, b }) => ({
          group_id: groupId,
          player_a_id: a,
          player_b_id: b,
          week_number: weekNumber,
          competition_id: competitionId ?? null,
          status: "active",
        }));

        const { data: created, error } = await supabase
          .from("rivalries")
          .insert(inserts)
          .select();

        if (error) throw error;

        res.json({ success: true, data: { rivalries: created ?? [] } });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to generate rivalries.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // GET /api/groups/:id/rivalries/history — past weeks rivalries
  app.get(
    "/api/groups/:id/rivalries/history",
    requireAuth,
    async (req: express.Request, res: express.Response) => {
      try {
        const supabase = getSupabaseAdmin();
        const userId = (req as any).userId as string;
        const { id: groupId } = req.params;

        const { data: member } = await supabase
          .from("group_members")
          .select("user_id")
          .eq("group_id", groupId)
          .eq("user_id", userId)
          .single();
        if (!member) {
          return res
            .status(403)
            .json({ success: false, message: "Not a member of this group." });
        }

        const { data: history, error } = await supabase
          .from("rivalries")
          .select(
            `id, week_number, status, player_a_pts, player_b_pts, winner_id,
             player_a:profiles!rivalries_player_a_id_fkey(id, display_name, username, avatar_url),
             player_b:profiles!rivalries_player_b_id_fkey(id, display_name, username, avatar_url)`,
          )
          .eq("group_id", groupId)
          .neq("status", "active")
          .order("week_number", { ascending: false })
          .limit(50);

        if (error) throw error;

        res.json({ success: true, data: { history: history ?? [] } });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to load rivalry history.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────
  // BOOSTS
  // ──────────────────────────────────────────────────────────────

  // GET /api/groups/:id/boosts — user's available boosts for this group
  app.get(
    "/api/groups/:id/boosts",
    requireAuth,
    async (req: express.Request, res: express.Response) => {
      try {
        const supabase = getSupabaseAdmin();
        const userId = (req as any).userId as string;
        const { id: groupId } = req.params;

        const { data: member } = await supabase
          .from("group_members")
          .select("user_id")
          .eq("group_id", groupId)
          .eq("user_id", userId)
          .single();
        if (!member) {
          return res
            .status(403)
            .json({ success: false, message: "Not a member of this group." });
        }

        const { data: boosts, error } = await supabase
          .from("boosts")
          .select(
            "id, boost_type, match_id, applied_at, expires_at, is_used, created_at",
          )
          .eq("group_id", groupId)
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const available = (boosts ?? []).filter((b) => !b.is_used);
        const used = (boosts ?? []).filter((b) => b.is_used);

        res.json({ success: true, data: { available, used } });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to load boosts.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // POST /api/groups/:id/boosts — apply a boost to a match
  app.post(
    "/api/groups/:id/boosts",
    requireAuth,
    async (req: express.Request, res: express.Response) => {
      try {
        const supabase = getSupabaseAdmin();
        const userId = (req as any).userId as string;
        const { id: groupId } = req.params;
        const { boost_id, match_id } = req.body as {
          boost_id: string;
          match_id: string;
        };

        if (!boost_id || !match_id) {
          return res.status(400).json({
            success: false,
            message: "boost_id and match_id are required.",
          });
        }

        // Verify the boost belongs to this user + group and is available
        const { data: boost } = await supabase
          .from("boosts")
          .select("id, boost_type, is_used, expires_at")
          .eq("id", boost_id)
          .eq("user_id", userId)
          .eq("group_id", groupId)
          .single();

        if (!boost) {
          return res
            .status(404)
            .json({ success: false, message: "Boost not found." });
        }
        if (boost.is_used) {
          return res
            .status(409)
            .json({ success: false, message: "Boost already used." });
        }
        if (boost.expires_at && new Date(boost.expires_at) < new Date()) {
          return res
            .status(410)
            .json({ success: false, message: "Boost has expired." });
        }

        // Verify match is still upcoming (not started)
        const { data: match } = await supabase
          .from("matches")
          .select("id, status, match_date")
          .eq("id", match_id)
          .single();

        if (!match) {
          return res
            .status(404)
            .json({ success: false, message: "Match not found." });
        }
        if (match.status !== "scheduled") {
          return res.status(409).json({
            success: false,
            message:
              "Cannot apply boost to a match that has already started or finished.",
          });
        }

        const { data: updated, error } = await supabase
          .from("boosts")
          .update({
            is_used: true,
            match_id,
            applied_at: new Date().toISOString(),
          })
          .eq("id", boost_id)
          .select()
          .single();

        if (error) throw error;

        res.json({ success: true, data: updated });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to apply boost.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────
  // DAILY CHALLENGES
  // ──────────────────────────────────────────────────────────────

  // GET /api/daily-challenges — today's active challenge (optionally filter by competition_id)
  app.get(
    "/api/daily-challenges",
    requireAuth,
    async (req: express.Request, res: express.Response) => {
      try {
        const supabase = getSupabaseAdmin();
        const userId = (req as any).userId as string;
        const competitionId = req.query.competition_id as string | undefined;
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

        let query = supabase
          .from("daily_challenges")
          .select(
            "id, title, description, challenge_date, bonus_pts, competition_id",
          )
          .eq("challenge_date", today)
          .eq("is_active", true);

        if (competitionId) {
          query = query.eq("competition_id", competitionId);
        }

        const { data: challenges, error } = await query;
        if (error) throw error;

        if (!challenges || challenges.length === 0) {
          return res.json({
            success: true,
            data: { challenge: null, entry: null },
          });
        }

        const challenge = challenges[0];

        // Check if user already submitted
        const { data: entry } = await supabase
          .from("daily_challenge_entries")
          .select("id, answer, pts_earned, submitted_at")
          .eq("challenge_id", challenge.id)
          .eq("user_id", userId)
          .single();

        res.json({
          success: true,
          data: { challenge, entry: entry ?? null },
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to load daily challenge.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // POST /api/daily-challenges/:id/submit — submit answer for a daily challenge
  app.post(
    "/api/daily-challenges/:id/submit",
    requireAuth,
    async (req: express.Request, res: express.Response) => {
      try {
        const supabase = getSupabaseAdmin();
        const userId = (req as any).userId as string;
        const { id: challengeId } = req.params;
        const { answer } = req.body as { answer: unknown };

        if (answer === undefined || answer === null) {
          return res
            .status(400)
            .json({ success: false, message: "answer is required." });
        }

        // Verify challenge exists and is active today
        const { data: challenge } = await supabase
          .from("daily_challenges")
          .select("id, bonus_pts, challenge_date, is_active")
          .eq("id", challengeId)
          .single();

        if (!challenge) {
          return res
            .status(404)
            .json({ success: false, message: "Challenge not found." });
        }
        if (!challenge.is_active) {
          return res.status(410).json({
            success: false,
            message: "Challenge is no longer active.",
          });
        }
        const today = new Date().toISOString().slice(0, 10);
        if (challenge.challenge_date !== today) {
          return res.status(410).json({
            success: false,
            message: "This challenge is not for today.",
          });
        }

        // Idempotent upsert — only one entry per user per challenge
        const { data: entry, error } = await supabase
          .from("daily_challenge_entries")
          .upsert(
            {
              challenge_id: challengeId,
              user_id: userId,
              answer,
              pts_earned: 0, // graded later by admin/sync
              submitted_at: new Date().toISOString(),
            },
            { onConflict: "challenge_id,user_id" },
          )
          .select()
          .single();

        if (error) throw error;

        res.status(201).json({ success: true, data: entry });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to submit daily challenge.",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────
  app.get("/api/auth/check-email", handleCheckEmail);
  app.get("/api/auth/check-username", handleCheckUsername);
  app.post("/api/auth/send-code", handleSendCode);
  app.post("/api/auth/verify-code", handleVerifyCode);
  app.get("/api/auth/validate", requireAuth, handleValidateSession);
  app.post("/api/auth/logout", handleLogout);

  // ── Legal Documents ──────────────────────────────────────────
  app.get("/api/legal/:type", async (req, res) => {
    const { type } = req.params;
    if (type !== "privacy" && type !== "terms") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid document type" });
    }
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("legal_documents")
        .select("*")
        .eq("type", type)
        .eq("is_active", true)
        .single();
      if (error || !data) {
        return res
          .status(404)
          .json({ success: false, message: "Document not found" });
      }
      return res.json({ success: true, data });
    } catch (err) {
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  // ── Support Cases ─────────────────────────────────────────
  app.post(
    "/api/support/cases",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      const { category, subject, message } = req.body as {
        category?: string;
        subject?: string;
        message?: string;
      };

      const validCategories = [
        "account",
        "group",
        "predictions",
        "scoring",
        "technical",
        "billing",
        "other",
      ];
      if (!category || !validCategories.includes(category)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid category" });
      }
      if (
        !subject ||
        typeof subject !== "string" ||
        subject.trim().length < 3 ||
        subject.trim().length > 200
      ) {
        return res.status(400).json({
          success: false,
          message: "Subject must be between 3 and 200 characters",
        });
      }
      if (
        !message ||
        typeof message !== "string" ||
        message.trim().length < 10 ||
        message.trim().length > 5000
      ) {
        return res.status(400).json({
          success: false,
          message: "Message must be between 10 and 5000 characters",
        });
      }

      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from("support_cases")
          .insert({
            user_id: req.userId,
            category,
            subject: subject.trim(),
            message: message.trim(),
          })
          .select()
          .single();

        if (error || !data) {
          return res
            .status(500)
            .json({ success: false, message: "Failed to submit support case" });
        }

        return res.status(201).json({ success: true, data });
      } catch {
        return res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    },
  );

  // ─────────────────────────────────────────────────────────────────
  // ADMIN: requireAdmin middleware
  // Validates that the request carries a session token stored in admin_sessions
  // belonging to an active admin_users row. Completely independent of auth.users.
  // ─────────────────────────────────────────────────────────────────
  const requireAdmin: RequestHandler = async (req, res, next) => {
    const authHeader = req.headers.authorization ?? "";
    const rawToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";
    if (!rawToken) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }
    const tokenHash = hashToken(rawToken);
    const supabase = getSupabaseAdmin();
    const { data: session } = await supabase
      .from("admin_sessions")
      .select("admin_user_id, expires_at")
      .eq("token_hash", tokenHash)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();
    if (!session) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("id, is_active")
      .eq("id", session.admin_user_id)
      .single();
    if (!adminUser?.is_active) {
      res.status(403).json({ success: false, message: "Forbidden." });
      return;
    }
    res.locals.adminUserId = session.admin_user_id;
    next();
  };

  // ─────────────────────────────────────────────────────────────────
  // ADMIN AUTH: POST /api/admin/auth/send-code
  // Sends an OTP to the given email if it belongs to an admin user.
  // Uses the same OTP table and Resend infrastructure as user auth.
  // Returns a vague success regardless to avoid email enumeration.
  // ─────────────────────────────────────────────────────────────────
  app.post("/api/admin/auth/send-code", async (req, res) => {
    try {
      const { identifier } = req.body as { identifier?: string };
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!identifier || !emailRegex.test(identifier)) {
        res
          .status(400)
          .json({ success: false, message: "Valid email required." });
        return;
      }
      const normalizedEmail = identifier.trim().toLowerCase();
      const supabase = getSupabaseAdmin();

      // Look up in admin_users — completely separate from profiles/auth.users
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("id, display_name, locale, is_active")
        .eq("email", normalizedEmail)
        .single();

      if (adminUser?.is_active) {
        // Rate-limit: max 5 OTPs per identifier in 15 min
        const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from("otp_requests")
          .select("id", { count: "exact", head: true })
          .eq("identifier", normalizedEmail)
          .gte("created_at", windowStart);
        if ((count ?? 0) < 5) {
          const code = Math.floor(100000 + Math.random() * 900000);
          const salt = await bcrypt.genSalt(10);
          const codeHash = await bcrypt.hash(String(code), salt);
          const ip =
            (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
            req.socket.remoteAddress ||
            null;
          await supabase.from("otp_requests").insert({
            identifier: normalizedEmail,
            delivery_method: "email",
            code_hash: codeHash,
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            ip_address: ip,
          });
          const locale = adminUser.locale || "es";
          const copy = emailCopy[locale as Locale] ?? emailCopy.es;
          sendEmail({
            to: normalizedEmail,
            subject: copy.otpSubject(code),
            html: buildOtpEmail(adminUser.display_name || "", code, 10, locale),
          }).catch((e) => console.error("Admin OTP email failed:", e));
          if (isDev) {
            res.json({ success: true, debug_code: code });
            return;
          }
        }
      }
      // Always return success to prevent enumeration
      res.json({ success: true });
    } catch (err) {
      console.error("Error in admin send-code:", err);
      res.status(500).json({ success: false, message: "Failed to send code." });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // ADMIN AUTH: POST /api/admin/auth/verify-code
  // Verifies OTP, checks is_admin, creates session, returns token.
  // ─────────────────────────────────────────────────────────────────
  app.post("/api/admin/auth/verify-code", async (req, res) => {
    try {
      const { identifier, code } = req.body as {
        identifier?: string;
        code?: string;
      };
      if (!identifier || !code) {
        res.status(400).json({
          success: false,
          message: "identifier and code are required.",
        });
        return;
      }
      const normalizedEmail = identifier.trim().toLowerCase();
      const supabase = getSupabaseAdmin();

      const { data: otpRow } = await supabase
        .from("otp_requests")
        .select("id, code_hash, attempt_count, is_used, expires_at")
        .eq("identifier", normalizedEmail)
        .eq("is_used", false)
        .gt("expires_at", new Date().toISOString())
        .lt("attempt_count", 5)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!otpRow) {
        res.status(401).json({
          success: false,
          message: "No valid code found. Please request a new one.",
        });
        return;
      }

      const codeMatch = await bcrypt.compare(
        String(code).trim(),
        otpRow.code_hash,
      );
      if (!codeMatch) {
        await supabase
          .from("otp_requests")
          .update({ attempt_count: otpRow.attempt_count + 1 })
          .eq("id", otpRow.id);
        res.status(401).json({ success: false, message: "Invalid code." });
        return;
      }

      await supabase
        .from("otp_requests")
        .update({ is_used: true, verified_at: new Date().toISOString() })
        .eq("id", otpRow.id);

      // Resolve from admin_users (independent of auth.users / profiles)
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("id, username, display_name, is_active")
        .eq("email", normalizedEmail)
        .single();

      if (!adminUser?.is_active) {
        res.status(403).json({ success: false, message: "Not authorized." });
        return;
      }

      // Create admin session (admin_sessions — separate from user_sessions)
      const rawToken = generateSessionToken();
      const tokenHash = hashToken(rawToken);
      const ip =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
        req.socket.remoteAddress ||
        null;
      await supabase.from("admin_sessions").insert({
        admin_user_id: adminUser.id,
        token_hash: tokenHash,
        ip_address: ip,
        expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });

      res.json({
        success: true,
        sessionToken: rawToken,
        adminProfile: {
          id: adminUser.id,
          username: adminUser.username,
          display_name: adminUser.display_name,
          email: normalizedEmail,
        },
      });
    } catch (err) {
      console.error("Error in admin verify-code:", err);
      res
        .status(500)
        .json({ success: false, message: "Failed to verify code." });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // ADMIN: Services health check
  // Pings Supabase, Football Data API, and Resend.
  // ─────────────────────────────────────────────────────────────────
  app.get("/api/admin/services/health", requireAdmin, async (_req, res) => {
    const supabase = getSupabaseAdmin();
    const checkedAt = new Date().toISOString();

    const results: Array<{
      name: string;
      status: "healthy" | "degraded" | "down";
      latency_ms: number | null;
      message?: string;
      checked_at: string;
    }> = [];

    // 1. Supabase DB
    const t0 = Date.now();
    try {
      const { error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      const latency = Date.now() - t0;
      results.push({
        name: "Supabase",
        status: error ? "degraded" : "healthy",
        latency_ms: latency,
        message: error?.message,
        checked_at: checkedAt,
      });
    } catch (e) {
      results.push({
        name: "Supabase",
        status: "down",
        latency_ms: null,
        message: e instanceof Error ? e.message : "Unknown",
        checked_at: checkedAt,
      });
    }

    // 2. Football Data API
    const fdKey = process.env.FOOTBALL_DATA_API_KEY;
    if (fdKey) {
      const t1 = Date.now();
      try {
        const fdRes = await fetch(
          "https://api.football-data.org/v4/competitions",
          {
            headers: { "X-Auth-Token": fdKey },
            signal: AbortSignal.timeout(5000),
          },
        );
        const latency = Date.now() - t1;
        results.push({
          name: "Football Data API",
          status: fdRes.ok ? "healthy" : "degraded",
          latency_ms: latency,
          message: fdRes.ok ? undefined : `HTTP ${fdRes.status}`,
          checked_at: checkedAt,
        });
      } catch (e) {
        results.push({
          name: "Football Data API",
          status: "down",
          latency_ms: null,
          message: e instanceof Error ? e.message : "Timeout",
          checked_at: checkedAt,
        });
      }
    } else {
      results.push({
        name: "Football Data API",
        status: "degraded",
        latency_ms: null,
        message: "API key not configured",
        checked_at: checkedAt,
      });
    }

    // 3. Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const t2 = Date.now();
      try {
        const rRes = await fetch("https://api.resend.com/domains", {
          headers: { Authorization: `Bearer ${resendKey}` },
          signal: AbortSignal.timeout(5000),
        });
        const latency = Date.now() - t2;
        results.push({
          name: "Resend",
          status: rRes.ok ? "healthy" : "degraded",
          latency_ms: latency,
          message: rRes.ok ? undefined : `HTTP ${rRes.status}`,
          checked_at: checkedAt,
        });
      } catch (e) {
        results.push({
          name: "Resend",
          status: "down",
          latency_ms: null,
          message: e instanceof Error ? e.message : "Timeout",
          checked_at: checkedAt,
        });
      }
    } else {
      results.push({
        name: "Resend",
        status: "degraded",
        latency_ms: null,
        message: "API key not configured",
        checked_at: checkedAt,
      });
    }

    res.json({ success: true, services: results });
  });

  // ─────────────────────────────────────────────────────────────────
  // ADMIN: Dashboard stats
  // ─────────────────────────────────────────────────────────────────
  app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
    const supabase = getSupabaseAdmin();
    try {
      const [
        usersRes,
        groupsRes,
        predictionsRes,
        matchesRes,
        sessionsRes,
        liveMatchesRes,
        recentUsersRes,
        recentGroupsRes,
        groupsByModeRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("groups").select("id", { count: "exact", head: true }),
        supabase
          .from("predictions")
          .select("id", { count: "exact", head: true }),
        supabase.from("matches").select("id", { count: "exact", head: true }),
        supabase
          .from("user_sessions")
          .select("id", { count: "exact", head: true })
          .is("revoked_at", null)
          .gt("expires_at", new Date().toISOString()),
        supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .eq("status", "live"),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte(
            "created_at",
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          ),
        supabase
          .from("groups")
          .select("id", { count: "exact", head: true })
          .gte(
            "created_at",
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          ),
        supabase.from("groups").select("mode"),
      ]);

      const groups_by_mode: Record<string, number> = {};
      if (groupsByModeRes.data) {
        for (const g of groupsByModeRes.data) {
          groups_by_mode[g.mode] = (groups_by_mode[g.mode] ?? 0) + 1;
        }
      }

      res.json({
        success: true,
        data: {
          total_users: usersRes.count ?? 0,
          total_groups: groupsRes.count ?? 0,
          total_predictions: predictionsRes.count ?? 0,
          total_matches: matchesRes.count ?? 0,
          active_sessions: sessionsRes.count ?? 0,
          live_matches: liveMatchesRes.count ?? 0,
          groups_by_mode,
          recent_signups: recentUsersRes.count ?? 0,
          recent_groups: recentGroupsRes.count ?? 0,
        },
      });
    } catch (err) {
      console.error("Admin stats error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // ADMIN: Users
  // ─────────────────────────────────────────────────────────────────
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit ?? "25"))),
    );
    const search = String(req.query.search ?? "").trim();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    try {
      let query = supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (search) {
        query = query.or(
          `username.ilike.%${search}%,display_name.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`,
        );
      }

      const { data, count, error } = await query;
      if (error) throw error;

      // Enrich with group/prediction/session counts
      const userIds = (data ?? []).map((u) => u.id);
      const [groupCountsRes, predCountsRes, sessionCountsRes] =
        await Promise.all([
          supabase
            .from("group_members")
            .select("user_id")
            .in("user_id", userIds),
          supabase.from("predictions").select("user_id").in("user_id", userIds),
          supabase
            .from("user_sessions")
            .select("user_id")
            .in("user_id", userIds)
            .is("revoked_at", null)
            .gt("expires_at", new Date().toISOString()),
        ]);

      const groupCounts: Record<string, number> = {};
      const predCounts: Record<string, number> = {};
      const sessionCounts: Record<string, number> = {};
      for (const r of groupCountsRes.data ?? [])
        groupCounts[r.user_id] = (groupCounts[r.user_id] ?? 0) + 1;
      for (const r of predCountsRes.data ?? [])
        predCounts[r.user_id] = (predCounts[r.user_id] ?? 0) + 1;
      for (const r of sessionCountsRes.data ?? [])
        sessionCounts[r.user_id] = (sessionCounts[r.user_id] ?? 0) + 1;

      const items = (data ?? []).map((u) => ({
        ...u,
        groups_count: groupCounts[u.id] ?? 0,
        predictions_count: predCounts[u.id] ?? 0,
        active_sessions: sessionCounts[u.id] ?? 0,
      }));

      res.json({
        success: true,
        data: { items, total: count ?? 0, page, limit },
      });
    } catch (err) {
      console.error("Admin users error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  app.get("/api/admin/users/:id", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", req.params.id)
        .single();
      if (error || !data)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });

      const [groupsRes, predsRes, sessionsRes] = await Promise.all([
        supabase
          .from("group_members")
          .select("id")
          .eq("user_id", req.params.id),
        supabase.from("predictions").select("id").eq("user_id", req.params.id),
        supabase
          .from("user_sessions")
          .select("id")
          .eq("user_id", req.params.id)
          .is("revoked_at", null)
          .gt("expires_at", new Date().toISOString()),
      ]);

      res.json({
        success: true,
        data: {
          ...data,
          groups_count: groupsRes.data?.length ?? 0,
          predictions_count: predsRes.data?.length ?? 0,
          active_sessions: sessionsRes.data?.length ?? 0,
        },
      });
    } catch (err) {
      console.error("Admin user detail error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const allowed = [
      "username",
      "display_name",
      "first_name",
      "last_name",
      "phone",
      "country",
      "locale",
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }
    updates.updated_at = new Date().toISOString();

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", req.params.id)
        .select()
        .single();
      if (error)
        return res.status(400).json({ success: false, message: error.message });
      res.json({ success: true, data });
    } catch (err) {
      console.error("Admin update user error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const userId = String(req.params.id);
    try {
      // Delete from Supabase Auth (cascades to profiles)
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error)
        return res.status(400).json({ success: false, message: error.message });
      res.json({ success: true, data: { id: userId } });
    } catch (err) {
      console.error("Admin delete user error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  // POST /api/admin/users — create a new regular user manually
  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const {
      email,
      password,
      username,
      first_name,
      last_name,
      phone,
      country,
      locale,
    } = req.body as {
      email?: string;
      password?: string;
      username?: string;
      first_name?: string;
      last_name?: string;
      phone?: string;
      country?: string;
      locale?: string;
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      res
        .status(400)
        .json({ success: false, message: "Valid email required." });
      return;
    }
    if (!password || password.length < 8) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
      return;
    }

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const defaultUsername = username?.trim() || normalizedEmail.split("@")[0];

      // Derive display_name exactly like verify-code does — never ask for it explicitly
      const derivedDisplayName =
        first_name?.trim() && last_name?.trim()
          ? `${first_name.trim()} ${last_name.trim()}`
          : defaultUsername;

      // Create auth user (email_confirm: true skips verification email)
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: normalizedEmail,
          password,
          email_confirm: true,
          user_metadata: {
            username: defaultUsername,
            display_name: derivedDisplayName,
          },
        });

      if (authError) {
        res.status(400).json({ success: false, message: authError.message });
        return;
      }

      const userId = authData.user.id;

      // Apply extra profile fields (trigger auto-created the profile row)
      const profileUpdates: Record<string, unknown> = {
        // Always sync username and derived display_name so the profile
        // matches what verify-code would produce
        username: defaultUsername,
        display_name: derivedDisplayName,
      };
      if (first_name?.trim()) profileUpdates.first_name = first_name.trim();
      if (last_name?.trim()) profileUpdates.last_name = last_name.trim();
      if (phone?.trim()) profileUpdates.phone = phone.trim();
      if (country?.trim()) profileUpdates.country = country.trim();
      if (locale) profileUpdates.locale = locale;

      if (Object.keys(profileUpdates).length > 0) {
        await supabase.from("profiles").update(profileUpdates).eq("id", userId);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      res.status(201).json({
        success: true,
        data: {
          ...(profile ?? {}),
          groups_count: 0,
          predictions_count: 0,
          active_sessions: 0,
        },
      });
    } catch (err) {
      console.error("Admin create user error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  app.get("/api/admin/sessions", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit ?? "25"))),
    );
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    try {
      const { data, count, error } = await supabase
        .from("user_sessions")
        .select(
          "id, user_id, delivery_method, device_info, ip_address, last_seen_at, expires_at, created_at, profiles!user_sessions_user_id_fkey(username)",
          { count: "exact" },
        )
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("last_seen_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const items = (data ?? []).map((s: any) => ({
        id: s.id,
        user_id: s.user_id,
        username: s.profiles?.username ?? null,
        delivery_method: s.delivery_method,
        device_info: s.device_info,
        ip_address: s.ip_address,
        last_seen_at: s.last_seen_at,
        expires_at: s.expires_at,
        created_at: s.created_at,
      }));

      res.json({
        success: true,
        data: { items, total: count ?? 0, page, limit },
      });
    } catch (err) {
      console.error("Admin sessions error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  app.delete("/api/admin/sessions/:id", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    try {
      const { error } = await supabase
        .from("user_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", req.params.id);
      if (error)
        return res.status(400).json({ success: false, message: error.message });
      res.json({ success: true, data: { id: req.params.id } });
    } catch (err) {
      console.error("Admin revoke session error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // ADMIN: Competitions
  // ─────────────────────────────────────────────────────────────────
  app.get("/api/admin/competitions", requireAdmin, async (_req, res) => {
    const supabase = getSupabaseAdmin();
    try {
      const { data, error } = await supabase
        .from("competitions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ids = (data ?? []).map((c) => c.id);
      const [teamsRes, matchesRes, groupsRes] = await Promise.all([
        supabase
          .from("teams")
          .select("competition_id")
          .in("competition_id", ids),
        supabase
          .from("matches")
          .select("competition_id")
          .in("competition_id", ids),
        supabase
          .from("groups")
          .select("competition_id")
          .in("competition_id", ids),
      ]);

      const teamCounts: Record<string, number> = {};
      const matchCounts: Record<string, number> = {};
      const groupCounts: Record<string, number> = {};
      for (const r of teamsRes.data ?? [])
        teamCounts[r.competition_id] = (teamCounts[r.competition_id] ?? 0) + 1;
      for (const r of matchesRes.data ?? [])
        matchCounts[r.competition_id] =
          (matchCounts[r.competition_id] ?? 0) + 1;
      for (const r of groupsRes.data ?? [])
        groupCounts[r.competition_id] =
          (groupCounts[r.competition_id] ?? 0) + 1;

      const items = (data ?? []).map((c) => ({
        ...c,
        teams_count: teamCounts[c.id] ?? 0,
        matches_count: matchCounts[c.id] ?? 0,
        groups_count: groupCounts[c.id] ?? 0,
      }));

      res.json({ success: true, data: items });
    } catch (err) {
      console.error("Admin competitions error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  app.post("/api/admin/competitions", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const {
      name,
      short_name,
      type,
      season,
      starts_at,
      ends_at,
      is_active,
      is_test,
      logo_url,
      external_id,
    } = req.body ?? {};

    if (!name || !type || !season)
      return res.status(400).json({
        success: false,
        message: "name, type and season are required",
      });

    try {
      const { data, error } = await supabase
        .from("competitions")
        .insert({
          name,
          short_name: short_name ?? null,
          type,
          season,
          starts_at: starts_at ?? null,
          ends_at: ends_at ?? null,
          is_active: is_active ?? true,
          is_test: is_test ?? false,
          logo_url: logo_url ?? null,
          external_id: external_id ?? null,
        })
        .select()
        .single();
      if (error)
        return res.status(400).json({ success: false, message: error.message });
      res.status(201).json({ success: true, data });
    } catch (err) {
      console.error("Admin create competition error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  app.patch("/api/admin/competitions/:id", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const allowed = [
      "name",
      "short_name",
      "type",
      "season",
      "starts_at",
      "ends_at",
      "is_active",
      "is_test",
      "logo_url",
      "external_id",
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }

    try {
      const { data, error } = await supabase
        .from("competitions")
        .update(updates)
        .eq("id", req.params.id)
        .select()
        .single();
      if (error)
        return res.status(400).json({ success: false, message: error.message });
      res.json({ success: true, data });
    } catch (err) {
      console.error("Admin update competition error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  app.delete("/api/admin/competitions/:id", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    try {
      const { error } = await supabase
        .from("competitions")
        .delete()
        .eq("id", req.params.id);
      if (error)
        return res.status(400).json({ success: false, message: error.message });
      res.json({ success: true, data: { id: req.params.id } });
    } catch (err) {
      console.error("Admin delete competition error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // ADMIN: Teams
  // ─────────────────────────────────────────────────────────────────
  app.get(
    "/api/admin/competitions/:id/teams",
    requireAdmin,
    async (req, res) => {
      const supabase = getSupabaseAdmin();
      try {
        const { data, error } = await supabase
          .from("teams")
          .select("*, competitions!teams_competition_id_fkey(name)")
          .eq("competition_id", req.params.id)
          .order("name");
        if (error) throw error;

        const items = (data ?? []).map((t: any) => ({
          id: t.id,
          competition_id: t.competition_id,
          competition_name: t.competitions?.name ?? null,
          name: t.name,
          short_name: t.short_name,
          country_code: t.country_code,
          flag_url: t.flag_url,
          tier: t.tier,
          external_id: t.external_id,
          created_at: t.created_at,
        }));

        res.json({ success: true, data: items });
      } catch (err) {
        console.error("Admin teams error:", err);
        res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/admin/competitions/:id/teams",
    requireAdmin,
    async (req, res) => {
      const supabase = getSupabaseAdmin();
      const { name, short_name, country_code, flag_url, tier, external_id } =
        req.body ?? {};
      if (!name)
        return res
          .status(400)
          .json({ success: false, message: "name is required" });

      try {
        const { data, error } = await supabase
          .from("teams")
          .insert({
            competition_id: req.params.id,
            name,
            short_name: short_name ?? null,
            country_code: country_code ?? null,
            flag_url: flag_url ?? null,
            tier: tier ?? 1,
            external_id: external_id ?? null,
          })
          .select()
          .single();
        if (error)
          return res
            .status(400)
            .json({ success: false, message: error.message });
        res.status(201).json({ success: true, data });
      } catch (err) {
        console.error("Admin create team error:", err);
        res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    },
  );

  app.patch("/api/admin/teams/:id", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const allowed = [
      "name",
      "short_name",
      "country_code",
      "flag_url",
      "tier",
      "external_id",
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }

    try {
      const { data, error } = await supabase
        .from("teams")
        .update(updates)
        .eq("id", req.params.id)
        .select()
        .single();
      if (error)
        return res.status(400).json({ success: false, message: error.message });
      res.json({ success: true, data });
    } catch (err) {
      console.error("Admin update team error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  app.delete("/api/admin/teams/:id", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    try {
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", req.params.id);
      if (error)
        return res.status(400).json({ success: false, message: error.message });
      res.json({ success: true, data: { id: req.params.id } });
    } catch (err) {
      console.error("Admin delete team error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // ADMIN: Matches
  // ─────────────────────────────────────────────────────────────────
  app.get("/api/admin/matches", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit ?? "25"))),
    );
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const competition_id = req.query.competition_id as string | undefined;
    const status = req.query.status as string | undefined;

    try {
      let query = supabase
        .from("matches")
        .select(
          "*, competitions!matches_competition_id_fkey(name), home_team:teams!matches_home_team_id_fkey(name), away_team:teams!matches_away_team_id_fkey(name)",
          { count: "exact" },
        )
        .order("match_date", { ascending: false })
        .range(from, to);

      if (competition_id) query = query.eq("competition_id", competition_id);
      if (status) query = query.eq("status", status);

      const { data, count, error } = await query;
      if (error) throw error;

      const items = (data ?? []).map((m: any) => ({
        id: m.id,
        competition_id: m.competition_id,
        competition_name: m.competitions?.name ?? null,
        home_team_id: m.home_team_id,
        home_team_name: m.home_team?.name ?? null,
        away_team_id: m.away_team_id,
        away_team_name: m.away_team?.name ?? null,
        stage: m.stage,
        match_date: m.match_date,
        prediction_lock: m.prediction_lock,
        home_score: m.home_score,
        away_score: m.away_score,
        ht_score_home: m.ht_score_home,
        ht_score_away: m.ht_score_away,
        status: m.status,
        external_id: m.external_id,
        last_synced_at: m.last_synced_at,
        created_at: m.created_at,
      }));

      res.json({
        success: true,
        data: { items, total: count ?? 0, page, limit },
      });
    } catch (err) {
      console.error("Admin matches error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  app.post("/api/admin/matches", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const {
      competition_id,
      home_team_id,
      away_team_id,
      stage,
      match_date,
      prediction_lock,
      home_score,
      away_score,
      ht_score_home,
      ht_score_away,
      status,
      external_id,
    } = req.body ?? {};

    if (!competition_id || !match_date)
      return res.status(400).json({
        success: false,
        message: "competition_id and match_date are required",
      });

    try {
      const { data, error } = await supabase
        .from("matches")
        .insert({
          competition_id,
          home_team_id: home_team_id ?? null,
          away_team_id: away_team_id ?? null,
          stage: stage ?? null,
          match_date,
          prediction_lock: prediction_lock ?? null,
          home_score: home_score ?? null,
          away_score: away_score ?? null,
          ht_score_home: ht_score_home ?? null,
          ht_score_away: ht_score_away ?? null,
          status: status ?? "scheduled",
          external_id: external_id ?? null,
        })
        .select()
        .single();
      if (error)
        return res.status(400).json({ success: false, message: error.message });
      res.status(201).json({ success: true, data });
    } catch (err) {
      console.error("Admin create match error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  app.patch("/api/admin/matches/:id", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const allowed = [
      "home_team_id",
      "away_team_id",
      "stage",
      "match_date",
      "prediction_lock",
      "home_score",
      "away_score",
      "ht_score_home",
      "ht_score_away",
      "status",
      "external_id",
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }

    try {
      const { data, error } = await supabase
        .from("matches")
        .update(updates)
        .eq("id", req.params.id)
        .select()
        .single();
      if (error)
        return res.status(400).json({ success: false, message: error.message });
      res.json({ success: true, data });
    } catch (err) {
      console.error("Admin update match error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  app.delete("/api/admin/matches/:id", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    try {
      const { error } = await supabase
        .from("matches")
        .delete()
        .eq("id", req.params.id);
      if (error)
        return res.status(400).json({ success: false, message: error.message });
      res.json({ success: true, data: { id: req.params.id } });
    } catch (err) {
      console.error("Admin delete match error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // ADMIN: Venues
  // ─────────────────────────────────────────────────────────────────
  app.get("/api/admin/venues", requireAdmin, async (_req, res) => {
    const supabase = getSupabaseAdmin();
    try {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .order("name");
      if (error) throw error;
      res.json({ success: true, data: data ?? [] });
    } catch (err) {
      console.error("Admin venues error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  app.post("/api/admin/venues", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const { name, city, country, country_code, capacity, latitude, longitude } =
      req.body ?? {};
    if (!name || !city || !country)
      return res.status(400).json({
        success: false,
        message: "name, city and country are required",
      });

    try {
      const { data, error } = await supabase
        .from("venues")
        .insert({
          name,
          city,
          country,
          country_code: country_code ?? null,
          capacity: capacity ?? null,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
        })
        .select()
        .single();
      if (error)
        return res.status(400).json({ success: false, message: error.message });
      res.status(201).json({ success: true, data });
    } catch (err) {
      console.error("Admin create venue error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  app.patch("/api/admin/venues/:id", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const allowed = [
      "name",
      "city",
      "country",
      "country_code",
      "capacity",
      "latitude",
      "longitude",
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }

    try {
      const { data, error } = await supabase
        .from("venues")
        .update(updates)
        .eq("id", req.params.id)
        .select()
        .single();
      if (error)
        return res.status(400).json({ success: false, message: error.message });
      res.json({ success: true, data });
    } catch (err) {
      console.error("Admin update venue error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  app.delete("/api/admin/venues/:id", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    try {
      const { error } = await supabase
        .from("venues")
        .delete()
        .eq("id", req.params.id);
      if (error)
        return res.status(400).json({ success: false, message: error.message });
      res.json({ success: true, data: { id: req.params.id } });
    } catch (err) {
      console.error("Admin delete venue error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // ADMIN: Groups
  // ─────────────────────────────────────────────────────────────────
  app.get("/api/admin/groups", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit ?? "25"))),
    );
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const search = String(req.query.search ?? "").trim();

    try {
      let query = supabase
        .from("groups")
        .select(
          "*, competitions!groups_competition_id_fkey(name), profiles!groups_owner_id_fkey(username)",
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (search) query = query.ilike("name", `%${search}%`);

      const { data, count, error } = await query;
      if (error) throw error;

      const groupIds = (data ?? []).map((g) => g.id);
      const membersRes = await supabase
        .from("group_members")
        .select("group_id")
        .in("group_id", groupIds);
      const memberCounts: Record<string, number> = {};
      for (const m of membersRes.data ?? [])
        memberCounts[m.group_id] = (memberCounts[m.group_id] ?? 0) + 1;

      const items = (data ?? []).map((g: any) => ({
        id: g.id,
        name: g.name,
        invite_code: g.invite_code,
        competition_id: g.competition_id,
        competition_name: g.competitions?.name ?? null,
        mode: g.mode,
        draft_type: g.draft_type,
        owner_id: g.owner_id,
        owner_username: g.profiles?.username ?? null,
        max_members: g.max_members,
        status: g.status,
        member_count: memberCounts[g.id] ?? 0,
        is_active: g.is_active,
        is_test: g.is_test,
        created_at: g.created_at,
      }));

      res.json({
        success: true,
        data: { items, total: count ?? 0, page, limit },
      });
    } catch (err) {
      console.error("Admin groups error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  app.patch("/api/admin/groups/:id", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const allowed = ["name", "is_active", "is_test", "status", "max_members"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }
    updates.updated_at = new Date().toISOString();

    try {
      const { data, error } = await supabase
        .from("groups")
        .update(updates)
        .eq("id", req.params.id)
        .select()
        .single();
      if (error)
        return res.status(400).json({ success: false, message: error.message });
      res.json({ success: true, data });
    } catch (err) {
      console.error("Admin update group error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  app.delete("/api/admin/groups/:id", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    try {
      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", req.params.id);
      if (error)
        return res.status(400).json({ success: false, message: error.message });
      res.json({ success: true, data: { id: req.params.id } });
    } catch (err) {
      console.error("Admin delete group error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  app.get("/api/admin/groups/:id/members", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    try {
      const { data, error } = await supabase
        .from("group_members")
        .select(
          "*, profiles!group_members_user_id_fkey(username, display_name, avatar_url)",
        )
        .eq("group_id", req.params.id)
        .order("total_points", { ascending: false });
      if (error) throw error;

      const items = (data ?? []).map((m: any) => ({
        id: m.id,
        group_id: m.group_id,
        user_id: m.user_id,
        username: m.profiles?.username ?? null,
        display_name: m.profiles?.display_name ?? null,
        avatar_url: m.profiles?.avatar_url ?? null,
        role: m.role,
        total_points: m.total_points,
        joined_at: m.joined_at,
      }));

      res.json({ success: true, data: items });
    } catch (err) {
      console.error("Admin group members error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  app.delete(
    "/api/admin/groups/:id/members/:userId",
    requireAdmin,
    async (req, res) => {
      const supabase = getSupabaseAdmin();
      try {
        const { error } = await supabase
          .from("group_members")
          .delete()
          .eq("group_id", req.params.id)
          .eq("user_id", req.params.userId);
        if (error)
          return res
            .status(400)
            .json({ success: false, message: error.message });
        res.json({
          success: true,
          data: { group_id: req.params.id, user_id: req.params.userId },
        });
      } catch (err) {
        console.error("Admin remove member error:", err);
        res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    },
  );

  // POST /api/admin/groups — create a group manually
  app.post("/api/admin/groups", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const { name, competition_id, mode, draft_type, max_members, is_test } =
      req.body as {
        name?: string;
        competition_id?: string;
        mode?: string;
        draft_type?: string;
        max_members?: number;
        is_test?: boolean;
      };

    if (!name?.trim()) {
      res.status(400).json({ success: false, message: "name is required." });
      return;
    }
    const validModes = [
      "friends",
      "casual",
      "league",
      "competitive",
      "global",
      "ownership",
    ];
    if (!mode || !validModes.includes(mode)) {
      res.status(400).json({ success: false, message: "Valid mode required." });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("groups")
        .insert({
          name: name.trim(),
          competition_id: competition_id || null,
          mode,
          draft_type: draft_type || "snake",
          max_members: max_members || 50,
          is_test: is_test ?? false,
          is_active: true,
          status: "waiting",
        })
        .select(
          "*, competitions!groups_competition_id_fkey(name), profiles!groups_owner_id_fkey(username)",
        )
        .single();

      if (error) {
        res.status(400).json({ success: false, message: error.message });
        return;
      }

      res.status(201).json({
        success: true,
        data: {
          id: data.id,
          name: data.name,
          invite_code: data.invite_code,
          competition_id: data.competition_id,
          competition_name: (data as any).competitions?.name ?? null,
          mode: data.mode,
          draft_type: data.draft_type,
          owner_id: data.owner_id,
          owner_username: (data as any).profiles?.username ?? null,
          max_members: data.max_members,
          status: data.status,
          member_count: 0,
          is_active: data.is_active,
          is_test: data.is_test,
          created_at: data.created_at,
        },
      });
    } catch (err) {
      console.error("Admin create group error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  // POST /api/admin/groups/:id/members — add a user to a group by email or username
  app.post("/api/admin/groups/:id/members", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const groupId = req.params.id;
    const { identifier, role } = req.body as {
      identifier?: string; // email or username
      role?: string;
    };

    if (!identifier?.trim()) {
      res.status(400).json({
        success: false,
        message: "identifier (email or username) is required.",
      });
      return;
    }

    try {
      // Resolve user — try email first, then username
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isEmail = emailRegex.test(identifier.trim());

      // We need email from auth.users, so we look up auth users
      let userId: string | null = null;
      let profileRow: Record<string, unknown> | null = null;

      if (isEmail) {
        // Try to find via auth.users email
        const { data: listData } = await supabase.auth.admin.listUsers({
          perPage: 1000,
        });
        const authUser = (listData?.users ?? []).find(
          (u) => u.email?.toLowerCase() === identifier.trim().toLowerCase(),
        );
        if (authUser) userId = authUser.id;
      } else {
        // Look up by username in profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", identifier.trim())
          .single();
        if (profile) userId = profile.id;
      }

      if (!userId) {
        res.status(404).json({ success: false, message: "User not found." });
        return;
      }

      // Fetch profile for response
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", userId)
        .single();
      profileRow = profile;

      // Check if already a member
      const { data: existing } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", groupId)
        .eq("user_id", userId)
        .single();

      if (existing) {
        res
          .status(409)
          .json({ success: false, message: "User is already a member." });
        return;
      }

      const memberRole = ["admin", "member"].includes(role ?? "")
        ? role
        : "member";
      const { data: member, error: insertError } = await supabase
        .from("group_members")
        .insert({ group_id: groupId, user_id: userId, role: memberRole })
        .select("id, group_id, user_id, role, total_points, joined_at")
        .single();

      if (insertError) {
        res.status(400).json({ success: false, message: insertError.message });
        return;
      }

      res.status(201).json({
        success: true,
        data: {
          ...(member ?? {}),
          username: (profileRow as any)?.username ?? null,
          display_name: (profileRow as any)?.display_name ?? null,
          avatar_url: (profileRow as any)?.avatar_url ?? null,
        },
      });
    } catch (err) {
      console.error("Admin add member error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  // PATCH /api/admin/groups/:id/members/:userId — change member role
  app.patch(
    "/api/admin/groups/:id/members/:userId",
    requireAdmin,
    async (req, res) => {
      const supabase = getSupabaseAdmin();
      const { role } = req.body as { role?: string };
      if (!["admin", "member"].includes(role ?? "")) {
        res.status(400).json({
          success: false,
          message: "role must be 'admin' or 'member'.",
        });
        return;
      }
      try {
        const { data, error } = await supabase
          .from("group_members")
          .update({ role })
          .eq("group_id", req.params.id)
          .eq("user_id", req.params.userId)
          .select("id, group_id, user_id, role, total_points, joined_at")
          .single();
        if (error) {
          res.status(400).json({ success: false, message: error.message });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        console.error("Admin update member role error:", err);
        res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    },
  );

  // PATCH /api/admin/groups/:id/owner — transfer group ownership
  app.patch("/api/admin/groups/:id/owner", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const groupId = req.params.id;
    const { user_id } = req.body as { user_id?: string };
    if (!user_id) {
      res.status(400).json({ success: false, message: "user_id is required." });
      return;
    }
    try {
      // Ensure new owner is a member (add if not)
      const { data: existing } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", groupId)
        .eq("user_id", user_id)
        .single();
      if (!existing) {
        await supabase
          .from("group_members")
          .insert({ group_id: groupId, user_id, role: "admin" });
      } else {
        await supabase
          .from("group_members")
          .update({ role: "admin" })
          .eq("group_id", groupId)
          .eq("user_id", user_id);
      }
      const { data, error } = await supabase
        .from("groups")
        .update({ owner_id: user_id })
        .eq("id", groupId)
        .select("id, owner_id")
        .single();
      if (error) {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
      res.json({ success: true, data });
    } catch (err) {
      console.error("Admin transfer ownership error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // ADMIN: Predictions (read-only view)
  // ─────────────────────────────────────────────────────────────────
  app.get("/api/admin/predictions", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit ?? "25"))),
    );
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const group_id = req.query.group_id as string | undefined;
    const user_id = req.query.user_id as string | undefined;

    try {
      let query = supabase
        .from("predictions")
        .select(
          "*, groups!predictions_group_id_fkey(name), profiles!predictions_user_id_fkey(username), matches!predictions_match_id_fkey(match_date, home_team_id, away_team_id, home_team:teams!matches_home_team_id_fkey(name), away_team:teams!matches_away_team_id_fkey(name))",
          { count: "exact" },
        )
        .order("submitted_at", { ascending: false })
        .range(from, to);

      if (group_id) query = query.eq("group_id", group_id);
      if (user_id) query = query.eq("user_id", user_id);

      const { data, count, error } = await query;
      if (error) throw error;

      const items = (data ?? []).map((p: any) => ({
        id: p.id,
        group_id: p.group_id,
        group_name: p.groups?.name ?? null,
        user_id: p.user_id,
        username: p.profiles?.username ?? null,
        match_id: p.match_id,
        match_label: p.matches
          ? `${p.matches.home_team?.name ?? "?"} vs ${p.matches.away_team?.name ?? "?"}`
          : null,
        predicted_home: p.predicted_home,
        predicted_away: p.predicted_away,
        result: p.result,
        points_earned: p.points_earned,
        bonus_pts: p.bonus_pts,
        submitted_at: p.submitted_at,
      }));

      res.json({
        success: true,
        data: { items, total: count ?? 0, page, limit },
      });
    } catch (err) {
      console.error("Admin predictions error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // ADMIN: Notifications (view & bulk send)
  // ─────────────────────────────────────────────────────────────────
  app.get("/api/admin/notifications", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit ?? "25"))),
    );
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    try {
      const { data, count, error } = await supabase
        .from("notifications")
        .select("*, profiles!notifications_user_id_fkey(username)", {
          count: "exact",
        })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;

      const items = (data ?? []).map((n: any) => ({
        id: n.id,
        user_id: n.user_id,
        username: n.profiles?.username ?? null,
        type: n.type,
        title: n.title,
        body: n.body,
        is_read: n.is_read,
        created_at: n.created_at,
      }));

      res.json({
        success: true,
        data: { items, total: count ?? 0, page, limit },
      });
    } catch (err) {
      console.error("Admin notifications error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  app.post("/api/admin/notifications", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const { user_ids, type, title, body, metadata } = req.body ?? {};
    if (!type || !title)
      return res
        .status(400)
        .json({ success: false, message: "type and title are required" });

    try {
      let targetIds: string[] = user_ids ?? [];
      if (!targetIds.length) {
        const { data } = await supabase.from("profiles").select("id");
        targetIds = (data ?? []).map((p) => p.id);
      }

      const rows = targetIds.map((uid: string) => ({
        user_id: uid,
        type,
        title,
        body: body ?? null,
        metadata: metadata ?? null,
        is_read: false,
      }));

      const { error } = await supabase.from("notifications").insert(rows);
      if (error)
        return res.status(400).json({ success: false, message: error.message });

      res.status(201).json({
        success: true,
        data: { sent_to: targetIds.length },
      });
    } catch (err) {
      console.error("Admin bulk notification error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // ADMIN: OTP Requests (audit log)
  // ─────────────────────────────────────────────────────────────────
  app.get("/api/admin/otp-requests", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit ?? "25"))),
    );
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    try {
      const { data, count, error } = await supabase
        .from("otp_requests")
        .select(
          "id, identifier, delivery_method, expires_at, verified_at, attempt_count, is_used, ip_address, created_at",
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;

      res.json({
        success: true,
        data: { items: data ?? [], total: count ?? 0, page, limit },
      });
    } catch (err) {
      console.error("Admin OTP requests error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // ADMIN PROFILE: GET /api/admin/profile
  // Returns the full admin_users row for the authenticated admin.
  // ─────────────────────────────────────────────────────────────────
  app.get("/api/admin/profile", requireAdmin, async (_req, res) => {
    const supabase = getSupabaseAdmin();
    const userId = res.locals.adminUserId as string;
    try {
      const { data, error } = await supabase
        .from("admin_users")
        .select(
          "id, email, username, display_name, first_name, last_name, phone, country, locale, is_active, created_at",
        )
        .eq("id", userId)
        .single();
      if (error || !data) throw error ?? new Error("Profile not found");
      res.json({ success: true, data });
    } catch (err) {
      console.error("Admin profile fetch error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // ADMIN PROFILE: PATCH /api/admin/profile
  // Updates editable fields on the authenticated admin's own record.
  // ─────────────────────────────────────────────────────────────────
  app.patch("/api/admin/profile", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const userId = res.locals.adminUserId as string;
    const ALLOWED = [
      "display_name",
      "first_name",
      "last_name",
      "phone",
      "country",
      "locale",
    ] as const;
    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED) {
      if (key in req.body) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) {
      res
        .status(400)
        .json({ success: false, message: "No valid fields to update." });
      return;
    }
    try {
      const { data, error } = await supabase
        .from("admin_users")
        .update(updates)
        .eq("id", userId)
        .select(
          "id, email, username, display_name, first_name, last_name, phone, country, locale, is_active",
        )
        .single();
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      console.error("Admin profile update error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // ADMIN PEOPLE: GET /api/admin/people
  // Lists all admin_users rows (the admin team, not regular users).
  // ─────────────────────────────────────────────────────────────────
  app.get("/api/admin/people", requireAdmin, async (_req, res) => {
    const supabase = getSupabaseAdmin();
    try {
      const { data, error } = await supabase
        .from("admin_users")
        .select(
          "id, email, username, display_name, first_name, last_name, phone, country, locale, is_active, created_at, updated_at",
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      res.json({ success: true, data: data ?? [] });
    } catch (err) {
      console.error("Admin people list error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  // ADMIN PEOPLE: POST /api/admin/people
  // Creates a new admin user. Email + username must be unique.
  app.post("/api/admin/people", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const {
      email,
      username,
      display_name,
      first_name,
      last_name,
      phone,
      country,
      locale,
    } = req.body as {
      email?: string;
      username?: string;
      display_name?: string;
      first_name?: string;
      last_name?: string;
      phone?: string;
      country?: string;
      locale?: string;
    };
    if (!email || !username) {
      res
        .status(400)
        .json({ success: false, message: "email and username are required." });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ success: false, message: "Invalid email." });
      return;
    }
    try {
      const { data, error } = await supabase
        .from("admin_users")
        .insert({
          email: email.trim().toLowerCase(),
          username: username.trim(),
          display_name: display_name ?? null,
          first_name: first_name ?? null,
          last_name: last_name ?? null,
          phone: phone ?? null,
          country: country ?? null,
          locale: locale ?? "en",
          is_active: true,
        })
        .select(
          "id, email, username, display_name, first_name, last_name, phone, country, locale, is_active, created_at, updated_at",
        )
        .single();
      if (error) {
        if (error.code === "23505") {
          res.status(409).json({
            success: false,
            message: "Email or username already in use.",
          });
          return;
        }
        throw error;
      }
      res.status(201).json({ success: true, data });
    } catch (err) {
      console.error("Admin people create error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  // ADMIN PEOPLE: PATCH /api/admin/people/:id
  app.patch("/api/admin/people/:id", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const { id } = req.params;
    const ALLOWED = [
      "display_name",
      "first_name",
      "last_name",
      "phone",
      "country",
      "locale",
      "is_active",
    ] as const;
    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED) {
      if (key in req.body) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) {
      res
        .status(400)
        .json({ success: false, message: "No valid fields to update." });
      return;
    }
    // Prevent deactivating yourself
    if (
      updates.is_active === false &&
      id === (res.locals.adminUserId as string)
    ) {
      res.status(400).json({
        success: false,
        message: "Cannot deactivate your own account.",
      });
      return;
    }
    try {
      const { data, error } = await supabase
        .from("admin_users")
        .update(updates)
        .eq("id", id)
        .select(
          "id, email, username, display_name, first_name, last_name, phone, country, locale, is_active, created_at, updated_at",
        )
        .single();
      if (error) throw error;
      if (!data) {
        res
          .status(404)
          .json({ success: false, message: "Admin user not found." });
        return;
      }
      res.json({ success: true, data });
    } catch (err) {
      console.error("Admin people update error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  // ADMIN PEOPLE: DELETE /api/admin/people/:id
  // Hard-deletes an admin user. Cannot delete yourself.
  app.delete("/api/admin/people/:id", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const { id } = req.params;
    if (id === (res.locals.adminUserId as string)) {
      res
        .status(400)
        .json({ success: false, message: "Cannot delete your own account." });
      return;
    }
    try {
      const { error } = await supabase
        .from("admin_users")
        .delete()
        .eq("id", id);
      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      console.error("Admin people delete error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // ADVERTISE WITH US
  // ─────────────────────────────────────────────────────────────────

  // PUBLIC: POST /api/advertise
  // Submits an advertising inquiry. No auth required.
  // Sends an email notification to the admin.
  app.post("/api/advertise", async (req, res) => {
    const supabase = getSupabaseAdmin();
    const {
      brand_name,
      contact_name,
      contact_email,
      contact_phone,
      website_url,
      ad_format,
      budget_range,
      campaign_goal,
      message,
    } = req.body as {
      brand_name: string;
      contact_name: string;
      contact_email: string;
      contact_phone?: string;
      website_url?: string;
      ad_format: string;
      budget_range?: string;
      campaign_goal?: string;
      message?: string;
    };

    // Basic validation
    if (!brand_name || !contact_name || !contact_email || !ad_format) {
      res.status(400).json({
        success: false,
        message:
          "brand_name, contact_name, contact_email, and ad_format are required.",
      });
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(contact_email)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid contact_email." });
      return;
    }
    const validFormats = [
      "banner",
      "sponsored_group",
      "email_marketing",
      "homepage_spotlight",
      "other",
    ];
    if (!validFormats.includes(ad_format)) {
      res.status(400).json({ success: false, message: "Invalid ad_format." });
      return;
    }

    try {
      const ipAddress =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.socket.remoteAddress ||
        null;

      const { data, error } = await supabase
        .from("ad_requests")
        .insert({
          brand_name,
          contact_name,
          contact_email,
          contact_phone: contact_phone || null,
          website_url: website_url || null,
          ad_format,
          budget_range: budget_range || null,
          campaign_goal: campaign_goal || null,
          message: message || null,
          ip_address: ipAddress,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Notify admin via email (non-blocking)
      const adminNotifyEmail =
        process.env.ADMIN_NOTIFY_EMAIL || process.env.RESEND_FROM || null;
      if (adminNotifyEmail) {
        const formatLabels: Record<string, string> = {
          banner: "Banner Ad",
          sponsored_group: "Sponsored Group",
          email_marketing: "Email Marketing",
          homepage_spotlight: "Homepage Spotlight",
          other: "Other",
        };
        sendEmail({
          to: adminNotifyEmail,
          subject: `[FanQuin] New Ad Request from ${brand_name}`,
          html: `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0d0d14;color:#e2e8f0;padding:32px;border-radius:12px;">
  <h2 style="color:#a78bfa;margin-top:0;">New Advertising Inquiry 📣</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr><td style="padding:8px 0;color:#94a3b8;width:140px;">Brand</td><td style="padding:8px 0;font-weight:600;color:#fff;">${brand_name}</td></tr>
    <tr><td style="padding:8px 0;color:#94a3b8;">Contact</td><td style="padding:8px 0;color:#fff;">${contact_name}</td></tr>
    <tr><td style="padding:8px 0;color:#94a3b8;">Email</td><td style="padding:8px 0;color:#a78bfa;">${contact_email}</td></tr>
    ${contact_phone ? `<tr><td style="padding:8px 0;color:#94a3b8;">Phone</td><td style="padding:8px 0;color:#fff;">${contact_phone}</td></tr>` : ""}
    ${website_url ? `<tr><td style="padding:8px 0;color:#94a3b8;">Website</td><td style="padding:8px 0;color:#fff;">${website_url}</td></tr>` : ""}
    <tr><td style="padding:8px 0;color:#94a3b8;">Ad Format</td><td style="padding:8px 0;color:#fff;">${formatLabels[ad_format] ?? ad_format}</td></tr>
    ${budget_range ? `<tr><td style="padding:8px 0;color:#94a3b8;">Budget</td><td style="padding:8px 0;color:#fff;">${budget_range}</td></tr>` : ""}
    ${campaign_goal ? `<tr><td style="padding:8px 0;color:#94a3b8;">Goal</td><td style="padding:8px 0;color:#fff;">${campaign_goal}</td></tr>` : ""}
  </table>
  ${message ? `<div style="margin-top:16px;padding:16px;background:#1e1b4b;border-radius:8px;font-size:14px;color:#c4b5fd;">${message}</div>` : ""}
  <p style="margin-top:24px;font-size:12px;color:#475569;">View in admin: ${process.env.APP_URL || "https://fanquin.com"}/admin/ads</p>
</div>`.trim(),
        }).catch((e) => console.error("Ad request email failed:", e));
      }

      res.json({ success: true, data: { id: data.id } });
    } catch (err) {
      console.error("Advertise submit error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  // ADMIN: GET /api/admin/ad-requests
  // Lists all ad requests, newest first. Paginated.
  app.get("/api/admin/ad-requests", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const perPage = Math.min(
      100,
      Math.max(1, parseInt((req.query.per_page as string) || "25", 10)),
    );
    const status = req.query.status as string | undefined;
    const offset = (page - 1) * perPage;

    try {
      let countQuery = supabase
        .from("ad_requests")
        .select("id", { count: "exact", head: true });
      let dataQuery = supabase
        .from("ad_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .range(offset, offset + perPage - 1);

      if (status) {
        countQuery = countQuery.eq("status", status);
        dataQuery = dataQuery.eq("status", status);
      }

      const [countRes, dataRes] = await Promise.all([countQuery, dataQuery]);
      if (countRes.error) throw countRes.error;
      if (dataRes.error) throw dataRes.error;

      res.json({
        success: true,
        data: {
          data: dataRes.data ?? [],
          total: countRes.count ?? 0,
          page,
          per_page: perPage,
        },
      });
    } catch (err) {
      console.error("Admin ad-requests list error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  // ADMIN: PATCH /api/admin/ad-requests/:id
  // Updates status and/or admin_notes for an ad request.
  app.patch("/api/admin/ad-requests/:id", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const { id } = req.params;
    const { status, admin_notes } = req.body as {
      status?: string;
      admin_notes?: string;
    };

    const validStatuses = ["pending", "contacted", "approved", "rejected"];
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: "Invalid status." });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, message: "Nothing to update." });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("ad_requests")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      if (!data) {
        res
          .status(404)
          .json({ success: false, message: "Ad request not found." });
        return;
      }
      res.json({ success: true, data });
    } catch (err) {
      console.error("Admin ad-request update error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  // ADMIN: DELETE /api/admin/ad-requests/:id
  app.delete("/api/admin/ad-requests/:id", requireAdmin, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const { id } = req.params;
    try {
      const { error } = await supabase
        .from("ad_requests")
        .delete()
        .eq("id", id);
      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      console.error("Admin ad-request delete error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });

  return app;
}

// Lazy singleton — reused across serverless invocations
let _app: express.Application | null = null;
function getApp() {
  if (!_app) {
    _app = createApp();
  }
  return _app;
}

// Default export: Vercel serverless handler
export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    getApp()(req as any, res as any);
  } catch (err) {
    console.error("API handler error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};
