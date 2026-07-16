/* ═══════════════════════════════════════════
   YRS Brand Shop — UI (Components & Routes)
   ═══════════════════════════════════════════ */

const HEART_OUTLINE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>';

/* ── Content Key Seeding ── */
function _seedKeys(app, routeKey, extras) {
  const MAP = {
    'shop': [
      ['.hero h1', 'shop.hero.title'],
      ['.hero-sub', 'shop.hero.subtitle'],
      ['.hero-scroll', 'shop.hero.scroll'],
      ['.featured-strip h3', 'shop.featured.title'],
      ['.featured-strip a', 'shop.featured.link']
    ],
    'products': [
      ['.hero h1', 'products.title'],
      ['.hero-sub', 'products.count']
    ],
    'product': [
      ['.detail-name', 'product.name'],
      ['.detail-price', 'product.price'],
      ['.detail-desc', 'product.desc'],
      ['.detail-category', 'product.category'],
      ['.detail-note', 'product.note'],
      ['.detail-breadcrumb', 'product.breadcrumb']
    ],
    'cart': [
      ['h1', 'cart.title'],
      ['.cart-empty', 'cart.empty'],
      ['.cart-total-label', 'cart.total-label'],
      ['.btn-checkout', 'cart.checkout']
    ],
    'wishlist': [
      ['h1', 'wishlist.title'],
      ['.wish-empty', 'wishlist.empty']
    ]
  };
  const mappings = MAP[routeKey];
  if (mappings) mappings.forEach(([sel, key]) => {
    const el = app.querySelector(sel);
    if (el) el.dataset.editKey = key;
  });
  if (extras) Object.entries(extras).forEach(([sel, key]) => {
    const el = app.querySelector(sel);
    if (el) el.dataset.editKey = key;
  });
}

/* ═══════════════════════════════════════════
   Components
   ═══════════════════════════════════════════ */
