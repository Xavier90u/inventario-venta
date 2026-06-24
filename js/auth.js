async function loginUser(usuario, contrasena) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ usuario, contrasena })
  });
  setToken(data.token);
  localStorage.setItem('currentUser', JSON.stringify(data.user));
  return data.user;
}

function logoutUser() {
  setToken(null);
  localStorage.removeItem('currentUser');
  window.location.href = 'index.html';
}

function getCurrentUser() {
  const user = localStorage.getItem('currentUser');
  return user ? JSON.parse(user) : null;
}

function isAdmin() {
  const user = getCurrentUser();
  return user && user.rol === 'admin';
}

function requireAuth() {
  if (!getCurrentUser()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

function requireAdmin() {
  if (!isAdmin()) {
    alert('No tiene permisos para realizar esta acción.');
    return false;
  }
  return true;
}

async function getAllUsers() {
  return await apiFetch('/users');
}

async function createUser(nombre, usuario, contrasena, rol) {
  return await apiFetch('/users', {
    method: 'POST',
    body: JSON.stringify({ nombre, usuario, contrasena, rol })
  });
}

async function deleteUser(id) {
  return await apiFetch(`/users/${id}/deactivate`, { method: 'PUT' });
}

async function updateUser(id, data) {
  return await apiFetch(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

async function hashPassword(password) {
  return password;
}
