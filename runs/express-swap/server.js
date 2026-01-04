import express from './lib/mini-express.js';
import { randomUUID, createHash } from 'crypto';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync, createReadStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultDataFile = path.join(__dirname, 'data', 'db.json');

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

async function ensureDataFile(dataFile) {
  const dir = path.dirname(dataFile);
  await mkdir(dir, { recursive: true });
  if (!existsSync(dataFile)) {
    await writeFile(dataFile, JSON.stringify({ users: [], projects: [], notes: [] }, null, 2), 'utf8');
  }
}

function createContext({ dataFile = defaultDataFile } = {}) {
  const tokens = new Map();

  async function readDb() {
    await ensureDataFile(dataFile);
    const raw = await readFile(dataFile, 'utf8');
    return JSON.parse(raw);
  }

  async function writeDb(payload) {
    await writeFile(dataFile, JSON.stringify(payload, null, 2), 'utf8');
  }

  return { dataFile, tokens, readDb, writeDb };
}

function buildApp(ctx) {
  const app = express();
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.get('/public/:asset', (req, res) => {
    const filePath = path.join(__dirname, 'public', req.params.asset);
    if (!existsSync(filePath)) return res.status(404).send('Not found');
    const stream = createReadStream(filePath);
    stream.on('error', () => res.status(500).send('Error'));
    stream.pipe(res.type(path.extname(filePath)));
  });

  app.post('/api/register', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    const db = await ctx.readDb();
    if (db.users.find((u) => u.email === email)) return res.status(409).json({ error: 'User already exists.' });
    const user = { id: randomUUID(), email, passwordHash: hashPassword(password) };
    db.users.push(user);
    await ctx.writeDb(db);
    res.status(201).json({ id: user.id, email: user.email });
  });

  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body || {};
    const db = await ctx.readDb();
    const user = db.users.find((u) => u.email === email);
    if (!user || user.passwordHash !== hashPassword(password || '')) return res.status(401).json({ error: 'Invalid credentials.' });
    const token = randomUUID();
    ctx.tokens.set(token, user.id);
    res.json({ token });
  });

  app.use('/api', async (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = auth.slice('Bearer '.length);
    const userId = ctx.tokens.get(token);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    req.userId = userId;
    next();
  });

  app.get('/api/projects', async (req, res) => {
    const db = await ctx.readDb();
    const projects = db.projects
      .filter((p) => p.ownerId === req.userId)
      .map((p) => ({ ...p, notes: db.notes.filter((n) => n.projectId === p.id && n.ownerId === req.userId) }));
    res.json({ projects });
  });

  app.post('/api/projects', async (req, res) => {
    const { title, description = '' } = req.body || {};
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required.' });
    const db = await ctx.readDb();
    const project = { id: randomUUID(), ownerId: req.userId, title: title.trim(), description: description.trim() };
    db.projects.push(project);
    await ctx.writeDb(db);
    res.status(201).json(project);
  });

  app.get('/api/projects/:id', async (req, res) => {
    const db = await ctx.readDb();
    const project = db.projects.find((p) => p.id === req.params.id && p.ownerId === req.userId);
    if (!project) return res.status(404).json({ error: 'Not found' });
    const notes = db.notes.filter((n) => n.projectId === project.id && n.ownerId === req.userId);
    res.json({ ...project, notes });
  });

  app.put('/api/projects/:id', async (req, res) => {
    const { title, description = '' } = req.body || {};
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required.' });
    const db = await ctx.readDb();
    const project = db.projects.find((p) => p.id === req.params.id && p.ownerId === req.userId);
    if (!project) return res.status(404).json({ error: 'Not found' });
    project.title = title.trim();
    project.description = description.trim();
    await ctx.writeDb(db);
    res.json(project);
  });

  app.delete('/api/projects/:id', async (req, res) => {
    const db = await ctx.readDb();
    const before = db.projects.length;
    db.projects = db.projects.filter((p) => !(p.id === req.params.id && p.ownerId === req.userId));
    db.notes = db.notes.filter((n) => n.projectId !== req.params.id || n.ownerId !== req.userId);
    if (before === db.projects.length) return res.status(404).json({ error: 'Not found' });
    await ctx.writeDb(db);
    res.status(204).json({});
  });

  app.post('/api/projects/:id/notes', async (req, res) => {
    const { body, status } = req.body || {};
    if (!body || !body.trim()) return res.status(400).json({ error: 'Note body is required.' });
    const db = await ctx.readDb();
    const project = db.projects.find((p) => p.id === req.params.id && p.ownerId === req.userId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const note = { id: randomUUID(), projectId: project.id, ownerId: req.userId, body: body.trim(), status: status === 'closed' ? 'closed' : 'open' };
    db.notes.push(note);
    await ctx.writeDb(db);
    res.status(201).json(note);
  });

  app.put('/api/projects/:projectId/notes/:noteId', async (req, res) => {
    const { body, status } = req.body || {};
    if (!body || !body.trim()) return res.status(400).json({ error: 'Note body is required.' });
    const db = await ctx.readDb();
    const note = db.notes.find((n) => n.id === req.params.noteId && n.projectId === req.params.projectId && n.ownerId === req.userId);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    note.body = body.trim();
    note.status = status === 'closed' ? 'closed' : 'open';
    await ctx.writeDb(db);
    res.json(note);
  });

  app.delete('/api/projects/:projectId/notes/:noteId', async (req, res) => {
    const db = await ctx.readDb();
    const before = db.notes.length;
    db.notes = db.notes.filter(
      (n) => !(n.id === req.params.noteId && n.projectId === req.params.projectId && n.ownerId === req.userId)
    );
    if (before === db.notes.length) return res.status(404).json({ error: 'Note not found' });
    await ctx.writeDb(db);
    res.status(204).json({});
  });

  return app;
}

export async function startServer(options = {}) {
  const ctx = createContext({ dataFile: options.dataFile });
  await ensureDataFile(ctx.dataFile);
  const app = buildApp(ctx);
  const port = await new Promise((resolve) => {
    const server = app.listen(options.port || 0, () => resolve(server.address().port));
    app.server = server;
  });
  return {
    app,
    port,
    stop: () => new Promise((resolve) => app.server.close(resolve)),
  };
}

if (process.env.NODE_ENV !== 'test' && process.argv[1] === __filename) {
  startServer({ port: process.env.PORT || 4000 }).then(({ port }) => {
    console.log(`Express server on http://localhost:${port}`);
  });
}