App.register('components', (() => {
  const data = App.use('data');
  const wishlist = App.use('wishlist');
  const store = App.use('store');
  const share = App.use('share');

  function productImg(p, extraClass) {
    if (p.image) return '<img class="product-img' + (extraClass ? ' ' + extraClass : '') + '" src="' + p.image + '" alt="' + p.name + '" loading="lazy">';
    return null;
  }
  function productCard(p) {
    const isWished = wishlist.has(p.id);
    const typeInfo = data.getType(p.type);
    const cta = typeInfo?.cta || 'Add to Cart';
    const el = document.createElement('div');
    el.className = 'product-card';
    el.innerHTML = `
      ${typeInfo ? '<span class="type-badge">' + typeInfo.name + '</span>' : ''}
      <button class="wish-toggle ${isWished ? 'active' : ''}" data-wish="${p.id}" aria-label="Wishlist">${HEART_OUTLINE}</button>
      <div class="product-card-img" style="background:${p.color}">${productImg(p) || p.name.split(' ').pop()}</div>
      <div class="product-card-info">
        <span class="product-card-name" data-edit-key="product.${p.slug}.card-name">${p.name}</span>
        <span class="product-card-price" data-edit-key="product.${p.slug}.card-price">$${p.price}</span>
      </div>
      <button class="product-card-add" data-add="${p.id}">${cta}</button>`;
    el.addEventListener('click', e => {
      const wt = e.target.closest('[data-wish]');
      if (wt) {
        e.stopPropagation();
        const added = wishlist.toggle(p);
        wt.classList.toggle('active', added);
        App.use('badge').update();
        App.use('badge').bounce('wish');
        App.use('toast').show(added ? p.name + ' wishlisted' : 'Removed from wishlist');
        return;
      }
      if (e.target.closest('[data-add]')) {
        e.stopPropagation();
        store.addItem(p);
        App.use('badge').bounce();
        App.use('toast').show(p.name + ' added');
      } else {
        App.use('router').navigate('/product/' + p.slug);
      }
    });
    return el;
  }

  function productGrid(products) {
    const grid = document.createElement('div');
    grid.className = 'product-grid';
    products.forEach(p => grid.appendChild(productCard(p)));
    return grid;
  }

  function sharePanel(p) {
    if (!data.isSection('product', 'share')) return null;
    const platforms = data.getShare().filter(s => s.active);
    if (!platforms.length) return null;

    const wrap = document.createElement('div');
    wrap.className = 'share-wrap';

    const btn = document.createElement('button');
    btn.className = 'btn-share';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Share';
    wrap.appendChild(btn);

    let panel = null;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (panel) { panel.remove(); panel = null; return; }
      panel = document.createElement('div');
      panel.className = 'share-panel';
      platforms.forEach(s => {
        const opt = document.createElement('div');
        opt.className = 'share-option';
        opt.innerHTML = share.svg(s.id) + '<span>' + s.name + '</span>';
        opt.addEventListener('click', e => { e.stopPropagation(); share.exec(s.id, p); panel.remove(); panel = null; });
        panel.appendChild(opt);
      });
      wrap.appendChild(panel);
      requestAnimationFrame(() => {
        const rect = panel.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 40) {
          panel.style.top = 'auto';
          panel.style.bottom = '100%';
          panel.style.borderTop = 'none';
          panel.style.borderBottom = '1px solid var(--border)';
          panel.style.animation = 'none';
          panel.style.transform = 'translateY(4px)';
          requestAnimationFrame(() => { panel.style.transition = 'transform 0.2s var(--ease)'; panel.style.transform = 'translateY(0)'; });
        }
      });
      const close = ev => { if (!wrap.contains(ev.target)) { panel.remove(); panel = null; document.removeEventListener('click', close); } };
      setTimeout(() => document.addEventListener('click', close), 0);
    });

    return wrap;
  }

  function wishlistBtn(p) {
    if (!data.isSection('product', 'wishlist')) return null;
    const isWished = wishlist.has(p.id);
    const btn = document.createElement('button');
    btn.className = 'btn-wish' + (isWished ? ' active' : '');
    btn.innerHTML = HEART_OUTLINE + '<span>' + (isWished ? 'Wishlisted' : 'Add to Wishlist') + '</span>';
    btn.addEventListener('click', () => {
      const added = wishlist.toggle(p);
      btn.classList.toggle('active', added);
      btn.querySelector('span').textContent = added ? 'Wishlisted' : 'Add to Wishlist';
      App.use('badge').update();
      App.use('badge').bounce('wish');
      App.use('toast').show(added ? p.name + ' wishlisted' : 'Removed from wishlist');
    });
    return btn;
  }

  /* ── Carousel Component ── */
  function carousel(config) {
    const products = config.show_all
      ? data.getProducts().slice(0, config.max_items || 8)
      : (config.product_slugs || []).map(s => data.getProduct(s)).filter(Boolean);
    if (!products.length) return null;

    const style = config.style || 'metro';
    const wrap = document.createElement('div');
    wrap.className = 'carousel-wrap';

    const header = document.createElement('div');
    header.className = 'carousel-header';
    const title = document.createElement('h3');
    title.className = 'carousel-title';
    title.textContent = config.title || 'Featured';
    title.dataset.editKey = 'carousel.' + config.id + '.title';
    header.appendChild(title);

    /* Navigation arrows for all styles */
    const nav = document.createElement('div');
    nav.className = 'carousel-nav';
    const prevBtn = document.createElement('button');
    prevBtn.className = 'carousel-arrow carousel-prev';
    prevBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
    const nextBtn = document.createElement('button');
    nextBtn.className = 'carousel-arrow carousel-next';
    nextBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
    nav.appendChild(prevBtn);
    nav.appendChild(nextBtn);
    header.appendChild(nav);
    wrap.appendChild(header);

    const track = document.createElement('div');
    track.className = 'carousel-track carousel-track--' + style;
    track.dataset.carouselStyle = style;

    products.forEach(p => {
      const card = document.createElement('a');
      card.href = '/product/' + p.slug;
      card.dataset.nav = '/product/' + p.slug;
      card.className = 'carousel-card';
      const typeInfo = data.getType(p.type);
      card.innerHTML = '<div class="carousel-card-img" style="background:' + p.color + '">'
        + (productImg(p) || '')
        + (typeInfo ? '<span class="type-badge" style="position:static;opacity:0.6;margin:0">' + typeInfo.name + '</span>' : '')
        + (!p.image ? p.name.split(' ').pop() : '') + '</div>'
        + '<div class="carousel-card-info"><span class="carousel-card-name">' + p.name + '</span><span class="carousel-card-price">$' + p.price + '</span></div>';
      track.appendChild(card);
    });

    wrap.appendChild(track);

    /* Dot indicators */
    if (style === 'metro' && products.length > 1) {
      const dots = document.createElement('div');
      dots.className = 'carousel-dots';
      products.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        dot.dataset.dot = i;
        dot.setAttribute('aria-label', 'Slide ' + (i + 1));
        dots.appendChild(dot);
      });
      wrap.appendChild(dots);
    }

    /* Behavior: metro = slide carousel, others = scroll */
    if (style === 'metro' && products.length > 1) {
      let idx = 0;
      const total = products.length;
      const perView = () => window.innerWidth <= 768 ? 1 : window.innerWidth <= 1024 ? 2 : 4;
      const maxIdx = () => Math.max(0, total - perView());

      function goTo(newIdx) {
        idx = Math.max(0, Math.min(newIdx, maxIdx()));
        track.style.transform = 'translateX(-' + (idx * (100 / perView())) + '%)';
        wrap.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
      }

      prevBtn.addEventListener('click', () => goTo(idx - 1));
      nextBtn.addEventListener('click', () => goTo(idx + 1));
      wrap.querySelectorAll('.carousel-dot').forEach(d => d.addEventListener('click', () => goTo(+d.dataset.dot)));

      let autoTimer = setInterval(() => goTo(idx >= maxIdx() ? 0 : idx + 1), 4000);
      wrap.addEventListener('mouseenter', () => clearInterval(autoTimer));
      wrap.addEventListener('mouseleave', () => { autoTimer = setInterval(() => goTo(idx >= maxIdx() ? 0 : idx + 1), 4000); });
      wrap.addEventListener('touchstart', () => clearInterval(autoTimer), { passive: true });
      wrap.addEventListener('touchend', () => { autoTimer = setInterval(() => goTo(idx >= maxIdx() ? 0 : idx + 1), 4000); }, { passive: true });

      window.addEventListener('resize', () => goTo(Math.min(idx, maxIdx())));
    } else {
      /* Scroll-based carousels */
      const scrollAmt = style === 'compact' ? 180 : style === 'minimal' ? 260 : 240;
      prevBtn.addEventListener('click', () => track.scrollBy({ left: -scrollAmt, behavior: 'smooth' }));
      nextBtn.addEventListener('click', () => track.scrollBy({ left: scrollAmt, behavior: 'smooth' }));
    }

    return wrap;
  }

  /* ── Hero Component ── */
  function hero(config) {
    const style = config.style || 'full';
    const el = document.createElement('div');
    el.className = 'hero hero--' + style;
    el.dataset.editKey = 'hero.' + config.id + '.wrap';

    if (style === 'full') {
      el.innerHTML = '<h1 data-edit-key="hero.' + config.id + '.title">' + (config.title || 'Shop') + '</h1>'
        + '<div class="hero-sub" data-edit-key="hero.' + config.id + '.subtitle">' + (config.subtitle || '') + '</div>'
        + (config.scroll_text ? '<div class="hero-scroll" data-edit-key="hero.' + config.id + '.scroll">' + config.scroll_text + '</div>' : '');
    } else if (style === 'split') {
      el.innerHTML = '<div class="hero-split-content">'
        + '<h1 data-edit-key="hero.' + config.id + '.title">' + (config.title || 'Shop') + '</h1>'
        + '<div class="hero-sub" data-edit-key="hero.' + config.id + '.subtitle">' + (config.subtitle || '') + '</div>'
        + '</div><div class="hero-split-accent"></div>';
    } else if (style === 'minimal') {
      el.innerHTML = '<div class="hero-minimal-wrap">'
        + '<div class="hero-minimal-label">' + (config.subtitle || '') + '</div>'
        + '<h1 data-edit-key="hero.' + config.id + '.title">' + (config.title || 'Shop') + '</h1>'
        + '</div>';
    } else if (style === 'accent') {
      el.innerHTML = '<div class="hero-accent-bar"></div>'
        + '<h1 data-edit-key="hero.' + config.id + '.title">' + (config.title || 'Shop') + '</h1>'
        + '<div class="hero-sub" data-edit-key="hero.' + config.id + '.subtitle">' + (config.subtitle || '') + '</div>';
    }

    return el;
  }

  /* ── Mailing List Component ── */
  function mailingList(config) {
    const style = config.style || 'inline';
    const el = document.createElement('div');
    el.className = 'ml-wrap ml-wrap--' + style;

    const form = document.createElement('form');
    form.className = 'ml-form';
    form.addEventListener('submit', e => {
      e.preventDefault();
      const email = form.querySelector('.ml-input').value.trim();
      if (!email || !email.includes('@')) { App.use('toast').show('Please enter a valid email'); return; }
      form.querySelector('.ml-input').value = '';
      App.use('toast').show('Subscribed — ' + email);
    });

    if (style === 'inline') {
      form.innerHTML = '<div class="ml-inline-inner">'
        + '<div class="ml-text"><div class="ml-heading" data-edit-key="ml.' + config.id + '.heading">' + (config.heading || 'Stay in the Loop') + '</div>'
        + '<div class="ml-sub" data-edit-key="ml.' + config.id + '.sub">' + (config.subheading || '') + '</div></div>'
        + '<div class="ml-inline-form"><input type="email" class="ml-input" placeholder="' + (config.placeholder || 'Your email') + '" required>'
        + '<button type="submit" class="ml-btn">' + (config.button_text || 'Subscribe') + '</button></div></div>';
    } else if (style === 'banner') {
      form.innerHTML = '<div class="ml-banner-inner">'
        + '<div class="ml-heading" data-edit-key="ml.' + config.id + '.heading">' + (config.heading || 'Join the List') + '</div>'
        + '<div class="ml-sub" data-edit-key="ml.' + config.id + '.sub">' + (config.subheading || '') + '</div>'
        + '<div class="ml-banner-form"><input type="email" class="ml-input" placeholder="' + (config.placeholder || 'Your email') + '" required>'
        + '<button type="submit" class="ml-btn">' + (config.button_text || 'Subscribe') + '</button></div></div>';
    } else if (style === 'minimal') {
      form.innerHTML = '<div class="ml-minimal-inner">'
        + '<span class="ml-heading" data-edit-key="ml.' + config.id + '.heading" style="font-size:0.6rem;font-weight:600;letter-spacing:0.2em;text-transform:uppercase">' + (config.heading || 'Newsletter') + '</span>'
        + '<input type="email" class="ml-input" placeholder="' + (config.placeholder || 'Email') + '" required>'
        + '<button type="submit" class="ml-btn ml-btn--outline">' + (config.button_text || 'Go') + '</button></div>';
    } else if (style === 'full') {
      form.innerHTML = '<div class="ml-full-inner">'
        + '<div class="ml-full-label" data-edit-key="ml.' + config.id + '.sub">' + (config.subheading || 'Stay connected') + '</div>'
        + '<div class="ml-heading" data-edit-key="ml.' + config.id + '.heading">' + (config.heading || 'Join the Community') + '</div>'
        + '<div class="ml-full-form"><input type="email" class="ml-input" placeholder="' + (config.placeholder || 'Enter your email') + '" required>'
        + '<button type="submit" class="ml-btn">' + (config.button_text || 'Subscribe') + '</button></div></div>';
    }

    el.appendChild(form);
    return el;
  }

  return { productCard, productGrid, sharePanel, wishlistBtn, carousel, hero, mailingList, productImg };
})());

