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

export { isGoogleAuthEnabled } from "@/server/auth-config";

declare module "next-auth" {
  interface Session {
    profileId: string;
    user: { id: string } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    profileId?: string;
    uid?: string;
  }
}

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
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Same email may have signed up with password first.
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      // For Google sign-in, ensure a users row exists with a stable profile_id.
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
      // Backfill profileId if missing (e.g. very first Google flow)
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
      return session;
    },
  },
});
