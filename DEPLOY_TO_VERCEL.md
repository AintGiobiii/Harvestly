# Deploying Harvestly to Vercel

## What changed vs. your Render setup

- `app.py` now reads `DATABASE_URL`, `POSTGRES_URL`, or `POSTGRES_URL_NON_POOLING`
  (whichever is set) — so it works whether you connect a Render Postgres,
  a Neon DB, or Vercel's own Postgres storage, without renaming anything.
- If no database env var is found, it now logs a clear warning instead of
  silently trying to write a local SQLite file (which is what was crashing
  every request on Vercel — the filesystem there is read-only).
- Added `/api/health` — visit it right after deploying to see immediately
  whether the app connected to the database, instead of guessing from a
  blank 500 page.
- Added `api/index.py` + `vercel.json` + `requirements.txt` so Vercel knows
  how to run a Flask app (this didn't exist before).

## 1. Push this folder to a new GitHub repo

Folder structure (already set up for you):
```
app.py
requirements.txt
vercel.json
api/index.py
templates/index.html
static/script.js
static/style.css
```
Push it as-is — don't flatten the folders.

## 2. Create the project in Vercel

1. vercel.com → **Add New... → Project** → import the new GitHub repo.
2. Framework preset: leave as **Other** (Vercel will use `vercel.json`).
3. Don't deploy yet — set up the database and env vars first (next steps),
   otherwise the first deploy will crash the same way the last one did.

## 3. Add a Postgres database (safe choice for Vercel)

In the Vercel project → **Storage** tab → **Create Database** → **Postgres**
(this is Vercel's managed Postgres, powered by Neon — a real persistent
database, unlike SQLite, and built to work with serverless functions).

After creating it, Vercel will show you a connection string. Copy it.

> If you'd rather keep using your existing Render Postgres instead of a new
> one, that also works — just copy its connection string from Render
> instead. Either is fine as long as it's a real Postgres URL, not SQLite.

## 4. Set environment variables

Project → **Settings → Environment Variables** → add these (Production,
and Preview if you want PR previews to work too):

| Key | Value |
|---|---|
| `DATABASE_URL` | the Postgres connection string from step 3 |
| `SECRET_KEY` | any long random string (reuse the same one from Render, or generate one with `python -c "import secrets; print(secrets.token_hex(32))"`) |
| `BREVO_API_KEY` | same as Render |
| `BREVO_SENDER_EMAIL` | same as Render |
| `BREVO_SENDER_NAME` | `Harvestly` |
| `ADMIN_EMAIL` | your admin login email |
| `ADMIN_PASSWORD` | a password you choose (if left unset, a random one is generated and printed once to the deploy logs) |
| `ADMIN_USERNAME` | optional, defaults to `admin` |
| `FLASK_ENV` | `production` |

Use a **different** `DATABASE_URL` than Render only if you want the two
deployments to have separate data — otherwise point both at the same
Postgres instance so Render and Vercel share one set of users/records.

## 5. Deploy

Trigger a deploy (push a commit, or click **Deploy** in Vercel). Once it's
up, visit:

```
https://<your-project>.vercel.app/api/health
```

- `{"status": "ok", "database": "connected"}` → you're good, load the
  homepage normally.
- `{"status": "error", ...}` → the response tells you the DB couldn't be
  reached; double-check `DATABASE_URL` is set exactly right (no stray
  quotes/spaces) and redeploy.

## 6. If something still fails

Run `vercel logs --request-id <id-from-the-error-page>` — with the changes
above, a bad `DATABASE_URL` now prints a clear
`CRITICAL: hindi nagawa ang db.create_all() — ...` line instead of an
opaque crash, so the actual cause should be visible right away.
