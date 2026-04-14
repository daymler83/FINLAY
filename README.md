This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Login Social

Para habilitar acceso con Google y Microsoft, agrega estas variables de entorno:

- `APP_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`

Callbacks a registrar en cada proveedor:

- `https://tu-dominio.com/api/auth/oauth/google/callback`
- `https://tu-dominio.com/api/auth/oauth/microsoft/callback`

## Heroku

- `Procfile` usa:
  - `release: npm run heroku:release`
  - `web: npm start`
- El release ahora aplica migraciones versionadas con `prisma migrate deploy`.
- El seed no corre por defecto en cada deploy. Para habilitarlo:
  - `HEROKU_RUN_SEED_ON_RELEASE=true`

Variables importantes para pagos de Mercado Pago:

- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_CURRENCY_ID` (ej: `CLP`)
- `MERCADOPAGO_MONTHLY_PRICE`
- `MERCADOPAGO_ANNUAL_PRICE`
- `MERCADOPAGO_WEBHOOK_SECRET`
- `MERCADOPAGO_WEBHOOK_URL` (recomendado para producción)
- `MERCADOPAGO_WEBHOOK_STRICT_SIGNATURE` (`true` recomendado en producción)

Checklist de producción para pagos:

1. Configura `APP_URL` con HTTPS real (ej: `https://app.tudominio.com`).
2. Configura `MERCADOPAGO_ACCESS_TOKEN` de producción (no sandbox).
3. Define precios finales con `MERCADOPAGO_MONTHLY_PRICE` y `MERCADOPAGO_ANNUAL_PRICE`.
4. Configura webhook:
   - URL: `https://tu-dominio.com/api/mercadopago/webhook` (o `MERCADOPAGO_WEBHOOK_URL`)
   - Evento: pagos/suscripciones recurrentes
   - Secreto: `MERCADOPAGO_WEBHOOK_SECRET`
5. Mantén `MERCADOPAGO_WEBHOOK_STRICT_SIGNATURE=true`.
6. Realiza prueba real de extremo a extremo:
   - Checkout de plan mensual/anual
   - Redirección a `/pro/success`
   - Usuario queda con `isPro=true` y `proSubscriptionStatus=authorized|active`
