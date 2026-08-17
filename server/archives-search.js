// External archive search integrations
// Sources: NARA Catalog, Slave Voyages, Enslaved.org

const NARA_BASE = 'https://catalog.archives.gov/api/v2';
const SLAVEVOYAGES_BASE = 'https://www.slavevoyages.org/voyage/api';
const ENSLAVED_SPARQL = 'https://api.enslaved.org/sparql';

// ── NARA Catalog ───────────────────────────────────────────────────────────────
async function searchNARA(query, { limit = 10 } = {}) {
  const params = new URLSearchParams({
    q: query,
    resultTypes: 'description',
    rows: limit,
    offset: 0,
    levelOfDescription: 'item,fileUnit,series',
  });

  // Focus on records relevant to African American genealogy
  const url = `${NARA_BASE}/records?${params}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`NARA API error: ${res.status}`);
  const data = await res.json();

  const hits = (data.body?.hits?.hits || []);
  return hits.map(hit => {
    const src = hit._source || {};
    const desc = src.description || {};
    return {
      source: 'NARA',
      sourceLabel: 'National Archives (NARA)',
      id: src.naId || hit._id,
      title: desc.title || src.title || 'Untitled Record',
      date: desc.coverageDates?.proposableQualifiedDateRange?.gte || desc.inclusiveDates || null,
      recordGroup: desc.parentSeries?.title || desc.parentFileUnit?.title || null,
      description: desc.scopeAndContentNote || null,
      url: src.naId ? `https://catalog.archives.gov/id/${src.naId}` : null,
      thumbnailUrl: (src.objects?.[0]?.file?.url) || null,
    };
  });
}

// ── Slave Voyages ──────────────────────────────────────────────────────────────
async function searchSlaveVoyages(query, { limit = 10 } = {}) {
  // Search the Trans-Atlantic Slave Trade database
  const params = new URLSearchParams({
    search_query: query,
    format: 'json',
    length: limit,
    start: 0,
  });

  const url = `${SLAVEVOYAGES_BASE}?${params}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Slave Voyages API error: ${res.status}`);
  const data = await res.json();

  const results = data.data || data.results || [];
  return results.map(r => ({
    source: 'SlaveVoyages',
    sourceLabel: 'Slave Voyages Database',
    id: String(r.id || r.voyage_id || ''),
    title: `Voyage ${r.voyage_id || r.id || ''} — ${r.ship_name || r.vessel_name || 'Unknown vessel'}`,
    date: r.year_of_arrival || r.voyage_dates?.imp_arrival_at_port_of_dis_sparsedate || null,
    origin: r.place_of_purchase || r.embarkation_port || null,
    destination: r.place_of_landing || r.disembarkation_port || null,
    captives: r.total_embarked || r.imp_total_num_slaves_embarked || null,
    url: r.id ? `https://www.slavevoyages.org/voyage/${r.id}/variables` : null,
  }));
}

// ── Enslaved.org SPARQL ────────────────────────────────────────────────────────
async function searchEnslaved(query, { limit = 10 } = {}) {
  const safeName = query.replace(/['"\\]/g, ' ').trim();

  const sparql = `
    PREFIX schema: <https://schema.org/>
    PREFIX enslaved: <http://enslaved.org/ontology/>
    SELECT DISTINCT ?person ?name ?role ?date ?source WHERE {
      ?person a schema:Person ;
              schema:name ?name .
      OPTIONAL { ?person enslaved:role ?role }
      OPTIONAL { ?person schema:birthDate ?date }
      OPTIONAL { ?person schema:isPartOf ?source }
      FILTER(CONTAINS(LCASE(STR(?name)), LCASE("${safeName}")))
    }
    LIMIT ${limit}
  `;

  const res = await fetch(ENSLAVED_SPARQL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/sparql-query',
      'Accept': 'application/sparql-results+json',
    },
    body: sparql,
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Enslaved.org API error: ${res.status}`);
  const data = await res.json();

  return (data.results?.bindings || []).map(b => ({
    source: 'Enslaved',
    sourceLabel: 'Enslaved.org',
    id: b.person?.value || '',
    title: b.name?.value || 'Unknown person',
    role: b.role?.value || null,
    date: b.date?.value || null,
    dataset: b.source?.value || null,
    url: b.person?.value || null,
  }));
}

// ── Fan-out search across all sources ─────────────────────────────────────────
async function searchAllArchives(query, options = {}) {
  const results = { nara: [], slaveVoyages: [], enslaved: [], errors: [] };

  await Promise.allSettled([
    searchNARA(query, options).then(r => { results.nara = r; }),
    searchSlaveVoyages(query, options).then(r => { results.slaveVoyages = r; }),
    searchEnslaved(query, options).then(r => { results.enslaved = r; }),
  ].map(p => p.catch(err => { results.errors.push(err.message); })));

  return results;
}

module.exports = { searchAllArchives, searchNARA, searchSlaveVoyages, searchEnslaved };
