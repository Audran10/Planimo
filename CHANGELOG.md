# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

> **Note méthodologique** : ce changelog a été reconstruit à partir de l'historique
> git réel (`git log --oneline --all`). Certains commits regroupent plusieurs sujets
> à la fois (ex. `feat(tenant): create tenant management` contient aussi la mise en
> place de Docker) ; dans ce cas, leur contenu a été réparti entre les sections
> ci-dessous selon la nature de chaque changement plutôt que selon la frontière
> exacte du commit.

## [Non publié]

## [0.3.0] — 2026-07-24

### Ajouté

- Plan interactif segmenté par IA : upload d'un plan (PDF ou image), conversion
  PDF → image côté client (`pdfjs-dist`), analyse via Claude Vision
  (`claude-sonnet-4-6`) pour détecter automatiquement les pièces, zones SVG
  cliquables avec panneau de détail par pièce (documents, travaux, références
  techniques peinture/côtes/notes avec sauvegarde auto-débouncée).
- Mode d'édition manuelle du plan (fallback) : déplacement/redimensionnement
  des zones, ajout de pièces au clic-glisser.
- `Room.slug` : identifiant stable liant une zone du plan (`floorPlanZones`) à
  son enregistrement `Room`, indépendant du nom (modifiable) de la pièce.
- Headers HTTP de sécurité (CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy) sur toutes les routes.
- Rate limiting en mémoire (10 req/min/IP) sur les routes d'authentification.
- Blocage des headers `x-forwarded-host`/`x-host` forgés dans le proxy
  (`proxy.ts`).
- Validation serveur des fichiers uploadés : liste noire d'extensions
  (`.exe`, `.sh`, `.php`, `.js`), liste blanche de types MIME (PDF/image),
  taille maximale 10 Mo.
- `SECURITY.md` documentant la couverture OWASP Top 10.
- `.github/dependabot.yml` (alertes hebdomadaires sur les dépendances npm) et
  étape `pnpm audit --audit-level=high` dans le CI.
- Mesures d'accessibilité RGAA 4.1 : lien d'évitement (« Aller au contenu
  principal »), navigation avec `aria-current`, `aria-label` sur tous les
  boutons icône, `aria-hidden` sur les icônes décoratives, `role="alert"` sur
  les messages d'erreur de formulaire (partagé via le composant `FormMessage`),
  `aria-required` sur les champs obligatoires, zones du plan accessibles au
  clavier (`role="button"`, `tabIndex`, Enter/Espace), tableau des locataires
  avec `scope="col"` et `aria-label`.
- `ACCESSIBILITY.md` documentant les mesures RGAA et leurs limites connues.
- 137 tests unitaires (Vitest) sur les Server Actions critiques :
  `checkPropertyAccess`, CRUD locataires/appartements/pièces/travaux/documents/
  biens/membres, rate limiter, validation des fichiers, schémas Zod.
- Intégration Sentry (`@sentry/nextjs`) : suivi des erreurs client/serveur/edge,
  Session Replay, tunnel `/monitoring` (contournement des bloqueurs de
  publicités), error boundary global (`app/global-error.tsx`) désactivé en
  développement.

### Modifié

- `getTenantByUnitId`/`getAllTenants` : les documents liés à un locataire sont
  désormais filtrés sur `type: 'lease'` et limités au plus récent, pour
  calculer un statut de bail à trois états (actif / contrat manquant / expiré)
  au lieu d'un statut binaire.
- `next.config.ts` enveloppé par `Sentry.withSentryConfig` ; CSP étendue avec
  `worker-src 'self' blob:` pour le worker de compression du Session Replay.
- `next`/`eslint-config-next` 16.2.10 → 16.2.11, `prisma`/`@prisma/client`/
  `@prisma/adapter-pg` 7.8.0 → 7.9.0 pour corriger des failles `high`
  (contournement du proxy Next.js, DoS sur les Server Actions, SSRF).
- Ajout de surcharges `pnpm.overrides` (`sharp`, `postcss`, `fast-uri`,
  `find-my-way`) pour forcer des versions patchées de dépendances transitives
  que `next`/`prisma` embarquent encore en interne dans des versions
  vulnérables.
