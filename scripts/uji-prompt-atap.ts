/**
 * Uji langsung prompt atap ke Claude — TANPA web UI, tanpa Google API.
 *   npx tsx --conditions=react-server scripts/uji-prompt-atap.ts [projectId]
 * Flag --conditions=react-server membuat impor "server-only" jadi no-op di Node.
 */
import fs from "node:fs";
if (fs.existsSync(".env")) process.loadEnvFile(".env");

const BENTUK_SAH = ["flat", "gabled", "hipped", "pyramidal", "skillion"];

async function main() {
  const { suggestBoundary } = await import("@/lib/llm/suggestBoundary");
  const { prisma } = await import("@/lib/prisma");

  const projectId = process.argv[2];
  const titik = projectId
    ? await prisma.project.findUniqueOrThrow({ where: { id: projectId } })
    : { id: "uji", locationLat: -6.9218, locationLng: 107.607, address: "Alun-Alun Bandung" };

  console.log(`Titik: (${titik.locationLat}, ${titik.locationLng}) — ${titik.address ?? "-"}\n`);
  const t0 = Date.now();
  const r = await suggestBoundary(titik);
  console.log(`Claude menjawab dalam ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

  console.log(`Poligon : ${r.polygon.coordinates[0].length} vertex, luas ${(r.areaM2 / 1e6).toFixed(2)} km²`);
  console.log(`Alasan  : ${r.reasoning.slice(0, 160)}…\n`);

  console.log("ZONA yang diusulkan:");
  for (const z of r.suggested_zones) console.log(`  - ${z.name} [${z.type}]`);

  console.log("\nROOF_DEFAULTS yang diusulkan:");
  if (!r.roof_defaults.length) {
    console.log("  (KOSONG — prompt gagal membuat model mengisi roof_defaults)");
  }
  const tipeZona = new Set(r.suggested_zones.map((z) => z.type));
  let masalah = 0;
  for (const d of r.roof_defaults) {
    const bentukOk = BENTUK_SAH.includes(d.shape);
    const zonaOk = tipeZona.has(d.zone_type);
    // flat tidak punya kemiringan -> 0 memang benar; selain flat harus 5-45
    const pitchOk =
      d.pitch_deg == null ||
      (d.shape === "flat" ? d.pitch_deg === 0 : d.pitch_deg >= 5 && d.pitch_deg <= 45);
    if (!bentukOk || !zonaOk || !pitchOk) masalah++;
    console.log(
      `  ${zonaOk ? "✅" : "⚠️ "} ${d.zone_type.padEnd(12)} → ${d.shape.padEnd(10)}` +
        `${bentukOk ? "" : " <bentuk TIDAK dikenal>"}` +
        ` ${String(d.pitch_deg ?? "-").padStart(3)}°${pitchOk ? "" : " <pitch di luar 5-45>"}` +
        `  ${d.note ?? ""}`,
    );
  }

  console.log(
    `\n${masalah === 0 && r.roof_defaults.length > 0 ? "✅ LULUS" : "❌ ADA MASALAH"}: ` +
      `${r.roof_defaults.length} usulan atap, ${masalah} bermasalah, ` +
      `cakupan zona ${r.roof_defaults.filter((d) => tipeZona.has(d.zone_type)).length}/${tipeZona.size}`,
  );

  if (projectId) {
    await prisma.project.update({
      where: { id: projectId },
      data: { roofDefaults: r.roof_defaults as never },
    });
    console.log(`\nroof_defaults disimpan ke proyek ${projectId} — lanjut: npx tsx scripts/run-pipeline.ts ${projectId}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
