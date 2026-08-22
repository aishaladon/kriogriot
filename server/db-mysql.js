// db-mysql.js — MySQL data layer for Krio Griot.
// All queries are scoped by user_id for multi-tenancy.
let _pool = null;
function pool() {
  if (_pool) return _pool;
  const mysql = require('mysql2/promise');
  _pool = mysql.createPool({
    host:               process.env.MYSQL_HOST     || 'localhost',
    port:               Number(process.env.MYSQL_PORT || 3306),
    user:               process.env.MYSQL_USER,
    password:           process.env.MYSQL_PASSWORD,
    database:           process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit:    Number(process.env.MYSQL_POOL || 5),
    charset:            'utf8mb4',
  });
  return _pool;
}

async function q(sql, params = []) {
  const [rows] = await pool().execute(sql, params);
  return rows;
}

// ── Row shaping ────────────────────────────────────────────────────────────────
// The client was written against the original Airtable field names ("Full Name ★"),
// while these tables use snake_case columns. Writes already accept both, but reads
// returned raw rows, so every list and edit form rendered blank. Aliases are added
// alongside the original columns so nothing that reads snake_case breaks.
const CLIENT_ALIASES = {
  'People': {
    'Full Name ★': 'full_name', 'Birth Name': 'birth_name', 'Also Known As': 'also_known_as',
    'Sex': 'sex', 'Race/Ethnicity (as recorded)': 'race_ethnicity', 'Birth Date': 'birth_date',
    'Birth Place': 'birth_place', 'Death Date': 'death_date', 'Death Place': 'death_place',
    'Burial Place': 'burial_place', 'Generation Number': 'generation_number',
    'Relation to Self': 'relation_to_self', 'Line': 'line',
    'Ancestry Profile URL': 'ancestry_profile_url', 'FamilySearch ID': 'family_search_id',
    'Geni Profile URL': 'geni_profile_url', 'Photo URL': 'photo_url', 'Notes': 'notes',
  },
  'Research Questions': {
    'Research Question ★': 'question', 'Research Question': 'question',
    'Research Type': 'research_type', 'Status': 'status', 'Priority': 'priority',
    'Date Opened': 'date_opened', 'Date Resolved': 'date_resolved',
    'Current Conclusion': 'conclusion', 'Next Action': 'next_action', 'Notes': 'notes',
  },
  'Sources': {
    'Name ★': 'name', 'Source Type': 'source_type', 'Repository': 'repository', 'URL': 'url',
    'Full Citation': 'full_citation', 'Short Citation': 'short_citation',
    'Date of Source': 'date_of_source', 'Date Accessed': 'date_accessed',
    'Notes': 'notes', 'Source File URL': 'source_file_url',
  },
  'Research Log': {
    'Log Title ★': 'title', 'Log Title': 'title', 'Title': 'title',
    'Date': 'date', 'Summary': 'summary', 'Notes': 'notes',
  },
  'DNA Testing': {
    'Test Label ★': 'name', 'Name ★': 'name', 'Company': 'company',
    'Date Tested': 'test_date', 'Kit': 'kit_number', 'Notes': 'notes',
  },
  'DNA Matches': {
    'Match Name ★': 'match_name', 'Match Name': 'match_name', 'Shared cM': 'shared_cm',
    'Predicted Relationship': 'relationship', 'Company': 'company', 'Notes': 'notes',
  },
  'Archives': {
    'Accession Number ★': 'name', 'Name ★': 'name', 'Description': 'description',
    'Image URL': 'image_url', 'AI Metadata': 'metadata',
  },
  'Collections': {
    'Collection Name ★': 'name', 'Name ★': 'name', 'Description': 'description',
  },
};

function toClient(table, row) {
  if (!row) return row;
  const aliases = CLIENT_ALIASES[table];
  if (!aliases) return row;
  const out = { ...row };
  for (const [clientName, column] of Object.entries(aliases)) {
    if (row[column] !== undefined && out[clientName] === undefined) out[clientName] = row[column];
  }
  return out;
}

