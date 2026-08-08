import { TILE, doorSymbolMarkup, triggerSymbolMarkup, renderLevelSVG } from './src/engine/LevelSVG.js';
import { parseLevelSVG } from './src/engine/LevelLoader.js';
import { isSolvable, findDecorativeDoors } from './src/engine/Solver.js';
import { exitIsReachable } from './src/engine/Reachability.js';
import { GameState } from './src/engine/GameState.js';
import { Renderer } from './src/engine/Renderer.js';
import { InputController } from './src/engine/Input.js';
import * as Sound from './src/engine/Sound.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const DRAFT_KEY = 'door-labyrinth-editor-draft-v1';

const titleInput = document.getElementById('maze-title');
const colsInput = document.getElementById('grid-cols');
const rowsInput = document.getElementById('grid-rows');
const resizeBtn = document.getElementById('resize-btn');
const clearBtn = document.getElementById('clear-btn');
const paletteEl = document.getElementById('palette');
const toolParamsEl = document.getElementById('tool-params');
const canvasEl = document.getElementById('editor-canvas');
const statusEl = document.getElementById('editor-status');
const checkSolvableBtn = document.getElementById('check-solvable-btn');
const playTestBtn = document.getElementById('play-test-btn');
const exportBtn = document.getElementById('export-btn');

const testOverlay = document.getElementById('test-overlay');
const testBoardContainer = document.getElementById('test-board-container');
const testTrappedHint = document.getElementById('test-trapped-hint');
const testStatusEl = document.getElementById('test-status');
const testUndoBtn = document.getElementById('test-undo-btn');
const testRestartBtn = document.getElementById('test-restart-btn');
const testBackBtn = document.getElementById('test-back-btn');

let cols = 15;
let rows = 10;
let grid = makeEmptyGrid(cols, rows);
let start = null;
let exit = null;
let selectedTool = 'wall';
const toolParams = { dir: 'E', uses: 1, linkId: 'A', groupId: 'blue', initialOpen: false };

let svgRoot = null;
let cellGroups = [];

let testRenderer = null;
let testGameState = null;
let testInput = null;

function makeEmptyGrid(c, r) {
  return Array.from({ length: r }, () => Array.from({ length: c }, () => ({ kind: 'wall' })));
}

function key(x, y) {
  return `${x},${y}`;
}

function slug(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Grid -> runtime model (same shape LevelLoader.js produces)
// ---------------------------------------------------------------------------

function buildModel() {
  const doorDefs = [];
  const linkPairs = new Map();
  const cells = new Map();

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (start && start.x === x && start.y === y) {
        cells.set(key(x, y), { kind: 'start' });
        continue;
      }
      if (exit && exit.x === x && exit.y === y) {
        cells.set(key(x, y), { kind: 'exit' });
        continue;
      }

      const spec = grid[y][x];
      if (spec.kind === 'door') {
        const id = `door-${x}-${y}`;
        const def = {
          id, x, y,
          type: spec.doorType,
          dir: spec.dir || null,
          uses: spec.uses ?? null,
          linkId: spec.linkId || null,
          groupId: spec.groupId || null,
          initialOpen: spec.initialOpen !== false,
        };
        doorDefs.push(def);
        cells.set(key(x, y), { kind: 'door', doorId: id, def });
        if (def.linkId) {
          const pair = linkPairs.get(def.linkId) || [];
          pair.push(id);
          linkPairs.set(def.linkId, pair);
        }
      } else if (spec.kind === 'floor') {
        cells.set(key(x, y), { kind: 'floor', triggerGroup: spec.triggerGroup || null });
      } else {
        cells.set(key(x, y), { kind: 'wall' });
      }
    }
  }

  return {
    cols, rows, start, exit, doorDefs, linkPairs,
    cellAt(x, y) {
      if (x < 0 || y < 0 || x >= cols || y >= rows) return { kind: 'wall' };
      return cells.get(key(x, y)) || { kind: 'wall' };
    },
  };
}

function validate(model) {
  const errors = [];
  if (!start) errors.push('Place a Start tile.');
  if (!exit) errors.push('Place an Exit tile.');
  const linkCounts = new Map();
  for (const def of model.doorDefs) {
    if (def.linkId) linkCounts.set(def.linkId, (linkCounts.get(def.linkId) || 0) + 1);
  }
  for (const [id, count] of linkCounts) {
    if (count !== 2) errors.push(`Linked pair "${id}" has ${count} door(s), needs exactly 2.`);
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Canvas (a live SVG board, styled identically to the real game)
// ---------------------------------------------------------------------------

function buildCanvas() {
  canvasEl.replaceChildren();
  svgRoot = document.createElementNS(SVG_NS, 'svg');
  svgRoot.setAttribute('class', 'board editor-board');
  svgRoot.setAttribute('viewBox', `0 0 ${cols * TILE} ${rows * TILE}`);

  cellGroups = Array.from({ length: rows }, () => new Array(cols));

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('data-x', String(x));
      g.setAttribute('data-y', String(y));
      g.setAttribute('transform', `translate(${x * TILE} ${y * TILE})`);
      svgRoot.appendChild(g);
      cellGroups[y][x] = g;
    }
  }

  svgRoot.addEventListener('click', onCanvasClick);
  canvasEl.appendChild(svgRoot);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) repaintCell(x, y);
  }
}

