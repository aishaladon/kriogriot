require('dotenv').config({ path: require('path').join(__dirname, '../.env'), override: true });

const express  = require('express');
const cors     = require('cors');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const crypto   = require('crypto');

const airtable  = require('./db');          // data-layer switch (airtable | mysql via DB_DRIVER)
const anthropic = require('./anthropic');

// ── GEDCOM relationship data (loaded once, cached) ────────────────────────────
const GEDCOM_MAP_FILE      = path.join(__dirname, 'gedcom-map.json');
const GEDCOM_DATA_FILE     = path.join(__dirname, 'gedcom-data.json');
const OVERRIDES_FILE       = path.join(__dirname, 'family-overrides.json');
let _gedcomCache = null;

function loadOverrides() {
  if (!fs.existsSync(OVERRIDES_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf8')); }
  catch (_) { return {}; }
}

function saveOverrides(overrides) {
  fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2));
}

function loadGedcomCache() {
  if (_gedcomCache) return _gedcomCache;
  if (!fs.existsSync(GEDCOM_MAP_FILE) || !fs.existsSync(GEDCOM_DATA_FILE)) return null;
  try {
    const map  = JSON.parse(fs.readFileSync(GEDCOM_MAP_FILE,  'utf8'));
    const data = JSON.parse(fs.readFileSync(GEDCOM_DATA_FILE, 'utf8'));

    // Build reverse map: airtableId → gedcom individual data
    const reverseMap = {};           // airtableId  → gedcomId
    const indiByGedcomId = {};       // gedcomId    → { famcId, famsIds }
    for (const [gedcomId, airtableId] of Object.entries(map)) {
      reverseMap[airtableId] = gedcomId;
    }
    for (const indi of (data.individuals || [])) {
      indiByGedcomId[indi.id] = { famcId: indi.famcId, famsIds: indi.famsIds };
    }

    _gedcomCache = {
      reverseMap,
      indiByGedcomId,
      families: data.families || [],
      rootId:   data.rootId   || null,
    };
    console.log(`✅  GEDCOM data loaded: ${data.individuals?.length} people, ${data.families?.length} families`);
    return _gedcomCache;
  } catch (err) {
    console.warn('⚠️   Could not load GEDCOM data:', err.message);
    return null;
  }
}

const app    = express();

// ── Multer — memory for metadata analysis ─────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ── Multer — disk storage factory for image uploads ──────────────────────────
function makeDiskUploader(subdir) {
  const dir = path.join(__dirname, '../uploads', subdir);
  fs.mkdirSync(dir, { recursive: true });
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, dir),
      filename:    (req, file, cb) => {
        const ext  = path.extname(file.originalname).toLowerCase() || '.jpg';
        const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
        cb(null, name);
      },
    }),
    limits:     { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true);
      else cb(new Error('Only image files are allowed'));
    },
  });
}
const uploadArchiveImage = makeDiskUploader('archives');
const uploadPersonPhoto  = makeDiskUploader('people');
const uploadSourceFile   = makeDiskUploader('sources');

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../client'), { index: false }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    ok:            true,
    anthropicKey:  !!process.env.ANTHROPIC_API_KEY,
    airtableKey:   !!process.env.AIRTABLE_API_KEY,
    airtableBase:  !!process.env.AIRTABLE_BASE_ID,
  });
});

