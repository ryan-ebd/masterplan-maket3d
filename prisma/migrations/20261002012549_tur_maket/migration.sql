-- CreateTable
CREATE TABLE "TitikTur" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "featureId" INTEGER,
    "pos" JSONB NOT NULL,
    "target" JSONB NOT NULL,
    "framePath" TEXT,
    "modelVersi" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TitikTur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KlipTur" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "dariId" TEXT NOT NULL,
    "keId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "arkTaskId" TEXT,
    "model" TEXT NOT NULL,
    "resolution" TEXT NOT NULL,
    "durasiDtk" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "videoPath" TEXT,
    "hashPose" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "activeKey" TEXT,

    CONSTRAINT "KlipTur_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TitikTur_projectId_urutan_idx" ON "TitikTur"("projectId", "urutan");

-- CreateIndex
CREATE UNIQUE INDEX "KlipTur_activeKey_key" ON "KlipTur"("activeKey");

-- CreateIndex
CREATE INDEX "KlipTur_projectId_createdAt_idx" ON "KlipTur"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "KlipTur_dariId_keId_idx" ON "KlipTur"("dariId", "keId");

-- CreateIndex
CREATE INDEX "KlipTur_status_idx" ON "KlipTur"("status");

-- AddForeignKey
ALTER TABLE "TitikTur" ADD CONSTRAINT "TitikTur_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KlipTur" ADD CONSTRAINT "KlipTur_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KlipTur" ADD CONSTRAINT "KlipTur_dariId_fkey" FOREIGN KEY ("dariId") REFERENCES "TitikTur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KlipTur" ADD CONSTRAINT "KlipTur_keId_fkey" FOREIGN KEY ("keId") REFERENCES "TitikTur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
