// Config edge-safe: TANPA prisma/bcrypt. Diimpor oleh middleware.ts.
// Provider credentials (yang butuh Node) ada di auth.ts.
import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

export const authConfig = {
  pages: { signIn: "/masuk" },
  session: { strategy: "jwt" },
  providers: [], // diisi di auth.ts
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isPublic =
        pathname === "/" || pathname.startsWith("/masuk") || pathname.startsWith("/daftar");
      if (isPublic) return true;
      return !!auth?.user; // false -> redirect ke /masuk (API dijaga di route handler, bukan di sini)
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
