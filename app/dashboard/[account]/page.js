import { notFound } from "next/navigation";
import { getAccountBySlug } from "@/lib/accounts";
import AccountDashboard from "../AccountDashboard";

export const dynamic = "force-dynamic";

// /dashboard/botl y /dashboard/g1m: el resumen completo de UNA cuenta.
export default function AccountPage({ params }) {
  const account = getAccountBySlug(params.account);
  if (!account) notFound();
  // key: al cambiar de pestana se descarta todo el estado de la anterior.
  return <AccountDashboard key={account.slug} account={account} />;
}
