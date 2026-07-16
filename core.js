/* ═══════════════════════════════════════════
   YRS Brand Shop — Core (Immutable)
   Barrel, Data, Store, Router, Toast, Badge,
   Wishlist, AdminAccess, Sections, Share
   ═══════════════════════════════════════════ */

/* ── Barrel (Module Registry) ── */
const App = {
  _m: {},
  register(name, mod) { this._m[name] = mod; return mod; },
  use(name) { return this._m[name]; }
};

/* ── Data Module ── */
App.register('data', (() => {
  let _products = [];
  let _categories = [];
  let _types = [];
  let _share = [];
  let _sections = {};
  let _settings = {};
  let _checkoutUpsells = [];
  let _heroes = [];
  let _carousels = [];
  let _mailingLists = [];
  let _sectionOrder = {};
  let _ready = null;

  return {
    async load() {
      if (_ready) return _ready;
      _ready = fetch('data.json')
        .then(r => r.json())
        .then(json => {
          const o = JSON.parse(localStorage.getItem('yrs-data') || 'null');
          _products        = (o?.products && o.products.length) ? o.products.map(function(p, i) {
            const jp = (json.products || [])[i];
            return { ...p, image: p.image || (jp ? jp.image : undefined) };
          }) : (json.products || []);
          _categories      = o?.categories        || json.categories        || [];
          _types           = o?.product_types     || json.product_types     || [];
          _share           = o?.share             || json.share             || [];
          _sections        = o?.sections          || json.sections          || {};
          _settings        = o?.settings          || json.settings          || {};
          _checkoutUpsells = o?.checkout_upsells  || json.checkout_upsells  || [];
          _heroes          = o?.heroes            || json.heroes            || [];
          _carousels       = o?.carousels         || json.carousels         || [];
          _mailingLists    = o?.mailing_lists     || json.mailing_lists     || [];
          _sectionOrder    = o?.section_order     || json.section_order     || {};
        })
        .catch(() => console.warn('[data] Failed to load data.json'));
      return _ready;
    },
    /* products */
    getProducts(cat) { return cat ? _products.filter(p => p.category === cat) : _products; },
    getProduct(slug) { return _products.find(p => p.slug === slug); },
    setProducts(arr) { _products = arr; this._persist(); },
    /* product types */
    getTypes() { return _types; },
    getType(id) { return _types.find(t => t.id === id) || null; },
    setTypes(arr) { _types = arr; this._persist(); },
    /* categories */
    getCategories() {
      return _categories.map(c => ({
        ...c,
        count: _products.filter(p => p.category === c.slug).length
      }));
    },
    getCategory(slug) { return _categories.find(c => c.slug === slug) || null; },
    setCategories(arr) { _categories = arr; this._persist(); },
    /* share */
    getShare() { return _share; },
    setShare(arr) { _share = arr; this._persist(); },
    /* sections */
    getSections() { return _sections; },
    isSection(page, id) {
      const s = _sections[page];
      return s ? (s[id] !== false) : true;
    },
    setSections(obj) { _sections = obj; this._persist(); },
    toggleSection(page, id) {
      if (!_sections[page]) _sections[page] = {};
      _sections[page][id] = !(_sections[page][id] !== false);
      this._persist();
    },
    /* settings */
    getSettings() { return { ..._settings }; },
    setSettings(obj) { _settings = { ..._settings, ...obj }; this._persist(); },
    /* related products */
    getRelatedProducts(slug) {
      const p = this.getProduct(slug);
      if (!p) return [];
      const manual = (p.related || []).filter(s => s && s !== slug).map(s => this.getProduct(s)).filter(Boolean);
      if (manual.length) return manual;
      const s = _settings;
      if (!s.auto_relate) return [];
      const field = s.relate_by || 'category';
      const pool = field === 'type'
        ? _products.filter(x => x.type === p.type && x.slug !== slug)
        : _products.filter(x => x.category === p.category && x.slug !== slug);
      return pool.slice(0, s.related_count || 4);
    },
    /* checkout upsells */
    getCheckoutUpsells() {
      return _checkoutUpsells.filter(u => u.active).sort((a, b) => (a.priority || 99) - (b.priority || 99)).map(u => {
        const p = this.getProduct(u.product_slug);
        if (!p) return null;
        const originalPrice = p.price;
        let discountedPrice = originalPrice;
        let discountLabel = '';
        if (u.discount_type === 'amount' && u.discount_value > 0) {
          discountedPrice = Math.max(0, originalPrice - u.discount_value);
          discountLabel = '-$' + u.discount_value;
        } else if (u.discount_type === 'percent' && u.discount_value > 0) {
          discountedPrice = Math.round(originalPrice * (100 - u.discount_value)) / 100;
          discountLabel = '-' + u.discount_value + '%';
        }
        return { ...u, product: p, originalPrice, discountedPrice, discountLabel };
      }).filter(Boolean);
    },
    setCheckoutUpsells(arr) { _checkoutUpsells = arr; this._persist(); },
    /* get discounted price for a product if a checkout upsell exists */
    getProductDiscount(slug) {
      const u = _checkoutUpsells.find(x => x.product_slug === slug && x.active);
      if (!u || !u.discount_value) return null;
      const p = this.getProduct(slug);
      if (!p) return null;
      const originalPrice = p.price;
      let discountedPrice = originalPrice;
      if (u.discount_type === 'amount') discountedPrice = Math.max(0, originalPrice - u.discount_value);
      else if (u.discount_type === 'percent') discountedPrice = Math.round(originalPrice * (100 - u.discount_value)) / 100;
      if (discountedPrice >= originalPrice) return null;
      let discountLabel = '';
      if (u.discount_type === 'amount') discountLabel = '-$' + u.discount_value;
      else discountLabel = '-' + u.discount_value + '%';
      return { originalPrice, discountedPrice, discountLabel };
    },
    /* heroes */
    getHeroes(page) { return _heroes.filter(h => h.active && (!page || h.page === page)); },
    setHeroes(arr) { _heroes = arr; this._persist(); },
    /* carousels */
    getCarousels(page) { return _carousels.filter(c => c.active && (!page || c.page === page)); },
    setCarousels(arr) { _carousels = arr; this._persist(); },
    /* mailing lists */
    getMailingLists(page) { return _mailingLists.filter(m => m.active && (!page || m.page === page)); },
    setMailingLists(arr) { _mailingLists = arr; this._persist(); },
    /* section order */
    getSectionOrder(page) { return _sectionOrder[page] || null; },
    setSectionOrder(page, order) { if (!_sectionOrder[page]) _sectionOrder[page] = []; _sectionOrder[page] = order; this._persist(); },
    /* bulk */
    getAll() { return { products: [..._products], categories: [..._categories], product_types: [..._types], share: [..._share], sections: JSON.parse(JSON.stringify(_sections)), settings: { ..._settings }, checkout_upsells: [..._checkoutUpsells], heroes: [..._heroes], carousels: [..._carousels], mailing_lists: [..._mailingLists], section_order: JSON.parse(JSON.stringify(_sectionOrder)) }; },
    _persist() {
      localStorage.setItem('yrs-data', JSON.stringify({
        products: _products, categories: _categories, product_types: _types,
        share: _share, sections: _sections, settings: _settings,
        checkout_upsells: _checkoutUpsells, heroes: _heroes,
        carousels: _carousels, mailing_lists: _mailingLists,
        section_order: _sectionOrder
      }));
    }
  };
})());

