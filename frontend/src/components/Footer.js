/**
 * Footer Component – site-wide footer.
 */

export class Footer {
  mount(container) {
    const el = document.createElement('footer');
    el.className = 'site-footer';
    el.setAttribute('role', 'contentinfo');
    el.innerHTML = `
      <div class="footer-inner">
        <span class="footer-text">© ${new Date().getFullYear()} ShopTrace – Gadgets Marketplace</span>
        <nav class="footer-links" aria-label="Footer navigation">
          <a href="#home">Home</a>
          <a href="#products">Products</a>
          <a href="#orders">Orders</a>
          <a href="#monitor">Monitor</a>
        </nav>
      </div>
    `;
    container.appendChild(el);
  }
}
