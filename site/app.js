import { filterFonts, fontStyle, fontUrl, cssSnippet } from './lib.js';
const $ = id => document.getElementById(id);
const storage = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } },
};
const storedFavorites = storage.get('font-explorer-favorites', []);
const state = { fonts: [], favorites: Array.isArray(storedFavorites) ? storedFavorites.filter(value => typeof value === 'string') : [], savedOnly: false, italic: false, page: 1 };
const pageSize = 12;
const loaded = new Map();
let observer;
let toastTimer;
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 3500); }
function setTheme(dark) { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; $('theme').setAttribute('aria-pressed', String(dark)); $('theme').textContent = dark ? 'Light mode' : 'Dark mode'; }
const savedTheme = storage.get('font-explorer-theme', null);
setTheme(savedTheme === 'dark' || (savedTheme === null && matchMedia('(prefers-color-scheme: dark)').matches));
$('theme').addEventListener('click', () => { const dark = document.documentElement.dataset.theme !== 'dark'; setTheme(dark); storage.set('font-explorer-theme', dark ? 'dark' : 'light'); });

function loadFont(font, style) {
  const url = fontUrl(font, style);
  if (!loaded.has(url)) {
    const promise = new Promise((resolve, reject) => {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = url;
      const timer = setTimeout(() => { link.remove(); reject(new Error('Font loading timed out')); }, 15000);
      link.onload = async () => {
        try {
          const faces = await document.fonts.load(`${style.italic ? 'italic ' : ''}${style.weight} 20px ${JSON.stringify(font.family)}`, 'Aaঅ');
          if (!faces.length) throw new Error('No font faces returned');
          clearTimeout(timer); resolve();
        } catch (error) { clearTimeout(timer); link.remove(); reject(error); }
      };
      link.onerror = () => { clearTimeout(timer); link.remove(); reject(new Error('Font unavailable')); };
      document.head.append(link);
    });
    loaded.set(url, promise);
    promise.catch(() => loaded.delete(url));
  }
  return loaded.get(url);
}

function previewText() { return $('preview').value || ($('subset').value === 'bengali' ? 'আমার সোনার বাংলা, আমি তোমায় ভালোবাসি।' : 'The quick brown fox jumps over the lazy dog.'); }
function make(tag, className, text) { const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el; }
function updateSavedCount() { $('saved-count').textContent = state.favorites.length; }
function showCode(font, style) { $('code-title').textContent = font.family; $('code').value = cssSnippet(font, style); $('code-dialog').showModal(); }

function render() {
  observer?.disconnect();
  const matches = filterFonts(state.fonts, { search: $('search').value, category: $('category').value, subset: $('subset').value, savedOnly: state.savedOnly, favorites: state.favorites });
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * pageSize;
  $('results-count').textContent = `${matches.length.toLocaleString()} fonts${matches.length ? ` · Showing ${start + 1}–${Math.min(start + pageSize, matches.length)}` : ''}`;
  $('page-label').textContent = `Page ${state.page} of ${pages}`;
  $('previous').disabled = state.page === 1; $('next').disabled = state.page === pages;
  $('empty').hidden = matches.length !== 0;
  $('empty-message').textContent = state.savedOnly && !state.favorites.length ? 'Save fonts with the star button to build your collection on this browser.' : 'Try a different search or reset your filters.';
  $('bengali').setAttribute('aria-pressed', String($('subset').value === 'bengali'));
  $('all-fonts').setAttribute('aria-pressed', String(!state.savedOnly)); $('saved-fonts').setAttribute('aria-pressed', String(state.savedOnly));
  updateSavedCount();
  const grid = $('font-grid'); grid.replaceChildren();
  observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { observer.unobserve(entry.target); entry.target.loadPreview(); }
  }, { rootMargin: '100px' });
  for (const font of matches.slice(start, start + pageSize)) {
    const style = fontStyle(font, Number($('weight').value), state.italic);
    const card = make('article', 'font-card'); const top = make('div', 'card-top'); const title = make('div');
    title.append(make('h2', '', font.family), make('div', 'card-meta', `${font.categories.join(' / ')} · ${font.variants.length} styles`));
    const save = make('button', 'save-button');
    function syncSave() { const saved = state.favorites.includes(font.slug); save.textContent = saved ? '★' : '☆'; save.setAttribute('aria-label', `${saved ? 'Unsave' : 'Save'} ${font.family}`); save.setAttribute('aria-pressed', String(saved)); }
    syncSave();
    save.addEventListener('click', () => {
      const index = state.favorites.indexOf(font.slug);
      if (index >= 0) state.favorites.splice(index, 1); else state.favorites.push(font.slug);
      if (!storage.set('font-explorer-favorites', state.favorites)) toast('Saved for this visit. Browser storage is unavailable.');
      syncSave(); updateSavedCount(); if (state.savedOnly) { render(); $('saved-fonts').focus(); }
    });
    top.append(title, save);
    const preview = make('p', 'font-preview', previewText()); preview.dir = 'auto'; preview.style.fontWeight = style.weight; preview.style.fontStyle = style.italic ? 'italic' : 'normal';
    const bottom = make('div', 'card-bottom'); const status = make('span', 'font-status', 'Preview loads on scroll'); const codeButton = make('button', 'css-button', 'Get CSS ↗');
    codeButton.setAttribute('aria-label', `Get CSS for ${font.family}`); codeButton.addEventListener('click', () => showCode(font, style)); bottom.append(status, codeButton);
    card.append(top, preview, bottom); grid.append(card);
    card.loadPreview = async () => {
      status.textContent = 'Loading preview…';
      try { await loadFont(font, style); preview.style.fontFamily = `${JSON.stringify(font.family)}, sans-serif`; status.textContent = `${style.weight} · ${style.italic ? 'Italic' : 'Normal'}${font.subsets.includes('bengali') ? ' · বাংলা' : ''}`; }
      catch { status.textContent = 'Font unavailable · fallback shown'; }
    };
    observer.observe(card);
  }
}

