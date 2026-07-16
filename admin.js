/* ═══════════════════════════════════════════
   YRS Brand Shop — Admin (Full Management)
   Access: triple-click YRS logo → login → /admin
   Tabs: Products | Types | Layout | Share | Categories | Content | Upsells | Design | Newsletter | Live Edit
   ═══════════════════════════════════════════ */

App.use('router').on('admin', (app) => {
  /* Auth guard */
  if (!App.use('auth').check()) {
    App.use('router').go('/shop');
    return;
  }

  const data = App.use('data');
  const content = App.use('content');
  const toast = App.use('toast');
  let _activeTab = 'products';

  function render() {
    app.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'page';
    const layout = document.createElement('div');
    layout.className = 'admin-layout';

    layout.innerHTML = `
      <div class="admin-header-row">
        <div>
          <h1>Admin</h1>
          <div class="admin-sub">YRS Brand Shop Management</div>
        </div>
        <div class="admin-header-actions">
          <button class="admin-btn" id="adminLogout">Logout</button>
          <a href="/shop" data-nav="/shop" class="admin-btn" style="text-decoration:none">View Shop</a>
        </div>
      </div>
      <div class="admin-tabs">
        <button class="admin-tab ${_activeTab==='products'?'active':''}" data-tab="products">Products</button>
        <button class="admin-tab ${_activeTab==='types'?'active':''}" data-tab="types">Types</button>
        <button class="admin-tab ${_activeTab==='layout'?'active':''}" data-tab="layout">Layout</button>
        <button class="admin-tab ${_activeTab==='share'?'active':''}" data-tab="share">Share</button>
        <button class="admin-tab ${_activeTab==='categories'?'active':''}" data-tab="categories">Categories</button>
        <button class="admin-tab ${_activeTab==='upsells'?'active':''}" data-tab="upsells">Upsells</button>
        <button class="admin-tab ${_activeTab==='design'?'active':''}" data-tab="design">Design</button>
        <button class="admin-tab ${_activeTab==='newsletter'?'active':''}" data-tab="newsletter">Newsletter</button>
        <button class="admin-tab ${_activeTab==='content'?'active':''}" data-tab="content">Content</button>
        <button class="admin-tab ${_activeTab==='liveedit'?'active':''}" data-tab="liveedit">Live Edit</button>
      </div>
      <div id="adminTabContent"></div>
      <div class="admin-add-bar">
        <button class="admin-btn" id="adminResetBtn">Reset All Data</button>
        <button class="admin-btn" id="adminPwBtn">Change Password</button>
        <a href="/shop" data-nav="/shop" class="admin-btn" style="text-decoration:none">Back to Shop</a>
      </div>`;

    page.appendChild(layout);
    app.appendChild(page);

    const tabContent = layout.querySelector('#adminTabContent');
    const tabMap = {
      products: renderProducts, types: renderTypes, layout: renderLayout,
      share: renderShare, categories: renderCategories, upsells: renderUpsells,
      design: renderDesign, newsletter: renderNewsletter, content: renderContent,
      liveedit: renderLiveEdit
    };
    tabMap[_activeTab](tabContent);

    layout.querySelectorAll('.admin-tab').forEach(t => t.addEventListener('click', () => {
      _activeTab = t.dataset.tab;
      render();
    }));

    layout.querySelector('#adminLogout').addEventListener('click', () => {
      App.use('auth').logout();
      App.use('liveEdit').deactivate();
      toast.show('Logged out');
      App.use('router').navigate('/shop');
    });

    layout.querySelector('#adminResetBtn').addEventListener('click', () => {
      if (!confirm('Reset ALL data including products, overrides, cart, and wishlist?')) return;
      localStorage.removeItem('yrs-data');
      localStorage.removeItem('yrs-cart');
      localStorage.removeItem('yrs-wishlist');
      localStorage.removeItem('yrs-content');
      content.load();
      toast.show('All data reset');
      App.use('badge').update();
      App.use('router').navigate('/admin');
    });

    layout.querySelector('#adminPwBtn').addEventListener('click', () => _openPasswordModal());
  }

  /* ═══════════════════════════════════════════
     Products Tab
     ═══════════════════════════════════════════ */
  function renderProducts(container) {
    const products = data.getProducts();
    container.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>Product</th><th>Type</th><th>Category</th><th>Price</th><th></th></tr></thead>
        <tbody id="adminBody"></tbody>
      </table>`;

    const tbody = container.querySelector('#adminBody');
    const allTypes = data.getTypes();
    products.forEach(p => {
      const typeInfo = allTypes.find(t => t.id === p.type);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.name}</td>
        <td style="color:var(--muted)">${typeInfo ? typeInfo.name : (p.type || '—')}</td>
        <td style="color:var(--muted)">${p.category}</td>
        <td>$${p.price}</td>
        <td class="td-actions">
          <button class="admin-btn" data-edit="${p.id}">Edit</button>
          <button class="admin-btn danger" data-del="${p.id}">Del</button>
        </td>`;
      tbody.appendChild(tr);
    });

    const addBar = document.createElement('div');
    addBar.className = 'admin-add-bar';
    const addBtn = document.createElement('button');
    addBtn.className = 'admin-btn';
    addBtn.textContent = '+ Add Product';
    addBtn.addEventListener('click', () => _openProductModal(null, render));
    addBar.appendChild(addBtn);
    container.appendChild(addBar);

    tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
      const p = data.getProduct(products.find(x => x.id === +b.dataset.edit)?.slug);
      if (p) _openProductModal(p, render);
    }));
    tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      data.setProducts(data.getProducts().filter(p => p.id !== +b.dataset.del));
      toast.show('Product deleted');
      render();
    }));
  }

  /* ═══════════════════════════════════════════
     Types Tab
     ═══════════════════════════════════════════ */
  function renderTypes(container) {
    const types = data.getTypes();
    container.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>ID</th><th>Name</th><th>CTA</th><th>Products</th><th></th></tr></thead>
        <tbody id="typesBody"></tbody>
      </table>`;

    const tbody = container.querySelector('#typesBody');
    const products = data.getProducts();
    types.forEach(t => {
      const count = products.filter(p => p.type === t.id).length;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="color:var(--muted)">${t.id}</td>
        <td>${t.name}</td>
        <td style="color:var(--muted)">${t.cta}</td>
        <td>${count}</td>
        <td><button class="admin-btn danger" data-type-del="${t.id}">Del</button></td>`;
      tbody.appendChild(tr);
    });

    const addBar = document.createElement('div');
    addBar.className = 'admin-add-bar';
    const addBtn = document.createElement('button');
    addBtn.className = 'admin-btn';
    addBtn.textContent = '+ Add Type';
    addBtn.addEventListener('click', () => _openTypeModal(render));
    addBar.appendChild(addBtn);
    container.appendChild(addBar);

    tbody.querySelectorAll('[data-type-del]').forEach(b => b.addEventListener('click', () => {
      const updated = types.filter(t => t.id !== b.dataset.typeDel);
      data.setTypes(updated);
      toast.show('Type deleted');
      render();
    }));
  }

  /* ═══════════════════════════════════════════
     Layout Tab (Section Arranger + Visibility)
     ═══════════════════════════════════════════ */
  function renderLayout(container) {
    const allData = data.getAll();
    const sections = data.getSections();
    const sectionOrders = allData.section_order || {};
    const labels = { hero:'Hero', categories:'Categories', featured:'Featured Strip', products:'Products', carousel:'Carousel', mailing:'Mailing List' };
    const shopSectionIds = ['categories', 'featured', 'carousels', 'products', 'mailing'];
    const pageNames = { shop:'Shop', products:'Products', product:'Product', cart:'Cart', wishlist:'Wishlist' };

    /* Related Products Settings */
    const settings = data.getSettings();
    const settingsDiv = document.createElement('div');
    settingsDiv.style.cssText = 'margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #eee';
    settingsDiv.innerHTML = '<div style="font-size:0.65rem;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:16px">Related Products Settings</div>';
    const sRow1 = document.createElement('div');
    sRow1.style.cssText = 'display:flex;gap:16px;align-items:center;margin-bottom:0;flex-wrap:wrap';
    const autoChip = document.createElement('button');
    autoChip.className = 'toggle-chip' + (settings.auto_relate !== false ? ' on' : '');
    autoChip.textContent = 'Auto-Relate';
    autoChip.addEventListener('click', () => { data.setSettings({ auto_relate: !data.getSettings().auto_relate }); autoChip.classList.toggle('on'); render(); });
    sRow1.appendChild(autoChip);
    const byLabel = document.createElement('span');
    byLabel.style.cssText = 'font-size:0.6rem;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase';
    byLabel.textContent = 'Relate by:';
    sRow1.appendChild(byLabel);
    ['category', 'type'].forEach(by => {
      const chip = document.createElement('button');
      chip.className = 'toggle-chip' + (settings.relate_by === by ? ' on' : '');
      chip.textContent = by.charAt(0).toUpperCase() + by.slice(1);
      chip.addEventListener('click', () => { data.setSettings({ relate_by: by }); render(); });
      sRow1.appendChild(chip);
    });
    const countLabel = document.createElement('span');
    countLabel.style.cssText = 'font-size:0.6rem;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase';
    countLabel.textContent = 'Count:';
    sRow1.appendChild(countLabel);
    const countSel = document.createElement('select');
    countSel.style.cssText = 'padding:4px 8px;font-family:var(--sans);font-size:0.7rem;border:1px solid #ddd;outline:none';
    [2, 3, 4, 6, 8].forEach(n => {
      const opt = document.createElement('option'); opt.value = n; opt.textContent = n;
      if ((settings.related_count || 4) === n) opt.selected = true;
      countSel.appendChild(opt);
    });
    countSel.addEventListener('change', () => data.setSettings({ related_count: +countSel.value }));
    sRow1.appendChild(countSel);
    settingsDiv.appendChild(sRow1);
    container.appendChild(settingsDiv);

    /* Section Arranger */
    const arrDesc = document.createElement('div');
    arrDesc.className = 'content-desc';
    arrDesc.textContent = 'Arrange and toggle sections per page. Use arrows to reorder. Hidden sections are dimmed.';
    container.appendChild(arrDesc);

    Object.entries(sections).forEach(([page, secs]) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'section-arranger';

      const pageLabel = document.createElement('div');
      pageLabel.className = 'section-arranger-page';
      pageLabel.textContent = pageNames[page] || page;
      wrapper.appendChild(pageLabel);

      const list = document.createElement('ul');
      list.className = 'section-arranger-list';

      const order = sectionOrders[page] || Object.keys(secs);
      const available = shopSectionIds.filter(s => secs[s] !== undefined);

      order.forEach((secId, i) => {
        if (secs[secId] === undefined) return;
        const li = document.createElement('li');
        li.className = 'section-item';
        const active = secs[secId] !== false;
        li.style.opacity = active ? '1' : '0.4';
        li.innerHTML = '<span class="section-item-drag">☰</span>'
          + '<span class="section-item-name">' + (labels[secId] || secId) + (active ? '' : '<small>(hidden)</small>') + '</span>'
          + '<div class="section-item-actions">'
          + '<button class="admin-btn" data-sec-up="' + page + '" data-sec-idx="' + i + '">↑</button>'
          + '<button class="admin-btn" data-sec-down="' + page + '" data-sec-idx="' + i + '">↓</button>'
          + '<button class="admin-btn" data-sec-toggle="' + page + '" data-sec-id="' + secId + '">' + (active ? 'Hide' : 'Show') + '</button>'
          + '</div>';
        list.appendChild(li);
      });

      const addRow = document.createElement('div');
      addRow.className = 'section-add-row';
      available.forEach(secId => {
        if (order.includes(secId)) return;
        const btn = document.createElement('button');
        btn.className = 'admin-btn';
        btn.textContent = '+ ' + (labels[secId] || secId);
        btn.addEventListener('click', () => {
          data.setSectionOrder(page, [...order, secId]);
          render();
        });
        addRow.appendChild(btn);
      });
      list.appendChild(addRow);

      wrapper.appendChild(list);
      container.appendChild(wrapper);
    });

    container.querySelectorAll('[data-sec-toggle]').forEach(b => b.addEventListener('click', () => {
      data.toggleSection(b.dataset.secToggle, b.dataset.secId);
      render();
    }));
    container.querySelectorAll('[data-sec-up]').forEach(b => b.addEventListener('click', () => {
      const page = b.dataset.secUp, idx = +b.dataset.secIdx;
      const order = sectionOrders[page] || Object.keys(sections[page]);
      if (idx <= 0) return;
      const newOrder = [...order];
      [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
      data.setSectionOrder(page, newOrder);
      render();
    }));
    container.querySelectorAll('[data-sec-down]').forEach(b => b.addEventListener('click', () => {
      const page = b.dataset.secDown, idx = +b.dataset.secIdx;
      const order = sectionOrders[page] || Object.keys(sections[page]);
      if (idx >= order.length - 1) return;
      const newOrder = [...order];
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
      data.setSectionOrder(page, newOrder);
      render();
    }));
  }

  /* ═══════════════════════════════════════════
     Share Tab
     ═══════════════════════════════════════════ */
  function renderShare(container) {
    const platforms = data.getShare();
    const shareMod = App.use('share');

    platforms.forEach(s => {
      const row = document.createElement('div');
      row.className = 'share-toggle-row';

      const lbl = document.createElement('div');
      lbl.className = 'share-toggle-label';
      lbl.innerHTML = shareMod.svg(s.id) + '<span>' + s.name + '</span>';

      const chip = document.createElement('button');
      chip.className = 'toggle-chip' + (s.active ? ' on' : '');
      chip.textContent = s.active ? 'Active' : 'Off';
      chip.addEventListener('click', () => {
        const updated = data.getShare().map(p => p.id === s.id ? { ...p, active: !p.active } : p);
        data.setShare(updated);
        chip.classList.toggle('on');
        chip.textContent = chip.classList.contains('on') ? 'Active' : 'Off';
      });

      row.appendChild(lbl);
      row.appendChild(chip);
      container.appendChild(row);
    });
  }

  /* ═══════════════════════════════════════════
     Categories Tab
     ═══════════════════════════════════════════ */
  function renderCategories(container) {
    const categories = data.getCategories();
    container.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>Slug</th><th>Name</th><th>Products</th><th></th></tr></thead>
        <tbody id="catBody"></tbody>
      </table>`;

    const tbody = container.querySelector('#catBody');
    categories.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="color:var(--muted)">${c.slug}</td>
        <td>${c.name}</td>
        <td>${c.count}</td>
        <td><button class="admin-btn danger" data-cat-del="${c.slug}">Del</button></td>`;
      tbody.appendChild(tr);
    });

    const addBar = document.createElement('div');
    addBar.className = 'admin-add-bar';
    const addBtn = document.createElement('button');
    addBtn.className = 'admin-btn';
    addBtn.textContent = '+ Add Category';
    addBtn.addEventListener('click', () => _openCategoryModal(render));
    addBar.appendChild(addBtn);
    container.appendChild(addBar);

    tbody.querySelectorAll('[data-cat-del]').forEach(b => b.addEventListener('click', () => {
      const slug = b.dataset.catDel;
      data.setCategories(data.getCategories().map(c => {
        const raw = data.getAll().categories.find(rc => rc.slug === c.slug);
        return raw.slug === slug ? null : raw;
      }).filter(Boolean));
      toast.show('Category deleted');
      render();
    }));
  }

  /* ═══════════════════════════════════════════
     Checkout Upsells Tab
     ═══════════════════════════════════════════ */
  function renderUpsells(container) {
    const upsells = data.getAll().checkout_upsells;
    const products = data.getProducts();

    const desc = document.createElement('div');
    desc.className = 'content-desc';
    desc.textContent = 'Configure products offered at checkout with variable discounts. Items already in cart are automatically hidden from upsell suggestions.';
    container.appendChild(desc);

    const table = document.createElement('div');
    table.className = 'upsell-admin-list';
    upsells.forEach((u, i) => {
      const p = products.find(x => x.slug === u.product_slug);
      const row = document.createElement('div');
      row.className = 'upsell-admin-row';
      let priceDisplay = '';
      if (u.discount_type === 'amount') {
        priceDisplay = '$' + (p ? p.price : '?') + ' <span class="upsell-admin-disc">-$' + u.discount_value + '</span>';
      } else {
        priceDisplay = '$' + (p ? p.price : '?') + ' <span class="upsell-admin-disc">-' + u.discount_value + '%</span>';
      }
      row.innerHTML = '<div class="upsell-admin-info"><div class="upsell-admin-name">' + (p ? p.name : u.product_slug) + '</div><div class="upsell-admin-pricing">' + priceDisplay + '</div><div class="upsell-admin-msg">' + (u.message || '') + '</div></div>'
        + '<div class="upsell-admin-actions"><button class="admin-btn" data-upsell-edit="' + i + '">Edit</button><button class="admin-btn" data-upsell-toggle="' + i + '">' + (u.active ? 'On' : 'Off') + '</button><button class="admin-btn danger" data-upsell-del="' + i + '">Del</button></div>';
      table.appendChild(row);
    });
    container.appendChild(table);

    const addBar = document.createElement('div');
    addBar.className = 'admin-add-bar';
    const addBtn = document.createElement('button');
    addBtn.className = 'admin-btn';
    addBtn.textContent = '+ Add Checkout Upsell';
    addBtn.addEventListener('click', () => _openUpsellModal(null, render));
    addBar.appendChild(addBtn);
    container.appendChild(addBar);

    table.querySelectorAll('[data-upsell-edit]').forEach(b => b.addEventListener('click', () => {
      _openUpsellModal(upsells[+b.dataset.upsellEdit], render);
    }));
    table.querySelectorAll('[data-upsell-toggle]').forEach(b => b.addEventListener('click', () => {
      const idx = +b.dataset.upsellToggle;
      const updated = [...upsells];
      updated[idx] = { ...updated[idx], active: !updated[idx].active };
      data.setCheckoutUpsells(updated);
      toast.show('Toggled');
      render();
    }));
    table.querySelectorAll('[data-upsell-del]').forEach(b => b.addEventListener('click', () => {
      const updated = upsells.filter((_, i) => i !== +b.dataset.upsellDel);
      data.setCheckoutUpsells(updated);
      toast.show('Upsell removed');
      render();
    }));
  }

  /* ═══════════════════════════════════════════
     Design Tab (Heroes + Carousels)
     ═══════════════════════════════════════════ */
  function renderDesign(container) {
    /* Heroes */
    const heroes = data.getAll().heroes;
    const carousels = data.getAll().carousels;

    const heroHeading = document.createElement('div');
    heroHeading.className = 'design-section-heading';
    heroHeading.textContent = 'Hero Sections';
    container.appendChild(heroHeading);

    if (!heroes.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:20px 0;color:var(--muted);font-size:0.78rem';
      empty.textContent = 'No custom heroes. Default hero is used on the shop page.';
      container.appendChild(empty);
    } else {
      heroes.forEach((h, i) => {
        const row = document.createElement('div');
        row.className = 'share-toggle-row';
        row.innerHTML = '<div class="share-toggle-label"><span style="font-size:0.65rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">' + h.id + '</span><span style="color:var(--muted);font-size:0.7rem;margin-left:8px">' + (h.style || 'full') + ' — ' + (h.page || 'shop') + '</span></div>'
          + '<div style="display:flex;gap:6px"><button class="admin-btn" data-hero-edit="' + i + '">Edit</button><button class="admin-btn danger" data-hero-del="' + i + '">Del</button></div>';
        container.appendChild(row);
      });
      container.querySelectorAll('[data-hero-edit]').forEach(b => b.addEventListener('click', () => _openHeroModal(heroes[+b.dataset.heroEdit], render)));
      container.querySelectorAll('[data-hero-del]').forEach(b => b.addEventListener('click', () => {
        data.setHeroes(heroes.filter((_, i) => i !== +b.dataset.heroDel));
        toast.show('Hero removed');
        render();
      }));
    }

    const heroAdd = document.createElement('div');
    heroAdd.className = 'admin-add-bar';
    const heroAddBtn = document.createElement('button');
    heroAddBtn.className = 'admin-btn';
    heroAddBtn.textContent = '+ Add Hero Section';
    heroAddBtn.addEventListener('click', () => _openHeroModal(null, render));
    heroAdd.appendChild(heroAddBtn);
    container.appendChild(heroAdd);

    /* Carousels */
    const carHeading = document.createElement('div');
    carHeading.className = 'design-section-heading';
    carHeading.textContent = 'Carousels';
    container.appendChild(carHeading);

    if (!carousels.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:20px 0;color:var(--muted);font-size:0.78rem';
      empty.textContent = 'No carousels configured.';
      container.appendChild(empty);
    } else {
      carousels.forEach((c, i) => {
        const row = document.createElement('div');
        row.className = 'share-toggle-row';
        row.innerHTML = '<div class="share-toggle-label"><span style="font-size:0.65rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">' + c.id + '</span><span style="color:var(--muted);font-size:0.7rem;margin-left:8px">' + (c.style || 'metro') + (c.show_all ? ' (all products)' : '') + '</span></div>'
          + '<div style="display:flex;gap:6px"><button class="admin-btn" data-car-edit="' + i + '">Edit</button><button class="admin-btn danger" data-car-del="' + i + '">Del</button></div>';
        container.appendChild(row);
      });
      container.querySelectorAll('[data-car-edit]').forEach(b => b.addEventListener('click', () => _openCarouselModal(carousels[+b.dataset.carEdit], render)));
      container.querySelectorAll('[data-car-del]').forEach(b => b.addEventListener('click', () => {
        data.setCarousels(carousels.filter((_, i) => i !== +b.dataset.carDel));
        toast.show('Carousel removed');
        render();
      }));
    }

    const carAdd = document.createElement('div');
    carAdd.className = 'admin-add-bar';
    const carAddBtn = document.createElement('button');
    carAddBtn.className = 'admin-btn';
    carAddBtn.textContent = '+ Add Carousel';
    carAddBtn.addEventListener('click', () => _openCarouselModal(null, render));
    carAdd.appendChild(carAddBtn);
    container.appendChild(carAdd);
  }

  /* ═══════════════════════════════════════════
     Newsletter Tab
     ═══════════════════════════════════════════ */
  function renderNewsletter(container) {
    const lists = data.getAll().mailing_lists;

    const desc = document.createElement('div');
    desc.className = 'content-desc';
    desc.textContent = 'Add mailing list signup forms to any page. Four styles available: inline, banner, minimal, and full. All forms are editable via Live Edit.';
    container.appendChild(desc);

    if (!lists.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:20px 0;color:var(--muted);font-size:0.78rem;text-align:center';
      empty.textContent = 'No mailing lists configured.';
      container.appendChild(empty);
    } else {
      lists.forEach((m, i) => {
        const row = document.createElement('div');
        row.className = 'share-toggle-row';
        row.innerHTML = '<div class="share-toggle-label"><span style="font-size:0.65rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">' + m.id + '</span><span style="color:var(--muted);font-size:0.7rem;margin-left:8px">' + (m.style || 'inline') + ' — ' + (m.page || 'shop') + '</span></div>'
          + '<div style="display:flex;gap:6px"><button class="admin-btn" data-ml-edit="' + i + '">Edit</button><button class="admin-btn" data-ml-toggle="' + i + '">' + (m.active ? 'On' : 'Off') + '</button><button class="admin-btn danger" data-ml-del="' + i + '">Del</button></div>';
        container.appendChild(row);
      });
      container.querySelectorAll('[data-ml-edit]').forEach(b => b.addEventListener('click', () => _openMailingListModal(lists[+b.dataset.mlEdit], render)));
      container.querySelectorAll('[data-ml-toggle]').forEach(b => b.addEventListener('click', () => {
        const idx = +b.dataset.mlToggle;
        const updated = [...lists];
        updated[idx] = { ...updated[idx], active: !updated[idx].active };
        data.setMailingLists(updated);
        toast.show('Toggled');
        render();
      }));
      container.querySelectorAll('[data-ml-del]').forEach(b => b.addEventListener('click', () => {
        data.setMailingLists(lists.filter((_, i) => i !== +b.dataset.mlDel));
        toast.show('Mailing list removed');
        render();
      }));
    }

    const addBar = document.createElement('div');
    addBar.className = 'admin-add-bar';
    const addBtn = document.createElement('button');
    addBtn.className = 'admin-btn';
    addBtn.textContent = '+ Add Mailing List';
    addBtn.addEventListener('click', () => _openMailingListModal(null, render));
    addBar.appendChild(addBtn);
    container.appendChild(addBar);
  }

  /* ═══════════════════════════════════════════
     Content Tab
     ═══════════════════════════════════════════ */
  function renderContent(container) {
    const overrides = content.getAll();
    const keys = Object.keys(overrides);

    const desc = document.createElement('div');
    desc.className = 'content-desc';
    desc.innerHTML = 'Edit any text on the site. Changes are saved permanently and appear instantly. Use the <strong>Live Edit</strong> tab to click directly on elements, or manage overrides here.';
    container.appendChild(desc);

    if (!keys.length) {
      const empty = document.createElement('div');
      empty.className = 'content-empty';
      empty.innerHTML = '<div class="content-empty-icon">&sect;</div><div>No content overrides yet</div><div style="color:var(--muted);margin-top:4px;font-size:0.7rem">Use Live Edit mode to click any element and edit its text</div>';
      container.appendChild(empty);
    } else {
      const table = document.createElement('div');
      table.className = 'content-table';

      keys.sort().forEach(key => {
        const row = document.createElement('div');
        row.className = 'content-row';

        const keyEl = document.createElement('div');
        keyEl.className = 'content-key';
        keyEl.textContent = key;

        const valEl = document.createElement('div');
        valEl.className = 'content-value';
        valEl.textContent = overrides[key].substring(0, 80) + (overrides[key].length > 80 ? '...' : '');

        const actions = document.createElement('div');
        actions.className = 'content-row-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'admin-btn';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => _openContentEditModal(key, overrides[key], render));

        const delBtn = document.createElement('button');
        delBtn.className = 'admin-btn danger';
        delBtn.textContent = 'Revert';
        delBtn.addEventListener('click', () => {
          content.remove(key);
          toast.show('Reverted: ' + key);
          render();
        });

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        row.appendChild(keyEl);
        row.appendChild(valEl);
        row.appendChild(actions);
        table.appendChild(row);
      });

      container.appendChild(table);

      const resetBar = document.createElement('div');
      resetBar.className = 'admin-add-bar';
      const resetBtn = document.createElement('button');
      resetBtn.className = 'admin-btn danger';
      resetBtn.textContent = 'Reset All Overrides';
      resetBtn.addEventListener('click', () => {
        if (!confirm('Remove all ' + keys.length + ' content overrides?')) return;
        content.reset();
        toast.show('All overrides reset');
        render();
      });
      resetBar.appendChild(resetBtn);
      container.appendChild(resetBar);
    }

    const addBar = document.createElement('div');
    addBar.className = 'admin-add-bar';
    const addBtn = document.createElement('button');
    addBtn.className = 'admin-btn';
    addBtn.textContent = '+ Add Override Manually';
    addBtn.addEventListener('click', () => _openContentEditModal('', '', render));
    addBar.appendChild(addBtn);
    container.appendChild(addBar);
  }

  /* ═══════════════════════════════════════════
     Live Edit Tab
     ═══════════════════════════════════════════ */
  function renderLiveEdit(container) {
    const isActive = App.use('liveEdit').isActive();

    const hero = document.createElement('div');
    hero.className = 'live-edit-hero';

    const icon = document.createElement('div');
    icon.className = 'le-hero-icon';
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    hero.appendChild(icon);

    const title = document.createElement('h2');
    title.className = 'le-hero-title';
    title.textContent = isActive ? 'Live Edit is Active' : 'Live Edit Mode';
    hero.appendChild(title);

    const desc = document.createElement('div');
    desc.className = 'le-hero-desc';
    desc.textContent = isActive
      ? 'Navigate the site and click any highlighted element to edit its text. Click section names to switch types. Use + dividers to add sections.'
      : 'Click any text element to edit it. Click section name badges to switch section types. Use the + dividers between sections to add new ones. Changes save permanently.';
    hero.appendChild(desc);

    container.appendChild(hero);

    if (isActive) {
      const info = document.createElement('div');
      info.className = 'le-active-info';
      info.innerHTML = `
        <div class="le-info-row"><span class="le-info-label">Status</span><span class="le-info-val le-status-on">Active</span></div>
        <div class="le-info-row"><span class="le-info-label">Current Page</span><span class="le-info-val">${location.pathname}</span></div>
        <div class="le-info-row"><span class="le-info-label">Saved Overrides</span><span class="le-info-val">${Object.keys(content.getAll()).length}</span></div>
      `;
      container.appendChild(info);

      const navBar = document.createElement('div');
      navBar.className = 'le-nav-bar';
      ['Shop', 'All Products', 'Cart', 'Wishlist'].forEach(label => {
        const path = label === 'Shop' ? '/shop' : label === 'All Products' ? '/products' : '/' + label.toLowerCase();
        const btn = document.createElement('a');
        btn.href = path;
        btn.dataset.nav = path;
        btn.className = 'admin-btn le-nav-btn';
        btn.textContent = label;
        navBar.appendChild(btn);
      });
      container.appendChild(navBar);

      const stopBtn = document.createElement('button');
      stopBtn.className = 'admin-btn le-stop-btn';
      stopBtn.textContent = 'Exit Live Edit Mode';
      stopBtn.addEventListener('click', () => {
        App.use('liveEdit').deactivate();
        toast.show('Live edit mode disabled');
        render();
      });
      container.appendChild(stopBtn);

    } else {
      const startSection = document.createElement('div');
      startSection.className = 'le-start-section';

      const features = document.createElement('div');
      features.className = 'le-features';
      const featureList = [
        ['Click to Edit', 'Click any text element on any page to change it instantly'],
        ['Switch Sections', 'Click a section name badge to open a dropdown and swap it for a different section type'],
        ['Inline Add Dividers', 'Dashed + buttons appear between every section — click to add a new section at that exact position'],
        ['Smart Insert', 'Hidden sections appear in a bottom bar; already-visible sections show as "Visible" when adding'],
        ['Permanent Saves', 'All changes persist in browser storage across sessions'],
        ['Full Navigation', 'Edit across all pages — shop, products, cart, wishlist']
      ];
      featureList.forEach(([title, desc]) => {
        const f = document.createElement('div');
        f.className = 'le-feature';
        f.innerHTML = '<div class="le-feature-title">' + title + '</div><div class="le-feature-desc">' + desc + '</div>';
        features.appendChild(f);
      });
      startSection.appendChild(features);

      const startBtn = document.createElement('button');
      startBtn.className = 'admin-btn le-start-btn';
      startBtn.textContent = 'Enable Live Edit Mode';
      startBtn.addEventListener('click', () => {
        App.use('liveEdit').activate();
        toast.show('Live edit mode enabled');
        App.use('router').navigate('/shop');
      });
      startSection.appendChild(startBtn);

      container.appendChild(startSection);
    }
  }

  /* ═══════════════════════════════════════════
     Modals
     ═══════════════════════════════════════════ */

  /* ── Product Modal ── */
  function _openProductModal(product, onDone) {
    const isEdit = !!product;
    const allData = data.getAll();
    const categories = allData.categories;
    const types = allData.product_types;
    const products = data.getProducts();
    const existingOpts = product?.options || [];
    const existingRelated = product?.related || [];
    const currentUpsell = product?.upsell || '';
    const currentUpsellMsg = product?.upsell_msg || '';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h2>${isEdit ? 'Edit' : 'New'} Product</h2>
        <div class="modal-field"><label>Name</label><input type="text" id="mName" value="${isEdit ? product.name : ''}" placeholder="Product name"></div>
        <div class="modal-field"><label>Slug</label><input type="text" id="mSlug" value="${isEdit ? product.slug : ''}" placeholder="auto-generated-if-empty"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="modal-field"><label>Category</label><select id="mCat">${categories.map(c => '<option value="' + c.slug + '"' + (isEdit && product.category === c.slug ? ' selected' : '') + '>' + c.name + '</option>').join('')}</select></div>
          <div class="modal-field"><label>Type</label><select id="mType">${types.map(t => '<option value="' + t.id + '"' + (isEdit && product.type === t.id ? ' selected' : '') + '>' + t.name + '</option>').join('')}</select></div>
        </div>
        <div class="modal-field"><label>Price ($)</label><input type="number" id="mPrice" value="${isEdit ? product.price : ''}" placeholder="0"></div>
        <div class="modal-field"><label>Color (hex)</label><input type="text" id="mColor" value="${isEdit ? product.color : '#e8e8e8'}" placeholder="#e8e8e8"></div>
        <div class="modal-field"><label>Description</label><input type="text" id="mDesc" value="${isEdit ? product.desc : ''}" placeholder="Short description"></div>
        <div class="modal-field">
          <label>Options <span style="font-weight:400;color:var(--muted)">(label, value, price modifier)</span></label>
          <div id="optsList" style="margin-top:8px"></div>
          <button class="admin-btn" id="addOptBtn" style="margin-top:8px">+ Add Option</button>
        </div>
        <div class="modal-field">
          <label>Upsell Product</label>
          <select id="mUpsell"><option value="">None</option>${products.filter(p2 => p2.id !== product?.id).map(p2 => '<option value="' + p2.slug + '"' + (isEdit && currentUpsell === p2.slug ? ' selected' : '') + '>' + p2.name + '</option>').join('')}</select>
        </div>
        <div class="modal-field">
          <label>Upsell Message</label>
          <input type="text" id="mUpsellMsg" value="${isEdit ? currentUpsellMsg : 'Complete the look'}" placeholder="e.g. Complete the look">
        </div>
        <div class="modal-field">
          <label>Related Products <span style="font-weight:400;color:var(--muted)">(leave empty for auto)</span></label>
          <div id="relatedPicker" class="related-picker">${products.filter(p2 => p2.id !== product?.id).map(p2 => '<label class="related-chip"><input type="checkbox" value="' + p2.slug + '"' + (existingRelated.includes(p2.slug) ? ' checked' : '') + '>' + p2.name + '</label>').join('')}</div>
        </div>
        <div class="modal-actions"><button id="mCancel">Cancel</button><button class="primary" id="mSave">${isEdit ? 'Update' : 'Create'}</button></div>
      </div>`;

    document.body.appendChild(overlay);

    const optsList = overlay.querySelector('#optsList');
    let opts = JSON.parse(JSON.stringify(existingOpts));
    function renderOpts() {
      optsList.innerHTML = '';
      opts.forEach((o, i) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 60px 28px;gap:6px;margin-bottom:6px;align-items:center';
        row.innerHTML = '<input class="admin-input" value="' + o.label + '" data-ol="' + i + '" placeholder="Label">'
          + '<input class="admin-input" value="' + o.value + '" data-ov="' + i + '" placeholder="Value">'
          + '<input class="admin-input" type="number" value="' + (o.price_mod || 0) + '" data-op="' + i + '" placeholder="+$0">'
          + '<button class="admin-btn danger" data-odel="' + i + '" style="padding:4px 8px">&times;</button>';
        row.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => {
          opts[i].label = row.querySelector('[data-ol="' + i + '"]').value;
          opts[i].value = row.querySelector('[data-ov="' + i + '"]').value;
          opts[i].price_mod = parseInt(row.querySelector('[data-op="' + i + '"]').value, 10) || 0;
        }));
        row.querySelector('[data-odel]').addEventListener('click', () => { opts.splice(i, 1); renderOpts(); });
        optsList.appendChild(row);
      });
    }
    renderOpts();
    overlay.querySelector('#addOptBtn').addEventListener('click', () => { opts.push({ label: '', value: '', price_mod: 0 }); renderOpts(); });

    overlay.querySelector('#mCancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#mSave').addEventListener('click', () => {
      const name = overlay.querySelector('#mName').value.trim();
      const slug = overlay.querySelector('#mSlug').value.trim() || name.toLowerCase().replace(/\s+/g, '-');
      const category = overlay.querySelector('#mCat').value;
      const type = overlay.querySelector('#mType').value;
      const price = parseInt(overlay.querySelector('#mPrice').value, 10);
      const color = overlay.querySelector('#mColor').value.trim() || '#e8e8e8';
      const desc = overlay.querySelector('#mDesc').value.trim();
      const upsell = overlay.querySelector('#mUpsell').value;
      const upsellMsg = overlay.querySelector('#mUpsellMsg').value.trim();
      const related = Array.from(overlay.querySelectorAll('#relatedPicker input:checked')).map(c => c.value);
      const cleanOpts = opts.filter(o => o.label.trim()).map(o => ({ label: o.label.trim(), value: o.value.trim() || o.label.trim().toLowerCase().replace(/\s+/g, '-'), price_mod: o.price_mod || 0 }));
      if (!name || !price) { toast.show('Name and price required'); return; }

      let updated = [...products];
      if (isEdit) {
        updated = updated.map(p => p.id === product.id ? { ...p, name, slug, category, type, price, color, desc, options: cleanOpts, upsell, upsell_msg: upsellMsg, related } : p);
      } else {
        const maxId = updated.reduce((m, p) => Math.max(m, p.id), 0);
        updated.push({ id: maxId + 1, slug, name, category, type, price, color, desc, options: cleanOpts, upsell, upsell_msg: upsellMsg, related });
      }
      data.setProducts(updated);
      overlay.remove();
      toast.show(isEdit ? 'Product updated' : 'Product created');
      onDone();
    });
  }

  /* ── Checkout Upsell Modal ── */
  function _openUpsellModal(upsell, onDone) {
    const isEdit = !!upsell;
    const products = data.getProducts();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h2>${isEdit ? 'Edit' : 'New'} Checkout Upsell</h2>
        <div class="modal-field"><label>Product</label><select id="cuProduct">${products.map(p => '<option value="' + p.slug + '"' + (isEdit && upsell.product_slug === p.slug ? ' selected' : '') + '>' + p.name + ' ($' + p.price + ')</option>').join('')}</select></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="modal-field"><label>Discount Type</label><select id="cuDiscType"><option value="amount"${isEdit && upsell.discount_type === 'amount' ? ' selected' : ''}>Fixed Amount ($)</option><option value="percent"${isEdit && upsell.discount_type === 'percent' ? ' selected' : ''}>Percentage (%)</option></select></div>
          <div class="modal-field"><label>Discount Value</label><input type="number" id="cuDiscVal" value="${isEdit ? upsell.discount_value : 5}" min="0"></div>
        </div>
        <div class="modal-field"><label>Message</label><input type="text" id="cuMsg" value="${isEdit ? (upsell.message || '') : 'Complete your order'}" placeholder="e.g. Complete your order"></div>
        <div class="modal-field"><label>Priority <span style="font-weight:400;color:var(--muted)">(lower = shown first)</span></label><input type="number" id="cuPriority" value="${isEdit ? (upsell.priority || 1) : 1}" min="1"></div>
        <div class="modal-actions"><button id="cuCancel">Cancel</button><button class="primary" id="cuSave">${isEdit ? 'Update' : 'Create'}</button></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#cuCancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#cuSave').addEventListener('click', () => {
      const product_slug = overlay.querySelector('#cuProduct').value;
      const discount_type = overlay.querySelector('#cuDiscType').value;
      const discount_value = parseInt(overlay.querySelector('#cuDiscVal').value, 10) || 0;
      const message = overlay.querySelector('#cuMsg').value.trim();
      const priority = parseInt(overlay.querySelector('#cuPriority').value, 10) || 1;
      if (!product_slug) { toast.show('Product required'); return; }
      const allUpsells = data.getAll().checkout_upsells;
      if (isEdit) {
        const idx = allUpsells.findIndex(u => u.id === upsell.id);
        if (idx > -1) allUpsells[idx] = { ...allUpsells[idx], product_slug, discount_type, discount_value, message, priority };
        data.setCheckoutUpsells(allUpsells);
      } else {
        const id = 'cu-' + Date.now();
        data.setCheckoutUpsells([...allUpsells, { id, product_slug, discount_type, discount_value, message, priority, active: true }]);
      }
      overlay.remove();
      toast.show(isEdit ? 'Upsell updated' : 'Upsell created');
      onDone();
    });
  }

  /* ── Hero Modal ── */
  function _openHeroModal(hero, onDone) {
    const isEdit = !!hero;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h2>${isEdit ? 'Edit' : 'New'} Hero Section</h2>
        <div class="modal-field"><label>ID</label><input type="text" id="hId" value="${isEdit ? hero.id : ''}" placeholder="e.g. hero-summer" ${isEdit ? 'readonly style="opacity:0.6"' : ''}></div>
        <div class="modal-field"><label>Style</label><select id="hStyle">
          <option value="full"${isEdit && hero.style === 'full' ? ' selected' : ''}>Full (centered, classic)</option>
          <option value="split"${isEdit && hero.style === 'split' ? ' selected' : ''}>Split (content + accent block)</option>
          <option value="minimal"${isEdit && hero.style === 'minimal' ? ' selected' : ''}>Minimal (left-aligned, label + title)</option>
          <option value="accent"${isEdit && hero.style === 'accent' ? ' selected' : ''}>Accent (top bar, bold)</option>
        </select></div>
        <div class="modal-field"><label>Page</label><select id="hPage">
          <option value="shop"${isEdit && hero.page === 'shop' ? ' selected' : ''}>Shop</option>
          <option value="products"${isEdit && hero.page === 'products' ? ' selected' : ''}>Products</option>
        </select></div>
        <div class="modal-field"><label>Title</label><input type="text" id="hTitle" value="${isEdit ? (hero.title || '') : ''}" placeholder="Hero title"></div>
        <div class="modal-field"><label>Subtitle</label><input type="text" id="hSub" value="${isEdit ? (hero.subtitle || '') : ''}" placeholder="Subtitle"></div>
        <div class="modal-field"><label>Scroll Text <span style="font-weight:400;color:var(--muted)">(full style only)</span></label><input type="text" id="hScroll" value="${isEdit ? (hero.scroll_text || '') : ''}" placeholder="Scroll"></div>
        <div class="modal-actions"><button id="hCancel">Cancel</button><button class="primary" id="hSave">${isEdit ? 'Update' : 'Create'}</button></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#hCancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#hSave').addEventListener('click', () => {
      const id = overlay.querySelector('#hId').value.trim();
      const style = overlay.querySelector('#hStyle').value;
      const page = overlay.querySelector('#hPage').value;
      const title = overlay.querySelector('#hTitle').value.trim();
      const subtitle = overlay.querySelector('#hSub').value.trim();
      const scroll_text = overlay.querySelector('#hScroll').value.trim();
      if (!id) { toast.show('ID required'); return; }
      const allHeroes = data.getAll().heroes;
      if (isEdit) {
        const idx = allHeroes.findIndex(h => h.id === hero.id);
        if (idx > -1) allHeroes[idx] = { ...allHeroes[idx], style, page, title, subtitle, scroll_text };
        data.setHeroes(allHeroes);
      } else {
        data.setHeroes([...allHeroes, { id, style, page, title, subtitle, scroll_text, active: true }]);
      }
      overlay.remove();
      toast.show(isEdit ? 'Hero updated' : 'Hero created');
      onDone();
    });
  }

  /* ── Carousel Modal ── */
  function _openCarouselModal(carousel, onDone) {
    const isEdit = !!carousel;
    const products = data.getProducts();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const selectedSlugs = isEdit ? (carousel.product_slugs || []) : [];
    overlay.innerHTML = `
      <div class="modal">
        <h2>${isEdit ? 'Edit' : 'New'} Carousel</h2>
        <div class="modal-field"><label>ID</label><input type="text" id="carId" value="${isEdit ? carousel.id : ''}" placeholder="e.g. carousel-featured" ${isEdit ? 'readonly style="opacity:0.6"' : ''}></div>
        <div class="modal-field"><label>Style</label><select id="carStyle">
          <option value="metro"${isEdit && carousel.style === 'metro' ? ' selected' : ''}>Metro (grid, 4-col)</option>
          <option value="scroll"${isEdit && carousel.style === 'scroll' ? ' selected' : ''}>Scroll (horizontal, arrow nav)</option>
          <option value="minimal"${isEdit && carousel.style === 'minimal' ? ' selected' : ''}>Minimal (clean cards, arrow nav)</option>
          <option value="compact"${isEdit && carousel.style === 'compact' ? ' selected' : ''}>Compact (tight, 2-line)</option>
        </select></div>
        <div class="modal-field"><label>Page</label><select id="carPage">
          <option value="shop"${isEdit && carousel.page === 'shop' ? ' selected' : ''}>Shop</option>
          <option value="products"${isEdit && carousel.page === 'products' ? ' selected' : ''}>Products</option>
        </select></div>
        <div class="modal-field"><label>Title</label><input type="text" id="carTitle" value="${isEdit ? (carousel.title || '') : ''}" placeholder="e.g. Featured"></div>
        <div class="modal-field">
          <label><input type="checkbox" id="carShowAll" ${isEdit && carousel.show_all ? 'checked' : ''} style="margin-right:6px"> Show All Products</label>
          <div style="font-size:0.55rem;color:var(--muted);margin-top:2px">When checked, shows all products (up to max). Otherwise, pick products below.</div>
        </div>
        <div class="modal-field"><label>Max Items <span style="font-weight:400;color:var(--muted)">(0 = no limit)</span></label><input type="number" id="carMax" value="${isEdit ? (carousel.max_items || 0) : 0}" min="0"></div>
        <div class="modal-field">
          <label>Products <span style="font-weight:400;color:var(--muted)">(when "Show All" is off)</span></label>
          <div id="carProductPicker" class="related-picker">${products.map(p => '<label class="related-chip"><input type="checkbox" value="' + p.slug + '"' + (selectedSlugs.includes(p.slug) ? ' checked' : '') + '>' + p.name + '</label>').join('')}</div>
        </div>
        <div class="modal-actions"><button id="carCancel">Cancel</button><button class="primary" id="carSave">${isEdit ? 'Update' : 'Create'}</button></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#carCancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#carSave').addEventListener('click', () => {
      const id = overlay.querySelector('#carId').value.trim();
      const style = overlay.querySelector('#carStyle').value;
      const page = overlay.querySelector('#carPage').value;
      const title = overlay.querySelector('#carTitle').value.trim();
      const show_all = overlay.querySelector('#carShowAll').checked;
      const max_items = parseInt(overlay.querySelector('#carMax').value, 10) || 0;
      const product_slugs = Array.from(overlay.querySelectorAll('#carProductPicker input:checked')).map(c => c.value);
      if (!id) { toast.show('ID required'); return; }
      const allCarousels = data.getAll().carousels;
      if (isEdit) {
        const idx = allCarousels.findIndex(c => c.id === carousel.id);
        if (idx > -1) allCarousels[idx] = { ...allCarousels[idx], style, page, title, show_all, max_items, product_slugs };
        data.setCarousels(allCarousels);
      } else {
        data.setCarousels([...allCarousels, { id, style, page, title, show_all, max_items, product_slugs, active: true }]);
      }
      overlay.remove();
      toast.show(isEdit ? 'Carousel updated' : 'Carousel created');
      onDone();
    });
  }

  /* ── Mailing List Modal ── */
  function _openMailingListModal(ml, onDone) {
    const isEdit = !!ml;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h2>${isEdit ? 'Edit' : 'New'} Mailing List</h2>
        <div class="modal-field"><label>ID</label><input type="text" id="mlId" value="${isEdit ? ml.id : ''}" placeholder="e.g. ml-footer" ${isEdit ? 'readonly style="opacity:0.6"' : ''}></div>
        <div class="modal-field"><label>Style</label><select id="mlStyle">
          <option value="inline"${isEdit && ml.style === 'inline' ? ' selected' : ''}>Inline (horizontal, clean)</option>
          <option value="banner"${isEdit && ml.style === 'banner' ? ' selected' : ''}>Banner (centered, bordered)</option>
          <option value="minimal"${isEdit && ml.style === 'minimal' ? ' selected' : ''}>Minimal (single-line)</option>
          <option value="full"${isEdit && ml.style === 'full' ? ' selected' : ''}>Full (large, statement)</option>
        </select></div>
        <div class="modal-field"><label>Page</label><select id="mlPage">
          <option value="shop"${isEdit && ml.page === 'shop' ? ' selected' : ''}>Shop</option>
          <option value="products"${isEdit && ml.page === 'products' ? ' selected' : ''}>Products</option>
          <option value="cart"${isEdit && ml.page === 'cart' ? ' selected' : ''}>Cart</option>
        </select></div>
        <div class="modal-field"><label>Heading</label><input type="text" id="mlHeading" value="${isEdit ? (ml.heading || '') : 'Stay in the Loop'}" placeholder="Heading"></div>
        <div class="modal-field"><label>Subheading</label><input type="text" id="mlSub" value="${isEdit ? (ml.subheading || '') : ''}" placeholder="Subheading or description"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="modal-field"><label>Placeholder</label><input type="text" id="mlPlaceholder" value="${isEdit ? (ml.placeholder || '') : 'Your email'}" placeholder="Input placeholder"></div>
          <div class="modal-field"><label>Button Text</label><input type="text" id="mlBtnText" value="${isEdit ? (ml.button_text || '') : 'Subscribe'}" placeholder="Subscribe"></div>
        </div>
        <div class="modal-actions"><button id="mlCancel">Cancel</button><button class="primary" id="mlSave">${isEdit ? 'Update' : 'Create'}</button></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#mlCancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#mlSave').addEventListener('click', () => {
      const id = overlay.querySelector('#mlId').value.trim();
      const style = overlay.querySelector('#mlStyle').value;
      const page = overlay.querySelector('#mlPage').value;
      const heading = overlay.querySelector('#mlHeading').value.trim();
      const subheading = overlay.querySelector('#mlSub').value.trim();
      const placeholder = overlay.querySelector('#mlPlaceholder').value.trim();
      const button_text = overlay.querySelector('#mlBtnText').value.trim();
      if (!id) { toast.show('ID required'); return; }
      const allMl = data.getAll().mailing_lists;
      if (isEdit) {
        const idx = allMl.findIndex(m => m.id === ml.id);
        if (idx > -1) allMl[idx] = { ...allMl[idx], style, page, heading, subheading, placeholder, button_text };
        data.setMailingLists(allMl);
      } else {
        data.setMailingLists([...allMl, { id, style, page, heading, subheading, placeholder, button_text, active: true }]);
      }
      overlay.remove();
      toast.show(isEdit ? 'Mailing list updated' : 'Mailing list created');
      onDone();
    });
  }

  /* ── Type Modal ── */
  function _openTypeModal(onDone) {
    const types = data.getTypes();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h2>New Product Type</h2>
        <div class="modal-field"><label>ID (slug)</label><input type="text" id="mtId" placeholder="e.g. digital_download"></div>
        <div class="modal-field"><label>Name</label><input type="text" id="mtName" placeholder="e.g. Digital Download"></div>
        <div class="modal-field"><label>CTA Button Text</label><input type="text" id="mtCta" placeholder="e.g. Buy Now" value="Add to Cart"></div>
        <div class="modal-actions"><button id="mtCancel">Cancel</button><button class="primary" id="mtSave">Create</button></div>
      </div>`;

    document.body.appendChild(overlay);
    overlay.querySelector('#mtCancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#mtSave').addEventListener('click', () => {
      const id = overlay.querySelector('#mtId').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const name = overlay.querySelector('#mtName').value.trim();
      const cta = overlay.querySelector('#mtCta').value.trim() || 'Add to Cart';
      if (!id || !name) { toast.show('ID and name required'); return; }
      if (types.find(t => t.id === id)) { toast.show('ID already exists'); return; }
      data.setTypes([...types, { id, name, cta }]);
      overlay.remove();
      toast.show('Type created');
      onDone();
    });
  }

  /* ── Category Modal ── */
  function _openCategoryModal(onDone) {
    const categories = data.getAll().categories;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h2>New Category</h2>
        <div class="modal-field"><label>Name</label><input type="text" id="mcName" placeholder="Category name"></div>
        <div class="modal-field"><label>Slug</label><input type="text" id="mcSlug" placeholder="auto-generated-if-empty"></div>
        <div class="modal-actions"><button id="mcCancel">Cancel</button><button class="primary" id="mcSave">Create</button></div>
      </div>`;

    document.body.appendChild(overlay);
    overlay.querySelector('#mcCancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#mcSave').addEventListener('click', () => {
      const name = overlay.querySelector('#mcName').value.trim();
      const slug = overlay.querySelector('#mcSlug').value.trim() || name.toLowerCase().replace(/\s+/g, '-');
      if (!name) { toast.show('Name required'); return; }
      if (categories.find(c => c.slug === slug)) { toast.show('Slug already exists'); return; }
      data.setCategories([...categories, { slug, name }]);
      overlay.remove();
      toast.show('Category created');
      onDone();
    });
  }

  /* ── Content Edit Modal ── */
  function _openContentEditModal(existingKey, existingVal, onDone) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h2>${existingKey ? 'Edit' : 'Add'} Content Override</h2>
        <div class="modal-field">
          <label>Edit Key</label>
          <input type="text" id="ceKey" value="${existingKey || ''}" placeholder="e.g. shop.hero.title" ${existingKey ? 'readonly style="opacity:0.6"' : ''}>
          <div style="font-size:0.6rem;color:var(--muted);margin-top:4px">Identifies the element. Use dot notation: page.section.element</div>
        </div>
        <div class="modal-field">
          <label>Content</label>
          <textarea id="ceVal" rows="4" style="width:100%;padding:10px 12px;font-family:var(--sans);font-size:0.8rem;border:1px solid #ddd;outline:none;resize:vertical">${(existingVal || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
        </div>
        <div class="modal-actions"><button id="ceCancel">Cancel</button><button class="primary" id="ceSave">Save</button></div>
      </div>`;

    document.body.appendChild(overlay);
    overlay.querySelector('#ceCancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#ceSave').addEventListener('click', () => {
      const key = overlay.querySelector('#ceKey').value.trim();
      const val = overlay.querySelector('#ceVal').value;
      if (!key) { toast.show('Key is required'); return; }
      content.set(key, val);
      overlay.remove();
      toast.show(existingKey ? 'Override updated' : 'Override created');
      onDone();
    });
  }

  /* ── Password Change Modal ── */
  function _openPasswordModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h2>Change Password</h2>
        <div class="modal-field">
          <label>Current Password</label>
          <input type="password" id="pwCurrent" placeholder="Enter current password">
        </div>
        <div class="modal-field">
          <label>New Password</label>
          <input type="password" id="pwNew" placeholder="Enter new password">
        </div>
        <div class="modal-field">
          <label>Confirm New Password</label>
          <input type="password" id="pwConfirm" placeholder="Confirm new password">
        </div>
        <div class="modal-actions"><button id="pwCancel">Cancel</button><button class="primary" id="pwSave">Update</button></div>
      </div>`;

    document.body.appendChild(overlay);
    overlay.querySelector('#pwCancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#pwSave').addEventListener('click', () => {
      const current = overlay.querySelector('#pwCurrent').value;
      const newPw = overlay.querySelector('#pwNew').value;
      const confirm = overlay.querySelector('#pwConfirm').value;
      if (current !== App.use('auth').getPassword()) { toast.show('Current password incorrect'); return; }
      if (newPw.length < 4) { toast.show('Password must be at least 4 characters'); return; }
      if (newPw !== confirm) { toast.show('Passwords do not match'); return; }
      App.use('auth').setPassword(newPw);
      overlay.remove();
      toast.show('Password updated');
    });
  }

  render();
});