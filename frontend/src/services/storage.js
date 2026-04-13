/**
 * Storage Service – thin wrappers around localStorage.
 * Handles serialisation and parse errors gracefully.
 */

const CART_KEY   = 'shoptrace_cart';
const ORDERS_KEY = 'shoptrace_orders';

/** Read a JSON value from localStorage (returns defaultVal on error). */
function read(key, defaultVal = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

/** Write a value as JSON to localStorage. */
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[Storage] Could not persist data:', e.message);
  }
}

// ── Cart ─────────────────────────────────────────────────────────

/**
 * @returns {Array<{ product: object, quantity: number }>}
 */
export function getCart() {
  return read(CART_KEY, []);
}

/** Replace the entire cart. */
export function saveCart(cart) {
  write(CART_KEY, cart);
}

/**
 * Add a product to the cart, or increment its quantity.
 * Note: stock is validated client-side using the cached product data.
 * The server performs authoritative stock validation at order placement.
 * @param {object} product – product row from backend
 * @param {number} quantity
 */
export function addToCart(product, quantity = 1) {
  const cart = getCart();
  const existing = cart.find(i => i.product.id === product.id);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, product.stock);
  } else {
    cart.push({ product, quantity });
  }
  saveCart(cart);
  return cart;
}

/**
 * Update the quantity of a cart item; removes it if qty ≤ 0.
 * @param {string} productId
 * @param {number} quantity
 */
export function updateCartQty(productId, quantity) {
  let cart = getCart();
  if (quantity <= 0) {
    cart = cart.filter(i => i.product.id !== productId);
  } else {
    const item = cart.find(i => i.product.id === productId);
    if (item) item.quantity = quantity;
  }
  saveCart(cart);
  return cart;
}

/** Remove a product from the cart. */
export function removeFromCart(productId) {
  return updateCartQty(productId, 0);
}

/** Empty the cart. */
export function clearCart() {
  saveCart([]);
  return [];
}

// ── Local Order History ──────────────────────────────────────────

/** Get all locally stored orders. */
export function getLocalOrders() {
  return read(ORDERS_KEY, []);
}

/** Persist a newly created order to local history. */
export function saveLocalOrder(order) {
  const orders = getLocalOrders();
  // Avoid duplicates
  if (!orders.find(o => o.id === order.id)) {
    orders.unshift(order);
    // Keep last 100
    write(ORDERS_KEY, orders.slice(0, 100));
  }
  return getLocalOrders();
}

/** Clear local order history. */
export function clearLocalOrders() {
  write(ORDERS_KEY, []);
}
