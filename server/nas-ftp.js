// Mirrors uploaded scans/photos to the Synology NAS over FTPS as each file
// arrives, instead of the nightly rsync pull described in NAS-SYNC.md (see
// NAS-FTPS.md for why and for the NAS/hPanel setup steps).
//
// This is best-effort by design: the site's own copy on Hostinger is always
// the copy of record, so a NAS that is off, unreachable, or not yet
// configured must never fail an upload. Every failure is logged and
// swallowed here — callers get a result object, never a thrown error.
const ftp  = require('basic-ftp');
const path = require('path');
const fs   = require('fs');

const NAS_HOST     = process.env.NAS_FTP_HOST;
const NAS_PORT     = process.env.NAS_FTP_PORT ? Number(process.env.NAS_FTP_PORT) : 21;
const NAS_USER     = process.env.NAS_FTP_USER;
const NAS_PASSWORD = process.env.NAS_FTP_PASSWORD;
const NAS_BASE_DIR = process.env.NAS_FTP_BASE_DIR || '/site-media';

const nasConfigured = Boolean(NAS_HOST && NAS_USER && NAS_PASSWORD);

// Lives next to the uploads themselves (same stable UPLOAD_DIR, outside the
// folder a redeploy replaces) so the failure history survives deploys same
// as the files do.
const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '../uploads');
const LOG_FILE = path.join(UPLOAD_ROOT, '_nas-sync-log.txt');

// Logging a failure must never itself throw — worst case it's silently lost.
function logFailure(remoteRelPath, reason) {
  const line = `${new Date().toISOString()} FAILED ${remoteRelPath} — ${reason}\n`;
  try {
    fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
    fs.appendFileSync(LOG_FILE, line);
  } catch (err) {
    console.warn(`Could not write to NAS sync log file: ${err.message}`);
  }
}

if (!nasConfigured) {
  console.warn('NAS FTPS not configured (set NAS_FTP_HOST / NAS_FTP_USER / NAS_FTP_PASSWORD) — uploads will not be mirrored to the NAS.');
}

// remoteRelPath is forward-slash, e.g. "u12/archives/171234-abcd.jpg".
async function pushToNAS(localPath, remoteRelPath) {
  if (!nasConfigured) {
    logFailure(remoteRelPath, 'not configured');
    return { ok: false, reason: 'not configured' };
  }

  const client = new ftp.Client(15000);
  try {
    await client.access({
      host: NAS_HOST,
      port: NAS_PORT,
      user: NAS_USER,
      password: NAS_PASSWORD,
      secure: true,
    });
    const remotePath = path.posix.join(NAS_BASE_DIR, remoteRelPath);
    await client.ensureDir(path.posix.dirname(remotePath));
    await client.uploadFrom(localPath, path.posix.basename(remotePath));
    return { ok: true };
  } catch (err) {
    console.warn(`NAS FTPS push failed for ${remoteRelPath}: ${err.message}`);
    logFailure(remoteRelPath, err.message);
    return { ok: false, reason: err.message };
  } finally {
    client.close();
  }
}

module.exports = { pushToNAS, nasConfigured, LOG_FILE };
