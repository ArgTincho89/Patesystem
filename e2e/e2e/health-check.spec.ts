import { test, expect } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.E2E_PORT || 3001}`;

test('E2E-S01: Health check de la API', async ({ request }) => {
  const res = await request.get(`${baseURL}/health`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe('ok');
});
