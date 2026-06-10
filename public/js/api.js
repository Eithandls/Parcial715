const API = {
  token: localStorage.getItem('cinema_token') || null,
  
  setToken(token) { this.token = token; localStorage.setItem('cinema_token', token); },
  clearToken() { this.token = null; localStorage.removeItem('cinema_token'); },
  
  async request(method, url, data = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = 'Bearer ' + this.token;
    
    const options = { method, headers };
    if (data && method !== 'GET') options.body = JSON.stringify(data);
    
    try {
      const res = await fetch(url, options);
      if (res.status === 401) { 
        this.clearToken(); 
        if (window.App) window.App.showLogin(); 
        throw new Error('No autorizado'); 
      }
      
      const text = await res.text();
      let json = {};
      if (text) {
        try { json = JSON.parse(text); } catch(e) {}
      }
      
      if (!res.ok) throw new Error(json.error || 'Error del servidor');
      return json;
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  },
  
  // Auth
  login: (username, password) => API.request('POST', '/api/auth/login', { username, password }),
  register: (data) => API.request('POST', '/api/auth/register', data),
  me: () => API.request('GET', '/api/auth/me'),
  logout: () => API.request('POST', '/api/auth/logout'),
  
  // Generic CRUD helpers
  getAll: (resource, search = '') => API.request('GET', `/api/${resource}${search ? '?search=' + encodeURIComponent(search) : ''}`),
  getOne: (resource, id) => API.request('GET', `/api/${resource}/${id}`),
  create: (resource, data) => API.request('POST', `/api/${resource}`, data),
  update: (resource, id, data) => API.request('PUT', `/api/${resource}/${id}`, data),
  remove: (resource, id) => API.request('DELETE', `/api/${resource}/${id}`),
  
  // Specific
  dashboard: () => API.request('GET', '/api/dashboard'),
  devolver: (id, data) => API.request('PUT', `/api/rentas/${id}/devolver`, data),
  consultas: (params) => API.request('GET', '/api/consultas?' + new URLSearchParams(params)),
  reportes: (params) => API.request('GET', '/api/reportes?' + new URLSearchParams(params)),
  getArticuloElenco: (id) => API.request('GET', `/api/articulos/${id}/elenco`),
  setArticuloElenco: (id, elencoIds) => API.request('POST', `/api/articulos/${id}/elenco`, { elenco_ids: elencoIds }),
};
