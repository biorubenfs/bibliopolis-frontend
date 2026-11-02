# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Angular coding conventions (signals, OnPush, `input()`/`output()`, native control flow, a11y requirements) live in `.claude/CLAUDE.md`, which Claude Code also loads. That file is identical to `AGENTS.md`, `.github/copilot-instructions.md`, `.gemini/GEMINI.md`, `.junie/guidelines.md`, `.windsurf/rules/guidelines.md` and `.cursor/rules/cursor.mdc`. If you change the conventions, keep those copies in sync.

## Project

Bibliopolis frontend: an Angular 21 SPA for managing personal book libraries (libraries, books owned by the user, exploring the catalog, ISBN barcode scanning). The backend is a separate repo at `../bibliopolis-backend`. The UI text and error messages are in Spanish.

## Commands

The package manager is pnpm, as set in `angular.json` and used by CI.

```bash
pnpm install
pnpm start                                   # ng serve (development config) on :4200, local backend
pnpm start -- --configuration dev            # serve against the remote dev API (see Environments)
pnpm run build -- --configuration dev        # build that CI deploys from main
pnpm run build                               # production build (default config) -> dist/bibliopolis-front/browser
pnpm test                                    # Vitest via @angular/build:unit-test (jsdom)
pnpm test -- --include src/app/foo.spec.ts   # run a single spec file
```

There is no lint script and no ESLint config. Prettier settings are in `package.json` (printWidth 100, single quotes, angular parser for HTML).

The only spec is `src/app/app.spec.ts`. It is the CLI scaffold and expects an `<h1>Hello, bibliopolis-front</h1>`, but `app.html` only contains `<router-outlet>`, so that test is stale.

## Environments

`src/environments/` holds the API base URL. `angular.json` swaps the files in with `fileReplacements`. The names don't match what they point to:

| Build configuration | File used | `apiUrl` |
|---|---|---|
| `development` (default for `ng serve`) | `environment.ts` (no replacement) | `http://localhost:3000` (local backend) |
| `dev` | `environment.dev.ts` | `https://dev.bibliopolis.es/api` (remote dev server) |
| `production` (default for `ng build`) | `environment.production.ts` | `https://bibliopolis.es/api` |

Note that `ng build` with no flag uses `production`, while `ng serve` with no flag uses `development`. The `dev` configuration is the remote dev server, not local development.

## Deployment

`.github/workflows/deploy.yml` builds with pnpm and rsyncs `dist/bibliopolis-front/browser/` to a VPS. A push to `main` deploys with `--configuration dev`. A push to `production` deploys with `--configuration production`. The workflow can also be run manually.

## Architecture

- **Bootstrap**: `app.config.ts` provides the router and `HttpClient` (`withFetch`) with the functional `authInterceptor`. There are no NgModules.
- **Routing** (`app.routes.ts`): every page is lazy loaded with `loadComponent`. Every route except `/login` is protected by `authGuard`. `/login` uses `loginGuard`, which redirects authenticated users to `/libraries`.
- **Pages vs. children**: route-level pages are in `src/app/components/<page>/`. Modals that belong to one page are nested inside that page's folder (for example `libraries/create-library-modal`). Shared pieces (for example `pagination`, `book-card`, `user-book-card`, `book-detail-modal`) are in `components/shared/`. A modal is a child component that the parent shows or hides with a boolean signal and that reports back through outputs. There is no dialog service.
- **Services** (`src/app/services/`): one `providedIn: 'root'` service per backend resource (`auth`, `library`, `book`, `user`). Each service builds URLs from `environment.apiUrl`, sends `withCredentials: true`, and has its own private `handleError` that turns `HttpErrorResponse` into a plain `Error` carrying the backend `ApiError.message` (`models/error.model.ts`). Components subscribe and show `error.message`.
- **API response shape** (`src/app/models/`): the backend returns JSON:API-like envelopes: `{ results: { type, id, attributes } }` for a single item and `{ results: [...], paginationInfo: { skip, limit, total } }` for lists. Components flatten these as `{ ...item.attributes, id: item.id }`. Pagination is `skip`/`limit` based: components keep `currentPage`/`itemsPerPage` signals and compute `skip`.
- **Auth flow** (`services/auth.service.ts`, `interceptors/auth.interceptor.ts`, `guards/auth.guard.ts`):
  - The backend issues a single JWT from `/auth/login` (no refresh token, no cookies, no logout endpoint). It is kept in the `accessToken` signal and persisted in `localStorage` (`bibliopolis.accessToken`) so the session survives reloads.
  - On first navigation, `authGuard` calls `checkAuth()`. If there is no stored token or its `exp` has passed, the user is unauthenticated; otherwise it validates the token with `/auth/me`. The `authCheckComplete` signal stops this from running again.
  - The interceptor adds `Authorization: Bearer <token>` to every request except `/auth/login`. On a 401 it clears auth state and redirects to `/login?sessionExpired=true`.
  - `logout()` is local only: it clears the token and navigates to `/login`.
- **Third-party UI**: icons come from `lucide-angular`, which needs each icon imported by name in the component. ISBN barcode scanning uses `@zxing/ngx-scanner` in `add-book-modal`.
- **Styles**: SCSS. The component style budget is 6kB warning / 12kB error (`angular.json`). It applies to the `production` and `dev` builds (so CI deploys fail too), not to `development`.