/* ═══════════════════════════════════════════
   Route: /shop
   ═══════════════════════════════════════════ */
App.use('router').on('shop', (app) => {
  const data = App.use('data');
  const C = App.use('components');
  const page = document.createElement('div');
  page.className = 'page';

  /* Heroes (dynamic, admin-manageable) */
  if (data.isSection('shop', 'hero')) {
    const heroes = data.getHeroes('shop').filter(h => h.active !== false);
    if (heroes.length) {
      heroes.forEach(h => page.appendChild(C.hero(h)));
    } else {
      page.appendChild(C.hero({ id: 'hero-main', style: 'full', title: 'Shop', subtitle: 'Curated Essentials', scroll_text: 'Scroll' }));
    }
  }

  const sheet = document.createElement('div');
  sheet.className = 'sheet';

  /* Build sections in configured order, fallback to default order */
  const sectionOrder = data.getSectionOrder('shop');
  const defaultOrder = ['categories', 'featured', 'carousels', 'products', 'mailing'];
  const order = sectionOrder && sectionOrder.length ? sectionOrder : defaultOrder;

  order.forEach(secId => {
    if (secId === 'categories' && data.isSection('shop', 'categories')) {
      data.getCategories().forEach(cat => {
        const card = document.createElement('a');
        card.className = 'cat-card';
        card.href = '/products/' + cat.slug;
        card.innerHTML = '<h2 data-edit-key="category.' + cat.slug + '.name">' + cat.name + '</h2><div class="cat-count" data-edit-key="category.' + cat.slug + '.count">' + cat.count + ' pieces</div><div class="cat-arrow">&rarr;</div>';
        sheet.appendChild(card);
      });
    }
    if (secId === 'featured' && data.isSection('shop', 'featured')) {
      const strip = document.createElement('div');
      strip.className = 'featured-strip';
      strip.innerHTML = '<h3>All Products</h3><a href="/products">View All &rarr;</a>';
      sheet.appendChild(strip);
    }
    if (secId === 'carousels' && data.isSection('shop', 'carousel')) {
      data.getCarousels('shop').forEach(car => {
        const c = C.carousel(car);
        if (c) { c.style.gridColumn = 'span 4'; sheet.appendChild(c); }
      });
    }
    if (secId === 'products' && data.isSection('shop', 'products')) {
      sheet.appendChild(C.productGrid(data.getProducts().slice(0, 4)));
    }
    if (secId === 'mailing' && data.isSection('shop', 'mailing')) {
      data.getMailingLists('shop').forEach(ml => {
        const m = C.mailingList(ml);
        if (m) { m.style.gridColumn = 'span 4'; sheet.appendChild(m); }
      });
    }
  });

  page.appendChild(sheet);
  app.appendChild(page);
  _seedKeys(app, 'shop');
});