function repaintCell(x, y) {
  const g = cellGroups[y]?.[x];
  if (!g) return;
  g.replaceChildren();

  const base = document.createElementNS(SVG_NS, 'rect');
  base.setAttribute('width', String(TILE));
  base.setAttribute('height', String(TILE));
  g.appendChild(base);

  const isStart = start && start.x === x && start.y === y;
  const isExit = exit && exit.x === x && exit.y === y;
  const spec = grid[y][x];

  if (isStart) {
    g.setAttribute('class', 'editor-cell');
    base.setAttribute('class', 'tile-start editor-hit');
    const marker = document.createElementNS(SVG_NS, 'circle');
    marker.setAttribute('class', 'start-marker');
    marker.setAttribute('cx', '20');
    marker.setAttribute('cy', '20');
    marker.setAttribute('r', '6');
    g.appendChild(marker);
  } else if (isExit) {
    g.setAttribute('class', 'editor-cell');
    base.setAttribute('class', 'tile-exit editor-hit');
    const marker = document.createElementNS(SVG_NS, 'rect');
    marker.setAttribute('class', 'exit-marker');
    marker.setAttribute('x', '12');
    marker.setAttribute('y', '12');
    marker.setAttribute('width', '16');
    marker.setAttribute('height', '16');
    g.appendChild(marker);
  } else if (spec.kind === 'door') {
    const cssClass = `editor-cell door door-${spec.doorType}` + (spec.groupId ? ` group-${spec.groupId}` : '');
    g.setAttribute('class', cssClass);
    base.setAttribute('class', 'tile-base editor-hit');
    g.insertAdjacentHTML('beforeend', doorSymbolMarkup({
      type: spec.doorType, dir: spec.dir, uses: spec.uses, linkId: spec.linkId,
    }));
    if (spec.doorType === 'limited') {
      const label = g.querySelector('.uses-label');
      if (label) label.textContent = String(spec.uses ?? 1);
    }
    if (spec.doorType === 'toggle') {
      g.classList.toggle('is-open', spec.initialOpen !== false);
      g.classList.toggle('is-closed', spec.initialOpen === false);
    }
  } else if (spec.kind === 'floor' && spec.triggerGroup) {
    g.setAttribute('class', 'editor-cell');
    base.setAttribute('class', `tile-floor group-${spec.triggerGroup} editor-hit`);
    g.insertAdjacentHTML('beforeend', triggerSymbolMarkup(spec.triggerGroup));
  } else if (spec.kind === 'floor') {
    g.setAttribute('class', 'editor-cell');
    base.setAttribute('class', 'tile-floor editor-hit');
  } else {
    g.setAttribute('class', 'editor-cell');
    base.setAttribute('class', 'tile-wall editor-hit');
  }
}

function onCanvasClick(e) {
  const g = e.target.closest('[data-x][data-y]');
  if (!g) return;
  applyTool(parseInt(g.getAttribute('data-x'), 10), parseInt(g.getAttribute('data-y'), 10));
}

function specForTool() {
  switch (selectedTool) {
    case 'wall': return { kind: 'wall' };
    case 'floor': return { kind: 'floor' };
    case 'oneway': return { kind: 'door', doorType: 'oneway', dir: toolParams.dir };
    case 'closing': return { kind: 'door', doorType: 'closing' };
    case 'limited': return { kind: 'door', doorType: 'limited', uses: toolParams.uses };
    case 'linked': return { kind: 'door', doorType: 'linked', linkId: toolParams.linkId };
    case 'toggle': return { kind: 'door', doorType: 'toggle', groupId: toolParams.groupId, initialOpen: toolParams.initialOpen };
    case 'trigger': return { kind: 'floor', triggerGroup: toolParams.groupId };
    default: return { kind: 'wall' };
  }
}

