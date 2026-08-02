require('dotenv').config({ path: require('path').join(__dirname, '../.env'), override: true });

const express  = require('express');
const cors     = require('cors');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const crypto   = require('crypto');

const db        = require('./db-mysql');
const anthropic = require('./anthropic');
const { hashPassword, checkPassword, signToken, requireAuth } = require('./auth');
const { buildGedcomIndex, computeRelationships } = require('./relationships');

// ── GEDCOM cache ───────────────────────────────────────────────────────────────
const GEDCOM_MAP_FILE  = path.join(__dirname, 'gedcom-map.json');
const GEDCOM_DATA_FILE = path.join(__dirname, 'gedcom-data.json');
let _gedcomCache = null;

function loadGedcomCache() {
  if (_gedcomCache) return _gedcomCache;
  if (!fs.existsSync(GEDCOM_MAP_FILE) || !fs.existsSync(GEDCOM_DATA_FILE)) return null;
  try {
    const map  = JSON.parse(fs.readFileSync(GEDCOM_MAP_FILE,  'utf8'));
    const data = JSON.parse(fs.readFileSync(GEDCOM_DATA_FILE, 'utf8'));
    _gedcomCache = buildGedcomIndex(map, data);
    return _gedcomCache;
  } catch (err) {
    console.warn('Could not load GEDCOM data:', err.message);
    return null;
  }
}

const app = express();