/* ═══════════════════════════════════════════
   Route: /products
   ═══════════════════════════════════════════ */
App.use('router').on('products$', (app) => {
  const data = App.use('data');
  const C = App.use('components');
  const page = document.createElement('div');
  page.className = 'page';
  page.innerHTML = '<div class="hero" style="padding:clamp(32px,6vw,64px) clamp(16px,4vw,48px)"><h1>All Products</h1><div class="hero-sub">' + data.getProducts().length + ' pieces</div></div>';
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.appendChild(C.productGrid(data.getProducts()));
  page.appendChild(sheet);
  app.appendChild(page);
  _seedKeys(app, 'products');
});

/* ═══════════════════════════════════════════
   Route: /products/:category
   ═══════════════════════════════════════════ */
App.use('router').on('products/(.+)', (app, [cat]) => {
  const data = App.use('data');
  const C = App.use('components');
  const category = data.getCategory(cat);
  const products = data.getProducts(cat);
  if (!category) return;

  const page = document.createElement('div');
  page.className = 'page';
  page.innerHTML = '<div class="hero" style="padding:clamp(32px,6vw,64px) clamp(16px,4vw,48px)">'
    + '<div style="font-size:0.6rem;font-weight:500;letter-spacing:0.2em;text-transform:uppercase;color:var(--muted);margin-bottom:12px;cursor:pointer" data-nav="/shop">Back</div>'
    + '<h1>' + category.name + '</h1>'
    + '<div class="hero-sub">' + products.length + ' pieces</div></div>';
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.appendChild(C.productGrid(products));
  page.appendChild(sheet);
  app.appendChild(page);
  _seedKeys(app, 'products', {
    '.hero h1': 'products.' + cat + '.title',
    '.hero-sub': 'products.' + cat + '.count'
  });
});

