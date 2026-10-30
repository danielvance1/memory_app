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

- Claude writes code, opens pull requests, **and merges them itself, all the way to production** (Daniel's standing instruction as of 2026-10-29; he knows a merge to `rel` redeploys the live server). **Daniel does every account-side step himself** (servers, DNS, GitHub secrets, settings). Do not ask him to hand-copy files. Give him exact steps for anything only he can do.
- Release flow, every time, unless Daniel says otherwise for a specific change:
  1. Feature branch, then open a PR into `main`.
  2. Wait for CI on that PR to pass, then merge it into `main`.
  3. Open a PR from `main` into `rel`.
  4. Wait for CI on that PR to pass, then merge it into `rel`. That deploys to memodeum.com via GitHub Actions.
  5. Watch the Deploy workflow and confirm it finishes green, then tell Daniel.
  - If CI fails at any stage, stop, fix it, and don't merge. Never push to `main` or `rel` directly; they only change through PRs.
  - GitHub GraphQL is blocked in Claude sessions, so `gh pr create`/`gh pr merge`/`gh pr checks` fail. Use the REST API (`gh api repos/danielvance1/memory_app/pulls ...`, `PUT .../pulls/N/merge`, `.../commits/SHA/check-runs`).
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
- Colors: shared colors live in `client/src/theme.css` as Tailwind `@theme` tokens named by role (`accent`, `tile`, `muted` give `bg-accent`, `text-tile`, `text-muted`...). Use these in new work instead of raw Tailwind colors. Only `CodeComponent` uses them so far; the rest of the app (backgrounds, buttons, tabs, forms) will move over piece by piece, only when Daniel asks. Reusable pieces so far: `CodeComponent`, `TypedText` (types text out character by character).
- Client talks to the server only through `client/src/api.ts` (`api<T>()`, `ApiError` with `field`/`code`); login state is `useAuth()` from `client/src/auth.tsx`. Pages live in `client/src/pages/`, routes in `client/src/App.tsx`, the frame (title and account bar) in `components/Layout.tsx`.
- Tests: `cd server && npm test` needs `TEST_DATABASE_URL` pointing at a throwaway Postgres (tests empty its tables). `cd client && npm test` runs Vitest unit tests for plain logic (the drill's trie and typing rules, in `client/src/drill/`). CI runs server typecheck/build, server tests against real Postgres, client tests + typecheck/build, and a Docker smoke test.

## Where things stand (as of 2026-10-29)

- Merged to `main`: the accounts API (signup, login, logout, /me), sessions, the 500-user hard cap, rate limits, the admin user list API, the `make-admin` script, and the login, signup and admin-grid screens with the account bar. Claude merges `main` into `rel` to deploy (see the release flow above).
- **Codes tab, built:**
  - `users.code_system` (1, 2 or 3 digits per code, default 1) with `PUT /api/me/code-system`; `codeSystem` is part of the user object.
  - `codes` table (`id`, `user_id`, `code` text of 1-3 digits, `text` up to 200 chars, no leading/trailing whitespace). Unique per user on `code`, and on `lower(text)` for non-blank text only (blank rows may repeat). Rows are created only when a user sets a code and are **never deleted by the app** (clearing blanks the text; switching systems leaves other-system rows alone; only deleting the account cascades).
  - API: `GET /api/codes` (all of the user's rows) and `PUT /api/codes/:code` `{ text }` (trims; blank never creates a row; code must fit the user's system; 409 names the code already using that text). There is deliberately no DELETE.
  - Client: `codes.tsx` (`useCodes()`: loaded once after login; "set" = row exists and text not blank), `toast.tsx` (`useToast()`), `CodesGate` (waits for codes). Edit sub-tab (`/codes/edit`, `?code=42` opens the editor, autofilled for set codes; Cancel only asks "Discard what you typed?" when the text differs from what loaded) and All Codes sub-tab (grids by system, lazily drawn, set tiles drawn as set, tiles open the editor).
- **Drill sub-tab, built (first draft):** `/codes/drill` with a mode switch. "Code → Description" works: a random set code (only codes set and within the user's current system) is shown, the box only accepts letters continuing its saved text (case-insensitive, whitespace squeezed to one space), and it scores as soon as the typed start belongs to that text alone (trie in `client/src/drill/trie.ts`) or the full text is typed; 60-second round, then score + Try again. On a score, confetti flies out of the tile (`components/Celebration.tsx`, pieces made by `drill/celebration.ts`; people with reduced-motion get a brief brightening instead, never a shake, which looked like "wrong") and the full correct answer ("Correct! Code 5: Big Dog Today", original capitals kept) shows above the tile until the next score; it is hidden if the same code comes up again, since it would give the answer away. Nothing is saved yet. "Description → Code" shows "Under construction".
- Admin is created only with the server script (`docker compose exec app node server/dist/scripts/make-admin.js <username-or-email>` in `~/memodeum` on the VPS), never through the website.
- Hosting: IONOS VPS (Ubuntu 24.04), Docker Compose (Postgres 16, app, Caddy with automatic HTTPS), Porkbun domain. See README.
- Run `git log --oneline -10` and check open PRs (`gh api repos/danielvance1/memory_app/pulls`) to confirm nothing has changed since this was written.

## Next tasks

- Images for codes (open question for Daniel: upload to the VPS disk vs. an image link; text-only is done).
- Drill: build "Description → Code" (the reverse game, same rules); decide whether to save scores / show progress (needs a table).
- Memory drills (see "The three critical features").
- Known small gap: the "Discard what you typed?" confirmation only covers the Cancel button; leaving via a tab or the browser Back button drops unsaved text silently. Switching the code system while editing a code outside the new system closes the editor.

Also pending: the deploy workflow's final health check can show a false red X on a first deploy while Caddy obtains its certificate; making it retry longer is a small improvement.