// ── Multer ─────────────────────────────────────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function makeDiskUploader(subdir) {
  const dir = path.join(__dirname, '../uploads', subdir);
  fs.mkdirSync(dir, { recursive: true });
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, dir),
      filename:    (req, file, cb) => {
        const ext  = path.extname(file.originalname).toLowerCase() || '.jpg';
        cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
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

// ── Email helper ───────────────────────────────────────────────────────────────
function getMailer() {
  const nodemailer = require('nodemailer');
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.hostinger.com',
    port:   Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// ── Auth routes (public) ───────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  try {
    const existing = await db.getUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });
    const passwordHash = await hashPassword(password);
    const user  = await db.createUser({ email, passwordHash, name });
    const token = signToken({ userId: user.id, email: user.email });
    res.json({ ok: true, token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  try {
    const user = await db.getUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });
    const ok = await checkPassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password.' });
    const token = signToken({ userId: user.id, email: user.email });
    res.json({ ok: true, token, user: { id: user.id, email: user.email, name: user.name, plan: user.plan } });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => res.json({ ok: true }));

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  try {
    const user = await db.getUserByEmail(email);
    if (!user) return res.json({ ok: true }); // don't reveal if email exists
    const token   = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour
    await db.storeResetToken(user.id, token, expires);
    const appUrl   = process.env.APP_URL || 'https://kriogriot.com';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    const mailer = getMailer();
    await mailer.sendMail({
      from:    process.env.SMTP_FROM || process.env.SMTP_USER,
      to:      user.email,
      subject: 'Krio Griot — Reset Your Password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#c8a96e">Krio Griot</h2>
          <p>Hi ${user.name || 'there'},</p>
          <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
          <p style="margin:2rem 0">
            <a href="${resetUrl}" style="background:#c8a96e;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Reset Password</a>
          </p>
          <p style="color:#888;font-size:0.85rem">If you did not request a password reset, you can ignore this email.</p>
        </div>
      `,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Failed to send reset email. Please check your email address and try again.' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  try {
    const record = await db.getResetToken(token);
    if (!record) return res.status(400).json({ error: 'Invalid or expired reset link.' });
    if (new Date(record.expires_at) < new Date()) {
      await db.clearResetToken(token);
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }
    const passwordHash = await hashPassword(password);
    await db.updateUserPassword(record.user_id, passwordHash);
    await db.clearResetToken(token);
    res.json({ ok: true });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Health check (public) ──────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true, anthropicKey: !!process.env.ANTHROPIC_API_KEY });
});

// ── All routes below require auth ──────────────────────────────────────────────
app.use('/api', requireAuth);

// ── Search ─────────────────────────────────────────────────────────────────────
app.get('/api/search', async (req, res) => {
  const term = req.query.q || '';
  if (term.trim().length < 2) return res.json([]);
  try {
    res.json(await db.searchAll(req.user.userId, term));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Dashboard ──────────────────────────────────────────────────────────────────
app.get('/api/dashboard', async (req, res) => {
  try {
    res.json(await db.getDashboardCounts(req.user.userId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Ancestors ──────────────────────────────────────────────────────────────────
app.get('/api/ancestors', async (req, res) => {
  try {
    res.json(await db.getAllAncestors(req.user.userId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ancestor/:id', async (req, res) => {
  try {
    const profile = await db.getAncestorProfile(req.user.userId, req.params.id);
    if (!profile) return res.status(404).json({ error: 'Not found.' });
    const relationships = await getRelationshipsFor(req.user.userId, req.params.id);
    res.json({ ...profile, relationships });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/ancestor/:id', async (req, res) => {
  try {
    await db.deletePerson(req.user.userId, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/merge-ancestors', async (req, res) => {
  res.json({ ok: true, merged: {} });
});

// ── Relationships ──────────────────────────────────────────────────────────────
async function getRelationshipsFor(userId, recordId) {
  try {
    const gedcom = loadGedcomCache();
    const people = await db.getFamilyTreeData(userId);
    const peopleById = {};
    for (const p of (people || [])) peopleById[p.id] = p;

    const connections = await db.getFamilyConnections(userId);
    const overrides = {};
    for (const c of connections) {
      overrides[String(c.child_id)] = { fatherId: c.father_id ? String(c.father_id) : null, motherId: c.mother_id ? String(c.mother_id) : null };
    }

    return computeRelationships(recordId, peopleById, gedcom, overrides);
  } catch (err) {
    return { parents: [], spouses: [], children: [] };
  }
}

// ── Research Questions ─────────────────────────────────────────────────────────
app.get('/api/questions', async (req, res) => {
  try { res.json(await db.getAllQuestions(req.user.userId)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Sources ────────────────────────────────────────────────────────────────────
app.get('/api/sources-all', async (req, res) => {
  try { res.json(await db.getAllSources(req.user.userId)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/sources/:ancestorId', async (req, res) => {
  try { res.json(await db.getAllSources(req.user.userId)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Research Log ───────────────────────────────────────────────────────────────
app.get('/api/research-log', async (req, res) => {
  try { res.json(await db.getAllResearchLog(req.user.userId)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DNA ────────────────────────────────────────────────────────────────────────
app.get('/api/dna-all', async (req, res) => {
  try {
    const [testing, matches] = await Promise.all([
      db.getAllDNATesting(req.user.userId),
      db.getAllDNAMatches(req.user.userId),
    ]);
    res.json({ testing, matches });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Archives ───────────────────────────────────────────────────────────────────
app.get('/api/archives', async (req, res) => {
  try { res.json(await db.getAllArchives(req.user.userId)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Collections ────────────────────────────────────────────────────────────────
app.get('/api/collections', async (req, res) => {
  try { res.json(await db.getAllCollections(req.user.userId)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/archives-full', async (req, res) => {
  try {
    const [archives, collections] = await Promise.all([
      db.getAllArchives(req.user.userId),
      db.getAllCollections(req.user.userId),
    ]);
    res.json({ archives, collections });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Generic CRUD ───────────────────────────────────────────────────────────────
app.post('/api/record/:table', async (req, res) => {
  try {
    const record = await db.createAnyRecord(req.user.userId, req.params.table, req.body.fields);
    res.json({ ok: true, record });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/record/:table/:id', async (req, res) => {
  try {
    await db.updateAnyRecord(req.user.userId, req.params.table, req.params.id, req.body.fields);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/record/:table/:id', async (req, res) => {
  try {
    await db.deleteAnyRecord(req.user.userId, req.params.table, req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/table-fields/:table', async (req, res) => {
  try { res.json(await db.getTableFields(req.params.table)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── AI Research ────────────────────────────────────────────────────────────────
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
      (chunk) => res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`)
    );
    res.write('data: [DONE]\n\n');
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    res.end();
  }
});

