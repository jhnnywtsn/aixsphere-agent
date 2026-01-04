const state = {
  token: null,
  projects: [],
};

const authStatus = document.getElementById('auth-status');
const projectList = document.getElementById('project-list');

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    authStatus.textContent = 'Login failed. Registering...';
    const reg = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!reg.ok) {
      authStatus.textContent = 'Register/login failed.';
      return;
    }
    return document.getElementById('login-form').dispatchEvent(new Event('submit'));
  }

  const data = await res.json();
  state.token = data.token;
  authStatus.textContent = `Logged in as ${email}`;
  document.getElementById('projects').style.display = 'block';
  loadProjects();
});

document.getElementById('project-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('project-title').value;
  const description = document.getElementById('project-description').value;
  await fetch('/api/projects', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ title, description }),
  });
  e.target.reset();
  loadProjects();
});

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${state.token}`,
  };
}

async function loadProjects() {
  const res = await fetch('/api/projects', { headers: authHeaders() });
  if (!res.ok) return;
  const data = await res.json();
  state.projects = data.projects || [];
  renderProjects();
}

function renderProjects() {
  projectList.innerHTML = '';
  state.projects.forEach((project) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'project';
    wrapper.innerHTML = `
      <strong>${project.title}</strong> — ${project.description || ''}
      <button data-action="delete" data-id="${project.id}">Delete</button>
      <div class="notes" data-project="${project.id}">
        <ul>
          ${(project.notes || [])
            .map((n) => `<li>${n.body} (${n.status}) <button data-action="delete-note" data-project="${project.id}" data-id="${n.id}">x</button></li>`)
            .join('')}
        </ul>
        <form data-action="add-note" data-project="${project.id}">
          <input type="text" name="note" placeholder="New note" required />
          <button type="submit">Add</button>
        </form>
      </div>
    `;
    projectList.appendChild(wrapper);
  });
}

projectList.addEventListener('click', async (e) => {
  if (e.target.dataset.action === 'delete') {
    await fetch(`/api/projects/${e.target.dataset.id}`, { method: 'DELETE', headers: authHeaders() });
    loadProjects();
  }
  if (e.target.dataset.action === 'delete-note') {
    const { id, project } = e.target.dataset;
    await fetch(`/api/projects/${project}/notes/${id}`, { method: 'DELETE', headers: authHeaders() });
    loadProjects();
  }
});

projectList.addEventListener('submit', async (e) => {
  if (e.target.dataset.action === 'add-note') {
    e.preventDefault();
    const projectId = e.target.dataset.project;
    const body = e.target.note.value;
    await fetch(`/api/projects/${projectId}/notes`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ body }),
    });
    e.target.reset();
    loadProjects();
  }
});
