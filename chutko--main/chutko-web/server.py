"""Chutko — jednoduchý server pre web a administráciu menu.

Spustenie:
    pip install flask
    python server.py            (heslo do administrácie: chutko2026)

Web:            http://localhost:8000/
Správa menu:    http://localhost:8000/admin.html

Menu sa ukladá do súboru menu.json, nahraté fotky do img/uploads/.
"""

import base64
import binascii
import hmac
import json
import os
import re
import uuid

from flask import Flask, abort, jsonify, request, send_from_directory

ROOT = os.path.dirname(os.path.abspath(__file__))
MENU_FILE = os.path.join(ROOT, 'menu.json')
UPLOAD_DIR = os.path.join(ROOT, 'img', 'uploads')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'chutko2026')

CATEGORIES = {'ranajky', 'obedy', 'vecere', 'kava'}
TONES = {'', 'sage', 'sky'}
IMG_PATH = re.compile(r'^img/[\w\-/.]+$')
IMG_DATA = re.compile(r'^data:image/(jpeg|png|webp);base64,')
MAX_ITEMS = 300
MAX_IMAGE_BYTES = 5 * 1024 * 1024

# Súbory, ktoré server nesmie vydať ako statický obsah
PRIVATE = {'server.py', 'menu.json.tmp', 'Procfile', 'requirements.txt', 'railway.json', '.gitignore'}

app = Flask(__name__, static_folder=None)
app.config['MAX_CONTENT_LENGTH'] = 40 * 1024 * 1024


def authorized():
    if not ADMIN_PASSWORD:
        abort(503, 'ADMIN_PASSWORD nie je nastavené')
    given = request.headers.get('X-Admin-Password', '')
    return hmac.compare_digest(given.encode(), ADMIN_PASSWORD.encode())


def clean_item(d):
    """Rovnaké pravidlá ako clean() v data.js."""
    if not isinstance(d, dict):
        return None

    def s(key, limit):
        v = d.get(key)
        return v.strip()[:limit] if isinstance(v, str) else ''

    try:
        price = round(max(0.0, min(9999.0, float(d.get('price') or 0))), 2)
    except (TypeError, ValueError):
        price = 0.0

    img = s('img', 2_000_000)
    if img and not (IMG_PATH.match(img) and '..' not in img) and not IMG_DATA.match(img):
        img = ''

    item = {
        'id': s('id', 40) or 'd' + uuid.uuid4().hex[:10],
        'cat': d.get('cat') if d.get('cat') in CATEGORIES else 'obedy',
        'img': img,
        'name': s('name', 80),
        'desc': s('desc', 300),
        'price': price,
        'tag': s('tag', 30),
        'tone': d.get('tone') if d.get('tone') in TONES else '',
        'featured': bool(d.get('featured')),
        'soldOut': bool(d.get('soldOut')),
        'ingredients': [],
        'extras': [],
    }

    seen = set()
    ingredients = d.get('ingredients')
    for v in ingredients if isinstance(ingredients, list) else []:
        t = v.strip()[:40] if isinstance(v, str) else ''
        if t and t.lower() not in seen and len(item['ingredients']) < 20:
            seen.add(t.lower())
            item['ingredients'].append(t)

    seen = set()
    extras = d.get('extras')
    for x in extras if isinstance(extras, list) else []:
        if not isinstance(x, dict) or len(item['extras']) >= 15:
            continue
        name = x.get('name').strip()[:40] if isinstance(x.get('name'), str) else ''
        if not name or name.lower() in seen:
            continue
        try:
            price = round(max(0.0, min(99.0, float(x.get('price') or 0))), 2)
        except (TypeError, ValueError):
            price = 0.0
        seen.add(name.lower())
        item['extras'].append({'name': name, 'price': price})

    return item if item['name'] else None


@app.get('/api/menu')
def get_menu():
    if not os.path.exists(MENU_FILE):
        # Klient použije predvolené menu z data.js
        return jsonify({'items': None})
    with open(MENU_FILE, encoding='utf-8') as f:
        return jsonify(json.load(f))


@app.put('/api/menu')
def put_menu():
    if not authorized():
        abort(401)
    data = request.get_json(silent=True) or {}
    raw = data.get('items')
    if not isinstance(raw, list) or len(raw) > MAX_ITEMS:
        abort(400, 'Neplatné dáta')
    items = [i for i in (clean_item(x) for x in raw) if i]

    tmp = MENU_FILE + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump({'items': items}, f, ensure_ascii=False, indent=2)
    os.replace(tmp, MENU_FILE)
    return jsonify({'ok': True, 'count': len(items)})


@app.post('/api/login')
def login():
    if not authorized():
        abort(401)
    return jsonify({'ok': True})


@app.post('/api/upload')
def upload():
    if not authorized():
        abort(401)
    data = request.get_json(silent=True) or {}
    image = data.get('image', '')
    m = IMG_DATA.match(image) if isinstance(image, str) else None
    if not m:
        abort(400, 'Neplatný obrázok')
    try:
        raw = base64.b64decode(image[m.end():], validate=True)
    except (binascii.Error, ValueError):
        abort(400, 'Neplatný obrázok')
    if len(raw) > MAX_IMAGE_BYTES:
        abort(413)

    ext = {'jpeg': 'jpg', 'png': 'png', 'webp': 'webp'}[m.group(1)]
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    name = f'{uuid.uuid4().hex}.{ext}'
    with open(os.path.join(UPLOAD_DIR, name), 'wb') as f:
        f.write(raw)
    return jsonify({'path': f'img/uploads/{name}'})


@app.get('/')
@app.get('/<path:path>')
def static_files(path='index.html'):
    if (os.path.basename(path) in PRIVATE or path.startswith('.')
            or path.endswith('.py') or '__pycache__' in path):
        abort(404)
    return send_from_directory(ROOT, path)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8000)))
