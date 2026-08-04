import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { HttpError, handleApiError, jsonOk } from "@/lib/authz";

export async function POST(req: Request) {
  try {
    const body = registerSchema.parse(await req.json());
    const sudahAda = await prisma.user.findUnique({ where: { email: body.email } });
    if (sudahAda) throw new HttpError(409, "Email sudah terdaftar");

    try {
      const user = await prisma.user.create({
        data: {
          name: body.name,
          email: body.email,
          passwordHash: await hash(body.password, 10),
          role: body.role,
        },
        select: { id: true, email: true, name: true, role: true },
      });
      return jsonOk(user, { status: 201 });
    } catch (e) {
      // Dua pendaftaran email sama nyaris bersamaan: cek di atas bisa lolos keduanya
      if ((e as { code?: string }).code === "P2002") {
        throw new HttpError(409, "Email sudah terdaftar");
      }
      throw e;
    }
  } catch (e) {
    return handleApiError(e);
  }
}
