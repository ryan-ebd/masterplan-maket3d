-- Tipologi atap per zona hasil usulan LLM (dipakai pipeline saat OSM tak punya roof:shape)
ALTER TABLE "Project" ADD COLUMN "roofDefaults" JSONB;