app.post('/api/chat', async (req, res) => {
  const { history, message, selectedCategories } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required.' });
  try {
    res.json(await anthropic.continueChat(history || [], message, selectedCategories));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Save findings ──────────────────────────────────────────────────────────────
app.post('/api/save-findings', async (req, res) => {
  const { sources = [], ancestors = [], questions = [], dnaMatches = [], ancestorId } = req.body;
  const saved = { sources: [], ancestors: [], questions: [], dnaMatches: [] };
  const uid = req.user.userId;
  try {
    for (const s of sources) { const r = await db.saveSource(uid, { ...s, ancestorId }); if (r) saved.sources.push(r); }
    for (const a of ancestors) { const r = await db.saveAncestor(uid, a); if (r) saved.ancestors.push(r); }
    for (const q of questions) { const r = await db.saveQuestion(uid, q); if (r) saved.questions.push(r); }
    for (const d of dnaMatches) { const r = await db.saveDNAMatch(uid, d); if (r) saved.dnaMatches.push(r); }
    res.json({ ok: true, saved });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/save-research-log', async (req, res) => {
  try {
    const record = await db.saveResearchLog(req.user.userId, req.body);
    res.json({ ok: true, record });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Metadata via Vision ────────────────────────────────────────────────────────
app.post('/api/metadata', upload.single('image'), async (req, res) => {
  try {
    let base64, mediaType;
    if (req.file) {
      base64 = req.file.buffer.toString('base64');
      mediaType = req.file.mimetype;
    } else if (req.body.base64) {
      const match = req.body.base64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) { mediaType = match[1]; base64 = match[2]; }
      else { base64 = req.body.base64; mediaType = 'image/jpeg'; }
    } else {
      return res.status(400).json({ error: 'No image provided.' });
    }
    const metadata = await anthropic.generateMetadata(base64, mediaType, req.body.standard || 'general');
    res.json(metadata);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── File uploads ───────────────────────────────────────────────────────────────
app.post('/api/upload-archive-image', uploadArchiveImage.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file provided.' });
  res.json({ ok: true, imageUrl: `/uploads/archives/${req.file.filename}` });
});

app.post('/api/upload-person-photo', uploadPersonPhoto.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file provided.' });
  res.json({ ok: true, imageUrl: `/uploads/people/${req.file.filename}` });
});

app.post('/api/upload-source-file', uploadSourceFile.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided.' });
  res.json({ ok: true, imageUrl: `/uploads/sources/${req.file.filename}` });
});

app.post('/api/save-archive', async (req, res) => {
  try {
    const record = await db.saveArchive(req.user.userId, req.body);
    res.json({ ok: true, record });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Family Tree ────────────────────────────────────────────────────────────────
app.get('/api/family-tree', async (req, res) => {
  try {
    const people = await db.getFamilyTreeData(req.user.userId);
    res.json({ people, families: [], gedcomLoaded: false });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/family-tree/connect', async (req, res) => {
  try {
    const { childId, fatherId, motherId } = req.body || {};
    if (!childId) return res.status(400).json({ error: 'childId required' });
    if (!fatherId && !motherId) {
      await db.removeFamilyConnection(req.user.userId, childId);
    } else {
      await db.saveFamilyConnection(req.user.userId, { childId, fatherId, motherId });
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/family-tree/connect/:childId', async (req, res) => {
  try {
    await db.removeFamilyConnection(req.user.userId, req.params.childId);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/family-tree/reload', (req, res) => {
  _gedcomCache = null;
  res.json({ ok: true, gedcomLoaded: false });
});

// ── Pages ──────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../client/landing.html')));
app.get('/app', (req, res) => res.sendFile(path.join(__dirname, '../client/index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../client/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, '../client/login.html')));
app.get('/forgot-password', (req, res) => res.sendFile(path.join(__dirname, '../client/login.html')));
app.get('/reset-password', (req, res) => res.sendFile(path.join(__dirname, '../client/login.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/landing.html')));

// ── Start ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🌿 Krio Griot server running at http://localhost:${PORT}`);
  console.log(`   Anthropic API key : ${process.env.ANTHROPIC_API_KEY ? '✓ loaded' : '✗ MISSING'}`);
  console.log(`   MySQL host        : ${process.env.MYSQL_HOST || 'localhost'}`);
  console.log(`   MySQL database    : ${process.env.MYSQL_DATABASE || '(not set)'}`);
  console.log(`   SMTP user         : ${process.env.SMTP_USER || '(not set — forgot password email disabled)'}\n`);
});
