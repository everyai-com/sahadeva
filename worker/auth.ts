import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./authSchema";

type AuthEnv = {
  DB: D1Database;
  BETTER_AUTH_SECRET?: string;
  APP_ENV?: string;
};

export function createAuth(env: AuthEnv, requestOrigin: string) {
  const db = drizzle(env.DB);
  return betterAuth({
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    secret: env.BETTER_AUTH_SECRET || "sahadeva-dev-only-secret",
    baseURL: requestOrigin,
    basePath: "/api/auth",
    trustedOrigins: [requestOrigin],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 300 },
    },
    advanced: {
      useSecureCookies: env.APP_ENV === "production",
    },
  });
}

export async function sessionUser(
  env: AuthEnv,
  request: Request,
): Promise<{ id: string; name: string; email: string } | null> {
  const origin = new URL(request.url).origin;
  const auth = createAuth(env, origin);
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user
    ? {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }
    : null;
}
