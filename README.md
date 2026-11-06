# BOTL · G1M — Dashboard de Meta Ads

Panel en Next.js (App Router) con dos pestañas, una por cuenta publicitaria:

| Pestaña | Cuenta |
| --- | --- |
| BOTL | `act_1369377041983871` |
| G1M | `act_1613493609949175` |

Cada pestaña muestra, solo para su cuenta: tarjetas KPI (Gasto, Ingresos, ROAS,
Compras, CPA, AOV, CTR, CPC) con variación vs. período anterior y sparkline,
gráfico de evolución (semanal/diario), campañas (Activas/Pausadas/Todas) y los
anuncios de cada campaña con su creatividad. Las cuentas se definen en
`lib/accounts.js`.

## Desarrollo

```bash
cp .env.local.example .env.local   # y completar
npm install
npm run dev
```

## Token de Meta

El panel lee Meta con `META_ACCESS_TOKEN` (variable de entorno). El token
de usuario dura ~60 días. La pestaña **Conexiones** (`/dashboard/conexiones`)
muestra cuándo vence, qué cuentas ve, y tiene el botón **Renovar token de
Meta**.

Con `VERCEL_API_TOKEN` configurado, renovar es un click: después de
confirmar en Facebook, el panel guarda el token nuevo en Vercel (API de
Vercel) y redeploya producción; en 1-2 minutos queda activo. Solo se guarda
si el token ve las dos cuentas. Sin `VERCEL_API_TOKEN`, la página de
callback muestra el token para copiarlo a mano.

Diagnóstico: `/api/meta/ad-accounts` muestra qué cuentas ve el token.
