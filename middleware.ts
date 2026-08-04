// Middleware edge: HANYA impor auth.config.ts (tanpa prisma/bcrypt — crash di edge).
// /api dikecualikan dari matcher: route handler menjaga dirinya sendiri (401 JSON via authz.ts).
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|webp|ico|glb)).*)"],
};
