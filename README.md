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
| API | Node 22, TypeScript, Express 5, `pg` (hand-written SQL, no ORM) |
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

Checks that CI runs (run them yourself before pushing):

```bash
cd server && npm run typecheck && npm run build
cd client && npm run build   # typechecks, then builds
```

## Branches and deploying

- Work happens on feature branches and lands on **`main`** through pull requests.
  CI runs on every PR: typecheck + build for both halves, plus a test that builds
  the production Docker image and boots it against a real Postgres.
- **Pushing to `rel` deploys to <https://memodeum.com>.** To release, merge `main`
  into `rel` (for example, open a PR from `main` into `rel`, or
  `git push origin main:rel` for a fast-forward).

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

Accounts and email confirmation, the database schema (codes, drills), the three
core features above, and a PWA manifest. The site currently shows just the
Memodeum header; `GET /api/health` reports whether the server and database are up.
