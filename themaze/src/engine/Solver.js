// BFS solver over (position, door-state), built on the exact same rule
// functions the game itself uses (Door.js) — so "solvable here" and
// "solvable in the shipped game" can never disagree. Shared by the level
// generator scripts (scripts/generate-levels.mjs) and the in-browser maze
// editor (editor.js); pure logic, no DOM/Node-only APIs.

import { DIRS, canEnter, onEnter, applyTrigger, initialDoorState } from './Door.js';

export function isSolvable(model, { alwaysBlockDoorId = null } = {}) {
  const initialStates = {};
  for (const def of model.doorDefs) initialStates[def.id] = initialDoorState(def);

  const startKey = (pos, states) => `${pos.x},${pos.y}|${JSON.stringify(states)}`;
  const visited = new Set([startKey(model.start, initialStates)]);
  const queue = [{ pos: model.start, states: initialStates }];

  while (queue.length > 0) {
    const { pos, states } = queue.shift();
    if (pos.x === model.exit.x && pos.y === model.exit.y) return true;

    for (const dirKey of Object.keys(DIRS)) {
      const vec = DIRS[dirKey];
      const next = { x: pos.x + vec.dx, y: pos.y + vec.dy };
      const cell = model.cellAt(next.x, next.y);
      if (cell.kind === 'wall') continue;

      if (cell.kind === 'door') {
        if (cell.doorId === alwaysBlockDoorId) continue;
        if (!canEnter(cell.def, states[cell.doorId], dirKey)) continue;
      }

      const nextStates = structuredClone(states);
      if (cell.kind === 'door') {
        onEnter(cell.def, nextStates, model.linkPairs);
      } else if (cell.kind === 'floor' && cell.triggerGroup) {
        applyTrigger(cell.triggerGroup, model.doorDefs, nextStates);
      }

      const k = startKey(next, nextStates);
      if (!visited.has(k)) {
        visited.add(k);
        queue.push({ pos: next, states: nextStates });
      }
    }
  }
  return false;
}

// Design-integrity check (plan.md §10.5: "if removing the door does not
// change the solution, reconsider its placement"). Non-fatal — the caller
// decides what a decorative door means for it (build-time warning in the
// generator, live inline warning in the editor).
export function findDecorativeDoors(model) {
  const decorative = [];
  for (const def of model.doorDefs) {
    if (isSolvable(model, { alwaysBlockDoorId: def.id })) {
      decorative.push(def.id);
    }
  }
  return decorative;
}
