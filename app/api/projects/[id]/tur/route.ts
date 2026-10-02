import { handleApiError, jsonOk } from "@/lib/authz";
import { assertTurBaca } from "@/lib/tur/akses";
import { muatKeadaanTur } from "@/lib/tur/service";

export const runtime = "nodejs";

/** Keadaan tur: titik + klip. Klien hanya melihat titik berframe dan klip DONE yang tidak basi. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { untukKlien } = await assertTurBaca(id);
    return jsonOk(await muatKeadaanTur(id, untukKlien));
  } catch (e) {
    return handleApiError(e);
  }
}
