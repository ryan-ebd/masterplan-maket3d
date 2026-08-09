import path from "node:path";

// SATU sumber lokasi storage: penulis (pipeline), penyapu (runner), pembaca +
// pemeriksa path-containment (route GLB), dan CLI harus sepakat soal folder ini.
export const STORAGE_ROOT = path.resolve(process.env.STORAGE_DIR ?? "./storage/models");

/** Cache respons Overpass, sejajar dengan folder models (gitignored). */
export const CACHE_DIR = path.resolve(STORAGE_ROOT, "..", "cache");
