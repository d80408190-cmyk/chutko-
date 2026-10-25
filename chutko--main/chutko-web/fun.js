/* ==========================================================
   Chutko — zábavné funkcie
   1. Koleso „Neviem, čo si dať“
   2. Sledovanie kuriéra po objednávke
   3. Pršiace jedlo (konfety) + tajná pasca na logu
   ========================================================== */
(function () {
  'use strict';

  const C = window.Chutko;
  if (!C) return;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Pršiace jedlo ---------- */
  const FOOD = ['🍕', '🍔', '🥗', '🍣', '🥐', '🍩', '🍓', '🥑', '🌮', '🍜', '🧁', '🍉', '☕', '🥞'];

  function foodRain(amount = 60) {
    if (reduced) return;
    const layer = document.createElement('div');
    layer.className = 'food-rain';
    layer.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < amount; i++) {
      const s = document.createElement('span');
      s.textContent = FOOD[Math.floor(Math.random() * FOOD.length)];
      s.style.left = Math.random() * 100 + 'vw';
      s.style.fontSize = 22 + Math.random() * 30 + 'px';
      s.style.animationDuration = 2.2 + Math.random() * 2.2 + 's';
      s.style.animationDelay = Math.random() * 1.2 + 's';
      s.style.setProperty('--spin', (Math.random() * 720 - 360) + 'deg');
      s.style.setProperty('--drift', (Math.random() * 120 - 60) + 'px');
      layer.appendChild(s);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 5000);
  }

  /* ---------- Tajomstvo: 5× klik na logo (na úvodnej stránke) alebo napíš „chutko“ ---------- */
  function secret() {
    foodRain(90);
    const box = document.createElement('div');
    box.className = 'secret';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Tajomstvo');
    box.innerHTML = `
      <div class="secret__card">
        <div class="secret__emoji">🤫</div>
        <h2 class="display">Našiel si <em>tajomstvo!</em></h2>
        <p>Za odmenu máš tajný kód na&nbsp;zľavu&nbsp;15&nbsp;%:</p>
        <button type="button" class="secret__code" data-copy="TAJNE15">TAJNE15</button>
        <p class="secret__hint">Klikni na kód – uplatní sa v košíku.</p>
        <button type="button" class="btn btn--ink" data-close>Super, vďaka!</button>
      </div>`;
    document.body.appendChild(box);
    const close = () => box.remove();
    box.addEventListener('click', e => {
      if (e.target === box || e.target.closest('[data-close]')) close();
      const code = e.target.closest('[data-copy]');
      if (code) {
        C.applyPromo(code.dataset.copy);
        C.toast('Kód TAJNE15 je v košíku 🎁');
        close();
      }
    });
  }

  const logo = $('.header .logo');
  const isHome = /(^|\/)(index\.html)?$/.test(location.pathname);
  let clicks = 0;
  let clickTimer;
  if (logo && isHome) {
    logo.addEventListener('click', e => {
      e.preventDefault();
      clicks++;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => { clicks = 0; }, 1500);
      logo.classList.remove('wiggle');
      void logo.offsetWidth;
      logo.classList.add('wiggle');
      if (clicks >= 5) { clicks = 0; secret(); }
      else if (clicks === 1) window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  let typed = '';
  document.addEventListener('keydown', e => {
    if (e.target.closest('input, textarea, select')) return;
    typed = (typed + (e.key || '').toLowerCase()).slice(-6);
    if (typed === 'chutko') secret();
  });

  /* ---------- Koleso „Neviem, čo si dať“ ---------- */
  const WHEEL_COLORS = ['#8EAF93', '#CDE1D3', '#778764', '#9EC5DF', '#2C2E2B', '#dcebf5'];
  const DARK = new Set(['#778764', '#2C2E2B']);
  let wheelDialog = null;
  let rotation = 0;
  let spinning = false;

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function wheelSvg(items) {
    const n = items.length;
    const r = 150;
    const step = 360 / n;
    const pt = a => [r + r * Math.sin(a * Math.PI / 180), r - r * Math.cos(a * Math.PI / 180)];
    return `<svg viewBox="0 0 300 300" class="wheel__svg" aria-hidden="true">` + items.map((d, i) => {
      const a0 = i * step, a1 = (i + 1) * step;
      const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
      const color = WHEEL_COLORS[i % WHEEL_COLORS.length];
      const mid = a0 + step / 2;
      const label = d.name.length > 16 ? d.name.slice(0, 15) + '…' : d.name;
      return `<path d="M150 150 L${x0} ${y0} A150 150 0 0 1 ${x1} ${y1} Z" fill="${color}"/>
        <text x="150" y="150" transform="rotate(${mid - 90} 150 150) translate(${r - 14} 0)" text-anchor="end" dominant-baseline="middle" fill="${DARK.has(color) ? '#fff' : '#2C2E2B'}">${C.esc(label)}</text>`;
    }).join('') + `<circle cx="150" cy="150" r="26" fill="#F4F8F3"/></svg>`;
  }

  function openWheel() {
    const pool = shuffle(C.menu().filter(d => !d.soldOut)).slice(0, 8);
    if (pool.length < 2) { C.toast('Menu je zatiaľ prázdne 🙈'); return; }

    if (!wheelDialog) {
      wheelDialog = document.createElement('dialog');
      wheelDialog.className = 'wheel-dialog';
      wheelDialog.setAttribute('aria-label', 'Koleso chutí');
      document.body.appendChild(wheelDialog);
      wheelDialog.addEventListener('click', e => { if (e.target === wheelDialog || e.target.closest('[data-wheel-close]')) wheelDialog.close(); });
    }
    rotation = 0;
    wheelDialog.innerHTML = `
      <button type="button" class="icon-btn wheel-dialog__close" data-wheel-close aria-label="Zavrieť">✕</button>
      <p class="label c-olive">Koleso chutí</p>
      <h2 class="display">Neviem, <em>čo si dať</em></h2>
      <p class="wheel-dialog__sub">Zatoč a nechaj osud vybrať tvoje jedlo.</p>
      <div class="wheel">
        <div class="wheel__pointer" aria-hidden="true"></div>
        <div class="wheel__disc">${wheelSvg(pool)}</div>
        <button type="button" class="wheel__spin" data-spin>TOČ!</button>
      </div>
      <div class="wheel-result" data-result hidden></div>`;
    wheelDialog.showModal();

    const disc = $('.wheel__disc', wheelDialog);
    const result = $('[data-result]', wheelDialog);
    $('[data-spin]', wheelDialog).addEventListener('click', () => {
      if (spinning) return;
      spinning = true;
      result.hidden = true;
      const n = pool.length;
      const pick = Math.floor(Math.random() * n);
      const step = 360 / n;
      // ukazovateľ je hore: stred vybraného dielika musí skončiť na 0°
      const target = 360 - (pick * step + step / 2) + (Math.random() - .5) * step * .6;
      const current = ((rotation % 360) + 360) % 360;
      rotation += (reduced ? 360 : 360 * 6) + ((target - current + 360) % 360);
      disc.style.transitionDuration = reduced ? '.3s' : '4.6s';
      disc.style.transform = `rotate(${rotation}deg)`;
      setTimeout(() => {
        spinning = false;
        const d = pool[pick];
        result.innerHTML = `
          <img src="${C.esc(C.imgSrc(d))}" alt="">
          <div>
            <small>Osud rozhodol 🎉</small>
            <strong>${C.esc(d.name)}</strong>
            <span class="price">${C.money(d.price)}</span>
          </div>
          <div class="wheel-result__actions">
            <button type="button" class="btn btn--ink" data-take="${C.esc(d.id)}">Beriem!</button>
            <button type="button" class="btn btn--line" data-spin-again>Ešte raz</button>
          </div>`;
        result.hidden = false;
        foodRain(24);
      }, reduced ? 350 : 4700);
    });
    result.addEventListener('click', e => {
      const take = e.target.closest('[data-take]');
      if (take) { C.add(take.dataset.take); wheelDialog.close(); }
      if (e.target.closest('[data-spin-again]')) $('[data-spin]', wheelDialog).click();
    });
  }

  document.addEventListener('click', e => {
    if (e.target.closest('[data-open-wheel]')) { e.preventDefault(); C.ready.then(openWheel); }
  });

  /* ---------- Sledovanie kuriéra ---------- */
  const PHASES = [
    { at: 0,   key: 'prijata', label: 'Prijatá' },
    { at: .12, key: 'varime',  label: 'Varíme' },
    { at: .42, key: 'cesta',   label: 'Na ceste' },
    { at: 1,   key: 'hotovo',  label: 'Doručené' }
  ];
  const JOKES = [
    [0,    'Objednávka dorazila do kuchyne. Kuchár zatlieskal 👏'],
    [.05,  'Kuchár si umýva ruky. Dvakrát, pre istotu 🧼'],
    [.13,  'Krájame cibuľu. Nikto neplače, to len alergia 😢'],
    [.22,  'Šéfkuchár ochutnáva… len trošičku 😋'],
    [.32,  'Balíme do eko termoobalu, aby to bolo ako v reštaurácii ♻️'],
    [.42,  'Kuriér si nasadil prilbu a vyráža 🛵'],
    [.52,  'Kuriér obchádza holuby. Holuby neustúpili 🐦'],
    [.62,  'Červená na semafore. Kuriér si spieva 🎤'],
    [.72,  'Kuriér pozdravil babku zo susedstva 👵'],
    [.84,  'Hľadáme číslo vášho domu… a máme ho! 🔍'],
    [.94,  'Crrrn! Kuriér zvoní, utekajte k dverám 🔔'],
    [1,    'Doručené. Dobrú chuť! 🍽️']
  ];
  const TOTAL_MS = 60000; // ukážka: celé doručenie za 1 minútu

  function mapSvg() {
    return `<svg viewBox="0 0 360 240" class="track__map" aria-hidden="true">
      <rect width="360" height="240" rx="20" fill="#e7f0e9"/>
      <path d="M-10 190 C80 160 120 230 210 200 S330 150 370 170" fill="none" stroke="#9EC5DF" stroke-width="18" stroke-linecap="round"/>
      <circle cx="300" cy="60" r="34" fill="#8EAF93" opacity=".55"/>
      <circle cx="60" cy="70" r="22" fill="#8EAF93" opacity=".45"/>
      <g stroke="#fff" stroke-width="10" stroke-linecap="round">
        <path d="M0 110 H360"/><path d="M120 0 V240"/><path d="M240 0 V240"/><path d="M0 40 H360"/>
      </g>
      <g fill="#CDE1D3">
        <rect x="135" y="55" width="40" height="40" rx="6"/><rect x="185" y="55" width="40" height="40" rx="6"/>
        <rect x="15" y="125" width="90" height="40" rx="6"/><rect x="255" y="125" width="40" height="30" rx="6"/>
        <rect x="135" y="125" width="90" height="30" rx="6"/>
      </g>
      <path id="route" d="M60 40 H120 V110 H240 V40 H320" fill="none" stroke="#2C2E2B" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round"/>
      <g transform="translate(60 40)"><circle r="16" fill="#778764"/><text y="1" text-anchor="middle" dominant-baseline="middle" font-size="16">🍳</text></g>
      <g transform="translate(320 40)"><circle r="16" fill="#2C2E2B"/><text y="1" text-anchor="middle" dominant-baseline="middle" font-size="16">🏠</text></g>
      <g class="track__scooter"><circle r="15" fill="#F4F8F3" stroke="#2C2E2B" stroke-width="2"/><text y="1" text-anchor="middle" dominant-baseline="middle" font-size="17">🛵</text></g>
    </svg>`;
  }

  function track(order) {
    const box = $('[data-success]');
    if (!box) return;
    const first = (order.customer.name || '').trim().split(' ')[0];
    box.classList.add('success--track');
    box.innerHTML = `
      <p class="label c-sky">Sledovanie objednávky</p>
      <h2>${C.esc(first)}, <em>už sa to chystá!</em></h2>
      <p class="track__sum">${order.items.map(i => `${i.qty}× ${C.esc(i.name)}${i.note ? ` <small>(${C.esc(i.note)})</small>` : ''}`).join(', ')} · <b>${C.money(order.total)}</b></p>
      <ol class="track__steps">${PHASES.map(p => `<li data-phase="${p.key}"><i></i>${p.label}</li>`).join('')}</ol>
      <div class="track__mapwrap">${mapSvg()}</div>
      <p class="track__status" data-status aria-live="polite"></p>
      <p class="track__eta" data-eta></p>
      <div class="track__actions">
        <button type="button" class="btn btn--sky" data-faster>Zrýchliť ⚡</button>
        <a href="index.html" class="btn btn--line">Späť na úvod</a>
      </div>
      <div class="track__rate" data-rate hidden>
        <p>Ako vám chutilo?</p>
        <div class="stars">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-star="${n}" aria-label="${n} z 5">★</button>`).join('')}</div>
      </div>`;

    const route = $('#route', box);
    const scooter = $('.track__scooter', box);
    const len = route.getTotalLength();
    const status = $('[data-status]', box);
    const eta = $('[data-eta]', box);
    const phaseEls = [...box.querySelectorAll('[data-phase]')];
    const driveFrom = PHASES[2].at;
    let speed = 1;
    let elapsed = 0;
    let last = performance.now();
    let lastJoke = -1;
    let done = false;

    function frame(now) {
      elapsed += (now - last) * speed;
      last = now;
      const t = Math.min(1, elapsed / TOTAL_MS);

      const drive = Math.max(0, (t - driveFrom) / (1 - driveFrom));
      const p = route.getPointAtLength(drive * len);
      scooter.setAttribute('transform', `translate(${p.x} ${p.y})`);

      phaseEls.forEach((el, i) => {
        const reached = t >= PHASES[i].at;
        const next = PHASES[i + 1];
        el.classList.toggle('is-done', reached && (!next || t >= next.at));
        el.classList.toggle('is-now', reached && next && t < next.at);
      });
      if (t >= 1) phaseEls[phaseEls.length - 1].classList.add('is-done');

      const j = JOKES.reduce((acc, [at], i) => (t >= at ? i : acc), 0);
      if (j !== lastJoke) {
        lastJoke = j;
        status.classList.remove('pop');
        void status.offsetWidth;
        status.textContent = JOKES[j][1];
        status.classList.add('pop');
      }
      const mins = Math.ceil((1 - t) * 40);
      eta.textContent = t < 1 ? `Doručenie približne o ${mins} min` : 'Kuriér je pri dverách!';

      if (t < 1) requestAnimationFrame(frame);
      else if (!done) finish();
    }

    function finish() {
      done = true;
      box.classList.add('is-delivered');
      $('h2', box).innerHTML = `${C.esc(first)}, <em>dobrú chuť!</em>`;
      $('[data-faster]', box).hidden = true;
      $('[data-rate]', box).hidden = false;
      foodRain(70);
    }

    $('[data-faster]', box).addEventListener('click', e => {
      speed = speed === 1 ? 8 : 25;
      e.currentTarget.textContent = speed === 8 ? 'Ešte rýchlejšie ⚡⚡' : 'Turbo! 🚀';
    });
    box.addEventListener('click', e => {
      const star = e.target.closest('[data-star]');
      if (!star) return;
      const n = +star.dataset.star;
      box.querySelectorAll('[data-star]').forEach(s => s.classList.toggle('is-on', +s.dataset.star <= n));
      C.toast(n >= 4 ? 'Ďakujeme! Kuchár sa červená ☺️' : 'Ďakujeme, nabudúce to bude lepšie 💪');
    });

    requestAnimationFrame(frame);
  }

  window.ChutkoFun = { track, foodRain, openWheel };
})();
