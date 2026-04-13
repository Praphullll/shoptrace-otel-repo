/**
 * API Service – communicates with the ShopTrace backend.
 * All requests include basic retry logic and error normalisation.
 */

const BASE_URL = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');

/** Default fetch options */
const DEFAULT_OPTS = {
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
};

/**
 * Fetch wrapper with retry & normalised error objects.
 * @param {string} path
 * @param {RequestInit} opts
 * @param {number} retries
 * @returns {Promise<any>}
 */
async function apiFetch(path, opts = {}, retries = 2) {
  const url = `${BASE_URL}${path}`;
  const options = { ...DEFAULT_OPTS, ...opts, headers: { ...DEFAULT_OPTS.headers, ...(opts.headers || {}) } };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);

      let data;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      if (!res.ok) {
        const message = (typeof data === 'object' && data.error) ? data.error : `HTTP ${res.status}`;
        throw Object.assign(new Error(message), { status: res.status, data });
      }

      return data;
    } catch (err) {
      if (attempt === retries) throw err;
      // Exponential back-off: 500ms, 1000ms, 2000ms …
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }
}

/** GET /health */
export async function checkHealth() {
  return apiFetch('/health', {}, 1);
}

/** GET /products */
export async function fetchProducts() {
  return apiFetch('/products', {}, 2);
}

/** GET /orders/:id */
export async function fetchOrder(id) {
  return apiFetch(`/orders/${encodeURIComponent(id)}`, {}, 1);
}

/**
 * POST /orders
 * @param {{ customer_email: string, product_id: string, quantity: number }} body
 */
export async function createOrder(body) {
  return apiFetch('/orders', {
    method: 'POST',
    body: JSON.stringify(body),
  }, 0); // no retry for mutations
}
