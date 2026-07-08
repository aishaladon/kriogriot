// ─────────────────────────────────────────────────────────────────────────────
// db-mysql.js — MySQL data layer for Krio Griot.
// Mirrors the public API of airtable.js so index.js can use it unchanged.
// Records are returned keyed by the ORIGINAL Airtable field names (incl. ★) so
// the existing client keeps working. Linked/lookup/multi fields are exposed as
// arrays (values were exported as "a; b" strings). Relationships between tables
// are resolved by NAME (the export stored names, not record IDs).
// ─────────────────────────────────────────────────────────────────────────────
let _pool = null;
function pool() {
  if (_pool) return _pool;
  const mysql = require('mysql2/promise'); // lazy: only needed when a DB call runs
  _pool = mysql.createPool({
    host:            process.env.MYSQL_HOST     || 'localhost',
    port:            Number(process.env.MYSQL_PORT || 3306),
    user:            process.env.MYSQL_USER,
    password:        process.env.MYSQL_PASSWORD,
    database:        process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_POOL || 5),
    charset:         'utf8mb4',
  });
  return _pool;
}
async function q(sql, params = []) {
  const [rows] = await pool().execute(sql, params);
  return rows;
}

// ── column-name sanitizer (must match the export/schema exactly) ──────────────
function col(name) {
  let s = String(name).trim().toLowerCase().replace(/★/g, '').trim();
  s = s.replace(/[^\w]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  if (!s) s = 'col';
  if (/^[0-9]/.test(s)) s = 'c_' + s;
  return s;
}

// ── Table constants (same as airtable.js) ─────────────────────────────────────
const TABLES = {
  PEOPLE: 'People', QUESTIONS: 'Research Questions', SOURCES: 'Sources',
  EVIDENCE: 'Evidence Analysis', DNA_TESTING: 'DNA Testing', DNA_MATCHES: 'DNA Matches',
  COLLECTIONS: 'Collections', ARCHIVES: 'Archives', DONORS: 'Donors',
  STORAGE: 'Storage', RESEARCH_LOG: 'Research Log',
};

// ── Field definitions: [Airtable field name, kind] ─────────────────────────────
//   kind: 's' string · 'n' number · 'b' bool · 'a' array (link/lookup/multi/attachment)
const SCHEMA = {
  'People': { sql: 'people', peopleCol: null, fields: [
    ['Full Name ★','s'],['Person ID','n'],['Birth Name','s'],['Also Known As','s'],['Sex','s'],
    ['Race/Ethnicity (as recorded)','s'],['Birth Date','s'],['Birth Place','s'],['Death Date','s'],
    ['Death Place','s'],['Burial Place','s'],['Generation Number','s'],['Relation to Self','s'],['Line','s'],
    ['Collections','a'],['Research Questions','a'],['DNA Tests','a'],['Ancestry Profile URL','s'],
    ['FamilySearch ID','s'],['Geni Profile URL','s'],['Photo','a'],['Notes','s'],['Sources','a'],
    ['Evidence Analysis','a'],['Name (from Collections)','a'],['Research Question (from Research Questions)','a'],
    ['Name (from DNA Tests)','a'],['DNA Matches','a'],['Archives','a'],['Donors','a'],['Research Log','a'],['Photo URL','s'],
  ]},
  'Research Questions': { sql: 'research_questions', peopleCol: 'people', fields: [
    ['Research Question ★','s'],['Question ID','n'],['Research Type','s'],['Status','s'],['Priority','s'],
    ['Date Opened','s'],['Date Resolved','s'],['Current Conclusion','s'],['Gaps Identified','s'],
    ['Conflicting Evidence','s'],['Next Action','s'],['Reasonably Exhaustive Search Done','b'],
    ['All Evidence Cited','b'],['Conflicts Resolved','b'],['Written Conclusion Exists','b'],
    ['Collections Text','s'],['Sources Consulted','s'],['Evidence Items','s'],['DNA Tests Text','s'],
    ['People','a'],['Sources','a'],['Evidence Analysis','a'],['DNA Testing','a'],['DNA Matches','a'],
    ['Has Evidence','s'],['Research Log','a'],
  ]},
  'Sources': { sql: 'sources', peopleCol: 'people_mentioned', fields: [
    ['Name ★','s'],['Source ID','n'],['Source Type','s'],['Record Type','a'],['Repository','s'],['URL','s'],
    ['Physical Location','s'],['Date of Source','s'],['Date Accessed','s'],['Full Citation','s'],
    ['Short Citation','s'],['Search Status','s'],['Search Notes','s'],['Collections','a'],['Research Questions','a'],
    ['People Mentioned','a'],['Attachments','a'],['Name (from Collections)','a'],
    ['Research Question (from Research Questions)','a'],['Full Name (from People Mentioned)','a'],
    ['Evidence Analysis','a'],['Has Citation','s'],['Research Log','a'],['Source File URL','s'],
  ]},
  'Evidence Analysis': { sql: 'evidence_analysis', peopleCol: 'people', fields: [
    ['Evidence Summary ★','s'],['Evidence ID','n'],['Sources','a'],['Research Questions','a'],['People','a'],
    ['Information Type','s'],['Transcription / Extraction','s'],['Evidence Type','s'],['Analysis','s'],
    ['Supports or Contradicts','s'],['Conflicting Evidence','a'],['Conclusion Drawn','s'],['Confidence Level','s'],
    ['Name (from Sources)','a'],['Research Question (from Research Questions)','a'],['Full Name (from People)','a'],
    ['Evidence Summary (from Conflicting Evidence)','a'],['From field: Conflicting Evidence','a'],
  ]},
  'DNA Testing': { sql: 'dna_testing', peopleCol: 'test_subject', fields: [
    ['Test Label ★','s'],['Test ID','n'],['Kit','n'],['Test Subject','a'],['Company','s'],['Test Type','s'],
    ['Date Tested','s'],['Number of Regions','n'],['Ethnicity Estimates','s'],['Haplogroup','s'],
    ['HVR1 Markers','s'],['HVR2 Markers','s'],['Total cM Shared (largest match)','n'],['Raw Data Uploaded','b'],
    ['Research Questions','a'],['Documentary Corroboration','s'],['Analysis Notes','s'],['Raw Data File','a'],
    ['DNA Matches','a'],['Is Linked','s'],['Research Question (from Research Questions)','a'],
  ]},
  'DNA Matches': { sql: 'dna_matches', peopleCol: 'linked_person_in_tree', fields: [
    ['Match Name ★','s'],['Match ID','n'],['Test','a'],['Shared cM','n'],['Shared Segments','n'],
    ['Longest Segment','n'],['Predicted Relationship','s'],['Likely Actual Relationship','s'],
    ['Possible Relationships','s'],['Linked Person in Tree','a'],['Clustering Group','s'],
    ['Correspondence Status','s'],['Correspondence Log','s'],['Last Contact','s'],['Research Question','a'],
    ['Notes','s'],['Company (from Test)','a'],['Full Name (from Linked Person in Tree)','a'],
    ['Research Question (from Research Question)','a'],['Research Log','a'],
  ]},
  'Collections': { sql: 'collections', peopleCol: 'family_names', fields: [
    ['Collection Name ★','s'],['Description','s'],['Date Established','s'],['Status','s'],['Family Names','a'],
    ['Archive Record','a'],['Sources','a'],['Research Questions Text','s'],['Digitized Files','s'],
    ['Access Restrictions','s'],['Allowed to Share Online','b'],['Donors','a'],['Name (from Archive Record)','a'],
    ['Research Question (from Research Questions)','a'],
  ]},
  'Archives': { sql: 'archives', peopleCol: 'creator', fields: [
    ['Accession Number ★','s'],['Description','s'],['Date Received','s'],['Accession Date','s'],
    ['Inclusive Dates','s'],['Formats Included','a'],['Condition','s'],['Recommended Treatments','a'],
    ['Restrictions & Access','s'],['Storage Location','a'],['Storage Type','s'],['Box/Folder Reference','s'],
    ['Archival Docs (attachment)','a'],['Collection','a'],['Donor','a'],['Creator','a'],['Bulk Dates','s'],
    ['Extent','s'],['Full Name (from Creator)','a'],['Name (from Donor)','a'],['Name (from Storage Location)','a'],
    ['Metadata Complete','s'],['Image URL','s'],['AI Metadata','s'],
  ]},
  'Donors': { sql: 'donors', peopleCol: 'person_record', fields: [
    ['Contact Name ★','s'],['Title / Role','s'],['IDInternal reference','s'],['Address','s'],['Phone','s'],
    ['Email','s'],['Collections','a'],['Archives','a'],['Person Record','a'],['Usage Agreement Signed','b'],
    ['Agreement Date','s'],['Agreement Notes','s'],['Status','s'],['Notes','s'],
    ['Collection Name (from Collections)','a'],['Full Name (from Person Record)','a'],
  ]},
  'Storage': { sql: 'storage', peopleCol: null, fields: [
    ['Location Name ★','s'],['Location Address','s'],['Location Contact','s'],['Phone','s'],['Email','s'],
    ['Type of Light','a'],['Temperature','s'],['Humidity','s'],['Climate Controlled','b'],
    ['Archives Stored Here','a'],['Storage Notes','s'],
  ]},
  'Research Log': { sql: 'research_log', peopleCol: 'person', fields: [
    ['Log Title ★','s'],['Person','a'],['Research Status','s'],['Genealogical Line','s'],['Generational Line','s'],
    ['Relationship','s'],['Research Question','a'],['Sources','a'],['Records Checklist','a'],
    ['Ancestry Profile URL','s'],['Geni.com Profile URL','s'],['DNA Matches','a'],['Notes','s'],
  ]},
};

function def(tableName) {
  const d = SCHEMA[tableName];
  if (!d) throw new Error(`Unknown table: ${tableName}`);
  return d;
}

// ── row (sql) → record (Airtable-shaped) ──────────────────────────────────────
function rowToRecord(tableName, row) {
  const d = def(tableName);
  const rec = { id: row.record_id, _createdTime: row._created_time || '' };
  for (const [field, kind] of d.fields) {
    const v = row[col(field)];
    if (v === null || v === undefined || v === '') {
      if (kind === 'a') rec[field] = [];
      continue;
    }
    if (kind === 'a')      rec[field] = String(v).split('; ').filter(Boolean);
    else if (kind === 'n') rec[field] = Number(v);
    else if (kind === 'b') rec[field] = (v === 1 || v === '1' || v === true);
    else                   rec[field] = v;
  }
  return rec;
}

// ── record fields (Airtable-shaped) → sql column map ──────────────────────────
function fieldsToColumns(tableName, fields) {
  const d = def(tableName);
  const known = new Map(d.fields.map(([f]) => [f, true]));
  const out = {};
  for (const [field, value] of Object.entries(fields)) {
    if (!known.has(field)) continue;
    let v = value;
    if (Array.isArray(v)) v = v.join('; ');
    else if (typeof v === 'boolean') v = v ? 1 : 0;
    out[col(field)] = (v === undefined ? null : v);
  }
  return out;
}

function genRecordId() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = 'rec';
  for (let i = 0; i < 14; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// ── Generic fetch helpers ─────────────────────────────────────────────────────
async function fetchAll(tableName) {
  const d = def(tableName);
  const rows = await q(`SELECT * FROM \`${d.sql}\``);
  return rows.map(r => rowToRecord(tableName, r));
}
async function fetchOne(tableName, id) {
  const d = def(tableName);
  const rows = await q(`SELECT * FROM \`${d.sql}\` WHERE record_id = ? LIMIT 1`, [id]);
  return rows.length ? rowToRecord(tableName, rows[0]) : null;
}
// find child records whose people-pointing column contains this person's name
async function fetchByPersonName(tableName, name) {
  const d = def(tableName);
  if (!d.peopleCol || !name) return [];
  const rows = await q(`SELECT * FROM \`${d.sql}\` WHERE \`${d.peopleCol}\` LIKE ?`, [`%${name}%`]);
  return rows.map(r => rowToRecord(tableName, r));
}
async function personName(idOrRecord) {
  if (idOrRecord && typeof idOrRecord === 'object') return idOrRecord['Full Name ★'] || null;
  const p = await fetchOne(TABLES.PEOPLE, idOrRecord);
  return p ? p['Full Name ★'] : null;
}

// ── People ────────────────────────────────────────────────────────────────────
async function getAllAncestors() { return fetchAll(TABLES.PEOPLE); }
async function getAncestorById(id) { return fetchOne(TABLES.PEOPLE, id); }

async function saveAncestor(data) {
  if (!data.name) return null;
  const existing = await q(
    `SELECT * FROM \`people\` WHERE LOWER(\`full_name\`) = ? LIMIT 1`,
    [String(data.name).toLowerCase()]
  );
  if (existing.length) return rowToRecord(TABLES.PEOPLE, existing[0]);
  const fields = { 'Full Name ★': data.name };
  if (data.birthYear) fields['Birth Date']  = String(data.birthYear);
  if (data.location)  fields['Birth Place'] = data.location;
  if (data.notes)     fields['Notes']       = data.notes;
  return createRecord(TABLES.PEOPLE, fields);
}

// ── Relationship getters (by person name) ─────────────────────────────────────
async function getQuestionsByAncestor(id, rec)   { return fetchByPersonName(TABLES.QUESTIONS,   await personName(rec || id)); }
async function getSourcesByAncestor(id, rec)     { return fetchByPersonName(TABLES.SOURCES,     await personName(rec || id)); }
async function getEvidenceByAncestor(id, rec)    { return fetchByPersonName(TABLES.EVIDENCE,    await personName(rec || id)); }
async function getDNATestingByAncestor(id, rec)  { return fetchByPersonName(TABLES.DNA_TESTING, await personName(rec || id)); }
async function getDNAMatchesByAncestor(id, rec)  { return fetchByPersonName(TABLES.DNA_MATCHES, await personName(rec || id)); }
async function getResearchLogByAncestor(id, rec) { return fetchByPersonName(TABLES.RESEARCH_LOG,await personName(rec || id)); }

async function getAncestorProfile(ancestorId) {
  const ancestor = await getAncestorById(ancestorId);
  const name = ancestor ? ancestor['Full Name ★'] : null;
  const [questions, sources, evidence, dnaTests, dnaMatches, archives, collections, researchLog] =
    await Promise.all([
      fetchByPersonName(TABLES.QUESTIONS, name),
      fetchByPersonName(TABLES.SOURCES, name),
      fetchByPersonName(TABLES.EVIDENCE, name),
      fetchByPersonName(TABLES.DNA_TESTING, name),
      fetchByPersonName(TABLES.DNA_MATCHES, name),
      fetchByPersonName(TABLES.ARCHIVES, name),
      fetchByPersonName(TABLES.COLLECTIONS, name),
      fetchByPersonName(TABLES.RESEARCH_LOG, name),
    ]);
  return { ancestor, questions, sources, evidence, dnaTests, dnaMatches, archives, collections, researchLog };
}

// ── Simple getAll endpoints ───────────────────────────────────────────────────
async function getAllQuestions()   { return fetchAll(TABLES.QUESTIONS); }
async function getAllSources()     { return fetchAll(TABLES.SOURCES); }
async function getAllCollections() { return fetchAll(TABLES.COLLECTIONS); }
async function getAllArchives()    { return fetchAll(TABLES.ARCHIVES); }
async function getAllDonors()      { return fetchAll(TABLES.DONORS); }
async function getAllStorage()     { return fetchAll(TABLES.STORAGE); }
async function getAllDNATesting()  { return fetchAll(TABLES.DNA_TESTING); }
async function getAllDNAMatches()  { return fetchAll(TABLES.DNA_MATCHES); }
async function getAllResearchLog() {
  const rows = await fetchAll(TABLES.RESEARCH_LOG);
  return rows.sort((a, b) => new Date(b._createdTime || 0) - new Date(a._createdTime || 0));
}

// ── Writes ────────────────────────────────────────────────────────────────────
async function createRecord(tableName, fields) {
  const d = def(tableName);
  const map = fieldsToColumns(tableName, fields);
  const recordId = genRecordId();
  const cols = ['record_id', ...Object.keys(map)];
  const vals = [recordId, ...Object.values(map)];
  const placeholders = cols.map(() => '?').join(', ');
  await q(`INSERT INTO \`${d.sql}\` (${cols.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`, vals);
  return fetchOne(tableName, recordId);
}
async function updateRecord(tableName, id, fields) {
  const d = def(tableName);
  const map = fieldsToColumns(tableName, fields);
  const keys = Object.keys(map);
  if (!keys.length) return fetchOne(tableName, id);
  const set = keys.map(k => `\`${k}\` = ?`).join(', ');
  await q(`UPDATE \`${d.sql}\` SET ${set} WHERE record_id = ?`, [...Object.values(map), id]);
  return fetchOne(tableName, id);
}
async function deleteRecord(tableName, id) {
  const d = def(tableName);
  await q(`DELETE FROM \`${d.sql}\` WHERE record_id = ?`, [id]);
  return { deleted: id };
}
const createAnyRecord = createRecord;
const updateAnyRecord = updateRecord;
const deleteAnyRecord = deleteRecord;

async function saveSource(sourceData) {
  return createRecord(TABLES.SOURCES, { 'Name ★': sourceData.name || 'Untitled' });
}
async function saveQuestion(data, ancestorId) {
  const fields = {};
  if (data.question) fields['Research Question ★'] = data.question;
  if (data.answer)   fields['Current Conclusion']  = data.answer;
  if (ancestorId) {
    const nm = await personName(ancestorId);
    if (nm) fields['People'] = [nm];
  }
  return createRecord(TABLES.QUESTIONS, fields);
}
async function saveResearchLog(data) {
  const fields = {};
  if (data.title)  fields['Log Title ★']     = data.title;
  if (data.status) fields['Research Status'] = data.status;
  if (data.notes)  fields['Notes']           = data.notes;
  if (data.personId) {
    const nm = await personName(data.personId);
    if (nm) fields['Person'] = [nm];
  }
  return createRecord(TABLES.RESEARCH_LOG, fields);
}
async function saveDNAMatch(data, ancestorId) {
  const fields = {};
  if (data.name)             fields['Match Name ★']           = data.name;
  if (data.relationship)     fields['Predicted Relationship'] = data.relationship;
  if (data.sharedCm != null) fields['Shared cM']              = Number(data.sharedCm) || undefined;
  if (data.details)          fields['Notes']                  = data.details;
  if (ancestorId) {
    const nm = await personName(ancestorId);
    if (nm) fields['Linked Person in Tree'] = [nm];
  }
  Object.keys(fields).forEach(k => fields[k] === undefined && delete fields[k]);
  return createRecord(TABLES.DNA_MATCHES, fields);
}
async function saveArchive(data) {
  const fields = {};
  const accNum = data.accessionNumber || data['Accession Number ★'] ||
    `ARCH-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*9000+1000)}`;
  fields['Accession Number ★'] = accNum;
  if (data.date)      fields['Inclusive Dates']     = data.date;
  if (data.condition) fields['Condition']           = data.condition;
  if (data.location)  fields['Box/Folder Reference'] = data.location;
  if (data.extent)    fields['Extent']              = data.extent;
  const descParts = [];
  if (data.title) descParts.push(data.title);
  if (data.description && data.description !== data.title) descParts.push(data.description);
  if (data.creator) descParts.push(`Creator: ${data.creator}`);
  if (data.tags)    descParts.push(`Tags: ${data.tags}`);
  if (descParts.length) fields['Description'] = descParts.join(' — ');
  fields['Accession Date'] = data.accessionDate || new Date().toISOString().slice(0, 10);
  if (data.format)    fields['Formats Included'] = [String(data.format)];
  if (data.imageUrl)  fields['Image URL']   = data.imageUrl;
  if (data.aiMetadata) fields['AI Metadata'] = typeof data.aiMetadata === 'object'
    ? JSON.stringify(data.aiMetadata, null, 2) : String(data.aiMetadata);
  return createRecord(TABLES.ARCHIVES, fields);
}
async function updateQuestionStatus(questionId, status) {
  return updateRecord(TABLES.QUESTIONS, questionId, { Status: status });
}

async function mergeAncestors(keepId, deleteId) {
  const [primary, duplicate] = await Promise.all([getAncestorById(keepId), getAncestorById(deleteId)]);
  const patch = {};
  const skip = new Set(['id', '_createdTime', 'Person ID', 'Full Name ★']);
  for (const [field, value] of Object.entries(duplicate || {})) {
    if (skip.has(field)) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (value === null || value === undefined || value === '') continue;
    const pv = primary ? primary[field] : undefined;
    const empty = pv === null || pv === undefined || pv === '' || (Array.isArray(pv) && pv.length === 0);
    if (empty) patch[field] = value;
  }
  if (Object.keys(patch).length) await updateRecord(TABLES.PEOPLE, keepId, patch);
  await deleteRecord(TABLES.PEOPLE, deleteId);
  return { kept: keepId, deleted: deleteId, fieldsMerged: Object.keys(patch) };
}

async function getTableFields(tableName) {
  return def(tableName).fields.map(([f]) => f);
}

async function getDashboardCounts() {
  const cnt = async (t) => (await q(`SELECT COUNT(*) AS n FROM \`${def(t).sql}\``))[0].n;
  const [people, questions, archives, collections, dnaTests, dnaMatches] = await Promise.all([
    cnt(TABLES.PEOPLE), cnt(TABLES.QUESTIONS), cnt(TABLES.ARCHIVES),
    cnt(TABLES.COLLECTIONS), cnt(TABLES.DNA_TESTING), cnt(TABLES.DNA_MATCHES),
  ]);
  const recent = (await q(`SELECT * FROM \`people\` LIMIT 6`)).map(r => rowToRecord(TABLES.PEOPLE, r));
  return {
    ancestorsCount: people, questionsCount: questions,
    archivesCount: archives + collections, dnaCount: dnaTests + dnaMatches,
    recentAncestors: recent,
  };
}

async function getFamilyTreeData() {
  const rows = await q(`SELECT * FROM \`people\``);
  return rows.map(r => {
    const rec = rowToRecord(TABLES.PEOPLE, r);
    const genRaw = rec['Generation Number'];
    const generation = (genRaw !== null && genRaw !== undefined && genRaw !== '') ? parseInt(genRaw) : null;
    return {
      id: rec.id, name: rec['Full Name ★'] || 'Unknown',
      birthDate: rec['Birth Date'] || '', deathDate: rec['Death Date'] || '',
      birthPlace: rec['Birth Place'] || '', sex: rec['Sex'] || '',
      generation, relation: rec['Relation to Self'] || '', line: rec['Line'] || '',
      photoUrl: rec['Photo URL'] || '', _createdTime: rec._createdTime || '',
    };
  });
}

async function searchAll(query) {
  if (!query || query.trim().length < 2) return [];
  const term = query.trim().toLowerCase();
  const list = [
    ['People','Person',TABLES.PEOPLE], ['Research Questions','Research Question',TABLES.QUESTIONS],
    ['Sources','Source',TABLES.SOURCES], ['Evidence Analysis','Evidence',TABLES.EVIDENCE],
    ['DNA Testing','DNA Testing',TABLES.DNA_TESTING], ['DNA Matches','DNA Match',TABLES.DNA_MATCHES],
    ['Collections','Collection',TABLES.COLLECTIONS], ['Archives','Archive',TABLES.ARCHIVES],
    ['Donors','Donor',TABLES.DONORS], ['Storage','Storage',TABLES.STORAGE],
  ];
  const fetched = await Promise.all(list.map(([, , t]) => fetchAll(t).catch(() => [])));
  const results = [];
  fetched.forEach((records, i) => {
    const [key, label] = list[i];
    records.forEach(record => {
      const matched = Object.entries(record).some(([field, value]) => {
        if (field === 'id' || field === '_createdTime') return false;
        if (Array.isArray(value)) return value.some(v => String(v).toLowerCase().includes(term));
        return String(value).toLowerCase().includes(term);
      });
      if (!matched) return;
      const name = record['Full Name ★'] || record['Name ★'] || record['Match Name ★'] ||
        record['Collection Name ★'] || record['Accession Number ★'] || record['Contact Name ★'] ||
        record['Location Name ★'] || record['Evidence Summary ★'] || record['Test Label ★'] ||
        record['Log Title ★'] || record['Research Question ★'] || record.id;
      const snippets = Object.entries(record)
        .filter(([field, value]) => {
          if (field === 'id' || field === '_createdTime') return false;
          if (Array.isArray(value)) return value.some(v => String(v).toLowerCase().includes(term));
          return typeof value === 'string' && value.toLowerCase().includes(term);
        })
        .slice(0, 3)
        .map(([field, value]) => `${field}: ${(Array.isArray(value) ? value.join(', ') : String(value)).substring(0, 120)}`);
      results.push({ id: record.id, table: key, type: label, name: String(name).substring(0, 120), snippets });
    });
  });
  return results;
}

// health helper used by the self-test / /api/health
async function ping() {
  const r = await q('SELECT 1 AS ok');
  return r[0].ok === 1;
}

module.exports = {
  TABLES, ping,
  searchAll, deleteRecord, mergeAncestors, saveQuestion, saveDNAMatch,
  updateAnyRecord, deleteAnyRecord, createAnyRecord, getTableFields, getAllQuestions,
  getAllAncestors, getAncestorById, getAncestorProfile, getQuestionsByAncestor,
  getSourcesByAncestor, getEvidenceByAncestor, getDNATestingByAncestor, getDNAMatchesByAncestor,
  getAllArchives, getAllCollections, getAllDonors, getAllStorage, getAllSources,
  getAllDNATesting, getAllDNAMatches, getAllResearchLog, getResearchLogByAncestor,
  saveSource, saveAncestor, saveArchive, saveResearchLog, updateQuestionStatus,
  getDashboardCounts, getFamilyTreeData,
  _SCHEMA: SCHEMA, _col: col, // exposed for the schema-parity test
};