const toClientRows = (table, rows) => (rows || []).map(r => toClient(table, r));

// ── Users ──────────────────────────────────────────────────────────────────────
async function createUser({ email, passwordHash, name, plan }) {
  const validPlans = ['free', 'basic-paid', 'upgrade'];
  const userPlan = validPlans.includes(plan) ? plan : 'free';
  const result = await pool().execute(
    'INSERT INTO users (email, password_hash, name, plan) VALUES (?, ?, ?, ?)',
    [email.toLowerCase(), passwordHash, name || null, userPlan]
  );
  return { id: result[0].insertId, email, name, plan: userPlan };
}

async function getUserByEmail(email) {
  const rows = await q('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  return rows[0] || null;
}

async function getUserById(id) {
  const rows = await q('SELECT id, email, name, plan, created_at FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

async function updateUserPassword(userId, passwordHash) {
  await pool().execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
}

// ── Password reset tokens ──────────────────────────────────────────────────────
async function storeResetToken(userId, token, expiresAt) {
  await pool().execute('DELETE FROM password_reset_tokens WHERE user_id = ?', [userId]);
  await pool().execute(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, token, expiresAt]
  );
}

async function getResetToken(token) {
  const rows = await q('SELECT * FROM password_reset_tokens WHERE token = ?', [token]);
  return rows[0] || null;
}

async function clearResetToken(token) {
  await pool().execute('DELETE FROM password_reset_tokens WHERE token = ?', [token]);
}

// ── People ─────────────────────────────────────────────────────────────────────
async function getAllAncestors(userId) {
  return toClientRows('People', await q('SELECT * FROM people WHERE user_id = ? ORDER BY full_name', [userId]));
}

async function getAncestorProfile(userId, personId) {
  const rows = await q('SELECT * FROM people WHERE id = ? AND user_id = ?', [personId, userId]);
  return rows.length ? toClient('People', rows[0]) : null;
}

async function createPerson(userId, fields) {
  const result = await pool().execute(
    `INSERT INTO people
      (user_id, full_name, birth_name, also_known_as, sex, race_ethnicity,
       birth_date, birth_place, death_date, death_place, burial_place,
       generation_number, relation_to_self, line, ancestry_profile_url,
       family_search_id, geni_profile_url, photo_url, notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      userId,
      fields.full_name || fields['Full Name ★'] || null,
      fields.birth_name || fields['Birth Name'] || null,
      fields.also_known_as || fields['Also Known As'] || null,
      fields.sex || fields['Sex'] || null,
      fields.race_ethnicity || fields['Race/Ethnicity (as recorded)'] || null,
      fields.birth_date || fields['Birth Date'] || null,
      fields.birth_place || fields['Birth Place'] || null,
      fields.death_date || fields['Death Date'] || null,
      fields.death_place || fields['Death Place'] || null,
      fields.burial_place || fields['Burial Place'] || null,
      fields.generation_number || fields['Generation Number'] || null,
      fields.relation_to_self || fields['Relation to Self'] || null,
      fields.line || fields['Line'] || null,
      fields.ancestry_profile_url || fields['Ancestry Profile URL'] || null,
      fields.family_search_id || fields['FamilySearch ID'] || null,
      fields.geni_profile_url || fields['Geni Profile URL'] || null,
      fields.photo_url || fields['Photo URL'] || null,
      fields.notes || fields['Notes'] || null,
    ]
  );
  return { id: result[0].insertId, ...fields };
}

async function updatePerson(userId, personId, fields) {
  const nameMap = {
    'Full Name ★': 'full_name', 'Birth Name': 'birth_name',
    'Also Known As': 'also_known_as', 'Sex': 'sex',
    'Race/Ethnicity (as recorded)': 'race_ethnicity', 'Birth Date': 'birth_date',
    'Birth Place': 'birth_place', 'Death Date': 'death_date',
    'Death Place': 'death_place', 'Burial Place': 'burial_place',
    'Generation Number': 'generation_number', 'Relation to Self': 'relation_to_self',
    'Line': 'line', 'Ancestry Profile URL': 'ancestry_profile_url',
    'FamilySearch ID': 'family_search_id', 'Geni Profile URL': 'geni_profile_url',
    'Photo URL': 'photo_url', 'Notes': 'notes',
  };
  const allowed = Object.values(nameMap);
  const sets = [], vals = [];
  for (const [k, v] of Object.entries(fields)) {
    const col = nameMap[k] || k;
    if (allowed.includes(col)) { sets.push(`${col} = ?`); vals.push(v); }
  }
  if (!sets.length) return 0;
  vals.push(personId, userId);
  const [res] = await pool().execute(
    `UPDATE people SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`,
    vals
  );
  return res.affectedRows;
}

async function deletePerson(userId, personId) {
  const [res] = await pool().execute('DELETE FROM people WHERE id = ? AND user_id = ?', [personId, userId]);
  return res.affectedRows;
}

// ── Family connections ─────────────────────────────────────────────────────────
async function saveFamilyConnection(userId, { childId, fatherId, motherId }) {
  await pool().execute(
    `INSERT INTO family_connections (user_id, child_id, father_id, mother_id)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE father_id = VALUES(father_id), mother_id = VALUES(mother_id)`,
    [userId, childId, fatherId || null, motherId || null]
  );
}

async function removeFamilyConnection(userId, childId) {
  await pool().execute(
    'DELETE FROM family_connections WHERE user_id = ? AND child_id = ?',
    [userId, childId]
  );
}

async function getFamilyConnections(userId) {
  return q('SELECT * FROM family_connections WHERE user_id = ?', [userId]);
}

// ── Family tree data ───────────────────────────────────────────────────────────
async function getFamilyTreeData(userId) {
  const people = await getAllAncestors(userId);
  const connections = await getFamilyConnections(userId);
  const connMap = {};
  for (const c of connections) connMap[String(c.child_id)] = c;

  return people.map(p => ({
    id:        String(p.id),
    name:      p.full_name,
    birthDate: p.birth_date,
    deathDate: p.death_date,
    sex:       p.sex,
    photoUrl:  p.photo_url,
    line:      p.line,
    generation: p.generation_number,
    fatherId:  connMap[String(p.id)]?.father_id ? String(connMap[String(p.id)].father_id) : null,
    motherId:  connMap[String(p.id)]?.mother_id ? String(connMap[String(p.id)].mother_id) : null,
  }));
}

// ── Research Questions ─────────────────────────────────────────────────────────
async function getAllQuestions(userId) {
  return toClientRows('Research Questions', await q('SELECT * FROM research_questions WHERE user_id = ? ORDER BY id DESC', [userId]));
}

async function saveQuestion(userId, fields) {
  const result = await pool().execute(
    `INSERT INTO research_questions
      (user_id, question, research_type, status, priority, date_opened, conclusion, next_action, notes)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      userId,
      fields['Research Question ★'] || fields.question || null,
      fields['Research Type'] || null,
      fields['Status'] || null,
      fields['Priority'] || null,
      fields['Date Opened'] || null,
      fields['Current Conclusion'] || null,
      fields['Next Action'] || null,
      fields.notes || null,
    ]
  );
  return { id: result[0].insertId };
}

// ── Sources ────────────────────────────────────────────────────────────────────
async function getAllSources(userId) {
  return toClientRows('Sources', await q('SELECT * FROM sources WHERE user_id = ? ORDER BY id DESC', [userId]));
}

async function saveSource(userId, fields) {
  const result = await pool().execute(
    `INSERT INTO sources
      (user_id, name, source_type, repository, url, full_citation, short_citation,
       date_of_source, date_accessed, notes, source_file_url)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      userId,
      fields['Name ★'] || fields.name || null,
      fields['Source Type'] || null,
      fields['Repository'] || null,
      fields['URL'] || null,
      fields['Full Citation'] || null,
      fields['Short Citation'] || null,
      fields['Date of Source'] || null,
      fields['Date Accessed'] || null,
      fields.notes || null,
      fields['Source File URL'] || null,
    ]
  );
  return { id: result[0].insertId };
}

// ── Research Log ───────────────────────────────────────────────────────────────
async function getAllResearchLog(userId) {
  return toClientRows('Research Log', await q('SELECT * FROM research_log WHERE user_id = ? ORDER BY id DESC', [userId]));
}

async function saveResearchLog(userId, fields) {
  const result = await pool().execute(
    'INSERT INTO research_log (user_id, title, date, summary, notes) VALUES (?,?,?,?,?)',
    [
      userId,
      fields.title || fields['Title'] || null,
      fields.date  || fields['Date']  || null,
      fields.summary || null,
      fields.notes || null,
    ]
  );
  return { id: result[0].insertId };
}

// ── DNA ────────────────────────────────────────────────────────────────────────
async function getAllDNATesting(userId) {
  return toClientRows('DNA Testing', await q('SELECT * FROM dna_testing WHERE user_id = ? ORDER BY id DESC', [userId]));
}

async function getAllDNAMatches(userId) {
  return toClientRows('DNA Matches', await q('SELECT * FROM dna_matches WHERE user_id = ? ORDER BY id DESC', [userId]));
}

async function saveDNAMatch(userId, fields) {
  const result = await pool().execute(
    'INSERT INTO dna_matches (user_id, match_name, shared_cm, relationship, company, notes) VALUES (?,?,?,?,?,?)',
    [userId, fields.match_name || null, fields.shared_cm || null, fields.relationship || null, fields.company || null, fields.notes || null]
  );
  return { id: result[0].insertId };
}

// ── Archives ───────────────────────────────────────────────────────────────────
async function getAllArchives(userId) {
  return toClientRows('Archives', await q('SELECT * FROM archives WHERE user_id = ? ORDER BY id DESC', [userId]));
}

async function saveArchive(userId, fields) {
  const result = await pool().execute(
    'INSERT INTO archives (user_id, name, description, image_url, metadata) VALUES (?,?,?,?,?)',
    [userId, fields.name || null, fields.description || null, fields.imageUrl || null, fields.metadata ? JSON.stringify(fields.metadata) : null]
  );
  return { id: result[0].insertId };
}

// ── Collections ────────────────────────────────────────────────────────────────
async function getAllCollections(userId) {
  return toClientRows('Collections', await q('SELECT * FROM collections WHERE user_id = ? ORDER BY id DESC', [userId]));
}

// ── Dashboard counts ───────────────────────────────────────────────────────────
async function getDashboardCounts(userId) {
  const [[people], [questions], [sources], [log], [dna], [archives], [collections]] = await Promise.all([
    q('SELECT COUNT(*) AS c FROM people WHERE user_id = ?', [userId]),
    q('SELECT COUNT(*) AS c FROM research_questions WHERE user_id = ?', [userId]),
    q('SELECT COUNT(*) AS c FROM sources WHERE user_id = ?', [userId]),
    q('SELECT COUNT(*) AS c FROM research_log WHERE user_id = ?', [userId]),
    q('SELECT COUNT(*) AS c FROM dna_matches WHERE user_id = ?', [userId]),
    q('SELECT COUNT(*) AS c FROM archives WHERE user_id = ?', [userId]),
    q('SELECT COUNT(*) AS c FROM collections WHERE user_id = ?', [userId]),
  ]);
  // Six most-recently-added people for the dashboard cards.
  const recent = await q(
    'SELECT * FROM people WHERE user_id = ? ORDER BY id DESC LIMIT 6', [userId]
  );

  return {
    // Names the client reads (were missing after the Airtable→MySQL move, so
    // the dashboard always showed dashes and no recent ancestors).
    ancestorsCount: people.c,
    questionsCount: questions.c,
    archivesCount:  archives.c + collections.c,
    dnaCount:       dna.c,
    recentAncestors: toClientRows('People', recent),
    // Original keys kept for any other caller.
    people:      people.c,
    questions:   questions.c,
    sources:     sources.c,
    researchLog: log.c,
    dnaMatches:  dna.c,
    archives:    archives.c,
    collections: collections.c,
  };
}

// ── Search ─────────────────────────────────────────────────────────────────────
async function searchAll(userId, term) {
  const like = `%${term}%`;
  const people = await q(
    'SELECT id, full_name AS name, birth_date, death_date FROM people WHERE user_id = ? AND full_name LIKE ?',
    [userId, like]
  );
  return people.map(p => ({ ...p, _table: 'People' }));
}

// ── Generic CRUD ───────────────────────────────────────────────────────────────
async function createAnyRecord(userId, table, fields) {
  const tableMap = {
    'People': () => createPerson(userId, fields),
    'Research Questions': () => saveQuestion(userId, fields),
    'Sources': () => saveSource(userId, fields),
    'Research Log': () => saveResearchLog(userId, fields),
  };
  if (tableMap[table]) return tableMap[table]();

  // DNA Testing, DNA Matches, Archives and Collections have no bespoke creator,
  // so build the insert from the alias map. Without this they were unaddable.
  const sqlTable = TABLE_SQL[table];
  if (!sqlTable) throw new Error(`Unknown table: ${table}`);
  const aliases = CLIENT_ALIASES[table] || {};
  const valid   = new Set(Object.values(aliases));
  const cols = ['user_id'], vals = [userId];
  for (const [key, value] of Object.entries(fields || {})) {
    const col = aliases[key] || key;
    if (!valid.has(col) || cols.includes(col)) continue;
    cols.push(col);
    vals.push(value === '' ? null : value);
  }
  const [res] = await pool().execute(
    `INSERT INTO \`${sqlTable}\` (${cols.map(c => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
    vals
  );
  return { id: res.insertId };
}

// Every table the client can list is also editable and deletable. Both are
// scoped by user_id, so one account can never modify another's rows.
const TABLE_SQL = {
  'People': 'people', 'Research Questions': 'research_questions', 'Sources': 'sources',
  'Research Log': 'research_log', 'DNA Testing': 'dna_testing', 'DNA Matches': 'dna_matches',
  'Archives': 'archives', 'Collections': 'collections',
};

async function updateAnyRecord(userId, table, id, fields) {
  if (table === 'People') return updatePerson(userId, id, fields);
  const sqlTable = TABLE_SQL[table];
  if (!sqlTable) throw new Error(`Unknown table: ${table}`);

  const aliases = CLIENT_ALIASES[table] || {};
  const columns = new Set(Object.values(aliases));
  const sets = [], vals = [];
  for (const [key, value] of Object.entries(fields || {})) {
    const col = aliases[key] || key;
    if (!columns.has(col)) continue;         // ignore anything not a real column
    sets.push(`\`${col}\` = ?`);
    vals.push(value === '' ? null : value);
  }
  if (!sets.length) return 0;
  vals.push(id, userId);
  const [res] = await pool().execute(
    `UPDATE \`${sqlTable}\` SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, vals
  );
  return res.affectedRows;
}

async function deleteAnyRecord(userId, table, id) {
  if (table === 'People') return deletePerson(userId, id);
  const sqlTable = TABLE_SQL[table];
  if (!sqlTable) throw new Error(`Unknown table: ${table}`);
  const [res] = await pool().execute(
    `DELETE FROM \`${sqlTable}\` WHERE id = ? AND user_id = ?`, [id, userId]
  );
  return res.affectedRows;
}

