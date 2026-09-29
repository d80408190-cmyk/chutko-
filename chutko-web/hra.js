/* ==========================================================
   Chutko — mini hra „Chyť si obed“
   Chytaj jedlo do taniera, vyhýbaj sa ponožkám a kameňom.
   20 bodov = promo kód CHUTKO10.
   ========================================================== */
(function () {
  'use strict';

  const canvas = document.querySelector('[data-game]');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const $ = sel => document.querySelector(sel);

  const WIN_SCORE = 20;
  const CODE = 'CHUTKO10';
  const BEST_KEY = 'chutko-best';
  const GOOD = ['🍕', '🍔', '🥗', '🍣', '🥐', '🍩', '🍓', '🥑', '🌮', '🍜', '🧁', '🥞'];
  const BAD = ['🧦', '🪨', '🥾'];

  const scoreEl = $('[data-score]');
  const livesEl = $('[data-lives]');
  const bestEl = $('[data-best]');
  const overlay = $('[data-overlay]');

  let W = 0, H = 0, dpr = 1;
  let plate = { x: 0, w: 90 };
  let targetX = 0;
  let items = [];
  let pops = [];
  let score = 0, lives = 3, level = 1;
  let running = false;
  let won = false;
  let last = 0, spawnIn = 0;

  const best = () => { try { return +localStorage.getItem(BEST_KEY) || 0; } catch (e) { return 0; } };
  const setBest = v => { try { localStorage.setItem(BEST_KEY, v); } catch (e) { /* nič */ } };
  bestEl.textContent = best();

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    plate.w = Math.max(80, Math.min(120, W * .22));
    if (!plate.x) plate.x = targetX = W / 2;
    draw();
  }
  window.addEventListener('resize', resize);

  /* ---------- Ovládanie ---------- */
  function pointer(e) {
    const r = canvas.getBoundingClientRect();
    targetX = Math.max(plate.w / 2, Math.min(W - plate.w / 2, e.clientX - r.left));
  }
  canvas.addEventListener('pointerdown', e => { pointer(e); canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', pointer);
  const keys = {};
  document.addEventListener('keydown', e => {
    if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) { keys[e.key] = true; e.preventDefault(); }
    if ((e.key === ' ' || e.key === 'Enter') && !running && !overlay.hidden && document.activeElement === document.body) start();
  });
  document.addEventListener('keyup', e => { keys[e.key] = false; });

  /* ---------- Hra ---------- */
  function start() {
    items = []; pops = [];
    score = 0; lives = 3; level = 1; won = false;
    spawnIn = 0;
    plate.x = targetX = W / 2;
    overlay.hidden = true;
    running = true;
    hud();
    document.querySelector('.game-hud').scrollIntoView({ behavior: 'smooth', block: 'start' });
    last = performance.now();
    requestAnimationFrame(loop);
  }

  function hud() {
    scoreEl.textContent = score;
    livesEl.textContent = '❤️'.repeat(lives) + '🤍'.repeat(Math.max(0, 3 - lives));
  }

  function spawn() {
    const bad = Math.random() < Math.min(.35, .16 + level * .03);
    const star = !bad && Math.random() < .06;
    items.push({
      x: 24 + Math.random() * (W - 48),
      y: -30,
      vy: 120 + level * 22 + Math.random() * 60,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - .5) * 3,
      e: star ? '⭐' : bad ? BAD[Math.floor(Math.random() * BAD.length)] : GOOD[Math.floor(Math.random() * GOOD.length)],
      kind: star ? 'star' : bad ? 'bad' : 'good'
    });
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;

    if (keys.ArrowLeft || keys.a) targetX -= 520 * dt;
    if (keys.ArrowRight || keys.d) targetX += 520 * dt;
    targetX = Math.max(plate.w / 2, Math.min(W - plate.w / 2, targetX));
    plate.x += (targetX - plate.x) * Math.min(1, dt * 18);

    spawnIn -= dt;
    if (spawnIn <= 0) { spawn(); spawnIn = Math.max(.32, .9 - level * .06); }

    const plateY = H - 34;
    items.forEach(it => {
      it.y += it.vy * dt;
      it.rot += it.vr * dt;
      if (!it.hit && it.y > plateY - 22 && it.y < plateY + 10 && Math.abs(it.x - plate.x) < plate.w / 2 + 6) {
        it.hit = true;
        if (it.kind === 'bad') { lives--; pops.push({ x: it.x, y: plateY - 30, t: 0, txt: 'Fuj! 🤢', bad: true }); shake = .3; }
        else {
          const pts = it.kind === 'star' ? 3 : 1;
          score += pts;
          pops.push({ x: it.x, y: plateY - 30, t: 0, txt: '+' + pts });
        }
        level = 1 + Math.floor(score / 5);
        hud();
      }
    });
    items = items.filter(it => !it.hit && it.y < H + 40);
    pops.forEach(p => { p.t += dt; });
    pops = pops.filter(p => p.t < .8);
    if (shake > 0) shake -= dt;

    if (!won && score >= WIN_SCORE) { won = true; win(); }
    if (lives <= 0) { gameOver(); return; }

    draw();
    requestAnimationFrame(loop);
  }

  let shake = 0;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - .5) * 8, 0);

    // pozadie – obrus
    ctx.fillStyle = '#e7f0e9';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(142,175,147,.18)';
    for (let x = 0; x < W; x += 40) for (let y = 0; y < H; y += 40) if (((x + y) / 40) % 2 === 0) ctx.fillRect(x, y, 40, 40);

    // padajúce jedlo
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000'; // plná farba, inak sú emoji priesvitné
    items.forEach(it => {
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(it.rot);
      ctx.font = `${it.kind === 'star' ? 34 : 36}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      ctx.fillText(it.e, 0, 0);
      ctx.restore();
    });

    // tanier
    const py = H - 34;
    ctx.fillStyle = 'rgba(44,46,43,.15)';
    ctx.beginPath(); ctx.ellipse(plate.x, py + 12, plate.w / 2, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(plate.x, py, plate.w / 2, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#778764'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = '#CDE1D3'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(plate.x, py, plate.w / 2 - 12, 8, 0, 0, Math.PI * 2); ctx.stroke();

    // body
    pops.forEach(p => {
      ctx.globalAlpha = 1 - p.t / .8;
      ctx.font = '700 20px Inter, system-ui, sans-serif';
      ctx.fillStyle = p.bad ? '#a94a3f' : '#2C2E2B';
      ctx.fillText(p.txt, p.x, p.y - p.t * 40);
      ctx.globalAlpha = 1;
    });
    ctx.restore();
  }

  function showOverlay(html) {
    overlay.innerHTML = html;
    overlay.hidden = false;
    const btn = overlay.querySelector('[data-start]');
    if (btn) btn.addEventListener('click', start);
    const keep = overlay.querySelector('[data-keep]');
    if (keep) keep.addEventListener('click', () => { overlay.hidden = true; running = true; last = performance.now(); requestAnimationFrame(loop); });
    const use = overlay.querySelector('[data-use]');
    if (use) use.addEventListener('click', () => {
      window.Chutko && window.Chutko.applyPromo(CODE);
      window.Chutko && window.Chutko.toast('Kód CHUTKO10 je v košíku 🎁');
    });
  }

  function win() {
    running = false;
    if (window.ChutkoFun) window.ChutkoFun.foodRain(70);
    showOverlay(`
      <div class="game-over__emoji">🏆</div>
      <h2 class="display">Vyhral si <em>zľavu!</em></h2>
      <p>Tvoj kód na −10 % z objednávky:</p>
      <div class="game-code">${CODE}</div>
      <div class="game-over__actions">
        <a href="menu.html" class="btn btn--sky" data-use>Uplatniť a objednať</a>
        <button type="button" class="btn btn--line" data-keep>Hrať ďalej</button>
      </div>`);
  }

  function gameOver() {
    running = false;
    draw();
    const isBest = score > best();
    if (isBest) { setBest(score); bestEl.textContent = score; }
    showOverlay(`
      <div class="game-over__emoji">${won ? '😎' : '🥲'}</div>
      <h2 class="display">${won ? 'Majster <em>tanierov!</em>' : 'Ups, <em>ponožka!</em>'}</h2>
      <p>Skóre: <b>${score}</b>${isBest ? ' — nový rekord! 🎉' : ''}</p>
      ${won ? `<p>Kód <b>${CODE}</b> ti zostáva.</p>` : `<p>Na zľavu potrebuješ ${WIN_SCORE} bodov. Skús to znova!</p>`}
      <div class="game-over__actions">
        <button type="button" class="btn btn--ink" data-start>Hrať znova</button>
        ${won ? '<a href="menu.html" class="btn btn--sky" data-use>Uplatniť kód</a>' : ''}
      </div>`);
  }

  overlay.querySelector('[data-start]').addEventListener('click', start);
  resize();
})();