- Extraction du rate limiter (`core/lib/rate-limit.ts`) et de la validation de
  fichiers (`features/documents/lib/file-validation.ts`) hors des fichiers
  `'use server'` d'origine, pour les rendre testables (un module `'use server'`
  ne peut exporter que des fonctions asynchrones).

### Corrigé

- **Bug critique découvert en écrivant les tests** : `updateTenant` levait
  systématiquement une exception (`tenantSchema.partial()` n'est pas
  utilisable sur un schéma Zod v4 contenant un `.refine()` — ce qui était le
  cas de `tenantSchema` à cause de la validation croisée
  `leaseEnd > leaseStart`). Toute tentative de modification d'un locataire
  existant échouait donc avant même d'atteindre Prisma. Corrigé en séparant
  `tenantObjectSchema` (base), `tenantSchema` (avec le `.refine()`, pour la
  création) et `tenantUpdateSchema` (`.partial()` sur la base, avec un
  `.refine()` réappliqué uniquement quand les deux dates sont fournies
  ensemble) ; `updateTenant` utilise désormais `tenantUpdateSchema`.

### Sécurité

- Voir la section « Ajouté » ci-dessus (headers HTTP, rate limiting,
  validation des uploads, dépendances) et `SECURITY.md` pour le détail complet
  de la couverture OWASP Top 10.

## [0.2.0] — 2026-07-19

### Ajouté

- Gestion des biens (`Property`) : CRUD complet, slugs uniques, types
  (immeuble/maison/local commercial), rôles par bien (owner/admin/editor/
  viewer) et invitation de membres.
- Gestion des appartements/locaux (`Unit`) : CRUD, slugs, comportement adapté
  au type de bien (liste d'unités pour un immeuble, unité unique intégrée
  directement pour une maison).
- Gestion des locataires (`Tenant`) : CRUD, badge de statut de bail, tableau
  des locataires, validation stricte (nom, email, téléphone, dates de bail,
  loyer, dépôt de garantie).
- Gestion des documents : upload vers Supabase Storage, typage (bail, état des
  lieux, facture, assurance, diagnostic, autre), rattachement à un
  appartement/pièce/locataire, upload du bail directement depuis le formulaire
  de création d'un locataire.
- Gestion des travaux/interventions (`WorkOrder`) : CRUD, statuts (en attente/
  en cours/terminé) avec changement rapide de statut, rattachement à un
  appartement ou une pièce.
- Configuration Docker locale (`docker-compose.yml`) pour une base PostgreSQL
  de développement, indépendante de Supabase.
- `core/hooks/use-file-upload.ts` et `core/components/shared/file-upload.tsx`
  pour l'upload de fichiers avec preview et barre de progression.

### Modifié

- `prisma.config.ts` : préférence pour `.env.development` (base locale Docker)
  quand il existe, avec repli sur `.env` (Supabase).

### Corrigé

- Lien manquant entre le bail uploadé depuis le formulaire de création d'un
  locataire et les documents affichés sur la page de l'appartement
  (`unitId` manquant lors de la création du document).

> Les travaux/interventions ont été committés le 2026-07-23, en même temps que
> le plan interactif (v0.3.0), mais sont listés ici car il s'agit d'une
> fonctionnalité métier de même nature que le reste de cette version.

## [0.1.0] — 2026-07-19

### Ajouté

- Initialisation du projet (Next.js 16, App Router, TypeScript, Tailwind v4).
- Authentification (Better Auth) : connexion, inscription, sessions via
  cookies, proxy (`proxy.ts`, l'équivalent Next 16 de `middleware.ts`) pour
  protéger les routes du dashboard et rediriger les utilisateurs déjà
  connectés.
- Interface dashboard : sidebar (navigation, déconnexion), header (fil
  d'Ariane, bascule thème clair/sombre), sidebar mobile.
- Pipeline CI/CD : workflow GitHub Actions (lint, type-check, tests, build),
  configuration Vercel, premiers tests unitaires (slugify, labels de bien,
  schémas Zod).

### Sécurité

- Cookies de session `httpOnly`, `sameSite: 'lax'`, `secure` en production.
