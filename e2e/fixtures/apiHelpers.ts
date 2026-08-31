import { APIRequestContext, request } from '@playwright/test';
import { buildTestUser, TestUser } from './userFactory';

export interface ApiContext {
  api: APIRequestContext;
  baseURL: string;
  user: TestUser;
}

export async function createApiContext(baseURL: string): Promise<ApiContext> {
  const api = await request.newContext({
    baseURL,
    // Las cookies de sesión viajan automáticamente dentro del contexto.
  });
  const user = buildTestUser();
  return { api, baseURL, user };
}

export async function registerUser(api: APIRequestContext, user: TestUser) {
  const res = await api.post('/api/auth/register', { data: user });
  if (res.status() !== 201) {
    const body = await res.text();
    throw new Error(`Register failed: ${res.status()} ${body}`);
  }
  return res.json();
}

export async function loginUser(api: APIRequestContext, user: TestUser) {
  const res = await api.post('/api/auth/login', {
    data: { nombre: user.nombre, password: user.password },
  });
  if (res.status() !== 200) {
    const body = await res.text();
    throw new Error(`Login failed: ${res.status()} ${body}`);
  }
  return res.json();
}

export async function deleteAccount(api: APIRequestContext) {
  const res = await api.delete('/api/auth/account');
  // La cuenta puede ya no existir si el test falló antes de crearla.
  return res.ok();
}

export async function cleanupAccount(api: APIRequestContext, user: TestUser) {
  try {
    // Intentar login por si la sesión no está activa.
    await api.post('/api/auth/login', {
      data: { nombre: user.nombre, password: user.password },
    });
  } catch {
    // Ignorar errores de login; puede que ya esté autenticado o la cuenta no exista.
  }
  try {
    await deleteAccount(api);
  } catch {
    // Best-effort cleanup.
  }
}
