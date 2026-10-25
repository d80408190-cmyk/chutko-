/* ==========================================================
   Chutko — dáta menu
   Predvolené menu + načítanie/uloženie zmien z administrácie.

   Poradie zdrojov:
   1. server (server.py → /api/menu), ak beží,
   2. úprava uložená v tomto prehliadači (bez servera),
   3. súbor menu.json (export z administrácie nahratý na web),
   4. predvolené menu nižšie.
   ========================================================== */
(function () {
  'use strict';

  const CATEGORIES = {
    ranajky: 'Raňajky',
    obedy: 'Obedy',
    vecere: 'Večere',
    kava: 'Káva a dezerty'
  };

  const TONES = { '': 'Svetlá', sage: 'Zelená', sky: 'Modrá' };

  const DEFAULT_MENU = [
    { id: 'r1', cat: 'ranajky', img: 'img/toast.jpg',       name: 'Toast s volským okom', desc: 'Kváskový chlieb, maslo, farmárske vajce, pažítka a čerstvé klíčky.', price: 6.9, tag: 'Obľúbené', featured: true },
    { id: 'r2', cat: 'ranajky', img: 'img/lievance.jpg',    name: 'Nadýchané lievance', desc: 'Javorový sirup, lesné ovocie, mäta a šľahaný tvaroh.', price: 7.5 },
    { id: 'r3', cat: 'ranajky', img: 'img/avokado.jpg',     name: 'Avokádový toast', desc: 'Avokádo, vajce na tvrdo, špenát, chilli vločky a citrón.', price: 8.2, tag: 'Vegetariánske', tone: 'sage' },
    { id: 'r4', cat: 'ranajky', img: 'img/jogurt.jpg',      name: 'Jogurt s jahodami', desc: 'Grécky jogurt, domáca granola, jahody a med od včelára.', price: 5.4 },

    { id: 'o1', cat: 'obedy',   img: 'img/losos-bowl.jpg',  name: 'Bowl s lososom', desc: 'Pečený losos, ryža, edamame, uhorka, červená kapusta, sezam.', price: 12.9, tag: 'Obľúbené', featured: true },
    { id: 'o2', cat: 'obedy',   img: 'img/buddha-bowl.jpg', name: 'Buddha bowl', desc: 'Cícer, avokádo, pečené batáty, quinoa a tahini dresing.', price: 10.5, tag: 'Vegánske', tone: 'sage' },
    { id: 'o3', cat: 'obedy',   img: 'img/salat.jpg',       name: 'Šalát s fetou', desc: 'Mix listov, feta, červená cibuľa, mrkva a bylinkový dresing.', price: 9.4, tag: 'Vegetariánske', tone: 'sage' },
    { id: 'o4', cat: 'obedy',   img: 'img/grain-bowl.jpg',  name: 'Kurací grain bowl', desc: 'Grilované kuracie, bulgur, fazuľka, cherry paradajky, pesto.', price: 11.2 },
    { id: 'o5', cat: 'obedy',   img: 'img/farfalle.jpg',    name: 'Cestovinový šalát', desc: 'Farfalle, bazalkové pesto, sušené paradajky, rukola.', price: 8.9 },

    { id: 'v1', cat: 'vecere',  img: 'img/steak.jpg',       name: 'Hovädzí steak', desc: 'Flank steak z lokálnej farmy, hranolky s rozmarínom, chimichurri.', price: 21.9, tag: 'Šéfkuchár odporúča', tone: 'sky', featured: true },
    { id: 'v2', cat: 'vecere',  img: 'img/losos.jpg',       name: 'Losos na masle', desc: 'Pečený losos, zeleninový tartar, citrónové maslo.', price: 18.4 },
    { id: 'v3', cat: 'vecere',  img: 'img/penne.jpg',       name: 'Penne arrabbiata', desc: 'Pikantná paradajková omáčka, cesnak, petržlen, parmezán.', price: 11.9, tag: 'Vegetariánske', tone: 'sage' },
    { id: 'v4', cat: 'vecere',  img: 'img/curry.jpg',       name: 'Krevetové curry', desc: 'Kokosové curry, tigrie krevety, jazmínová ryža, koriander.', price: 16.5, featured: true },
    { id: 'v5', cat: 'vecere',  img: 'img/gril.jpg',        name: 'Grilovací tanier pre dvoch', desc: 'Kuracie, bravčové a hovädzie, pečené zemiaky, domáce omáčky.', price: 29.9, tag: 'Pre 2 osoby', tone: 'sky' },

    { id: 'k1', cat: 'kava',    img: 'img/cappuccino.jpg',  name: 'Cappuccino', desc: 'Výberová káva z lokálnej pražiarne, kravské alebo ovsené mlieko.', price: 3.4 },
    { id: 'k2', cat: 'kava',    img: 'img/flat-white.jpg',  name: 'Flat white', desc: 'Dvojité espresso so zamatovým mliekom.', price: 3.8 },
    { id: 'k3', cat: 'kava',    img: 'img/torta.jpg',       name: 'Malinová torta', desc: 'Ľahký piškót, mascarpone krém a čerstvé maliny.', price: 5.9, tag: 'Domáce', tone: 'sky', featured: true },
    { id: 'k4', cat: 'kava',    img: 'img/zmrzlina.jpg',    name: 'Domáca zmrzlina', desc: 'Jahodová zmrzlina z kravského mlieka v chrumkavom kornútiku.', price: 3.2 }
  ];

  // Zloženie (suroviny sa dajú odobrať) a prílohy navyše (za príplatok)
  const COMPOSITION = {
    r1: [['kváskový chlieb', 'maslo', 'volské oko', 'pažítka', 'klíčky'], [['Slanina', 1.2], ['Avokádo', 1.5], ['Syr čedar', 0.9]]],
    r2: [['javorový sirup', 'lesné ovocie', 'mäta', 'šľahaný tvaroh'], [['Nutella', 1], ['Banán', 0.8], ['Extra sirup', 0.5]]],
    r3: [['kváskový chlieb', 'avokádo', 'vajce', 'špenát', 'chilli vločky', 'citrón'], [['Údený losos', 2.5], ['Feta', 1], ['Pošírované vajce', 1.2]]],
    r4: [['grécky jogurt', 'granola', 'jahody', 'med'], [['Arašidové maslo', 0.8], ['Čučoriedky', 1]]],
    o1: [['losos', 'ryža', 'edamame', 'uhorka', 'červená kapusta', 'sezam'], [['Avokádo', 1.5], ['Extra losos', 3.5], ['Sriracha', 0.3]]],
    o2: [['cícer', 'avokádo', 'pečené batáty', 'quinoa', 'tahini dresing'], [['Tofu', 1.8], ['Hummus', 1]]],
    o3: [['mix listov', 'feta', 'červená cibuľa', 'mrkva', 'bylinkový dresing'], [['Grilované kuracie', 2.5], ['Krutóny', 0.6], ['Olivy', 0.8]]],
    o4: [['grilované kuracie', 'bulgur', 'fazuľka', 'cherry paradajky', 'pesto'], [['Feta', 1], ['Vajce', 0.8]]],
    o5: [['farfalle', 'bazalkové pesto', 'sušené paradajky', 'rukola'], [['Mozzarella', 1.2], ['Kuracie', 2.5]]],
    v1: [['flank steak', 'hranolky', 'rozmarín', 'chimichurri'], [['Pečená zelenina', 2], ['Volské oko', 1], ['Korenistá omáčka', 1]]],
    v2: [['losos', 'zeleninový tartar', 'citrónové maslo'], [['Zemiakové pyré', 2], ['Grilovaná špargľa', 2.5]]],
    v3: [['penne', 'paradajková omáčka', 'cesnak', 'chilli', 'petržlen', 'parmezán'], [['Extra parmezán', 0.8], ['Kuracie', 2.5], ['Burrata', 3.5]]],
    v4: [['krevety', 'kokosové curry', 'jazmínová ryža', 'koriander', 'chilli'], [['Extra krevety', 3.5], ['Naan chlieb', 1.5]]],
    v5: [['kuracie', 'bravčové', 'hovädzie', 'pečené zemiaky', 'domáce omáčky'], [['Grilovaná zelenina', 3], ['Šalát', 2.5]]],
    k1: [['espresso', 'kravské mlieko'], [['Ovsené mlieko', 0.4], ['Extra shot', 0.8], ['Karamelový sirup', 0.5]]],
    k2: [['dvojité espresso', 'kravské mlieko'], [['Ovsené mlieko', 0.4], ['Vanilkový sirup', 0.5]]],
    k3: [['piškót', 'mascarpone krém', 'maliny'], [['Kopček zmrzliny', 1.5], ['Šľahačka', 0.5]]],
    k4: [['jahodová zmrzlina', 'kornútik'], [['Čokoládová poleva', 0.6], ['Posýpka', 0.3], ['Druhý kopček', 1.5]]]
  };
  DEFAULT_MENU.forEach(d => {
    const c = COMPOSITION[d.id];
    if (!c) return;
    d.ingredients = c[0];
    d.extras = c[1].map(([name, price]) => ({ name, price }));
  });

  const LOCAL_KEY = 'chutko-menu';
  const PASS_KEY = 'chutko-admin-pass';
  const API = 'api/menu';

  /** Vyčistí a overí jedno jedlo (rovnaké pravidlá ako server.py). */
  function clean(d) {
    if (!d || typeof d !== 'object') return null;
    const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
    const item = {
      id: str(d.id, 40) || 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      cat: CATEGORIES[d.cat] ? d.cat : 'obedy',
      img: str(d.img, 2000000),
      name: str(d.name, 80),
      desc: str(d.desc, 300),
      price: Math.round(Math.max(0, Math.min(9999, Number(d.price) || 0)) * 100) / 100,
      tag: str(d.tag, 30),
      tone: TONES[d.tone] !== undefined ? d.tone : '',
      featured: !!d.featured,
      soldOut: !!d.soldOut,
      ingredients: [],
      extras: []
    };
    // zloženie: zoznam surovín (bez duplicít)
    if (Array.isArray(d.ingredients)) {
      const seen = new Set();
      d.ingredients.forEach(v => {
        const t = str(v, 40);
        if (t && !seen.has(t.toLowerCase()) && item.ingredients.length < 20) { seen.add(t.toLowerCase()); item.ingredients.push(t); }
      });
    }
    // prílohy navyše: { name, price }
    if (Array.isArray(d.extras)) {
      const seen = new Set();
      d.extras.forEach(x => {
        const name = x && str(x.name, 40);
        if (!name || seen.has(name.toLowerCase()) || item.extras.length >= 15) return;
        seen.add(name.toLowerCase());
        item.extras.push({ name, price: Math.round(Math.max(0, Math.min(99, Number(x.price) || 0)) * 100) / 100 });
      });
    }
    // obrázok: len relatívna cesta v img/ alebo data URL obrázka
    if (item.img && !/^img\/[\w\-/.]+$/.test(item.img) && !/^data:image\/(jpeg|png|webp);base64,/.test(item.img)) item.img = '';
    return item.name ? item : null;
  }
  const cleanAll = list => (Array.isArray(list) ? list.map(clean).filter(Boolean) : []);

  function readLocal() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? cleanAll(JSON.parse(raw)) : null;
    } catch (e) { return null; }
  }

  let mode = 'default'; // 'server' | 'local' | 'default'

  /** Načíta menu. Vráti { items, mode }. */
  async function load() {
    try {
      const res = await fetch(API, { cache: 'no-store', headers: { Accept: 'application/json' } });
      const type = res.headers.get('content-type') || '';
      if (res.ok && type.includes('application/json')) {
        const data = await res.json();
        mode = 'server';
        return { items: Array.isArray(data.items) ? cleanAll(data.items) : cleanAll(DEFAULT_MENU), mode };
      }
    } catch (e) { /* server nebeží (napr. file:// alebo statický hosting) */ }

    const local = readLocal();
    if (local) {
      mode = 'local';
      return { items: local, mode };
    }

    mode = 'default';
    try {
      const res = await fetch('menu.json', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const list = cleanAll(Array.isArray(data) ? data : data.items);
        if (list.length) return { items: list, mode };
      }
    } catch (e) { /* menu.json neexistuje */ }

    return { items: cleanAll(DEFAULT_MENU), mode };
  }

  function getPassword() {
    try { return sessionStorage.getItem(PASS_KEY) || ''; } catch (e) { return ''; }
  }
  function setPassword(p) {
    try { sessionStorage.setItem(PASS_KEY, p); } catch (e) { /* nič */ }
  }

  /** Uloží menu. Na serveri vyžaduje heslo (vyhodí chybu 'auth'). */
  async function save(items) {
    const list = cleanAll(items);
    if (mode === 'server') {
      const res = await fetch(API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': getPassword() },
        body: JSON.stringify({ items: list })
      });
      if (res.status === 401) throw new Error('auth');
      if (!res.ok) throw new Error('server');
      return list;
    }
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
    } catch (e) {
      throw new Error('quota');
    }
    mode = 'local';
    return list;
  }

  /** Nahrá fotku: na serveri ako súbor, inak ako zmenšený data URL. */
  async function uploadImage(file) {
    const dataUrl = await resize(file, 960, 720);
    if (mode !== 'server') return dataUrl;
    const res = await fetch('api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Password': getPassword() },
      body: JSON.stringify({ image: dataUrl })
    });
    if (res.status === 401) throw new Error('auth');
    if (!res.ok) throw new Error('server');
    return (await res.json()).path;
  }

  /** Oreže a zmenší obrázok na pomer 4:3 (JPEG). */
  function resize(file, w, h) {
    return new Promise((resolve, reject) => {
      if (!/^image\//.test(file.type)) return reject(new Error('type'));
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.max(w / img.width, h / img.height);
        const sw = w / scale, sh = h / scale;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('type')); };
      img.src = url;
    });
  }

  function resetLocal() {
    try { localStorage.removeItem(LOCAL_KEY); } catch (e) { /* nič */ }
  }

  window.ChutkoData = {
    CATEGORIES,
    TONES,
    DEFAULT_MENU,
    clean,
    cleanAll,
    load,
    save,
    uploadImage,
    resetLocal,
    getPassword,
    setPassword,
    get mode() { return mode; }
  };
})();
