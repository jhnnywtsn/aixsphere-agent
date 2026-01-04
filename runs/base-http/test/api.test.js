import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../server.js';

async function createTempDb(seed = { users: [], projects: [], notes: [] }) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'projects-notes-'));
  const dbFile = path.join(dir, 'db.json');
  await writeFile(dbFile, JSON.stringify(seed, null, 2), 'utf8');
  return dbFile;
}

async function api(base, token, path, options = {}) {
  const headers = options.headers || {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

test('auth and project/note CRUD', async () => {
  const dbFile = await createTempDb();
  const { port, stop } = await startServer({ dataFile: dbFile });
  try {
    const base = `http://localhost:${port}`;

    const login = await api(base, null, '/api/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@example.com', password: 'pw' }),
    });
    assert.equal(login.res.status, 401);

    const register = await api(base, null, '/api/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@example.com', password: 'pw' }),
    });
    assert.equal(register.res.status, 201);

    const goodLogin = await api(base, null, '/api/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@example.com', password: 'pw' }),
    });
    assert.equal(goodLogin.res.status, 200);
    const token = goodLogin.body.token;
    assert.ok(token);

    const createProject = await api(base, token, '/api/projects', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test Project', description: 'demo' }),
    });
    assert.equal(createProject.res.status, 201);
    const projectId = createProject.body.id;

    const createNote = await api(base, token, `/api/projects/${projectId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body: 'first note' }),
    });
    assert.equal(createNote.res.status, 201);
    const noteId = createNote.body.id;

    const list = await api(base, token, '/api/projects');
    assert.equal(list.res.status, 200);
    assert.equal(list.body.projects.length, 1);
    assert.equal(list.body.projects[0].notes.length, 1);

    const updateNote = await api(base, token, `/api/projects/${projectId}/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify({ body: 'updated', status: 'closed' }),
    });
    assert.equal(updateNote.res.status, 200);
    assert.equal(updateNote.body.status, 'closed');

    const deleteNote = await api(base, token, `/api/projects/${projectId}/notes/${noteId}`, {
      method: 'DELETE',
    });
    assert.equal(deleteNote.res.status, 204);

    const deleteProject = await api(base, token, `/api/projects/${projectId}`, {
      method: 'DELETE',
    });
    assert.equal(deleteProject.res.status, 204);
  } finally {
    await stop();
  }
});

test('authorization prevents cross-user access', async () => {
  const dbFile = await createTempDb();
  const { port, stop } = await startServer({ dataFile: dbFile });
  try {
    const base = `http://localhost:${port}`;
    const [userA, userB] = await Promise.all(
      ['a@example.com', 'b@example.com'].map((email) =>
        api(base, null, '/api/register', { method: 'POST', body: JSON.stringify({ email, password: 'pw' }) })
      )
    );
    assert.equal(userA.res.status, 201);
    assert.equal(userB.res.status, 201);

    const loginA = await api(base, null, '/api/login', { method: 'POST', body: JSON.stringify({ email: 'a@example.com', password: 'pw' }) });
    const tokenA = loginA.body.token;
    const loginB = await api(base, null, '/api/login', { method: 'POST', body: JSON.stringify({ email: 'b@example.com', password: 'pw' }) });
    const tokenB = loginB.body.token;

    const projectA = await api(base, tokenA, '/api/projects', { method: 'POST', body: JSON.stringify({ title: 'A' }) });
    const projectId = projectA.body.id;

    const forbidden = await api(base, tokenB, `/api/projects/${projectId}`, { method: 'GET' });
    assert.equal(forbidden.res.status, 404);
  } finally {
    await stop();
  }
});