/* ═══════════════════════════════════════════
   Route: /product/:slug
   ═══════════════════════════════════════════ */
App.use('router').on('product/(.+)', (app, [slug]) => {
  const data = App.use('data');
  const wishlist = App.use('wishlist');
  const C = App.use('components');
  const p = data.getProduct(slug);
  if (!p) return;
  const typeInfo = data.getType(p.type);

  const page = document.createElement('div');
  page.className = 'page';

  let html = '<div class="detail-layout">';

  if (data.isSection('product', 'image')) {
    html += '<div class="detail-image" style="background:#fff">' + (C.productImg(p, 'detail-hero') || p.name) + '</div>';
  }

  if (data.isSection('product', 'info')) {
    html += '<div class="detail-info">';
    if (data.isSection('product', 'breadcrumb')) {
      html += '<div class="detail-breadcrumb"><span data-nav="/shop">Shop</span> / <span data-nav="/products/' + p.category + '">' + p.category + '</span> / ' + p.name + '</div>';
    }
    if (typeInfo) html += '<div class="detail-type-badge">' + typeInfo.name + '</div>';
    html += '<h1 class="detail-name">' + p.name + '</h1>'
      + '<div class="detail-price" id="detailPrice">$' + p.price + '</div>'
      + '<p class="detail-desc">' + p.desc + '</p>'
      + '<div class="detail-category">' + p.category + '</div>'
      + '<div id="optionSlot"></div>'
      + '<div class="detail-actions"><button class="btn-add-cart" id="btnAdd"><span class="btn-text">' + (typeInfo?.cta || 'Add to Cart') + '</span><span class="btn-confirm">Added &#10003;</span></button><button class="btn-wish-detail' + (wishlist.has(p.id) ? ' active' : '') + '" id="btnWish" aria-label="Wishlist">' + HEART_OUTLINE + '<span class="wish-tooltip">' + (wishlist.has(p.id) ? 'Wishlisted' : 'Add to Wishlist') + '</span></button></div>'
      + '<div id="detailNote"></div>'
      + '<div id="shareSlot"></div>'
      + '</div>';
  }
  html += '</div>';
  page.innerHTML = html;

  /* options */
  let selectedOption = null;
  const optSlot = page.querySelector('#optionSlot');
  if (optSlot && p.options && p.options.length) {
    const group = document.createElement('div');
    group.className = 'option-group';
    const label = document.createElement('div');
    label.className = 'option-label';
    label.textContent = p.type === 'merchandise' ? 'Size' : p.type === 'digital' ? 'Format' : 'Option';
    group.appendChild(label);
    const pills = document.createElement('div');
    pills.className = 'option-pills';
    p.options.forEach((opt, i) => {
      const pill = document.createElement('button');
      pill.className = 'option-pill' + (i === 0 ? ' active' : '');
      let text = opt.label;
      if (opt.price_mod > 0) text += '<span class="price-delta">+$' + opt.price_mod + '</span>';
      else if (opt.price_mod < 0) text += '<span class="price-delta">-$' + Math.abs(opt.price_mod) + '</span>';
      pill.innerHTML = text;
      pill.addEventListener('click', () => {
        pills.querySelectorAll('.option-pill').forEach(x => x.classList.remove('active'));
        pill.classList.add('active');
        selectedOption = opt;
        const priceEl = page.querySelector('#detailPrice');
        if (priceEl) priceEl.textContent = '$' + (p.price + (opt.price_mod || 0));
      });
      if (i === 0) selectedOption = opt;
      pills.appendChild(pill);
    });
    group.appendChild(pills);
    optSlot.appendChild(group);
  }

  /* type-specific note */
  const noteSlot = page.querySelector('#detailNote');
  if (noteSlot && typeInfo) {
    const notes = {
      digital: 'Instant delivery. Download link sent to email.',
      physical_cd: 'Ships within 3-5 business days.',
      vinyl: 'Expected ship date: Q4 2025. Includes digital download.',
      bundle: 'Physical items ship together. Digital items delivered instantly.'
    };
    if (notes[typeInfo.id]) {
      noteSlot.innerHTML = '<div class="detail-note">' + notes[typeInfo.id] + '</div>';
    }
  }

  const addBtn = page.querySelector('#btnAdd');
  if (addBtn) {
    addBtn.addEventListener('click', function () {
      const item = selectedOption ? { ...p, price: p.price + (selectedOption.price_mod || 0), selectedOption: selectedOption.label } : p;
      App.use('store').addItem(item);
      App.use('badge').bounce();
      App.use('toast').show(p.name + (selectedOption ? ' (' + selectedOption.label + ')' : '') + ' added');
      this.classList.add('added');
      setTimeout(() => this.classList.remove('added'), 1500);
    });
  }

  /* ── Upsell Banner ── */
  if (p.upsell && data.isSection('product', 'upsell')) {
    const upsellProduct = data.getProduct(p.upsell);
    if (upsellProduct) {
      const upsellEl = document.createElement('div');
      upsellEl.className = 'upsell-banner';
      const msg = p.upsell_msg || 'Complete the look';
      const upsellDisc = data.getProductDiscount(upsellProduct.slug);
      const upsellPriceHtml = upsellDisc
        ? '<span style="text-decoration:line-through;color:var(--muted);font-size:0.7rem;margin-right:6px">$' + upsellDisc.originalPrice + '</span>$' + upsellDisc.discountedPrice + ' <span style="font-size:0.55rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;background:var(--fg);color:var(--bg);padding:2px 6px;margin-left:4px">' + upsellDisc.discountLabel + '</span>'
        : '$' + upsellProduct.price;
      upsellEl.innerHTML = '<div class="upsell-img-wrap">' + (C.productImg(upsellProduct) || '<div class="upsell-img-fb">' + upsellProduct.name.split(' ').pop() + '</div>') + '</div><div class="upsell-text"><div class="upsell-label">' + msg + '</div><div class="upsell-product-name">' + upsellProduct.name + '</div><div class="upsell-price">' + upsellPriceHtml + '</div></div><button class="upsell-btn" id="upsellBtn">Add Both</button>';
      const noteSlot = page.querySelector('#detailNote');
      if (noteSlot) noteSlot.parentNode.insertBefore(upsellEl, noteSlot);
      else addBtn.parentNode.insertBefore(upsellEl, addBtn);
      page.querySelector('#upsellBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        App.use('store').addItem(p);
        const disc = data.getProductDiscount(upsellProduct.slug);
        if (disc) {
          App.use('store').addItem({ ...upsellProduct, price: disc.discountedPrice, _originalPrice: disc.originalPrice, _discounted: true });
        } else {
          App.use('store').addItem(upsellProduct);
        }
        App.use('badge').bounce();
        App.use('toast').show('Both items added to cart');
      });
    }
  }

  /* ── You May Also Like ── */
  const relatedProducts = data.getRelatedProducts(slug);
  if (relatedProducts.length && data.isSection('product', 'related')) {
    const section = document.createElement('div');
    section.className = 'related-section';
    section.innerHTML = '<h3 class="related-title" data-edit-key="product.related.title">You May Also Like</h3>';
    const scroll = document.createElement('div');
    scroll.className = 'related-scroll';
    relatedProducts.forEach(rp => {
      const card = document.createElement('a');
      card.href = '/product/' + rp.slug;
      card.dataset.nav = '/product/' + rp.slug;
      card.className = 'related-card';
      const typeInfo = data.getType(rp.type);
      card.innerHTML = '<div class="related-card-img" style="background:' + rp.color + '">' + (C.productImg(rp) || '') + (typeInfo ? '<span class="type-badge" style="position:static;opacity:0.6;margin:0">' + typeInfo.name + '</span>' : '') + (!rp.image ? rp.name.split(' ').pop() : '') + '</div><div class="related-card-info"><span class="related-card-name">' + rp.name + '</span><span class="related-card-price">$' + rp.price + '</span></div>';
      scroll.appendChild(card);
    });
    section.appendChild(scroll);
    page.querySelector('.detail-layout').appendChild(section);
  }

  /* ── Inline Wishlist Button ── */
  const wishBtn = page.querySelector('#btnWish');
  if (wishBtn) {
    wishBtn.addEventListener('click', () => {
      const added = wishlist.toggle(p);
      wishBtn.classList.toggle('active', added);
      const tip = wishBtn.querySelector('.wish-tooltip');
      if (tip) tip.textContent = added ? 'Wishlisted' : 'Add to Wishlist';
      App.use('badge').update();
      App.use('badge').bounce('wish');
      App.use('toast').show(added ? p.name + ' wishlisted' : 'Removed from wishlist');
    });
  }

  const shareSlot = page.querySelector('#shareSlot');
  if (shareSlot) { const sp = C.sharePanel(p); if (sp) shareSlot.appendChild(sp); }

  app.appendChild(page);
  _seedKeys(app, 'product', {
    '.detail-name': 'product.' + slug + '.name',
    '.detail-price': 'product.' + slug + '.price',
    '.detail-desc': 'product.' + slug + '.desc',
    '.detail-category': 'product.' + slug + '.category'
  });
});

