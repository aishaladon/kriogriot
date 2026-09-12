# Known issues

Found by exercising every route on the live site directly — a fresh test
account, real API calls, real infrastructure — not inferred from reading the
code. See `KRIO-GRIOT-MISSION-HANDOFF.md` and `CLAUDE.md` for why this
matters: prior sessions have claimed things worked when they didn't.

Audited 2026-09-07 against `claude/kriogriot-hostinger-migration-kqzy38`
(the branch actually deployed).

Also published as an artifact for easier browsing: https://claude.ai/code/artifact/06a7e26a-6c7e-4831-98bd-abfd6213c834

## Open

### Merge Ancestors does nothing (correctness)
`POST /api/merge-ancestors` (`server/index.js`) is a complete stub — it
always returns `{ok:true, merged:{}}` regardless of input. No fields are
combined, no related questions/sources/DNA/archives/collections/tree
connections move to the surviving record, and the duplicate is never
removed. The response is indistinguishable from a real success. Needs real
design (how field conflicts resolve, which linked tables get reassigned)
before it's a quick fix.

### NAS mirror times out intermittently (reliability)
The FTPS push to the Synology (`server/nas.js`) was confirmed working on
port 21, then failed on the very next real upload with
`Timeout (control socket)`. Local storage is unaffected — uploads still
succeed — but the NAS copy isn't landing reliably. Cause unconfirmed:
router port-forward dropping under load, or the NAS going briefly
unreachable. Watch `_nas-sync-log.txt` for a pattern before assuming it's
resolved.

### Deleting a record leaves its file behind (data hygiene)
Deleting an Archives, People, or Sources row only removes the database
row — the uploaded file stays on disk (and on the NAS, once that mirror is
reliable). Applies to all three upload types. Storage grows quietly with
orphaned files nothing points to.

### Stale diagnostic row in production (housekeeping)
`mango_requests` id 3, `claude-diagnostic-DELETE-ME@kriogriot.com`, dated
2026-08-21 — left by a prior session, self-labeled for deletion, never
deleted.

### This session's test account needs manual cleanup (housekeeping)
`claude-feature-test@kriogriot.com` (user id 16), registered to exercise
every feature against real infrastructure. All of its test records were
deleted during testing; the account itself and one 68-byte test image
remain — there's no self-delete-account route to remove them by API.

## Resolved this session

- **Mango leads readable by any logged-in account.** `GET`/`PATCH
  /api/mango` had no admin check — any registered user could read or edit
  every lead's name, email, and phone. Added a fail-closed admin gate
  (`requireAdmin`, gated on `ADMIN_EMAIL`); needs that env var set in
  hPanel to restore owner access.
- **`qs` carried two moderate advisories.** Transitive via
  express/body-parser, pinned below the patched release. Forced to
  6.16.0 via an npm `overrides` entry.
- **Deploys rejected as "invalid project structure."** PowerShell's
  `Compress-Archive` wrote Windows backslashes into the zip's internal
  paths; Hostinger's Linux unzip couldn't parse it. Deploy recipe in
  `DEPLOY.md` now uses Python's `zipfile` instead.
- **Email failed with "unexpected socket close."** SMTP transport
  hardcoded plaintext-first negotiation while the configured port (465)
  needs TLS from the first byte. `secure` now follows the port.
- **Scanned images never reached the NAS.** `NAS_HOST` held an FTPS URL on
  a port Hostinger's shared hosting silently blocks outbound. Moved to
  standard port 21, which it allows.
