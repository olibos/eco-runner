// Responsibilities:
//   1. Derive `user` on every request by verifying the session cookie.
//   2. Mount /auth/login, /auth/callback, /auth/logout.
//
// Flow:
//   Browser → GET /protected
//     → middleware: no cookie → redirect /auth/login?returnTo=/protected
//     → MSAL: redirect to Entra login
//     → Entra: redirect /auth/callback?code=...&state=...
//     → Exchange code for tokens, extract id_token claims
//     → Sign our own short-lived JWT, set HttpOnly cookie
//     → Redirect to original returnTo URL

import { Elysia, t } from "elysia"
import { ConfidentialClientApplication } from "@azure/msal-node"
import { SignJWT, jwtVerify } from "jose"
import { config } from "../config"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionUser {
  sub: string  // homeAccountId from MSAL
  email: string
  name: string
  avatar: string
  iat: number
  exp: number
}

// ---------------------------------------------------------------------------
// MSAL client (singleton — one instance per process is the MSAL recommendation)
// ---------------------------------------------------------------------------

const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: config.azure.clientId,
    authority: config.azure.authority,
    clientSecret: config.azure.clientSecret,
  },
})

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

const signingKey = new TextEncoder().encode(config.cookie.secret)

async function signSessionJwt(user: Omit<SessionUser, "iat" | "exp">): Promise<string> {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(signingKey)
}

async function verifySessionJwt(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify<SessionUser>(token, signingKey)
    return payload
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// State helpers (encode/decode the `state` param passed through MSAL redirect)
// ---------------------------------------------------------------------------

function encodeState(data: Record<string, string>): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url")
}

function decodeState(state: string): Record<string, string> {
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString("utf8"))
  } catch {
    return {}
  }
}

function hash(email: string): string {
    const hasher = new Bun.CryptoHasher("md5");
    hasher.update(email.toLowerCase().replace(/[^a-z0-9._-]/g, "_"));
    return hasher.digest("hex");
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export const authPlugin = new Elysia({ name: "auth" })

  // ── 1. Derive `user` from cookie on every request ──────────────────────────
  .derive({ as: "global" }, async ({ cookie }) => {
    const token = cookie[config.cookie.name]?.value as string;
    if (!token) return { user: null as SessionUser | null }
    const user = await verifySessionJwt(token)
    return { user }
  })

  // ── 2. `requireAuth` macro ─────────────────────────────────────────────────
  //
  // Usage on a route:  .get("/secret", handler, { requireAuth: true })
  // Usage on a group:  .guard({ requireAuth: true }, app => app.get(...))
  //
  // API routes return 401 JSON. Page routes redirect to /auth/login.

  // ── 3. /auth/login — build MSAL auth URL and redirect ─────────────────────
  .get(
    "/auth/login",
    async ({ query, set, redirect }) => {
      const returnTo = (query.returnTo as string | undefined) ?? "/"

      const authUrl = await msalClient.getAuthCodeUrl({
        scopes: ["openid", "profile", "email"],
        redirectUri: config.azure.redirectUri,
        // Pass returnTo through MSAL's `state` param so we can recover it
        // in the callback even after the Entra round-trip.
        state: encodeState({ returnTo }),
        // Optional: prompt: "select_account" forces account picker
      })

      return redirect(authUrl);
    },
    {
      query: t.Object({
        returnTo: t.Optional(t.String()),
      }),
    },
  )

  // ── 4. /auth/callback — exchange code → tokens → session cookie ────────────
  .get(
    "/auth/callback",
    async ({ query, cookie, set, redirect }) => {
      const { code, state, error, error_description } = query

      // Surface Entra errors clearly during development
      if (error || !code) {
        set.status = 400
        return { error, error_description }
      }

      const { returnTo = "/" } = decodeState(state ?? "")

      // Exchange the authorization code for tokens
      const result = await msalClient.acquireTokenByCode({
        code,
        scopes: ["openid", "profile", "email"],
        redirectUri: config.azure.redirectUri,
      })

      // Build our own short-lived session JWT from the MSAL account info.
      // This means we never store MSAL tokens in the browser — only our
      // signed, HttpOnly cookie ever touches the client.
      const jwt = await signSessionJwt({
        sub: result.account?.homeAccountId ?? result.uniqueId,
        email: result.account?.username ?? "",
        name: result.account?.name ?? "",
        avatar: hash(result.account?.idTokenClaims?.preferred_username ?? result.account?.username ?? result.account?.localAccountId ?? ""),
      })

      // Set the session cookie
      cookie[config.cookie.name]!.set({
        value: jwt,
        httpOnly: true,
        secure: config.isProd,
        sameSite: "lax",
        maxAge: 8 * 60 * 60, // 8 hours, matches JWT exp
        path: "/",
      })

      return redirect(returnTo);
    },
    {
      query: t.Object({
        code: t.Optional(t.String()),
        state: t.Optional(t.String()),
        error: t.Optional(t.String()),
        error_description: t.Optional(t.String()),
      }),
    },
  )

  // ── 5. /auth/logout — clear cookie and optionally sign out of Entra ────────
  .get("/auth/logout", ({ cookie, redirect }) => {
    cookie[config.cookie.name]!.remove()

    // Redirect to Entra's end-session endpoint to also clear SSO session there.
    // Remove this if you want a local-only logout.
    const entraLogout =
      `${config.azure.authority}/oauth2/v2.0/logout` +
      `?post_logout_redirect_uri=${encodeURIComponent(
        config.azure.redirectUri.replace("/auth/callback", "/"),
      )}`

    return redirect(entraLogout);
  })

  // ── 6. /auth/me — returns current user info (useful for React to know who's logged in) ──
  .get(
    "/auth/me",
    ({ user, }) => {
      if (!user) return { };
      return {
        email: user.email,
        avatar: user.avatar,
        name: user.name 
      };
    },
  )
