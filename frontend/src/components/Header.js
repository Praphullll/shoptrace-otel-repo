/**
 * Header Component – sticky navigation bar.
 * Emits events: 'navigate', 'cart-toggle', 'search'
 */

import { getCart } from '../services/storage.js';

export class Header {
  constructor({ onNavigate, onCartToggle, onSearch }) {
    this.onNavigate   = onNavigate;
    this.onCartToggle = onCartToggle;
    this.onSearch     = onSearch;
    this._el = null;
    this._searchTimeout = null;
  }

  /** Return the total number of items in the cart. */
  _cartCount() {
    return getCart().reduce((s, i) => s + i.quantity, 0);
  }

  /** Render to the DOM; must be called once. */
  mount(container) {
    const el = document.createElement('header');
    el.className = 'site-header';
    el.setAttribute('role', 'banner');
    el.innerHTML = this._html();
    container.prepend(el);
    this._el = el;
    this._bind();
  }

  /** Update just the cart badge count without a full re-render. */
  updateCartBadge() {
    if (!this._el) return;
    const count = this._cartCount();
    let badge = this._el.querySelector('.cart-badge');
    const btn  = this._el.querySelector('.cart-btn');
    if (count > 0) {
      if (badge) {
        badge.textContent = count;
      } else {
        badge = document.createElement('span');
        badge.className = 'cart-badge';
        badge.setAttribute('aria-label', `${count} items in cart`);
        badge.textContent = count;
        btn.appendChild(badge);
      }
    } else if (badge) {
      badge.remove();
    }
  }

  /** Mark a nav link as active. */
  setActivePage(page) {
    if (!this._el) return;
    this._el.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.page === page);
      link.setAttribute('aria-current', link.dataset.page === page ? 'page' : 'false');
    });
  }

  _html() {
    const count = this._cartCount();
    return `
      <div class="header-inner">
        <a class="logo" href="#home" data-page="home" aria-label="ShopTrace home">
          <div class="logo-icon" aria-hidden="true">🛒</div>
          <div>
            <div class="logo-text">ShopTrace</div>
            <div class="logo-sub">GADGETS MARKETPLACE</div>
          </div>
        </a>

        <nav class="header-nav" aria-label="Main navigation">
          <button class="nav-link active" data-page="home"     aria-current="page">🏠 Home</button>
          <button class="nav-link"        data-page="products" aria-current="false">🛍️ Products</button>
          <button class="nav-link"        data-page="orders"   aria-current="false">📦 Orders</button>
          <button class="nav-link"        data-page="monitor"  aria-current="false">📡 Monitor</button>
        </nav>

        <div class="header-sep" role="none"></div>

        <div class="header-search" role="search">
          <span class="search-icon" aria-hidden="true">🔍</span>
          <input
            type="search"
            id="header-search"
            placeholder="Search gadgets…"
            autocomplete="off"
            aria-label="Search products"
          />
        </div>

        <button class="cart-btn" aria-label="Open shopping cart" id="cart-toggle-btn">
          🛒 Cart
          ${count > 0 ? `<span class="cart-badge" aria-label="${count} items in cart">${count}</span>` : ''}
        </button>
      </div>
    `;
  }

  _bind() {
    // Nav links
    this._el.querySelectorAll('.nav-link[data-page]').forEach(btn => {
      btn.addEventListener('click', () => this.onNavigate(btn.dataset.page));
    });

    // Logo link
    this._el.querySelector('.logo')?.addEventListener('click', e => {
      e.preventDefault();
      this.onNavigate('home');
    });

    // Cart toggle
    this._el.querySelector('#cart-toggle-btn')?.addEventListener('click', () => {
      this.onCartToggle();
    });

    // Search (debounced)
    this._el.querySelector('#header-search')?.addEventListener('input', e => {
      clearTimeout(this._searchTimeout);
      this._searchTimeout = setTimeout(() => this.onSearch(e.target.value.trim()), 300);
    });
  }
}
