import { NextResponse } from "next/server";
import { ACCOUNTS } from "@/lib/accounts";
import { getAdAccounts } from "@/lib/meta";
import { errorResponse, requireMetaToken } from "../../_shared/route-helpers";

// GET /api/meta/ad-accounts
// Diagnostico: cuentas que ve el token y si incluye las dos del panel.
export async function GET() {
  try {
    const accounts = await getAdAccounts(requireMetaToken());
    return NextResponse.json({
      panel: ACCOUNTS.map((a) => ({ ...a, visible: accounts.some((x) => x.id === a.id) })),
      accounts,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
