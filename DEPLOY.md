# Deploying Krio Griot to Hostinger

Deployment is a **zip upload through hPanel**. There is no automated pipeline,
and that is deliberate — see "Why there is no CI deploy" below.

## How to deploy

1. Build a zip whose **single top-level folder is `kriogriot-main`**, containing
   the repo minus `node_modules`, `.git`, `.env`, and `uploads`. The folder name
   matters: it becomes the app's Root directory in hPanel.

   From a clean checkout on Windows:

   ```powershell
   $stage = "$env:TEMP\kriogriot-main"
   Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
   robocopy . $stage /E /XD node_modules .git .claude mysql-export uploads /XF .env
   Compress-Archive -Path $stage -DestinationPath "$env:TEMP\kriogriot-main.zip" -Force
   ```

2. hPanel → your site → **Deployments** → **Redeploy** → upload the zip.

3. Confirm on the Dashboard that **Root directory** still reads `kriogriot-main`.

4. Check **Runtime logs**. A healthy boot prints:

   ```
   🌿 Krio Griot server running at http://localhost:3000
      Anthropic API key : ✓ loaded
      MySQL connection  : ✓ OK
      Upload directory  : /home/u106934582/domains/kriogriot.com/media
   ```

   If the upload directory shows a path containing `hbuilds/versions/`, then
   `UPLOAD_DIR` is not set — fix that before anyone uploads anything (see below).

Restarting without redeploying: Dashboard → the green **Running** pill → **Restart**.

## Configuration lives in hPanel, not in a file

There is no `.env` on the server. Everything is set in
hPanel → **Environment variables**:

| Variable | Notes |
|---|---|
| `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` | Host is `127.0.0.1`, database `u106934582_kriogriot` |
| `ANTHROPIC_API_KEY` | Archive Scanner, Research Agent, and chat all fail without a valid key |
| `ADMIN_KEY` | Required to create accounts; registration is invite-only |
| `JWT_SECRET` | **Must be set.** Unset falls back to a constant that is committed to this public repo, letting anyone forge a login token |
| `UPLOAD_DIR` | **Must be set** to `/home/u106934582/domains/kriogriot.com/media` |
| `SMTP_*` | Resend, used for welcome and password-reset mail |
| `GEDCOM_OWNER_USER_ID` | Optional. The one account allowed to see the bundled GEDCOM tree |

### Why `UPLOAD_DIR` matters

Hostinger runs the app out of a per-deploy folder:
`domains/kriogriot.com/hbuilds/versions/<uuid>/nodejs/`. A new `<uuid>` is created
on every deploy. Anything written inside it — including the default `uploads`
folder — is stranded the next time you deploy. `UPLOAD_DIR` points uploads at a
stable path outside `hbuilds` so scans survive.

## Why there is no CI deploy

A GitHub Actions FTP workflow used to live at `.github/workflows/deploy.yml`. It
reported success on every run while never affecting the live site, because FTP
writes to `domains/kriogriot.com/nodejs/` and the app runs from
`hbuilds/versions/<uuid>/nodejs/`. Only Hostinger's own zip deploy creates a
version folder, so FTP structurally cannot reach the running app.

It was deleted rather than left green and lying. If you want real automation
later, the route is Hostinger's deploy API — not FTP.

## Known environment quirks

- **Node 18.x runs in production** even though `package.json` asks for `>=20`.
  Related: `server/index.js` opens with a `process.stdin` guard. Under
  Hostinger's process manager fd 0 cannot be opened, and `mysql2` calls
  `require('process')`, which evaluates the `stdin` getter and throws
  `open EEXIST`. That took down every database route until it was guarded.
  **Keep that block above every other require.**
- `server/gedcom-*.json` are gitignored (family PII) and must be uploaded by
  hand if the GEDCOM feature is wanted.
- The database schema comes from `server/setup-db.js`, but
  `database/mango_requests.sql` and `database/password_reset_tokens.sql` are
  separate and must be applied on their own.
