/**
 * CLI harness pipeline — uji tanpa web UI.
 *   npx tsx scripts/run-pipeline.ts <projectId>            # pipeline nyata (butuh boundary)
 *   npx tsx scripts/run-pipeline.ts <projectId> --fixture  # daftarkan fixture GLB sbg model proyek
 */
import fs from "node:fs";
import path from "node:path";
import type { Polygon } from "geojson";
import type { Prisma } from "@prisma/client";

if (fs.existsSync(".env")) process.loadEnvFile(".env");

async function main() {
  // dynamic import agar loadEnvFile di atas sempat mengisi STORAGE_DIR
  const { STORAGE_ROOT } = await import("@/lib/storage");
  const [projectId, flag] = process.argv.slice(2);
  if (!projectId) {
    console.error("Pakai: tsx scripts/run-pipeline.ts <projectId> [--fixture]");
    process.exit(1);
  }

  const { prisma } = await import("@/lib/prisma");
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    console.error(`Proyek ${projectId} tidak ditemukan`);
    process.exit(1);
  }

  if (flag === "--fixture") {
    const { buildFixture } = await import("./make-fixture-glb");
    const rel = `${projectId}/fixture.glb`;
    const hasil = await buildFixture(path.resolve(STORAGE_ROOT, rel));
    const statsJson = hasil.stats as Prisma.InputJsonValue;
    const layersJson = hasil.layersMeta as unknown as Prisma.InputJsonValue;
    await prisma.model3D.upsert({
      where: { projectId },
      create: { projectId, glbPath: rel, stats: statsJson, layersMeta: layersJson },
      update: { glbPath: rel, stats: statsJson, layersMeta: layersJson },
    });
    await prisma.project.update({ where: { id: projectId }, data: { status: "REVIEW_PERENCANA" } });
    console.log(`Fixture terdaftar sebagai Model3D proyek ${project.name} (${rel})`);
    return;
  }

  if (!project.boundary) {
    console.error("Proyek belum punya boundary — gambar di editor atau: tsx scripts/run-pipeline.ts", projectId, "--fixture");
    process.exit(1);
  }

  const { runPipeline } = await import("@/lib/pipeline");
  const t0 = Date.now();
  const hasil = await runPipeline(
    {
      projectId,
      boundary: project.boundary as unknown as Polygon,
      zonesMeta: project.zonesMeta as unknown as { name: string; type: string }[] | null,
    },
    async (progress, step) => {
      console.log(`[${String(progress).padStart(3)}%] ${step}`);
    },
  );

  const statsJson = hasil.stats as Prisma.InputJsonValue;
  const layersJson = hasil.layersMeta as unknown as Prisma.InputJsonValue;
  await prisma.model3D.upsert({
    where: { projectId },
    create: { projectId, glbPath: hasil.glbPath, stats: statsJson, layersMeta: layersJson },
    update: { glbPath: hasil.glbPath, stats: statsJson, layersMeta: layersJson },
  });
  await prisma.project.update({ where: { id: projectId }, data: { status: "REVIEW_PERENCANA" } });

  const detik = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nSelesai dalam ${detik}s -> ${path.join(STORAGE_ROOT, hasil.glbPath)}`);
  console.log("Stats:", {
    buildings: hasil.stats.buildings,
    roads: hasil.stats.roads,
    waterBodies: hasil.stats.waterBodies,
    layers: hasil.layersMeta.map((l) => l.id).join(", "),
  });
  if (hasil.warnings.length) console.log("Peringatan:", hasil.warnings);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$disconnect();
  });
