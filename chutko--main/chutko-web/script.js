(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');

  /* ---------- Nastavenia ---------- */
  const DELIVERY_FEE = 2.5;
  const FREE_DELIVERY_FROM = 30;
  const STORAGE_KEY = 'chutko-cart';
  const PROMO_KEY = 'chutko-promo';
  // Promo kódy (školský projekt – overujú sa len v prehliadači)
  const PROMO_CODES = { CHUTKO10: 10, TAJNE15: 15 };

  /* ---------- Menu (načíta sa z data.js / servera) ---------- */
  let MENU = [];
  let byId = {};
  const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'%3E%3Crect width='4' height='3' fill='%23CDE1D3'/%3E%3C/svg%3E";
  const imgSrc = d => d.img || PLACEHOLDER;

  /* ---------- Pomocné ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const money = n => n.toFixed(2).replace('.', ',') + ' €';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ICON_PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  /* ---------- Košík ----------
     Každý riadok = jedlo + úpravy zloženia:
     { id, qty, removed: [suroviny bez], extras: [prílohy navyše] }  */
  let cart = {};

  const lineKey = (id, removed = [], extras = []) =>
    removed.length || extras.length ? `${id}|${removed.slice().sort().join(',')}|${extras.slice().sort().join(',')}` : id;

  function normalizeLine(l) {
    const d = byId[l.id];
    if (!d || d.soldOut) return null;
    const qty = Math.min(99, Math.floor(Number(l.qty) || 0));
    if (qty <= 0) return null;
    const removed = (Array.isArray(l.removed) ? l.removed : []).filter(n => d.ingredients.includes(n));
    const extras = (Array.isArray(l.extras) ? l.extras : []).filter(n => d.extras.some(x => x.name === n));
    return { id: d.id, qty, removed, extras };
  }

  function loadCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const out = {};
      Object.entries(raw).forEach(([key, v]) => {
        // staršia verzia košíka: { id: počet }
        const l = normalizeLine(typeof v === 'number' ? { id: key, qty: v } : v);
        if (!l) return;
        const k = lineKey(l.id, l.removed, l.extras);
        if (out[k]) out[k].qty = Math.min(99, out[k].qty + l.qty);
        else out[k] = l;
      });
      return out;
    } catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (e) { /* bez úložiska */ }
  }

  function addLine(id, removed = [], extras = [], qty = 1) {
    const d = byId[id];
    if (!d || d.soldOut) return;
    const key = lineKey(id, removed, extras);
    if (cart[key]) cart[key].qty = Math.min(99, cart[key].qty + qty);
    else cart[key] = { id, qty: Math.min(99, qty), removed: removed.slice(), extras: extras.slice() };
    save();
    update();
  }
  function setLineQty(key, qty) {
    if (!cart[key]) return;
    if (qty <= 0) delete cart[key];
    else cart[key].qty = Math.min(99, qty);
    save();
    update();
  }
  // tlačidlo „−“ na karte: uberie najprv základnú verziu, potom poslednú upravenú
  function decDish(id) {
    const keys = Object.keys(cart).filter(k => cart[k].id === id);
    if (!keys.length) return;
    const key = keys.includes(id) ? id : keys[keys.length - 1];
    setLineQty(key, cart[key].qty - 1);
  }

  const extrasPrice = (d, names) => names.reduce((s, n) => s + ((d.extras.find(x => x.name === n) || {}).price || 0), 0);
  const unitPrice = l => byId[l.id].price + extrasPrice(byId[l.id], l.extras);
  const dishQty = id => Object.values(cart).reduce((s, l) => s + (l.id === id ? l.qty : 0), 0);
  const lineNote = l => [l.removed.length ? 'bez: ' + l.removed.join(', ') : '', ...l.extras.map(n => '+ ' + n)].filter(Boolean).join(' · ');
  const count = () => Object.values(cart).reduce((a, l) => a + l.qty, 0);
  const subtotal = () => Object.values(cart).reduce((s, l) => s + unitPrice(l) * l.qty, 0);
  function getPromo() {
    try { const c = localStorage.getItem(PROMO_KEY) || ''; return PROMO_CODES[c] ? c : ''; } catch (e) { return ''; }
  }
  function setPromo(code) {
    try { code ? localStorage.setItem(PROMO_KEY, code) : localStorage.removeItem(PROMO_KEY); } catch (e) { /* nič */ }
  }
  const discount = () => { const c = getPromo(); return c ? Math.round(subtotal() * PROMO_CODES[c]) / 100 : 0; };
  const fee = () => (count() === 0 || subtotal() >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE);

  /* ---------- Karty jedál ---------- */
  function control(d) {
    if (d.soldOut) return '<span class="soldout">Vypredané</span>';
    const q = dishQty(d.id);
    if (!q) return `<button class="add" type="button" data-add="${d.id}" aria-label="Pridať ${esc(d.name)} do košíka">${ICON_PLUS}Pridať</button>`;
    return `<div class="qty">
        <button type="button" data-dec="${d.id}" aria-label="Menej">−</button>
        <span>${q}</span>
        <button type="button" data-inc="${d.id}" aria-label="Viac">+</button>
      </div>`;
  }

  function dishCard(d) {
    return `<article class="dish${d.soldOut ? ' is-soldout' : ''}">
        <div class="dish__media">
          <img src="${imgSrc(d)}" alt="${esc(d.name)}" loading="lazy" width="640" height="480">
          ${d.tag ? `<span class="dish__tag${d.tone ? ' dish__tag--' + d.tone : ''}">${esc(d.tag)}</span>` : ''}
        </div>
        <div class="dish__body">
          <h3>${esc(d.name)}</h3>
          <p>${esc(d.desc)}</p>
          ${d.ingredients.length || d.extras.length ? `<button type="button" class="customize" data-customize="${d.id}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="16" cy="7" r="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="10" cy="17" r="2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
            Upraviť zloženie</button>` : ''}
          <div class="dish__foot">
            <span class="price">${money(d.price)}</span>
            <span data-control="${d.id}">${control(d)}</span>
          </div>
        </div>
      </article>`;
  }

  function renderMenus() {
    // Domovská stránka: vybrané jedlá
    const featuredEl = $('[data-featured]');
    if (featuredEl) featuredEl.innerHTML = MENU.filter(d => d.featured).slice(0, 4).map(dishCard).join('');

    // Stránka menu: jedlá podľa kategórií
    $$('[data-category]').forEach(el => {
      const cat = el.dataset.category;
      const items = MENU.filter(d => d.cat === cat);
      el.innerHTML = items.map(dishCard).join('');
      el.closest('.menu-cat').hidden = items.length === 0;
      const chip = $(`.chip[href="#${cat}"]`);
      if (chip) chip.hidden = items.length === 0;
      const counter = $(`[data-count-for="${cat}"]`);
      if (counter) counter.textContent = `${items.length} ${items.length === 1 ? 'jedlo' : items.length < 5 ? 'jedlá' : 'jedál'}`;
    });
  }

  function refreshControls() {
    $$('[data-control]').forEach(el => { el.innerHTML = control(byId[el.dataset.control]); });
  }

  /* ---------- Počítadlá a panel košíka ---------- */
  const cartBar = $('[data-cart-bar]');

  function updateCounters() {
    const n = count();
    $$('[data-cart-count]').forEach(el => {
      const prev = el.textContent;
      el.textContent = n;
      if (el.classList.contains('badge')) {
        el.hidden = n === 0;
        if (String(n) !== prev && n > 0) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
      }
    });
    $$('[data-cart-sum]').forEach(el => (el.textContent = money(subtotal())));
    if (cartBar) cartBar.hidden = n === 0;
  }

  /* ---------- Stránka košíka ---------- */
  const page = $('[data-cart-page]');
  const listEl = $('[data-cart-list]');
  const formEl = $('[data-order-form]');

  function renderCartPage() {
    if (!page || !$('[data-success]').hidden) return;
    const entries = Object.entries(cart);
    const empty = entries.length === 0;
    $('[data-cart-empty]').hidden = !empty;
    $('[data-cart-filled]').hidden = empty;
    if (empty) return;

    listEl.innerHTML = entries.map(([key, l]) => {
      const d = byId[l.id];
      const note = lineNote(l);
      return `<li class="cart-item">
          <img src="${imgSrc(d)}" alt="" width="72" height="72">
          <div>
            <div class="cart-item__name">${esc(d.name)}</div>
            ${note ? `<div class="cart-item__note">${esc(note)}</div>` : ''}
            ${d.ingredients.length || d.extras.length ? `<button type="button" class="cart-item__edit" data-edit-line="${esc(key)}">Upraviť zloženie</button>` : ''}
            <div class="cart-item__row">
              <span class="cart-item__price">${money(unitPrice(l) * l.qty)}</span>
              <div class="qty">
                <button type="button" data-line-dec="${esc(key)}" aria-label="Menej">−</button>
                <span>${l.qty}</span>
                <button type="button" data-line-inc="${esc(key)}" aria-label="Viac">+</button>
              </div>
            </div>
          </div>
        </li>`;
    }).join('');

    const sub = subtotal();
    $('[data-subtotal]').textContent = money(sub);
    $('[data-delivery]').textContent = fee() ? money(fee()) : 'Zadarmo';
    const promo = getPromo();
    const discRow = $('[data-discount-row]');
    discRow.hidden = !promo;
    if (promo) {
      $('[data-discount-label]').textContent = `Zľava ${promo} (−${PROMO_CODES[promo]} %)`;
      $('[data-discount]').textContent = '−' + money(discount());
    }
    $('[data-promo-form]').hidden = !!promo;
    $$('[data-grand-total]').forEach(el => (el.textContent = money(sub - discount() + fee())));
    $('[data-progress]').style.width = Math.min(100, (sub / FREE_DELIVERY_FROM) * 100) + '%';
    $('[data-free-note]').textContent = sub < FREE_DELIVERY_FROM
      ? `Pridajte ešte za ${money(FREE_DELIVERY_FROM - sub)} a donášku máte zadarmo.`
      : 'Donášku máte zadarmo 🎉';
  }

  function update() {
    refreshControls();
    updateCounters();
    renderCartPage();
  }

  if (formEl) {
    const errorEl = $('[data-form-error]');
    formEl.addEventListener('submit', e => {
      e.preventDefault();
      const required = ['name', 'phone', 'address'].map(n => formEl.elements[n]);
      required.forEach(i => i.classList.toggle('is-invalid', !(i.value.trim() && i.checkValidity())));
      const bad = required.find(i => i.classList.contains('is-invalid'));
      errorEl.hidden = !bad;
      if (bad) { bad.focus(); return; }

      const data = Object.fromEntries(new FormData(formEl));
      const order = {
        items: Object.values(cart).map(l => ({
          name: byId[l.id].name,
          qty: l.qty,
          price: unitPrice(l),
          removed: l.removed,
          extras: l.extras,
          note: lineNote(l)
        })),
        subtotal: subtotal(),
        delivery: fee(),
        discount: discount(),
        promo: getPromo(),
        total: subtotal() - discount() + fee(),
        customer: data,
        createdAt: new Date().toISOString()
      };
      // Sem sa dá napojiť backend, napr. fetch('/api/order', { method: 'POST', body: JSON.stringify(order) })
      console.info('Nová objednávka', order);

      $('[data-success-text]').textContent =
        `${data.name.trim().split(' ')[0]}, objednávku v hodnote ${money(order.total)} doručíme ${data.place === 'Do kancelárie' ? 'do kancelárie' : 'domov'} na adresu ${data.address}. Čoskoro vám zavoláme na potvrdenie.`;

      cart = {};
      save();
      setPromo('');
      formEl.reset();
      $('[data-cart-filled]').hidden = true;
      $('[data-success]').hidden = false;
      updateCounters();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (window.ChutkoFun) window.ChutkoFun.track(order);
    });
    const promoForm = $('[data-promo-form]');
    const promoInput = $('[data-promo-input]');
    const applyPromo = () => {
      const code = promoInput.value.trim().toUpperCase().replace(/\s+/g, '');
      if (!PROMO_CODES[code]) {
        toastText(code ? 'Tento kód nepoznáme 🤔' : 'Zadajte promo kód');
        promoInput.classList.add('is-invalid');
        return;
      }
      setPromo(code);
      promoInput.value = '';
      promoInput.classList.remove('is-invalid');
      toastText(`Kód ${code} uplatnený: −${PROMO_CODES[code]} % 🎉`);
      renderCartPage();
    };
    $('[data-promo-apply]').addEventListener('click', applyPromo);
    promoInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); applyPromo(); } });
    $('[data-promo-remove]').addEventListener('click', () => { setPromo(''); renderCartPage(); });
    formEl.addEventListener('input', e => {
      if (e.target.classList.contains('is-invalid') && e.target.value.trim()) e.target.classList.remove('is-invalid');
    });
  }

  /* ---------- Toast ---------- */
  const toastEl = document.createElement('div');
  toastEl.className = 'toast';
  toastEl.setAttribute('role', 'status');
  toastEl.setAttribute('aria-live', 'polite');
  document.body.appendChild(toastEl);
  let toastTimer;
  function toast(d) {
    toastEl.innerHTML = `<img src="${imgSrc(d)}" alt=""><span>${esc(d.name)} — v košíku</span>`;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 1800);
  }

  function toastText(msg) {
    toastEl.innerHTML = `<span>${esc(msg)}</span>`;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2200);
  }

  /* ---------- Kliky ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-add], [data-inc], [data-dec], [data-line-inc], [data-line-dec], [data-customize], [data-edit-line]');
    if (!t) return;
    const ds = t.dataset;
    if (ds.add && byId[ds.add] && !byId[ds.add].soldOut) { addLine(ds.add); toast(byId[ds.add]); }
    else if (ds.inc) addLine(ds.inc);
    else if (ds.dec) decDish(ds.dec);
    else if (ds.lineInc && cart[ds.lineInc]) setLineQty(ds.lineInc, cart[ds.lineInc].qty + 1);
    else if (ds.lineDec && cart[ds.lineDec]) setLineQty(ds.lineDec, cart[ds.lineDec].qty - 1);
    else if (ds.customize) openCustomizer(ds.customize);
    else if (ds.editLine && cart[ds.editLine]) openCustomizer(cart[ds.editLine].id, ds.editLine);
  });

  /* ---------- Úprava zloženia jedla ---------- */
  let custom = null;

  function openCustomizer(id, editKey) {
    const d = byId[id];
    if (!d || d.soldOut) return;
    const edit = editKey && cart[editKey];
    const removed = new Set(edit ? edit.removed : []);
    const extras = new Set(edit ? edit.extras : []);
    let qty = edit ? edit.qty : 1;

    if (!custom) {
      custom = document.createElement('dialog');
      custom.className = 'custom-dialog';
      document.body.appendChild(custom);
      custom.addEventListener('click', e => { if (e.target === custom || e.target.closest('[data-custom-close]')) custom.close(); });
    }

    custom.innerHTML = `
      <form method="dialog" class="custom">
        <div class="custom__media">
          <img src="${imgSrc(d)}" alt="">
          <button type="button" class="icon-btn custom__close" data-custom-close aria-label="Zavrieť">✕</button>
        </div>
        <div class="custom__body">
          <h2 class="display">${esc(d.name)}</h2>
          <p class="custom__desc">${esc(d.desc)}</p>
          ${d.ingredients.length ? `
          <h3>Zloženie <small>Ťuknite na surovinu, ktorú nechcete</small></h3>
          <div class="ing-chips">${d.ingredients.map((n, i) => `
            <label class="ing-chip"><input type="checkbox" data-ing="${i}" ${removed.has(n) ? '' : 'checked'}><span>${esc(n)}</span></label>`).join('')}
          </div>` : ''}
          ${d.extras.length ? `
          <h3>Pridať navyše</h3>
          <div class="extras">${d.extras.map((x, i) => `
            <label class="extra-row"><input type="checkbox" data-extra="${i}" ${extras.has(x.name) ? 'checked' : ''}><span class="extra-row__box"></span><span class="extra-row__name">${esc(x.name)}</span><span class="extra-row__price">+${money(x.price)}</span></label>`).join('')}
          </div>` : ''}
          <p class="custom__summary" data-custom-summary></p>
        </div>
        <div class="custom__foot">
          <div class="qty">
            <button type="button" data-custom-dec aria-label="Menej">−</button>
            <span data-custom-qty>${qty}</span>
            <button type="button" data-custom-inc aria-label="Viac">+</button>
          </div>
          <button type="submit" class="btn btn--ink" data-custom-submit></button>
        </div>
      </form>`;

    const form = custom.querySelector('form');
    const refresh = () => {
      const rem = d.ingredients.filter((n, i) => !form.querySelector(`[data-ing="${i}"]`).checked);
      const ext = d.extras.filter((x, i) => form.querySelector(`[data-extra="${i}"]`).checked).map(x => x.name);
      const unit = d.price + extrasPrice(d, ext);
      form.querySelector('[data-custom-qty]').textContent = qty;
      form.querySelector('[data-custom-submit]').textContent = `${edit ? 'Uložiť' : 'Do košíka'} · ${money(unit * qty)}`;
      const note = lineNote({ removed: rem, extras: ext });
      form.querySelector('[data-custom-summary]').textContent = note ? 'Vaša úprava: ' + note : 'Bez úprav – presne podľa receptu šéfkuchára 👨‍🍳';
      return { rem, ext };
    };
    form.addEventListener('change', refresh);
    form.querySelector('[data-custom-dec]').addEventListener('click', () => { qty = Math.max(1, qty - 1); refresh(); });
    form.querySelector('[data-custom-inc]').addEventListener('click', () => { qty = Math.min(99, qty + 1); refresh(); });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const { rem, ext } = refresh();
      if (edit) delete cart[editKey];
      addLine(d.id, rem, ext, qty);
      custom.close();
      if (edit) toastText('Úprava uložená ✓');
      else toast(d);
    });
    refresh();
    custom.showModal();
  }

  /* ---------- Mobilné menu ---------- */
  const burger = $('[data-burger]');
  if (burger) {
    burger.addEventListener('click', () => {
      const open = !document.body.classList.contains('nav-open');
      document.body.classList.toggle('nav-open', open);
      burger.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { document.body.classList.remove('nav-open'); burger.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* ---------- Hlavička pri scrollovaní ---------- */
  const header = $('.header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Aktívna kategória v menu ---------- */
  const chips = $$('.chip');
  if (chips.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        chips.forEach(c => c.classList.toggle('is-active', c.getAttribute('href') === '#' + en.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('.menu-cat').forEach(s => io.observe(s));
  }

  /* ---------- Animácia pri scrollovaní ---------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const ro = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); ro.unobserve(en.target); } });
    }, { threshold: .12 });
    reveals.forEach(el => ro.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-in'));
  }

  $$('[data-year]').forEach(el => (el.textContent = new Date().getFullYear()));

  /* ---------- Štart: načítanie menu ---------- */
  const ready = window.ChutkoData.load().then(({ items }) => {
    MENU = items;
    byId = Object.fromEntries(MENU.map(d => [d.id, d]));
    cart = loadCart();
    save();
    renderMenus();
    update();
  });

  /* ---------- Rozhranie pre zábavné funkcie (fun.js, hra.js) ---------- */
  window.Chutko = {
    ready,
    menu: () => MENU.slice(),
    add(id) {
      const d = byId[id];
      if (!d || d.soldOut) return;
      addLine(id);
      toast(d);
    },
    applyPromo(code) { if (PROMO_CODES[code]) { setPromo(code); update(); } },
    money,
    esc,
    imgSrc,
    toast: toastText
  };
})();
