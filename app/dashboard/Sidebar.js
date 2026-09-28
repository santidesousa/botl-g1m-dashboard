"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

// Una pestana por cuenta publicitaria.
export default function Sidebar({ accounts }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Al cambiar de pestana mantenemos el rango de fechas elegido (el
  // selector es compartido: vive en la URL).
  const keep = new URLSearchParams();
  for (const key of ["range", "since", "until"]) {
    if (searchParams.get(key)) keep.set(key, searchParams.get(key));
  }
  const query = keep.toString() ? `?${keep}` : "";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-row">
          <span className="brand-mark">BG</span>
          <span className="brand-name">BOTL · G1M</span>
        </div>
        <div className="sidebar-brand-sub">Performance · Meta Ads</div>
      </div>
      <nav className="sidebar-nav">
        <div className="sidebar-section">Cuentas</div>
        {accounts.map((a) => {
          const href = `/dashboard/${a.slug}`;
          return (
            <Link key={a.slug} href={href + query} className={"sidebar-link" + (pathname === href ? " active" : "")}>
              {a.label}
            </Link>
          );
        })}
      </nav>
      <form action="/api/logout" method="post" className="sidebar-footer">
        <span className="sidebar-role">Meta Ads</span>
        <button type="submit" className="sidebar-logout">
          Salir
        </button>
      </form>
    </aside>
  );
}