function applyTool(x, y) {
  if (selectedTool === 'start') {
    if (exit && exit.x === x && exit.y === y) exit = null;
    const prev = start;
    start = { x, y };
    if (prev) repaintCell(prev.x, prev.y);
  } else if (selectedTool === 'exit') {
    if (start && start.x === x && start.y === y) start = null;
    const prev = exit;
    exit = { x, y };
    if (prev) repaintCell(prev.x, prev.y);
  } else {
    if (start && start.x === x && start.y === y) start = null;
    if (exit && exit.x === x && exit.y === y) exit = null;
    grid[y][x] = specForTool();
  }
  repaintCell(x, y);
  clearStatus();
  saveDraft();
}

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

function labeled(text, el) {
  const wrap = document.createElement('div');
  wrap.className = 'tool-params-label';
  const label = document.createElement('span');
  label.textContent = text;
  wrap.appendChild(label);
  wrap.appendChild(el);
  return wrap;
}

function paramButtons(options, isSelected, onPick) {
  const wrap = document.createElement('div');
  wrap.className = 'tool-params-row';
  for (const opt of options) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = opt.label;
    b.className = 'param-btn' + (isSelected(opt.value) ? ' selected' : '');
    b.addEventListener('click', () => {
      onPick(opt.value);
      renderToolParams();
    });
    wrap.appendChild(b);
  }
  return wrap;
}

function renderToolParams() {
  toolParamsEl.replaceChildren();

  if (selectedTool === 'oneway') {
    const opts = ['N', 'E', 'S', 'W'].map((d) => ({ value: d, label: d }));
    toolParamsEl.appendChild(labeled('Direction (to travel onto it)',
      paramButtons(opts, (v) => v === toolParams.dir, (v) => { toolParams.dir = v; })));
  } else if (selectedTool === 'limited') {
    const opts = [1, 2].map((n) => ({ value: n, label: String(n) }));
    toolParamsEl.appendChild(labeled('Uses',
      paramButtons(opts, (v) => v === toolParams.uses, (v) => { toolParams.uses = v; })));
  } else if (selectedTool === 'linked') {
    const opts = 'ABCDEFGH'.split('').map((l) => ({ value: l, label: l }));
    toolParamsEl.appendChild(labeled('Pair letter (place exactly 2 of the same letter)',
      paramButtons(opts, (v) => v === toolParams.linkId, (v) => { toolParams.linkId = v; })));
  } else if (selectedTool === 'toggle' || selectedTool === 'trigger') {
    const opts = ['blue', 'orange'].map((g) => ({ value: g, label: g }));
    toolParamsEl.appendChild(labeled('Group',
      paramButtons(opts, (v) => v === toolParams.groupId, (v) => { toolParams.groupId = v; })));
    if (selectedTool === 'toggle') {
      const openOpts = [{ value: true, label: 'Open' }, { value: false, label: 'Closed' }];
      toolParamsEl.appendChild(labeled('Starts',
        paramButtons(openOpts, (v) => v === toolParams.initialOpen, (v) => { toolParams.initialOpen = v; })));
    }
  }
}

paletteEl.querySelectorAll('.palette-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    selectedTool = btn.dataset.tool;
    paletteEl.querySelectorAll('.palette-btn').forEach((b) => b.classList.toggle('selected', b === btn));
    renderToolParams();
  });
});

// ---------------------------------------------------------------------------
// Toolbar: resize / clear / status
// ---------------------------------------------------------------------------

function setStatus(msg, kind = 'info') {
  statusEl.textContent = msg;
  statusEl.classList.toggle('editor-status-error', kind === 'error');
}

function clearStatus() {
  statusEl.textContent = '';
  statusEl.classList.remove('editor-status-error');
}

function resizeGrid(newCols, newRows) {
  const newGrid = makeEmptyGrid(newCols, newRows);
  for (let y = 0; y < Math.min(rows, newRows); y++) {
    for (let x = 0; x < Math.min(cols, newCols); x++) {
      newGrid[y][x] = grid[y][x];
    }
  }
  if (start && (start.x >= newCols || start.y >= newRows)) start = null;
  if (exit && (exit.x >= newCols || exit.y >= newRows)) exit = null;
  cols = newCols;
  rows = newRows;
  grid = newGrid;
  buildCanvas();
  saveDraft();
}

resizeBtn.addEventListener('click', () => {
  const c = Math.max(5, Math.min(40, parseInt(colsInput.value, 10) || cols));
  const r = Math.max(5, Math.min(30, parseInt(rowsInput.value, 10) || rows));
  colsInput.value = String(c);
  rowsInput.value = String(r);
  resizeGrid(c, r);
});

clearBtn.addEventListener('click', () => {
  grid = makeEmptyGrid(cols, rows);
  start = null;
  exit = null;
  buildCanvas();
  clearStatus();
  saveDraft();
});

titleInput.addEventListener('input', saveDraft);

// ---------------------------------------------------------------------------
// Check Solvable / Export
// ---------------------------------------------------------------------------

