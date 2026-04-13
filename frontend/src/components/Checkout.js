/**
 * Checkout Component – renders checkout form and handles order placement.
 * Supports multi-item cart: places one order per cart item.
 */

import { getCart, clearCart } from '../services/storage.js';
import { saveLocalOrder } from '../services/storage.js';
import { createOrder } from '../services/api.js';
import { showToast } from '../utils/toast.js';
import { CATEGORY_ICONS, getCategoryFor } from '../utils/categories.js';

export class Checkout {
  /**
   * @param {{ onSuccess: (orders: object[]) => void, onBack: () => void }} opts
   */
  constructor({ onSuccess, onBack }) {
    this.onSuccess = onSuccess;
    this.onBack    = onBack;
  }

  render(container) {
    const cart     = getCart();
    const subtotal = cart.reduce((s, i) => s + parseFloat(i.product.price) * i.quantity, 0);
    const tax      = subtotal * 0.08;
    const total    = subtotal + tax;

    container.innerHTML = `
      <div class="page-wrapper checkout-page">
        <h2>
          <button class="btn btn-ghost btn-sm back-btn" aria-label="Back to products">← Back</button>
          Checkout
        </h2>

        <div class="card mb-24" aria-labelledby="order-summary-heading">
          <h3 id="order-summary-heading" class="section-title">Order Summary</h3>
          <div class="order-items-list" role="list">
            ${cart.map(i => this._itemRow(i)).join('')}
          </div>
          <div class="divider"></div>
          <div class="flex-between text-sm text-muted">
            <span>Subtotal</span><span>$${subtotal.toFixed(2)}</span>
          </div>
          <div class="flex-between text-sm text-muted mt-4">
            <span>Tax (8%)</span><span>$${tax.toFixed(2)}</span>
          </div>
          <div class="flex-between fw-700 mt-8" style="font-size:1.1rem">
            <span>Total</span><span class="text-green">$${total.toFixed(2)}</span>
          </div>
        </div>

        <div class="card" aria-labelledby="contact-heading">
          <h3 id="contact-heading" class="section-title">Contact Info</h3>
          <form id="checkout-form" novalidate>
            <div class="form-group">
              <label class="form-label" for="checkout-email">Email Address <span aria-hidden="true">*</span></label>
              <input
                type="email"
                id="checkout-email"
                class="form-input"
                placeholder="you@example.com"
                autocomplete="email"
                required
                aria-required="true"
                aria-describedby="email-error"
              />
              <span id="email-error" class="form-error" role="alert" aria-live="polite"></span>
            </div>

            <div id="checkout-error" class="form-error mb-16" role="alert" aria-live="assertive" style="display:none"></div>

            <button type="submit" class="btn btn-success btn-full btn-lg" id="place-order-btn">
              Place Order
            </button>
          </form>
        </div>
      </div>
    `;

    this._bindForm(container, cart);
  }

  _itemRow({ product, quantity }) {
    const icon = CATEGORY_ICONS[getCategoryFor(product.name)] || '📦';
    return `
      <div class="order-item-row" role="listitem">
        <span class="order-item-icon" aria-hidden="true">${icon}</span>
        <span class="order-item-name">${_esc(product.name)}</span>
        <span class="order-item-qty text-muted">× ${quantity}</span>
        <span class="order-item-total">$${(parseFloat(product.price) * quantity).toFixed(2)}</span>
      </div>
    `;
  }

  _bindForm(container, cart) {
    container.querySelector('.back-btn')?.addEventListener('click', () => this.onBack());

    const form    = container.querySelector('#checkout-form');
    const emailEl = container.querySelector('#checkout-email');
    const errEl   = container.querySelector('#checkout-error');
    const submitBtn = container.querySelector('#place-order-btn');

    emailEl?.addEventListener('input', () => {
      emailEl.classList.remove('error');
      container.querySelector('#email-error').textContent = '';
    });

    form?.addEventListener('submit', async e => {
      e.preventDefault();

      // Validate
      const email = emailEl.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailEl.classList.add('error');
        container.querySelector('#email-error').textContent = 'Please enter a valid email address.';
        emailEl.focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner spinner-sm" aria-hidden="true"></span> Placing order…';
      errEl.style.display = 'none';

      const createdOrders = [];
      const errors = [];

      for (const item of cart) {
        try {
          const order = await createOrder({
            customer_email: email,
            product_id:     item.product.id,
            quantity:       item.quantity,
          });
          createdOrders.push(order);
          saveLocalOrder(order);
        } catch (err) {
          errors.push({ product: item.product.name, message: err.message });
        }
      }

      if (errors.length > 0 && createdOrders.length === 0) {
        // All failed
        errEl.textContent = `Order failed: ${errors.map(e => `${e.product}: ${e.message}`).join('; ')}`;
        errEl.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Place Order';
        showToast('error', '❌ Order placement failed. Please try again.');
        return;
      }

      if (errors.length > 0) {
        showToast('warning', `⚠️ Some items failed: ${errors.map(e => e.product).join(', ')}`);
      }

      clearCart();
      this.onSuccess(createdOrders);
    });
  }
}

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
