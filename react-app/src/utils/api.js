const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function parseResponse(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export async function apiRequest(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const { headers: optHeaders, ...rest } = options;
  const res = await fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(optHeaders || {}),
    },
  });

  const data = await parseResponse(res);

  if (!res.ok) {
    const message = data?.detail || data?.error || data?.message || `Request failed: ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

// ── Token management (cookie-like in-memory + sessionStorage) ──

let _authToken = sessionStorage.getItem('auth_token') || null;
let _adminToken = sessionStorage.getItem('admin_token') || null;

export function setAuthToken(token) {
  _authToken = token;
  if (token) sessionStorage.setItem('auth_token', token);
  else sessionStorage.removeItem('auth_token');
}

export function getAuthToken() {
  return _authToken;
}

export function setAdminToken(token) {
  _adminToken = token;
  if (token) sessionStorage.setItem('admin_token', token);
  else sessionStorage.removeItem('admin_token');
}

function authHeaders() {
  return _authToken ? { Authorization: `Bearer ${_authToken}` } : {};
}

function adminAuthHeaders() {
  return _adminToken ? { Authorization: `Bearer ${_adminToken}` } : {};
}

// ── Auth API ────────────────────────────────────────────

export const authApi = {
  register(payload) {
    return apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  verifyEmailCode(payload) {
    return apiRequest('/api/auth/verify-email-code', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  login(payload) {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// ── Admin API ───────────────────────────────────────────

export const adminApi = {
  login(username, password) {
    return apiRequest('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  getTeachers() {
    return apiRequest('/api/admin/teachers', { headers: adminAuthHeaders() });
  },
  createTeacher(payload) {
    return apiRequest('/api/admin/teachers', {
      method: 'POST',
      headers: adminAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },
  updateTeacher(id, payload) {
    return apiRequest(`/api/admin/teachers/${id}`, {
      method: 'PUT',
      headers: adminAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },
  deleteTeacher(id) {
    return apiRequest(`/api/admin/teachers/${id}`, {
      method: 'DELETE',
      headers: adminAuthHeaders(),
    });
  },
  getStats() {
    return apiRequest('/api/admin/stats', { headers: adminAuthHeaders() });
  },
  getGroups() {
    return apiRequest('/api/admin/groups', { headers: adminAuthHeaders() });
  },
};

// ── Public API ──────────────────────────────────────────

export const publicApi = {
  getGroups() {
    return apiRequest('/api/public/groups');
  },
};

// ── Teacher API ─────────────────────────────────────────

export const teacherApi = {
  getProfile() {
    return apiRequest('/api/teacher/me', { headers: authHeaders() });
  },
  updateProfile(payload) {
    return apiRequest('/api/teacher/me', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },
  getApiKey() {
    return apiRequest('/api/teacher/me/api-key', { headers: authHeaders() });
  },
  updateApiKey(openai_key) {
    return apiRequest('/api/teacher/me/api-key', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ openai_key }),
    });
  },
  uploadPhoto(file) {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_BASE_URL}/api/teacher/me/photo`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    }).then(async res => {
      const data = await parseResponse(res);
      if (!res.ok) {
        const message = data?.detail || data?.error || data?.message || `Request failed: ${res.status}`;
        const err = new Error(message);
        err.status = res.status;
        err.data = data;
        throw err;
      }
      return data;
    });
  },


  // Groups
  getGroups() {
    return apiRequest('/api/teacher/groups', { headers: authHeaders() });
  },
  createGroup(name) {
    return apiRequest('/api/teacher/groups', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name }),
    });
  },
  deleteGroup(id) {
    return apiRequest(`/api/teacher/groups/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
  },
  getGroupStudents(groupId) {
    return apiRequest(`/api/teacher/groups/${groupId}/students`, { headers: authHeaders() });
  },
  bulkCreateStudents(group_id, students) {
    return apiRequest('/api/teacher/groups/bulk-students', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ group_id, students }),
    });
  },
  deleteStudent(id) {
    return apiRequest(`/api/teacher/students/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
  },

  // Materials
  getMaterials() {
    return apiRequest('/api/teacher/materials', { headers: authHeaders() });
  },
  uploadMaterialFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_BASE_URL}/api/teacher/materials/upload`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    }).then(async res => {
      const data = await parseResponse(res);
      if (!res.ok) {
        const message = data?.detail || data?.error || `Upload failed: ${res.status}`;
        throw new Error(message);
      }
      return data;
    });
  },
  createMaterial(payload) {
    return apiRequest('/api/teacher/materials', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },
  deleteMaterial(id) {
    return apiRequest(`/api/teacher/materials/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
  },

  // Tests
  getTests() {
    return apiRequest('/api/teacher/tests', { headers: authHeaders() });
  },
  createTest(payload) {
    return apiRequest('/api/teacher/tests', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },
  updateTest(id, payload) {
    return apiRequest(`/api/teacher/tests/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },
  deleteTest(id) {
    return apiRequest(`/api/teacher/tests/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
  },
  getTestResults(testId) {
    return apiRequest(`/api/teacher/tests/${testId}/results`, { headers: authHeaders() });
  },

  // Stats & Rating
  getStats() {
    return apiRequest('/api/teacher/stats', { headers: authHeaders() });
  },
  getRating() {
    return apiRequest('/api/teacher/rating', { headers: authHeaders() });
  },

  // Students
  getStudents() {
    return apiRequest('/api/teacher/students', { headers: authHeaders() });
  },

  // Messages
  getConversations() {
    return apiRequest('/api/teacher/messages/conversations', { headers: authHeaders() });
  },
  getMessages(partnerId) {
    return apiRequest(`/api/teacher/messages/${partnerId}`, { headers: authHeaders() });
  },
  sendMessage(to_id, text) {
    return apiRequest('/api/teacher/messages', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ to_id, text }),
    });
  },
};

// ── Student API ─────────────────────────────────────────

export const studentApi = {
  getProfile() {
    return apiRequest('/api/student/me', { headers: authHeaders() });
  },
  getTeacher() {
    return apiRequest('/api/student/teacher', { headers: authHeaders() });
  },

  // Materials
  getMaterials() {
    return apiRequest('/api/student/materials', { headers: authHeaders() });
  },

  // Tests
  getTests() {
    return apiRequest('/api/student/tests', { headers: authHeaders() });
  },
  getTest(testId) {
    return apiRequest(`/api/student/tests/${testId}`, { headers: authHeaders() });
  },
  submitTest(testId, answers) {
    return apiRequest(`/api/student/tests/${testId}/submit`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ answers }),
    });
  },
  getTestResult(testId) {
    return apiRequest(`/api/student/tests/${testId}/result`, { headers: authHeaders() });
  },
  getResults() {
    return apiRequest('/api/student/results', { headers: authHeaders() });
  },

  // Messages
  getMessages() {
    return apiRequest('/api/student/messages', { headers: authHeaders() });
  },
  sendMessage(to_id, text) {
    return apiRequest('/api/student/messages', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ to_id, text }),
    });
  },
  getUnreadCount() {
    return apiRequest('/api/student/messages/unread-count', { headers: authHeaders() });
  },

  // OpenAI key (from teacher)
  getOpenaiKey() {
    return apiRequest('/api/student/openai-key', { headers: authHeaders() });
  },
};
