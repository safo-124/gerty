// Quick smoke test: login as admin and fetch /api/admin/stats
// Requires dev server running at http://localhost:3000

const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.ADMIN_EMAIL || 'admin@gerty.local';
const PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe!123';

async function main() {
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    const loginData = await loginRes.json().catch(() => ({}));
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginData.error || loginRes.status}`);
    }
    const token = loginData.token;

    const statsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const stats = await statsRes.json().catch(() => ({}));
    if (!statsRes.ok) {
      throw new Error(`Stats failed: ${stats.error || statsRes.status}`);
    }

    console.log('Admin stats:', JSON.stringify(stats));
  } catch (e) {
    console.error('Smoke test error:', e.message || e);
    process.exit(1);
  }
}

main();
