// Simple smoke: fetch products and print count
const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

async function main() {
  try {
    const res = await fetch(`${BASE_URL}/api/store/products`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.status);
    const count = Array.isArray(data.products) ? data.products.length : 0;
    console.log(`Products: ${count}`);
    if (count > 0) {
      console.log(`First: ${data.products[0].name} - $${data.products[0].price}`);
    }
  } catch (e) {
    console.error('Smoke error:', e.message || e);
    process.exit(1);
  }
}

main();
