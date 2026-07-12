const API = {
  async request(method, url, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin'
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`/api${url}`, opts);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error de servidor');
    }
    return data;
  },

  get(url) { return this.request('GET', url); },
  post(url, body) { return this.request('POST', url, body); },
  put(url, body) { return this.request('PUT', url, body); },
  patch(url, body) { return this.request('PATCH', url, body); },
  delete(url) { return this.request('DELETE', url); },

  auth: {
    me() { return API.get('/auth/me'); },
    register(data) { return API.post('/auth/register', data); },
    login(data) { return API.post('/auth/login', data); },
    logout() { return API.post('/auth/logout'); },
    forgotPassword(email) { return API.post('/auth/forgot-password', { email }); },
    resetPassword(token, newPassword) { return API.post('/auth/reset-password', { token, newPassword }); }
  },

  categories: {
    list() { return API.get('/categories'); },
    create(data) { return API.post('/categories', data); },
    update(id, data) { return API.put(`/categories/${id}`, data); },
    delete(id) { return API.delete(`/categories/${id}`); },
    reorder(orderedIds) { return API.patch('/categories/reorder', { orderedIds }); }
  },

  transactions: {
    list(month) { return API.get(`/transactions?month=${month}`); },
    create(data) { return API.post('/transactions', data); },
    update(id, data) { return API.put(`/transactions/${id}`, data); },
    delete(id) { return API.delete(`/transactions/${id}`); }
  },

  summary: {
    get(month) { return API.get(`/summary?month=${month}`); }
  },

  trends: {
    get(from, to, categoryId) {
      let url = `/trends?from=${from}&to=${to}`;
      if (categoryId) url += `&categoryId=${categoryId}`;
      return API.get(url);
    }
  }
};