/* ── Store Module (Cart) ── */
App.register('store', (() => {
  let cart = JSON.parse(localStorage.getItem('yrs-cart') || '[]');
  const _l = [];
  return {
    getCart: () => [...cart],
    addItem(p) { const e = cart.find(i => i.id === p.id); if (e) { e.qty++; if (p._discounted) { e.price = p.price; e._originalPrice = p._originalPrice; e._discounted = true; } } else cart.push({ ...p, qty: 1 }); this._save(); },
    removeItem(id) { cart = cart.filter(i => i.id !== id); this._save(); },
    updateQty(id, q) { const i = cart.find(i => i.id === id); if (i) i.qty = Math.max(1, q); this._save(); },
    getTotal: () => cart.reduce((s, i) => s + i.price * i.qty, 0),
    getCount: () => cart.reduce((s, i) => s + i.qty, 0),
    hasItem(slug) { return cart.some(i => i.slug === slug); },
    onChange(fn) { _l.push(fn); },
    clear() { cart = []; this._save(); },
    _save() { localStorage.setItem('yrs-cart', JSON.stringify(cart)); _l.forEach(fn => fn(cart)); }
  };
})());

/* ── Wishlist Module ── */
App.register('wishlist', (() => {
  let items = JSON.parse(localStorage.getItem('yrs-wishlist') || '[]');
  const _l = [];
  return {
    getItems: () => [...items],
    toggle(p) {
      const idx = items.findIndex(i => i.id === p.id);
      if (idx > -1) items.splice(idx, 1); else items.push({ ...p });
      this._save();
      return idx === -1;
    },
    has(id) { return items.some(i => i.id === id); },
    remove(id) { items = items.filter(i => i.id !== id); this._save(); },
    getCount: () => items.length,
    onChange(fn) { _l.push(fn); },
    clear() { items = []; this._save(); },
    _save() { localStorage.setItem('yrs-wishlist', JSON.stringify(items)); _l.forEach(fn => fn(items)); }
  };
})());

