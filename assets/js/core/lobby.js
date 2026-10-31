// Tela de espera (games/espera/): uma cena animada do tema escolhido, uma
// mensagem que se escreve direto na tela e os convidados como personagens.
// A cena vem de assets/js/lobby-themes/; aqui ficam mensagem, menu, ponteiro,
// som e a lista de pessoas (jogadores cadastrados nos jogos + convidados).

import { storage } from './storage.js';
import { mountMenuDrawer } from './shell.js';
import { $, esc } from './dom.js';
import { THEMES, themeById } from '../lobby-themes/index.js';

const MESSAGE_KEY = 'espera:message';
const GUESTS_KEY = 'espera:guests';
const THEME_KEY = 'espera:theme';
const SOUND_KEY = 'espera:sound';
const DEFAULT_MESSAGE = 'Parabéns Karem';
const MAX_MESSAGE = 120;
const GUEST_COLOR = '#ff8a00';

const stage = $('#stage');
const message = $('#message');
const menu = $('#menu-dialog');
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// Último ponto tocado ou apontado; os temas leem a cada quadro.
const pointer = { x: window.innerWidth / 2, y: window.innerHeight * 0.6, at: 0 };

let themeId = null;
let scene = null;
let mounting = 0;
let light = false;
let soundOn = true;
let players = []; // dos jogos (chave `players`, a mesma do shell.js)
let guests = []; // digitados aqui

// ---------- pessoas ----------

function people() {
  const seen = new Set();
  return [...players, ...guests.map((name) => ({ name, color: GUEST_COLOR }))].filter((p) => {
    const k = p.name.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function loadPlayers() {
  const saved = await storage.load('players');
  players = (saved?.players ?? []).map((p) => ({ name: p.name, color: saved.teams?.[p.team]?.color ?? GUEST_COLOR }));
}

function renderGuests() {
  $('#guest-count').textContent = guests.length ? `${guests.length}` : '';
  $('#guest-list').innerHTML = guests
    .map((name, i) => `<li class="guest">${esc(name)}<button type="button" class="icon-btn" data-remove="${i}" aria-label="Remover ${esc(name)}">×</button></li>`)
    .join('');
  $('#hint').hidden = people().length > 0;
}

function setGuests(next) {
  guests = next;
  storage.save(GUESTS_KEY, guests);
  renderGuests();
  mountTheme(themeId);
}

function addGuest() {
  const input = $('#guest-name');
  const name = input.value.trim().replace(/\s+/g, ' ');
  if (!name) return;
  input.value = '';
  input.focus();
  if (people().some((p) => p.name.toLowerCase() === name.toLowerCase())) return;
  setGuests([...guests, name]);
}

// ---------- tema ----------

function loadCss(href) {
  const link = $('#theme-css');
  if (link.href === href) return Promise.resolve();
  return new Promise((resolve) => {
    link.onload = link.onerror = resolve;
    link.href = href;
  });
}

async function mountTheme(id) {
  const ticket = ++mounting;
  const entry = themeById(id);
  const theme = (await entry.load()).default;
  await loadCss(theme.css);
  if (ticket !== mounting) return;
  themeId = entry.id;
  scene?.destroy();
  stage.replaceChildren();
  document.body.dataset.theme = entry.id;
  scene = theme.mount(stage, {
    people: people(),
    light,
    pointer,
    reducedMotion,
    setLight,
    sfx: (play) => soundOn && play(),
  });
}

function setLight(on) {
  light = on;
  scene?.setLight(on);
  $('#light-label').textContent = on ? 'Apagar a luz' : 'Acender a luz';
}

// ---------- mensagem ----------

let saveTimer = 0;

function saveMessage() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => storage.save(MESSAGE_KEY, message.innerText.trim()), 300);
}

function editMessage() {
  message.focus();
  const range = document.createRange();
  range.selectNodeContents(message);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

try {
  message.contentEditable = 'plaintext-only';
} catch {
  message.contentEditable = 'true'; // navegadores sem plaintext-only
}

message.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    message.blur();
  }
});

message.addEventListener('paste', (e) => {
  e.preventDefault();
  document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
});

message.addEventListener('input', () => {
  const text = message.innerText;
  if (!text.trim()) message.textContent = '';
  else if (text.length > MAX_MESSAGE) {
    message.textContent = text.slice(0, MAX_MESSAGE);
    window.getSelection().collapse(message.firstChild, MAX_MESSAGE);
  }
  saveMessage();
});

// ---------- ponteiro ----------

function track(e) {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.at = performance.now();
  document.documentElement.style.setProperty('--x', `${e.clientX}px`);
  document.documentElement.style.setProperty('--y', `${e.clientY}px`);
}

window.addEventListener('pointermove', track, { passive: true });
window.addEventListener('pointerdown', track, { passive: true });

// ---------- menu ----------

mountMenuDrawer(menu);

$('#btn-menu').addEventListener('click', () => {
  menu.returnValue = '';
  menu.showModal();
});

const fs = $('#btn-fullscreen');
if (!document.fullscreenEnabled) fs.hidden = true;

menu.addEventListener('click', (e) => {
  const remove = e.target.closest('[data-remove]');
  if (remove) {
    setGuests(guests.filter((_, i) => i !== Number(remove.dataset.remove)));
    return;
  }
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (!act) return;
  if (act === 'add-guest') return addGuest();
  if (act === 'light') setLight(!light);
  if (act === 'all') scene?.callAll();
  if (act === 'write') setTimeout(editMessage, 50);
  if (act === 'sound') {
    soundOn = !soundOn;
    storage.save(SOUND_KEY, soundOn);
    $('#sound-label').textContent = `Som: ${soundOn ? 'ligado' : 'desligado'}`;
  }
  if (act === 'fullscreen') {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }
  menu.close();
});

// Enter no nome do convidado adiciona (sem fechar o menu, que é um form).
$('#guest-name').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  addGuest();
});

$('#opt-theme').addEventListener('change', (e) => {
  storage.save(THEME_KEY, e.target.value);
  mountTheme(e.target.value);
});

// ---------- início ----------

async function init() {
  const [text, savedGuests, savedTheme, savedSound] = await Promise.all([
    storage.load(MESSAGE_KEY),
    storage.load(GUESTS_KEY),
    storage.load(THEME_KEY),
    storage.load(SOUND_KEY),
    loadPlayers(),
  ]);
  message.textContent = text ?? DEFAULT_MESSAGE;
  guests = Array.isArray(savedGuests) ? savedGuests : [];
  soundOn = savedSound ?? true;
  $('#sound-label').textContent = `Som: ${soundOn ? 'ligado' : 'desligado'}`;
  const id = new URLSearchParams(location.search).get('tema') ?? savedTheme;
  $('#opt-theme').innerHTML = THEMES.map((t) => `<option value="${t.id}">${esc(t.label)}</option>`).join('');
  $('#opt-theme').value = themeById(id).id;
  renderGuests();
  await mountTheme(id);
}

// Ao voltar para a aba (ex.: cadastrou jogadores num jogo), atualiza as pessoas.
document.addEventListener('visibilitychange', async () => {
  if (document.hidden) return;
  const before = people().map((p) => p.name).join('|');
  await loadPlayers();
  if (people().map((p) => p.name).join('|') === before) return;
  renderGuests();
  mountTheme(themeId);
});

let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => scene?.layout?.(), 120);
});

init();
