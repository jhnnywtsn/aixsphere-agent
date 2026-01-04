import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../server.js';

async function createTempDb(seed = { users: [], projects: [], notes: [] }) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'projects-notes-express-'));
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

test('auth and project/note CRUD (express)', async () => {
  const dbFile = await createTempDb();
  const { port, stop } = await startServer({ dataFile: dbFile });
  try {
    const base = `http://localhost:${port}`;

    const register = await api(base, null, '/api/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@example.com', password: 'pw' }),
    });
    assert.equal(register.res.status, 201);

    const login = await api(base, null, '/api/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@example.com', password: 'pw' }),
    });
    const token = login.body.token;
    assert.ok(token);

    const project = await api(base, token, '/api/projects', { method: 'POST', body: JSON.stringify({ title: 'A' }) });
    assert.equal(project.res.status, 201);
    const projectId = project.body.id;

    const note = await api(base, token, `/api/projects/${projectId}/notes`, { method: 'POST', body: JSON.stringify({ body: 'hi' }) });
    assert.equal(note.res.status, 201);
    const noteId = note.body.id;

    const list = await api(base, token, '/api/projects');
    assert.equal(list.res.status, 200);
    assert.equal(list.body.projects[0].notes.length, 1);

    const deleteNote = await api(base, token, `/api/projects/${projectId}/notes/${noteId}`, { method: 'DELETE' });
    assert.equal(deleteNote.res.status, 204);

    const deleteProject = await api(base, token, `/api/projects/${projectId}`, { method: 'DELETE' });
    assert.equal(deleteProject.res.status, 204);
  } finally {
    await stop();
  }
});

test('express guards cross-user access', async () => {
  const dbFile = await createTempDb();
  const { port, stop } = await startServer({ dataFile: dbFile });
  try {
    const base = `http://localhost:${port}`;

    await api(base, null, '/api/register', { method: 'POST', body: JSON.stringify({ email: 'a@example.com', password: 'pw' }) });
    await api(base, null, '/api/register', { method: 'POST', body: JSON.stringify({ email: 'b@example.com', password: 'pw' }) });

    const tokenA = (await api(base, null, '/api/login', { method: 'POST', body: JSON.stringify({ email: 'a@example.com', password: 'pw' }) })).body.token;
    const tokenB = (await api(base, null, '/api/login', { method: 'POST', body: JSON.stringify({ email: 'b@example.com', password: 'pw' }) })).body.token;

    const projectA = await api(base, tokenA, '/api/projects', { method: 'POST', body: JSON.stringify({ title: 'A' }) });
    const projectId = projectA.body.id;

    const forbidden = await api(base, tokenB, `/api/projects/${projectId}`, { method: 'GET' });
    assert.equal(forbidden.res.status, 404);
  } finally {
    await stop();
  }
});