/* ── Router Module (History API) ── */
App.register('router', (() => {
  const routes = [];
  let _cleanup = null;

  function _hashToPath() {
    const h = location.hash.replace(/^#\/?/, '');
    return h || '';
  }

  function _resolve(path) {
    const norm = path.replace(/^\//, '');
    for (const r of routes) {
      const m = norm.match(r.pattern);
      if (m) return { handler: r.handler, params: m.slice(1) };
    }
    return null;
  }

  function _navigate(path, push = true) {
    const resolved = _resolve(path);
    if (!resolved) { _navigate('/shop', false); return; }
    if (push) location.hash = path;
    if (_cleanup) _cleanup();
    const app = document.getElementById('app');
    app.innerHTML = '';
    _cleanup = resolved.handler(app, resolved.params) || null;
    App.use('content').apply(app);
    if (App.use('liveEdit').isActive()) App.use('liveEdit').updatePage();
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.querySelectorAll('[data-nav]').forEach(a => {
      a.classList.toggle('active', a.dataset.nav === path);
    });
  }

  window.addEventListener('hashchange', () => _navigate(_hashToPath(), false));

  document.addEventListener('click', e => {
    const nav = e.target.closest('[data-nav]');
    if (nav) { e.preventDefault(); _navigate(nav.dataset.nav); return; }
    const a = e.target.closest('a[href^="/"]');
    if (a && !a.hasAttribute('data-nav') &&
        !e.target.closest('.btn-add-cart') &&
        !e.target.closest('.cart-item-remove') &&
        !e.target.closest('.share-panel') &&
        !e.target.closest('.wish-toggle') &&
        !e.target.closest('.checkout-upsell-item') &&
        !e.target.closest('.ml-form')) {
      e.preventDefault();
      _navigate(a.getAttribute('href'));
    }
  });

  return {
    on(pattern, handler) { routes.push({ pattern: new RegExp('^' + pattern + '$'), handler }); },
    navigate(path) { _navigate(path, true); },
    go(path) { _navigate(path, false); },
    start() {
      let path = _hashToPath();
      const redir = sessionStorage.getItem('yrs-redirect');
      if (redir) { sessionStorage.removeItem('yrs-redirect'); location.hash = redir; path = redir; }
      _navigate(path, false);
    }
  };
})());

/* ── Toast Module ── */
App.register('toast', (() => ({
  show(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }
}))());

/* ── Badge Module ── */
App.register('badge', (() => ({
  update() {
    const count = App.use('store').getCount();
    const wCount = App.use('wishlist').getCount();
    const cb = document.getElementById('cartBadge');
    const wb = document.getElementById('wishBadge');
    cb.textContent = count; cb.classList.toggle('show', count > 0);
    if (wb) { wb.textContent = wCount; wb.classList.toggle('show', wCount > 0); }
  },
  bounce(which) {
    const el = document.getElementById(which === 'wish' ? 'wishBadge' : 'cartBadge');
    if (!el) return;
    el.classList.remove('bounce'); void el.offsetWidth; el.classList.add('bounce');
  }
}))());

/* ── Admin Access (triple-click YRS → login → /admin) ── */
App.register('adminAccess', (() => {
  let _clicks = 0, _timer = null;
  function _showLogin() {
    if (document.querySelector('.login-overlay')) return;
    const o = document.createElement('div');
    o.className = 'login-overlay';
    o.innerHTML = '<div class="login-modal">'
      + '<div class="login-brand">YRS<span class="reg">&reg;</span></div>'
      + '<div class="login-sub">Admin Access</div>'
      + '<div class="login-field"><input type="password" id="loginPw" placeholder="Password" autocomplete="current-password"></div>'
      + '<button class="login-btn" id="loginBtn">Enter</button>'
      + '<div class="login-err" id="loginErr"></div>'
      + '</div>';
    document.body.appendChild(o);
    const pw = o.querySelector('#loginPw');
    const err = o.querySelector('#loginErr');
    function tryLogin() {
      if (App.use('auth').login(pw.value)) { o.remove(); App.use('router').navigate('/admin'); }
      else { err.textContent = 'Incorrect password'; pw.classList.add('error'); pw.focus(); }
    }
    o.querySelector('#loginBtn').addEventListener('click', tryLogin);
    pw.addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); err.textContent = ''; pw.classList.remove('error'); });
    pw.addEventListener('input', () => { err.textContent = ''; pw.classList.remove('error'); });
    o.addEventListener('click', e => { if (e.target === o) o.remove(); });
    setTimeout(() => pw.focus(), 100);
  }
  return {
    init() {
      const brand = document.querySelector('.nav-brand');
      if (!brand) return;
      brand.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        _clicks++;
        clearTimeout(_timer);
        _timer = setTimeout(() => _clicks = 0, 600);
        if (_clicks >= 3) { _clicks = 0; App.use('auth').check() ? App.use('router').navigate('/admin') : _showLogin(); }
      });
    }
  };
})());

