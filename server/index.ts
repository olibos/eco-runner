// Entry point. Wires together:
//   • authPlugin   — session cookie derive + MSAL routes + requireAuth macro
//   • staticPlugin — serves the compiled React SPA from /dist
//   • apiRoutes    — protected API endpoints under /api
//   • SPA fallback — all unmatched routes return index.html (client-side routing)

import { Elysia } from "elysia"
import { staticPlugin } from "@elysiajs/static"
import { authPlugin } from "./plugins/auth"
import { apiRoutes } from "./routes/api"
import { config } from "./config"

const app = new Elysia()


  // ── Auth plugin (must come first so `user` is derived before route handlers) ──
  .use(authPlugin)
  .onBeforeHandle(({user, request, redirect})=>{
    const url = new URL(request.url);
    if (url.pathname === '/site.webmanifest') return;
    if (user) return;
    
    if (url.pathname.startsWith('/api')) {
      return new Response("Unauthorized", { status: 401 });
    }
    return redirect('/auth/login');
  })


  // ── Long-lived cache for hashed Vite assets ───────────────────────────────
  .mapResponse(({ request, responseValue }) => {
    if (new URL(request.url).pathname.startsWith("/assets/") && responseValue instanceof Response) {
      const headers = new Headers(responseValue.headers)
      headers.set("Cache-Control", "public, max-age=31536000, immutable")
      headers.set("Content-Security-Policy", `"content-security-policy": "default-src 'none'; manifest-src 'self'; connect-src 'self'; media-src 'self'; img-src 'self' https://ik.imagekit.io/olibos/; script-src 'self'; style-src 'self'; font-src 'self'; frame-ancestors 'none';"`)
      return new Response(responseValue.body, { status: responseValue.status, headers })
    }
  })

  // ── Static assets from the Vite build output ──────────────────────────────
  // Serves /dist/assets/*, /dist/favicon.ico, etc.
  // The SPA's index.html is handled by the fallback below (not staticPlugin)
  // so that client-side routes like /dashboard don't 404.
  .use(
    staticPlugin({
      assets: "dist",
      prefix: "/",
      alwaysStatic: true,
      indexHTML: true,
    }),
  )

  // ── API routes ─────────────────────────────────────────────────────────────
  .use(apiRoutes)

  // ── SPA fallback — return index.html for any unmatched path ───────────────
  // This allows React Router (or TanStack Router) to handle navigation.
  // Auth-protected pages should redirect from the client to /auth/login, OR
  // you can add `requireAuth: true` here to gate the entire SPA at the server.
  .get(
    "*",
    () => Bun.file("./dist/index.html")
  )

  .listen(config.port)

console.log(
  `🦊 Elysia is running at http://localhost:${app.server?.port}`,
)