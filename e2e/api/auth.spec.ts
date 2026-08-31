import { test, expect, request } from '@playwright/test';
import { buildTestUser, TestUser } from '../fixtures/userFactory';

/**
 * Suite de API para el módulo de autenticación.
 *
 * Cada test es independiente: crea su usuario de prueba al inicio
 * y borra la cuenta al final. Los contextos de APIRequestContext
 * manejan las cookies de sesión automáticamente, por lo que no es
 * necesario extraer/guardar la cookie manualmente entre requests.
 */
test.describe('Auth API', () => {
  async function createApiContext(baseURL: string) {
    return request.newContext({ baseURL });
  }

  async function cleanupAccount(api: Awaited<ReturnType<typeof request.newContext>>, user: TestUser) {
    try {
      // Re-autenticamos por si la sesión activa se perdió (logout o delete previo).
      await api.post('/api/auth/login', {
        data: { nombre: user.nombre, password: user.password },
      });
    } catch {
      // Puede que la cuenta ya no exista.
    }
    try {
      await api.delete('/api/auth/account');
    } catch {
      // Best-effort cleanup.
    }
  }

  test('debe registrar un nuevo usuario', async () => {
    const baseURL = (test.info().project.use.baseURL as string) ?? 'http://localhost:3001';
    const user = buildTestUser();
    const api = await createApiContext(baseURL);

    try {
      const res = await api.post('/api/auth/register', { data: user });
      expect(res.status()).toBe(201);

      const body = await res.json();
      expect(body).toMatchObject({
        id: expect.any(String),
        email: user.email.toLowerCase(),
        nombre: user.nombre,
      });
    } finally {
      await cleanupAccount(api, user);
      await api.dispose();
    }
  });

  test('debe rechazar registro con email duplicado', async () => {
    const baseURL = (test.info().project.use.baseURL as string) ?? 'http://localhost:3001';
    const userA = buildTestUser('dupA');
    const userB = buildTestUser('dupB');
    userB.email = userA.email; // mismo email, distinto nombre

    const api = await createApiContext(baseURL);

    try {
      const first = await api.post('/api/auth/register', { data: userA });
      expect(first.status()).toBe(201);

      const second = await api.post('/api/auth/register', { data: userB });
      expect(second.status()).toBe(409);

      const body = await second.json();
      expect(body.error).toContain('email');
    } finally {
      // userB nunca se creó; userA debe limpiarse.
      await cleanupAccount(api, userA);
      await api.dispose();
    }
  });

  test('debe iniciar sesión con credenciales válidas', async () => {
    const baseURL = (test.info().project.use.baseURL as string) ?? 'http://localhost:3001';
    const user = buildTestUser();
    const api = await createApiContext(baseURL);

    try {
      const registerRes = await api.post('/api/auth/register', { data: user });
      expect(registerRes.status()).toBe(201);

      // Forzamos un contexto limpio para validar el login desde cero.
      await api.dispose();
      const loginApi = await createApiContext(baseURL);

      try {
        const res = await loginApi.post('/api/auth/login', {
          data: { nombre: user.nombre, password: user.password },
        });
        expect(res.status()).toBe(200);

        const body = await res.json();
        expect(body).toMatchObject({
          id: expect.any(String),
          email: user.email.toLowerCase(),
          nombre: user.nombre,
        });
      } finally {
        await cleanupAccount(loginApi, user);
        await loginApi.dispose();
      }
    } catch {
      // Limpieza de seguridad si el primer contexto quedó vivo.
      await api.dispose();
      throw new Error('Test failed');
    }
  });

  test('debe rechazar login con contraseña incorrecta', async () => {
    const baseURL = (test.info().project.use.baseURL as string) ?? 'http://localhost:3001';
    const user = buildTestUser();
    const api = await createApiContext(baseURL);

    try {
      const registerRes = await api.post('/api/auth/register', { data: user });
      expect(registerRes.status()).toBe(201);

      const res = await api.post('/api/auth/login', {
        data: { nombre: user.nombre, password: 'contraseñaIncorrecta123' },
      });
      expect(res.status()).toBe(401);
    } finally {
      await cleanupAccount(api, user);
      await api.dispose();
    }
  });

  test('debe obtener el perfil estando autenticado', async () => {
    const baseURL = (test.info().project.use.baseURL as string) ?? 'http://localhost:3001';
    const user = buildTestUser();
    const api = await createApiContext(baseURL);

    try {
      const registerRes = await api.post('/api/auth/register', { data: user });
      expect(registerRes.status()).toBe(201);

      const res = await api.get('/api/auth/me');
      expect(res.status()).toBe(200);

      const body = await res.json();
      expect(body).toMatchObject({
        id: expect.any(String),
        email: user.email.toLowerCase(),
        nombre: user.nombre,
      });
    } finally {
      await cleanupAccount(api, user);
      await api.dispose();
    }
  });

  test('debe rechazar perfil sin autenticación', async () => {
    const baseURL = (test.info().project.use.baseURL as string) ?? 'http://localhost:3001';
    const api = await createApiContext(baseURL);

    const res = await api.get('/api/auth/me');
    expect(res.status()).toBe(401);

    await api.dispose();
  });

  test('debe cambiar el email del usuario autenticado', async () => {
    const baseURL = (test.info().project.use.baseURL as string) ?? 'http://localhost:3001';
    const user = buildTestUser();
    const newEmail = `updated_${Date.now()}@example.com`;
    const api = await createApiContext(baseURL);

    try {
      const registerRes = await api.post('/api/auth/register', { data: user });
      expect(registerRes.status()).toBe(201);

      const changeRes = await api.post('/api/auth/change-email', {
        data: { email: newEmail, password: user.password },
      });
      expect(changeRes.status()).toBe(200);

      const changeBody = await changeRes.json();
      expect(changeBody).toMatchObject({ ok: true, email: newEmail.toLowerCase() });

      const meRes = await api.get('/api/auth/me');
      expect((await meRes.json()).email).toBe(newEmail.toLowerCase());
    } finally {
      // Actualizamos el email para que cleanup pueda re-loguear si es necesario.
      const cleanupUser = { ...user, email: newEmail };
      await cleanupAccount(api, cleanupUser);
      await api.dispose();
    }
  });

  test('debe cambiar la contraseña y permitir login con la nueva', async () => {
    const baseURL = (test.info().project.use.baseURL as string) ?? 'http://localhost:3001';
    const user = buildTestUser();
    const newPassword = 'NuevaPass456!';
    const api = await createApiContext(baseURL);

    try {
      const registerRes = await api.post('/api/auth/register', { data: user });
      expect(registerRes.status()).toBe(201);

      const changeRes = await api.post('/api/auth/change-password', {
        data: { currentPassword: user.password, newPassword },
      });
      expect(changeRes.status()).toBe(200);

      // Verificamos con un contexto nuevo que la nueva contraseña funciona.
      await api.dispose();
      const newApi = await createApiContext(baseURL);

      try {
        const loginRes = await newApi.post('/api/auth/login', {
          data: { nombre: user.nombre, password: newPassword },
        });
        expect(loginRes.status()).toBe(200);

        const meRes = await newApi.get('/api/auth/me');
        expect(meRes.status()).toBe(200);
      } finally {
        const cleanupUser = { ...user, password: newPassword };
        await cleanupAccount(newApi, cleanupUser);
        await newApi.dispose();
      }
    } catch {
      await api.dispose();
      throw new Error('Test failed');
    }
  });

  test('debe cerrar sesión y destruirla', async () => {
    const baseURL = (test.info().project.use.baseURL as string) ?? 'http://localhost:3001';
    const user = buildTestUser();
    const api = await createApiContext(baseURL);

    try {
      const registerRes = await api.post('/api/auth/register', { data: user });
      expect(registerRes.status()).toBe(201);

      const logoutRes = await api.post('/api/auth/logout');
      expect(logoutRes.status()).toBe(200);
      expect((await logoutRes.json()).ok).toBe(true);

      const meRes = await api.get('/api/auth/me');
      expect(meRes.status()).toBe(401);
    } finally {
      await cleanupAccount(api, user);
      await api.dispose();
    }
  });

  test('debe eliminar la cuenta autenticada', async () => {
    const baseURL = (test.info().project.use.baseURL as string) ?? 'http://localhost:3001';
    const user = buildTestUser();
    const api = await createApiContext(baseURL);

    try {
      const registerRes = await api.post('/api/auth/register', { data: user });
      expect(registerRes.status()).toBe(201);

      const deleteRes = await api.delete('/api/auth/account');
      expect(deleteRes.status()).toBe(200);
      expect((await deleteRes.json()).ok).toBe(true);

      const loginRes = await api.post('/api/auth/login', {
        data: { nombre: user.nombre, password: user.password },
      });
      expect(loginRes.status()).toBe(401);
    } finally {
      await api.dispose();
    }
  });
});