checkSolvableBtn.addEventListener('click', () => {
  const model = buildModel();
  const errors = validate(model);
  if (errors.length) {
    setStatus(errors.join(' '), 'error');
    return;
  }
  if (!isSolvable(model)) {
    setStatus('Not solvable: no path from Start to Exit with the current doors.', 'error');
    return;
  }
  const decorative = findDecorativeDoors(model);
  if (decorative.length) {
    setStatus(`Solvable — but these doors don't seem to matter (still solvable if permanently blocked): ${decorative.join(', ')}`);
  } else {
    setStatus('Solvable, and every door matters.');
  }
});

exportBtn.addEventListener('click', () => {
  const model = buildModel();
  const errors = validate(model);
  if (errors.length) {
    setStatus(errors.join(' '), 'error');
    return;
  }
  const meta = { id: slug(titleInput.value) || 'my-maze', title: titleInput.value || 'My Maze' };
  const svgText = renderLevelSVG(model, meta);
  const blob = new Blob([svgText], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${meta.id}.svg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setStatus(`Exported ${meta.id}.svg — drop it into src/levels/ and add it to manifest.js to include it in the game.`);
});

// ---------------------------------------------------------------------------
// Play Test
// ---------------------------------------------------------------------------

playTestBtn.addEventListener('click', () => {
  const model = buildModel();
  const errors = validate(model);
  if (errors.length) {
    setStatus(errors.join(' '), 'error');
    return;
  }

  const meta = { id: slug(titleInput.value) || 'draft', title: titleInput.value || 'My Maze' };
  const svgText = renderLevelSVG(model, meta);
  let level;
  try {
    level = parseLevelSVG(svgText, meta.id);
  } catch (err) {
    setStatus(`Could not build a playable level: ${err.message}`, 'error');
    return;
  }

  testOverlay.hidden = false;
  testOverlay.setAttribute('aria-hidden', 'false');
  testStatusEl.textContent = '';
  testTrappedHint.hidden = true;

  testRenderer = new Renderer(testBoardContainer);
  testRenderer.mount(level);
  testGameState = new GameState(level);

  if (!testInput) {
    testInput = new InputController({
      onMove: handleTestMove,
      onUndo: handleTestUndo,
      onRestart: handleTestRestart,
      undoBtn: testUndoBtn,
      restartBtn: testRestartBtn,
    });
  }
});

function handleTestMove(dir) {
  if (!testGameState || testGameState.completed) return;
  const prevDoorStates = structuredClone(testGameState.doorStates);
  const result = testGameState.move(dir);

  if (!result.moved) {
    if (result.reason === 'blocked') Sound.playBlocked();
    return;
  }

  testInput.lockBriefly();
  testRenderer.render(testGameState, prevDoorStates);
  Sound.playStep();
  if (result.cell.kind === 'door') Sound.playDoorEvent(result.cell.def.type);
  if (result.toggledGroup) Sound.playDoorEvent('toggle');
  updateTestTrappedHint();

  if (result.won) {
    Sound.playWin();
    testStatusEl.textContent = 'Solved!';
  }
}

function handleTestUndo() {
  if (!testGameState) return;
  const prevDoorStates = structuredClone(testGameState.doorStates);
  if (testGameState.undo()) {
    testRenderer.render(testGameState, prevDoorStates);
    testStatusEl.textContent = '';
    updateTestTrappedHint();
  }
}

function handleTestRestart() {
  if (!testGameState) return;
  testGameState.restart();
  testRenderer.render(testGameState, null);
  testStatusEl.textContent = '';
  updateTestTrappedHint();
}

function updateTestTrappedHint() {
  if (testGameState.history.length === 0) {
    testTrappedHint.hidden = true;
    return;
  }
  const reachable = exitIsReachable(testGameState.level, testGameState.doorStates, testGameState.playerPos);
  testTrappedHint.hidden = reachable;
}

testBackBtn.addEventListener('click', () => {
  testOverlay.hidden = true;
  testOverlay.setAttribute('aria-hidden', 'true');
});

// ---------------------------------------------------------------------------
// Autosave
// ---------------------------------------------------------------------------

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ cols, rows, grid, start, exit, title: titleInput.value }));
  } catch {
    // localStorage unavailable (e.g. private browsing quota) - draft just won't persist
  }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.grid)) return false;
    cols = data.cols;
    rows = data.rows;
    grid = data.grid;
    start = data.start || null;
    exit = data.exit || null;
    if (data.title) titleInput.value = data.title;
    colsInput.value = String(cols);
    rowsInput.value = String(rows);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

loadDraft();
buildCanvas();
renderToolParams();
paletteEl.querySelector('[data-tool="wall"]').classList.add('selected');
