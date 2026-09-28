import { redirect } from "next/navigation";
import { DEFAULT_ACCOUNT } from "@/lib/accounts";

export const dynamic = "force-dynamic";

// /dashboard -> primera pestana (conservando el rango de fechas si vino).
export default function DashboardIndex({ searchParams }) {
  const query = new URLSearchParams();
  for (const key of ["range", "since", "until"]) {
    if (typeof searchParams?.[key] === "string") query.set(key, searchParams[key]);
  }
  redirect(`/dashboard/${DEFAULT_ACCOUNT.slug}${query.toString() ? `?${query}` : ""}`);
}
