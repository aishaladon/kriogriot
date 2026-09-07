# Mirroring uploads to the NAS over FTPS

Supersedes the nightly-rsync approach in `NAS-SYNC.md`. Instead of the NAS
pulling from Hostinger once a night, the app itself pushes each file to the
NAS over FTPS the moment it's uploaded — Archive Scanner images, person
photos, and source files all go through the same code path
(`server/nas-ftp.js`, called from the three `/api/upload-*` routes in
`server/index.js`).

This is best-effort by design, same philosophy as the old doc: the site's own
copy on Hostinger is always the copy of record. If the NAS is off,
unreachable, or the env vars below aren't set, the upload still succeeds —
the NAS push is attempted after the response is already sent, and any
failure is logged, never surfaced to the user.

Failures are written both to Hostinger's runtime logs (`NAS FTPS push failed
for …`) and to a persistent file, `_nas-sync-log.txt`, saved inside
`UPLOAD_DIR` — the same stable folder the uploads themselves live in, so the
failure history survives redeploys the same way the files do. Successes are
not logged there, only failures — check the file, and an empty or missing
one means every push has succeeded (or none has been attempted yet).

## 1. On the Synology — expose FTPS

Control Panel → **File Services** → **FTP**:

- Enable FTP service, and enable **FTP over TLS/SSL (Explicit)** — plain FTP
  or implicit-only won't work with this setup (`secure: true` in the code
  means explicit FTPS).
- Note the **Passive Mode port range** shown there (e.g. 55536–55545). This
  range has to be forwarded on your router in addition to the control port,
  or transfers will connect and then hang — the single most common way this
  kind of setup silently fails.

Control Panel → **Shared Folder**, or reuse an existing one, and give the FTP
user read/write access to it. This shared folder's path is the FTP root —
`NAS_FTP_BASE_DIR` is relative to it, not to `/volume1/...`.

Control Panel → **User & Group** → create a **dedicated account** for this
(don't reuse your own admin login) — e.g. `krio-griot-uploader` — scoped to
only that shared folder.

## 2. On your router — port-forward

Forward, to the NAS's LAN address:

- The FTPS control port (you're using **277** externally — check what it
  maps to internally; Synology's default FTP control port is 21).
- The full passive-mode port range from Step 1.

Confirm the public hostname resolves and the port is reachable from outside
your network before wiring up hPanel — a port-forward that only works on the
LAN will fail exactly the same way as no port-forward at all.

## 3. In hPanel → Environment variables

| Variable | Value |
|---|---|
| `NAS_FTP_HOST` | `LegacyArchives.synology.me` |
| `NAS_FTP_PORT` | `277` |
| `NAS_FTP_USER` | the dedicated FTP account's username |
| `NAS_FTP_PASSWORD` | its password |
| `NAS_FTP_BASE_DIR` | the FTP-root-relative path files should land under (default `/site-media` if unset) |

Restart the app after adding these. Files will arrive under
`<NAS_FTP_BASE_DIR>/u<accountId>/archives|people|sources/...` — same
per-account layout the site already uses under `UPLOAD_DIR`.

## Verifying it's actually working

Upload one Archive Scanner image, then check `_nas-sync-log.txt` inside
`UPLOAD_DIR` (or Hostinger's **Runtime logs**, which get the same message):

- No new line for that upload → it landed on the NAS. Confirm the file
  itself in File Station under the shared folder.
- A new `FAILED u<id>/archives/<file> — <reason>` line → read the reason.
  Common ones: `ECONNREFUSED`/timeout (port-forward or passive-range
  problem), `530` (wrong username/password), `550` (FTP user lacks write
  permission on that folder).

Startup also logs a warning if the env vars aren't set at all —
`NAS FTPS not configured (...) — uploads will not be mirrored to the NAS.`
If you don't see that line, the app thinks it's configured; if uploads still
aren't showing up on the NAS, it's a connectivity or permissions problem,
not a missing-config one.
