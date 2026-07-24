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

## Développement local

### Prérequis

- Node.js >= 20.9.0
- pnpm
- Docker Desktop

### Installation

1. Clone le repo
2. Installe les dépendances : `pnpm install`
3. Copie les variables d'environnement : `cp .env.example .env.development`
4. Lance la base de données : `pnpm db:start`
5. Lance les migrations : `pnpm prisma migrate dev`
6. Lance le serveur : `pnpm dev`

### Reset de la base de données

```bash
pnpm db:reset
```

### Arrêter la base de données

```bash
pnpm db:stop
```

## CI/CD & Déploiement

### Secrets GitHub requis

Pour que le job `deploy` du workflow (`.github/workflows/ci.yml`) puisse déployer sur Vercel, ajoute ces secrets dans **GitHub → Settings → Secrets and variables → Actions** :

| Secret | Où le récupérer |
| --- | --- |
| `VERCEL_TOKEN` | [vercel.com](https://vercel.com) → Settings → Tokens |
| `VERCEL_ORG_ID` | vercel.com → Settings → General |
| `VERCEL_PROJECT_ID` | Récupéré après création du projet sur Vercel (Project Settings → General) |
| `NEXT_PUBLIC_SENTRY_DSN` | Le DSN du projet Sentry (sentry.io → Project Settings → Client Keys (DSN)) |

Le job `build` a également besoin des secrets d'environnement applicatifs (`DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`) — voir `.github/workflows/ci.yml`.

### Monitoring des erreurs (Sentry)

Sentry est intégré via `@sentry/nextjs` et n'est actif qu'en production (`enabled: process.env.NODE_ENV === 'production'`) — aucune erreur n'est remontée en développement ou en preview local.

Variables nécessaires :

| Variable | Où la définir |
| --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | GitHub Secrets (build CI) **et** Vercel → Project Settings → Environment Variables (runtime) |
| `SENTRY_AUTH_TOKEN` | Optionnel — uniquement nécessaire pour l'upload des source maps lors du build (sentry.io → Settings → Auth Tokens) |

Le DSN n'est jamais codé en dur dans le code, uniquement lu via `process.env.NEXT_PUBLIC_SENTRY_DSN`.

### Workflow complet

**Développement**
- Travail sur la branche `develop` ou une feature branch.
- Chaque push déclenche la CI (`lint-and-type-check` + `test` + `build`).
- Vercel crée automatiquement un *preview deployment* avec une URL temporaire.

**Production**
- Ouvrir une PR `develop` → `main`.
- La CI doit passer (lint + tests + build) avant de merger.
- Le merge sur `main` déclenche le job `deploy`.
- Vercel exécute `pnpm prisma migrate deploy && pnpm prisma generate && pnpm build` (voir `vercel.json`) — les migrations en attente sont appliquées automatiquement à chaque déploiement.
- Déploiement automatique en production.