/* ═══════════════════════════════════════════
   Route: /cart (with checkout upsells)
   ═══════════════════════════════════════════ */
App.use('router').on('cart', (app) => {
  const store = App.use('store');
  const data = App.use('data');
  const pImg = App.use('components').productImg;
  let cart = store.getCart();

  function render() {
    cart = store.getCart();
    app.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'page';
    const layout = document.createElement('div');
    layout.className = 'cart-layout';
    layout.innerHTML = '<h1>Cart</h1>';

    if (!cart.length) {
      layout.innerHTML += '<div class="cart-empty">Your cart is empty</div>';
      const back = document.createElement('a');
      back.href = '/shop'; back.dataset.nav = '/shop';
      back.style.cssText = 'display:block;text-align:center;margin-top:24px;font-size:0.65rem;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;border-bottom:1px solid var(--fg);padding-bottom:2px';
      back.textContent = 'Continue Shopping';
      layout.appendChild(back);
    } else {
      cart.forEach((item, i) => {
        const row = document.createElement('div');
        row.className = 'cart-item';
        row.style.animationDelay = (i * 0.05) + 's';
        const priceHtml = item._discounted && item._originalPrice
          ? '<span style="text-decoration:line-through;color:var(--muted);font-size:0.7rem;margin-right:6px">$' + item._originalPrice + '</span>$' + item.price * item.qty
          : '$' + item.price * item.qty;
        row.innerHTML = '<div class="cart-item-img" style="background:' + item.color + '">' + (pImg(item) || item.name.split(' ').pop()) + '</div>'
          + '<div><div class="cart-item-name">' + item.name + '</div><div class="cart-item-cat">' + item.category + '</div></div>'
          + '<div class="cart-item-price">' + priceHtml + '</div>'
          + '<div class="cart-qty"><button data-qty-minus="' + item.id + '">&minus;</button><span>' + item.qty + '</span><button data-qty-plus="' + item.id + '">&plus;</button></div>'
          + '<button class="cart-item-remove" data-remove="' + item.id + '">&times;</button>';
        layout.appendChild(row);
      });

      /* ── Checkout Upsells ── */
      if (data.isSection('cart', 'upsells')) {
        const upsells = data.getCheckoutUpsells().filter(u => !store.hasItem(u.product_slug));
        if (upsells.length) {
          const section = document.createElement('div');
          section.className = 'checkout-upsell-section';
          section.innerHTML = '<div class="checkout-upsell-heading">Frequently Added</div>';
          const grid = document.createElement('div');
          grid.className = 'checkout-upsell-grid';
          upsells.forEach(u => {
            const item = document.createElement('div');
            item.className = 'checkout-upsell-item';
            item.innerHTML = '<div class="cu-img" style="background:' + u.product.color + '">' + (pImg(u.product) || u.product.name.split(' ').pop()) + '</div>'
              + '<div class="cu-info"><div class="cu-name">' + u.product.name + '</div>'
              + '<div class="cu-pricing"><span class="cu-original">$' + u.originalPrice + '</span>'
              + '<span class="cu-discounted">$' + u.discountedPrice + '</span>'
              + (u.discountLabel ? '<span class="cu-badge">' + u.discountLabel + '</span>' : '') + '</div>'
              + '<div class="cu-msg">' + u.message + '</div></div>'
              + '<button class="cu-add" data-cu-slug="' + u.product.slug + '" data-cu-price="' + u.discountedPrice + '" data-cu-original="' + u.originalPrice + '">Add — $' + u.discountedPrice + '</button>';
            grid.appendChild(item);
          });
          section.appendChild(grid);
          layout.appendChild(section);
        }
      }

      if (data.isSection('cart', 'total')) {
        const footer = document.createElement('div');
        footer.className = 'cart-footer';
        footer.innerHTML = '<span class="cart-total-label">Total</span><span class="cart-total-val">$' + store.getTotal() + '</span>';
        layout.appendChild(footer);
      }

      if (data.isSection('cart', 'checkout')) {
        const btn = document.createElement('button');
        btn.className = 'btn-checkout';
        btn.textContent = 'Checkout';
        btn.addEventListener('click', () => App.use('toast').show('Checkout coming soon'));
        layout.appendChild(btn);
      }
    }

    page.appendChild(layout);
    app.appendChild(page);
    _bind();
    _seedKeys(app, 'cart');
  }

  function _bind() {
    app.querySelectorAll('[data-qty-minus]').forEach(b => b.addEventListener('click', () => {
      const item = cart.find(i => i.id === +b.dataset.qtyMinus);
      if (item.qty <= 1) store.removeItem(item.id); else store.updateQty(item.id, item.qty - 1);
      render();
    }));
    app.querySelectorAll('[data-qty-plus]').forEach(b => b.addEventListener('click', () => {
      store.updateQty(+b.dataset.qtyPlus, cart.find(i => i.id === +b.dataset.qtyPlus).qty + 1);
      render();
    }));
    app.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => {
      store.removeItem(+b.dataset.remove);
      render();
      App.use('toast').show('Item removed');
    }));
    app.querySelectorAll('[data-cu-slug]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const slug = b.dataset.cuSlug;
      const price = +b.dataset.cuPrice;
      const originalPrice = +b.dataset.cuOriginal;
      const p = data.getProduct(slug);
      if (p) { store.addItem({ ...p, price, _originalPrice: originalPrice, _discounted: true }); App.use('badge').bounce(); App.use('toast').show(p.name + ' added'); render(); }
    }));
  }

  render();
});

