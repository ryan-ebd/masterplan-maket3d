import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const pw = await hash("password123", 10);

  const klien = await prisma.user.upsert({
    where: { email: "klien@demo.id" },
    update: {},
    create: {
      email: "klien@demo.id",
      name: "Budi (Klien)",
      role: "KLIEN",
      passwordHash: pw,
    },
  });

  await prisma.user.upsert({
    where: { email: "perencana@demo.id" },
    update: {},
    create: {
      email: "perencana@demo.id",
      name: "Sari (Perencana)",
      role: "PERENCANA",
      passwordHash: pw,
    },
  });

  await prisma.project.upsert({
    where: { id: "proyek-demo-1" },
    update: {},
    create: {
      id: "proyek-demo-1",
      name: "Maket Kawasan Braga",
      description:
        "Contoh proyek: maket kawasan sekitar Jl. Braga, Bandung. Titik dipilih klien, menunggu perencana.",
      locationLat: -6.9175,
      locationLng: 107.6098,
      address: "Braga, Kota Bandung, Jawa Barat",
      status: "BARU",
      klienId: klien.id,
    },
  });

  console.log("Seed selesai: klien@demo.id / perencana@demo.id (password123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
