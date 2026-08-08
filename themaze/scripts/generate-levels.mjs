// Dev-time authoring tool (not shipped as part of the game runtime — the
// game only ever fetches the .svg files this script produces). Levels are
// specified here as a compact char grid + a per-level legend, then emitted
// as real .svg files whose data-* attributes LevelLoader.js parses at
// runtime, and whose shapes are the literal visuals the game renders.
//
// Every level is also verified solvable by a small BFS reusing the exact
// same door rules as the game (src/engine/Door.js), so a design mistake
// fails loudly here instead of silently shipping an unsolvable puzzle. The
// solver and the SVG emitter both live in src/engine/ (Solver.js,
// LevelSVG.js) and are shared verbatim with the in-browser maze editor
// (themaze/editor.js) — this script is not the only place that needs them.

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { isSolvable, findDecorativeDoors } from '../src/engine/Solver.js';
import { renderLevelSVG } from '../src/engine/LevelSVG.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEVELS_DIR = path.join(__dirname, '..', 'src', 'levels');

// ---------------------------------------------------------------------------
// Level specs
// ---------------------------------------------------------------------------
// rows: array of equal-length strings. Fixed chars: '#' wall, ' ' floor,
// 'S' start, 'E' exit. Every other char must have a `legend` entry:
//   oneway  { type:'oneway', dir:'N'|'S'|'E'|'W' }   dir = required travel direction to enter
//   closing { type:'closing' }
//   limited { type:'limited', uses:N }
//   linked  { type:'linked', linkId:'a' }             exactly two cells share a linkId
//   toggle  { type:'toggle', groupId:'blue', initialOpen:true|false }
//   trigger { type:'trigger', groupId:'blue' }        always-passable floor tile

const LEVELS = [];
function level(spec) {
  LEVELS.push(spec);
}

// ---- Chapter: Tutorial ------------------------------------------------------
level({
  id: 'tutorial-1',
  chapter: 'tutorial',
  title: 'First Steps',
  rows: [
    '#########',
    '#S      #',
    '# ##### #',
    '#      E#',
    '#########',
  ],
  legend: {},
});

// ---- Chapter: One-Way -------------------------------------------------------
level({
  id: 'oneway-1',
  chapter: 'oneway',
  title: 'No Turning Back',
  rows: [
    '#########',
    '#S  >   #',
    '####### #',
    '#######E#',
    '#########',
  ],
  legend: { '>': { type: 'oneway', dir: 'E' } },
});

// oneway-2's deduction hook: the exit sits directly above the SHORT
// branch's dead end, close enough to look like the obvious way there.
// Tracing the actual walls shows column x=1 is cut between y=5 and y=3
// (no floor at (1,4)) - the short branch is a true dead end, and the real
// route is the long way around through the other one-way door. Both
// branches gate on one-way doors, so guessing wrong is a hard Restart, not
// just a wasted move: once you're a tile past either door, re-entering it
// against the flow is blocked.
level({
  id: 'oneway-2',
  chapter: 'oneway',
  title: "Don't Trust Your Eyes",
  rows: placeGrid(10, 9, {
    '5,7': 'S',
    '5,6': ' ',
    '5,5': ' ', // hub
    '4,5': '<', '3,5': ' ', '2,5': ' ', '1,5': ' ', // short branch: dead end
    '6,5': '>', '7,5': ' ', '8,5': ' ',             // long branch: loops around...
    '8,4': ' ', '8,3': ' ',
    '7,3': ' ', '6,3': ' ', '5,3': ' ', '4,3': ' ', '3,3': ' ', '2,3': ' ',
    '1,3': 'E', // ...to the exit, right above the trap
  }),
  legend: { '<': { type: 'oneway', dir: 'W' }, '>': { type: 'oneway', dir: 'E' } },
});