/* ═══════════════════════════════════════════
   Route: /wishlist
   ═══════════════════════════════════════════ */
App.use('router').on('wishlist', (app) => {
  const wl = App.use('wishlist');
  const store = App.use('store');
  const pImg = App.use('components').productImg;
  const data = App.use('data');
  let items = wl.getItems();

  function render() {
    items = wl.getItems();
    app.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'page';
    const layout = document.createElement('div');
    layout.className = 'cart-layout';
    layout.innerHTML = '<h1>Wishlist</h1>';

    const hashParts = (location.hash || '').split('?');
    const params = new URLSearchParams(hashParts[1] || '');
    if (params.get('w') && !wl.getCount()) {
      const ids = params.get('w').split(',').map(Number).filter(Boolean);
      const all = data.getProducts();
      ids.forEach(id => { const p = all.find(x => x.id === id); if (p) wl.toggle(p); });
      items = wl.getItems();
      location.hash = '/wishlist';
    }

    if (items.length) {
      const shareBar = document.createElement('div');
      shareBar.style.cssText = 'display:flex;gap:12px;align-items:center;margin-bottom:24px';
      const shareBtn = document.createElement('button');
      shareBtn.className = 'admin-btn';
      shareBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Share Wishlist';
      shareBtn.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 16px;font-size:0.6rem;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;border:1px solid var(--border);cursor:pointer;background:none;font-family:var(--sans);transition:background 0.3s ease,color 0.3s ease';
      shareBtn.addEventListener('mouseenter', () => { shareBtn.style.background = 'var(--fg)'; shareBtn.style.color = 'var(--bg)'; });
      shareBtn.addEventListener('mouseleave', () => { shareBtn.style.background = 'none'; shareBtn.style.color = 'var(--fg)'; });
      shareBtn.addEventListener('click', () => {
        const ids = items.map(i => i.id).join(',');
        const url = location.origin + location.pathname + '#/wishlist?w=' + ids;
        navigator.clipboard.writeText(url).then(() => App.use('toast').show('Wishlist link copied'));
      });
      shareBar.appendChild(shareBtn);
      layout.appendChild(shareBar);
    }

    if (!items.length) {
      layout.innerHTML += '<div class="wish-empty">Your wishlist is empty</div>';
      const back = document.createElement('a');
      back.href = '/shop'; back.dataset.nav = '/shop';
      back.style.cssText = 'display:block;text-align:center;margin-top:24px;font-size:0.65rem;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;border-bottom:1px solid var(--fg);padding-bottom:2px';
      back.textContent = 'Browse Products';
      layout.appendChild(back);
    } else {
      if (data.isSection('wishlist', 'items')) {
        items.forEach((item, i) => {
          const row = document.createElement('div');
          row.className = 'wish-item';
          row.style.animationDelay = (i * 0.05) + 's';
          row.innerHTML = '<div class="wish-item-img" style="background:' + item.color + '">' + (pImg(item) || item.name.split(' ').pop()) + '</div>'
            + '<div><div class="wish-item-name" style="cursor:pointer" data-nav="/product/' + item.slug + '">' + item.name + '</div><div class="wish-item-cat">' + item.category + '</div></div>'
            + '<div class="wish-item-price">$' + item.price + '</div>';
          if (data.isSection('wishlist', 'actions')) {
            row.innerHTML += '<div class="wish-item-actions"><button data-wish-cart="' + item.id + '">Add to Cart</button><button class="danger" data-wish-del="' + item.id + '">Remove</button></div>';
          }
          layout.appendChild(row);
        });
      }
    }

    page.appendChild(layout);
    app.appendChild(page);
    _bind();
    _seedKeys(app, 'wishlist');
  }

  function _bind() {
    app.querySelectorAll('[data-wish-cart]').forEach(b => b.addEventListener('click', () => {
      const item = items.find(i => i.id === +b.dataset.wishCart);
      if (item) { store.addItem(item); App.use('badge').bounce(); App.use('toast').show(item.name + ' added to cart'); }
    }));
    app.querySelectorAll('[data-wish-del]').forEach(b => b.addEventListener('click', () => {
      wl.removeItem(+b.dataset.wishDel);
      App.use('badge').update();
      App.use('toast').show('Removed from wishlist');
      render();
    }));
  }

  render();
});

/* ── (404 catch-all registered last in index.html boot) ── */