// ── Search ─────────────────────────────────────────────────────────────────────
app.get('/api/search', async (req, res) => {
  const q = req.query.q || '';
  if (q.trim().length < 2) return res.json([]);
  try {
    const results = await airtable.searchAll(q);
    res.json(results);
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Dashboard ──────────────────────────────────────────────────────────────────
app.get('/api/dashboard', async (req, res) => {
  try {
    const data = await airtable.getDashboardCounts();
    res.json(data);
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Ancestors ──────────────────────────────────────────────────────────────────
app.get('/api/ancestors', async (req, res) => {
  try {
    const ancestors = await airtable.getAllAncestors();
    res.json(ancestors);
  } catch (err) {
    console.error('Ancestors error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ancestor/:id', async (req, res) => {
  try {
    const profile = await airtable.getAncestorProfile(req.params.id);
    res.json(profile);
  } catch (err) {
    console.error('Ancestor profile error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Delete a person record ─────────────────────────────────────────────────────
app.delete('/api/ancestor/:id', async (req, res) => {
  try {
    await airtable.deleteRecord('People', req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Merge two person records (keep primary, absorb fields, delete duplicate) ──
app.post('/api/merge-ancestors', async (req, res) => {
  const { keepId, deleteId } = req.body;
  if (!keepId || !deleteId) return res.status(400).json({ error: 'keepId and deleteId required.' });
  try {
    const result = await airtable.mergeAncestors(keepId, deleteId);
    res.json({ ok: true, merged: result });
  } catch (err) {
    console.error('Merge error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Research Questions ─────────────────────────────────────────────────────────
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await airtable.getAllQuestions();
    res.json(questions);
  } catch (err) {
    console.error('Questions error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Sources ────────────────────────────────────────────────────────────────────
app.get('/api/sources-all', async (req, res) => {
  try {
    const sources = await airtable.getAllSources();
    res.json(sources);
  } catch (err) {
    console.error('Sources-all error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sources/:ancestorId', async (req, res) => {
  try {
    const sources = await airtable.getSourcesByAncestor(req.params.ancestorId);
    res.json(sources);
  } catch (err) {
    console.error('Sources error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Research Log ──────────────────────────────────────────────────────────────
app.get('/api/research-log', async (req, res) => {
  try {
    const entries = await airtable.getAllResearchLog();
    res.json(entries);
  } catch (err) {
    console.error('Research log error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DNA (all records, both tables) ────────────────────────────────────────────
app.get('/api/dna-all', async (req, res) => {
  try {
    const [testing, matches] = await Promise.all([
      airtable.getAllDNATesting(),
      airtable.getAllDNAMatches(),
    ]);
    res.json({ testing, matches });
  } catch (err) {
    console.error('DNA-all error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Archives ───────────────────────────────────────────────────────────────────
app.get('/api/archives', async (req, res) => {
  try {
    const archives = await airtable.getAllArchives();
    res.json(archives);
  } catch (err) {
    console.error('Archives error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Collections ────────────────────────────────────────────────────────────────
app.get('/api/collections', async (req, res) => {
  try {
    const collections = await airtable.getAllCollections();
    res.json(collections);
  } catch (err) {
    console.error('Collections error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Archives + Collections combined ────────────────────────────────────────────
app.get('/api/archives-full', async (req, res) => {
  try {
    const [archives, collections] = await Promise.all([
      airtable.getAllArchives(),
      airtable.getAllCollections(),
    ]);
    res.json({ archives, collections });
  } catch (err) {
    console.error('Archives-full error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Generic CRUD ───────────────────────────────────────────────────────────────
app.post('/api/record/:table', async (req, res) => {
  try {
    const record = await airtable.createAnyRecord(req.params.table, req.body.fields);
    res.json({ ok: true, record });
  } catch (err) {
    console.error('Create record error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/record/:table/:id', async (req, res) => {
  try {
    const record = await airtable.updateAnyRecord(req.params.table, req.params.id, req.body.fields);
    res.json({ ok: true, record });
  } catch (err) {
    console.error('Update record error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/record/:table/:id', async (req, res) => {
  try {
    await airtable.deleteAnyRecord(req.params.table, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete record error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/table-fields/:table', async (req, res) => {
  try {
    const fields = await airtable.getTableFields(req.params.table);
    res.json(fields);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── AI Research (streaming) ────────────────────────────────────────────────────
app.post('/api/research', async (req, res) => {
  const { name, birthYear, location, relatives, questions, selectedCategories, locationFilters } = req.body;
  if (!name) return res.status(400).json({ error: 'Ancestor name is required.' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    await anthropic.runResearch(
      { name, birthYear, location, relatives, questions, selectedCategories, locationFilters },
      (chunk) => {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
    );
    res.write('data: [DONE]\n\n');
  } catch (err) {
    console.error('Research error:', err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    res.end();
  }
});

// ── Chat follow-up ─────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { history, message, selectedCategories } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required.' });
  try {
    const result = await anthropic.continueChat(history || [], message, selectedCategories);
    res.json(result);
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Save findings to Airtable ──────────────────────────────────────────────────
app.post('/api/save-findings', async (req, res) => {
  const { sources = [], ancestors = [], questions = [], dnaMatches = [], ancestorId } = req.body;
  const saved = { sources: [], ancestors: [], questions: [], dnaMatches: [] };

  try {
    for (const s of sources) {
      const record = await airtable.saveSource({ ...s, ancestorId });
      if (record) saved.sources.push(record);
    }
    for (const a of ancestors) {
      const record = await airtable.saveAncestor(a);
      if (record) saved.ancestors.push(record);
    }
    for (const q of questions) {
      const record = await airtable.saveQuestion(q, ancestorId);
      if (record) saved.questions.push(record);
    }
    for (const d of dnaMatches) {
      const record = await airtable.saveDNAMatch(d, ancestorId);
      if (record) saved.dnaMatches.push(record);
    }
    res.json({ ok: true, saved });
  } catch (err) {
    console.error('Save findings error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Save Research Log entry ────────────────────────────────────────────────────
app.post('/api/save-research-log', async (req, res) => {
  try {
    const record = await airtable.saveResearchLog(req.body);
    res.json({ ok: true, record });
  } catch (err) {
    console.error('Research log save error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Archive metadata via Vision ────────────────────────────────────────────────
app.post('/api/metadata', upload.single('image'), async (req, res) => {
  try {
    let base64, mediaType;

    if (req.file) {
      base64    = req.file.buffer.toString('base64');
      mediaType = req.file.mimetype;
    } else if (req.body.base64) {
      // Support base64 sent as JSON body
      const dataUrl = req.body.base64;
      const match   = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mediaType = match[1];
        base64    = match[2];
      } else {
        base64    = dataUrl;
        mediaType = 'image/jpeg';
      }
    } else {
      return res.status(400).json({ error: 'No image provided.' });
    }

    const standard = req.body.standard || 'general';
    const metadata = await anthropic.generateMetadata(base64, mediaType, standard);
    res.json(metadata);
  } catch (err) {
    console.error('Metadata error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Upload archive image (saves to /uploads/archives/, returns URL) ────────────
app.post('/api/upload-archive-image', uploadArchiveImage.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided.' });
    const imageUrl = `/uploads/archives/${req.file.filename}`;
    res.json({ ok: true, imageUrl, filename: req.file.filename });
  } catch (err) {
    console.error('Upload archive image error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Upload person photo ────────────────────────────────────────────────────────
app.post('/api/upload-person-photo', uploadPersonPhoto.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided.' });
    const imageUrl = `/uploads/people/${req.file.filename}`;
    res.json({ ok: true, imageUrl, filename: req.file.filename });
  } catch (err) {
    console.error('Upload person photo error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Upload source file ────────────────────────────────────────────────────────
app.post('/api/upload-source-file', uploadSourceFile.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided.' });
    const imageUrl = `/uploads/sources/${req.file.filename}`;
    res.json({ ok: true, imageUrl, filename: req.file.filename });
  } catch (err) {
    console.error('Upload source file error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Save archive record (supports imageUrl + aiMetadata) ─────────────────────
app.post('/api/save-archive', async (req, res) => {
  try {
    const record = await airtable.saveArchive(req.body);
    res.json({ ok: true, record });
  } catch (err) {
    console.error('Save archive error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Landing page at root ───────────────────────────────────────────────────────
// ── Family Tree data ───────────────────────────────────────────────────────────
app.get('/api/family-tree', async (req, res) => {
  try {
    const people = await airtable.getFamilyTreeData();
    const gedcom = loadGedcomCache();

    if (!gedcom) {
      // No GEDCOM data yet — return legacy format (array of people)
      return res.json({ people, families: [], gedcomLoaded: false });
    }

    // Enrich each Airtable person with their GEDCOM relationship pointers
    const enriched = people.map(p => {
      const gedcomId = gedcom.reverseMap[p.id];
      if (!gedcomId) return p;
      const indi = gedcom.indiByGedcomId[gedcomId] || {};
      return { ...p, gedcomId, famcId: indi.famcId || null, famsIds: indi.famsIds || [] };
    });

    res.json({
      people:       enriched,
      families:     gedcom.families,
      gedcomRootId: gedcom.rootId,
      gedcomLoaded: true,
      overrides:    loadOverrides(),
    });
  } catch (err) {
    console.error('Family tree error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Save / update a parent connection ────────────────────────────────────────
// Body: { childId, fatherId, motherId }  (Airtable record IDs; null to clear)
app.post('/api/family-tree/connect', (req, res) => {
  try {
    const { childId, fatherId, motherId } = req.body || {};
    if (!childId) return res.status(400).json({ error: 'childId required' });

    const overrides = loadOverrides();

    if (!fatherId && !motherId) {
      // Nothing to save — treat as remove
      delete overrides[childId];
    } else {
      overrides[childId] = {
        fatherId: fatherId || null,
        motherId: motherId || null,
      };
    }

    saveOverrides(overrides);
    res.json({ ok: true, overrides });
  } catch (err) {
    console.error('Connect error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Remove a parent connection ────────────────────────────────────────────────
app.delete('/api/family-tree/connect/:childId', (req, res) => {
  try {
    const { childId } = req.params;
    const overrides = loadOverrides();
    delete overrides[childId];
    saveOverrides(overrides);
    res.json({ ok: true });
  } catch (err) {
    console.error('Remove connection error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Bust GEDCOM cache after a fresh import (call this if you re-run the importer)
app.post('/api/family-tree/reload', (req, res) => {
  _gedcomCache = null;
  const loaded = loadGedcomCache();
  res.json({ ok: true, gedcomLoaded: !!loaded });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/landing.html'));
});

// ── Research app ───────────────────────────────────────────────────────────────
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// ── Catch-all: unknown routes → landing ───────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/landing.html'));
});

// ── Start server ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🌿 Legacy Research server running at http://localhost:${PORT}`);
  console.log(`   Anthropic API key : ${process.env.ANTHROPIC_API_KEY ? '✓ loaded' : '✗ MISSING'}`);
  console.log(`   Airtable API key  : ${process.env.AIRTABLE_API_KEY  ? '✓ loaded' : '✗ MISSING'}`);
  console.log(`   Airtable Base ID  : ${process.env.AIRTABLE_BASE_ID  ? '✓ loaded' : '✗ MISSING'}\n`);
});