// ---- Chapter: Closing --------------------------------------------------------
level({
  id: 'closing-1',
  chapter: 'closing',
  title: 'The Sealed Door',
  rows: [
    '###########',
    '#S    X   #',
    '######### #',
    '#########E#',
    '###########',
  ],
  legend: { X: { type: 'closing' } },
});

level({
  id: 'closing-2',
  chapter: 'closing',
  title: 'Before You Go',
  rows: [
    '#############',
    '#S    X     #',
    '### ####### #',
    '### ####### #',
    '########### #',
    '########### #',
    '###########E#',
  ],
  legend: { X: { type: 'closing' } },
});

// ---- Chapter: Limited-Use ----------------------------------------------------
level({
  id: 'limited-1',
  chapter: 'limited',
  title: 'Two Crossings',
  rows: [
    '###########',
    '#    #    #',
    '#  S 2  E  #',
    '#    #    #',
    '###########',
  ].map((r) => r.padEnd(11, '#')),
  legend: { '2': { type: 'limited', uses: 2 } },
});

level({
  id: 'limited-2',
  chapter: 'limited',
  title: 'Spend Wisely',
  rows: [
    '#########',
    '##A S B##',
    '## # # ##',
    '##.###E##',
    '#########',
  ],
  legend: { A: { type: 'limited', uses: 1 }, B: { type: 'limited', uses: 1 } },
});

// ---- Chapter: Linked ----------------------------------------------------------
level({
  id: 'linked-1',
  chapter: 'linked',
  title: 'Choose a Branch',
  rows: [
    '#########',
    '##A S B##',
    '## # # ##',
    '##.###E##',
    '#########',
  ],
  legend: { A: { type: 'linked', linkId: 'ab' }, B: { type: 'linked', linkId: 'ab' } },
});

level({
  id: 'linked-2',
  chapter: 'linked',
  title: 'What You Give Up',
  rows: [
    '#############',
    '#S       ',
    '######## ',
    '######A   B##',
    '######E###.##',
    '#############',
  ],
  legend: { A: { type: 'linked', linkId: 'ab' }, B: { type: 'linked', linkId: 'ab' } },
});


// ---- Chapter: Toggle ------------------------------------------------------------
level({
  id: 'toggle-1',
  chapter: 'toggle',
  title: 'Flip the Route',
  rows: [
    '#######',
    '#S T  #',
    '##### #',
    '#  B  #',
    '# #####',
    '#    E#',
    '#######',
  ],
  legend: {
    T: { type: 'trigger', groupId: 'blue' },
    B: { type: 'toggle', groupId: 'blue', initialOpen: false },
  },
});

level({
  id: 'toggle-2',
  chapter: 'toggle',
  title: 'Two Switches',
  rows: [
    '#########',
    '#S T  B #',
    '####### #',
    '#  b  t #',
    '# #######',
    '#E#######',
  ],
  legend: {
    T: { type: 'trigger', groupId: 'blue' },
    B: { type: 'toggle', groupId: 'blue', initialOpen: false },
    t: { type: 'trigger', groupId: 'orange' },
    b: { type: 'toggle', groupId: 'orange', initialOpen: false },
  },
});

// ---- Chapter: Combination --------------------------------------------------------
level({
  id: 'combo-1',
  chapter: 'combo',
  title: 'Commit and Follow Through',
  rows: [
    '###########',
    '#S >X  ',
    '###### ',
    '####A   B##',
    '####.###E##',
    '###########',
  ],
  legend: {
    '>': { type: 'oneway', dir: 'E' },
    X: { type: 'closing' },
    A: { type: 'linked', linkId: 'ab' },
    B: { type: 'linked', linkId: 'ab' },
  },
});

level({
  id: 'combo-2',
  chapter: 'combo',
  title: 'Budget the Route',
  rows: [
    '#############',
    '#S T  B 2   #',
    '########### #',
    '###########v#',
    '###########E#',
  ],
  legend: {
    T: { type: 'trigger', groupId: 'blue' },
    B: { type: 'toggle', groupId: 'blue', initialOpen: false },
    '2': { type: 'limited', uses: 2 },
    v: { type: 'oneway', dir: 'S' },
  },
});

