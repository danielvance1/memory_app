# Memodeum: notes for Claude

Read this first. It is the hand-off between chat sessions. README.md covers setup, deploys and the accounts API in detail; this file covers the project goals, the working agreement, conventions, and what to do next.

## What the product is

Memodeum (memodeum.com) is a **mobile-first web app** that trains people to memorize long digit sequences using a mental-map technique. The owner, Daniel Vance (GitHub `danielvance1`), is a self-described beginner on backend code and wants it explained. He mentioned this project to his future Amazon manager, so finishing it matters more than his other side projects.

### The three critical features (all still to build)

1. **Codes.** A user saves "codes": a group of digits paired with text or an image. Groups are 1, 2 or 3 digits and may be expanded later. Users need a screen listing their own codes (**this is the next task**).
2. **Code drills.** Timed drills in both directions (digits to text, text to digits), with progress tracking.
3. **Memory drills.** Random digit sequences.
   - *Assisted mode:* the digits are split into the user's codes, with a "Show text" button.
   - *Unassisted mode:* digits only.
   - *Scoring:* correct digits within a time frame. A round with errors above a threshold is invalidated, to stop guessing.

Lower priority: email verification (Resend, free tier; explicitly deferred but the schema leaves room: `users.email_verified_at`), password reset, PWA manifest, and an MCP server **last**.

## Working agreement (important)

- Claude writes code and opens pull requests. **Daniel reviews and merges, and does every account-side step himself** (servers, DNS, GitHub secrets, settings). Do not ask him to hand-copy files. Give him exact steps for anything only he can do.
- Branches: feature branch, then a PR into `main`. Merging `main` into `rel` deploys to memodeum.com via GitHub Actions. Never push to `main` or `rel` directly.
- When explaining code to Daniel: show it in chunks (not strictly line by line), then say what each chunk does, including the syntax.
- Verify before claiming done. Past work was checked with integration tests, mutation ("sabotage") checks that the tests actually fail when a rule is broken, the real Docker image, and a real-browser walkthrough at phone size.
- End commits with the attribution trailers the session gives you.

## Stack and conventions

- **TypeScript everywhere, never plain JS.** Node 22. Server: Express 5, `pg` with hand-written parameterized SQL (no ORM), node-pg-migrate (plain `.sql` migrations in `server/migrations/`, `-- Up Migration` / `-- Down Migration`; they run automatically at server start). Client: React 19, Vite, Tailwind 4, react-router.
- Database: Postgres. Auth is hand-rolled on purpose: argon2id passwords, cookie sessions (random token, only its SHA-256 stored), no JWT.
- Server CommonJS output; node-pg-migrate is ESM-only so it is loaded with a dynamic `import()`.
- Every `/api/...` response is `Cache-Control: no-store`. Unknown `/api` paths return a JSON 404.
- Protect routes with `requireAuth` / `requireAdmin` (`server/src/auth/middleware.ts`); the logged-in user is `req.user`. **Always scope data queries by `req.user.id`** so people only see their own codes and drills.
- New tables: add a new migration file; never edit an old one.
- Mobile first, always: tap targets at least 44px (`min-h-11`/`min-h-12`), inputs at least 16px (stops iOS zoom), no sideways page scrolling down to 320px wide, `100dvh`, safe-area insets. Shared styles: `client/src/components/ui.ts`; form fields: `TextField`.
- Client talks to the server only through `client/src/api.ts` (`api<T>()`, `ApiError` with `field`/`code`); login state is `useAuth()` from `client/src/auth.tsx`. Pages live in `client/src/pages/`, routes in `client/src/App.tsx`, the frame (title and account bar) in `components/Layout.tsx`.
- Tests: `cd server && npm test` needs `TEST_DATABASE_URL` pointing at a throwaway Postgres (tests empty its tables). CI runs server typecheck/build, server tests against real Postgres, client typecheck/build, and a Docker smoke test.

## Where things stand (as of 2026-10-29)

- Live at memodeum.com: header page only, until the auth PRs below are merged and `main` is merged into `rel`.
- **PR #4** `feature/auth-backend`: accounts API (signup, login, logout, /me), sessions, 500-user hard cap, rate limits, admin user list API, `make-admin` script.
- **PR #5** `feature/auth-screens`: login, signup and admin-grid screens, account bar. Stacked on #4 (merge #4 first). This PR also adds this file.
- Admin is created only with the server script (`docker compose exec app node server/dist/scripts/make-admin.js <username-or-email>` in `~/memodeum` on the VPS), never through the website.
- Hosting: IONOS VPS (Ubuntu 24.04), Docker Compose (Postgres 16, app, Caddy with automatic HTTPS), Porkbun domain. See README.

If #4/#5 are not merged when you start, check with `gh api repos/danielvance1/memory_app/pulls` and ask Daniel before building on unmerged code; branch from `feature/auth-screens` if he says to go ahead.

## Next task: the "Codes" tab

Goal: a logged-in user can see, add, edit and delete their codes.

Suggested shape (confirm anything unclear with Daniel in one short question, then build):
- Migration: `codes` table with `id`, `user_id` (FK to users, ON DELETE CASCADE), `digits` (text of 1 to 3 digits, CHECK `^[0-9]{1,3}$`), `text` (nullable), `image` (see below), timestamps, and a unique index on `(user_id, digits)`.
- API under `/api/codes` (requireAuth, scoped to `req.user.id`): list, create, update, delete, with validation and tests (including "user A cannot see or change user B's codes").
- Client: a "Codes" nav link, a list page (mobile-first), and add/edit forms.
- Open question for Daniel: how images are stored (upload to the VPS disk vs. an image link). The default of text-only first, images in a follow-up PR, keeps the first PR small.
- Also ask whether to allow codes of different lengths for the same starting digits (for example "1", "12", "123"); the unique index above allows it.

Also pending: the deploy workflow's final health check can show a false red X on a first deploy while Caddy obtains its certificate; making it retry longer is a small improvement.
