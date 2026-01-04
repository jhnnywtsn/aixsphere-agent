import { createServer } from 'http';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import { randomUUID, createHash } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse as parseUrl } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultDataFile = path.join(__dirname, 'data', 'db.json');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

async function ensureDataFile(dataFile) {
  const dir = path.dirname(dataFile);
  await mkdir(dir, { recursive: true });
  if (!existsSync(dataFile)) {
    const seed = { users: [], projects: [], notes: [] };
    await writeFile(dataFile, JSON.stringify(seed, null, 2), 'utf8');
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

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function respond(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

async function authenticate(req, ctx) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice('Bearer '.length);
  return ctx.tokens.get(token) || null;
}

function validateNonEmpty(value) {
  return value && typeof value === 'string' && value.trim().length > 0;
}

function serveStatic(res, filePath) {
  const ext = path.extname(filePath);
  const type = contentTypes[ext] || 'text/plain';
  res.writeHead(200, { 'Content-Type': type });
  createReadStream(filePath).pipe(res);
}

function createHandler(ctx) {
  return async function handler(req, res) {
    const { pathname } = parseUrl(req.url, true);

    // Serve static assets
    if (req.method === 'GET' && (pathname === '/' || pathname.startsWith('/public'))) {
      const target = pathname === '/' ? path.join(__dirname, 'public', 'index.html') : path.join(__dirname, pathname);
      if (existsSync(target)) {
        return serveStatic(res, target);
      }
    }

    // Auth routes
    if (req.method === 'POST' && pathname === '/api/register') {
      try {
        const body = await parseBody(req);
        if (!validateNonEmpty(body.email) || !validateNonEmpty(body.password)) {
          return respond(res, 400, { error: 'Email and password are required.' });
        }

        const db = await ctx.readDb();
        const exists = db.users.find((u) => u.email === body.email);
        if (exists) return respond(res, 409, { error: 'User already exists.' });

        const user = { id: randomUUID(), email: body.email, passwordHash: hashPassword(body.password) };
        db.users.push(user);
        await ctx.writeDb(db);
        return respond(res, 201, { id: user.id, email: user.email });
      } catch (err) {
        return respond(res, 400, { error: 'Invalid request.' });
      }
    }

    if (req.method === 'POST' && pathname === '/api/login') {
      const body = await parseBody(req);
      const db = await ctx.readDb();
      const user = db.users.find((u) => u.email === body.email);
      if (!user || user.passwordHash !== hashPassword(body.password || '')) {
        return respond(res, 401, { error: 'Invalid credentials.' });
      }
      const token = randomUUID();
      ctx.tokens.set(token, user.id);
      return respond(res, 200, { token });
    }

    // Authenticated routes
    if (pathname.startsWith('/api')) {
      const userId = await authenticate(req, ctx);
      if (!userId) return respond(res, 401, { error: 'Unauthorized' });

      // Projects collection
      if (req.method === 'GET' && pathname === '/api/projects') {
        const db = await ctx.readDb();
        const projects = db.projects.filter((p) => p.ownerId === userId).map((p) => ({
          ...p,
          notes: db.notes.filter((n) => n.projectId === p.id && n.ownerId === userId),
        }));
        return respond(res, 200, { projects });
      }

      if (req.method === 'POST' && pathname === '/api/projects') {
        const body = await parseBody(req);
        if (!validateNonEmpty(body.title)) return respond(res, 400, { error: 'Title is required.' });
        const db = await ctx.readDb();
        const project = {
          id: randomUUID(),
          ownerId: userId,
          title: body.title.trim(),
          description: (body.description || '').trim(),
        };
        db.projects.push(project);
        await ctx.writeDb(db);
        return respond(res, 201, project);
      }

      // Project item routes
      const projectMatch = pathname.match(/^\/api\/projects\/([\w-]+)$/);
      if (projectMatch) {
        const projectId = projectMatch[1];
        const db = await ctx.readDb();
        const project = db.projects.find((p) => p.id === projectId && p.ownerId === userId);
        if (!project) return respond(res, 404, { error: 'Not found' });

        if (req.method === 'GET') {
          const notes = db.notes.filter((n) => n.projectId === projectId && n.ownerId === userId);
          return respond(res, 200, { ...project, notes });
        }

        if (req.method === 'PUT') {
          const body = await parseBody(req);
          if (!validateNonEmpty(body.title)) return respond(res, 400, { error: 'Title is required.' });
          project.title = body.title.trim();
          project.description = (body.description || '').trim();
          await ctx.writeDb(db);
          return respond(res, 200, project);
        }

        if (req.method === 'DELETE') {
          db.projects = db.projects.filter((p) => p.id !== projectId);
          db.notes = db.notes.filter((n) => n.projectId !== projectId);
          await ctx.writeDb(db);
          return respond(res, 204, {});
        }
      }

      // Notes
      const notesMatch = pathname.match(/^\/api\/projects\/([\w-]+)\/notes\/?([\w-]+)?$/);
      if (notesMatch) {
        const projectId = notesMatch[1];
        const noteId = notesMatch[2];
        const db = await ctx.readDb();
        const project = db.projects.find((p) => p.id === projectId && p.ownerId === userId);
        if (!project) return respond(res, 404, { error: 'Project not found' });

        if (req.method === 'POST' && !noteId) {
          const body = await parseBody(req);
          if (!validateNonEmpty(body.body)) return respond(res, 400, { error: 'Note body is required.' });
          const note = {
            id: randomUUID(),
            projectId,
            ownerId: userId,
            body: body.body.trim(),
            status: body.status === 'closed' ? 'closed' : 'open',
          };
          db.notes.push(note);
          await ctx.writeDb(db);
          return respond(res, 201, note);
        }

        const note = db.notes.find((n) => n.id === noteId && n.projectId === projectId && n.ownerId === userId);
        if (noteId && !note) return respond(res, 404, { error: 'Note not found' });

        if (req.method === 'PUT' && noteId) {
          const body = await parseBody(req);
          if (!validateNonEmpty(body.body)) return respond(res, 400, { error: 'Note body is required.' });
          note.body = body.body.trim();
          note.status = body.status === 'closed' ? 'closed' : 'open';
          await ctx.writeDb(db);
          return respond(res, 200, note);
        }

        if (req.method === 'DELETE' && noteId) {
          db.notes = db.notes.filter((n) => !(n.id === noteId && n.projectId === projectId && n.ownerId === userId));
          await ctx.writeDb(db);
          return respond(res, 204, {});
        }
      }
    }

    res.writeHead(404);
    res.end('Not found');
  };
}

export async function startServer(options = {}) {
  const ctx = createContext({ dataFile: options.dataFile });
  await ensureDataFile(ctx.dataFile);
  const server = createServer(createHandler(ctx));
  const port = await new Promise((resolve) => server.listen(options.port || 0, () => resolve(server.address().port)));
  return {
    server,
    port,
    stop: () => new Promise((resolve) => server.close(resolve)),
  };
}

if (process.env.NODE_ENV !== 'test' && process.argv[1] === __filename) {
  startServer({ port: process.env.PORT || 3000 }).then(({ port }) => {
    console.log(`Server running on http://localhost:${port}`);
  });
}