level({
  id: 'combo-3',
  chapter: 'combo',
  title: 'The Living Labyrinth',
  rows: [
    '#####################',
    '#S  >  T  B  1  X  E#',
    '#####################',
  ],
  legend: {
    '>': { type: 'oneway', dir: 'E' },
    T: { type: 'trigger', groupId: 'blue' },
    B: { type: 'toggle', groupId: 'blue', initialOpen: false },
    '1': { type: 'limited', uses: 1 },
    X: { type: 'closing' },
  },
});

// ---- Chapter: Capstone (demo) -----------------------------------------
// Proof that real difficulty doesn't need keys/objectives. Uses only
// one-way, closing, linked, and toggle - deliberately no limited-use, since
// that mechanic can't carry difficulty alone (see level-creation-rulebook.md
// §7). The player must:
//   1. detour to the trigger BEFORE crossing the one-way door, since that
//      door (and the closing door later) make the detour permanently
//      unreachable afterward,
//   2. pick the correct linked branch at the fork (the other is a dead end
//      that also seals the real branch shut),
//   3. survive the closing door's commitment,
//   4. arrive at the toggle door already open, as a payoff for step 1 - or
//      find it permanently sealed with no way back, if they didn't plan
//      ahead from the very first junction.
//
// Row strings are computed (not hand-typed) specifically to avoid the
// character-counting mistakes earlier levels hit.
const CAPSTONE_WIDTH = 17;
const CAPSTONE_ROWS = [
  '#'.repeat(CAPSTONE_WIDTH),
  '#' + 'S' + ' '.repeat(3) + '>' + ' '.repeat(2) + '#'.repeat(9),
  '#'.repeat(3) + ' ' + '#'.repeat(3) + ' ' + '#'.repeat(9),
  '#'.repeat(3) + 'T' + '#'.repeat(3) + ' ' + '#'.repeat(9),
  '#'.repeat(7) + ' ' + '#'.repeat(9),
  '#'.repeat(5) + 'A' + ' '.repeat(3) + 'B' + '#'.repeat(7),
  '#'.repeat(5) + ' ' + '#'.repeat(3) + ' ' + '#'.repeat(7),
  '#'.repeat(9) + ' '.repeat(2) + 'X' + ' '.repeat(2) + 'V' + ' ' + 'E',
  '#'.repeat(CAPSTONE_WIDTH),
];
if (!CAPSTONE_ROWS.every((r) => r.length === CAPSTONE_WIDTH)) {
  throw new Error(`capstone-1: row width mismatch: ${CAPSTONE_ROWS.map((r) => r.length)}`);
}

level({
  id: 'capstone-1',
  chapter: 'capstone',
  title: 'The Vault',
  rows: CAPSTONE_ROWS,
  legend: {
    '>': { type: 'oneway', dir: 'E' },
    T: { type: 'trigger', groupId: 'vault' },
    A: { type: 'linked', linkId: 'ab' },
    B: { type: 'linked', linkId: 'ab' },
    X: { type: 'closing' },
    V: { type: 'toggle', groupId: 'vault', initialOpen: false },
  },
});

// Builds row strings from explicit {(x,y): char} placements - every unlisted
// cell defaults to wall. Safer than concatenating row strings for anything
// bigger than a couple of features per row.
function placeGrid(width, height, cells) {
  const grid = Array.from({ length: height }, () => Array(width).fill('#'));
  for (const key of Object.keys(cells)) {
    const [x, y] = key.split(',').map(Number);
    grid[y][x] = cells[key];
  }
  return grid.map((row) => row.join(''));
}