async function getTableFields(table) {
  const fieldMap = {
    'People': ['Full Name ★','Birth Name','Also Known As','Sex','Race/Ethnicity (as recorded)','Birth Date','Birth Place','Death Date','Death Place','Burial Place','Generation Number','Relation to Self','Line','Ancestry Profile URL','FamilySearch ID','Geni Profile URL','Photo URL','Notes'],
    'Research Questions': ['Research Question ★','Research Type','Status','Priority','Date Opened','Current Conclusion','Next Action'],
    'Sources': ['Name ★','Source Type','Repository','URL','Full Citation','Short Citation','Date of Source','Date Accessed'],
    'Research Log': ['Title','Date','Summary','Notes'],
  };
  return (fieldMap[table] || []).map(name => ({ name }));
}

async function saveAncestor(userId, fields) {
  return createPerson(userId, fields);
}

// ── Mango helpers ──────────────────────────────────────────────────────────────
async function mangoInsert(fields) {
  const [result] = await pool().execute(
    `INSERT INTO mango_requests
     (question,ancestor_name,state,era,email,phone_cc,phone,
      consent_delivery,consent_community,consent_text,consent_at,ip,user_agent)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [fields.question,fields.ancestor_name,fields.state,fields.era,
     fields.email,fields.phone_cc,fields.phone,
     fields.consent_delivery,fields.consent_community,
     fields.consent_text,fields.consent_at,fields.ip,fields.user_agent]
  );
  return result.insertId;
}

async function mangoUpdate(id, fields) {
  await pool().execute(
    `UPDATE mango_requests SET question=?,ancestor_name=?,state=?,era=?,phone_cc=?,phone=?,
     consent_delivery=?,consent_community=?,consent_text=?,consent_at=?,ip=?,user_agent=?,status='new'
     WHERE id=?`,
    [fields.question,fields.ancestor_name,fields.state,fields.era,
     fields.phone_cc,fields.phone,fields.consent_delivery,fields.consent_community,
     fields.consent_text,fields.consent_at,fields.ip,fields.user_agent,id]
  );
}

async function mangoFindByEmail(email) {
  return q('SELECT id FROM mango_requests WHERE email = ?', [email]);
}

async function mangoSetStatus(id, status) {
  await pool().execute('UPDATE mango_requests SET status=? WHERE id=?', [status, id]);
}

async function mangoList({ status, q: search } = {}) {
  let sql = 'SELECT * FROM mango_requests WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status=?'; params.push(status); }
  if (search) { sql += ' AND (ancestor_name LIKE ? OR email LIKE ?)'; params.push('%'+search+'%','%'+search+'%'); }
  sql += ' ORDER BY created_at DESC LIMIT 500';
  return q(sql, params);
}

async function ping() {
  const rows = await q('SELECT 1 AS ok');
  return rows[0].ok === 1;
}

module.exports = {
  ping,
  createUser, getUserByEmail, getUserById, updateUserPassword,
  storeResetToken, getResetToken, clearResetToken,
  getAllAncestors, getAncestorProfile, createPerson, updatePerson, deletePerson,
  saveFamilyConnection, removeFamilyConnection, getFamilyConnections,
  getFamilyTreeData,
  getAllQuestions, saveQuestion,
  getAllSources, saveSource, getSourcesByAncestor: (userId) => getAllSources(userId),
  getAllResearchLog, saveResearchLog,
  getAllDNATesting, getAllDNAMatches, saveDNAMatch,
  getAllArchives, saveArchive,
  getAllCollections,
  getDashboardCounts,
  searchAll,
  createAnyRecord, updateAnyRecord, deleteAnyRecord, getTableFields,
  saveAncestor,
  deleteRecord: (table, id, userId) => deletePerson(userId, id),
  mergeAncestors: async () => ({}),
  mangoInsert, mangoUpdate, mangoFindByEmail, mangoSetStatus, mangoList,
};
