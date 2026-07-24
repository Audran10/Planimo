# Planimo

> SaaS de gestion locative et technique avec plan interactif segmenté par IA

![CI](https://github.com/Audran10/Planimo/actions/workflows/ci.yml/badge.svg)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://planimo-snowy.vercel.app)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)

## Présentation

Planimo est un SaaS de gestion locative destiné aux bailleurs privés, SCI familiales et petites agences immobilières. Sa fonctionnalité différenciante est un **plan interactif segmenté par IA** : l'utilisateur uploade le plan d'un appartement, Claude Vision détecte automatiquement les pièces, et chaque pièce devient cliquable pour y attacher des documents, factures, photos et références techniques.

## Fonctionnalités

- 🏢 Gestion des biens immobiliers (immeubles, maisons, locaux commerciaux)
- 🏠 Gestion des unités avec slug et types dynamiques
- 🗺️ Plan interactif segmenté par IA (Claude Vision)
- 👥 Gestion des locataires avec suivi du bail
- 📄 Gestion documentaire avec upload Supabase Storage
- 🔧 Suivi des travaux et interventions par pièce
- 👤 Système d'invitation et de droits par bien (owner/admin/editor/viewer)
- 🌓 Dark/light mode
- 🔒 Sécurité OWASP (headers HTTP, rate limiting, CSP, RLS)
- ♿ Accessibilité RGAA 4.1
- 📊 Monitoring Sentry en production

## Stack technique

| Couche | Technologie |
|--------|------------|
| Framework | Next.js 16 (App Router) |
| Langage | TypeScript strict |
| Style | Tailwind CSS v4 + shadcn/ui |
| Base de données | PostgreSQL via Supabase |
| ORM | Prisma 7 |
| Auth | Better Auth 1.6 |
| Storage | Supabase Storage |
| IA | Claude Vision (Anthropic) |
| Hébergement | Vercel (Paris — `cdg1`) |
| Tests | Vitest (137 tests) |
| Monitoring | Sentry |

## Architecture

Le projet suit une architecture feature-based : chaque domaine métier regroupe ses propres Server Actions, composants, schémas de validation et types, séparés du code partagé et du routing.

```
planimo/
├── app/          # Next.js App Router — routing uniquement
├── core/         # Code partagé (lib, components, types, hooks)
├── features/     # Fonctionnalités métier
│   ├── auth/
│   ├── dashboard/
│   ├── documents/
│   ├── members/
│   ├── properties/
│   ├── tenants/
│   ├── units/          # inclut le plan interactif segmenté par IA
│   └── work-orders/
├── prisma/       # Schéma et migrations
└── tests/        # Tests unitaires Vitest
```

Chaque dossier de `features/` suit la même convention interne : `actions/` (Server Actions), `components/`, `schemas/`, `types/` et `lib/` selon les besoins du domaine.

## Développement local

### Prérequis

- Node.js >= 20.9.0
- pnpm
- Docker Desktop

### Installation

```bash
git clone https://github.com/Audran10/Planimo.git
cd Planimo
pnpm install
cp .env.example .env.development
# Renseigne les variables dans .env.development
pnpm db:start
pnpm prisma migrate dev
pnpm dev
```

L'application est accessible sur [http://localhost:3000](http://localhost:3000).

### Scripts disponibles

| Commande | Description |
|----------|-------------|
| `pnpm dev` | Lance le serveur de développement |
| `pnpm build` | Build de production |
| `pnpm lint` | Lint du code (ESLint) |
| `pnpm test` | Lance les tests unitaires |
| `pnpm test:ci` | Tests avec coverage |
| `pnpm db:start` | Lance PostgreSQL via Docker |
| `pnpm db:stop` | Arrête Docker |
| `pnpm db:reset` | Reset la base de données |
| `pnpm db:studio` | Ouvre Prisma Studio |

### Variables d'environnement

Toutes les variables sont documentées dans `.env.example`. En local, `DATABASE_URL` et `DIRECT_URL` doivent pointer vers le PostgreSQL Docker lancé par `pnpm db:start` (`postgresql://postgres:postgres@localhost:5432/planimo`) ; les autres variables Supabase (Storage) restent celles du projet Supabase distant.

| Variable | Description |
|----------|--------------|
| `DATABASE_URL` | Connexion PostgreSQL (pooler en production, Docker local en développement) |
| `DIRECT_URL` | Connexion PostgreSQL directe, utilisée par les migrations Prisma |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase (Storage) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase (côté client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé de service Supabase (côté serveur uniquement) |
| `BETTER_AUTH_SECRET` | Secret de signature des sessions Better Auth |
| `BETTER_AUTH_URL` | URL de base de l'application pour Better Auth |
| `ANTHROPIC_API_KEY` | Clé API Anthropic, utilisée pour la segmentation IA des plans (Claude Vision) |
| `NEXT_PUBLIC_APP_URL` | URL publique de l'application |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN Sentry (client) — le monitoring est désactivé hors production |
| `SENTRY_AUTH_TOKEN` | Token utilisé pour l'upload des source maps à la build |

## CI/CD

Le pipeline CI (`.github/workflows/ci.yml`) se déclenche sur chaque push et pull request vers `main` ou `develop` :

1. **Lint & Type Check** — `pnpm tsc --noEmit`, `pnpm lint`, `pnpm audit --audit-level=high`
2. **Tests** — `pnpm test:ci` (coverage exportée en artefact)
3. **Build** — `pnpm build`
4. **Deploy** — sur push vers `main` uniquement, une fois les trois jobs précédents passés, déploiement automatique sur Vercel

À chaque déploiement Vercel, `pnpm prisma migrate deploy` s'exécute automatiquement avant le build (voir `vercel.json`), garantissant que le schéma de base de données est toujours à jour en production.

## Tests

137 tests unitaires (16 fichiers, Vitest) couvrant :

- Validation des schemas Zod
- Logique d'autorisation (`checkPropertyAccess`)
- Server Actions (properties, units, tenants, documents, work-orders, members)
- Fonctions utilitaires (slugify, property-labels)
- Sécurité (rate limiting, validation des fichiers)

```bash
pnpm test:ci
```

## Sécurité

La couverture détaillée de l'OWASP Top 10 (headers HTTP, rate limiting, CSP, RLS, etc.) est documentée dans [SECURITY.md](./SECURITY.md).

## Accessibilité

Les mesures RGAA 4.1 mises en place sont documentées dans [ACCESSIBILITY.md](./ACCESSIBILITY.md).

## Déploiement

URL de production : [https://planimo-snowy.vercel.app](https://planimo-snowy.vercel.app)

## Licence

MIT