// capstone-2: "mix and match" rather than a chain. A hub with three
// independent spokes (plain trigger detour, one-way trigger loop, and a
// linked fork) that can be tackled in any order, freely revisiting the hub
// between them - only the single one-way door well past the fork is
// actually irreversible. Nothing here is sequenced; it's a set of
// prerequisites the player has to satisfy before committing, in whichever
// order they choose.
const CAPSTONE2_CELLS = {
  // Entry corridor (south of the hub) + the hub cell itself
  '10,9': 'S',
  '10,8': ' ', '10,7': ' ', '10,6': ' ',
  '10,5': ' ', // hub

  // North spoke: plain dead-end detour to T1 (blue trigger)
  '10,4': ' ', '10,3': 'T',

  // West spoke: one-way loop past T2 (orange trigger), rejoining the entry
  // corridor at (10,7) via a door that only opens moving east - entering
  // this loop is only possible via the hub's west door, and the only way
  // out is all the way around.
  '9,5': '<',  // oneway dir=W, hub's west door
  '8,5': ' ', '7,5': ' ',
  '6,5': 't',  // T2, mid-loop (not a dead end)
  '6,6': ' ', '6,7': ' ',
  '7,7': ' ', '8,7': ' ',
  '9,7': '>',  // oneway dir=E, rejoins (10,7)

  // East spoke: connector to the linked fork
  '11,5': ' ', '12,5': ' ', '13,5': ' ',
  '14,5': ' ', // fork hub
  '14,4': ' ', '14,3': 'P', // P (trap), dead end beyond it
  '14,2': ' ',
  '14,6': ' ', '14,7': 'Q', // Q (real), continues beyond it
  '14,8': ' ',

  // Final corridor: only reachable via Q, gated by a one-way commitment,
  // then both toggle doors (need T1 and T2 respectively) and a closing
  // door before the exit.
  '14,9': ' ', '15,9': ' ',
  '16,9': '>', // oneway dir=E, the true point of no return
  '17,9': ' ',
  '18,9': 'B', // toggle, blue (needs T1)
  '19,9': ' ',
  '20,9': 'b', // toggle, orange (needs T2)
  '21,9': ' ',
  '22,9': 'X', // closing
  '23,9': ' ',
  '24,9': 'E',
};
const CAPSTONE2_ROWS = placeGrid(26, 11, CAPSTONE2_CELLS);

level({
  id: 'capstone-2',
  chapter: 'capstone',
  title: 'Any Order',
  rows: CAPSTONE2_ROWS,
  legend: {
    '<': { type: 'oneway', dir: 'W' },
    '>': { type: 'oneway', dir: 'E' },
    T: { type: 'trigger', groupId: 'blue' },
    B: { type: 'toggle', groupId: 'blue', initialOpen: false },
    t: { type: 'trigger', groupId: 'orange' },
    b: { type: 'toggle', groupId: 'orange', initialOpen: false },
    P: { type: 'linked', linkId: 'pair1' },
    Q: { type: 'linked', linkId: 'pair1' },
    X: { type: 'closing' },
  },
});