/* ── Auth Module ── */
App.register('auth', (() => {
  const S_KEY = 'yrs-auth';
  const P_KEY = 'yrs-admin-pass';
  let _session = false;
  return {
    isLoggedIn() { return _session; },
    getPassword() { return localStorage.getItem(P_KEY) || 'yrs2024'; },
    setPassword(pw) { localStorage.setItem(P_KEY, pw); },
    login(pw) { if (pw === this.getPassword()) { _session = true; localStorage.setItem(S_KEY, '1'); return true; } return false; },
    logout() { _session = false; localStorage.removeItem(S_KEY); },
    check() { _session = localStorage.getItem(S_KEY) === '1'; return _session; }
  };
})());

/* ── Content Overrides Module ── */
App.register('content', (() => {
  let _overrides = {};
  const KEY = 'yrs-content';
  return {
    load() { try { _overrides = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(e) { _overrides = {}; } },
    get(key) { return _overrides[key] !== undefined ? _overrides[key] : null; },
    set(key, val) { _overrides[key] = val; this._save(); },
    remove(key) { delete _overrides[key]; this._save(); },
    getAll() { return { ..._overrides }; },
    reset() { _overrides = {}; this._save(); },
    _save() { localStorage.setItem(KEY, JSON.stringify(_overrides)); },
    apply(root) {
 (root || document).querySelectorAll('[data-edit-key]').forEach(el => {
   const v = _overrides[el.dataset.editKey];
   if (v !== undefined && v !== null) el.innerHTML = v;
 });
 }
  };
})());

/* ── Live Edit Module ── */
App.register('liveEdit', (() => {
  let _active = false;
  let _toolbar = null;
  let _appHandler = null;
  let _openDropdown = null;
  let _dropdownCloseHandler = null;

  /* Human-readable section labels */
  const SEC_LABELS = {
    hero: 'Hero', categories: 'Categories', featured: 'Featured Strip',
    products: 'Products', carousel: 'Carousel', mailing: 'Mailing List',
    breadcrumb: 'Breadcrumb', image: 'Product Image', info: 'Product Info',
    share: 'Share', wishlist: 'Wishlist', upsell: 'Upsell',
    related: 'Related Products', items: 'Items', actions: 'Actions',
    upsells: 'Checkout Upsells', total: 'Cart Total', checkout: 'Checkout Button'
  };

  /* Page-specific label overrides */
  const PAGE_LABELS = {
    cart: { items: 'Cart Items', upsells: 'Checkout Upsells', total: 'Cart Total', checkout: 'Checkout Button' },
    wishlist: { items: 'Wishlist Items', actions: 'Wishlist Actions' }
  };

  /* Section → DOM finder per page */
  const SEC_MAP = {
    shop: [
      { id: 'hero', find: function(a) { return a.querySelector('.hero'); } },
      { id: 'categories', find: function(a) { return a.querySelector('.cat-card'); } },
      { id: 'featured', find: function(a) { return a.querySelector('.featured-strip'); } },
      { id: 'products', find: function(a) { return a.querySelector('.product-grid'); } },
      { id: 'carousel', find: function(a) { return a.querySelector('.carousel-wrap'); } },
      { id: 'mailing', find: function(a) { return a.querySelector('.ml-wrap'); } }
    ],
    product: [
      { id: 'breadcrumb', find: function(a) { return a.querySelector('.detail-breadcrumb'); } },
      { id: 'image', find: function(a) { return a.querySelector('.detail-image'); } },
      { id: 'info', find: function(a) { return a.querySelector('.detail-info'); } },
      { id: 'share', find: function(a) { return a.querySelector('.share-wrap'); } },
      { id: 'wishlist', find: function(a) { return a.querySelector('.btn-wish-detail'); } },
      { id: 'upsell', find: function(a) { return a.querySelector('.upsell-banner'); } },
      { id: 'related', find: function(a) { return a.querySelector('.related-section'); } }
    ],
    cart: [
      { id: 'items', find: function(a) { return a.querySelector('.cart-item'); } },
      { id: 'upsells', find: function(a) { return a.querySelector('.checkout-upsell-section'); } },
      { id: 'total', find: function(a) { return a.querySelector('.cart-footer'); } },
      { id: 'checkout', find: function(a) { return a.querySelector('.btn-checkout'); } }
    ],
    wishlist: [
      { id: 'items', find: function(a) { return a.querySelector('.wish-item'); } },
      { id: 'actions', find: function(a) { return a.querySelector('.wish-item-actions'); } }
    ]
  };

  /* Section ID → section_order ID mapping (for reorder) */
  const SEC_TO_ORDER = {
    shop: { categories: 'categories', featured: 'featured', products: 'products', carousel: 'carousels', mailing: 'mailing' }
  };

  /* All available section types per page (for switching) */
  const SEC_SWITCH_MAP = {
    shop: [
      { id: 'hero', label: 'Hero' },
      { id: 'categories', label: 'Categories' },
      { id: 'featured', label: 'Featured Strip' },
      { id: 'products', label: 'Products' },
      { id: 'carousel', label: 'Carousel' },
      { id: 'mailing', label: 'Mailing List' }
    ],
    product: [
      { id: 'breadcrumb', label: 'Breadcrumb' },
      { id: 'image', label: 'Product Image' },
      { id: 'info', label: 'Product Info' },
      { id: 'share', label: 'Share' },
      { id: 'wishlist', label: 'Wishlist' },
      { id: 'upsell', label: 'Upsell' },
      { id: 'related', label: 'Related Products' }
    ],
    cart: [
      { id: 'items', label: 'Cart Items' },
      { id: 'upsells', label: 'Checkout Upsells' },
      { id: 'total', label: 'Cart Total' },
      { id: 'checkout', label: 'Checkout Button' }
    ],
    wishlist: [
      { id: 'items', label: 'Wishlist Items' },
      { id: 'actions', label: 'Wishlist Actions' }
    ]
  };

  function _detectPage() {
    const h = location.hash.replace(/^#\//, '');
    if (h === '' || h === 'shop') return 'shop';
    if (h.startsWith('product/')) return 'product';
    if (h === 'cart') return 'cart';
    if (h === 'wishlist') return 'wishlist';
    return null;
  }

  function _getLabel(page, secId) {
    return (PAGE_LABELS[page] && PAGE_LABELS[page][secId]) || SEC_LABELS[secId] || secId;
  }

  function _showEditor(el, key) {
    if (document.querySelector('.inline-editor')) document.querySelector('.inline-editor').remove();
    const rect = el.getBoundingClientRect();
    const currentText = el.textContent;
    const ed = document.createElement('div');
    ed.className = 'inline-editor';
    ed.innerHTML = '<div class="ie-header"><span class="ie-key">' + key + '</span><button class="ie-close" id="ieClose">&times;</button></div>'
      + '<textarea class="ie-input" id="ieInput">' + currentText.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</textarea>'
      + '<div class="ie-actions"><button class="ie-cancel" id="ieCancel">Cancel</button><button class="ie-save" id="ieSave">Save</button></div>';
    ed.style.top = Math.min(rect.bottom + 8, window.innerHeight - 220) + 'px';
    ed.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 320)) + 'px';
    document.body.appendChild(ed);
    const ta = ed.querySelector('#ieInput');
    ta.focus(); ta.selectionStart = ta.value.length;
    ed.querySelector('#ieClose').addEventListener('click', () => ed.remove());
    ed.querySelector('#ieCancel').addEventListener('click', () => ed.remove());
    ed.querySelector('#ieSave').addEventListener('click', () => {
      App.use('content').set(key, ta.value);
      el.innerHTML = ta.value;
      ed.remove();
      App.use('toast').show('Saved: ' + key);
    });
  }

  function _handleClick(e) {
    if (!_active) return;
    if (e.target.closest('.le-section-badge') || e.target.closest('.le-add-panel') || e.target.closest('.le-add-toggle') || e.target.closest('.le-divider') || e.target.closest('.le-switch-dropdown') || e.target.closest('.le-hidden-bar')) return;
    let target = e.target.closest('[data-edit-key]');
    if (!target) {
      const t = e.target;
      if (t.childNodes.length <= 1 && t.textContent.trim().length > 0 && t.closest('#app') && !t.closest('button') && !t.closest('a') && !t.closest('input') && !t.closest('select') && !t.closest('.admin-layout') && !t.closest('.modal-overlay') && !t.closest('.inline-editor') && !t.closest('.login-overlay') && !t.closest('.live-edit-toolbar') && !t.closest('.ml-form') && !t.closest('.checkout-upsell-section')) {
        target = t;
      }
    }
    if (!target) return;
    e.preventDefault(); e.stopPropagation();
    let key = target.dataset.editKey;
    if (!key) {
      const route = location.pathname.replace(/^\//, '').replace(/[^a-z0-9]/gi, '-') || 'shop';
      const tag = target.tagName.toLowerCase();
      const txt = (target.textContent || '').trim().substring(0, 20).replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
      key = route + '.' + tag + '.' + (txt || 'element');
      target.dataset.editKey = key;
    }
    _showEditor(target, key);
  }

  function _moveSection(page, sectionId, dir) {
    const data = App.use('data');
    const orderMap = SEC_TO_ORDER[page];
    if (!orderMap) return;
    const orderId = orderMap[sectionId];
    if (!orderId) return;
    let order = data.getSectionOrder(page);
    if (!order || !order.length) return;
    var idx = order.indexOf(orderId);
    if (idx === -1) return;
    var newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= order.length) return;
    order = order.slice();
    var tmp = order[idx]; order[idx] = order[newIdx]; order[newIdx] = tmp;
    data.setSectionOrder(page, order);
    App.use('router').navigate(location.hash.replace('#', '') || '/shop');
  }

  function _addSectionBack(page, sectionId, insertIdx) {
    const data = App.use('data');
    data.toggleSection(page, sectionId);
    if (SEC_TO_ORDER[page]) {
      var orderId = SEC_TO_ORDER[page][sectionId];
      if (orderId) {
        var order = (data.getSectionOrder(page) || []).slice();
        if (order.indexOf(orderId) === -1) {
          if (typeof insertIdx === 'number' && insertIdx >= 0 && insertIdx <= order.length) {
            order.splice(insertIdx, 0, orderId);
          } else {
            order.push(orderId);
          }
          data.setSectionOrder(page, order);
        }
      }
    }
    App.use('router').navigate(location.hash.replace('#', '') || '/shop');
  }

  function _switchSection(page, currentSecId, newSecId) {
    if (currentSecId === newSecId) return;
    const data = App.use('data');
    data.toggleSection(page, currentSecId);
    data.toggleSection(page, newSecId);
    if (SEC_TO_ORDER[page]) {
      var curOrderId = SEC_TO_ORDER[page][currentSecId];
      var newOrderId = SEC_TO_ORDER[page][newSecId];
      if (curOrderId && newOrderId) {
        var order = (data.getSectionOrder(page) || []).slice();
        var idx = order.indexOf(curOrderId);
        if (idx !== -1) {
          order[idx] = newOrderId;
          var dupIdx = order.indexOf(newOrderId);
          if (dupIdx !== -1 && dupIdx !== idx) order.splice(dupIdx, 1);
          data.setSectionOrder(page, order);
        }
      }
    }
    _closeDropdown();
    App.use('router').navigate(location.hash.replace('#', '') || '/shop');
  }

  function _closeDropdown() {
    if (_openDropdown) { _openDropdown.remove(); _openDropdown = null; }
    if (_dropdownCloseHandler) {
      document.removeEventListener('click', _dropdownCloseHandler);
      _dropdownCloseHandler = null;
    }
  }

  function _openSwitchDropdown(nameEl, page, currentSecId) {
    _closeDropdown();
    var dd = document.createElement('div');
    dd.className = 'le-switch-dropdown';
    var options = SEC_SWITCH_MAP[page] || [];
    var html = '<div class="le-sd-title">Switch Section Type</div>';
    options.forEach(function(opt) {
      var isCurrent = opt.id === currentSecId;
      var isActive = App.use('data').isSection(page, opt.id);
      var cls = 'le-sd-item' + (isCurrent ? ' le-sd-current' : '') + (!isActive && !isCurrent ? ' le-sd-inactive' : '');
      html += '<div class="' + cls + '" data-le-switch-to="' + opt.id + '">'
        + '<span class="le-sd-item-name">' + opt.label + '</span>'
        + (isCurrent ? '<span class="le-sd-item-badge">Current</span>' : (!isActive ? '<span class="le-sd-item-badge le-sd-badge-hidden">Hidden</span>' : ''))
        + '</div>';
    });
    dd.innerHTML = html;
    dd.addEventListener('click', function(e) { e.stopPropagation(); });
    dd.querySelectorAll('.le-sd-item:not(.le-sd-current)').forEach(function(item) {
      item.addEventListener('click', function(e) {
        e.stopPropagation();
        var toId = item.dataset.leSwitchTo;
        if (!App.use('data').isSection(page, toId)) {
          _addSectionBack(page, toId);
          _closeDropdown();
          return;
        }
        _switchSection(page, currentSecId, toId);
      });
    });
    var rect = nameEl.getBoundingClientRect();
    dd.style.top = (rect.bottom + 4) + 'px';
    dd.style.left = rect.left + 'px';
    document.body.appendChild(dd);
    _openDropdown = dd;
    _dropdownCloseHandler = function(ev) {
      if (!_openDropdown || (!_openDropdown.contains(ev.target) && !nameEl.contains(ev.target))) {
        _closeDropdown();
      }
    };
    setTimeout(function() { document.addEventListener('click', _dropdownCloseHandler); }, 0);
  }

  function _openDividerMenu(btn, page, insertIdx) {
    _closeDropdown();
    var dd = document.createElement('div');
    dd.className = 'le-switch-dropdown le-divider-menu';
    var allSections = SEC_SWITCH_MAP[page] || [];
    var data = App.use('data');
    var html = '<div class="le-sd-title">Add Section</div>';
    allSections.forEach(function(opt) {
      var isActive = data.isSection(page, opt.id);
      var cls = 'le-sd-item' + (isActive ? ' le-sd-inactive' : '');
      html += '<div class="' + cls + '" data-le-switch-to="' + opt.id + '">'
        + '<span class="le-sd-item-name">' + opt.label + '</span>'
        + (isActive ? '<span class="le-sd-item-badge le-sd-badge-active">Visible</span>' : '<span class="le-sd-item-badge">Add</span>')
        + '</div>';
    });
    dd.innerHTML = html;
    dd.addEventListener('click', function(e) { e.stopPropagation(); });
    dd.querySelectorAll('.le-sd-item:not(.le-sd-inactive)').forEach(function(item) {
      item.addEventListener('click', function(e) {
        e.stopPropagation();
        _addSectionBack(page, item.dataset.leSwitchTo, insertIdx);
        _closeDropdown();
      });
    });
    var rect = btn.getBoundingClientRect();
    dd.style.top = (rect.bottom + 6) + 'px';
    dd.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 220)) + 'px';
    document.body.appendChild(dd);
    _openDropdown = dd;
    _dropdownCloseHandler = function(ev) {
      if (!_openDropdown || (!_openDropdown.contains(ev.target) && !btn.contains(ev.target))) {
        _closeDropdown();
      }
    };
    setTimeout(function() { document.addEventListener('click', _dropdownCloseHandler); }, 0);
  }

  return {
    isActive() { return _active; },
    activate() {
      sessionStorage.setItem('yrs-live-edit', '1');
      _active = true;
      if (_toolbar) _toolbar.remove();
      _toolbar = document.createElement('div');
      _toolbar.className = 'live-edit-toolbar';
      _toolbar.innerHTML = '<div class="le-left"><span class="le-dot"></span><span class="le-label">LIVE EDIT MODE</span></div><span class="le-page" id="lePage"></span><button class="le-exit" id="leExit">Exit</button>';
      document.body.appendChild(_toolbar);
      document.body.classList.add('live-edit-active');
      _toolbar.querySelector('#leExit').addEventListener('click', () => this.deactivate());
      if (_appHandler) document.getElementById('app').removeEventListener('click', _appHandler);
      _appHandler = _handleClick;
      document.getElementById('app').addEventListener('click', _appHandler);
      this.updatePage();
    },
    deactivate() {
      sessionStorage.removeItem('yrs-live-edit');
      _active = false;
      if (_toolbar) { _toolbar.remove(); _toolbar = null; }
      document.body.classList.remove('live-edit-active');
      if (_appHandler && document.getElementById('app')) document.getElementById('app').removeEventListener('click', _appHandler);
      _appHandler = null;
      this._removeOverlays();
      _closeDropdown();
    },
    updatePage() {
      const el = document.querySelector('#lePage');
      if (el) el.textContent = location.hash || '/';
      this._renderSectionOverlays();
    },
    _renderSectionOverlays() {
      this._removeOverlays();
      _closeDropdown();
      var page = _detectPage();
      if (!page) return;
      var app = document.getElementById('app');
      if (!app) return;
      var pageEl = app.querySelector('.page');
      if (!pageEl) return;
      var sections = SEC_MAP[page];
      if (!sections) return;
      var data = App.use('data');
      var hasOrder = !!data.getSectionOrder(page);
      var visibleSections = [];
      var hiddenSections = [];

      sections.forEach(function(sec) {
        var el = sec.find(app);
        if (!data.isSection(page, sec.id)) {
          hiddenSections.push(sec);
          return;
        }
        if (!el) return;
        visibleSections.push({ sec: sec, el: el });
      });

      /* Insert add-section dividers between visible sections */
      var prevEl = null;
      visibleSections.forEach(function(vs, idx) {
        if (prevEl) {
          var divider = document.createElement('div');
          divider.className = 'le-divider';
          divider.innerHTML = '<button class="le-divider-btn" title="Add section here"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>Add Section</span></button>';
          pageEl.insertBefore(divider, vs.el);
          var dividerBtn = divider.querySelector('.le-divider-btn');
          dividerBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            _openDividerMenu(dividerBtn, page, idx);
          });
        }
        prevEl = vs.el;
      });

      /* Add divider after last visible section */
      if (prevEl) {
        var lastDivider = document.createElement('div');
        lastDivider.className = 'le-divider';
        lastDivider.innerHTML = '<button class="le-divider-btn" title="Add section here"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>Add Section</span></button>';
        var lastChild = prevEl.nextSibling;
        pageEl.insertBefore(lastDivider, lastChild);
        var lastDividerBtn = lastDivider.querySelector('.le-divider-btn');
        lastDividerBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          _openDividerMenu(lastDividerBtn, page, visibleSections.length);
        });
      }

      /* Render badges on visible sections */
      visibleSections.forEach(function(vs) {
        var el = vs.el;
        var sec = vs.sec;
        el.style.position = 'relative';
        var badge = document.createElement('div');
        badge.className = 'le-section-badge';
        var label = _getLabel(page, sec.id);
        var canSwitch = !!SEC_SWITCH_MAP[page];
        var html = '<button class="le-sec-name' + (canSwitch ? ' le-sec-name-clickable' : '') + '" title="Click to switch type">' + label + (canSwitch ? ' <svg class="le-sd-caret" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>' : '') + '</button>';
        if (hasOrder && SEC_TO_ORDER[page] && SEC_TO_ORDER[page][sec.id]) {
          html += '<button class="le-sec-up" title="Move up">&#9650;</button>'
            + '<button class="le-sec-down" title="Move down">&#9660;</button>';
        }
        html += '<button class="le-sec-remove" title="Remove section">&times;</button>';
        badge.innerHTML = html;

        badge.addEventListener('click', function(e) { e.stopPropagation(); });

        if (canSwitch) {
          var nameBtn = badge.querySelector('.le-sec-name');
          nameBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            _openSwitchDropdown(nameBtn, page, sec.id);
          });
        }

        badge.querySelector('.le-sec-remove').addEventListener('click', function(e) {
          e.stopPropagation();
          data.toggleSection(page, sec.id);
          App.use('router').navigate(location.hash.replace('#', '') || '/shop');
        });
        var upBtn = badge.querySelector('.le-sec-up');
        var downBtn = badge.querySelector('.le-sec-down');
        if (upBtn) upBtn.addEventListener('click', function(e) { e.stopPropagation(); _moveSection(page, sec.id, -1); });
        if (downBtn) downBtn.addEventListener('click', function(e) { e.stopPropagation(); _moveSection(page, sec.id, 1); });

        el.appendChild(badge);
      });

      /* Show hidden sections in a bottom bar */
      if (hiddenSections.length) this._showHiddenBar(page, hiddenSections);
    },
    _removeOverlays() {
      document.querySelectorAll('.le-section-badge, .le-divider, .le-hidden-bar').forEach(function(el) { el.remove(); });
    },
    _showHiddenBar(page, hidden) {
      var existing = document.querySelector('.le-hidden-bar');
      if (existing) existing.remove();
      var bar = document.createElement('div');
      bar.className = 'le-hidden-bar';
      var html = '<span class="le-hb-label">Hidden:</span>';
      hidden.forEach(function(sec) {
        var label = _getLabel(page, sec.id);
        html += '<button class="le-hb-item" data-le-hidden-id="' + sec.id + '">' + label + ' <span class="le-hb-plus">+</span></button>';
      });
      bar.innerHTML = html;
      bar.addEventListener('click', function(e) { e.stopPropagation(); });
      bar.querySelectorAll('.le-hb-item').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          _addSectionBack(page, btn.dataset.leHiddenId);
        });
      });
      document.body.appendChild(bar);
    },
    check() {
      if (sessionStorage.getItem('yrs-live-edit') === '1' && App.use('auth').check()) {
        this.activate();
      }
    }
  };
})());

/* ── Share Helpers ── */
App.register('share', (() => {
  const SVGS = {
    x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>',
    pinterest: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>'
  };

  return {
    svg(id) { return SVGS[id] || ''; },
    url(id, product) {
      const u = encodeURIComponent(location.href);
      const t = encodeURIComponent(product.name + ' — YRS Brand');
      const map = {
        x:        `https://x.com/intent/tweet?text=${t}&url=${u}`,
        instagram: null,
        pinterest:`https://pinterest.com/pin/create/button/?url=${u}&description=${t}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
        whatsapp: `https://wa.me/?text=${t}%20${u}`,
        copy:     null
      };
      return map[id];
    },
    async exec(id, product) {
      if (id === 'copy') {
        try { await navigator.clipboard.writeText(location.href); } catch { /* fallback */ }
        App.use('toast').show('Link copied');
        return;
      }
      if (id === 'instagram') {
        try { await navigator.clipboard.writeText(location.href); } catch { /* */ }
        App.use('toast').show('Link copied for Instagram');
        return;
      }
      const url = this.url(id, product);
      if (url) window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
    }
  };
})());