import { authConfigured } from "@/lib/session";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage({ searchParams }) {
  return (
    <main className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-mark">BG</span>
          <span className="brand-name">BOTL · G1M</span>
        </div>
        <p className="muted" style={{ marginTop: 0 }}>Panel de performance · Meta Ads</p>
        {authConfigured() ? (
          <LoginForm next={searchParams?.next} />
        ) : (
          <div className="login-setup">
            <strong>Falta configurar el acceso.</strong>
            <p>
              En Vercel → Settings → Environment Variables, agregá <code>DASHBOARD_PASSWORD</code> y volvé a deployar.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