// capstone-3 ("No Second Chances"): everything so far, but cross-wired so a
// single decision made early is only paid off much later, after several
// other irreversible commitments have already stacked on top of it. Four
// zones, each individually simple, chained so the WHOLE route has to be
// planned from the board before the first step:
//
//   Zone A - entry: an easy-to-miss dead-end detour to trigger T (blue),
//     then a one-way commitment.
//   Zone B - fork 1 (linked P/Q): P is a dead end that also permanently
//     seals Q. Q continues to a toggle door that needed T (from Zone A) -
//     miss the detour, and this is exactly as far as the run goes.
//   Zone C - a second easy-to-miss detour, this time to trigger t (orange,
//     independent of blue), followed by a "Don't Trust Your Eyes"-style
//     fork: a short one-way branch that looks plausible and dead-ends, and
//     a longer real one-way branch.
//   Zone D - fork 2 (linked R/U, same trap-shape as fork 1), then a second
//     toggle door that needed t (from Zone C), then a closing door, then
//     the exit.
//
// Every one-way door and every linked "wrong" branch is a hard, permanent
// commitment - there is no backtracking anywhere in this level once you've
// moved past one. Getting to Zone D having skipped either detour, or
// picked either trap branch, means Restart is the only way out.
const NO_SECOND_CHANCES_CELLS = {
  '1,1': 'S',
  '2,1': ' ', '3,1': ' ', '4,1': ' ', '5,1': ' ',
  '6,1': '>', // D1, oneway dir=E
  '7,1': ' ', '8,1': ' ', '9,1': ' ', '10,1': ' ',
  '2,2': ' ', '2,3': 'T', // blue trigger, easy to skip

  '10,2': ' ', '10,3': ' ', '10,4': ' ',
  '8,5': 'P', '9,5': ' ', '10,5': ' ', '11,5': ' ', '12,5': 'Q',
  '8,6': ' ', // P's dead end
  '12,6': ' ', '12,7': ' ',
  '12,8': 'B', // toggle, blue - needs T
  '12,9': ' ',

  '13,9': ' ', '14,9': ' ', '15,9': ' ', // hub 2
  '15,8': '^', '15,7': ' ', // trap: oneway dir=N, dead end
  '16,9': '>', '17,9': ' ', '18,9': ' ', // real: oneway dir=E
  '18,10': ' ', '18,11': 't', // orange trigger, easy to skip
  '19,9': ' ', '20,9': ' ',

  '20,10': ' ', '20,11': ' ',
  '18,12': 'R', '19,12': ' ', '20,12': ' ', '21,12': ' ', '22,12': 'U',
  '18,13': ' ', // R's dead end
  '22,13': ' ',
  '22,14': 'b', // toggle, orange - needs t
  '22,15': ' ',
  '22,16': 'X', // closing
  '22,17': ' ',
  '22,18': 'E',
};
const NO_SECOND_CHANCES_ROWS = placeGrid(24, 20, NO_SECOND_CHANCES_CELLS);

level({
  id: 'capstone-3',
  chapter: 'capstone',
  title: 'No Second Chances',
  rows: NO_SECOND_CHANCES_ROWS,
  legend: {
    '>': { type: 'oneway', dir: 'E' },
    '^': { type: 'oneway', dir: 'N' },
    T: { type: 'trigger', groupId: 'blue' },
    B: { type: 'toggle', groupId: 'blue', initialOpen: false },
    t: { type: 'trigger', groupId: 'orange' },
    b: { type: 'toggle', groupId: 'orange', initialOpen: false },
    P: { type: 'linked', linkId: 'pair1' },
    Q: { type: 'linked', linkId: 'pair1' },
    R: { type: 'linked', linkId: 'pair2' },
    U: { type: 'linked', linkId: 'pair2' },
    X: { type: 'closing' },
  },
});

