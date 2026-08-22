// External archive search integrations.
//
// Status (verified 2026-08-21):
//   NARA        — working contract, but requires an API key. Request one by
//                 emailing Catalog_API@nara.gov, then set NARA_API_KEY. Without
//                 the key the catalog host returns its web-app HTML, not JSON.
//   SlaveVoyages— the old www.slavevoyages.org/voyage/api endpoint is gone. The
//                 project moved to a POST-based microservice (api.slavevoyages.org).
//                 Left disabled until the new request/response contract is wired
//                 and tested against the live host.
//   Enslaved.org— WORKING. Public SPARQL was retired, but the site is now a
//                 Wikibase and its MediaWiki wbsearchentities API is open. We
//                 search people by name there. No key required.
//
// Each source is guarded so one being unavailable never breaks the others, and
// the response tells the client exactly which sources ran and which were skipped.

const NARA_BASE = 'https://catalog.archives.gov/api/v2';

// ── NARA Catalog ───────────────────────────────────────────────────────────────
async function searchNARA(query, { limit = 10 } = {}) {
  const apiKey = process.env.NARA_API_KEY;
  if (!apiKey) {
    const err = new Error('NARA search is not configured (NARA_API_KEY missing).');
    err.skipped = true;
    throw err;
  }

  const params = new URLSearchParams({ q: query, limit: String(limit), offset: '0' });
  const res = await fetch(`${NARA_BASE}/records/search?${params}`, {
    headers: { 'Accept': 'application/json', 'x-api-key': apiKey },
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) throw new Error(`NARA API error: ${res.status}`);

  // If the key is wrong the catalog serves its SPA HTML with a 200; guard for that.
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('json')) throw new Error('NARA returned non-JSON (check NARA_API_KEY).');

  const data = await res.json();
  const hits = data.body?.hits?.hits || [];
  return hits.map(hit => {
    const rec = hit._source?.record || {};
    const digital = rec.digitalObjects?.[0] || {};
    return {
      source:      'NARA',
      sourceLabel: 'National Archives (NARA)',
      id:          String(rec.naId || hit._id || ''),
      title:       rec.title || 'Untitled Record',
      date:        rec.productionDates?.[0]?.logicalDate || rec.coverageDates?.[0]?.logicalDate || null,
      level:       rec.levelOfDescription || null,
      description: rec.scopeAndContentNote || null,
      url:         rec.naId ? `https://catalog.archives.gov/id/${rec.naId}` : null,
      thumbnailUrl: digital.objectUrl || digital.thumbnailUrl || null,
    };
  });
}

// ── SlaveVoyages (disabled — see header note) ────────────────────────────────
async function searchSlaveVoyages() {
  const err = new Error('SlaveVoyages search is temporarily unavailable (API migrated).');
  err.skipped = true;
  throw err;
}

// ── Enslaved.org (Wikibase MediaWiki API) ────────────────────────────────────
const ENSLAVED_API = 'https://lod.enslaved.org/w/api.php';

async function searchEnslaved(query, { limit = 10 } = {}) {
  const params = new URLSearchParams({
    action: 'wbsearchentities',
    search: query,
    language: 'en',
    uselang: 'en',
    format: 'json',
    type: 'item',
    limit: String(limit),
  });
  const res = await fetch(`${ENSLAVED_API}?${params}`, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Enslaved.org API error: ${res.status}`);

  const data = await res.json();
  return (data.search || []).map(item => ({
    source:      'Enslaved',
    sourceLabel: 'Enslaved.org',
    id:          item.id || '',
    title:       item.label || 'Unknown person',
    // Enslaved uses the description slot for the source record id (e.g. LSD-PER-…),
    // which tells the researcher which dataset the person comes from.
    recordId:    item.description || null,
    url:         item.url || item.concepturi || null,
  }));
}

// ── Fan-out across all sources ────────────────────────────────────────────────
async function searchAllArchives(query, options = {}) {
  const out = { nara: [], slaveVoyages: [], enslaved: [], sources: {}, errors: [] };

  const run = async (key, label, fn) => {
    try {
      const rows = await fn(query, options);
      out[key] = rows;
      out.sources[key] = { label, status: 'ok', count: rows.length };
    } catch (err) {
      out.sources[key] = { label, status: err.skipped ? 'unavailable' : 'error', message: err.message };
      if (!err.skipped) out.errors.push(`${label}: ${err.message}`);
    }
  };

  await Promise.all([
    run('nara',         'National Archives (NARA)', searchNARA),
    run('slaveVoyages', 'SlaveVoyages',             searchSlaveVoyages),
    run('enslaved',     'Enslaved.org',             searchEnslaved),
  ]);

  return out;
}

module.exports = { searchAllArchives, searchNARA, searchSlaveVoyages, searchEnslaved };
