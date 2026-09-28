import { NextResponse } from "next/server";
import { invalidateAll } from "@/lib/cache";

// POST /api/refresh — descarta la cache para traer datos frescos.
export async function POST() {
  invalidateAll();
  return NextResponse.json({ ok: true });
}
