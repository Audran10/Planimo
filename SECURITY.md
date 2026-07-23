# Sécurité — Planimo

## Couverture OWASP Top 10

| # | Faille | Mesure mise en place | Statut |
|---|--------|---------------------|--------|
| A01 | Broken Access Control | Vérification d'accès via `checkPropertyAccess()` sur toutes les Server Actions. Row Level Security sur Supabase. | ✅ |
| A02 | Cryptographic Failures | HTTPS forcé via HSTS. Cookies `httpOnly` et `Secure` en production. Données sensibles non stockées en clair. | ✅ |
| A03 | Injection | Prisma ORM avec requêtes paramétrées — protection native contre les injections SQL. Validation Zod sur toutes les entrées utilisateur. | ✅ |
| A04 | Insecure Design | Architecture multi-tenant avec isolation des données par utilisateur. Principe du moindre privilège sur les rôles (owner/admin/editor/viewer). | ✅ |
| A05 | Security Misconfiguration | Headers HTTP sécurisés (CSP, X-Frame-Options, HSTS, etc.). Variables d'environnement gitignorées. | ✅ |
| A06 | Vulnerable Components | Dependabot configuré pour les alertes de sécurité. `pnpm audit` dans le CI. | ✅ |
| A07 | Authentication Failures | Better Auth avec sessions sécurisées. Rate limiting sur les routes auth. Cookies httpOnly SameSite. | ✅ |
| A08 | Software Integrity | CI/CD avec vérification du build avant déploiement. pnpm lockfile committé. | ✅ |
| A09 | Logging Failures | Logs d'erreur Prisma en production. Monitoring Sentry (à configurer). | ⚠️ |
| A10 | SSRF | Validation des URLs Supabase Storage côté serveur. Pas de fetch vers des URLs fournies par l'utilisateur. | ✅ |

## Détails des mesures

### Headers HTTP (`next.config.ts`)

`X-XSS-Protection`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy` et une `Content-Security-Policy` sont appliqués sur toutes les routes.

### Rate limiting (`app/api/auth/[...all]/route.ts`)

Les requêtes `POST` vers les routes d'authentification (login, register, etc.) sont limitées à 10 requêtes par minute et par IP, via une `Map` en mémoire.

**⚠️ Limite connue** : cette solution en mémoire est suffisante pour le développement et la démo, mais :
- elle ne survit pas à un redémarrage du serveur ;
- elle n'est pas partagée entre plusieurs instances (inefficace derrière un load balancer ou sur des fonctions serverless qui scalent horizontalement).

**En production à fort trafic**, remplacer par [Upstash Redis](https://upstash.com/) + `@upstash/ratelimit`, qui centralise le compteur dans un store partagé.

### Validation des headers d'hôte (`proxy.ts`)

Les headers `x-forwarded-host` et `x-host` sont comparés au header `host` réel — une valeur différente est bloquée (403), ce qui protège contre les attaques par empoisonnement de cache et les redirections d'hôte forgées.

### Cookies de session (`core/lib/auth.ts`)

Better Auth est configuré avec `httpOnly: true`, `sameSite: 'lax'` et `secure` activé en production — protection CSRF native via les cookies.

### Upload de fichiers (`features/documents/actions/documents.ts`)

`uploadDocumentFile` valide côté serveur (jamais seulement côté client) :
- le chemin de destination doit commencer par l'ID de l'utilisateur authentifié (isolation par utilisateur) ;
- l'extension du fichier est vérifiée contre une liste noire (`.exe`, `.sh`, `.php`, `.js`) ;
- le `Content-Type` doit être un PDF ou une image ;
- la taille ne doit pas dépasser 10 Mo.

### Dépendances

- [`.github/dependabot.yml`](.github/dependabot.yml) : vérification hebdomadaire des dépendances npm, ouverture automatique de PR.
- `pnpm audit --audit-level=high` dans le job `lint-and-type-check` du CI.
- `next`, `eslint-config-next` (16.2.11), `prisma`, `@prisma/client`, `@prisma/adapter-pg` (7.9.0) mis à jour pour corriger 6 failles `high` (bypass de proxy Next.js, DoS sur les Server Actions, SSRF, PostCSS).
- `sharp`, `postcss` et `fast-uri` forcés via `pnpm.overrides` (`package.json`) vers leurs versions patchées, car `next`/`prisma` embarquent encore en interne des versions vulnérables de ces dépendances transitives.
- 2 failles `moderate` restantes (`@hono/node-server`, via `shadcn > @modelcontextprotocol/sdk`) : outil de développement (CLI shadcn), non présent dans le build applicatif déployé — sous le seuil `--audit-level=high` du CI, surveillées via Dependabot.

## Signaler une vulnérabilité

Si vous découvrez une faille de sécurité, merci de ne pas ouvrir d'issue publique. Contactez l'équipe directement.
