(function () {
  'use strict';

  const D = window.ChutkoData;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => n.toFixed(2).replace('.', ',') + ' €';
  const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'%3E%3Crect width='4' height='3' fill='%23CDE1D3'/%3E%3C/svg%3E";

  const icon = path => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const I = {
    up: icon('M12 19V5m-6 6 6-6 6 6'),
    down: icon('M12 5v14m6-6-6 6-6-6'),
    edit: icon('M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4'),
    del: icon('M5 7h14M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3'),
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" fill="currentColor"/></svg>'
  };

  let items = [];

  const listEl = $('[data-admin-list]');
  const dialog = $('[data-dialog]');
  const form = $('[data-dish-form]');
  const loginEl = $('[data-login]');
  const appEl = $('[data-admin-app]');

  /* ---------- Toast ---------- */
  const toastEl = $('[data-toast]');
  let toastTimer;
  function toast(msg, isError) {
    toastEl.textContent = msg;
    toastEl.classList.toggle('is-error', !!isError);
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2200);
  }

  /* ---------- Režim (server / prehliadač) ---------- */
  function renderMode() {
    const el = $('[data-mode]');
    if (D.mode === 'server') {
      el.className = 'mode mode--server';
      el.innerHTML = '<b>Server</b> Zmeny sa ukladajú na server a hneď ich vidia všetci návštevníci.';
    } else {
      el.className = 'mode mode--local';
      el.innerHTML = '<b>Bez servera</b> Zmeny sa ukladajú len v tomto prehliadači. Aby ich videli všetci, kliknite na <em>Exportovať</em> a nahrajte súbor <code>menu.json</code> na web, alebo spustite <code>server.py</code>.';
    }
    $('[data-reset]').hidden = D.mode === 'server';
  }

  /* ---------- Zoznam jedál ---------- */
  function render() {
    const stats = $('[data-stats]');
    stats.textContent = `${items.length} jedál · ${items.filter(d => d.soldOut).length} vypredaných · ${items.filter(d => d.featured).length} na úvodnej stránke`;

    listEl.innerHTML = Object.entries(D.CATEGORIES).map(([cat, label]) => {
      const list = items.filter(d => d.cat === cat);
      return `<section class="adm-cat">
          <div class="adm-cat__head">
            <h2 class="display h3">${esc(label)} <span>${list.length}</span></h2>
            <button class="btn btn--line adm-small" type="button" data-new="${cat}">+ Pridať</button>
          </div>
          ${list.length ? `<ul class="adm-list">${list.map((d, i) => row(d, i, list.length)).join('')}</ul>`
            : '<p class="adm-empty">V tejto kategórii zatiaľ nie sú žiadne jedlá.</p>'}
        </section>`;
    }).join('');
  }

  function row(d, i, n) {
    return `<li class="adm-row${d.soldOut ? ' is-soldout' : ''}" data-id="${esc(d.id)}">
        <img src="${esc(d.img || PLACEHOLDER)}" alt="" width="72" height="54">
        <div class="adm-row__main">
          <div class="adm-row__name">${esc(d.name)}</div>
          <div class="adm-row__meta">
            <span class="price">${money(d.price)}</span>
            ${d.tag ? `<span class="adm-tag${d.tone ? ' dish__tag--' + d.tone : ''}">${esc(d.tag)}</span>` : ''}
            ${d.soldOut ? '<span class="adm-tag adm-tag--off">Vypredané</span>' : ''}
            ${d.ingredients.length || d.extras.length ? `<span class="adm-comp">${d.ingredients.length} surovín · ${d.extras.length} príloh</span>` : '<span class="adm-comp adm-comp--none">bez zloženia</span>'}
          </div>
        </div>
        <div class="adm-row__actions">
          <button type="button" class="adm-ico${d.featured ? ' is-on' : ''}" data-act="featured" title="Zobraziť na úvodnej stránke" aria-label="Na úvodnej stránke" aria-pressed="${d.featured}">${I.star}</button>
          <label class="switch" title="Dostupné na objednanie">
            <input type="checkbox" data-act="available" ${d.soldOut ? '' : 'checked'} aria-label="Dostupné">
            <span></span>
          </label>
          <button type="button" class="adm-ico" data-act="up" aria-label="Posunúť vyššie" ${i === 0 ? 'disabled' : ''}>${I.up}</button>
          <button type="button" class="adm-ico" data-act="down" aria-label="Posunúť nižšie" ${i === n - 1 ? 'disabled' : ''}>${I.down}</button>
          <button type="button" class="adm-ico" data-act="edit" aria-label="Upraviť">${I.edit}</button>
          <button type="button" class="adm-ico adm-ico--danger" data-act="delete" aria-label="Vymazať">${I.del}</button>
        </div>
      </li>`;
  }

  /* ---------- Uloženie ---------- */
  async function persist(msg) {
    try {
      items = await D.save(items);
      render();
      toast(msg || 'Uložené');
    } catch (e) {
      if (e.message === 'auth') { showLogin('Heslo nesedí alebo vypršalo. Prihláste sa znova.'); }
      else if (e.message === 'quota') { toast('Prehliadač nemá dosť miesta – použite menšie fotky alebo server.', true); }
      else { toast('Uloženie zlyhalo. Skúste to znova.', true); }
      throw e;
    }
  }

  /* ---------- Akcie v zozname ---------- */
  listEl.addEventListener('click', e => {
    const newBtn = e.target.closest('[data-new]');
    if (newBtn) { openForm(null, newBtn.dataset.new); return; }

    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.closest('[data-id]').dataset.id;
    const d = items.find(x => x.id === id);
    const act = btn.dataset.act;

    if (act === 'edit') openForm(d);
    else if (act === 'delete') {
      if (confirm(`Naozaj vymazať „${d.name}“?`)) {
        items = items.filter(x => x.id !== id);
        persist('Jedlo vymazané').catch(() => {});
      }
    } else if (act === 'featured') {
      d.featured = !d.featured;
      persist(d.featured ? 'Zobrazí sa na úvodnej stránke' : 'Odstránené z úvodnej stránky').catch(() => {});
    } else if (act === 'up' || act === 'down') {
      const same = items.filter(x => x.cat === d.cat);
      const j = same.indexOf(d) + (act === 'up' ? -1 : 1);
      if (j < 0 || j >= same.length) return;
      const a = items.indexOf(d), b = items.indexOf(same[j]);
      [items[a], items[b]] = [items[b], items[a]];
      persist('Poradie zmenené').catch(() => {});
    }
  });

  listEl.addEventListener('change', e => {
    if (e.target.dataset.act !== 'available') return;
    const d = items.find(x => x.id === e.target.closest('[data-id]').dataset.id);
    d.soldOut = !e.target.checked;
    persist(d.soldOut ? `„${d.name}“ je vypredané` : `„${d.name}“ je opäť v ponuke`).catch(() => {});
  });

  /* ---------- Formulár jedla ---------- */
  const catSelect = form.elements.cat;
  catSelect.innerHTML = Object.entries(D.CATEGORIES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
  const preview = $('[data-preview]');
  const imgInput = form.elements.img;
  const fileInput = $('[data-file]');
  const gallery = $('[data-gallery]');
  let editingId = null;

  // Galéria fotiek, ktoré už web má
  const PHOTOS = ['toast', 'lievance', 'avokado', 'jogurt', 'losos-bowl', 'buddha-bowl', 'salat', 'grain-bowl', 'farfalle', 'steak', 'losos', 'penne', 'curry', 'gril', 'cappuccino', 'flat-white', 'torta', 'zmrzlina'];
  gallery.innerHTML = PHOTOS.map(p => `<button type="button" data-pick="img/${p}.jpg" aria-label="${p}"><img src="img/${p}.jpg" alt="" loading="lazy"></button>`).join('');
  gallery.addEventListener('click', e => {
    const b = e.target.closest('[data-pick]');
    if (!b) return;
    setImg(b.dataset.pick);
  });

  function setImg(src) {
    imgInput.value = src;
    preview.src = src || PLACEHOLDER;
    $$('[data-pick]', gallery).forEach(b => b.classList.toggle('is-on', b.dataset.pick === src));
  }

  /* ---------- Zloženie a prílohy ---------- */
  let ingredients = [];
  let extras = [];
  const ingList = $('[data-ing-list]');
  const extraList = $('[data-extra-list]');
  const ingInput = $('[data-ing-input]');
  const extraName = $('[data-extra-name]');
  const extraPrice = $('[data-extra-price]');

  function renderComposition() {
    ingList.innerHTML = ingredients.length
      ? ingredients.map((n, i) => `<span class="ing-tag">${esc(n)}<button type="button" data-ing-del="${i}" aria-label="Odstrániť ${esc(n)}">✕</button></span>`).join('')
      : '<span class="adm-hint">Zatiaľ žiadne suroviny.</span>';
    extraList.innerHTML = extras.length
      ? extras.map((x, i) => `<li><span>${esc(x.name)}</span><b>+${money(x.price)}</b><button type="button" data-extra-del="${i}" aria-label="Odstrániť ${esc(x.name)}">✕</button></li>`).join('')
      : '<li class="adm-hint">Zatiaľ žiadne prílohy.</li>';
  }

  function addIngredient() {
    // dá sa vložiť aj viac naraz, oddelené čiarkou
    ingInput.value.split(',').map(t => t.trim()).filter(Boolean).forEach(t => {
      if (!ingredients.some(x => x.toLowerCase() === t.toLowerCase()) && ingredients.length < 20) ingredients.push(t.slice(0, 40));
    });
    ingInput.value = '';
    renderComposition();
    ingInput.focus();
  }

  function addExtra() {
    const name = extraName.value.trim();
    const price = parseFloat(extraPrice.value.replace(',', '.').replace(/[^\d.]/g, ''));
    if (!name) { extraName.focus(); return; }
    if (!(price >= 0)) { extraPrice.focus(); extraPrice.classList.add('is-invalid'); return; }
    extraPrice.classList.remove('is-invalid');
    if (!extras.some(x => x.name.toLowerCase() === name.toLowerCase()) && extras.length < 15) extras.push({ name: name.slice(0, 40), price });
    extraName.value = '';
    extraPrice.value = '';
    renderComposition();
    extraName.focus();
  }

  $('[data-ing-add]').addEventListener('click', addIngredient);
  ingInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addIngredient(); } });
  $('[data-extra-add]').addEventListener('click', addExtra);
  [extraName, extraPrice].forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addExtra(); } }));
  ingList.addEventListener('click', e => {
    const b = e.target.closest('[data-ing-del]');
    if (b) { ingredients.splice(+b.dataset.ingDel, 1); renderComposition(); }
  });
  extraList.addEventListener('click', e => {
    const b = e.target.closest('[data-extra-del]');
    if (b) { extras.splice(+b.dataset.extraDel, 1); renderComposition(); }
  });

  function openForm(d, cat) {
    editingId = d ? d.id : null;
    form.reset();
    $('[data-dialog-title]').textContent = d ? 'Upraviť jedlo' : 'Nové jedlo';
    const v = d || { cat: cat || 'obedy', name: '', desc: '', price: '', tag: '', tone: '', img: '', featured: false, soldOut: false, ingredients: [], extras: [] };
    ingredients = v.ingredients.slice();
    extras = v.extras.map(x => ({ ...x }));
    renderComposition();
    form.elements.name.value = v.name;
    form.elements.desc.value = v.desc;
    form.elements.price.value = v.price === '' ? '' : String(v.price).replace('.', ',');
    form.elements.cat.value = v.cat;
    form.elements.tag.value = v.tag || '';
    $$('input[name="tone"]', form).forEach(r => (r.checked = r.value === (v.tone || '')));
    form.elements.featured.checked = !!v.featured;
    form.elements.available.checked = !v.soldOut;
    setImg(v.img || '');
    $('[data-form-error]').hidden = true;
    $('[data-delete-in-form]').hidden = !d;
    dialog.showModal();
    setTimeout(() => form.elements.name.focus(), 50);
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const label = $('[data-upload-label]');
    label.textContent = 'Nahrávam…';
    try {
      setImg(await D.uploadImage(file));
      toast('Fotka pridaná');
    } catch (e) {
      if (e.message === 'auth') showLogin('Prihláste sa znova.');
      else toast(e.message === 'type' ? 'Tento súbor nie je obrázok.' : 'Fotku sa nepodarilo nahrať.', true);
    } finally {
      label.textContent = 'Nahrať vlastnú fotku';
      fileInput.value = '';
    }
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const price = parseFloat(form.elements.price.value.replace(',', '.').replace(/[^\d.]/g, ''));
    const name = form.elements.name.value.trim();
    const errEl = $('[data-form-error]');
    if (!name || !(price >= 0)) {
      errEl.textContent = !name ? 'Zadajte názov jedla.' : 'Zadajte platnú cenu, napr. 8,90.';
      errEl.hidden = false;
      return;
    }
    const data = D.clean({
      id: editingId || undefined,
      name,
      desc: form.elements.desc.value,
      price,
      cat: form.elements.cat.value,
      tag: form.elements.tag.value,
      tone: (form.querySelector('input[name="tone"]:checked') || {}).value || '',
      img: imgInput.value,
      featured: form.elements.featured.checked,
      soldOut: !form.elements.available.checked,
      ingredients,
      extras
    });

    const before = items.slice();
    if (editingId) items = items.map(x => (x.id === editingId ? data : x));
    else items.push(data);
    try {
      await persist(editingId ? 'Zmeny uložené' : 'Jedlo pridané');
      dialog.close();
    } catch (err) {
      items = before;
    }
  });

  $('[data-delete-in-form]').addEventListener('click', () => {
    const d = items.find(x => x.id === editingId);
    if (d && confirm(`Naozaj vymazať „${d.name}“?`)) {
      items = items.filter(x => x.id !== editingId);
      persist('Jedlo vymazané').then(() => dialog.close()).catch(() => {});
    }
  });
  $$('[data-close-dialog]').forEach(b => b.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });

  /* ---------- Nástroje ---------- */
  $('[data-add]').addEventListener('click', () => openForm(null));

  $('[data-export]').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ items }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'menu.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Súbor menu.json stiahnutý');
  });

  $('[data-import]').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const list = D.cleanAll(Array.isArray(data) ? data : data.items);
      if (!list.length) throw new Error('empty');
      if (!confirm(`Nahradiť aktuálne menu ${list.length} jedlami zo súboru?`)) return;
      items = list;
      await persist('Menu importované');
    } catch (err) {
      if (!['auth', 'quota', 'server'].includes(err.message)) toast('Súbor sa nepodarilo načítať.', true);
    }
  });

  $('[data-reset]').addEventListener('click', () => {
    if (!confirm('Zahodiť všetky úpravy v tomto prehliadači a vrátiť pôvodné menu?')) return;
    D.resetLocal();
    D.load().then(res => { items = res.items; renderMode(); render(); toast('Obnovené pôvodné menu'); });
  });

  /* ---------- Prihlásenie ----------
     So serverom overuje heslo server.py, bez servera sa porovná s heslom tu.
     (Školský projekt – heslo v kóde nie je skutočná ochrana.) */
  const ADMIN_PASSWORD = 'chutko2026';
  function showLogin(msg) {
    appEl.hidden = true;
    loginEl.hidden = false;
    $('[data-login-error]').textContent = msg || '';
    $('[data-login-error]').hidden = !msg;
    setTimeout(() => $('[name="password"]', loginEl).focus(), 50);
    if (dialog.open) dialog.close();
  }

  $('form', loginEl).addEventListener('submit', async e => {
    e.preventDefault();
    const pass = e.target.elements.password.value;
    const res = D.mode === 'server'
      ? await fetch('api/login', { method: 'POST', headers: { 'X-Admin-Password': pass } }).catch(() => null)
      : { ok: pass === ADMIN_PASSWORD };
    if (res && res.ok) {
      D.setPassword(pass);
      e.target.reset();
      loginEl.hidden = true;
      appEl.hidden = false;
      render();
    } else {
      $('[data-login-error]').textContent = res && res.status === 503 ? 'Na serveri nie je nastavené heslo (ADMIN_PASSWORD).' : 'Nesprávne heslo.';
      $('[data-login-error]').hidden = false;
    }
  });

  /* ---------- Štart ---------- */
  D.load().then(async res => {
    items = res.items;
    renderMode();
    const saved = D.getPassword();
    const ok = D.mode === 'server'
      ? saved && (await fetch('api/login', { method: 'POST', headers: { 'X-Admin-Password': saved } }).then(r => r.ok).catch(() => false))
      : saved === ADMIN_PASSWORD;
    if (!ok) { showLogin(); return; }
    appEl.hidden = false;
    render();
  });
})();
