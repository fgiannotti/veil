import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema/auth";
import { randomUUID } from "node:crypto";
import { isGoogleAuthEnabled } from "@/server/auth-config";
import { getEnv } from "@/server/env";
import { rateLimit } from "@/server/rate-limit";

export { isGoogleAuthEnabled } from "@/server/auth-config";

declare module "next-auth" {
  interface Session {
    profileId: string;
    isAdmin?: boolean;
    user: { id: string } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    profileId?: string;
    uid?: string;
  }
}

const env = getEnv();

const providers: Provider[] = [
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(creds) {
      const email = String(creds?.email ?? "").toLowerCase().trim();
      const password = String(creds?.password ?? "");
      if (!email || !password) return null;

      const rl = rateLimit(`login:${email}`, { limit: 10, windowMs: 15 * 60 * 1000 });
      if (!rl.ok) return null;

      const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!row || !row.passwordHash) return null;

      const ok = await compare(password, row.passwordHash);
      if (!ok) return null;

      return {
        id: row.id,
        email: row.email ?? undefined,
        name: row.name ?? undefined,
        profileId: row.profileId,
      } as { id: string; email?: string; name?: string; profileId: string };
    },
  }),
];

if (isGoogleAuthEnabled()) {
  providers.push(
    Google({
      clientId: env.googleId,
      clientSecret: env.googleSecret,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: env.authSecret,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
  useSecureCookies: env.isProd,
  pages: {
    signIn: "/login",
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user?.email) {
        const email = user.email.toLowerCase();
        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!existing) {
          const profileId = randomUUID();
          const [created] = await db
            .insert(users)
            .values({
              email,
              name: user.name ?? null,
              image: user.image ?? null,
              profileId,
            })
            .returning();
          (user as { id?: string; profileId?: string }).id = created.id;
          (user as { profileId?: string }).profileId = created.profileId;
        } else if (existing.passwordHash) {
          // Prevent takeover: credentials account with same email cannot be claimed via Google.
          return "/login?error=UseCredentials";
        } else {
          (user as { id?: string; profileId?: string }).id = existing.id;
          (user as { profileId?: string }).profileId = existing.profileId;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const u = user as { id?: string; profileId?: string };
        if (u.id) token.uid = u.id;
        if (u.profileId) token.profileId = u.profileId;
      }
      if (!token.profileId && token.email) {
        const [row] = await db
          .select({ id: users.id, profileId: users.profileId })
          .from(users)
          .where(eq(users.email, String(token.email).toLowerCase()))
          .limit(1);
        if (row) {
          token.uid = row.id;
          token.profileId = row.profileId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.profileId) session.profileId = token.profileId;
      if (token.uid && session.user) {
        (session.user as { id?: string }).id = token.uid;
      }
      const adminEmail = env.adminEmail;
      const userEmail = session.user?.email?.toLowerCase();
      session.isAdmin = Boolean(
        adminEmail && userEmail && userEmail === adminEmail.toLowerCase(),
      );
      return session;
    },
  },
});