const EXPECTED_DECORATIVE = {
  'oneway-2': ['door-4-5'],
  'limited-2': ['door-2-1'],
  'linked-1': ['door-2-1'],
  'linked-2': ['door-10-3'],
  'combo-1': ['door-4-3'],
  'capstone-1': ['door-5-5'],
  'capstone-2': ['door-14-3'],
  'capstone-3': ['door-8-5', 'door-15-8', 'door-18-12'],
};
// ---------------------------------------------------------------------------
// Build a plain model (no DOM) from a spec — shared by the solver and the
// SVG emitter so there is exactly one interpretation of the char grid.
// ---------------------------------------------------------------------------
function buildPlan(spec) {
  const rows = spec.rows;
  const height = rows.length;
  const width = Math.max(...rows.map((r) => r.length));
  const cells = new Map();
  const doorDefs = [];
  const linkPairs = new Map();
  let start = null;
  let exit = null;

  for (let y = 0; y < height; y++) {
    const row = rows[y];
    for (let x = 0; x < width; x++) {
      const ch = row[x] ?? '#';
      const k = `${x},${y}`;
      if (ch === '#') {
        cells.set(k, { x, y, kind: 'wall' });
      } else if (ch === ' ' || ch === '.') {
        cells.set(k, { x, y, kind: 'floor' });
      } else if (ch === 'S') {
        cells.set(k, { x, y, kind: 'start' });
        start = { x, y };
      } else if (ch === 'E') {
        cells.set(k, { x, y, kind: 'exit' });
        exit = { x, y };
      } else {
        const meta = spec.legend[ch];
        if (!meta) throw new Error(`${spec.id}: unrecognized char '${ch}' at (${x},${y}) — add it to legend`);
        if (meta.type === 'trigger') {
          cells.set(k, { x, y, kind: 'floor', triggerGroup: meta.groupId });
        } else {
          const id = `door-${x}-${y}`;
          const def = { id, x, y, ...meta };
          doorDefs.push(def);
          cells.set(k, { x, y, kind: 'door', doorId: id, def });
          if (def.linkId) {
            const pair = linkPairs.get(def.linkId) || [];
            pair.push(id);
            linkPairs.set(def.linkId, pair);
          }
        }
      }
    }
  }

  if (!start) throw new Error(`${spec.id}: missing S (start)`);
  if (!exit) throw new Error(`${spec.id}: missing E (exit)`);

  for (const [linkId, pair] of linkPairs) {
    if (pair.length !== 2) throw new Error(`${spec.id}: linkId '${linkId}' must have exactly 2 doors, found ${pair.length}`);
  }

  return {
    cols: width,
    rows: height,
    start,
    exit,
    doorDefs,
    linkPairs,
    cellAt(x, y) {
      if (x < 0 || y < 0 || x >= width || y >= height) return { kind: 'wall' };
      return cells.get(`${x},${y}`) || { kind: 'wall' };
    },
  };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
mkdirSync(LEVELS_DIR, { recursive: true });

let failed = 0;
const manifestEntries = [];
for (const spec of LEVELS) {
  let model;
  try {
    model = buildPlan(spec);
  } catch (err) {
    console.error(`[FAIL] ${spec.id}: ${err.message}`);
    failed++;
    continue;
  }

  if (!isSolvable(model)) {
    console.error(`[FAIL] ${spec.id}: no solution found from S to E`);
    failed++;
    continue;
  }

  const decorative = findDecorativeDoors(model);
  const expected = new Set(EXPECTED_DECORATIVE[spec.id] || []);
  const unexpected = decorative.filter((id) => !expected.has(id));
  if (unexpected.length > 0) {
    console.error(`[FAIL] ${spec.id}: unexpected decorative door(s) ${unexpected.join(', ')} — level solvable even with them always blocked`);
    failed++;
    continue;
  }

  const svg = renderLevelSVG(model, spec);
  const filename = `${spec.id}.svg`;
  writeFileSync(path.join(LEVELS_DIR, filename), svg, 'utf8');
  manifestEntries.push({ id: spec.id, chapter: spec.chapter, title: spec.title, file: `./${filename}` });
  console.log(`[OK]   ${spec.id} (${model.cols}x${model.rows}, ${model.doorDefs.length} doors)`);
  if (decorative.length > 0) {
    console.log(`       decorative (expected — trap/decoy branch): ${decorative.join(', ')}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} level(s) failed validation — not writing manifest.`);
  process.exit(1);
}

const manifestSrc = `// Generated by scripts/generate-levels.mjs — do not hand-edit.\nexport const LEVELS = ${JSON.stringify(manifestEntries, null, 2)};\n`;
writeFileSync(path.join(LEVELS_DIR, 'manifest.js'), manifestSrc, 'utf8');
console.log(`\nWrote ${manifestEntries.length} levels + manifest.js`);
