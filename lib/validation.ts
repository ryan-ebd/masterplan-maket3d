import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(["KLIEN", "PERENCANA"]), // demo: role dipilih saat daftar (sesuai dokumen)
});

export const createProjectSchema = z.object({
  name: z.string().min(3).max(120),
  description: z.string().max(2000).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const lngLat = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

// GeoJSON Polygon satu ring (boundary maket tidak berlubang), ring tertutup.
export const polygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z
    .array(z.array(lngLat).min(4))
    .length(1)
    .refine((rings) => {
      const r = rings[0];
      return r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1];
    }, "Ring poligon harus tertutup (titik awal = titik akhir)"),
});

export const putBoundarySchema = z.object({
  polygon: polygonSchema,
  note: z.string().max(2000).optional(),
});

export const llmSuggestSchema = z.object({
  instruction: z.string().max(2000).optional(), // instruksi perencana, mis. "ikuti batas jalan besar ±500m"
});

export const llmChatSchema = z.object({
  message: z.string().min(1).max(4000),
});
