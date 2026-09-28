import { Suspense } from "react";
import { ACCOUNTS } from "@/lib/accounts";
import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }) {
  return (
    <div className="app-shell">
      <Suspense fallback={<aside className="sidebar" />}>
        <Sidebar accounts={ACCOUNTS.map(({ slug, label }) => ({ slug, label }))} />
      </Suspense>
      <main className="content">{children}</main>
    </div>
  );
}
