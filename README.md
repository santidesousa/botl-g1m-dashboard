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

El panel lee Meta con `META_ACCESS_TOKEN` (variable de entorno). Para
obtenerlo, una sola vez: iniciar sesión en el panel, entrar a
`/api/auth/meta`, aceptar los permisos y copiar el token que muestra la
página a Vercel. El token de usuario dura ~60 días.

Diagnóstico: `/api/meta/ad-accounts` muestra qué cuentas ve el token.
