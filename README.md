# Memodeum

A web app that trains people to memorize long sequences of numbers using the
mental-map technique: each group of digits is mapped to an image you define,
and you drill those mappings until recalling a long number is easy.

Planned core features:

1. **Codes**: save your own digit-group-to-image mappings (1, 2, or 3 digits).
2. **Code drills**: timed drills in both directions (digits to text, text to digits).
3. **Memory drills**: memorize a random sequence and re-enter it, with an
   assisted mode that splits digits into codes and can reveal the text.

Mobile-first, hosted at <https://memodeum.com>.

## Stack

| Part | Technology |
| --- | --- |
| API | Node 22, TypeScript, Express 5, `pg` (hand-written SQL, no ORM), `node-pg-migrate` for the schema, argon2id password hashing |
| Database | PostgreSQL 16 |
| Web app | React 19, TypeScript, Tailwind CSS 4, built with Vite |
| Hosting | One small VPS running Docker Compose, with Caddy for automatic HTTPS |
| CI/CD | GitHub Actions |

## Repo layout

```
server/       API (src/ -> compiled to dist/)
client/       React app (built to client/dist, which the API serves in production)
deploy/       Production compose file, Caddyfile, and the on-server deploy script
Dockerfile    Builds one image containing the API and the built client
.github/      CI (checks every PR) and Deploy (runs on push to `rel`)
```

## Local development

You need Node 22 and Docker (for the local database).

```bash
# 1. Start a local database
docker compose -f docker-compose.dev.yml up -d

# 2. API (http://localhost:3000)
cd server
cp .env.example .env
npm install
npm run dev

# 3. Web app (http://localhost:5173), in a second terminal
cd client
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to the API, so the web app on
`:5173` talks to the API on `:3000` with no extra setup.

The API creates its database tables itself when it starts (see
`server/migrations/`), so there is no separate setup step for the database.

Checks that CI runs (run them yourself before pushing):

```bash
cd server && npm run typecheck && npm run build
cd client && npm run build   # typechecks, then builds

# Server tests need a separate throwaway database (the tests empty its tables).
# Create it once, then run them:
docker compose -f docker-compose.dev.yml exec db createdb -U memodeum memodeum_test
cd server
TEST_DATABASE_URL=postgres://memodeum:devpassword@localhost:5432/memodeum_test npm test
```

## Accounts

Sign up and log in with a username or an email (either works at login). Logins
are cookie sessions: the browser holds a random token, the database holds only
a hash of it, and logging out ends the session on the server.

Safety limits, all in `server/src/config.ts` and overridable with environment
variables (see `server/.env.example`):

| Limit | Default | What it protects against |
| --- | --- | --- |
| `MAX_USERS` | 500 | Hard cap on total accounts. Once reached, sign-ups are refused. |
| `SIGNUPS_PER_HOUR_PER_IP` | 5 | One address creating accounts in bulk (and filling the cap). |
| `FAILED_LOGINS_PER_IP` | 10 per 15 min | Password guessing from one address. |
| `FAILED_LOGINS_PER_ACCOUNT` | 20 per 15 min | Password guessing against one account from many addresses. |

To change the cap on the live site, add `MAX_USERS=<number>` to `~/memodeum/.env`
on the server and run `docker compose up -d` there.

There is no email verification or password reset yet (the `users` table already
has an `email_verified_at` column for it). A forgotten password currently needs
a manual fix in the database.

### Admins

Admins can see everyone's username, email, and last login (`GET /api/admin/users`;
the admin page on the site is coming next). There is deliberately no way to become
an admin through the website. Run this on the server, in `~/memodeum`:

```bash
docker compose exec app node server/dist/scripts/make-admin.js <username-or-email>
docker compose exec app node server/dist/scripts/make-admin.js <username-or-email> --remove
```

## Branches and deploying

- Work happens on feature branches and lands on **`main`** through pull requests.
  CI runs on every PR: typecheck + build for both halves, the server tests against
  a real Postgres, plus a test that builds the production Docker image, boots it,
  and signs up a user in it.
- **Pushing to `rel` deploys to <https://memodeum.com>.** To release, merge `main`
  into `rel` (for example, open a PR from `main` into `rel`, or
  `git push origin main:rel` for a fast-forward).
- **Default release flow (Claude does all of this, nobody needs to click merge):**
  1. Open a PR from the feature branch into `main`.
  2. Wait for CI on that PR to pass, then merge it into `main`.
  3. Open a PR from `main` into `rel`.
  4. Wait for CI on that PR to pass, then merge it into `rel`. That deploys.
  5. Watch the Deploy workflow and confirm it finishes green.

  If CI fails at any stage, stop, fix it, and don't merge. Nothing is ever pushed
  straight to `main` or `rel`; both only change through PRs.

What a deploy does (`.github/workflows/deploy.yml`):

1. Builds the production image on GitHub's runner.
2. Copies the image and the `deploy/` files to the server over SSH.
3. Runs `deploy/remote-deploy.sh` there, which starts the new app container and
   waits for its health check to pass.
4. Checks that `https://memodeum.com/api/health` answers.

### One-time setup

Repository secrets (Settings, Secrets and variables, Actions):

| Secret | Value |
| --- | --- |
| `SERVER_HOST` | the server's IP address |
| `SERVER_USER` | the login user on the server (`deploy`) |
| `SSH_PRIVATE_KEY` | the full private key GitHub should use to log in as that user |

The server needs Docker installed, that user in the `docker` group, ports 80 and
443 open, and DNS for `memodeum.com` and `www.memodeum.com` pointing at it.
The first deploy creates `~/memodeum/.env` on the server with a randomly
generated database password; the password is never stored in this repo.

### Handy server commands

Run these on the server in `~/memodeum`:

```bash
docker compose ps                 # what's running
docker compose logs -f app        # follow the app's logs
docker images memodeum-app        # previous releases kept for rollback
IMAGE_TAG=<old-tag> docker compose up -d   # roll back to an earlier release
```

## Not built yet

Email verification and password reset, the database tables and screens for codes
and drills (the three core features above), a PWA manifest, and the MCP server.
The site has the header, login, signup, and the admin user grid;
`GET /api/health` reports whether the server and database are up.

Working on this repo with Claude? Start from [CLAUDE.md](CLAUDE.md).
