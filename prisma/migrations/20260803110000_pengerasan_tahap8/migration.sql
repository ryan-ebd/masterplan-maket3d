-- Tahap 8 pengerasan: cache-buster viewer, idempotensi job atomik, satu sesi LLM per proyek

-- Model3D.updatedAt: cache-buster viewer (id tidak berubah saat upsert regenerate)
ALTER TABLE "Model3D" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ProcessingJob.activeKey: diisi projectId selama job aktif, NULL saat selesai.
-- UNIQUE menjadikan "satu job aktif per proyek" jaminan database (bukan cek-lalu-buat yang balapan).
ALTER TABLE "ProcessingJob" ADD COLUMN "activeKey" TEXT;
CREATE UNIQUE INDEX "ProcessingJob_activeKey_key" ON "ProcessingJob"("activeKey");

-- LlmSession: satu sesi per proyek -> upsert atomik, hilangkan risiko baris duplikat
DELETE FROM "LlmSession" a USING "LlmSession" b
  WHERE a."projectId" = b."projectId" AND a."createdAt" < b."createdAt";
DROP INDEX IF EXISTS "LlmSession_projectId_idx";
CREATE UNIQUE INDEX "LlmSession_projectId_key" ON "LlmSession"("projectId");
