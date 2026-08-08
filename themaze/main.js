import { LEVELS } from './src/levels/manifest.js';

const LEVELS_BASE_URL = new URL('./src/levels/', import.meta.url);
import { loadLevel } from './src/engine/LevelLoader.js';
import { GameState } from './src/engine/GameState.js';
import { Renderer } from './src/engine/Renderer.js';
import { InputController } from './src/engine/Input.js';
import { exitIsReachable } from './src/engine/Reachability.js';
import * as Sound from './src/engine/Sound.js';
import { loadSave, markCompleted, isUnlocked, isCompleted } from './src/save/SaveManager.js';

const LAYOUT = {
  desktop: { columns: 10, rows: 2 },
  mobile: { columns: 5, rows: 2 },
};
const MOBILE_LAYOUT_BREAKPOINT = 500;

const levelSubtitleEl = document.getElementById('level-subtitle');
const boardContainer = document.getElementById('board-container');
const trappedHintEl = document.getElementById('trapped-hint');
const muteBtn = document.getElementById('mute-btn');
const undoBtn = document.getElementById('undo-btn');
const restartBtn = document.getElementById('restart-btn');
const pauseBtn = document.getElementById('pause-btn');
const winOverlay = document.getElementById('win-overlay');
const winCloseBtn = document.getElementById('win-close-btn');
const winNextBtn = document.getElementById('win-next-btn');
const pauseOverlay = document.getElementById('pause-overlay');
const pauseResumeBtn = document.getElementById('pause-resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const puzzleNavEl = document.getElementById('puzzle-nav');
const pagerLabelEl = document.getElementById('pager-label');
const pagerPrevBtn = document.getElementById('pager-prev');
const pagerNextBtn = document.getElementById('pager-next');

let save = loadSave();
let renderer = null;
let gameState = null;
let input = null;
let currentIndex = -1;
let paused = false;
let navPage = 0;

function currentLayout() {
  return window.innerWidth <= MOBILE_LAYOUT_BREAKPOINT ? LAYOUT.mobile : LAYOUT.desktop;
}

function navPageSize() {
  const layout = currentLayout();
  return layout.columns * layout.rows;
}

function renderPuzzleNav() {
  renderPuzzleNavPage(Math.floor(currentIndex / navPageSize()));
}

function renderPuzzleNavPage(page) {
  const layout = currentLayout();
  puzzleNavEl.style.setProperty('--nav-columns', String(layout.columns));

  const pageSize = navPageSize();
  const pageCount = Math.ceil(LEVELS.length / pageSize);
  navPage = Math.max(0, Math.min(page, pageCount - 1));
  const start = navPage * pageSize;
  const end = Math.min(start + pageSize, LEVELS.length);

  puzzleNavEl.replaceChildren();
  for (let i = start; i < end; i++) {
    const lvl = LEVELS[i];
    const unlocked = isUnlocked(save, i);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-dot';
    btn.textContent = String(i + 1);
    btn.title = lvl.title;
    if (i === currentIndex) btn.classList.add('current');
    if (isCompleted(save, lvl.id)) btn.classList.add('completed');
    if (!unlocked) {
      btn.disabled = true;
      btn.title = 'Complete the previous level to unlock';
    } else {
      btn.addEventListener('click', () => openLevel(i));
    }
    puzzleNavEl.appendChild(btn);
  }

  pagerLabelEl.textContent = `Page ${navPage + 1} of ${pageCount}`;
  pagerPrevBtn.disabled = navPage === 0;
  pagerNextBtn.disabled = navPage >= pageCount - 1;
}

async function openLevel(index) {
  currentIndex = index;
  const meta = LEVELS[index];
  const level = await loadLevel(new URL(meta.file, LEVELS_BASE_URL));

  levelSubtitleEl.textContent = `Level ${index + 1} — ${meta.title}`;
  trappedHintEl.hidden = true;
  hideOverlays();

  renderer = new Renderer(boardContainer);
  renderer.mount(level);
  gameState = new GameState(level);
  updateTrappedHint();
  renderPuzzleNav();

  if (!input) {
    input = new InputController({
      onMove: handleMove,
      onUndo: handleUndo,
      onRestart: handleRestart,
      onPause: togglePause,
      undoBtn,
      restartBtn,
      pauseBtn,
    });
  }
}

function handleMove(dir) {
  if (paused || !gameState || gameState.completed) return;
  const prevDoorStates = structuredClone(gameState.doorStates);
  const result = gameState.move(dir);

  if (!result.moved) {
    if (result.reason === 'blocked') Sound.playBlocked();
    return;
  }

  input.lockBriefly();
  renderer.render(gameState, prevDoorStates);
  Sound.playStep();
  if (result.cell.kind === 'door') Sound.playDoorEvent(result.cell.def.type);
  if (result.toggledGroup) Sound.playDoorEvent('toggle');
  updateTrappedHint();

  if (result.won) {
    Sound.playWin();
    save = markCompleted(save, LEVELS[currentIndex].id, currentIndex, LEVELS.length);
    renderPuzzleNav();
    showWin();
  }
}

function handleUndo() {
  if (paused || !gameState) return;
  const prevDoorStates = structuredClone(gameState.doorStates);
  if (gameState.undo()) {
    renderer.render(gameState, prevDoorStates);
    updateTrappedHint();
  }
}

function handleRestart() {
  if (!gameState) return;
  gameState.restart();
  renderer.render(gameState, null);
  updateTrappedHint();
}

function updateTrappedHint() {
  // A fresh level can legitimately start with the exit gated behind an
  // unflipped toggle door - that's the puzzle, not a trapped state. Only
  // start warning once the player has actually made a move.
  if (gameState.history.length === 0) {
    trappedHintEl.hidden = true;
    return;
  }
  const reachable = exitIsReachable(gameState.level, gameState.doorStates, gameState.playerPos);
  trappedHintEl.hidden = reachable;
}

function togglePause() {
  if (!gameState || gameState.completed) return;
  paused = !paused;
  pauseOverlay.hidden = !paused;
  pauseOverlay.setAttribute('aria-hidden', String(!paused));
}

function hideOverlays() {
  winOverlay.hidden = true;
  winOverlay.setAttribute('aria-hidden', 'true');
  pauseOverlay.hidden = true;
  pauseOverlay.setAttribute('aria-hidden', 'true');
  paused = false;
}

function showWin() {
  winNextBtn.disabled = currentIndex >= LEVELS.length - 1;
  winOverlay.hidden = false;
  winOverlay.setAttribute('aria-hidden', 'false');
}

winCloseBtn.addEventListener('click', hideOverlays);
winNextBtn.addEventListener('click', () => {
  if (currentIndex < LEVELS.length - 1) openLevel(currentIndex + 1);
});

pauseResumeBtn.addEventListener('click', togglePause);
pauseRestartBtn.addEventListener('click', () => {
  togglePause();
  handleRestart();
});

pagerPrevBtn.addEventListener('click', () => renderPuzzleNavPage(navPage - 1));
pagerNextBtn.addEventListener('click', () => renderPuzzleNavPage(navPage + 1));

let resizeLayout = currentLayout();
window.addEventListener('resize', () => {
  const layout = currentLayout();
  if (layout !== resizeLayout) {
    resizeLayout = layout;
    renderPuzzleNav();
  }
});

muteBtn.addEventListener('click', () => {
  const muted = !Sound.isMuted();
  Sound.setMuted(muted);
  muteBtn.textContent = muted ? '\u{1F507}' : '\u{1F50A}';
});
muteBtn.textContent = Sound.isMuted() ? '\u{1F507}' : '\u{1F50A}';

// Testing backdoor: index.html?level=N jumps straight to level N without
// touching real save progress or requiring it to be unlocked.
const debugLevelParam = new URLSearchParams(window.location.search).get('level');
const debugIndex = debugLevelParam !== null ? parseInt(debugLevelParam, 10) : null;
const startIndex = Number.isInteger(debugIndex) && debugIndex >= 0 && debugIndex < LEVELS.length
  ? debugIndex
  : Math.min(save.currentIndex, LEVELS.length - 1);

openLevel(startIndex);
