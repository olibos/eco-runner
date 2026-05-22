// Validate all required env vars at startup — fail fast rather than at runtime.

const required = [
  "AZURE_CLIENT_ID",
  "AZURE_CLIENT_SECRET",
  "AZURE_TENANT_ID",
  "AZURE_REDIRECT_URI",
  "COOKIE_SECRET",
  "DB_SERVER",
  "DB_DATABASE",
] as const

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
}

export const config = {
  azure: {
    clientId:     process.env.AZURE_CLIENT_ID!,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
    tenantId:     process.env.AZURE_TENANT_ID!,
    redirectUri:  process.env.AZURE_REDIRECT_URI!,
    authority:    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
  },
  db: {
    server:   process.env.DB_SERVER!,
    database: process.env.DB_DATABASE!,
  },
  cookie: {
    secret: process.env.COOKIE_SECRET!,
    name:   "auth_session",
  },
  port:    Number(process.env.PORT ?? 3000),
  isProd:  process.env.NODE_ENV === "production",
}