function reset() { $('search').value = ''; $('category').value = ''; $('subset').value = ''; $('preview').value = ''; $('weight').value = '400'; $('size').value = '40'; $('size-output').value = '40px'; document.documentElement.style.setProperty('--preview-size', '40px'); state.savedOnly = false; state.italic = false; state.page = 1; $('italic').setAttribute('aria-pressed', 'false'); render(); }
for (const id of ['search', 'category', 'subset', 'weight']) $(id).addEventListener(id === 'search' ? 'input' : 'change', () => { state.page = 1; render(); });
$('preview').addEventListener('input', () => document.querySelectorAll('.font-preview').forEach(el => el.textContent = previewText()));
$('size').addEventListener('input', () => { const size = `${$('size').value}px`; $('size-output').value = size; document.documentElement.style.setProperty('--preview-size', size); });
$('italic').addEventListener('click', () => { state.italic = !state.italic; $('italic').setAttribute('aria-pressed', String(state.italic)); render(); });
$('bengali').addEventListener('click', () => { $('subset').value = $('subset').value === 'bengali' ? '' : 'bengali'; state.page = 1; render(); });
for (const [id, savedOnly] of [['all-fonts', false], ['saved-fonts', true]]) $(id).addEventListener('click', () => { state.savedOnly = savedOnly; state.page = 1; render(); });
for (const [id, change] of [['previous', -1], ['next', 1]]) $(id).addEventListener('click', () => { state.page += change; render(); $('explorer').scrollIntoView(); });
for (const id of ['reset', 'empty-reset']) $(id).addEventListener('click', reset);
$('copy-code').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('code').value); toast('CSS copied. Make something beautiful.'); } catch { $('code').focus(); $('code').select(); toast('Code selected. Press Ctrl+C or use your copy menu.'); } });
$('code-dialog').addEventListener('click', event => { if (event.target === $('code-dialog')) { const rect = $('code-dialog').getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('code-dialog').close(); } });

async function init() {
  $('load-error').hidden = true; $('font-grid').setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('./catalog.json'); if (!response.ok) throw new Error('Catalog unavailable');
    const catalog = await response.json(); if (!Array.isArray(catalog.fonts) || !catalog.fonts.length) throw new Error('Catalog empty');
    state.fonts = catalog.fonts; state.favorites = state.favorites.filter(slug => state.fonts.some(font => font.slug === slug));
    for (const [id, key] of [['category', 'categories'], ['subset', 'subsets']]) {
      $(id).replaceChildren(new Option(id === 'category' ? 'All categories' : 'All scripts', ''));
      for (const value of [...new Set(state.fonts.flatMap(font => font[key]))].sort()) $(id).add(new Option(value === 'bengali' ? 'Bengali · বাংলা' : value.replaceAll('-', ' '), value));
    }
    $('total').textContent = state.fonts.length.toLocaleString();
    const date = new Date(catalog.last_updated);
    $('updated').textContent = `Catalog updated ${Number.isNaN(date.getTime()) ? 'date unavailable' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`;
    render();
  } catch { $('load-error').hidden = false; $('empty').hidden = true; $('results-count').textContent = 'Collection unavailable'; $('updated').textContent = 'Unable to load catalog'; }
  finally { $('font-grid').setAttribute('aria-busy', 'false'); }
}
$('retry').addEventListener('click', init);
init();
